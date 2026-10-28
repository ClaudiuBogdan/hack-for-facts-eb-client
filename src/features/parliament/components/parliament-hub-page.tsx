import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentHub } from '../hooks/use-parliament-data'
import { ParliamentHubAgendaSection } from './parliament-hub-agenda-section'
import { ParliamentHubBillsSection } from './parliament-hub-bills-section'
import { ParliamentHubParlamentariSection } from './parliament-hub-parlamentari-section'
import { ParliamentHubResourcesSection } from './parliament-hub-resources-section'
import { ParliamentHubVotesSection } from './parliament-hub-votes-section'

/** Hub overview — resource links, recent votes, bills, and parliamentary composition */
export function ParliamentHubContent() {
  const { data, isLoading, isError } = useParliamentHub()

  return (
    <div className="flex flex-col gap-10">
      <ParliamentHubResourcesSection />

      <ParliamentHubAgendaSection />

      {/* The votes and the bills fetch their own reads, so they stand whether
          or not the hub aggregate answered — neither is hostage to the
          composition query that follows. */}
      <ParliamentHubVotesSection />

      <ParliamentHubBillsSection />

      {isLoading ? (
        <Skeleton className="h-[32rem] w-full rounded-none" />
      ) : isError || !data ? (
        <p className="text-[var(--pnrr-muted)]">
          Nu am putut încărca datele parlamentare.
        </p>
      ) : (
        <ParliamentHubParlamentariSection
          groups={data.groups}
          memberCountByChamber={data.memberCountByChamber}
          memberCountByChamberAllMandates={data.memberCountByChamberAllMandates}
        />
      )}
    </div>
  )
}
