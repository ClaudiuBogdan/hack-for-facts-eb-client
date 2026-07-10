import { useQuery } from '@tanstack/react-query'
import { fetchCompanyHubStats } from '../api/private-company-api'

/**
 * The /companies hub aggregate. Server-side cached and effectively static
 * between nightly ONRC/ANAF snapshots, so it stays fresh for an hour and is
 * never refetched on focus.
 */
export function usePrivateCompanyHub() {
  return useQuery({
    queryKey: ['private-company-hub-stats'],
    queryFn: ({ signal }) => fetchCompanyHubStats(signal),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
