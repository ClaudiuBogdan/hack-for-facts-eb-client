import { describe, expect, it } from 'vitest'
import type { StatisticsLatestValue } from '@/schemas/statistics'
import { buildNationalComparison } from './national-compare'

const latest = (
  overrides: Partial<StatisticsLatestValue>,
): StatisticsLatestValue => ({
  datasetCode: 'POP107D',
  datasetNameRo: null,
  datasetNameEn: null,
  periodicity: ['ANNUAL'],
  matchStrategy: 'TOTAL_FALLBACK',
  hasData: true,
  value: '100',
  valueStatus: null,
  unitCode: 'PERS',
  unitSymbol: 'pers.',
  unitNameRo: null,
  period: '2025',
  resolvedPeriodicity: 'ANNUAL',
  resolvedClassifications: [],
  ...overrides,
})

describe('buildNationalComparison', () => {
  it('computes a share of country for absolute units', () => {
    const comparison = buildNationalComparison({
      local: latest({ value: '325353' }),
      national: latest({ value: '21739373' }),
    })
    expect(comparison?.kind).toBe('share')
    if (comparison?.kind === 'share') {
      expect(comparison.shareOfCountryPct).toBeCloseTo(1.497, 2)
    }
  })

  it('shows the national rate (never a share) for percent units', () => {
    const comparison = buildNationalComparison({
      local: latest({ value: '0.3', unitSymbol: '%', period: '2025-11' }),
      national: latest({ value: '1.9', unitSymbol: '%', period: '2025-11' }),
    })
    expect(comparison?.kind).toBe('reference')
    if (comparison?.kind === 'reference') {
      expect(comparison.nationalValue).toBe('1.9')
    }
  })

  it('refuses to compare across different periods', () => {
    const comparison = buildNationalComparison({
      local: latest({ value: '100', period: '2024' }),
      national: latest({ value: '1000', period: '2025' }),
    })
    expect(comparison).toBeNull()
  })

  it('returns null for missing values or a missing national side', () => {
    expect(
      buildNationalComparison({
        local: latest({ value: null }),
        national: latest({}),
      }),
    ).toBeNull()
    expect(
      buildNationalComparison({ local: latest({}), national: undefined }),
    ).toBeNull()
  })
})
