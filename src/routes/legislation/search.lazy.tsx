import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationActFinder } from '@/features/legal/components/legislation-act-finder'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'

export const Route = createLazyFileRoute('/legislation/search')({
  component: LegislationSearchRoutePage,
})

function LegislationSearchRoutePage() {
  const search = Route.useSearch()
  // The finder searches the acts corpus — same bound as the directory.
  const { measuredAt, dataStatus } = useLegislationFrontier('corpus')

  return (
    <LegislationShell activeTab="cauta" measuredAt={measuredAt} dataStatus={dataStatus}>
      <LegislationActFinder search={search} />
    </LegislationShell>
  )
}
