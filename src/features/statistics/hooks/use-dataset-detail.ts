import { useQuery } from '@tanstack/react-query'
import type {
  InsDatasetDetails,
  InsDimensionValueConnection,
  InsObservationConnection,
  InsObservationFilterInput,
} from '@/schemas/ins'
import {
  fetchDatasetDetail,
  fetchDimensionValuesPage,
  fetchObservationsPage,
} from '../api/dataset-detail-api'

const DATASET_STALE_TIME = 1000 * 60 * 60 * 24
const DIMENSION_STALE_TIME = 1000 * 60 * 30
const OBSERVATIONS_STALE_TIME = 1000 * 60 * 15

export function useDatasetDetail(code: string) {
  return useQuery<InsDatasetDetails | null>({
    queryKey: ['statisticsDatasetDetail', code],
    queryFn: () => fetchDatasetDetail(code),
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
    queryFn: () =>
      fetchDimensionValuesPage({
        datasetCode: params.datasetCode,
        dimensionIndex: params.dimensionIndex,
        search,
        limit: params.limit,
        offset: params.offset,
      }),
    enabled: params.enabled && params.datasetCode.trim().length > 0,
    staleTime: DIMENSION_STALE_TIME,
    placeholderData: (previous) => previous,
  })
}

/**
 * A page of observations.
 *
 * `enabled` is not a convenience here — `insObservations` scans 23.6M rows and
 * an unscoped call is a 30-second server timeout. Callers pass the result of
 * `isObservationsQueryEnabled`; when it is false the page shows a prompt
 * naming what to pin, never a spinner.
 */
export function useDatasetObservations(params: {
  readonly datasetCode: string
  readonly filter: InsObservationFilterInput
  readonly limit: number
  readonly offset: number
  readonly enabled: boolean
}) {
  return useQuery<InsObservationConnection>({
    queryKey: [
      'statisticsObservations',
      params.datasetCode,
      JSON.stringify(params.filter),
      params.limit,
      params.offset,
    ],
    queryFn: () =>
      fetchObservationsPage({
        datasetCode: params.datasetCode,
        filter: params.filter,
        limit: params.limit,
        offset: params.offset,
      }),
    enabled: params.enabled && params.datasetCode.trim().length > 0,
    staleTime: OBSERVATIONS_STALE_TIME,
  })
}
