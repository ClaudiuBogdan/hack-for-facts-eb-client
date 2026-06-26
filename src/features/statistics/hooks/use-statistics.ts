import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import { generateHash } from '@/lib/utils'
import type {
  DatasetRequestPayload,
  StatisticsLanding,
  StatisticsTerritoryHubSearch,
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

export const statisticsTerritoryHubQueryOptions = (params: {
  siruta: string
  search?: Partial<StatisticsTerritoryHubSearch>
  enabled?: boolean
}) => {
  const { enabled, queryParams } = splitEnabled(params)
  const normalizedSiruta = queryParams.siruta.trim()

  return createQueryOptions<StatisticsTerritoryHubResult | null>({
    key: 'statisticsTerritoryHub',
    hashSource: {
      siruta: normalizedSiruta,
      search: queryParams.search ?? {},
    },
    queryFn: () =>
      fetchStatisticsTerritoryHub(normalizedSiruta, queryParams.search),
    enabled: enabled && normalizedSiruta.length > 0,
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useStatisticsTerritoryHub(params: {
  siruta: string
  search?: Partial<StatisticsTerritoryHubSearch>
  enabled?: boolean
}) {
  return useQuery(statisticsTerritoryHubQueryOptions(params))
}

export function useDatasetRequest() {
  return useMutation({
    mutationFn: (payload: DatasetRequestPayload) => submitDatasetRequest(payload),
  })
}
