import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsContextNode,
  StatisticsHubData,
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
import { MOCK_CONTEXT_TREE } from '../mocks/statistics-explorer-fixtures'
import {
  fetchStatisticsTerritoryHubLive,
  submitDatasetRequestLive,
} from './statistics-api.live'
import {
  fetchStatisticsContextTree,
  fetchStatisticsLandingCatalog,
  fetchStatisticsUatSnapshot,
} from './graphql/statistics-fetchers'
import { fetchStatisticsHub as fetchStatisticsHubLive } from './graphql/statistics-hub-fetchers'

/**
 * Statistics API seam.
 *
 * Dispatches to mock fixtures when `isStatisticsMockEnabled()` is true
 * (feature-local wrapper over `isMockDataEnabled('ins-indicators')`),
 * otherwise to the live adapters. Landing reads go straight to the validated
 * fetcher lane (`graphql/statistics-fetchers.ts`); both adapters answer the
 * same domain shapes so the swap stays a one-call change.
 */

/** The `/statistici` hub: always the validated live lane; sections fail independently inside. */
export async function fetchStatisticsHub(
  signal?: AbortSignal,
): Promise<StatisticsHubData> {
  return fetchStatisticsHubLive(signal)
}

export async function fetchLandingCatalog(
  signal?: AbortSignal,
): Promise<StatisticsLandingCatalog> {
  return fetchStatisticsLandingCatalog(signal ? { signal } : {})
}

/**
 * The INS context tree behind the catalog rail. In mock mode it is the slice
 * the mock datasets hang from, so the rail filters the same rows either way.
 */
export async function fetchContextTree(
  signal?: AbortSignal,
): Promise<readonly StatisticsContextNode[]> {
  if (isStatisticsMockEnabled()) {
    return Promise.resolve(MOCK_CONTEXT_TREE)
  }

  return fetchStatisticsContextTree(signal ? { signal } : {})
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
