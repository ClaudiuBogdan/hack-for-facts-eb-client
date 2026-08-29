import { useQuery } from '@tanstack/react-query'
import type {
  InsDatasetDetails,
  InsDimensionValueConnection,
  InsEntitySelectorInput,
  InsObservationFilterInput,
} from '@/schemas/ins'
import type {
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
} from '@/schemas/statistics'
import {
  fetchDatasetDetail,
  fetchDatasetSeries,
  fetchDatasetTier0,
  fetchDimensionValuesPage,
} from '../api/dataset-detail-api'

const DATASET_STALE_TIME = 1000 * 60 * 60 * 24
const DIMENSION_STALE_TIME = 1000 * 60 * 30

export function useDatasetDetail(code: string) {
  return useQuery<InsDatasetDetails | null>({
    queryKey: ['statisticsDatasetDetail', code],
    queryFn: ({ signal }) => fetchDatasetDetail(code, signal),
    enabled: code.trim().length > 0,
    staleTime: DATASET_STALE_TIME,
  })
}

/**
 * One page of a dimension's options. Always paged and always server-searched:
 * a classification dimension can hold thousands of hierarchical values, so
 * there is no load-all path to fall back to.
 */
export function useDimensionValues(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly search: string | undefined
  readonly limit: number
  readonly offset: number
  readonly enabled: boolean
}) {
  const search = params.search?.trim() || undefined

  return useQuery<InsDimensionValueConnection>({
    queryKey: [
      'statisticsDimensionValues',
      params.datasetCode,
      params.dimensionIndex,
      search ?? '',
      params.limit,
      params.offset,
    ],
    queryFn: ({ signal }) =>
      fetchDimensionValuesPage({
        datasetCode: params.datasetCode,
        dimensionIndex: params.dimensionIndex,
        search,
        limit: params.limit,
        offset: params.offset,
        signal,
      }),
    enabled: params.enabled && params.datasetCode.trim().length > 0,
    staleTime: DIMENSION_STALE_TIME,
    placeholderData: (previous) => previous,
  })
}

/**
 * Tier-0 (POST A): dataset + resolved latest. Keyed by code + entity so a
 * territory deep link resolves its own cell. The route loader supplies
 * `initialData` for the CURRENT scope (loaderDeps re-run it per navigation),
 * so in the normal flow this query never fetches client-side.
 */
export function useDatasetTier0(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput
  readonly entityKey: string
  readonly initialData?: StatisticsDatasetTier0
}) {
  return useQuery<StatisticsDatasetTier0>({
    queryKey: ['statistics', 'dataset', params.code, 'tier0', params.entityKey] as const,
    queryFn: ({ signal }) =>
      fetchDatasetTier0({ code: params.code, entity: params.entity, signal }),
    enabled: params.code.trim().length > 0,
    staleTime: DATASET_STALE_TIME,
    ...(params.initialData ? { initialData: params.initialData } : {}),
  })
}

/** The resolved series + related datasets (POST B), keyed by the scope key. */
export function useDatasetSeries(params: {
  readonly code: string
  readonly scopeKey: string
  readonly filter: InsObservationFilterInput
  readonly contextCode: string | null
  readonly enabled: boolean
  readonly initialData?: StatisticsDatasetSeries
}) {
  return useQuery<StatisticsDatasetSeries>({
    queryKey: ['statistics', 'dataset', params.code, 'series', params.scopeKey] as const,
    queryFn: ({ signal }) =>
      fetchDatasetSeries({
        code: params.code,
        filter: params.filter,
        contextCode: params.contextCode,
        signal,
      }),
    enabled: params.enabled && params.code.trim().length > 0,
    staleTime: DATASET_STALE_TIME,
    ...(params.initialData ? { initialData: params.initialData } : {}),
  })
}
