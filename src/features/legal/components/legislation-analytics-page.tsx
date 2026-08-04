import { Trans } from '@lingui/react/macro'
import type { LegislationOverview } from '@/schemas/legal'
import { useLegislationOverview } from '../hooks/use-legislation'
import { LEGAL_CORPUS_MEASURED_AT } from '../lib/legal-coverage'
import { LegislationAnalyticsSkeleton } from './legislation-analytics-skeleton'
import { LegislationHonestyNotes } from './legislation-honesty-notes'
import { LegislationKpiStrip } from './legislation-kpi-strip'
import { LegislationShell } from './legislation-shell'
import { LegislationTopActs } from './legislation-top-acts'

type Props = {
  readonly initialOverview?: LegislationOverview
}

/**
 * `/legislation/analytics` — what the corpus looks like as a whole.
 *
 * The headline counts and the citation ranking live here rather than on the
 * landing page: they describe the corpus, they do not help you find an act, and
 * the front door's job is finding. Moved 2026-08-01.
 *
 * The honesty band repeats here rather than only on the landing page. This route
 * is independently linkable, and it makes the strongest quantitative claims in
 * the module — a reader who arrives from a shared link must see the
 * Constitutional Court caveat without navigating away.
 *
 * It shares `useLegislationOverview` with the landing page, so switching tabs
 * costs no request.
 */
export function LegislationAnalyticsPage({ initialOverview }: Props) {
  const { data, isLoading, isError } = useLegislationOverview(initialOverview)

  return (
    <LegislationShell
      activeTab="analiza"
      counts={data?.counts}
      measuredAt={LEGAL_CORPUS_MEASURED_AT}
      dataStatus={data?.coverage.dataStatus}
    >
      {isLoading ? (
        <LegislationAnalyticsSkeleton />
      ) : isError || !data ? (
        <p className="text-[var(--pnrr-muted)]">
          <Trans>Nu am putut încărca datele despre legislație.</Trans>
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          <LegislationKpiStrip counts={data.counts} />
          <LegislationTopActs acts={data.mostCitedActs} />
          <LegislationHonestyNotes />
        </div>
      )}
    </LegislationShell>
  )
}
