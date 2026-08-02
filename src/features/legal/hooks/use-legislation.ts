import { useQuery } from '@tanstack/react-query'
import type { LegislationOverview } from '@/schemas/legal'
import { fetchLegislationOverview } from '../api/legal-api'

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
