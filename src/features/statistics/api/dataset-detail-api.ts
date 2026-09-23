import type {
  InsDimensionValueConnection,
  InsEntitySelectorInput,
  InsObservationFilterInput,
} from '@/schemas/ins'
import type {
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
} from '@/schemas/statistics'
import { getInsDimensionValuesPage } from './graphql/ins-bootstrap-fetchers'
import {
  fetchStatisticsDatasetSeries,
  fetchStatisticsDatasetTier0,
} from './graphql/statistics-fetchers'

/**
 * The dataset page's reads: the certified descriptor with its resolved
 * latest cell (POST A), the source vector with the related catalog (POST B),
 * and one page of a dimension's members at a time.
 */

/**
 * One page of a dimension's members. With `expectedPublicationKey` the read
 * refuses a page from another publication of the matrix than the one the
 * series was read under.
 */
export async function fetchDimensionValuesPage(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly search?: string
  readonly limit: number
  readonly offset: number
  readonly expectedPublicationKey?: string
  readonly signal?: AbortSignal
}): Promise<InsDimensionValueConnection> {
  return getInsDimensionValuesPage(params)
}

/** Tier-0: dataset metadata + the server-resolved latest value (POST A). */
export async function fetchDatasetTier0(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput | null
  readonly signal?: AbortSignal
}): Promise<StatisticsDatasetTier0> {
  return fetchStatisticsDatasetTier0(params)
}

/** Source observations and the related catalog use separate anonymous operations. */
export async function fetchDatasetSeries(params: {
  readonly code: string
  readonly filter: InsObservationFilterInput
  readonly contextCode: string | null
  readonly inspection?: boolean
  readonly signal?: AbortSignal
}): Promise<StatisticsDatasetSeries> {
  return fetchStatisticsDatasetSeries(params)
}
