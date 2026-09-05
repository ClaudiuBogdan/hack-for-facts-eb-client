import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { fetchEntityAnalytics, entityRankingFilter } from '@/lib/api/entity-analytics'
import { defaultEntityAnalyticsFilter } from '@/hooks/useEntityAnalyticsFilter'
import { AnalyticsFilterSchema } from '@/schemas/charts'
import { convertDaysToMs, generateHash } from '@/lib/utils'
import { readUserCurrencyPreference, readUserInflationAdjustedPreference } from '@/lib/user-preferences'
import { parseSearchParamJson } from '@/lib/router-search'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

const viewEnum = z.enum(['table', 'chart', 'line-items'])

const filterSchema = z.preprocess(parseSearchParamJson, AnalyticsFilterSchema)

const EntityAnalyticsSchema = z.object({
  view: viewEnum.default('table'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(25),
  filter: filterSchema.default(defaultEntityAnalyticsFilter),
})

export type EntityAnalyticsUrlState = z.infer<typeof EntityAnalyticsSchema>

function mapColumnIdToSortBy(columnId: string): string {
  switch (columnId) {
    case 'entity_name':
      return 'entity_name'
    case 'entity_type':
      return 'entity_type'
    case 'county_name':
      return 'county_code'
    case 'population':
      return 'population'
    case 'amount':
      return 'amount'
    case 'total_amount':
      return 'total_amount'
    case 'per_capita_amount':
      return 'per_capita_amount'
    default:
      return columnId
  }
}

export const Route = createFileRoute('/entity-analytics')({
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 86400,
    }),
  beforeLoad: async ({ context, search }) => {
    const { queryClient } = context
    const parsed = EntityAnalyticsSchema.parse(search)
    const offset = (parsed.page - 1) * parsed.pageSize
    const sort = parsed.sortBy
      ? ({ by: mapColumnIdToSortBy(parsed.sortBy), order: parsed.sortOrder } as const)
      : undefined
    const userCurrency = await readUserCurrencyPreference()
    const userInflationAdjusted = await readUserInflationAdjustedPreference()

    const normalizationRaw = parsed.filter.normalization ?? 'total'
    const normalization = (() => {
      if (normalizationRaw === 'total_euro') return 'total'
      if (normalizationRaw === 'per_capita_euro') return 'per_capita'
      return normalizationRaw
    })()
    const currency =
      normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro'
        ? 'EUR'
        : (parsed.filter.currency ?? userCurrency)
    const inflationAdjusted =
      normalization === 'percent_gdp'
        ? false
        : (parsed.filter.inflation_adjusted ?? userInflationAdjusted)

    const effectiveFilter = {
      ...parsed.filter,
      normalization,
      currency,
      inflation_adjusted: inflationAdjusted,
    }
    const filterHash = generateHash(JSON.stringify(effectiveFilter))

    // Prime the list query so the page renders instantly
    if (parsed.view === 'table') {
      queryClient.prefetchQuery({
        queryKey: ['native-entity-analytics', filterHash, parsed.sortBy, parsed.sortOrder, parsed.page, parsed.pageSize],
        queryFn: ({ signal }) =>
          fetchEntityAnalytics({
            signal,
            filter: entityRankingFilter(effectiveFilter),
            sort,
            limit: parsed.pageSize,
            offset,
          }),
        staleTime: convertDaysToMs(5),
        gcTime: convertDaysToMs(3),
      } as Parameters<typeof queryClient.prefetchQuery>[0])
    }
  },
})
