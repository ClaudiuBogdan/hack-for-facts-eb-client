import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsLandingCatalog,
  StatisticsLandingData,
  StatisticsTerritoryHubResult,
  StatisticsUatSnapshot,
} from '@/schemas/statistics'
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import {
  DECADE_DATASET_CODE,
  DECADE_END_YEAR,
  DECADE_START_YEAR,
  EXAMPLE_DATASET_CODE,
  EXAMPLE_TERRITORY_CODES,
  LANDING_NATIONAL_DATASET_CODES,
} from '../lib/landing-constants'
import {
  fetchStatisticsLandingCatalogMock,
  fetchStatisticsLandingDataMock,
  fetchStatisticsTerritoryHubMock,
  fetchStatisticsUatSnapshotMock,
  submitDatasetRequestMock,
} from './statistics-api.mock'
import {
  fetchStatisticsTerritoryHubLive,
  submitDatasetRequestLive,
} from './statistics-api.live'
import {
  fetchStatisticsLandingCatalog,
  fetchStatisticsLandingData,
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

export async function fetchLandingData(
  signal?: AbortSignal,
): Promise<StatisticsLandingData> {
  if (isStatisticsMockEnabled()) {
    return fetchStatisticsLandingDataMock()
  }
  return fetchStatisticsLandingData({
    nationalCodes: LANDING_NATIONAL_DATASET_CODES,
    decadeCode: DECADE_DATASET_CODE,
    decadeYears: [String(DECADE_START_YEAR), String(DECADE_END_YEAR)],
    exampleCode: EXAMPLE_DATASET_CODE,
    exampleTerritories: EXAMPLE_TERRITORY_CODES,
    ...(signal ? { signal } : {}),
  })
}

export async function fetchLandingCatalog(
  signal?: AbortSignal,
): Promise<StatisticsLandingCatalog> {
  if (isStatisticsMockEnabled()) {
    return fetchStatisticsLandingCatalogMock()
  }
  return fetchStatisticsLandingCatalog(signal ? { signal } : {})
}

export async function fetchUatSnapshot(
  siruta: string,
  signal?: AbortSignal,
): Promise<StatisticsUatSnapshot> {
  if (isStatisticsMockEnabled()) {
    return fetchStatisticsUatSnapshotMock(siruta)
  }
  return fetchStatisticsUatSnapshot({
    siruta,
    datasetCodes: LANDING_NATIONAL_DATASET_CODES,
    ...(signal ? { signal } : {}),
  })
}

export async function fetchStatisticsTerritoryHub(
  siruta: string,
): Promise<StatisticsTerritoryHubResult | null> {
  if (isStatisticsMockEnabled()) {
    return fetchStatisticsTerritoryHubMock(siruta)
  }
  return fetchStatisticsTerritoryHubLive(siruta)
}

export async function submitDatasetRequest(
  payload: DatasetRequestPayload,
): Promise<DatasetRequestResult> {
  if (isStatisticsMockEnabled()) {
    return submitDatasetRequestMock(payload)
  }
  return submitDatasetRequestLive(payload)
}
