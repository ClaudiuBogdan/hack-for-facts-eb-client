import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationChangesPage } from '@/features/legal/components/changes/legislation-changes-page'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'

export const Route = createLazyFileRoute('/legislation/changes')({
  component: LegislationChangesRoutePage,
})

function LegislationChangesRoutePage() {
  const search = Route.useSearch()
  // This page's true bound is the newest ALREADY-in-force change, read live; the upcoming changes above it come from
  // acts already published, so they do not contradict the caption. The badge says `stale` only while that frontier
  // is old.
  const { measuredAt, dataStatus } = useLegislationFrontier('changes')

  return (
    <LegislationShell activeTab="modificari" measuredAt={measuredAt} dataStatus={dataStatus}>
      <LegislationChangesPage search={search} />
    </LegislationShell>
  )
}
