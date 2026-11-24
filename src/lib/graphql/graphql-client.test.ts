import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.example.com'),
}))

import { getAuthToken } from '@/lib/auth'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import {
  GraphQLRequestError,
  graphqlQuery,
  isAbortError,
  isGraphQLInvalidInput,
  isGraphQLTimeout,
} from './graphql-client'

/** A fetch that never answers and rejects with the signal's reason, as the platform's does. */
function abortableFetch(_url: string, init: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    if (init.signal?.aborted) {
      reject(init.signal.reason)
      return
    }
    init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
  })
}

function jsonResponse(body: unknown, init: Partial<Response> = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

describe('graphqlQuery', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getAuthToken).mockResolvedValue(null)
  })

  it('POSTs to the redesign /api/v1/graphql endpoint with the query + variables', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { ping: 'pong' } }))

    const data = await graphqlQuery<{ ping: string }>('query { ping }', { x: 1 })

    expect(data).toEqual({ ping: 'pong' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/graphql',
      expect.objectContaining({
        method: 'POST',
        referrerPolicy: API_FETCH_REFERRER_POLICY,
        body: JSON.stringify({ query: 'query { ping }', variables: { x: 1 } }),
      }),
    )
  })

  it('attaches a bearer token when one is available', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('tok-123')
    fetchMock.mockResolvedValue(jsonResponse({ data: { ok: true } }))

    await graphqlQuery('query { ok }')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123')
  })

  it('skips auth initialization for explicitly public queries', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { ok: true } }))

    await graphqlQuery('query { ok }', undefined, {
      auth: 'none',
      operationName: 'publicQuery',
    })

    expect(getAuthToken).not.toHaveBeenCalled()
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('proceeds anonymously when token retrieval throws', async () => {
    vi.mocked(getAuthToken).mockRejectedValue(new Error('clerk down'))
    fetchMock.mockResolvedValue(jsonResponse({ data: { ok: true } }))

    const data = await graphqlQuery<{ ok: boolean }>('query { ok }')

    expect(data).toEqual({ ok: true })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('throws GraphQLRequestError carrying graphQLErrors when errors[] is non-empty', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ errors: [{ message: 'boom' }, { message: 'kaboom' }] }),
    )

    await expect(graphqlQuery('query { ok }')).rejects.toMatchObject({
      name: 'GraphQLRequestError',
      message: expect.stringContaining('boom; kaboom'),
    })
  })

  it('exposes the GraphQL error list and HTTP status on the error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { errors: [{ message: 'bad request' }] },
        { ok: false, status: 400, statusText: 'Bad Request' },
      ),
    )

    const error = await graphqlQuery('query { ok }').catch((e) => e)
    expect(error).toBeInstanceOf(GraphQLRequestError)
    expect((error as GraphQLRequestError).status).toBe(400)
    expect((error as GraphQLRequestError).graphQLErrors).toHaveLength(1)
  })

  it('throws when data is null (distinct from a null field inside data)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }))

    await expect(graphqlQuery('query { ok }')).rejects.toBeInstanceOf(GraphQLRequestError)
  })

  it('returns data even when a field inside data is null', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { company: null } }))

    const data = await graphqlQuery<{ company: null }>('query { company }')
    expect(data).toEqual({ company: null })
  })

  it('wraps transport-level (network) failures', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(graphqlQuery('query { ok }')).rejects.toMatchObject({
      name: 'GraphQLRequestError',
      message: expect.stringContaining('ECONNREFUSED'),
    })
  })

  it('rethrows a caller abort as it came, so callers can recognise it', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation(abortableFetch)

    const pending = graphqlQuery('query { ok }', undefined, { signal: controller.signal })
    controller.abort()

    const error = await pending.catch((e) => e)
    expect(isAbortError(error)).toBe(true)
    expect(error).not.toBeInstanceOf(GraphQLRequestError)
    expect(isGraphQLInvalidInput(error)).toBe(false)
  })

  it('reports a request past its deadline as a timed-out failure, not an abort', async () => {
    vi.useFakeTimers()
    try {
      fetchMock.mockImplementation(abortableFetch)

      const pending = graphqlQuery('query { ok }', undefined, { signal: withDeadline(undefined, 50) })
      vi.advanceTimersByTime(50)

      const error = await pending.catch((e) => e)
      expect(error).toBeInstanceOf(GraphQLRequestError)
      expect((error as GraphQLRequestError).timedOut).toBe(true)
      expect(isGraphQLTimeout(error)).toBe(true)
      expect(isAbortError(error)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('marks a refused input so callers can map it to not-found', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        errors: [{ message: 'entity selectors must identify exactly one INS territory', extensions: { code: 'INVALID_INPUT' } }],
      }),
    )

    const error = await graphqlQuery('query { ok }').catch((e) => e)
    expect(isGraphQLInvalidInput(error)).toBe(true)
    expect(isGraphQLInvalidInput(new GraphQLRequestError('other', { graphQLErrors: [{ message: 'boom' }] }))).toBe(false)
    expect(isGraphQLInvalidInput(new Error('boom'))).toBe(false)
  })

})

describe('graphqlQuery and the disclosure key (D6, API doc 10)', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getAuthToken).mockResolvedValue(null)
    const { resetNewestKeyForTests } = await import('@/lib/disclosure-key')
    resetNewestKeyForTests()
  })

  it('refuses a response under an older publication than one already seen, before anyone keeps it', async () => {
    const { StaleDisclosureError } = await import('@/lib/disclosure-key')
    const P1 = '2026-11-18T03:10:00.123456Z'
    const P2 = '2026-11-19T03:10:00.123456Z'
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { r: [{ meta: { disclosureKey: P2 } }] } }))
    await expect(graphqlQuery('{ r }')).resolves.toEqual({ r: [{ meta: { disclosureKey: P2 } }] })
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { r: [{ meta: { disclosureKey: P1 } }] } }))
    await expect(graphqlQuery('{ r }')).rejects.toBeInstanceOf(StaleDisclosureError)
  })

  it('sends no follow-up by codes read under a publication older than one seen since, checked after the token wait', async () => {
    const { noteKey, StaleDisclosureError } = await import('@/lib/disclosure-key')
    noteKey('2026-11-18T03:10:00.123456Z')
    let releaseToken: (token: string | null) => void = () => {}
    vi.mocked(getAuthToken).mockImplementationOnce(() => new Promise((resolve) => (releaseToken = resolve)))
    const followUp = graphqlQuery('{ names }', { cuis: ['14837428'] }, { disclosureSeen: '2026-11-18T03:10:00.123456Z' })
    // A newer publication is seen while the request waits for its token.
    noteKey('2026-11-19T03:10:00.123456Z')
    releaseToken(null)
    await expect(followUp).rejects.toBeInstanceOf(StaleDisclosureError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('graphqlQuery and legacy procurement switched off', () => {
  const fetchMock = vi.fn()
  const OFF = { message: 'legacy procurement data is not served by this API; use the direct-acquisition release (procurementDa*) or procurementTotals', path: ['procurementProcedure'], extensions: { code: 'SERVICE_UNAVAILABLE', type: 'ServiceUnavailable' } }
  const offAnswer = () => jsonResponse({ data: { procurementProcedure: null }, errors: [OFF] })

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getAuthToken).mockResolvedValue(null)
    const { resetLegacyOffForTests } = await import('./legacy-procurement')
    resetLegacyOffForTests()
  })

  it('sends a legacy read as usual while the API has not answered legacy off', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { procurementProcedure: { id: '1' } } }))
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).resolves.toEqual({ procurementProcedure: { id: '1' } })
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).resolves.toEqual({ procurementProcedure: { id: '1' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('after the switch’s answer, fails a legacy read as the API answers it, with no request; other reads still go', async () => {
    fetchMock.mockResolvedValueOnce(offAnswer())
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).rejects.toBeInstanceOf(GraphQLRequestError)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const gated = await graphqlQuery('{ procurementContract }', {}, { legacy: true }).catch((error: unknown) => error)
    expect(gated).toBeInstanceOf(GraphQLRequestError)
    // The API's own words, as its answer said them.
    expect((gated as GraphQLRequestError).graphQLErrors).toEqual([{ message: OFF.message, extensions: { code: 'SERVICE_UNAVAILABLE' } }])
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { procurementDaRelease: { enabled: true } } }))
    await expect(graphqlQuery('{ procurementDaRelease }')).resolves.toEqual({ procurementDaRelease: { enabled: true } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('asks the API again a minute after its answer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    fetchMock.mockResolvedValueOnce(offAnswer())
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).rejects.toBeInstanceOf(GraphQLRequestError)
    vi.advanceTimersByTime(59_999)
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).rejects.toBeInstanceOf(GraphQLRequestError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { procurementProcedure: { id: '1' } } }))
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).resolves.toEqual({ procurementProcedure: { id: '1' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('takes no other answer for the switch: another SERVICE_UNAVAILABLE, another message, an outage', async () => {
    const answers = [
      jsonResponse({ data: null, errors: [{ ...OFF, extensions: { code: 'INTERNAL_SERVER_ERROR' } }] }),
      jsonResponse({ data: null, errors: [{ ...OFF, message: 'legacy procurement database unavailable' }] }),
      jsonResponse({ data: null, errors: [{ ...OFF, message: 'the legacy direct-acquisition list is not served by this API; use procurementDaPurchases' }] }),
      jsonResponse('upstream gone', { ok: false, status: 503, statusText: 'Service Unavailable' }),
    ]
    for (const answer of answers) {
      fetchMock.mockResolvedValueOnce(answer)
      await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).rejects.toBeInstanceOf(GraphQLRequestError)
    }
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).rejects.toBeInstanceOf(GraphQLRequestError)
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { procurementProcedure: { id: '1' } } }))
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).resolves.toEqual({ procurementProcedure: { id: '1' } })
    expect(fetchMock).toHaveBeenCalledTimes(answers.length + 2)
  })

  it('reads the switch’s answer only from a well-formed error', async () => {
    const { isLegacyOffAnswer } = await import('./legacy-procurement')
    expect(isLegacyOffAnswer([OFF])).toBe(true)
    expect(isLegacyOffAnswer([null, { message: 7, extensions: { code: 'SERVICE_UNAVAILABLE' } }, { message: OFF.message, extensions: null }])).toBe(false)
    expect(isLegacyOffAnswer(null)).toBe(false)
    expect(isLegacyOffAnswer({ 0: OFF })).toBe(false)
  })

  it('lets a read not marked legacy go while legacy is off, and takes the switch from its answer too', async () => {
    fetchMock.mockResolvedValueOnce(offAnswer())
    await expect(graphqlQuery('{ procurementBuyerProfile }')).rejects.toBeInstanceOf(GraphQLRequestError)
    fetchMock.mockResolvedValueOnce(offAnswer())
    await expect(graphqlQuery('{ procurementBuyerProfile }')).rejects.toBeInstanceOf(GraphQLRequestError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await expect(graphqlQuery('{ procurementContract }', {}, { legacy: true })).rejects.toBeInstanceOf(GraphQLRequestError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('lets a read cancelled or past its deadline fail as such, not as legacy off', async () => {
    fetchMock.mockResolvedValueOnce(offAnswer())
    await expect(graphqlQuery('{ procurementProcedure }', {}, { legacy: true })).rejects.toBeInstanceOf(GraphQLRequestError)
    fetchMock.mockImplementation(abortableFetch)
    const late = await graphqlQuery('{ procurementContract }', {}, { legacy: true, signal: AbortSignal.abort(new DOMException('deadline', 'TimeoutError')) }).catch((error: unknown) => error)
    expect(isGraphQLTimeout(late)).toBe(true)
    const cancelled = new AbortController()
    cancelled.abort()
    await expect(graphqlQuery('{ procurementContract }', {}, { legacy: true, signal: cancelled.signal })).rejects.toBe(cancelled.signal.reason)
    fetchMock.mockReset()
  })

  it('does not send a legacy read when the switch’s answer arrives while it waits for its token', async () => {
    let releaseToken: (token: string | null) => void = () => {}
    vi.mocked(getAuthToken).mockImplementationOnce(() => new Promise((resolve) => (releaseToken = resolve)))
    const waiting = graphqlQuery('{ procurementContract }', {}, { legacy: true })
    fetchMock.mockResolvedValueOnce(offAnswer())
    await expect(graphqlQuery('{ procurementProcedure }', {}, { auth: 'none' })).rejects.toBeInstanceOf(GraphQLRequestError)
    releaseToken(null)
    await expect(waiting).rejects.toBeInstanceOf(GraphQLRequestError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
