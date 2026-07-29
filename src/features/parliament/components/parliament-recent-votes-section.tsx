import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { ParliamentHubSection } from './parliament-hub-section'
import { ParliamentHubVoteActivity } from './parliament-hub-vote-activity'
import { RecentVotesList } from './recent-votes-list'

type Props = {
  readonly votes: ReadonlyArray<ParliamentVoteSummary>
}

/**
 * Recent votes block — PNRR-style section shell.
 *
 * The card leads with WHAT was voted on, because that is what the heading
 * promises, and closes with WHEN: a year of vote volume per day, then the way
 * into the full list. The footer carries the only link to the votes page — the
 * header used to hold a "Toate voturile" link saying the same thing.
 */
export function ParliamentRecentVotesSection({ votes }: Props) {
  return (
    <ParliamentHubSection
      id="parliament-recent-votes-heading"
      title="Voturi"
      description="Ultimele rezultate din Camera Deputaților și Senat."
      bodyClassName="px-0 pb-0 pt-0"
    >
      <RecentVotesList votes={votes} />
      <div className="border-t-2 border-[var(--pnrr-border)] p-5 sm:p-6">
        <ParliamentHubVoteActivity />
      </div>
    </ParliamentHubSection>
  )
}
