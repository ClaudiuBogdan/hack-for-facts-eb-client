import { queryOptions } from '@tanstack/react-query'
import { AnalyticsFilterSchema, createDefaultExecutionYearReportPeriod } from '@/schemas/charts'
import type { AnalyticsFilterType, Currency } from '@/schemas/charts'
import { parseSearchParamJson } from '@/lib/router-search'
import { generateHash } from '@/lib/utils'
import { fetchEntityAnalytics, entityRankingFilter } from '@/lib/api/entity-analytics'
import { z } from 'zod'

export const defaultEntityAnalyticsFilter: AnalyticsFilterType = {
  account_category: 'ch',
  report_period: createDefaultExecutionYearReportPeriod(),
  normalization: 'total',
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
}

export const entityAnalyticsFilterSchema = z.preprocess(parseSearchParamJson, AnalyticsFilterSchema)

export function resolveEntityAnalyticsFilter(
  filter: AnalyticsFilterType,
  preferences: { currency: Currency; inflationAdjusted: boolean },
): AnalyticsFilterType {
  const raw = filter.normalization ?? 'total'
  const euroAlias = raw === 'total_euro' || raw === 'per_capita_euro'
  const normalization = raw === 'total_euro' ? 'total' : raw === 'per_capita_euro' ? 'per_capita' : raw
  return {
    ...filter,
    normalization,
    currency: euroAlias ? 'EUR' : (filter.currency ?? preferences.currency),
    inflation_adjusted: normalization === 'percent_gdp' ? false : (filter.inflation_adjusted ?? preferences.inflationAdjusted),
  }
}

export function entityAnalyticsQueryOptions(input: {
  filter: AnalyticsFilterType; sortBy?: string; sortOrder: 'asc' | 'desc'; page: number; pageSize: number;
}) {
  const { filter, sortBy, sortOrder, page, pageSize } = input
  return queryOptions({
    queryKey: ['native-entity-analytics', generateHash(JSON.stringify(filter)), sortBy, sortOrder, page, pageSize],
    queryFn: ({ signal }) => fetchEntityAnalytics({
      signal,
      filter: entityRankingFilter(filter),
      sort: sortBy ? { by: sortBy === 'county_name' ? 'county_code' : sortBy, order: sortOrder } : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}
