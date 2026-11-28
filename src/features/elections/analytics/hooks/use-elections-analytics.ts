import { queryOptions, useQuery } from '@tanstack/react-query'
import { electionsAnalyticsKeys } from '../../lib/elections-catalog-keys'
import { fetchCountyCouncil, fetchLocalMandates } from '../api/elections-analytics-api'
import { LOCAL_2024, type LocalMandates } from '../lib/mandates'

/** The figures move only with a new publication; ten minutes keeps a return visit from reading again. */
const STALE_TIME = 10 * 60 * 1000

export function localMandatesQueryOptions() {
  return queryOptions({
    queryKey: electionsAnalyticsKeys.localMandates(LOCAL_2024),
    queryFn: ({ signal }) => fetchLocalMandates(signal),
    staleTime: STALE_TIME,
  })
}

/** The local mandates, seeded from the server's read when it succeeded. */
export function useLocalMandates(initialData?: LocalMandates) {
  return useQuery({ ...localMandatesQueryOptions(), ...(initialData ? { initialData } : {}) })
}

/** One county's council; idle without a county, and for București, whose General Council is not in the figures. */
export function useCountyCouncil(county: string | undefined) {
  return useQuery({
    queryKey: electionsAnalyticsKeys.countyCouncil(LOCAL_2024, county ?? ''),
    queryFn: ({ signal }) => fetchCountyCouncil(county ?? '', signal),
    enabled: county !== undefined && county !== 'B',
    staleTime: STALE_TIME,
  })
}
