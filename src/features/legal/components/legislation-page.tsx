import { Trans } from '@lingui/react/macro'
import type { LegislationOverview } from '@/schemas/legal'
import { useLegislationOverview } from '../hooks/use-legislation'
import { LEGAL_CORPUS_MEASURED_AT } from '../lib/legal-coverage'
import { LegislationDomainGrid } from './legislation-domain-grid'
import { LegislationGazetteBand } from './legislation-gazette-band'
import { LegislationHonestyNotes } from './legislation-honesty-notes'
import { LegislationOverviewSkeleton } from './legislation-overview-skeleton'
import { LegislationSearchBand } from './legislation-search-band'
import { LegislationShell } from './legislation-shell'

type Props = {
  readonly initialOverview?: LegislationOverview
}

/**
 * `/legislation` — the module front door, and a finding aid rather than a
 * dashboard.
 *
 * Every band here answers "where is the act I need": search it, browse it by
 * subject, or find the gazette issue that proves it was published. The headline
 * counts and the citation ranking moved to `/legislation/analytics` — they
 * describe the corpus rather than helping you get into it.
 *
 * The header still carries the three stat chips, so the page is not numberless;
 * the analysis is one tab away, not hidden.
 *
 * The search box is deliberately unframed and there is no coverage ribbon: both
 * were removed as noise above the fold. The trust label the ribbon carried moved
 * into the header meta line, and the coverage caveats it summarised are stated
 * in full — and in prose — by the honesty band at the bottom.
 *
 * There is no "recently changed acts" band: the server has no global,
 * date-ordered status-event query (§6.1), and a placeholder over 84 420 real
 * events would misrepresent the data. The gazette band runs full width instead.
 */
export function LegislationPage({ initialOverview }: Props) {
  const { data, isLoading, isError } = useLegislationOverview(initialOverview)

  return (
    <LegislationShell
      activeTab="prezentare"
      counts={data?.counts}
      measuredAt={LEGAL_CORPUS_MEASURED_AT}
      dataStatus={data?.coverage.dataStatus}
    >
      {isLoading ? (
        <LegislationOverviewSkeleton />
      ) : isError || !data ? (
        <p className="text-[var(--pnrr-muted)]">
          <Trans>Nu am putut încărca datele despre legislație.</Trans>
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          <LegislationSearchBand />
          <LegislationDomainGrid />
          <LegislationGazetteBand issues={data.latestGazetteIssues} />
          <LegislationHonestyNotes />
        </div>
      )}
    </LegislationShell>
  )
}
