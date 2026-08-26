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
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import {
  getInsDatasetDetails,
  getInsDimensionValuesPage,
} from './graphql/ins-fetchers'
import {
  fetchStatisticsDatasetSeries,
  fetchStatisticsDatasetTier0,
} from './graphql/statistics-fetchers'
import { SERIES_MAX_ROWS } from '../lib/dataset-selection'
import {
  fetchDatasetDetailMock,
  fetchDatasetSeriesMock,
  fetchDatasetTier0Mock,
  fetchDimensionValuesPageMock,
} from './dataset-detail-api.mock'

/**
 * Dataset detail seam. Both adapters take the same
 * `InsObservationFilterInput` built by `lib/dataset-selection`, so a selection
 * that filters correctly in mock mode filters correctly against the server.
 */

export async function fetchDatasetDetail(
  code: string,
): Promise<InsDatasetDetails | null> {
  if (isStatisticsMockEnabled()) {
    return fetchDatasetDetailMock(code)
  }
  return getInsDatasetDetails(code)
}

export async function fetchDimensionValuesPage(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly search?: string
  readonly limit: number
  readonly offset: number
}): Promise<InsDimensionValueConnection> {
  if (isStatisticsMockEnabled()) {
    return fetchDimensionValuesPageMock(params)
  }
  return getInsDimensionValuesPage(params)
}

/** Tier-0: dataset metadata + the server-resolved latest value (POST A). */
export async function fetchDatasetTier0(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput
  readonly signal?: AbortSignal
}): Promise<StatisticsDatasetTier0> {
  if (isStatisticsMockEnabled()) {
    return fetchDatasetTier0Mock(params)
  }
  return fetchStatisticsDatasetTier0(params)
}

/** The resolved series + related datasets in one POST (POST B). */
export async function fetchDatasetSeries(params: {
  readonly code: string
  readonly filter: InsObservationFilterInput
  readonly contextCode: string | null
  readonly signal?: AbortSignal
}): Promise<StatisticsDatasetSeries> {
  if (isStatisticsMockEnabled()) {
    return fetchDatasetSeriesMock({ ...params, limit: SERIES_MAX_ROWS })
  }
  return fetchStatisticsDatasetSeries(params)
}
