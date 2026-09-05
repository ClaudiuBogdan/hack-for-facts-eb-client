import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsLandingCatalog,
  StatisticsTerritoryHubResult,
  StatisticsUatSnapshot,
} from '@/schemas/statistics'
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import {
  LANDING_NATIONAL_DATASET_CODES,
} from '../lib/landing-constants'
import {
  fetchStatisticsTerritoryHubMock,
  submitDatasetRequestMock,
} from './statistics-api.mock'
import {
  fetchStatisticsTerritoryHubLive,
  submitDatasetRequestLive,
} from './statistics-api.live'
import {
  fetchStatisticsLandingCatalog,
  fetchStatisticsUatSnapshot,
} from './graphql/statistics-fetchers'

/**
 * Statistics API seam.
 *
 * Dispatches to mock fixtures when `isStatisticsMockEnabled()` is true
 * (feature-local wrapper over `isMockDataEnabled('ins-indicators')`),
 * otherwise to the live adapters. Landing reads go straight to the validated
 * fetcher lane (`graphql/statistics-fetchers.ts`); both adapters answer the
 * same domain shapes so the swap stays a one-call change.
 */

export async function fetchLandingCatalog(
  signal?: AbortSignal,
): Promise<StatisticsLandingCatalog> {
  return fetchStatisticsLandingCatalog(signal ? { signal } : {})
}

export async function fetchUatSnapshot(
  siruta: string,
  signal?: AbortSignal,
): Promise<StatisticsUatSnapshot> {
  return fetchStatisticsUatSnapshot({
    siruta,
    datasetCodes: LANDING_NATIONAL_DATASET_CODES,
    ...(signal ? { signal } : {}),
  })
}

export async function fetchStatisticsTerritoryHub(
  siruta: string,
  signal?: AbortSignal,
): Promise<StatisticsTerritoryHubResult | null> {
  if (isStatisticsMockEnabled()) {
    return fetchStatisticsTerritoryHubMock(siruta)
  }
  return fetchStatisticsTerritoryHubLive(siruta, signal)
}

export async function submitDatasetRequest(
  payload: DatasetRequestPayload,
): Promise<DatasetRequestResult> {
  if (isStatisticsMockEnabled()) {
    return submitDatasetRequestMock(payload)
  }
  return submitDatasetRequestLive(payload)
}
