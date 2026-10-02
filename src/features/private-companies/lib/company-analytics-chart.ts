import { t } from '@lingui/core/macro'
import { buildCompaniesAnalyticsChartLink, type BuildCompaniesAnalyticsChartOptions } from '@/lib/chart-links'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../api/company-analytics-plan'
import { metricLabel, placePhrase } from './company-analytics-text'
import type { CompanyAnalyticsState } from './company-analytics-url'

/**
 * The page's question as the chart builder takes it: the same measure,
 * scope, reference year and cohort, on the release the figures came from,
 * over every fiscal year the release holds (2008 included) — the gaps are
 * the chart's to draw, not to drop.
 */
export function companiesChartOptionsOf(state: CompanyAnalyticsState, question: ResolvedQuestion, release: CompanyAnalysisRelease, uatNames: ReadonlyMap<string, string> = new Map()): BuildCompaniesAnalyticsChartOptions {
  const place = placePhrase(state.scope, uatNames)
  const label = `${metricLabel(question.metric)} ${place}`
  return {
    title: t`${label}, pe ani fiscali`,
    label,
    releaseId: question.release,
    metric: question.metric,
    scope: state.scope,
    referenceYear: question.year,
    cohortMode: question.cohortMode,
    fromYear: release.fiscalYears[0] ?? question.year,
    toYear: release.fiscalYears[release.fiscalYears.length - 1] ?? question.year,
  }
}

export function companiesChartLinkOf(state: CompanyAnalyticsState, question: ResolvedQuestion, release: CompanyAnalysisRelease, uatNames?: ReadonlyMap<string, string>) {
  return buildCompaniesAnalyticsChartLink(companiesChartOptionsOf(state, question, release, uatNames))
}
