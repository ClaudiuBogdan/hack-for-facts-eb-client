import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import { generateHash } from '@/lib/utils'
import type {
  DatasetRequestPayload,
  StatisticsLanding,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import {
  fetchStatisticsLanding,
  fetchStatisticsTerritoryHub,
  submitDatasetRequest,
} from '../api/statistics-api'

const DEFAULT_STALE_TIME = 1000 * 60 * 15
const LONG_STALE_TIME = 1000 * 60 * 60 * 24

function buildHash(payload: unknown): string {
  if (typeof payload === 'string') {
    return generateHash(payload)
  }
  return generateHash(JSON.stringify(payload))
}

function splitEnabled<T extends object>(params: T & { enabled?: boolean }): {
  enabled: boolean
  queryParams: T
} {
  const { enabled = true, ...queryParams } = params
  return {
    enabled,
    queryParams: queryParams as T,
  }
}

function createQueryOptions<TData>(params: {
  key: string
  hashSource: unknown
  queryFn: () => Promise<TData>
  enabled: boolean
  staleTime: number
}) {
  return queryOptions<TData>({
    queryKey: [params.key, buildHash(params.hashSource)],
    queryFn: params.queryFn,
    enabled: params.enabled,
    staleTime: params.staleTime,
  })
}

// ---------------------------------------------------------------------------
// Statistics landing
// ---------------------------------------------------------------------------

export const statisticsLandingQueryOptions = (params: {
  enabled?: boolean
}) => {
  const { enabled } = splitEnabled({ enabled: params.enabled })

  return createQueryOptions<StatisticsLanding>({
    key: 'statisticsLanding',
    hashSource: 'landing',
    queryFn: () => fetchStatisticsLanding(),
    enabled,
    staleTime: LONG_STALE_TIME,
  })
}

export function useStatisticsLanding(params: { enabled?: boolean } = {}) {
  return useQuery(statisticsLandingQueryOptions(params))
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
  const { enabled, queryParams } = splitEnabled(params)
  const normalizedSiruta = queryParams.siruta.trim()

  return createQueryOptions<StatisticsTerritoryHubResult | null>({
    key: 'statisticsTerritoryHub',
    hashSource: { siruta: normalizedSiruta },
    queryFn: () => fetchStatisticsTerritoryHub(normalizedSiruta),
    enabled: enabled && normalizedSiruta.length > 0,
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
