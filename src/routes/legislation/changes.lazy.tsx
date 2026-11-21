import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationChangesFeed } from '@/features/legal/components/legislation-changes-feed'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'

export const Route = createLazyFileRoute('/legislation/changes')({
  component: LegislationChangesRoutePage,
})

function LegislationChangesRoutePage() {
  const search = Route.useSearch()
  // This tab's true bound is the newest ALREADY-in-force event, read live;
  // future-dated rows beyond it come from acts already published, so they do
  // not contradict the caption (the feed's note says so). The badge says
  // `stale` only while that frontier is old.
  const { measuredAt, dataStatus } = useLegislationFrontier('changes')

  return (
    <LegislationShell activeTab="modificari" measuredAt={measuredAt} dataStatus={dataStatus}>
      <LegislationChangesFeed search={search} />
    </LegislationShell>
  )
}
