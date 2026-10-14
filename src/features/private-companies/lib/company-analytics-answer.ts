import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { onrcBasisOfKey, type CompanyAnalysisDimension, type CompanyAnalysisScope } from '@/schemas/company-analytics'
import { isCapabilityRefused } from '../api/company-analytics-api'
import type { CompanyAnalyticsState } from './company-analytics-url'

/**
 * The analysis page's answer tabs, for the page and the route's server read
 * alike: the companies, every axis the filters leave open, the years. The
 * address keeps the tab as its panel (`vedere`) and its axis (`dupa`).
 */

export type AnswerTab = 'firme' | 'evolutie' | CompanyAnalysisDimension

/**
 * The tabs: the companies, then every axis the filters leave open — a county
 * chosen has no counties to rank, a locality no localities (a single value:
 * with the companies without a common one, there are groups to rank) — then
 * the years.
 * The derived activity where the release offers it (or the address asks for
 * it, to be told it is not offered), before ANAF's fiscal CAEN code; the
 * ANAF-assumed main activity (v4) the same way, after it.
 */
export function answerTabs(state: CompanyAnalyticsState, activity: boolean, mainActivity = false): readonly AnswerTab[] {
  const oneCounty = oneValueOf(state.scope.county) !== null
  const oneUat = oneValueOf(state.scope.uat) !== null
  const axes: CompanyAnalysisDimension[] = []
  if (!oneCounty && !oneUat) axes.push('COUNTY')
  if (!oneUat) axes.push('UAT')
  if (activity || tabOf(state) === 'ACTIVITY') axes.push('ACTIVITY')
  if (mainActivity || tabOf(state) === 'MAIN_ACTIVITY') axes.push('MAIN_ACTIVITY')
  axes.push('MAIN_CAEN', 'EMPLOYEE_SIZE', 'LEGAL_FORM', 'OBSERVED_STATUS', 'VAT_PAYER', 'FISCALLY_INACTIVE')
  return ['firme', ...axes, 'evolutie']
}

/** The tab the address asks for. */
export function tabOf(state: CompanyAnalyticsState): AnswerTab {
  return state.panel === 'defalcare' ? state.dimension : state.panel
}

/** The tab shown: the one asked for when the filters leave it open, the companies otherwise. */
export function currentTab(state: CompanyAnalyticsState, activity: boolean, mainActivity = false): AnswerTab {
  const wanted = tabOf(state)
  return answerTabs(state, activity, mainActivity).includes(wanted) ? wanted : 'firme'
}

/** A consensus filter's one value, when it holds just that: no basis group, no companies without a common value. */
function oneValueOf(filter: CompanyAnalysisScope['county']): string | null {
  const key = filter?.in?.length === 1 && !filter.includeUnknown ? filter.in[0] : undefined
  return key !== undefined && onrcBasisOfKey(key) === null ? key : null
}

/** The one county the selection is in, if it is in one the map knows: the map shows its localities. */
export function mapCountyOf(scope: CompanyAnalysisScope): string | null {
  const county = oneValueOf(scope.county)
  return county !== null && ROMANIA_COUNTIES.some((known) => known.code === county) ? county : null
}

/** Whether the release does not offer the derived activity — known from its capabilities, or said by the API's typed refusal. */
export function activityRefused(dimension: CompanyAnalysisDimension, offered: boolean, error: unknown): boolean {
  return dimension === 'ACTIVITY' && (!offered || isCapabilityRefused(error))
}

/**
 * Whether the release does not offer the ANAF-assumed main activity (v4) —
 * known from its capabilities (it does not list MAIN_ACTIVITY), or said by
 * the API's typed refusal (`RELEASE_CAPABILITY_UNAVAILABLE`, capability
 * `MAIN_ACTIVITY`). Never answered with another grouping instead.
 */
export function mainActivityRefused(dimension: CompanyAnalysisDimension, offered: boolean, error: unknown): boolean {
  return dimension === 'MAIN_ACTIVITY' && (!offered || isCapabilityRefused(error))
}

export function withTab(state: CompanyAnalyticsState, tab: AnswerTab): CompanyAnalyticsState {
  if (tab === 'firme' || tab === 'evolutie') return { ...state, panel: tab }
  return { ...state, panel: 'defalcare', dimension: tab }
}
