import {
  companyMetricKind,
  companyMetricUnit,
  metricOfferedIn,
  offeredMetricsIn,
  scopeNeedsStatement,
  type CompanyAnalysisBreakdown,
  type CompanyAnalysisCohortMode,
  type CompanyAnalysisDimension,
  type CompanyAnalysisDirection,
  type CompanyAnalysisMetric,
  type CompanyAnalysisMetricKind,
  type CompanyAnalysisRankBy,
  type CompanyAnalysisRecords,
  type CompanyAnalysisRelease,
  type CompanyAnalysisScopeInput,
  type CompanyAnalysisSeries,
  type CompanyAnalysisStats,
  type CompanyAnalysisUnit,
} from '@/schemas/company-analytics'
import { companyAnalyticsKeys } from '../lib/company-analytics-keys'
import type { CompanyAnalyticsState } from '../lib/company-analytics-url'
import {
  apiScopeOf,
  readCompanyAnalysisBreakdown,
  readCompanyAnalysisRecords,
  readCompanyAnalysisSeries,
  readCompanyAnalysisStats,
} from './company-analytics-api'

/**
 * A question against a release: its year and measure resolved from the
 * release's capabilities, what in it the release cannot answer, and the
 * reads it compiles to — each with the key the page's query holds, so the
 * route's loader and the browser plan the same keys.
 */

/** What the release cannot answer in the question; any one stops the answer, said on the page. */
export type QuestionProblem =
  | { readonly kind: 'year'; readonly year: number }
  | { readonly kind: 'metric'; readonly metric: CompanyAnalysisMetric }
  | { readonly kind: 'range'; readonly metric: CompanyAnalysisMetric }
  | { readonly kind: 'limit'; readonly field: string; readonly max: number }

export interface ResolvedQuestion {
  readonly release: string
  readonly year: number
  readonly metric: CompanyAnalysisMetric
  readonly unit: CompanyAnalysisUnit
  readonly kind: CompanyAnalysisMetricKind
  /** The scope with its fiscal year, in the API's shape: the answers' cache keys hold it. */
  readonly scope: CompanyAnalysisScopeInput
  readonly problems: readonly QuestionProblem[]
  /** The measures the figures band reads: the chosen one, and turnover, net result and employees where the year offers them. */
  readonly figureMetrics: readonly CompanyAnalysisMetric[]
  /** The measures each listed company carries. */
  readonly recordMetrics: readonly CompanyAnalysisMetric[]
  readonly rankBy: CompanyAnalysisRankBy
  readonly sortMetric: CompanyAnalysisMetric | null
  readonly direction: CompanyAnalysisDirection
  readonly cohortMode: CompanyAnalysisCohortMode
}

const FIGURE_COMPANIONS: readonly CompanyAnalysisMetric[] = ['TURNOVER', 'NET_RESULT', 'EMPLOYEES']

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

export function resolveQuestion(state: CompanyAnalyticsState, release: CompanyAnalysisRelease): ResolvedQuestion {
  const problems: QuestionProblem[] = []
  const year = state.year ?? release.defaults.fiscalYear
  const yearKnown = release.fiscalYears.includes(year)
  if (!yearKnown) problems.push({ kind: 'year', year })
  const offered = offeredMetricsIn(release, year)
  const fallback = metricOfferedIn(release, year, release.defaults.metric) ? release.defaults.metric : (offered[0] ?? release.defaults.metric)
  const metric = state.metric ?? fallback
  if (yearKnown && !metricOfferedIn(release, year, metric)) problems.push({ kind: 'metric', metric })
  for (const range of state.scope.financialRanges ?? []) {
    if (yearKnown && !metricOfferedIn(release, year, range.metric)) problems.push({ kind: 'range', metric: range.metric })
  }
  const limits: readonly [string, number, number][] = [
    ['cui', state.scope.cuis?.length ?? 0, release.limits.maxSelectedCuis],
    ['judet', state.scope.county?.in?.length ?? 0, release.limits.maxCounties],
    ['uat', state.scope.uat?.in?.length ?? 0, release.limits.maxUats],
    ['forma', state.scope.legalForms?.length ?? 0, release.limits.maxLegalForms],
    ['stare', state.scope.observedStatus?.in?.length ?? 0, release.limits.maxObservedStatuses],
    ['caen', state.scope.mainCaen?.length ?? 0, release.limits.maxCaenCodes],
    ['interval', state.scope.financialRanges?.length ?? 0, release.limits.maxFinancialRanges],
  ]
  for (const [field, count, max] of limits) if (count > max) problems.push({ kind: 'limit', field, max })

  const sortMetric = state.sort === 'METRIC' ? metric : null
  const recordMetrics = unique([metric, ...FIGURE_COMPANIONS]).filter((item) => offered.includes(item)).slice(0, release.limits.maxRecordMetrics)
  return {
    release: release.release.releaseId,
    year,
    metric,
    unit: companyMetricUnit(metric),
    kind: companyMetricKind(metric),
    scope: apiScopeOf({ fiscalYear: year, ...state.scope }),
    problems,
    figureMetrics: unique([metric, ...FIGURE_COMPANIONS]).filter((item) => offered.includes(item)),
    recordMetrics,
    rankBy: state.rankBy ?? release.defaults.rankBy,
    sortMetric,
    direction: state.direction ?? (state.sort === 'CUI' ? 'ASC' : 'DESC'),
    // Written out, as the API would default it: the cache key names the cohort it holds.
    cohortMode: state.cohort ?? (scopeNeedsStatement(state.scope) ? 'REFERENCE_YEAR' : 'EACH_YEAR'),
  }
}

export interface PlannedRead<T> {
  readonly key: readonly unknown[]
  readonly read: (signal?: AbortSignal) => Promise<T>
  /** False when the question cannot be asked of this release (see `problems`). */
  readonly enabled: boolean
}

export const BREAKDOWN_TOP = 25
export const BREAKDOWN_TOP_EXPANDED = 100
export const RECORDS_PAGE = 25

export function planStats(question: ResolvedQuestion): PlannedRead<CompanyAnalysisStats> {
  const request = { release: question.release, scope: question.scope, metrics: question.figureMetrics }
  return {
    key: companyAnalyticsKeys.stats(request.release, request.scope, request.metrics),
    read: (signal) => readCompanyAnalysisStats(request, signal),
    enabled: question.problems.length === 0,
  }
}

export function planBreakdown(question: ResolvedQuestion, dimension: CompanyAnalysisDimension, topN: number): PlannedRead<CompanyAnalysisBreakdown> {
  const request = { release: question.release, scope: question.scope, dimension, metric: question.metric, rankBy: question.rankBy, topN }
  return {
    key: companyAnalyticsKeys.breakdown(request.release, request.scope, dimension, request.metric, request.rankBy, topN),
    read: (signal) => readCompanyAnalysisBreakdown(request, signal),
    enabled: question.problems.length === 0,
  }
}

/** Every fiscal year of the release, gaps included: a year the measure lacks is drawn as a gap, never left out. */
export function planSeries(question: ResolvedQuestion, release: CompanyAnalysisRelease): PlannedRead<CompanyAnalysisSeries> {
  const fromYear = release.fiscalYears[0] ?? question.year
  const toYear = release.fiscalYears[release.fiscalYears.length - 1] ?? question.year
  const request = { release: question.release, scope: question.scope, metric: question.metric, cohortMode: question.cohortMode, fromYear, toYear }
  // A cohort selected in the year cannot follow the companies that did not file then: the API refuses the pair.
  const followsNonFilers = question.cohortMode === 'REFERENCE_YEAR' && question.scope.filing === 'NOT_FILED'
  return {
    key: companyAnalyticsKeys.series(request.release, request.scope, request.metric, request.cohortMode, fromYear, toYear),
    read: (signal) => readCompanyAnalysisSeries(request, signal),
    enabled: question.problems.length === 0 && !followsNonFilers,
  }
}

/**
 * A filter's options from the release itself: the legal forms or observed
 * statuses of the year's whole population, by how many companies hold them.
 * Read only while the filters are open.
 */
export function planOptions(release: string, year: number, dimension: CompanyAnalysisDimension): PlannedRead<CompanyAnalysisBreakdown> {
  const request = { release, scope: apiScopeOf({ fiscalYear: year }), dimension, metric: null, rankBy: 'COMPANIES' as const, topN: BREAKDOWN_TOP_EXPANDED }
  return {
    key: companyAnalyticsKeys.breakdown(release, request.scope, dimension, null, request.rankBy, request.topN),
    read: (signal) => readCompanyAnalysisBreakdown(request, signal),
    enabled: true,
  }
}

export function planRecords(question: ResolvedQuestion, after: string | null): PlannedRead<CompanyAnalysisRecords> {
  const sort = question.sortMetric === null ? 'CUI' : 'METRIC'
  const request = {
    release: question.release,
    scope: question.scope,
    sort,
    sortMetric: question.sortMetric,
    direction: question.direction,
    metrics: question.recordMetrics,
    first: RECORDS_PAGE,
    after,
  } as const
  return {
    key: companyAnalyticsKeys.records(request.release, request.scope, sort, request.sortMetric, request.direction, request.metrics, after),
    read: (signal) => readCompanyAnalysisRecords(request, signal),
    enabled: question.problems.length === 0,
  }
}
