import { useQuery } from '@tanstack/react-query'
import type { LegislationOverview } from '@/schemas/legal'
import { fetchLegislationOverview } from '../api/legal-api'
import { fetchDomainActCounts } from '../api/legal-domain-counts-api'

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
