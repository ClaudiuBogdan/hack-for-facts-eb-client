import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationActFinder } from '@/features/legal/components/legislation-act-finder'
import { LEGAL_CORPUS_MEASURED_AT } from '@/features/legal/lib/legal-coverage'
import { isLegalMockEnabled } from '@/features/legal/lib/mock-mode'

export const Route = createLazyFileRoute('/legislation/search')({
  component: LegislationSearchRoutePage,
})

function LegislationSearchRoutePage() {
  const search = Route.useSearch()

  return (
    <LegislationShell
      activeTab="cauta"
      // The finder searches the acts corpus — same bound as the directory.
      measuredAt={LEGAL_CORPUS_MEASURED_AT}
      {...(isLegalMockEnabled() && { dataStatus: 'mock' as const })}
    >
      <LegislationActFinder search={search} />
    </LegislationShell>
  )
}
