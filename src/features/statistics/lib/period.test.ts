import { describe, expect, it } from 'vitest'
import type { InsObservation } from '@/schemas/ins'
import {
  buildDataThroughLabel,
  getLatestTimePeriod,
  isPeriodStale,
  periodSortKey,
  resolveLatestPeriod,
} from './period'

const observation = (
  year: number,
  overrides: Partial<InsObservation['time_period']> = {},
): InsObservation =>
  ({
    id: `obs:${year}`,
    dataset_code: 'POP107D',
    value: '1',
    value_status: null,
    territory: null,
    unit: null,
    classifications: [],
    dimensions: {},
    time_period: {
      id: `tp:${year}`,
      year,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
      period_start: null,
      period_end: null,
      label_ro: null,
      label_en: null,
      iso_period: String(year),
      ...overrides,
    },
  }) as unknown as InsObservation

// Reference date fixed to the snapshot era so assertions never rot.
const AUG_2026 = new Date(2026, 7, 15)

describe('periodSortKey / getLatestTimePeriod', () => {
  it('orders annual < quarterly < monthly within a year', () => {
    const annual = observation(2024)
    const monthly = observation(2024, { month: 11, iso_period: '2024-11' })
    expect(periodSortKey(monthly.time_period)).toBeGreaterThan(
      periodSortKey(annual.time_period),
    )
    expect(getLatestTimePeriod([annual, monthly])?.iso_period).toBe('2024-11')
  })
})

describe('resolveLatestPeriod', () => {
  it('prefers an explicit latestPeriod string', () => {
    expect(
      resolveLatestPeriod({ latestPeriod: '2024', observations: [] }),
    ).toBe('2024')
  })

  it('falls back to observations for empty/absent latestPeriod', () => {
    expect(
      resolveLatestPeriod({
        latestPeriod: '  ',
        observations: [observation(2023)],
      }),
    ).toBe('2023')
    expect(resolveLatestPeriod({ observations: [] })).toBeNull()
  })

  it('survives a structured (non-string) latestPeriod from the wire', () => {
    // The live-lane `period.trim is not a function` crash class: an object
    // must fall through to observations, never throw.
    const structured = { year: 2024 } as unknown as string
    expect(
      resolveLatestPeriod({
        latestPeriod: structured,
        observations: [observation(2022)],
      }),
    ).toBe('2022')
  })
})

describe('buildDataThroughLabel', () => {
  it('labels annual, quarterly, and monthly periods', () => {
    expect(buildDataThroughLabel('2024')).toContain('2024')
    expect(buildDataThroughLabel('2024-Q1')).toContain('T1')
    expect(buildDataThroughLabel('2024-03')).toContain('martie')
  })

  it('returns null for absent periods (no invented freshness)', () => {
    expect(buildDataThroughLabel(null)).toBeNull()
    expect(buildDataThroughLabel('  ')).toBeNull()
  })
})

describe('isPeriodStale (cadence-aware)', () => {
  it('treats recent annual data as CURRENT (2023/2024 in 2026)', () => {
    expect(
      isPeriodStale({ latestPeriod: '2024', referenceDate: AUG_2026 }),
    ).toBe(false)
    expect(
      isPeriodStale({ latestPeriod: '2023', referenceDate: AUG_2026 }),
    ).toBe(false)
  })

  it('flags old annual data', () => {
    expect(
      isPeriodStale({ latestPeriod: '2022', referenceDate: AUG_2026 }),
    ).toBe(true)
  })

  it('flags monthly data older than six months, keeps fresher current', () => {
    expect(
      isPeriodStale({ latestPeriod: '2025-11', referenceDate: AUG_2026 }),
    ).toBe(true)
    expect(
      isPeriodStale({ latestPeriod: '2026-04', referenceDate: AUG_2026 }),
    ).toBe(false)
  })

  it('flags quarterly data older than a year', () => {
    expect(
      isPeriodStale({ latestPeriod: '2025-Q1', referenceDate: AUG_2026 }),
    ).toBe(true)
    expect(
      isPeriodStale({ latestPeriod: '2025-Q4', referenceDate: AUG_2026 }),
    ).toBe(false)
  })

  it('never invents staleness for null or unknown grammars', () => {
    expect(isPeriodStale({ latestPeriod: null, referenceDate: AUG_2026 })).toBe(
      false,
    )
    expect(
      isPeriodStale({ latestPeriod: 'garbage', referenceDate: AUG_2026 }),
    ).toBe(false)
  })
})

describe('B12: the router leaks raw-typed values past validateSearch', () => {
  it('coerces a numeric ?period= into its string form', async () => {
    const { statisticsPeriodSearchSchema, parseStatisticsTerritoryHubSearch } =
      await import('@/schemas/statistics')
    expect(statisticsPeriodSearchSchema.parse(2019)).toBe('2019')
    expect(parseStatisticsTerritoryHubSearch({ period: 2019 })).toEqual({
      period: '2019',
    })
  })

  it('coerces a numeric ?loc= on the landing', async () => {
    const { parseStatisticsLandingSearch } =
      await import('@/schemas/statistics')
    expect(parseStatisticsLandingSearch({ loc: 54975 })).toEqual({
      loc: '54975',
    })
  })

  it('preserves numeric territory entries for strict comparison validation', async () => {
    const { parseStatisticsComparisonsSearch } =
      await import('@/schemas/statistics')
    expect(parseStatisticsComparisonsSearch({ teritorii: [54975] })).toEqual({
      teritorii: [54975],
    })
  })

  it('preserves a lone territory value for explicit comparison validation', async () => {
    const { parseStatisticsComparisonsSearch } =
      await import('@/schemas/statistics')
    expect(parseStatisticsComparisonsSearch({ teritorii: 54975 })).toEqual({
      teritorii: 54975,
    })
  })

  it('preserves numeric comparison periods until cadence-aware validation', async () => {
    const { parseStatisticsComparisonsSearch } =
      await import('@/schemas/statistics')
    expect(parseStatisticsComparisonsSearch({ perioada: 2024 })).toEqual({
      perioada: 2024,
    })
  })
})
