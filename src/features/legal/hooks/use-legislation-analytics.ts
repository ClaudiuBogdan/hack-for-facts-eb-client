import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type { LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { fetchLegalAnalytics, LegalAnalyticsError } from '../api/legal-analytics-api'

/** The views that name acts: read afresh (the server serves them no-store), never kept long. */
const NAMING_VIEWS: ReadonlySet<LegalAnalyticsView> = new Set(['acts', 'links'])

/**
 * One analytics view. The key is the view and the API arguments as the page builds them (absent = default, the
 * type list sorted): equal questions share one entry, as they share one server cache entry. A 503 (no published
 * layer yet, or busy) and a 400 are not retried; a transport failure is, twice.
 */
export function legalAnalyticsQueryOptions<V extends LegalAnalyticsView>(view: V, args: LegalAnalyticsArgs) {
  return queryOptions({
    queryKey: ['legal', 'analytics', view, args] as const,
    queryFn: ({ signal }) => fetchLegalAnalytics(view, args, signal),
    staleTime: NAMING_VIEWS.has(view) ? 60 * 1000 : 5 * 60 * 1000,
    retry: (failures, error) => !(error instanceof LegalAnalyticsError && error.kind !== 'failed') && failures < 2,
  })
}

/** A view of the current question; the previous answer stays on screen while the next one loads. */
export function useLegalAnalytics<V extends LegalAnalyticsView>(view: V, args: LegalAnalyticsArgs, enabled = true) {
  return useQuery({ ...legalAnalyticsQueryOptions(view, args), enabled, placeholderData: keepPreviousData })
}
