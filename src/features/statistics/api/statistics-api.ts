import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsLanding,
  StatisticsTerritoryHubSearch,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import {
  fetchStatisticsLandingMock,
  fetchStatisticsTerritoryHubMock,
  submitDatasetRequestMock,
} from './statistics-api.mock'
import {
  fetchStatisticsLandingLive,
  fetchStatisticsTerritoryHubLive,
  submitDatasetRequestLive,
} from './statistics-api.live'

/**
 * Statistics API seam.
 *
 * Dispatches to mock fixtures when `isStatisticsMockEnabled()` is true
 * (feature-local wrapper over `isMockDataEnabled('ins-indicators')`),
 * otherwise to the live adapter that delegates to the existing INS APIs.
 */

export async function fetchStatisticsLanding(): Promise<StatisticsLanding> {
  if (isStatisticsMockEnabled()) {
    return fetchStatisticsLandingMock()
  }
  return fetchStatisticsLandingLive()
}

export async function fetchStatisticsTerritoryHub(
  siruta: string,
  search?: Partial<StatisticsTerritoryHubSearch>,
): Promise<StatisticsTerritoryHubResult | null> {
  if (isStatisticsMockEnabled()) {
    return fetchStatisticsTerritoryHubMock(siruta, search)
  }
  return fetchStatisticsTerritoryHubLive(siruta, search)
}

export async function submitDatasetRequest(
  payload: DatasetRequestPayload,
): Promise<DatasetRequestResult> {
  if (isStatisticsMockEnabled()) {
    return submitDatasetRequestMock(payload)
  }
  return submitDatasetRequestLive(payload)
}
