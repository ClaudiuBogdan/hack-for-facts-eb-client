import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentHub } from '../hooks/use-parliament-data'
import { ParliamentFindRepPanels } from './parliament-find-rep-panels'
import { ParliamentQuickLinksSection } from './parliament-quick-links-section'
import { ParliamentRecentVotesSection } from './parliament-recent-votes-section'
import { ParliamentResourcesSection } from './parliament-resources-section'

/** Hub overview content — quick links, resources, search row, recent votes */
export function ParliamentHubContent() {
  const { data, isLoading, isError } = useParliamentHub()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-10">
        <Skeleton className="h-64 w-full rounded-none" />
        <Skeleton className="h-48 w-full rounded-none" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-[var(--pnrr-muted)]">
        Nu am putut încărca datele parlamentare.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <ParliamentQuickLinksSection />
      <ParliamentResourcesSection />
      <ParliamentFindRepPanels />
      <ParliamentRecentVotesSection votes={data.recentVotes.slice(0, 5)} />
    </div>
  )
}
