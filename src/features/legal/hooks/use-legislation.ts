import { useQuery } from '@tanstack/react-query'
import type { LegislationOverview } from '@/schemas/legal'
import { fetchLegislationOverview } from '../api/legal-api'
import { fetchDomainActCounts } from '../api/legal-domain-counts-api'
import { fetchLegislationFreshness } from '../api/legal-freshness-api'
import { fetchStatusActCounts } from '../api/legal-status-counts-api'

export function legislationOverviewQueryKey() {
  return ['legal', 'overview'] as const
}

export function useLegislationOverview(initialData?: LegislationOverview) {
  return useQuery({
    queryKey: legislationOverviewQueryKey(),
    queryFn: () => fetchLegislationOverview(),
    staleTime: 5 * 60 * 1000,
    initialData,
  })
}

export function legislationDomainCountsQueryKey() {
  return ['legal', 'domain-counts'] as const
}

/**
 * The domain grid's counts — deliberately NOT a rider on the overview query
 * or the route loader (see `legal-domain-counts-api.ts`): a failed aggregate
 * degrades the grid to label-only cells instead of failing the page. No
 * `initialData` — counts arrive after hydration, and nothing blocks on them.
 */
export function useLegislationDomainCounts() {
  return useQuery({
    queryKey: legislationDomainCountsQueryKey(),
    queryFn: ({ signal }) => fetchDomainActCounts({ signal }),
    staleTime: 5 * 60 * 1000,
  })
}

export function legislationStatusCountsQueryKey() {
  return ['legal', 'status-counts'] as const
}

/**
 * The headline counts — the KPI strip's tiles and the header chips, all from
 * ONE `legalActCounts(groupBy: STATUS)` request. Same contract as the domain
 * counts: deliberately NOT a rider on the overview query or the route loader
 * (see `legal-status-counts-api.ts`), so a failed aggregate degrades the
 * tiles to label-only instead of failing the page, and no `initialData` —
 * counts arrive after hydration, and nothing blocks on them. The strip and
 * the shell both call this; one query key means one request.
 */
export function useLegislationStatusCounts() {
  return useQuery({
    queryKey: legislationStatusCountsQueryKey(),
    queryFn: ({ signal }) => fetchStatusActCounts({ signal }),
    staleTime: 5 * 60 * 1000,
  })
}

export function legislationFreshnessQueryKey() {
  return ['legal', 'freshness'] as const
}

/**
 * The corpus frontiers (newest gazette issue, newest in-force change) and the
 * CCR decision count — live, in place of the retired measured constants.
 * Same contract as the counts: its own request, no `initialData`, and a
 * surface drops a figure it does not have rather than print a stale one.
 */
export function useLegislationFreshness() {
  return useQuery({
    queryKey: legislationFreshnessQueryKey(),
    queryFn: ({ signal }) => fetchLegislationFreshness({ signal }),
    staleTime: 5 * 60 * 1000,
  })
}
