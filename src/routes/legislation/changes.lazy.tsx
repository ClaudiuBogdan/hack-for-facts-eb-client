import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationChangesFeed } from '@/features/legal/components/legislation-changes-feed'
import { CHANGES_LATEST_EFFECTIVE_DATE } from '@/features/legal/lib/legal-coverage'
import { isLegalMockEnabled } from '@/features/legal/lib/mock-mode'

export const Route = createLazyFileRoute('/legislation/changes')({
  component: LegislationChangesRoutePage,
})

function LegislationChangesRoutePage() {
  const search = Route.useSearch()

  return (
    <LegislationShell
      activeTab="modificari"
      // This tab's true bound is the newest ALREADY-in-force event (measured
      // 2026-07-11) — "date până la" states the feed's own frontier; the
      // future-dated rows beyond it come from acts published before it, so
      // they do not contradict the caption (the feed's note says so).
      measuredAt={CHANGES_LATEST_EFFECTIVE_DATE}
      // `stale` is the honest badge while event capture is behind: the rows
      // are served live, but nothing newer has entered the corpus since the
      // date above despite weeks having passed.
      dataStatus={isLegalMockEnabled() ? 'mock' : 'stale'}
    >
      <LegislationChangesFeed search={search} />
    </LegislationShell>
  )
}
