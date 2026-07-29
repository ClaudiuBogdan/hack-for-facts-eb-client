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

      {/* Fetches its own votes, so it stands whether or not the hub aggregate
          answered — the chambers' latest divisions are not hostage to the
          composition query that follows. */}
      <ParliamentHubVotesSection />

      {/* One skeleton per section still waiting on the hub aggregate: bills and
          the composition. */}
      {isLoading ? (
        <>
          <Skeleton className="h-96 w-full rounded-none" />
          <Skeleton className="h-[32rem] w-full rounded-none" />
        </>
      ) : isError || !data ? (
        <p className="text-[var(--pnrr-muted)]">
          Nu am putut încărca datele parlamentare.
        </p>
      ) : (
        <>
          <ParliamentHubBillsSection />
          <ParliamentHubParlamentariSection
            groups={data.groups}
            memberCountByChamber={data.memberCountByChamber}
            memberCountByChamberAllMandates={data.memberCountByChamberAllMandates}
          />
        </>
      )}
    </div>
  )
}
