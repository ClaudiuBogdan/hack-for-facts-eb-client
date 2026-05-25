import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentHub } from '../hooks/use-parliament-data'
import { ParliamentHubBillsSection } from './parliament-hub-bills-section'
import { ParliamentHubParlamentariSection } from './parliament-hub-parlamentari-section'
import { ParliamentHubResourcesSection } from './parliament-hub-resources-section'
import { ParliamentRecentVotesSection } from './parliament-recent-votes-section'

/** Hub overview — resource links, recent votes, bills, and parliamentary composition */
export function ParliamentHubContent() {
  const { data, isLoading, isError } = useParliamentHub()

  return (
    <div className="flex flex-col gap-10">
      <ParliamentHubResourcesSection />

      {isLoading ? (
        <>
          <Skeleton className="h-72 w-full rounded-none" />
          <Skeleton className="h-96 w-full rounded-none" />
          <Skeleton className="h-[32rem] w-full rounded-none" />
        </>
      ) : isError || !data ? (
        <p className="text-[var(--pnrr-muted)]">
          Nu am putut încărca datele parlamentare.
        </p>
      ) : (
        <>
          <ParliamentRecentVotesSection votes={data.recentVotes.slice(0, 5)} />
          <ParliamentHubBillsSection legislatureLabel={data.legislature.label} />
          <ParliamentHubParlamentariSection
            groups={data.groups}
            memberCountByChamber={data.memberCountByChamber}
          />
        </>
      )}
    </div>
  )
}
