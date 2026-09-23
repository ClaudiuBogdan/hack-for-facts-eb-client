import { queryOptions, useMutation, useQuery, type QueryClient } from '@tanstack/react-query'
import type {
  DatasetRequestPayload,
  StatisticsContextNode,
  StatisticsLandingCatalog,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import {
  fetchContextTree,
  fetchLandingCatalog,
  fetchStatisticsTerritoryHub,
  submitDatasetRequest,
} from '../api/statistics-api'
import { STATISTICS_STALE_TIME, statisticsKeys, statisticsRetry } from './query-config'

/**
 * Landing catalog and snapshot keys use native-v2, isolating cached legacy data.
 * Independent keys allow each section to recover without replacing the page.
 */
export const statisticsLandingCatalogQueryOptions = (
  initialData?: StatisticsLandingCatalog,
) =>
  queryOptions<StatisticsLandingCatalog>({
    queryKey: statisticsKeys.landingCatalog(),
    queryFn: ({ signal }) => fetchLandingCatalog(signal),
    staleTime: STATISTICS_STALE_TIME.catalog,
    retry: statisticsRetry,
    ...(initialData?.nativeContract === 'native-v2' ? { initialData } : {}),
  })

/**
 * The INS context tree. It changes when INS restructures its catalog — a few
 * times a year at most — so it holds for a day and never refetches on focus.
 */
export const statisticsContextTreeQueryOptions = () =>
  queryOptions<readonly StatisticsContextNode[]>({
    queryKey: statisticsKeys.contextTree(),
    queryFn: ({ signal }) => fetchContextTree(signal),
    staleTime: STATISTICS_STALE_TIME.catalog,
    retry: statisticsRetry,
  })

export function useStatisticsContextTree() {
  return useQuery(statisticsContextTreeQueryOptions())
}

export function useStatisticsLandingCatalog(
  initialData?: StatisticsLandingCatalog,
) {
  return useQuery(statisticsLandingCatalogQueryOptions(initialData))
}

// ---------------------------------------------------------------------------
// Statistics territory hub
// ---------------------------------------------------------------------------

/**
 * The hub is keyed on SIRUTA alone. The `period` URL param is applied as a
 * client-side transform (`lib/territory-period.ts`), so it must not enter
 * the query key — otherwise every period switch would refetch the whole
 * dashboard. The route loader seeds it on the server render.
 */
export const statisticsTerritoryHubQueryOptions = (params: {
  siruta: string
  enabled?: boolean
  initialData?: StatisticsTerritoryHubResult
}) => {
  const normalizedSiruta = params.siruta.trim()

  return queryOptions({
    queryKey: statisticsKeys.territoryHub(normalizedSiruta),
    queryFn: ({ signal }) =>
      fetchStatisticsTerritoryHub(normalizedSiruta, signal),
    enabled: (params.enabled ?? true) && normalizedSiruta.length > 0,
    staleTime: STATISTICS_STALE_TIME.figures,
    retry: statisticsRetry,
    ...(params.initialData ? { initialData: params.initialData } : {}),
  })
}

export function useStatisticsTerritoryHub(params: {
  siruta: string
  enabled?: boolean
  initialData?: StatisticsTerritoryHubResult
}) {
  return useQuery(statisticsTerritoryHubQueryOptions(params))
}

/** What a client-side navigation to a territory starts reading before the page mounts. */
export function prefetchStatisticsTerritoryHub(queryClient: QueryClient, siruta: string): Promise<void> {
  return queryClient.prefetchQuery(statisticsTerritoryHubQueryOptions({ siruta }))
}

export function useDatasetRequest() {
  return useMutation({
    mutationFn: (payload: DatasetRequestPayload) =>
      submitDatasetRequest(payload),
  })
}
