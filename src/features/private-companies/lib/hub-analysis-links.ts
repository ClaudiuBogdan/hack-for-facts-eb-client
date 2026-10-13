import type { CompanyAnalysisMetric, CompanyAnalysisScope } from '@/schemas/company-analytics'
import { STATUS_ACTIVE } from './company-status-codes'
import { DEFAULT_STATE, normalizedScope, urlSearchOf, type CompanyAnalyticsState } from './company-analytics-url'

/**
 * Where the hub's figures lead: the companies analysis, on the hub's fiscal
 * year. The analysis counts the companies of one ONRC edition and qualifies
 * the values, so its counts can differ from the hub's snapshot; a link opens
 * the same question there, never a promise of the same number.
 */

/** The analysis's address for a question: the hub's year, the rest as asked, the analysis's defaults otherwise; the selection in its canonical order, so a question is one address. */
export function hubAnalysisSearch(year: number, patch: Partial<CompanyAnalyticsState> = {}) {
  return urlSearchOf({ ...DEFAULT_STATE, year, ...patch, scope: normalizedScope(patch.scope ?? {}) })
}

/**
 * The headcount the hub's snapshot keeps per company: past it (or below
 * zero) a count is a keying error (`EMPLOYEE_CEILING` in the generator).
 */
export const HUB_EMPLOYEE_CEILING = 50_000

/** A selection kept to the hub's headcounts: where the hub sums or ranks employees, the analysis it opens does the same. */
export function withHubHeadcounts(scope: CompanyAnalysisScope): CompanyAnalysisScope {
  return { ...scope, financialRanges: [...(scope.financialRanges ?? []), { metric: 'EMPLOYEES', min: '0', max: String(HUB_EMPLOYEE_CEILING) }] }
}

/** The companies of a selection, largest first by a measure — by employees, within the hub's headcounts. */
export function hubCompaniesSearch(year: number, scope: CompanyAnalysisScope, metric: CompanyAnalysisMetric = 'TURNOVER') {
  return hubAnalysisSearch(year, { scope: metric === 'EMPLOYEES' ? withHubHeadcounts(scope) : scope, metric })
}

/**
 * The analysis on its newest year, for the companies sharing one of a
 * company's facts — its county, locality, legal form or selected activity:
 * where the profile's head leads.
 */
export function companyFactSearch(scope: CompanyAnalysisScope) {
  return urlSearchOf({ ...DEFAULT_STATE, scope: normalizedScope(scope) })
}

/** The companies of one county; only those in business where the hub counted only those (the density layer). */
export function hubCountySearch(year: number, code: string, inBusiness = false) {
  return hubCompaniesSearch(year, { county: { in: [code] }, ...(inBusiness ? { observedStatus: { in: [STATUS_ACTIVE] } } : {}) })
}
