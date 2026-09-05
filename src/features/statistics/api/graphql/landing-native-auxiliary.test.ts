import { beforeEach, describe, expect, it, vi } from 'vitest'
import { observation, source } from '../../test/native-landing-fixtures'
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
vi.mock('../../lib/mock-mode', () => ({ isStatisticsMockEnabled: () => true }))
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchLandingCatalog, fetchUatSnapshot } from '../statistics-api'
import { searchTerritories } from '../territory-search-api'
import {
  statisticsLandingCatalogQueryOptions,
  statisticsUatSnapshotQueryOptions,
} from '../../hooks/use-statistics'

function snapshot(unknown = false) {
  return {
    territory: {
      nodes: unknown
        ? []
        : [
            {
              code: '54975',
              siruta_code: '54975',
              level: 'LAU',
              name_ro: 'Cluj-Napoca',
            },
          ],
    },
    latest: ['POP107D', 'FOM104D', 'SOM101F', 'LOC101B'].map((code) => ({
      dataset: {
        ...source().descriptor,
        id: code,
        code,
        data_status: 'AVAILABLE',
        periodicity: ['ANNUAL'],
      },
      observation: unknown
        ? null
        : observation('54975', 2025, '123.4500', 10, code),
      hasData: !unknown,
      matchStrategy: unknown ? 'NO_DATA' : 'TOTAL_FALLBACK',
      latestPeriod: unknown ? null : '2025',
      geographicWitnesses: [],
    })),
  }
}
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
  it('preserves native local source values and statuses without dispatching to mocks', async () => {
    const response = snapshot()
    response.latest[0].observation!.value_status = 'p'
    vi.mocked(graphqlQuery).mockResolvedValue(response)
    const signal = new AbortController().signal
    const result = await fetchUatSnapshot('54975', signal)
    expect(result).toMatchObject({
      nativeContract: 'native-v2',
      territory: { siruta: '54975' },
    })
    expect(result.values[0]).toMatchObject({
      value: '123.4500',
      valueStatus: 'p',
      source: { observation: { id: response.latest[0].observation!.id } },
    })
    expect(vi.mocked(graphqlQuery).mock.calls[0][2]).toEqual({
      auth: 'none',
      signal,
    })
    expect(statisticsUatSnapshotQueryOptions('54975').queryKey).toContain(
      'native-v2',
    )
  })
  it('retains explicit no-data outcomes for an unknown canonical identity', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue(snapshot(true))
    const result = await fetchUatSnapshot('999999')
    expect(result.territory).toBeNull()
    expect(result.values).toHaveLength(4)
    expect(
      result.values.every((value) => !value.hasData && value.value === null),
    ).toBe(true)
  })
  it.each([
    'identity',
    'duplicate-identity',
    'missing-identity',
    'wrong-scope',
    'missing-dataset',
    'missing-status',
    'bad-decimal',
    'bad-period',
  ])(
    'rejects %s local data rather than displaying an unrelated or partial tile set',
    async (problem) => {
      const response = snapshot()
      if (problem === 'identity') response.territory.nodes[0].code = '999999'
      if (problem === 'duplicate-identity')
        response.territory.nodes.push(response.territory.nodes[0])
      if (problem === 'missing-identity') response.territory.nodes = []
      if (problem === 'wrong-scope')
        response.latest[0].observation = observation('RO', 2025)
      if (problem === 'missing-dataset') response.latest.pop()
      if (problem === 'missing-status')
        Reflect.deleteProperty(response.latest[0].observation!, 'value_status')
      if (problem === 'bad-decimal')
        response.latest[0].observation!.value = '12oops'
      if (problem === 'bad-period')
        response.latest[0].observation!.time_period.year = 2024
      vi.mocked(graphqlQuery).mockResolvedValue(response)
      await expect(fetchUatSnapshot('54975')).rejects.toThrow()
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
