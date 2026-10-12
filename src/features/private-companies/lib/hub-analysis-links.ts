import type { CompanyAnalysisMetric, CompanyAnalysisScope } from '@/schemas/company-analytics'
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

/** The companies of a selection, largest first by a measure. */
export function hubCompaniesSearch(year: number, scope: CompanyAnalysisScope, metric: CompanyAnalysisMetric = 'TURNOVER') {
  return hubAnalysisSearch(year, { scope, metric })
}

/** The companies of one county. */
export function hubCountySearch(year: number, code: string) {
  return hubCompaniesSearch(year, { county: { in: [code] } })
}
