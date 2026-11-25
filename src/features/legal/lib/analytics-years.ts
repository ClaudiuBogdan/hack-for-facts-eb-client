/**
 * The time axis of the acts-per-year charts. The API leaves out a year without acts; a chart that drew only
 * the years served would set 1926 beside 1946 at the distance of 2025 from 2026. Every calendar year of the
 * period gets a column, an absent one as zeros.
 */

export type YearColumn = { readonly year: number; readonly values: readonly number[] }

/**
 * One column a year from `from` to `to` (by default the first and the last year served), each `width` values
 * wide. Years served outside the bounds are left out: the caller counts them.
 */
export function everyYear(years: readonly YearColumn[], width: number, bounds: { readonly from?: number; readonly to?: number } = {}): YearColumn[] {
  if (years.length === 0 && (bounds.from === undefined || bounds.to === undefined)) return []
  const served = years.map((row) => row.year)
  const from = bounds.from ?? Math.min(...served)
  const to = bounds.to ?? Math.max(...served)
  const byYear = new Map(years.map((row) => [row.year, row.values]))
  const empty = Array.from({ length: width }, () => 0)
  const out: YearColumn[] = []
  for (let year = from; year <= to; year += 1) out.push({ year, values: byYear.get(year) ?? empty })
  return out
}
