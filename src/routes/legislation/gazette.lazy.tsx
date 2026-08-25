import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationGazetteDirectory } from '@/features/legal/components/legislation-gazette-directory'
import { GAZETTE_LATEST_ISSUE_DATE } from '@/features/legal/lib/legal-coverage'
import { isLegalMockEnabled } from '@/features/legal/lib/mock-mode'

export const Route = createLazyFileRoute('/legislation/gazette')({
  component: LegislationGazetteRoutePage,
})

function LegislationGazetteRoutePage() {
  const search = Route.useSearch()

  return (
    <LegislationShell
      activeTab="monitorul"
      // This tab's true bound is the gazette frontier (discovery frozen at
      // 2026-07-09), not the corpus-wide measurement date — "date până la"
      // must state the staler of the two for the surface it captions.
      measuredAt={GAZETTE_LATEST_ISSUE_DATE}
      // `stale` is the honest badge while discovery is frozen: the rows are
      // served live, but the corpus itself stopped moving on the date above.
      dataStatus={isLegalMockEnabled() ? 'mock' : 'stale'}
    >
      <LegislationGazetteDirectory search={search} />
    </LegislationShell>
  )
}
