import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
vi.mock('../../lib/mock-mode', () => ({ isStatisticsMockEnabled: () => true }))
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchLandingCatalog } from '../statistics-api'
import { searchTerritories } from '../territory-search-api'
import { statisticsLandingCatalogQueryOptions } from '../../hooks/use-statistics'

const catalog = () => ({
  loaded: { pageInfo: { totalCount: 1 } },
  catalog: { pageInfo: { totalCount: 2 } },
  ...Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [
      't' + (i + 1),
      { pageInfo: { totalCount: 1 } },
    ]),
  ),
})
beforeEach(() => vi.resetAllMocks())
describe('native landing catalog, local tiles and search', () => {
  it('always reads the native catalog even when legacy mock mode is enabled', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue(catalog())
    const result = await fetchLandingCatalog()
    expect(result).toMatchObject({
      nativeContract: 'native-v2',
      loadedCount: 1,
      catalogCount: 2,
    })
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
    expect(statisticsLandingCatalogQueryOptions(result).queryKey).toContain(
      'native-v2',
    )
    expect(
      statisticsLandingCatalogQueryOptions({
        loadedCount: 99,
        catalogCount: 99,
        themes: [],
      }).initialData,
    ).toBeUndefined()
  })
  it.each([-1, 0.5, 3])(
    'rejects invalid loaded catalog count %s',
    async (count) => {
      const response = catalog()
      response.loaded.pageInfo.totalCount = count
      vi.mocked(graphqlQuery).mockResolvedValue(response)
      await expect(fetchLandingCatalog()).rejects.toThrow('catalog counts')
    },
  )
  it('searches native territories with variables and cancellation despite mock settings', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({
      insTerritories: {
        nodes: [],
        pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
      },
    })
    const signal = new AbortController().signal
    await searchTerritories('Cluj', signal)
    expect(vi.mocked(graphqlQuery).mock.calls[0][1]).toMatchObject({
      filter: { search: 'Cluj' },
    })
    expect(vi.mocked(graphqlQuery).mock.calls[0][2]).toEqual({
      auth: 'none',
      signal,
    })
  })
})
