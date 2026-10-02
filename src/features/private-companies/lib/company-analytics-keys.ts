import type {
  CompanyAnalysisCohortMode,
  CompanyAnalysisDimension,
  CompanyAnalysisDirection,
  CompanyAnalysisMetric,
  CompanyAnalysisRankBy,
  CompanyAnalysisRecordSort,
  CompanyAnalysisScopeInput,
} from '@/schemas/company-analytics'

/**
 * The companies analysis page's query keys, in a module of their own: the
 * route's loader seeds the cache by them without pulling in the page's reads.
 * Every answer's key carries the release it is pinned to — a cache entry of
 * one release never answers a page of another.
 */
export const companyAnalyticsKeys = {
  all: ['companies', 'analytics'] as const,
  /** The capabilities: the active release (`null`) or a pinned one. */
  release: (pin: string | null) => [...companyAnalyticsKeys.all, 'release', pin ?? 'active'] as const,
  stats: (release: string, scope: CompanyAnalysisScopeInput, metrics: readonly CompanyAnalysisMetric[]) => [...companyAnalyticsKeys.all, 'stats', release, scope, metrics] as const,
  breakdown: (release: string, scope: CompanyAnalysisScopeInput, dimension: CompanyAnalysisDimension, metric: CompanyAnalysisMetric | null, rankBy: CompanyAnalysisRankBy, topN: number) =>
    [...companyAnalyticsKeys.all, 'breakdown', release, scope, dimension, metric, rankBy, topN] as const,
  series: (release: string, scope: CompanyAnalysisScopeInput, metric: CompanyAnalysisMetric, cohortMode: CompanyAnalysisCohortMode, fromYear: number, toYear: number) =>
    [...companyAnalyticsKeys.all, 'series', release, scope, metric, cohortMode, fromYear, toYear] as const,
  records: (
    release: string,
    scope: CompanyAnalysisScopeInput,
    sort: CompanyAnalysisRecordSort,
    sortMetric: CompanyAnalysisMetric | null,
    direction: CompanyAnalysisDirection,
    metrics: readonly CompanyAnalysisMetric[],
    after: string | null,
  ) => [...companyAnalyticsKeys.all, 'records', release, scope, sort, sortMetric, direction, metrics, after] as const,
}

const PINNED_KINDS: ReadonlySet<unknown> = new Set(['release', 'stats', 'breakdown', 'series', 'records'])
const RELEASE_ID_RE = /^[1-9]\d{0,15}$/u

/**
 * The release a cached read is pinned to, from its key: every answer's key
 * names it, a pinned release's own key too. Null for any other key — the
 * active release's (`'active'`), another feature's.
 */
export function releaseOfKey(key: readonly unknown[]): string | null {
  if (key[0] !== companyAnalyticsKeys.all[0] || key[1] !== companyAnalyticsKeys.all[1] || !PINNED_KINDS.has(key[2])) return null
  const release = key[3]
  return typeof release === 'string' && RELEASE_ID_RE.test(release) ? release : null
}
