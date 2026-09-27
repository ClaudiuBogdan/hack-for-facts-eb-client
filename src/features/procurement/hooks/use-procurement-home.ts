import { queryOptions, useQuery } from '@tanstack/react-query'
import {
  fetchProcurementHomeBigContracts,
  fetchProcurementHomeCategories,
  fetchProcurementHomeNational,
  fetchProcurementHomeRecentContracts,
  fetchProcurementHomeRecentDirect,
  type HomeCategoriesRead,
} from '../api/procurement-home-api'
import type { HomeGrain, NationalRead, RecentRecord } from '../lib/home-model'

/**
 * The front door's reads, each its own query so a failure stays in its band.
 * The route loader reads the first three on the server and seeds them here,
 * so the server and the first client render agree; the newest records wait
 * for the national read's cutoff month and are read in the browser.
 */

/** SEAP loads daily at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000

/** How many of the year's largest contracts „Cine vinde" lists. */
export const HOME_BIG_CONTRACTS = 8
/** How many records of the newest month „Cele mai noi" lists. */
export const HOME_RECENT_RECORDS = 8

export const procurementHomeKeys = {
  all: ['procurement', 'home'] as const,
  national: (year: number) => [...procurementHomeKeys.all, 'national', year] as const,
  categories: (year: number) => [...procurementHomeKeys.all, 'categories', year] as const,
  bigContracts: (year: number, limit: number) => [...procurementHomeKeys.all, 'big-contracts', year, limit] as const,
  recent: (grain: HomeGrain, month: string, limit: number) => [...procurementHomeKeys.all, 'recent', grain, month, limit] as const,
}

export function procurementHomeNationalQueryOptions(year: number, initialData?: NationalRead) {
  return queryOptions({
    queryKey: procurementHomeKeys.national(year),
    queryFn: ({ signal }) => fetchProcurementHomeNational(year, signal),
    staleTime: STALE_TIME,
    ...(initialData?.year === year ? { initialData } : {}),
  })
}

export function procurementHomeCategoriesQueryOptions(year: number, initialData?: HomeCategoriesRead) {
  return queryOptions({
    queryKey: procurementHomeKeys.categories(year),
    queryFn: ({ signal }) => fetchProcurementHomeCategories(year, signal),
    staleTime: STALE_TIME,
    ...(initialData ? { initialData } : {}),
  })
}

export function procurementHomeBigContractsQueryOptions(year: number, initialData?: readonly RecentRecord[]) {
  return queryOptions({
    queryKey: procurementHomeKeys.bigContracts(year, HOME_BIG_CONTRACTS),
    queryFn: ({ signal }) => fetchProcurementHomeBigContracts(year, HOME_BIG_CONTRACTS, signal),
    staleTime: STALE_TIME,
    ...(initialData ? { initialData } : {}),
  })
}

export function useProcurementHomeNational(year: number, initialData?: NationalRead) {
  return useQuery(procurementHomeNationalQueryOptions(year, initialData))
}

export function useProcurementHomeCategories(year: number, initialData?: HomeCategoriesRead) {
  return useQuery(procurementHomeCategoriesQueryOptions(year, initialData))
}

export function useProcurementHomeBigContracts(year: number, initialData?: readonly RecentRecord[]) {
  return useQuery(procurementHomeBigContractsQueryOptions(year, initialData))
}

/**
 * One population's largest records of its own newest complete month; waits
 * for the month the national read derives, and reads nothing without one.
 */
export function useProcurementHomeRecent(grain: HomeGrain, month: string | null) {
  return useQuery({
    queryKey: procurementHomeKeys.recent(grain, month ?? '', HOME_RECENT_RECORDS),
    queryFn: ({ signal }) =>
      grain === 'contract'
        ? fetchProcurementHomeRecentContracts(month ?? '', HOME_RECENT_RECORDS, signal)
        : fetchProcurementHomeRecentDirect(month ?? '', HOME_RECENT_RECORDS, signal),
    enabled: month !== null,
    staleTime: STALE_TIME,
  })
}
