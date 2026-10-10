import { useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isReleaseRefused } from '../api/company-analytics-api'
import type { PlannedRead } from '../api/company-analytics-plan'
import { companyAnalyticsKeys } from '../lib/company-analytics-keys'
import { CompanyAnalyticsSeedContext } from './use-company-analytics'

/**
 * The `/companies` hub's reads in the browser, on the analysis page's terms
 * (`use-company-analytics.ts`): each section is its own query under the
 * page's key, so one that fails leaves the others standing; it starts from
 * what the route's loader read on the server under the same key (taken
 * once), and a read the API refuses for its release is not retried — the
 * refusal withdraws the release (`use-release-withdrawal.ts`).
 */

const STALE = 10 * 60 * 1000

export function useCompanyHubRead<T>(read: PlannedRead<T> | null) {
  const seeds = useContext(CompanyAnalyticsSeedContext)
  const seed = read ? seeds.take(read.key) : null
  return useQuery({
    queryKey: read?.key ?? [...companyAnalyticsKeys.all, 'idle'],
    queryFn: ({ signal }) => read!.read(signal),
    enabled: read?.enabled ?? false,
    staleTime: STALE,
    retry: (count, error) => !isReleaseRefused(error) && count < 2,
    ...(seed?.found ? { initialData: seed.data as T } : {}),
  })
}

/**
 * Leave a release the API refused for the active one — only when the reader
 * asks: no seed of it is used again, and the active release is read anew.
 * The refusal stays known, so the same release answered again is still
 * withdrawn; its cached answers are dropped once nothing shows them.
 */
export function useCompanyHubRefresh(): () => void {
  const client = useQueryClient()
  const seeds = useContext(CompanyAnalyticsSeedContext)
  return () => {
    seeds.clear()
    void client.invalidateQueries({ queryKey: companyAnalyticsKeys.release(null) })
  }
}
