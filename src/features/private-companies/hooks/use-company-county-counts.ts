import { useQuery } from '@tanstack/react-query'
import { fetchCompanyCountyCounts } from '../api/private-company-api'

/**
 * Every county for the hub's map, on its own query.
 *
 * Deliberately not folded into `usePrivateCompanyHub`: this one is a ~3s
 * grouping and the hub aggregate is a cached read, so joining them would make
 * the four figures wait for the map. Kept apart, each section fills in when
 * its own answer lands, and a failure in one leaves the other standing.
 *
 * The same nightly registry snapshot backs both, so it holds for an hour and
 * never refetches on focus.
 */
export function useCompanyCountyCounts() {
  return useQuery({
    queryKey: ['private-company-county-counts'],
    queryFn: ({ signal }) => fetchCompanyCountyCounts(signal),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
