import { describe, expect, it } from 'vitest'
import type { AnalyticsFilterType } from '@/schemas/charts'
import {
  breakdownFilter,
  changeOf,
  coveragePlan,
  coverageRead,
  figuresRead,
  largestRead,
  lastMonthOf,
  previousYearRead,
  rankingRead,
  selectionOf,
  singleYear,
  withTransfers,
  yearPeriod,
  type Preferences,
  type RankingAddress,
} from './public-institutions-selection'

/**
 * One address, the reads that answer it: the server's loader and the page
 * build them here, so they must agree on every key; and a read the page does
 * not show is not made.
 */

const FILTER: AnalyticsFilterType = {
  account_category: 'ch',
  report_period: yearPeriod(2025, 2025),
  normalization: 'total',
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
}
const ADDRESS: RankingAddress = { filter: FILTER, sortOrder: 'desc', page: 1, pageSize: 25 }
const PREFERENCES: Preferences = { currency: 'RON', inflationAdjusted: false }
// The old page's resolution, reduced to what these tests need: the preferences where the address names none.
const resolve = (filter: AnalyticsFilterType, preferences: Preferences): AnalyticsFilterType => ({ ...filter, currency: filter.currency ?? preferences.currency, inflation_adjusted: filter.inflation_adjusted ?? preferences.inflationAdjusted })
const ranking = (filter: AnalyticsFilterType): AnalyticsFilterType => (filter.normalization === 'per_capita' && filter.is_territorial_executive === undefined ? { ...filter, is_territorial_executive: true } : filter)
type Override = Omit<Partial<RankingAddress>, 'filter'> & { readonly filter?: Partial<AnalyticsFilterType> }
const select = (address: Override = {}) =>
  selectionOf({ ...ADDRESS, ...address, filter: { ...FILTER, ...address.filter } }, PREFERENCES, resolve, ranking)

describe('the selection an address asks for', () => {
  it('orders by what it measures unless the address says otherwise', () => {
    expect(select().sortBy).toBe('total_amount')
    expect(select({ filter: { normalization: 'per_capita' } }).sortBy).toBe('per_capita_amount')
    expect(select({ sortBy: 'entity_name' }).sortBy).toBe('entity_name')
  })

  it('names the measure the head offers, and „other” for one only an older link asks for', () => {
    expect(select().measure).toBe('total')
    expect(select({ filter: { normalization: 'per_capita' } }).measure).toBe('per_capita')
    expect(select({ filter: { normalization: 'percent_gdp' } }).measure).toBe('other')
  })

  it('keeps the per-capita ranking to the territorial executives, and the page read itself unchanged', () => {
    const perCapita = select({ filter: { normalization: 'per_capita' } })
    expect(perCapita.rankingFilter.is_territorial_executive).toBe(true)
    expect(rankingRead(perCapita).filter.is_territorial_executive).toBeUndefined()
    // The API ranks the executives per inhabitant whatever the address says; the figures and the breakdown follow it.
    expect(select({ filter: { normalization: 'per_capita', is_territorial_executive: false } }).rankingFilter.is_territorial_executive).toBe(true)
  })

  it('reads the order in any case', () => {
    expect(select({ sortBy: 'TOTAL_AMOUNT' }).sortBy).toBe('total_amount')
    expect(select({ filter: { normalization: 'percent_gdp' }, sortBy: 'PER_CAPITA_AMOUNT' }).sortBy).toBe('total_amount')
  })

  it('reads one kind of report: the principal officers’ when the address names none', () => {
    expect(select({ filter: { report_type: undefined } }).filter.report_type).toBe('Executie bugetara agregata la nivel de ordonator principal')
    expect(select({ filter: { report_type: 'Executie bugetara detaliata' } }).filter.report_type).toBe('Executie bugetara detaliata')
  })

  it('shows amounts, never the growth an older link asks for', () => {
    expect(select({ filter: { show_period_growth: true } }).filter.show_period_growth).toBeUndefined()
  })

  it('orders a % of GDP list by its amount when the address asks for a per-capita or population order', () => {
    expect(select({ filter: { normalization: 'percent_gdp' }, sortBy: 'per_capita_amount' }).sortBy).toBe('total_amount')
    expect(select({ filter: { normalization: 'percent_gdp' }, sortBy: 'population' }).sortBy).toBe('total_amount')
    expect(select({ filter: { normalization: 'percent_gdp' }, sortBy: 'entity_name' }).sortBy).toBe('entity_name')
  })

  it('reads a year only when the period is one year', () => {
    expect(singleYear(yearPeriod(2024, 2024))).toBe(2024)
    expect(singleYear(yearPeriod(2023, 2025))).toBeNull()
    expect(singleYear({ type: 'YEAR', selection: { dates: ['2022'] } } as AnalyticsFilterType['report_period'])).toBe(2022)
    expect(singleYear({ type: 'MONTH', selection: { interval: { start: '2025-01', end: '2025-01' } } } as AnalyticsFilterType['report_period'])).toBeNull()
  })
})

describe('the figures', () => {
  it('read one series over the year and the one before, the total always and per inhabitant when shown', () => {
    const total = figuresRead(select())
    expect(total?.map((input) => input.seriesId)).toEqual(['total'])
    expect(total?.[0].filter.report_period).toEqual(yearPeriod(2024, 2025))
    const perCapita = figuresRead(select({ filter: { normalization: 'per_capita' } }))
    expect(perCapita?.map((input) => [input.seriesId, input.filter.normalization, input.filter.is_territorial_executive])).toEqual([
      ['total', 'total', true],
      ['per-capita', 'per_capita', true],
    ])
  })

  it('read nothing for a period that is not one year or a measure the head does not offer', () => {
    expect(figuresRead(select({ filter: { report_period: yearPeriod(2023, 2025) } }))).toBeNull()
    expect(figuresRead(select({ filter: { normalization: 'percent_gdp' } }))).toBeNull()
  })

  it('read nothing under an amount threshold, which a sum of all institutions would apply to the sum', () => {
    expect(figuresRead(select({ filter: { aggregate_min_amount: 90 } }))).toBeNull()
    expect(largestRead(select({ filter: { aggregate_max_amount: 90 }, page: 2 }))).toBeNull()
  })

  it('take the ten largest from the ranking when its page already is them, and read them otherwise', () => {
    expect(largestRead(select())).toBeNull()
    expect(largestRead(select({ page: 2 }))).toMatchObject({ sortBy: 'total_amount', sortOrder: 'desc', page: 1, pageSize: 10 })
    expect(largestRead(select({ sortBy: 'entity_name', sortOrder: 'asc' }))).not.toBeNull()
    expect(largestRead(select({ filter: { normalization: 'per_capita' } }))).toBeNull()
  })
})

describe('the year before', () => {
  it('reads the page’s rows a year earlier, without the thresholds that chose them', () => {
    const read = previousYearRead(select({ filter: { aggregate_min_amount: 1000, min_population: 500 } }), ['1', '2'])
    expect(read?.filter.entity_cuis).toEqual(['1', '2'])
    expect(read?.filter.report_period).toEqual(yearPeriod(2024, 2024))
    expect(read?.filter.aggregate_min_amount).toBeUndefined()
    expect(read?.filter.min_population).toBeUndefined()
    expect(read?.pageSize).toBe(2)
  })

  it('reads nothing without rows or without one year', () => {
    expect(previousYearRead(select(), [])).toBeNull()
    expect(previousYearRead(select({ filter: { report_period: yearPeriod(2023, 2025) } }), ['1'])).toBeNull()
  })

  it('compares only with something', () => {
    expect(changeOf(110, 100)).toBeCloseTo(0.1)
    expect(changeOf(90, -100)).toBeCloseTo(1.9)
    expect(changeOf(1, 0)).toBeNull()
    expect(changeOf(null, 100)).toBeNull()
    expect(changeOf(100, undefined)).toBeNull()
  })
})

describe('the breakdown', () => {
  it('reads the ranking’s own institutions, the per-capita scope included, without the amount threshold', () => {
    const filter = breakdownFilter(select({ filter: { normalization: 'per_capita', aggregate_min_amount: 5, county_codes: ['CJ'] } }))
    expect(filter.is_territorial_executive).toBe(true)
    expect(filter.aggregate_min_amount).toBeUndefined()
    expect(filter.county_codes).toEqual(['CJ'])
  })
})

describe('transfers between budgets', () => {
  const nodes = [{ ec_c: '51.01.01' }, { ec_c: '51.02.12' }, { ec_c: '10.01.01' }, { ec_c: '51.03.00' }]
  it('are the economic titles 51.01 and 51.02, kept, dropped or alone', () => {
    expect(withTransfers(nodes, 'all', false)).toHaveLength(4)
    expect(withTransfers(nodes, 'no-transfers', false).map((node) => node.ec_c)).toEqual(['10.01.01', '51.03.00'])
    expect(withTransfers(nodes, 'transfers-only', false).map((node) => node.ec_c)).toEqual(['51.01.01', '51.02.12'])
  })

  it('leave income whole', () => {
    expect(withTransfers(nodes, 'no-transfers', true)).toHaveLength(4)
  })
})

describe('how far the data reaches', () => {
  const at = (iso: string) => new Date(iso)
  it('asks nothing of a year whose December report has had three months to arrive', () => {
    expect(coveragePlan(2024, at('2026-11-25T00:00:00Z'))).toBe('whole')
    expect(coveragePlan(2025, at('2026-04-01T00:00:00Z'))).toBe('whole')
  })

  it('reads December for the year just ended, in its first three months, and the months for the year in progress', () => {
    expect(coveragePlan(2025, at('2026-01-15T00:00:00Z'))).toBe('december')
    expect(coveragePlan(2025, at('2026-03-31T23:00:00Z'))).toBe('december')
    expect(coveragePlan(2026, at('2026-11-25T00:00:00Z'))).toBe('months')
  })

  it('reads the whole budget, in lei, for December or the twelve months', () => {
    const [december] = coverageRead(2025, 'december', { account_category: 'vn', report_type: 'Executie bugetara detaliata' })
    expect(december.filter).toMatchObject({ account_category: 'vn', report_type: 'Executie bugetara detaliata', normalization: 'total', currency: 'RON' })
    expect(december.filter.report_period).toEqual({ type: 'MONTH', selection: { interval: { start: '2025-12', end: '2025-12' } } })
    expect(coverageRead(2026, 'months', { account_category: 'ch' })[0].filter.report_period).toEqual({ type: 'MONTH', selection: { interval: { start: '2026-01', end: '2026-12' } } })
  })

  it('takes the last month with an amount', () => {
    expect(lastMonthOf([{ x: '2026-01', y: 5 }, { x: '2026-10', y: 7 }, { x: '2026-03', y: 1 }])).toBe('2026-10')
    expect(lastMonthOf([{ x: '2026-11', y: 0 }])).toBeNull()
    expect(lastMonthOf([])).toBeNull()
  })
})
