import { useLegislationFrontier } from '../hooks/use-legislation-frontier'
import { LegislationAnalysis } from './analytics/legislation-analysis'
import { LegislationShell } from './legislation-shell'

/**
 * `/legislation/analytics` — the analysis page (analytics design §4.2, §11): the question as the headline, the
 * population, the lens, the answer and the acts, every figure a count of the published insights layer. Promoted
 * from the prototype `development/prototypes/legal` (analysis variant); the prototype keeps the theme page.
 */
export function LegislationAnalyticsPage({
  analyticsUnavailable = false,
}: {
  /** The server's analytics read was refused with 503: the panel renders until a read succeeds. */
  readonly analyticsUnavailable?: boolean
}) {
  const { measuredAt } = useLegislationFrontier('corpus')
  return (
    // No status counts in the head: the Portal's „în vigoare" / „abrogat" marks are mostly undated badges, and
    // status never feeds a headline figure until the status redesign lands (analytics design §4; I-27–I-29).
    <LegislationShell activeTab="analiza" measuredAt={measuredAt}>
      <LegislationAnalysis unavailable={analyticsUnavailable} />
    </LegislationShell>
  )
}
