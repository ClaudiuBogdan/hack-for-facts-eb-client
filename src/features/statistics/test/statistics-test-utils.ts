import { vi } from 'vitest'
import type { UseQueryResult } from '@tanstack/react-query'
import type {
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import {
  getMockStatisticsTerritoryHub,
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
