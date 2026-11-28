import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import { DA_QUERY_CACHE } from '../lib/disclosure-cache'
import {
  fetchProcurementHomeCategories,
  fetchProcurementHomeNational,
  fetchProcurementHomeRecentDirect,
  type HomeCategoriesRead,
} from '../api/procurement-home-api'
import type { HomeGrain, NationalRead } from '../lib/home-model'

/**
 * The front door's reads, each its own query so a failure stays in its band.
 * The route loader reads the first two on the server and seeds them here,
 * so the server and the first client render agree; the newest records wait
 * for the national read's cutoff month and are read in the browser.
 */

/** How many records of the newest month „Cele mai noi" lists. */
export const HOME_RECENT_RECORDS = 8

export const procurementHomeKeys = {
  all: ['procurement', 'home'] as const,
  national: (year: number) => [...procurementHomeKeys.all, 'national', year] as const,
  categories: (year: number) => [...procurementHomeKeys.all, 'categories', year] as const,
  recent: (grain: HomeGrain, month: string, limit: number) => [...procurementHomeKeys.all, 'recent', grain, month, limit] as const,
}

export function procurementHomeNationalQueryOptions(year: number, initialData?: NationalRead) {
  return queryOptions({
    queryKey: procurementHomeKeys.national(year),
    // D6: direct purchases' figures.
    ...DA_QUERY_CACHE,
    queryFn: ({ signal }) => fetchProcurementHomeNational(year, signal),
    ...(initialData?.year === year ? { initialData } : {}),
  })
}

export function procurementHomeCategoriesQueryOptions(year: number, initialData?: HomeCategoriesRead) {
  return queryOptions({
    queryKey: procurementHomeKeys.categories(year),
    // D6: direct purchases' categories.
    ...DA_QUERY_CACHE,
    queryFn: ({ signal }) => fetchProcurementHomeCategories(year, signal),
    ...(initialData ? { initialData } : {}),
  })
}

export function useProcurementHomeNational(year: number, initialData?: NationalRead) {
  return useQuery(procurementHomeNationalQueryOptions(year, initialData))
}

export function useProcurementHomeCategories(year: number, initialData?: HomeCategoriesRead) {
  return useQuery(procurementHomeCategoriesQueryOptions(year, initialData))
}

/**
 * The direct purchases' largest records of their own newest complete month;
 * waits for the month the national read derives, and reads nothing without
 * one. The contracts read nothing: the national contract-award list is not
 * served yet, and the band says it is coming (`contractListComingText`).
 */
export function useProcurementHomeRecent(grain: HomeGrain, month: string | null) {
  return useQuery({
    queryKey: procurementHomeKeys.recent(grain, month ?? '', HOME_RECENT_RECORDS),
    // No fetch function at all, not just a disabled one: a refetch can't read under the contracts' key, or without a month.
    queryFn: grain === 'direct' && month !== null ? ({ signal }) => fetchProcurementHomeRecentDirect(month, HOME_RECENT_RECORDS, signal) : skipToken,
    // D6: the direct purchases' recent records are never kept past their read.
    ...DA_QUERY_CACHE,
  })
}
