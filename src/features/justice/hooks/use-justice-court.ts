import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchCourtCases, fetchCourtSheet, type CourtCasesPage } from '../api/judicial-court-api'
import type { CourtSheet } from '../lib/court-model'
import { justiceKeys } from '../lib/justice-keys'

/** The portal's capture is frozen: an hour keeps a return visit from reading again. A partial sheet is read again sooner. */
const STALE_TIME = 60 * 60 * 1000
const PARTIAL_STALE_TIME = 60 * 1000

export function justiceCourtQueryOptions(code: string, year: number, initialData?: CourtSheet | null) {
  return queryOptions({
    queryKey: justiceKeys.court(code, year),
    queryFn: ({ signal }) => fetchCourtSheet(code, year, signal),
    staleTime: (query) => (query.state.data?.partial ? PARTIAL_STALE_TIME : STALE_TIME),
    ...(initialData !== undefined && (initialData === null || (initialData.code === code && initialData.year === year)) ? { initialData } : {}),
  })
}

/** The court page's read; the route loader reads it on the server and seeds it here. */
export function useJusticeCourt(code: string, year: number, initialData?: CourtSheet | null) {
  return useQuery(justiceCourtQueryOptions(code, year, initialData))
}

/** The court's cases past the sheet's first page, a page at a time, once the reader asks for them. */
export function useJusticeCourtMoreCases(code: string, firstCursor: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: [...justiceKeys.courtCases(code), firstCursor],
    queryFn: ({ pageParam, signal }) => fetchCourtCases(code, pageParam, signal),
    initialPageParam: firstCursor ?? '',
    getNextPageParam: (page: CourtCasesPage) => (page.hasNextPage && page.endCursor !== null ? page.endCursor : undefined),
    enabled: enabled && firstCursor !== null,
    staleTime: STALE_TIME,
  })
}
