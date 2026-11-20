import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationActsDirectory } from '@/features/legal/components/legislation-acts-directory'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'

export const Route = createLazyFileRoute('/legislation/acts/')({
  component: LegislationActsRoutePage,
})

function LegislationActsRoutePage() {
  const filter = Route.useSearch()
  const { measuredAt } = useLegislationFrontier('corpus')
  return (
    <LegislationShell activeTab="acte" measuredAt={measuredAt}>
      <LegislationActsDirectory filter={filter} />
    </LegislationShell>
  )
}
