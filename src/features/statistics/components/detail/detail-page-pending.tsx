import { Trans } from '@lingui/react/macro'
import { statisticsTheme } from '../../lib/statistics-theme'
import { StatisticsBackLink } from '../statistics-back-link'
import { DetailBandSkeleton, DetailHeaderSkeleton } from './detail-skeletons'

/**
 * The dataset page while its code is still on the way: the page's own frame
 * with the skeletons it shows while its first read is in flight, so a click
 * lands on the page at once and the loaded page fills in where it stands.
 * The route's `pendingComponent`, which keeps it in the eager bundle — the
 * router arms its pending timer only for a component it already holds.
 */
export function DetailPagePending() {
  return (
    <div className="min-h-screen bg-background">
      <div className={statisticsTheme.detailPage}>
        <div>
          <StatisticsBackLink to="/ins/seturi">
            <Trans>Înapoi la seturi de date</Trans>
          </StatisticsBackLink>
          <DetailHeaderSkeleton />
        </div>
        <DetailBandSkeleton />
      </div>
    </div>
  )
}
