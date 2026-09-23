import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsContextNode,
  StatisticsHubData,
  StatisticsLandingCatalog,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import {
  fetchStatisticsTerritoryHubLive,
  submitDatasetRequestLive,
} from './statistics-api.live'
import {
  fetchStatisticsContextTree,
  fetchStatisticsLandingCatalog,
} from './graphql/statistics-fetchers'
import { fetchStatisticsHub as fetchStatisticsHubLive } from './graphql/statistics-hub-fetchers'

/**
 * The reads behind the INS section's hooks, one validated live lane: the
 * GraphQL fetchers parse the wire before mapping it, so a contract change
 * fails at the boundary rather than as blank cells.
 */

/** The `/ins` hub; sections fail independently inside. */
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

/** The INS context tree behind the catalog rail. */
export async function fetchContextTree(
  signal?: AbortSignal,
): Promise<readonly StatisticsContextNode[]> {
  return fetchStatisticsContextTree(signal ? { signal } : {})
}

export async function fetchStatisticsTerritoryHub(
  siruta: string,
  signal?: AbortSignal,
): Promise<StatisticsTerritoryHubResult | null> {
  return fetchStatisticsTerritoryHubLive(siruta, signal)
}

export async function submitDatasetRequest(
  payload: DatasetRequestPayload,
): Promise<DatasetRequestResult> {
  return submitDatasetRequestLive(payload)
}
