import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/config/env', () => ({
  env: { VITE_API_URL: 'http://api.test' },
  getApiBaseUrl: () => 'http://api.test',
  getSiteUrl: () => 'http://localhost:3000',
}))

import { getAuthToken } from '@/lib/auth'
import { searchEntitiesLive } from './entity-search-api.live'
import { isSearchInputError } from './search-input-error'
import { EntitySearchWithheldError, isSearchWithheld } from './search-withheld-error'
import {
  answerBody,
  CURRENT_EMPTY_PAGE_WITH_MORE,
  CURRENT_PAGE,
  REFUSED_BODY,
  UNAVAILABLE_PAGE,
  WITHHELD_EMPTY_PAGE_WITH_MORE,
} from './graphql/entity-search.fixtures'

const respond = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()

const sentVariables = (call = 0): Record<string, unknown> => {
  const init = fetchMock.mock.calls[call]?.[1]
  return (JSON.parse(String(init?.body)) as { variables: Record<string, unknown> }).variables
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchEntitiesLive under the shared-search contract', () => {
  it('sends the public search anonymously, without waiting for an auth session', async () => {
    vi.mocked(getAuthToken).mockClear()
    fetchMock.mockResolvedValue(respond(answerBody(CURRENT_PAGE)))

    await searchEntitiesLive({ q: 'dedeman' })

    expect(getAuthToken).not.toHaveBeenCalled()
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(headers.has('Authorization')).toBe(false)
  })

  it('reads a current answer with its company parts and exact continuation', async () => {
    fetchMock.mockResolvedValue(respond(answerBody(CURRENT_PAGE)))

    const result = await searchEntitiesLive({ q: ' dedeman ', limit: 20 })

    expect(sentVariables()).toMatchObject({ q: 'dedeman', limit: 20 })
    expect(result.companyContribution).toBe('CURRENT')
    expect(result.continuation).toEqual({ candidatesReturned: 20, nextOffset: 20 })
    expect(result.hits.map((hit) => hit.company?.nameSource ?? null)).toEqual([
      'onrc_edition',
      'core_organization',
      null,
      'onrc_edition',
    ])
    // Unknown activity stays unknown on the way through.
    expect(result.hits[3]?.isActive).toBeNull()
  })

  it('reads an unavailable answer as it is, not as a refusal', async () => {
    fetchMock.mockResolvedValue(respond(answerBody(UNAVAILABLE_PAGE)))

    const result = await searchEntitiesLive({ q: 'dedeman' })

    expect(result.companyContribution).toBe('UNAVAILABLE')
    expect(result.companyContributionReason).toBe('control_missing')
    expect(result.hits.map((hit) => hit.docType)).toEqual(['organization', 'legal_act'])
  })

  it('sends the offset it is given and accepts the next offset that follows it', async () => {
    fetchMock.mockResolvedValue(respond(answerBody(CURRENT_EMPTY_PAGE_WITH_MORE)))

    const result = await searchEntitiesLive({ q: 'dedeman', limit: 20, offset: 20 })

    expect(sentVariables()).toMatchObject({ offset: 20 })
    expect(result.hits).toEqual([])
    expect(result.continuation.nextOffset).toBe(40)
  })

  it('reads an empty withheld page with a next page, without calling it a zero', async () => {
    fetchMock.mockResolvedValue(respond(answerBody(WITHHELD_EMPTY_PAGE_WITH_MORE)))

    const result = await searchEntitiesLive({ q: 'dedeman' })

    expect(result.hits).toEqual([])
    expect(result.companyContributionReason).toBe('company_check_unavailable')
    expect(result.continuation.nextOffset).toBe(20)
  })

  it('withholds an answer whose next offset does not follow its page', async () => {
    // offset 0 + 20 candidates cannot continue at 40
    fetchMock.mockResolvedValue(respond(answerBody(CURRENT_EMPTY_PAGE_WITH_MORE)))

    const error = await searchEntitiesLive({ q: 'dedeman' }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(EntitySearchWithheldError)
    expect((error as EntitySearchWithheldError).kind).toBe('unreadable')
  })

  it('withholds the server refusal (null root + SERVICE_UNAVAILABLE)', async () => {
    fetchMock.mockResolvedValue(respond(REFUSED_BODY))

    const error = await searchEntitiesLive({ q: 'dedeman' }).catch((caught: unknown) => caught)

    expect(isSearchWithheld(error)).toBe(true)
    expect((error as EntitySearchWithheldError).kind).toBe('refused')
  })

  it('withholds a null root that came without its error', async () => {
    fetchMock.mockResolvedValue(respond({ data: { searchEntities: null } }))

    const error = await searchEntitiesLive({ q: 'dedeman' }).catch((caught: unknown) => caught)

    expect(isSearchWithheld(error)).toBe(true)
  })

  it('withholds unreadable company metadata', async () => {
    fetchMock.mockResolvedValue(
      respond(answerBody({ ...CURRENT_PAGE, companyContributionReason: 'control_missing' })),
    )

    const error = await searchEntitiesLive({ q: 'dedeman' }).catch((caught: unknown) => caught)

    expect(isSearchWithheld(error)).toBe(true)
    expect((error as EntitySearchWithheldError).kind).toBe('unreadable')
  })

  it('keeps an input refusal an input error, and a server failure a failure', async () => {
    fetchMock.mockResolvedValueOnce(
      respond({
        data: { searchEntities: null },
        errors: [{ message: 'too many words', path: ['searchEntities'], extensions: { code: 'INVALID_INPUT' } }],
      }),
    )
    const invalid = await searchEntitiesLive({ q: 'a b c' }).catch((caught: unknown) => caught)
    expect(isSearchInputError(invalid)).toBe(true)
    expect(isSearchWithheld(invalid)).toBe(false)

    fetchMock.mockResolvedValueOnce(respond({ errors: [{ message: 'boom' }] }, 500))
    const failed = await searchEntitiesLive({ q: 'dedeman' }).catch((caught: unknown) => caught)
    expect(failed).toBeInstanceOf(Error)
    expect(isSearchWithheld(failed)).toBe(false)
  })

  it('lets a cancelled request end as an abort, not as an answer', async () => {
    // Like fetch: an already-aborted signal rejects at once, a later abort when it comes.
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
          if (init.signal?.aborted) abort()
          else init.signal?.addEventListener('abort', abort)
        }),
    )
    const controller = new AbortController()

    const pending = searchEntitiesLive({ q: 'dedeman' }, controller.signal).catch(
      (caught: unknown) => caught,
    )
    controller.abort()
    const error = await pending

    expect((error as Error).name).toBe('AbortError')
    expect(isSearchWithheld(error)).toBe(false)
  })

  it('answers a blank query as no search, without a request and without a zero', async () => {
    const result = await searchEntitiesLive({ q: '   ' })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.companyContribution).toBe('UNAVAILABLE')
    expect(result.companyContributionReason).toBe('no_search')
    expect(result.continuation).toEqual({ candidatesReturned: 0, nextOffset: null })
  })
})
