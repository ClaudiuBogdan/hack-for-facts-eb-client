import type { Scope } from '../api/procurement-analytics-api'
import type { Dimension, Query, ResolvedPeriod } from './analytics-model'

/**
 * The analytics page's query keys, in a module of their own: the route's
 * loader seeds the cache by them without pulling in the page's reads.
 */
export const procurementAnalyticsKeys = {
  all: ['procurement', 'analytics'] as const,
  cutoff: (latest: number) => [...procurementAnalyticsKeys.all, 'cutoff', latest] as const,
  figures: (now: Scope, before: Scope | null) => [...procurementAnalyticsKeys.all, 'figures', now, before] as const,
  concentration: (now: Scope, basis: 'count' | 'value') => [...procurementAnalyticsKeys.all, 'concentration', now, basis] as const,
  ranking: (now: Scope, dimension: Dimension | null, topN: number, rankBy: 'count' | 'value') => [...procurementAnalyticsKeys.all, 'ranking', now, dimension, topN, rankBy] as const,
  series: (now: Scope, bucket: 'year' | 'quarter' | 'month' | null, withMoney: boolean) => [...procurementAnalyticsKeys.all, 'series', now, bucket, withMoney] as const,
  years: (scope: Scope | null, withMoney: boolean) => [...procurementAnalyticsKeys.all, 'years', scope, withMoney] as const,
  names: (orgs: readonly string[], cpv: readonly string[]) => [...procurementAnalyticsKeys.all, 'names', orgs, cpv] as const,
  cpvDivisions: () => [...procurementAnalyticsKeys.all, 'cpv-divisions'] as const,
  counties: () => [...procurementAnalyticsKeys.all, 'counties'] as const,
  cpvSearch: (term: string) => [...procurementAnalyticsKeys.all, 'cpv-search', term] as const,
  records: (query: Query, period: ResolvedPeriod | null, sort: 'value_desc' | 'date_desc', page: number) =>
    [...procurementAnalyticsKeys.all, 'records', query.tip, query.filters, query.titlu, query.valoare, period, sort, page] as const,
}
