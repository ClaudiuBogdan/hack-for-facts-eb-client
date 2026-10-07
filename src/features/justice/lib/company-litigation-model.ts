import { JUDICIAL_COURT_LEVELS, type JudicialCompanyLitigation, type JudicialCourtLevel } from '@/schemas/judicial'

/** The earliest year a case date is read as a date; earlier stored years are placeholders, not dates. */
export const FIRST_PLAUSIBLE_YEAR = 1900

export interface CompanyLitigationModel {
  readonly caseCount: number
  /** The span of the plausibly dated cases; null when none is. */
  readonly span: { readonly first: number; readonly last: number } | null
  /** Cases counted in the total that no plausible year places (null, infinite or placeholder dates). */
  readonly undated: number
  /** The court levels in the API's order. */
  readonly levels: readonly { readonly level: JudicialCourtLevel; readonly count: number }[]
  /** Cases counted in the total that no court level places (a court missing from the reference). */
  readonly unplaced: number
}

/**
 * What the litigation summary can say without overstating it. The API counts
 * a case with a null or infinite date in the total but not in its years, and
 * a case at a court missing from its reference in the total but not in its
 * levels; both remainders are said, so a breakdown never reads as complete
 * when it is not. Years outside 1900 – `maxYear` are placeholders.
 */
export function companyLitigationModel(litigation: JudicialCompanyLitigation, maxYear: number): CompanyLitigationModel {
  const dated = litigation.years.filter((entry) => entry.count > 0 && entry.year >= FIRST_PLAUSIBLE_YEAR && entry.year <= maxYear)
  const years = dated.map((entry) => entry.year)
  const span = years.length > 0 ? { first: Math.min(...years), last: Math.max(...years) } : null
  const datedCount = dated.reduce((sum, entry) => sum + entry.count, 0)
  const levels = [...litigation.courtLevels]
    .filter((entry) => entry.count > 0)
    .sort((a, b) => JUDICIAL_COURT_LEVELS.indexOf(a.courtLevel) - JUDICIAL_COURT_LEVELS.indexOf(b.courtLevel))
    .map((entry) => ({ level: entry.courtLevel, count: entry.count }))
  const placedCount = levels.reduce((sum, entry) => sum + entry.count, 0)
  return {
    caseCount: litigation.caseCount,
    span,
    undated: Math.max(0, litigation.caseCount - datedCount),
    levels,
    unplaced: Math.max(0, litigation.caseCount - placedCount),
  }
}
