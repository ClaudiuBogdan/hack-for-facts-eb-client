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
 * Native detail transport. Legacy demo responses cannot satisfy the native
 * descriptor gate and intentionally do not render as certified source data.
 * Browser development uses explicit synthetic native fixtures; live enablement
 * waits for the producer and remaining consumer migration gates.
 */

export async function fetchDatasetDetail(
  code: string,
  signal?: AbortSignal,
): Promise<InsDatasetDetails | null> {
  if (isStatisticsMockEnabled()) {
    return fetchDatasetDetailMock(code)
  }
  return getInsDatasetDetails(code, signal)
}

export async function fetchDimensionValuesPage(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly search?: string
  readonly limit: number
  readonly offset: number
  readonly signal?: AbortSignal
}): Promise<InsDimensionValueConnection> {
  if (isStatisticsMockEnabled()) {
    return fetchDimensionValuesPageMock(params)
  }
  return getInsDimensionValuesPage(params)
}

/** Tier-0: dataset metadata + the server-resolved latest value (POST A). */
export async function fetchDatasetTier0(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput | null
  readonly signal?: AbortSignal
}): Promise<StatisticsDatasetTier0> {
  if (isStatisticsMockEnabled()) {
    if (params.entity === null)
      return {
        dataset: await fetchDatasetDetailMock(params.code),
        latest: null,
      }
    return fetchDatasetTier0Mock({ ...params, entity: params.entity })
  }
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
  if (isStatisticsMockEnabled()) {
    return fetchDatasetSeriesMock({ ...params, limit: SERIES_MAX_ROWS })
  }
  return fetchStatisticsDatasetSeries(params)
}
