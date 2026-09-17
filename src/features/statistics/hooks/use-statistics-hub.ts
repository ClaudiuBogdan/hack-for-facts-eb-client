import { queryOptions, useQuery } from '@tanstack/react-query'
import type { StatisticsHubData } from '@/schemas/statistics'
import { fetchStatisticsHub } from '../api/statistics-api'

const STALE_TIME = 15 * 60 * 1000

/** A payload with a failed section is stale at once, so the next mount reads again. */
const staleTime = (query: { readonly state: { readonly data?: StatisticsHubData } }) =>
  query.state.data && query.state.data.failures.length > 0 ? 0 : STALE_TIME

/**
 * The hub read is one query, seeded from the route loader so the server and
 * the first client render agree.
 *
 * A complete payload seeds the cache as data. A payload with a failed
 * section is shown as a placeholder only: the browser reads again at once,
 * because a server-side failure (an API unreachable from the server, a slow
 * section) says nothing about what the browser can read, and hydrating it
 * as fresh data would keep the gap on screen until the cache expired. The
 * same holds for a read the browser made itself: a partial result is stale
 * immediately, so coming back to the page re-reads rather than re-showing
 * the gap for the cache's lifetime.
 */
export const statisticsHubQueryOptions = (initialData?: StatisticsHubData) => {
  const seed = initialData?.nativeContract === 'hub-v1' ? initialData : undefined
  const complete = seed !== undefined && seed.failures.length === 0
  return queryOptions({
    queryKey: ['statistics', 'hub-v1'] as const,
    queryFn: ({ signal }) => fetchStatisticsHub(signal),
    staleTime,
    retry: false,
    ...(complete ? { initialData: seed } : {}),
    ...(seed && !complete ? { placeholderData: seed } : {}),
  })
}

export function useStatisticsHub(initialData?: StatisticsHubData) {
  return useQuery(statisticsHubQueryOptions(initialData))
}
