import { queryOptions, useQuery } from '@tanstack/react-query'
import type { LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { fetchLegalAnalytics, LegalAnalyticsError } from '../api/legal-analytics-api'

/** The views that name acts: the server serves them `no-store`, and the browser keeps none of their answers. */
const NAMING_VIEWS: ReadonlySet<LegalAnalyticsView> = new Set(['acts', 'links'])

/**
 * What a query of a view that names acts keeps: nothing. An act can be restricted after it was listed, and the
 * server's gate is asked on every read, so an answer is stale at once (read again on every entry) and dropped
 * when the last view of it leaves (never shown again from the cache). The regular and the paged query share it.
 */
export const LEGAL_ANALYTICS_NAMING_CACHE = { staleTime: 0, gcTime: 0 } as const

/**
 * One retry policy for every analytics read: a refusal is an answer, not a failure to try again. A 400 (a
 * question the layer cannot answer), a 503 (no published layer yet, or busy) and a 429 (rate limit) are never
 * retried; a transport failure or another server error is, twice.
 */
export function retryLegalAnalytics(failures: number, error: unknown): boolean {
  if (error instanceof LegalAnalyticsError && (error.kind !== 'failed' || error.status === 429)) return false
  return failures < 2
}

/**
 * One analytics view. The key is the view and the API arguments as the page builds them (absent = default, the
 * type list sorted): equal questions share one entry, as they share one server cache entry.
 */
export function legalAnalyticsQueryOptions<V extends LegalAnalyticsView>(view: V, args: LegalAnalyticsArgs) {
  return queryOptions({
    queryKey: ['legal', 'analytics', view, args] as const,
    queryFn: ({ signal }) => fetchLegalAnalytics(view, args, signal),
    ...(NAMING_VIEWS.has(view) ? LEGAL_ANALYTICS_NAMING_CACHE : { staleTime: 5 * 60 * 1000 }),
    retry: retryLegalAnalytics,
  })
}

/**
 * A view of the current question. While the answer to a new question loads there is no data: the caller draws
 * its loading state, never the previous question's answer under the new one.
 */
export function useLegalAnalytics<V extends LegalAnalyticsView>(view: V, args: LegalAnalyticsArgs, enabled = true) {
  return useQuery({ ...legalAnalyticsQueryOptions(view, args), enabled })
}
