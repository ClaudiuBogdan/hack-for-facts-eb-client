import { vi } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import type {
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import { territoryHubFixture } from './territory-hub-fixtures'

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

export function createTerritoryHubQueryStub(
  overrides: Partial<QueryStub<StatisticsTerritoryHubResult | null>> = {},
): QueryStub<StatisticsTerritoryHubResult | null> {
  return createQueryStub(territoryHubFixture('54975'), overrides)
}

/** The hub as it comes back when the references' read (POST 2) failed. */
export function createTerritoryHubWithoutBenchmarks(
  siruta = '54975',
): StatisticsTerritoryHubResult {
  const hub = territoryHubFixture(siruta)
  if (!hub) {
    throw new Error(`Missing hub fixture for SIRUTA ${siruta}`)
  }

  return {
    ...hub,
    benchmarks: {},
    benchmarksUnavailable: true,
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
