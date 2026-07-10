import type {
  InsDatasetDetails,
  InsDimensionValueConnection,
  InsObservationConnection,
  InsObservationFilterInput,
} from '@/schemas/ins'
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import {
  getInsDatasetDetails,
  getInsDimensionValuesPage,
  getInsObservationsPage,
} from './graphql/ins-fetchers'
import {
  fetchDatasetDetailMock,
  fetchDimensionValuesPageMock,
  fetchObservationsPageMock,
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

export async function fetchObservationsPage(params: {
  readonly datasetCode: string
  readonly filter: InsObservationFilterInput
  readonly limit: number
  readonly offset: number
}): Promise<InsObservationConnection> {
  if (isStatisticsMockEnabled()) {
    return fetchObservationsPageMock(params)
  }
  return getInsObservationsPage(params)
}
