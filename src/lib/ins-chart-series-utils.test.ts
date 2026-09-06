import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchInsSourceVector } from '@/features/statistics/api/graphql/ins-source-fetcher'
import type { InsSourceDescriptor } from '@/lib/ins/source-contract'
import type { InsSeriesConfiguration } from '@/schemas/charts'
import type { NativeInsObservation } from '@/schemas/ins'
import {
  mapInsSeriesToAnalyticsSeries,
  insSeriesRuntimeMapper,
} from './ins-chart-series-utils'

vi.mock('@/features/statistics/api/graphql/ins-source-fetcher', () => ({
  fetchInsSourceVector: vi.fn(),
}))
const fetchVector = vi.mocked(fetchInsSourceVector)
const descriptor: InsSourceDescriptor = {
  code: 'POP107D',
  dimension_count: 4,
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
  metadata: {
    revision_id: '9007199254740993',
    transform_contract_sha256: 'b'.repeat(64),
  },
}
function series(
  overrides: Partial<InsSeriesConfiguration> = {},
): InsSeriesConfiguration {
  return {
    id: 'ins-test',
    type: 'ins-series',
    enabled: true,
    label: 'INS',
    unit: '',
    config: { showDataLabels: false, color: '#0000ff' },
    createdAt: '',
    updatedAt: '',
    datasetCode: 'POP107D',
    aggregation: 'sum',
    hasValue: true,
    ...overrides,
  }
}
function row(
  overrides: Partial<NativeInsObservation> = {},
): NativeInsObservation {
  return {
    id: 'opaque-2024',
    dataset_code: 'POP107D',
    value: '10',
    value_status: null,
    time_period: {
      iso_period: '2024',
      year: 2024,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    territory: { code: '54975', level: 'LAU', name_ro: 'Test' },
    unit: { code: '9685', symbol: 'pers.' },
    classifications: [
      { type_code: 'D0', code: '105' },
      { type_code: 'D1', code: '931' },
    ],
    dimensions: {
      geography: {
        pairs: [[1, 931]],
        resolution: 'EXACT',
        flags: [],
        resolvedTerritory: { code: '54975', level: 'LAU' },
        contextTerritory: null,
        applicableRules: [],
        qualified: false,
      },
    },
    ...overrides,
  }
}
const older = (overrides: Partial<NativeInsObservation> = {}) =>
  row({
    id: 'opaque-2023',
    time_period: {
      iso_period: '2023',
      year: 2023,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    ...overrides,
  })
const respond = (observations: NativeInsObservation[]) =>
  fetchVector.mockResolvedValue({ descriptor, observations })
const alternate = (overrides: Partial<NativeInsObservation> = {}) =>
  older({
    classifications: [
      { type_code: 'D0', code: '106' },
      { type_code: 'D1', code: '931' },
    ],
    ...overrides,
  })

describe('native saved INS charts', () => {
  beforeEach(() => vi.resetAllMocks())
  it('sorts a complete single identity without aggregation or numeric surrogate IDs', async () => {
    respond([row({ value: '12.5' }), older({ value: '0' })])
    const result = await mapInsSeriesToAnalyticsSeries(series())
    expect(result.series?.data).toEqual([
      { x: '2023', y: 0 },
      { x: '2024', y: 12.5 },
    ])
    expect(result.series?.yAxis.unit).toBe('pers.')
    expect(result.warnings).toEqual([])
  })
  it.each(['sum', 'average', 'first'] as const)(
    'does not use %s to combine disjoint-date source alternatives',
    async (aggregation) => {
      respond([row(), alternate()])
      const result = await mapInsSeriesToAnalyticsSeries(
        series({ aggregation }),
      )
      expect(result.series).toBeNull()
      expect(result.warnings[0].message).toContain('Multiple INS source series')
    },
  )
  it('does not hide a null-valued source alternative before identity inspection', async () => {
    respond([row(), alternate({ value: null })])
    const result = await mapInsSeriesToAnalyticsSeries(series())
    expect(result.series).toBeNull()
    expect(result.warnings[0].message).toContain('Multiple INS source series')
    expect(fetchVector.mock.calls[0][0].filter).not.toHaveProperty('hasValue')
  })
  it('rejects duplicate source cells even when their opaque IDs differ', async () => {
    respond([row(), row({ id: 'another', value: '20' })])
    const result = await mapInsSeriesToAnalyticsSeries(series())
    expect(result.series).toBeNull()
    expect(result.warnings[0].message).toContain(
      'conflicting source coordinates',
    )
  })
  it('distinguishes unit identities even when labels and values agree', async () => {
    respond([row(), older({ unit: { code: '9686', symbol: 'pers.' } })])
    expect((await mapInsSeriesToAnalyticsSeries(series())).series).toBeNull()
  })
  it('enforces source selections per dimension and retains period and territory intersections', async () => {
    respond([row(), alternate()])
    const period = {
      type: 'YEAR' as const,
      selection: { interval: { start: '2024', end: '2024' } },
    }
    const result = await mapInsSeriesToAnalyticsSeries(
      series({
        period,
        sirutaCodes: ['54975'],
        unitCodes: ['9685'],
        classificationSelections: { D0: ['105'], D1: ['931'] },
      }),
    )
    expect(result.series?.data).toEqual([{ x: '2024', y: 10 }])
    expect(fetchVector).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          period,
          sirutaCodes: ['54975'],
          unitCodes: ['9685'],
          sourcePins: [{ dimensionIndex: 0, memberCode: '105' }, { dimensionIndex: 1, memberCode: '931' }],
        },
      }),
    )
  })
  it('does not discard a malformed row through classification filtering', async () => {
    respond([
      row(),
      older({ classifications: [{ type_code: 'D1', code: '931' }] }),
    ])
    expect(
      (
        await mapInsSeriesToAnalyticsSeries(
          series({ classificationSelections: { D0: ['105'] } }),
        )
      ).series,
    ).toBeNull()
  })
  it.each([null, '', ' ', 'bad', 'Infinity'])(
    'does not turn missing/invalid %s into a zero or bridge a gap',
    async (value) => {
      respond([row(), older({ value })])
      const result = await mapInsSeriesToAnalyticsSeries(series())
      expect(result.series).toBeNull()
      expect(result.warnings[0].message).toContain('missing or invalid values')
    },
  )
  it('keeps geographic qualification visible even for one exact source identity', async () => {
    const observation = row()
    observation.dimensions.geography!.qualified = true
    respond([observation])
    const result = await mapInsSeriesToAnalyticsSeries(series())
    expect(result.series).toBeNull()
    expect(result.warnings[0].message).toContain('geographic qualifications')
  })
  it.each(['SEMESTRIAL', 'RANGE', 'OTHER'] as const)(
    'does not present %s as annual',
    async (periodicity) => {
      respond([
        row({
          time_period: {
            iso_period: '2024-S1',
            year: 2024,
            quarter: null,
            month: null,
            periodicity,
          },
        }),
      ])
      const result = await mapInsSeriesToAnalyticsSeries(series())
      expect(result.series).toBeNull()
      expect(result.warnings[0].message).toContain('supported INS frequency')
    },
  )
  it('does not automatically choose a cadence and hide other cells', async () => {
    respond([
      row(),
      row({
        id: 'monthly',
        time_period: {
          iso_period: '2024-01',
          year: 2024,
          quarter: null,
          month: 1,
          periodicity: 'MONTHLY',
        },
      }),
    ])
    expect((await mapInsSeriesToAnalyticsSeries(series())).series).toBeNull()
  })
  it('rejects an incompatible returned period label', async () => {
    respond([
      row({
        time_period: {
          iso_period: '2024-01',
          year: 2024,
          quarter: null,
          month: 1,
          periodicity: 'ANNUAL',
        },
      }),
    ])
    expect(
      (await mapInsSeriesToAnalyticsSeries(series())).warnings[0].message,
    ).toContain('does not match its frequency')
  })
  it.each<Partial<InsSeriesConfiguration>>([
    { classificationSelections: { SEXE: ['M'] } },
    { classificationSelections: { D0: [] } },
    { unitCodes: ['PERS'] },
    {
      period: {
        type: 'YEAR' as const,
        selection: { dates: ['2023', 'invalid'] },
      },
    },
    {
      period: {
        type: 'YEAR' as const,
        selection: { interval: { start: '2024', end: '2023' } },
      },
    },
  ])(
    'leaves invalid saved selections editable without broadening them: %j',
    async (overrides) => {
      expect(
        (await mapInsSeriesToAnalyticsSeries(series(overrides))).series,
      ).toBeNull()
      expect(fetchVector).not.toHaveBeenCalled()
    },
  )
  it('retains a healthy sibling when another complete vector fails', async () => {
    fetchVector
      .mockRejectedValueOnce(new Error('publication changed'))
      .mockResolvedValueOnce({ descriptor, observations: [row()] })
    const results = await Promise.all(
      [series({ id: 'failed' }), series({ id: 'healthy' })].map((config) =>
        insSeriesRuntimeMapper.mapSeries({ series: config }),
      ),
    )
    expect(results[0].series).toBeNull()
    expect(results[0].warnings[0].seriesId).toBe('failed')
    expect(results[0].retryable).toBe(true)
    expect(results[1].series?.seriesId).toBe('healthy')
  })
  it('passes cancellation and propagates abort instead of caching an unavailable result', async () => {
    const controller = new AbortController()
    fetchVector.mockImplementation(async () => {
      controller.abort()
      throw new DOMException('Aborted', 'AbortError')
    })
    await expect(
      insSeriesRuntimeMapper.mapSeries({
        series: series(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchVector.mock.calls[0][0].signal).toBe(controller.signal)
  })
  it('reports certified empty selections without fabricated data', async () => {
    respond([])
    expect(
      (await mapInsSeriesToAnalyticsSeries(series())).warnings[0].message,
    ).toContain('No INS observations')
  })
  it.each([
    {
      periodicity: 'ANNUAL' as const,
      type: 'YEAR' as const,
      start: '2022',
      end: '2024',
    },
    {
      periodicity: 'QUARTERLY' as const,
      type: 'QUARTER' as const,
      start: '2024-Q1',
      end: '2024-Q3',
    },
    {
      periodicity: 'MONTHLY' as const,
      type: 'MONTH' as const,
      start: '2024-01',
      end: '2024-03',
    },
  ])(
    'rejects absent internal $periodicity periods, but honors explicit sparse date selections',
    async ({ periodicity, type, start, end }) => {
      respond(
        [start, end].map((iso_period) =>
          row({
            id: iso_period,
            time_period: {
              iso_period,
              year: Number(iso_period.slice(0, 4)),
              month: null,
              quarter: null,
              periodicity,
            },
          }),
        ),
      )
      expect(
        (await mapInsSeriesToAnalyticsSeries(series())).warnings[0].message,
      ).toContain('missing expected periods')
      expect(
        (
          await mapInsSeriesToAnalyticsSeries(
            series({
              period: { type, selection: { interval: { start, end } } },
            }),
          )
        ).series,
      ).toBeNull()
      expect(
        (
          await mapInsSeriesToAnalyticsSeries(
            series({ period: { type, selection: { dates: [start, end] } } }),
          )
        ).series?.data,
      ).toHaveLength(2)
    },
  )
  it('rejects an absent requested boundary and an absent explicit date', async () => {
    respond([row()])
    expect(
      (
        await mapInsSeriesToAnalyticsSeries(
          series({
            period: {
              type: 'YEAR',
              selection: { interval: { start: '2023', end: '2024' } },
            },
          }),
        )
      ).series,
    ).toBeNull()
    expect(
      (
        await mapInsSeriesToAnalyticsSeries(
          series({
            period: { type: 'YEAR', selection: { dates: ['2023', '2024'] } },
          }),
        )
      ).series,
    ).toBeNull()
  })
})
