import { vi } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import type {
  StatisticsLanding,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import { buildDocsFallbackCoverage } from '../lib/coverage'
import { getMockStatisticsLanding, getMockStatisticsTerritoryHub } from '../mocks/statistics-fixtures'

type QueryStub<TData> = Pick<
  UseQueryResult<TData>,
  'data' | 'isLoading' | 'isError' | 'isSuccess' | 'refetch'
>

export function createLandingQueryStub(
  overrides: Partial<QueryStub<StatisticsLanding>> = {},
): QueryStub<StatisticsLanding> {
  return {
    data: getMockStatisticsLanding(),
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
    ...overrides,
  }
}

export function createTerritoryHubQueryStub(
  overrides: Partial<QueryStub<StatisticsTerritoryHubResult | null>> = {},
): QueryStub<StatisticsTerritoryHubResult | null> {
  return {
    data: getMockStatisticsTerritoryHub('54975'),
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
    ...overrides,
  }
}

export function createEmptyLandingData(): StatisticsLanding {
  return {
    topDatasets: [],
    coverage: buildDocsFallbackCoverage(),
    latestDataPeriod: null,
  }
}

export function createPartialTerritoryHub(
  siruta = '54975',
): StatisticsTerritoryHubResult {
  const hub = getMockStatisticsTerritoryHub(siruta)
  if (!hub) {
    throw new Error(`Missing mock hub fixture for SIRUTA ${siruta}`)
  }

  return {
    ...hub,
    partial: true,
  }
}

export function parseRelatedLinkSearchParam(
  href: string,
  key: string,
): unknown {
  const url = new URL(href, 'http://localhost')
  const raw = url.searchParams.get(key)
  if (raw === null) {
    return undefined
  }
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}
