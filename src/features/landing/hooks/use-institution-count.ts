import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchEntityAnalytics, entityRankingFilter } from '@/lib/api/entity-analytics'
import { defaultEntityAnalyticsFilter } from '@/lib/entity-analytics-query'
import { DEFAULT_SELECTED_YEAR } from '@/schemas/charts'

/**
 * How many principal ordonatori de credite reported budget execution in the
 * default year — the one coverage figure that is served rather than derived.
 *
 * Asked for with `limit: 1`: the number lives in `pageInfo.totalCount`, and the
 * rows are not wanted. The filter is the ranking page's own default, so the
 * count means exactly what the ranking page's first row count means, and the
 * request dedupes with it in the query cache when a reader goes there next.
 *
 * Fetched on the client only. The landing is served from a shared cache for an
 * hour, and a figure baked into that HTML would be a snapshot presented as
 * live; the band omits the figure until this resolves and never renders a
 * fallback literal.
 */
export const institutionCountQueryOptions = queryOptions({
  queryKey: ['landing-institution-count', DEFAULT_SELECTED_YEAR],
  queryFn: async ({ signal }) => {
    const page = await fetchEntityAnalytics({
      signal,
      filter: entityRankingFilter(defaultEntityAnalyticsFilter),
      limit: 1,
    })
    return page.pageInfo.totalCount
  },
  staleTime: 60 * 60_000,
  gcTime: 24 * 60 * 60_000,
  retry: 1,
})

export function useInstitutionCount() {
  const { data, isError } = useQuery(institutionCountQueryOptions)
  return {
    /** `undefined` until served; the band omits the item rather than guess. */
    count: data !== undefined && data > 0 ? data : undefined,
    year: DEFAULT_SELECTED_YEAR,
    isError,
  }
}
