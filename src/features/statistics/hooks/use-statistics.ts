import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import type {
  DatasetRequestPayload,
  StatisticsLandingCatalog,
  StatisticsLandingData,
  StatisticsUatSnapshot,
} from '@/schemas/statistics'
import {
  fetchLandingCatalog,
  fetchLandingData,
  fetchStatisticsTerritoryHub,
  fetchUatSnapshot,
  submitDatasetRequest,
} from '../api/statistics-api'

const DEFAULT_STALE_TIME = 1000 * 60 * 15
/**
 * The server caches every INS read for 24h, so a long client staleTime costs
 * nothing in freshness and saves refetch churn.
 */
const LONG_STALE_TIME = 1000 * 60 * 60 * 24

/**
 * Query keys are readable tuples (`['statistics', 'native-v1', ...]` prefix) so targeted
 * invalidation works. Each landing aggregate has its own key: one failing
 * POST degrades one band, never the page.
 */
export const statisticsLandingDataQueryOptions = (
  initialData?: StatisticsLandingData,
) =>
  queryOptions<StatisticsLandingData>({
    queryKey: ['statistics', 'native-v1', 'landing', 'observations'] as const,
    queryFn: ({ signal }) => fetchLandingData(signal),
    staleTime: LONG_STALE_TIME,
    ...(initialData?.nativeContract === 'native-v1' ? { initialData } : {}),
  })

export const statisticsLandingCatalogQueryOptions = (
  initialData?: StatisticsLandingCatalog,
) =>
  queryOptions<StatisticsLandingCatalog>({
    queryKey: ['statistics', 'native-v1', 'landing', 'catalog'] as const,
    queryFn: ({ signal }) => fetchLandingCatalog(signal),
    staleTime: LONG_STALE_TIME,
    ...(initialData ? { initialData } : {}),
  })

export const statisticsUatSnapshotQueryOptions = (siruta: string) =>
  queryOptions<StatisticsUatSnapshot>({
    queryKey: ['statistics', 'native-v1', 'landing', 'uat', siruta] as const,
    queryFn: ({ signal }) => fetchUatSnapshot(siruta, signal),
    staleTime: LONG_STALE_TIME,
  })

export function useStatisticsLandingData(initialData?: StatisticsLandingData) {
  return useQuery(statisticsLandingDataQueryOptions(initialData))
}

export function useStatisticsLandingCatalog(
  initialData?: StatisticsLandingCatalog,
) {
  return useQuery(statisticsLandingCatalogQueryOptions(initialData))
}

export function useStatisticsUatSnapshot(siruta: string | undefined) {
  return useQuery({
    ...statisticsUatSnapshotQueryOptions(siruta ?? ''),
    enabled: Boolean(siruta),
  })
}

// ---------------------------------------------------------------------------
// Statistics territory hub
// ---------------------------------------------------------------------------

/**
 * The hub is keyed on SIRUTA alone. The `period` URL param is applied as a
 * client-side transform (`lib/hub-period.ts`), so it must not enter the query
 * key — otherwise every period switch would refetch the whole dashboard.
 */
export const statisticsTerritoryHubQueryOptions = (params: {
  siruta: string
  enabled?: boolean
}) => {
  const normalizedSiruta = params.siruta.trim()

  return queryOptions({
    queryKey: ['statistics', 'native-v1', 'territory-hub', normalizedSiruta] as const,
    queryFn: ({ signal }) => fetchStatisticsTerritoryHub(normalizedSiruta, signal),
    enabled: (params.enabled ?? true) && normalizedSiruta.length > 0,
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useStatisticsTerritoryHub(params: {
  siruta: string
  enabled?: boolean
}) {
  return useQuery(statisticsTerritoryHubQueryOptions(params))
}

export function useDatasetRequest() {
  return useMutation({
    mutationFn: (payload: DatasetRequestPayload) => submitDatasetRequest(payload),
  })
}
