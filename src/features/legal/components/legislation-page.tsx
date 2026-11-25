import { useLegislationFrontDoor, useLegislationStatusCounts } from '../hooks/use-legislation'
import { useLegislationFrontier } from '../hooks/use-legislation-frontier'
import { useLegalAnalytics } from '../hooks/use-legislation-analytics'
import { AnalyticsCaveats } from './analytics/analytics-notes'
import { LegislationFrontDoorBands } from './analytics/legislation-front-door-bands'
import { LegislationGazetteBand } from './legislation-gazette-band'
import { LegislationHonestyNotes } from './legislation-honesty-notes'
import { LegislationOverviewSkeleton } from './legislation-overview-skeleton'
import { LegislationSearchBand } from './legislation-search-band'
import { LegislationShell } from './legislation-shell'

/**
 * `/legislation` — the module front door (analytics design §4.1, §11): find an act first, then the corpus counted.
 *
 * Search comes first: the front door is a finding aid. Below it the analytics bands read the published insights
 * layer (the corpus in four figures, the most amended acts, what was published each year, the ordinance laws,
 * the themes to come), each degrading on its own; the Monitorul Oficial band is the gazette band it always was,
 * filled on the server by the route loader. The old subject grid is gone: subjects (Domeniu) come back with the
 * domain lens. The honesty notes stay, with the analytics notes beside them.
 */
export function LegislationPage({
  analyticsUnavailable = false,
}: {
  /** The server's analytics read was refused with 503: the bands render the panel until a read succeeds. */
  readonly analyticsUnavailable?: boolean
}) {
  const { data, isLoading, isError } = useLegislationFrontDoor()
  const { data: statusCounts } = useLegislationStatusCounts()
  const { measuredAt } = useLegislationFrontier('corpus')
  const head = useLegalAnalytics('head', {})

  return (
    <LegislationShell
      activeTab="prezentare"
      counts={statusCounts ?? {}}
      measuredAt={measuredAt}
      dataStatus={data?.coverage.dataStatus}
    >
      <div className="flex flex-col gap-12">
        <LegislationSearchBand />
        <LegislationFrontDoorBands unavailable={analyticsUnavailable} />
        {isLoading ? (
          <LegislationOverviewSkeleton />
        ) : isError || !data ? null : (
          <LegislationGazetteBand issues={data.latestGazetteIssues} />
        )}
        <LegislationHonestyNotes />
        <AnalyticsCaveats head={head.data?.data} />
      </div>
    </LegislationShell>
  )
}
