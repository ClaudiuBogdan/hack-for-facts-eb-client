import type { CompanyAnalysisDimension, CompanyAnalysisScope } from '@/schemas/company-analytics'
import type { CompanyAnalyticsState } from './company-analytics-url'

/**
 * The analysis page's answer tabs, for the page and the route's server read
 * alike: the companies, every axis the filters leave open, the years. The
 * address keeps the tab as its panel (`vedere`) and its axis (`dupa`).
 */

export type AnswerTab = 'firme' | 'evolutie' | CompanyAnalysisDimension

/**
 * The tabs: the companies, then every axis the filters leave open — a county
 * chosen has no counties to rank, a locality no localities — then the years.
 * The derived activity where the release offers it (or the address asks for
 * it, to be told it is not offered), before ANAF's fiscal CAEN code.
 */
export function answerTabs(state: CompanyAnalyticsState, activity: boolean): readonly AnswerTab[] {
  const oneCounty = (state.scope.county?.in?.length ?? 0) === 1
  const oneUat = (state.scope.uat?.in?.length ?? 0) === 1
  const axes: CompanyAnalysisDimension[] = []
  if (!oneCounty && !oneUat) axes.push('COUNTY')
  if (!oneUat) axes.push('UAT')
  if (activity || tabOf(state) === 'ACTIVITY') axes.push('ACTIVITY')
  axes.push('MAIN_CAEN', 'EMPLOYEE_SIZE', 'LEGAL_FORM', 'OBSERVED_STATUS', 'VAT_PAYER', 'FISCALLY_INACTIVE')
  return ['firme', ...axes, 'evolutie']
}

/** The tab the address asks for. */
export function tabOf(state: CompanyAnalyticsState): AnswerTab {
  return state.panel === 'defalcare' ? state.dimension : state.panel
}

/** The tab shown: the one asked for when the filters leave it open, the companies otherwise. */
export function currentTab(state: CompanyAnalyticsState, activity: boolean): AnswerTab {
  const wanted = tabOf(state)
  return answerTabs(state, activity).includes(wanted) ? wanted : 'firme'
}

/** The one county the selection is in, if it is in one: the map shows its localities. */
export function mapCountyOf(scope: CompanyAnalysisScope): string | null {
  const county = scope.county
  return county?.in?.length === 1 && !county.includeUnknown ? (county.in[0] ?? null) : null
}

export function withTab(state: CompanyAnalyticsState, tab: AnswerTab): CompanyAnalyticsState {
  if (tab === 'firme' || tab === 'evolutie') return { ...state, panel: tab }
  return { ...state, panel: 'defalcare', dimension: tab }
}
