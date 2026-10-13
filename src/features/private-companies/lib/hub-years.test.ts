import { describe, expect, it } from 'vitest'
import { hubYearsFrom, rawDeparture, type HubSeriesPoint, type HubYearSeries } from './hub-years'

/**
 * The generator writes the hub's years only from an answer these rules
 * accept: a run of years ending in the snapshot's, finite sums, no more
 * reporters than companies with a statement, a gap only with its reason, and
 * employees within the ceiling. Each rejected answer below would otherwise
 * ship in the snapshot as fact.
 */

const CEILING = 50_000

const point = (fiscalYear: number, sum: string | null, contributors: number, filers = 10, extra: Partial<HubSeriesPoint> = {}): HubSeriesPoint => ({
  fiscalYear,
  available: sum !== null,
  gapReason: sum === null ? 'NO_STATEMENTS' : null,
  filers: String(filers),
  metric: { sum, contributors: String(contributors) },
  ...extra,
})

const answer = (patch: Partial<HubYearSeries> = {}): HubYearSeries => ({
  turnover: [point(2024, '1000.40', 9), point(2025, '1100.00', 8)],
  netResult: [point(2024, '-20.00', 9), point(2025, '15.00', 8)],
  employees: [point(2024, '40', 9, 9), point(2025, '44', 8, 8)],
  ...patch,
})

describe('the hub snapshot’s years', () => {
  it('turns a clean answer into the years, sums rounded to the unit, a loss kept negative', () => {
    const { years, problems } = hubYearsFrom(answer(), 2025, CEILING)
    expect(problems).toEqual([])
    expect(years.map((year) => [year.year, year.filers, year.turnover.sum, year.netResult.sum, year.employees.sum])).toEqual([
      [2024, 10, 1000, -20, 40],
      [2025, 10, 1100, 15, 44],
    ])
  })

  it('keeps a year without a value as a gap with its reason, never as zero', () => {
    const { years, problems } = hubYearsFrom(answer({ netResult: [point(2024, null, 0, 10, { gapReason: 'NOT_ADMITTED' }), point(2025, '15.00', 8)] }), 2025, CEILING)
    expect(problems).toEqual([])
    expect(years[0]?.netResult).toEqual({ sum: null, gap: 'NOT_ADMITTED', reported: 0 })
  })

  it('rejects a sum that is not a number', () => {
    expect(hubYearsFrom(answer({ turnover: [point(2024, 'NaN', 9), point(2025, '1100.00', 8)] }), 2025, CEILING).problems).toContain('turnover 2024: the sum is not a number: NaN')
  })

  it('rejects more reporters than companies with a statement', () => {
    expect(hubYearsFrom(answer({ turnover: [point(2024, '1000.00', 11), point(2025, '1100.00', 8)] }), 2025, CEILING).problems).toContain('turnover 2024: 11 reported of 10 companies with a statement')
  })

  it('rejects employees past the ceiling, and a negative headcount', () => {
    expect(hubYearsFrom(answer({ employees: [point(2024, '50001', 1, 1), point(2025, '44', 8, 8)] }), 2025, CEILING).problems).toContain('employees 2024: 50001 employees from 1 companies, past the ceiling of 50000')
    expect(hubYearsFrom(answer({ employees: [point(2024, '-3', 1, 1), point(2025, '44', 8, 8)] }), 2025, CEILING).problems.length).toBe(1)
  })

  it('rejects a gap without a known reason', () => {
    expect(hubYearsFrom(answer({ netResult: [point(2024, null, 0, 10, { gapReason: null }), point(2025, '15.00', 8)] }), 2025, CEILING).problems).toContain('netResult 2024: no sum and no known reason (null)')
  })

  it('rejects years that do not run to the snapshot’s, or skip one', () => {
    expect(hubYearsFrom(answer(), 2026, CEILING).problems).toContain('the years are not a run ending in 2026')
    const skipped = answer({ turnover: [point(2023, '900.00', 9), point(2025, '1100.00', 8)] })
    expect(hubYearsFrom(skipped, 2025, CEILING).problems).toContain('the years are not a run ending in 2025')
  })

  it('rejects a year twice, or a year turnover has not', () => {
    const twice = answer({ netResult: [point(2024, '-20.00', 9), point(2024, '-25.00', 9), point(2025, '15.00', 8)] })
    expect(hubYearsFrom(twice, 2025, CEILING).problems).toContain("netResult's years differ from turnover's")
    const extra = answer({ employees: [point(2023, '40', 9, 9), point(2024, '40', 9, 9), point(2025, '44', 8, 8)] })
    expect(hubYearsFrom(extra, 2025, CEILING).problems).toContain("employees's years differ from turnover's")
  })

  it('rejects contradictory points: a value with a gap reason, an offered year without a sum, reporters for a year without a value', () => {
    const problems = (patch: Partial<HubSeriesPoint>) => hubYearsFrom(answer({ netResult: [point(2024, '-20.00', 9, 10, patch), point(2025, '15.00', 8)] }), 2025, CEILING).problems
    expect(problems({ gapReason: 'NOT_ADMITTED' })).toContain('netResult 2024: available, with a gap reason (NOT_ADMITTED)')
    expect(problems({ metric: { sum: null, contributors: '9' } })).toContain('netResult 2024: available, with no sum')
    expect(problems({ available: false, gapReason: 'NOT_ADMITTED', metric: { sum: null, contributors: '3' } })).toContain('netResult 2024: 3 reported for a year without a value')
  })

  it('rejects more companies within the headcount ceiling than with a statement', () => {
    expect(hubYearsFrom(answer({ employees: [point(2024, '40', 9, 11), point(2025, '44', 8, 8)] }), 2025, CEILING).problems).toContain("employees 2024: more companies than turnover's")
  })

  it('measures how far a raw sum strays from the release’s: the gate the generator holds at 5%', () => {
    // 2025 as read on 12 October 2026: 2.2% on turnover; insurers' 2024 headcounts would be 27%.
    expect(rawDeparture(2_841_237_823_768, 2_780_302_718_022)).toBeLessThan(0.05)
    expect(rawDeparture(5_324_102, 4_186_301)).toBeGreaterThan(0.05)
    expect(rawDeparture(1, null)).toBe(Infinity)
  })

  it('rejects series whose companies differ, except the range-filtered employees', () => {
    expect(hubYearsFrom(answer({ netResult: [point(2024, '-20.00', 9, 12), point(2025, '15.00', 8)] }), 2025, CEILING).problems).toContain("netResult 2024: its companies differ from turnover's")
  })
})
