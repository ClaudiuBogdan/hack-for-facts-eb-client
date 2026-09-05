vi.mock('@/config/env', () => ({ env: { VITE_APP_ENVIRONMENT: 'test' }, getApiBaseUrl: () => 'https://native.example.test', getSiteUrl: () => 'http://localhost:3000' }))
import { applyHubPeriod, collectHubPeriodOptions } from '../../lib/hub-period'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchStatisticsTerritoryHubLive } from '../statistics-api.live'
import { fetchStatisticsDatasetSeries } from './statistics-fetchers'
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  insDashboardGroupRawSchema,
  insLatestValueNodeRawSchema,
} from './statistics-raw-schemas'
import { mapLatestValue } from './statistics-mappers'

const dataset = {
  id: 'dataset-opaque',
  data_status: 'AVAILABLE',
  code: 'TEST',
  name_ro: 'Test',
  periodicity: ['ANNUAL'],
  dimension_count: 4,
  metadata: {
    revision_id: '9007199254740993',
    transform_contract_sha256: 'a'.repeat(64),
    custody_sha256: 'b'.repeat(64),
  },
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
}
const observation = {
  id: 'cell-opaque',
  dataset_code: 'TEST',
  value: null,
  value_status: ':',
  time_period: { iso_period: '2024', year: 2024, periodicity: 'ANNUAL' },
  unit: { code: '0', symbol: 'pers.' },
  classifications: [
    { id: 'class-0', type_code: 'D0', code: '105' },
    { id: 'class-1', type_code: 'D1', code: '931' },
  ],
  dimensions: {
    geography: {
      pairs: [[1, 931]],
      resolution: 'EXACT',
      flags: [],
      qualified: false,
      resolvedTerritory: { code: '54975', level: 'LAU' },
      contextTerritory: null,
      applicableRules: [],
    },
  },
}
const success = () => ({
  dataset: structuredClone(dataset),
  observation: structuredClone(observation),
  latestPeriod: '2024',
  hasData: true,
  matchStrategy: 'TOTAL_FALLBACK',
  geographicWitnesses: [],
})
const ambiguous = () => ({
  ...success(),
  observation: null,
  latestPeriod: null,
  hasData: false,
  matchStrategy: 'AMBIGUOUS_GEOGRAPHY',
  geographicWitnesses: [[[1, 931]], [[1, 932]]],
})
const dashboard = () => ({
  dataset: structuredClone(dataset),
  observations: [structuredClone(observation)],
  latestPeriod: '2024',
  status: 'SERIES',
  geographicWitnesses: [],
  truncated: false,
})

describe('native latest outcome boundary', () => {
  it('preserves a null-valued source cell, its identity and custody without saying no data', () => {
    const mapped = mapLatestValue(insLatestValueNodeRawSchema.parse(success()))
    expect(mapped.hasData).toBe(true)
    expect(mapped.value).toBeNull()
    expect(mapped.source?.observation?.id).toBe('cell-opaque')
    expect(mapped.source?.descriptor?.metadata.custody_sha256).toBe(
      'b'.repeat(64),
    )
  })
  it('keeps ambiguity and both complete witnesses without a value', () => {
    const mapped = mapLatestValue(
      insLatestValueNodeRawSchema.parse(ambiguous()),
    )
    expect(mapped.matchStrategy).toBe('AMBIGUOUS_GEOGRAPHY')
    expect(mapped.hasData).toBe(false)
    expect(mapped.source?.geographicWitnesses).toEqual([[[1, 931]], [[1, 932]]])
  })
  it('accepts catalog-only NO_DATA without inventing publication metadata', () => {
    const value = {
      ...ambiguous(),
      dataset: { id: 'catalog', code: 'TEST', data_status: 'CATALOG_ONLY' },
      matchStrategy: 'NO_DATA',
      geographicWitnesses: [],
    }
    expect(
      mapLatestValue(insLatestValueNodeRawSchema.parse(value)).source
        ?.descriptor,
    ).toBeNull()
  })
  it.each([
    { hasData: false },
    { latestPeriod: '2023' },
    { observation: null },
    { geographicWitnesses: [[[1, 931]]] },
    { matchStrategy: 'REPRESENTATIVE_FALLBACK' },
  ])('rejects contradictory success %j', (patch) => {
    expect(
      insLatestValueNodeRawSchema.safeParse({ ...success(), ...patch }).success,
    ).toBe(false)
  })
  it.each([
    { hasData: true },
    { observation },
    { latestPeriod: '2024' },
    { geographicWitnesses: [] },
    { geographicWitnesses: [[[1, 931]], [[1, 931]]] },
    { geographicWitnesses: [[[0, 931]], [[0, 932]]] },
    { dataset: { ...dataset, metadata: null } },
  ])('rejects contradictory ambiguity %j', (patch) => {
    expect(
      insLatestValueNodeRawSchema.safeParse({ ...ambiguous(), ...patch })
        .success,
    ).toBe(false)
  })
  it.each(['id', 'dimensions', 'dataset_code', 'unit', 'classifications'])(
    'requires observation identity %s',
    (field) => {
      const value = success()
      Reflect.deleteProperty(value.observation, field)
      expect(insLatestValueNodeRawSchema.safeParse(value).success).toBe(false)
    },
  )
  it('rejects another dataset or incomplete declared source coordinates', () => {
    const value = success()
    value.observation.dataset_code = 'OTHER'
    expect(insLatestValueNodeRawSchema.safeParse(value).success).toBe(false)
    value.observation.dataset_code = 'TEST'
    value.observation.classifications.pop()
    expect(insLatestValueNodeRawSchema.safeParse(value).success).toBe(false)
  })
})

describe('native dashboard outcome boundary', () => {
  it('retains explicit truncation even with only one returned row', () => {
    expect(
      insDashboardGroupRawSchema.parse({ ...dashboard(), truncated: true })
        .truncated,
    ).toBe(true)
  })
  it('keeps ambiguity with no rows', () => {
    const latest = ambiguous()
    expect(
      insDashboardGroupRawSchema.safeParse({
        ...dashboard(),
        status: 'AMBIGUOUS_GEOGRAPHY',
        observations: [],
        latestPeriod: null,
        geographicWitnesses: latest.geographicWitnesses,
      }).success,
    ).toBe(true)
  })
  it.each([
    { observations: [] },
    { latestPeriod: null },
    { truncated: undefined },
    { status: undefined },
    { geographicWitnesses: undefined },
    { observations: [observation, observation] },
    { dataset: { ...dataset, dimensions: [] } },
  ])('rejects incomplete or contradictory series %j', (patch) => {
    expect(
      insDashboardGroupRawSchema.safeParse({ ...dashboard(), ...patch })
        .success,
    ).toBe(false)
  })
  it('rejects source alternatives even with identical values', () => {
    const alternate = structuredClone(observation)
    alternate.id = 'another-source'
    alternate.classifications[0].code = '106'
    expect(
      insDashboardGroupRawSchema.safeParse({
        ...dashboard(),
        observations: [observation, alternate],
      }).success,
    ).toBe(false)
  })
  it('rejects qualification in an automatic modern default', () => {
    const qualified = structuredClone(observation)
    qualified.dimensions.geography.qualified = true
    expect(
      insDashboardGroupRawSchema.safeParse({
        ...dashboard(),
        observations: [qualified],
      }).success,
    ).toBe(false)
  })
  it('rejects ambiguous truncation and partially populated witnesses', () => {
    const latest = ambiguous()
    expect(
      insDashboardGroupRawSchema.safeParse({
        ...dashboard(),
        status: 'AMBIGUOUS_GEOGRAPHY',
        observations: [],
        latestPeriod: null,
        geographicWitnesses: latest.geographicWitnesses,
        truncated: true,
      }).success,
    ).toBe(false)
  })
})

describe('native outcome consumers', () => {
  beforeEach(() => vi.mocked(graphqlQuery).mockReset())
  it('keeps an ambiguous sibling and uses explicit truncation below the old row cap', async () => {
    const ambiguousLatest = ambiguous()
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({
        dashboard: [
          { ...dashboard(), truncated: true },
          {
            ...dashboard(),
            dataset: { ...dataset, code: 'AMB' },
            status: 'AMBIGUOUS_GEOGRAPHY',
            observations: [],
            latestPeriod: null,
            geographicWitnesses: ambiguousLatest.geographicWitnesses,
          },
        ],
        identity: {
          nodes: [
            {
              code: '54975',
              siruta_code: '54975',
              level: 'LAU',
              name_ro: 'Test',
              parent_code: 'CJ',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        loaded: { pageInfo: { totalCount: 2 } },
        catalog: { pageInfo: { totalCount: 2 } },
        county: [],
        national: [],
      })
    const controller = new AbortController()
    const result = await fetchStatisticsTerritoryHubLive(
      '54975',
      controller.signal,
    )
    expect(result?.partial).toBe(true)
    expect(result?.tiles.map((tile) => tile.tileState)).toEqual([
      'available',
      'ambiguous',
    ])
    expect(result?.tiles[1].sparkline).toEqual([])
    expect(result?.tiles[1].value).toBeNull()
    expect(result?.tiles[1].geographicWitnesses).toEqual(
      ambiguousLatest.geographicWitnesses,
    )
    for (const call of vi.mocked(graphqlQuery).mock.calls) {
      expect(call[2]).toMatchObject({ auth: 'none', signal: controller.signal })
    }
  })
  it('keeps the original complete detail vector and publication', async () => {
    vi.mocked(graphqlQuery).mockResolvedValueOnce({
      descriptor: dataset,
      insObservations: {
        nodes: [observation],
        pageInfo: {
          totalCount: -1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    })
    const result = await fetchStatisticsDatasetSeries({
      code: 'TEST',
      filter: {},
      contextCode: null,
    })
    expect(result.sourceDescriptor?.metadata.revision_id).toBe(
      '9007199254740993',
    )
    expect(result.observations[0]).toMatchObject({
      id: 'cell-opaque',
      dataset_code: 'TEST',
      dimensions: observation.dimensions,
    })
    expect(result.totalCount).toBe(1)
    expect(vi.mocked(graphqlQuery).mock.calls[0][0]).toContain(
      'query InsSourceObservations',
    )
  })
  it('does not turn a canceled benchmark request into a successful partial hub', async () => {
    const controller = new AbortController()
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce({
        dashboard: [dashboard()],
        identity: {
          nodes: [
            {
              code: '54975',
              siruta_code: '54975',
              level: 'LAU',
              name_ro: 'Test',
            },
          ],
        },
      })
      .mockImplementationOnce(async () => {
        controller.abort()
        throw new DOMException('Aborted', 'AbortError')
      })
    await expect(
      fetchStatisticsTerritoryHubLive('54975', controller.signal),
    ).rejects.toThrow('Aborted')
  })
})

describe('native publication and cadence review regressions', () => {
  it('requires declared status and publication for AVAILABLE outcomes including NO_DATA', () => {
    for (const data_status of [undefined, 'CATALOG_ONLY']) {
      expect(
        insLatestValueNodeRawSchema.safeParse({
          ...success(),
          dataset: { ...dataset, data_status },
        }).success,
      ).toBe(false)
      expect(
        insDashboardGroupRawSchema.safeParse({
          ...dashboard(),
          dataset: { ...dataset, data_status },
        }).success,
      ).toBe(false)
    }
    expect(
      insLatestValueNodeRawSchema.safeParse({
        ...ambiguous(),
        matchStrategy: 'NO_DATA',
        geographicWitnesses: [],
        dataset: { ...dataset, metadata: null },
      }).success,
    ).toBe(false)
  })
  it.each(['MONTHLY', 'SEMESTRIAL', 'RANGE', 'OTHER'])(
    'retains %s cells without mixing chart cadence or changing the server headline',
    async (periodicity) => {
      const older = {
        ...structuredClone(observation),
        id: 'older-source-cell',
        value_status: 'c',
        time_period: {
          iso_period: periodicity === 'MONTHLY' ? '2024-12' : '2023-S1',
          year: periodicity === 'MONTHLY' ? 2024 : 2023,
          month: periodicity === 'MONTHLY' ? 12 : null,
          periodicity,
        },
      }
      vi.mocked(graphqlQuery)
        .mockReset()
        .mockResolvedValueOnce({
          dashboard: [{ ...dashboard(), observations: [observation, older] }],
          identity: {
            nodes: [
              {
                code: '54975',
                siruta_code: '54975',
                level: 'LAU',
                name_ro: 'Test',
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          loaded: { pageInfo: { totalCount: 1 } },
          catalog: { pageInfo: { totalCount: 1 } },
          county: [],
          national: [],
        })
      const hub = await fetchStatisticsTerritoryHubLive('54975')
      expect(hub?.tiles[0].latestPeriod).toBe('2024')
      expect(hub?.tiles[0].latestYear).toBe(2024)
      expect(hub?.tiles[0].sparkline).toEqual([])
      expect(hub?.tiles[0].sparklineUnavailable).toBe(true)
      expect(
        collectHubPeriodOptions(hub).map((period) => period.iso_period),
      ).toContain(older.time_period.iso_period)
      const selected = applyHubPeriod(hub!, older.time_period.iso_period)
        .tiles[0]
      expect(selected.tileState).toBe('available')
      expect(selected.value).toBeNull()
      expect(selected.valueStatus).toBe('c')
    },
  )
})

it('does not pick the first of different cadences sharing a native period token', async () => {
  const sourceRows = ['SEMESTRIAL', 'RANGE'].map((periodicity, index) => ({
    ...structuredClone(observation),
    id: 'period-collision-' + index,
    value: String(index + 1),
    time_period: { iso_period: '2024-01-01', year: 2024, periodicity },
  }))
  vi.mocked(graphqlQuery)
    .mockReset()
    .mockResolvedValueOnce({
      dashboard: [
        {
          ...dashboard(),
          latestPeriod: '2024-01-01',
          observations: sourceRows,
        },
      ],
      identity: {
        nodes: [
          {
            code: '54975',
            siruta_code: '54975',
            level: 'LAU',
            name_ro: 'Test',
          },
        ],
      },
    })
    .mockResolvedValueOnce({
      loaded: { pageInfo: { totalCount: 1 } },
      catalog: { pageInfo: { totalCount: 1 } },
      county: [],
      national: [],
    })
  const hub = await fetchStatisticsTerritoryHubLive('54975')
  expect(hub?.tiles[0].tileState).toBe('period-ambiguous')
  expect(hub?.tiles[0].value).toBeNull()
  const selected = applyHubPeriod(hub!, '2024-01-01').tiles[0]
  expect(selected.tileState).toBe('period-ambiguous')
  expect(selected.value).toBeNull()
  expect(selected.valueStatus).toBeNull()
  expect(selected.latestPeriod).toBeNull()
  expect(selected.sourceObservations).toHaveLength(2)
})
