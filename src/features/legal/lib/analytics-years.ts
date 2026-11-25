/**
 * The time axis of the acts-per-year charts. The API leaves out a year without acts; a chart that drew only
 * the years served would set 1926 beside 1946 at the distance of 2025 from 2026. Every calendar year of the
 * period gets a column, an absent one as zeros.
 */

export type YearColumn = { readonly year: number; readonly values: readonly number[] }

/** The years the API answers: the axis never runs past them. */
const YEAR_MIN = 1800
const YEAR_MAX = 2100

/**
 * One column a year from `from` to `to` (by default the first and the last year served), each `width` values
 * wide. Years served outside the bounds are left out: the caller counts them.
 */
export function everyYear(years: readonly YearColumn[], width: number, bounds: { readonly from?: number; readonly to?: number } = {}): YearColumn[] {
  // only the years the API answers: a stray year in an answer never spreads the axis over centuries
  const served = years.map((row) => row.year).filter((year) => year >= YEAR_MIN && year <= YEAR_MAX)
  if (served.length === 0 && (bounds.from === undefined || bounds.to === undefined)) return []
  const from = Math.max(YEAR_MIN, bounds.from ?? Math.min(...served))
  const to = Math.min(YEAR_MAX, bounds.to ?? Math.max(...served))
  const byYear = new Map(years.map((row) => [row.year, row.values]))
  const empty = Array.from({ length: width }, () => 0)
  const out: YearColumn[] = []
  for (let year = from; year <= to; year += 1) out.push({ year, values: byYear.get(year) ?? empty })
  return out
}
