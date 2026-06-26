import { t } from '@lingui/core/macro'
import type {
  DatasetRequestPayload,
  DatasetRequestResult,
  StatisticsLanding,
  StatisticsTerritoryHubSearch,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import {
  getMockStatisticsLanding,
  getMockStatisticsTerritoryHub,
} from '../mocks/statistics-fixtures'

const MOCK_DELAY_MS = 120

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
}

/**
 * Mock implementation of the statistics API seam.
 *
 * Returns fixtures with a small async delay. Unknown SIRUTA codes return
 * `null` (not-found) rather than throwing, matching the live adapter's
 * contract so route loaders can map `null` to a 404 uniformly.
 */
export async function fetchStatisticsLandingMock(): Promise<StatisticsLanding> {
  await delay()
  return getMockStatisticsLanding()
}

export async function fetchStatisticsTerritoryHubMock(
  siruta: string,
  search?: Partial<StatisticsTerritoryHubSearch>,
): Promise<StatisticsTerritoryHubResult | null> {
  await delay()
  return getMockStatisticsTerritoryHub(siruta, search)
}

export async function submitDatasetRequestMock(
  payload: DatasetRequestPayload,
): Promise<DatasetRequestResult> {
  await delay()
  return {
    accepted: true,
    datasetCode: payload.datasetCode,
    message: t`Cererea a fost pregătită local (mock).`,
  }
}
