import { vi } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import type {
  StatisticsLandingCatalog,
  StatisticsLandingData,
  StatisticsTerritoryHubResult,
  StatisticsUatSnapshot,
} from '@/schemas/statistics'
import {
  getMockStatisticsLandingCatalog,
  getMockStatisticsLandingData,
  getMockStatisticsTerritoryHub,
  getMockStatisticsUatSnapshot,
} from '../mocks/statistics-fixtures'

type QueryStub<TData> = Pick<
  UseQueryResult<TData>,
  'data' | 'isLoading' | 'isError' | 'isSuccess' | 'refetch'
>

function createQueryStub<TData>(
  data: TData,
  overrides: Partial<QueryStub<TData>> = {},
): QueryStub<TData> {
  return {
    data,
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
    ...overrides,
  }
}

export function createLandingDataQueryStub(
  overrides: Partial<QueryStub<StatisticsLandingData>> = {},
): QueryStub<StatisticsLandingData> {
  return createQueryStub(getMockStatisticsLandingData(), overrides)
}

export function createLandingCatalogQueryStub(
  overrides: Partial<QueryStub<StatisticsLandingCatalog>> = {},
): QueryStub<StatisticsLandingCatalog> {
  return createQueryStub(getMockStatisticsLandingCatalog(), overrides)
}

export function createUatSnapshotQueryStub(
  siruta = '54975',
  overrides: Partial<QueryStub<StatisticsUatSnapshot>> = {},
): QueryStub<StatisticsUatSnapshot> {
  return createQueryStub(getMockStatisticsUatSnapshot(siruta), overrides)
}

export function createTerritoryHubQueryStub(
  overrides: Partial<QueryStub<StatisticsTerritoryHubResult | null>> = {},
): QueryStub<StatisticsTerritoryHubResult | null> {
  return createQueryStub(getMockStatisticsTerritoryHub('54975'), overrides)
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
