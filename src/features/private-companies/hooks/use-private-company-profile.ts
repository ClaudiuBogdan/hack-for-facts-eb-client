import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchPrivateCompanyProfile } from '../api/private-company-api'

export function privateCompanyProfileQueryKey(cui: string) {
  return ['private-company', cui] as const
}

/**
 * Exported as options rather than inlined in the hook so the route loader can
 * prefetch the *same* cache entry the page reads. Key drift between loader and
 * hook would silently fetch the profile twice.
 *
 * Every completed read is its own answer object, even when it equals the last
 * one (`structuralSharing: false`): the page withdraws an answer by identity
 * when a dependent read finds the company gone, and a fresh read that finds
 * it again must not come back as the withdrawn object.
 */
export function privateCompanyProfileQueryOptions(cui: string) {
  return queryOptions({
    queryKey: privateCompanyProfileQueryKey(cui),
    queryFn: () => fetchPrivateCompanyProfile(cui),
    structuralSharing: false,
  })
}

export function usePrivateCompanyProfile(cui: string) {
  return useQuery({
    ...privateCompanyProfileQueryOptions(cui),
    enabled: cui.length > 0,
  })
}
