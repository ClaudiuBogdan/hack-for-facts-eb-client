import { useContext, useEffect } from 'react'
import { useRefusedReleases } from '../lib/company-release-refusals'
import { CompanyAnalyticsSeedContext } from './use-company-analytics'

/**
 * Whether the API has refused the page's release — by ANY read of it this
 * browser has made: the release itself, the figures, a panel, a page of the
 * list, a filter's options, a chart's company series. One refusal withdraws
 * the whole page: every figure, list, panel and count read under that
 * release is hidden, and only the reader's explicit refresh moves to the
 * active release. Nothing is fetched in its place.
 *
 * The refusal is the QueryClient's (`company-release-refusals.ts`), kept for
 * its life: no read has to report it, a refused read dropped from the cache
 * does not bring the figures back, a page opened later knows it at once, and
 * the release's cached answers and charts are dropped there. The page's
 * seeds of it are forgotten too. A cursor the API refuses is not a
 * withdrawal: the list starts over on its own.
 */
export function useReleaseWithdrawal(release: string | null): boolean {
  const refused = useRefusedReleases()
  const seeds = useContext(CompanyAnalyticsSeedContext)
  const withdrawn = release !== null && refused.has(release)
  useEffect(() => {
    if (withdrawn && release !== null) seeds.forget(release)
  }, [withdrawn, release, seeds])
  return withdrawn
}
