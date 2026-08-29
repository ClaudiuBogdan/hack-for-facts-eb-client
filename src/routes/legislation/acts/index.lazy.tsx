import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationActsDirectory } from '@/features/legal/components/legislation-acts-directory'
import { LEGAL_CORPUS_MEASURED_AT } from '@/features/legal/lib/legal-coverage'

export const Route = createLazyFileRoute('/legislation/acts/')({
  component: LegislationActsRoutePage,
})

function LegislationActsRoutePage() {
  const filter = Route.useSearch()
  return (
    <LegislationShell activeTab="acte" measuredAt={LEGAL_CORPUS_MEASURED_AT}>
      <LegislationActsDirectory filter={filter} />
    </LegislationShell>
  )
}
