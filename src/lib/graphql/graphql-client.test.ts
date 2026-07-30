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
import { GraphQLRequestError, graphqlQuery } from './graphql-client'

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
})
