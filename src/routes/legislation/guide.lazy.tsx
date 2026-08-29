import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationGuide } from '@/features/legal/components/legislation-guide'

export const Route = createLazyFileRoute('/legislation/guide')({
  component: LegislationGuideRoutePage,
})

function LegislationGuideRoutePage() {
  return (
    // No `measuredAt` and no `dataStatus`: the guide serves no data rows — a
    // header caption dated to the corpus wave would undercut the guide's own
    // freshness section, which states BOTH frontiers (gazette and status
    // events) with their exact dates in the text.
    <LegislationShell activeTab="ghid">
      <LegislationGuide />
    </LegislationShell>
  )
}
