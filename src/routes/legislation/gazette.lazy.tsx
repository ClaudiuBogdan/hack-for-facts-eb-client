import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationGazetteDirectory } from '@/features/legal/components/legislation-gazette-directory'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'

export const Route = createLazyFileRoute('/legislation/gazette')({
  component: LegislationGazetteRoutePage,
})

function LegislationGazetteRoutePage() {
  const search = Route.useSearch()
  // This tab's true bound is the gazette frontier (the newest issue, read
  // live), and its badge says `stale` only while that frontier is old.
  const { measuredAt, dataStatus } = useLegislationFrontier('gazette')

  return (
    <LegislationShell activeTab="monitorul" measuredAt={measuredAt} dataStatus={dataStatus}>
      <LegislationGazetteDirectory search={search} />
    </LegislationShell>
  )
}
