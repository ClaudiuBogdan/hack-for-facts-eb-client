import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchCaseSheet } from '../api/judicial-case-api'
import type { CaseSheet } from '../lib/case-model'
import { justiceKeys } from '../lib/justice-keys'

const STALE_TIME = 60 * 60 * 1000
const PARTIAL_STALE_TIME = 60 * 1000

export function justiceCaseQueryOptions(code: string, number: string, initialData?: CaseSheet | null) {
  return queryOptions({
    queryKey: justiceKeys.case(code, number),
    queryFn: ({ signal }) => fetchCaseSheet(code, number, signal),
    staleTime: (query) => (query.state.data?.partial ? PARTIAL_STALE_TIME : STALE_TIME),
    ...(initialData !== undefined &&
    (initialData === null || (initialData.case.institutionCode === code && initialData.case.caseNumber === number))
      ? { initialData }
      : {}),
  })
}

/** The case page's read; the route loader reads it on the server and seeds it here. */
export function useJusticeCase(code: string, number: string, initialData?: CaseSheet | null) {
  return useQuery(justiceCaseQueryOptions(code, number, initialData))
}
