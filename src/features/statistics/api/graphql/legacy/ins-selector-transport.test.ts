import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.com' }))
vi.mock('@/lib/auth', () => ({ getAuthToken: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { getAuthToken } from '@/lib/auth'
import { searchInsDatasets } from './ins-fetchers'

// Exercise the actual transport: mocking graphqlQuery hid the obsolete route.
describe('INS series dataset selector transport', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('uses the native public endpoint and forwards filters and cancellation', async () => {
    const signal = new AbortController().signal
    const connection = {
      nodes: [{ code: 'POP107D' }],
      pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
    }
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: { insDatasets: connection } })))

    expect(await searchInsDatasets({ filter: { search: 'POP107D' }, limit: 20, offset: 0, signal }))
      .toEqual(connection)
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/v1/graphql', expect.objectContaining({
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    }))
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({
      query: expect.stringContaining('query InsDatasets'),
      variables: { filter: { search: 'POP107D' }, limit: 20, offset: 0 },
    })
    expect(getAuthToken).not.toHaveBeenCalled()
  })

  it('surfaces publication errors instead of treating them as an empty catalog', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      errors: [{ message: 'INS publication is not ready', extensions: { code: 'SERVICE_UNAVAILABLE' } }],
    })))
    await expect(searchInsDatasets({})).rejects.toMatchObject({
      name: 'GraphQLRequestError', message: expect.stringContaining('INS publication is not ready'),
    })
  })
})
