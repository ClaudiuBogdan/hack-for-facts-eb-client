import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchCompanyLitigation, fetchCompanyLitigationCases } from '../api/company-litigation-api'

export const judicialQueryKeys = {
  companyLitigation: (cui: string) => ['judicial', 'company-litigation', cui] as const,
  companyLitigationCases: (cui: string) => ['judicial', 'company-litigation-cases', cui] as const,
} as const

const FIVE_MINUTES = 5 * 60 * 1000

/** A company's published litigation summary. */
export function useCompanyLitigation(cui: string) {
  return useQuery({
    queryKey: judicialQueryKeys.companyLitigation(cui),
    queryFn: ({ signal }) => fetchCompanyLitigation(cui, signal),
    enabled: cui.length > 0,
    staleTime: FIVE_MINUTES,
  })
}

/** The company's published cases, a cursor page at a time (the API counts no total). */
export function useCompanyLitigationCases(cui: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: judicialQueryKeys.companyLitigationCases(cui),
    queryFn: ({ pageParam, signal }) => fetchCompanyLitigationCases(cui, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => (page.hasNextPage && page.endCursor !== null ? page.endCursor : undefined),
    enabled: enabled && cui.length > 0,
    staleTime: FIVE_MINUTES,
  })
}
