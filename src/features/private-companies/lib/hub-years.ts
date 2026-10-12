import type { CompanyAnalysisGapReason } from '@/schemas/company-analytics'
import type { HubFiscalYear, HubYearMeasure } from './hub-snapshot-types'

/**
 * The companies analytics release's series as the hub snapshot's years, or
 * why they are not fit to write. `scripts/generate-companies-hub-snapshot.mjs`
 * imports this (Node strips the types), so the generator writes nothing a
 * check here rejects: a broken read must stop the snapshot, never ship in it.
 * No Lingui here — the generator runs it outside the app.
 */

/** One point of `companyAnalysisSeries`, as the API serves it (counts and sums as decimal strings). */
export interface HubSeriesPoint {
  readonly fiscalYear: number
  readonly available: boolean
  readonly gapReason: string | null
  readonly filers: string | number
  readonly metric: { readonly sum: string | null; readonly contributors: string | number }
}

export interface HubYearSeries {
  readonly turnover: readonly HubSeriesPoint[]
  readonly netResult: readonly HubSeriesPoint[]
  /** Read within the headcount ceiling (a range filter), so its own filers are the companies within it. */
  readonly employees: readonly HubSeriesPoint[]
}

const GAP_REASONS: ReadonlySet<string> = new Set(['NO_STATEMENTS', 'NOT_ADMITTED', 'NO_REPORTED_VALUES'])

/**
 * The years, oldest first, up to `year`: a run without a gap ending in it,
 * each measure's sum a finite number of lei (or headcount) rounded to the
 * unit — or null exactly when the release has none, with its reason — and
 * reported by at most the year's companies with a statement. Employees stay
 * within `ceiling` per company that reported.
 */
export function hubYearsFrom(series: HubYearSeries, year: number, ceiling: number): { readonly years: readonly HubFiscalYear[]; readonly problems: readonly string[] } {
  const problems: string[] = []
  const turnover = series.turnover.filter((point) => point.fiscalYear <= year)
  const fiscalYears = turnover.map((point) => point.fiscalYear)
  if (fiscalYears.length < 2 || fiscalYears[fiscalYears.length - 1] !== year || fiscalYears.some((value, index) => index > 0 && value !== (fiscalYears[index - 1] ?? 0) + 1)) {
    problems.push(`the years are not a run ending in ${year}`)
  }
  const count = (value: string | number, what: string): number => {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) problems.push(`${what} is not a count: ${value}`)
    return parsed
  }
  const measureOf = (point: HubSeriesPoint | undefined, key: keyof HubYearSeries, filers: number): HubYearMeasure => {
    if (!point) {
      problems.push(`${key} has no point for a year turnover has`)
      return { sum: null, gap: null, reported: 0 }
    }
    const where = `${key} ${point.fiscalYear}`
    const reported = count(point.metric.contributors, `${where} contributors`)
    if (reported > filers) problems.push(`${where}: ${reported} reported of ${filers} companies with a statement`)
    if (!point.available || point.metric.sum === null) {
      if (point.available === false && point.metric.sum !== null) problems.push(`${where}: a sum for a year the release does not offer`)
      const gap = point.gapReason
      if (!point.available && (gap === null || !GAP_REASONS.has(gap))) problems.push(`${where}: no sum and no known reason (${gap})`)
      return { sum: null, gap: point.available ? null : (gap as CompanyAnalysisGapReason), reported }
    }
    const sum = Number(point.metric.sum)
    if (!Number.isFinite(sum)) problems.push(`${where}: the sum is not a number: ${point.metric.sum}`)
    if (key === 'employees' && (sum < 0 || sum > reported * ceiling)) problems.push(`${where}: ${sum} employees from ${reported} companies, past the ceiling of ${ceiling}`)
    return { sum: Math.round(sum), gap: null, reported }
  }
  const years = turnover.map((point, index): HubFiscalYear => {
    const filers = count(point.filers, `turnover ${point.fiscalYear} filers`)
    const aligned = (key: keyof HubYearSeries) => {
      const other = series[key].find((candidate) => candidate.fiscalYear === point.fiscalYear)
      // A range filter narrows its own series' companies; the others count every company with a statement.
      if (other && key !== 'employees' && count(other.filers, `${key} ${point.fiscalYear} filers`) !== filers) problems.push(`${key} ${point.fiscalYear}: its companies differ from turnover's`)
      return other
    }
    const employees = aligned('employees')
    return {
      year: point.fiscalYear,
      filers,
      turnover: measureOf(turnover[index], 'turnover', filers),
      netResult: measureOf(aligned('netResult'), 'netResult', filers),
      employees: measureOf(employees, 'employees', employees ? count(employees.filers, `employees ${point.fiscalYear} filers`) : filers),
    }
  })
  return { years, problems }
}
