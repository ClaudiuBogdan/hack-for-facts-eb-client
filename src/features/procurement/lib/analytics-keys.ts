import type { Scope } from '../api/procurement-analytics-api'
import type { Dimension } from './analytics-model'

/**
 * The analytics page's query keys, in a module of their own: the route's
 * loader seeds the cache by them without pulling in the page's reads. Every
 * analysis read's key carries the build it is pinned to: a cache entry of one
 * generation never answers a page of another.
 */
export const procurementAnalyticsKeys = {
  all: ['procurement', 'analytics'] as const,
  cutoff: (latest: number) => [...procurementAnalyticsKeys.all, 'cutoff', latest] as const,
  figures: (now: Scope, before: Scope | null, build: string | null) => [...procurementAnalyticsKeys.all, 'figures', build, now, before] as const,
  concentration: (now: Scope, basis: 'count' | 'value', build: string | null) => [...procurementAnalyticsKeys.all, 'concentration', build, now, basis] as const,
  ranking: (now: Scope, dimension: Dimension | null, topN: number, rankBy: 'count' | 'value', build: string | null) =>
    [...procurementAnalyticsKeys.all, 'ranking', build, now, dimension, topN, rankBy] as const,
  series: (now: Scope, bucket: 'year' | 'quarter' | 'month' | null, withMoney: boolean, build: string | null) =>
    [...procurementAnalyticsKeys.all, 'series', build, now, bucket, withMoney] as const,
  years: (scope: Scope | null, withMoney: boolean, build: string | null) => [...procurementAnalyticsKeys.all, 'years', build, scope, withMoney] as const,
  names: (orgs: readonly string[], cpv: readonly string[]) => [...procurementAnalyticsKeys.all, 'names', orgs, cpv] as const,
  cpvDivisions: () => [...procurementAnalyticsKeys.all, 'cpv-divisions'] as const,
  counties: () => [...procurementAnalyticsKeys.all, 'counties'] as const,
  cpvSearch: (term: string) => [...procurementAnalyticsKeys.all, 'cpv-search', term] as const,
  records: (scope: Scope | null, build: string | null, sort: 'value_desc' | 'date_desc', page: number) =>
    [...procurementAnalyticsKeys.all, 'records', build, scope, sort, page] as const,
}
