import { Link } from '@tanstack/react-router'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { parliamentHubLinkClassName } from '../lib/hub-theme'
import { ParliamentHubSection } from './parliament-hub-section'
import { RecentVotesList } from './recent-votes-list'

type Props = {
  readonly votes: ReadonlyArray<ParliamentVoteSummary>
}

/** Recent votes block — PNRR-style section shell */
export function ParliamentRecentVotesSection({ votes }: Props) {
  return (
    <ParliamentHubSection
      id="parliament-recent-votes-heading"
      title="Voturi recente"
      description="Ultimele rezultate din Camera Deputaților și Senat."
      bodyClassName="px-0 pb-0 pt-0"
      action={
        <Link to="/parlament" search={{ tab: 'voturi' }} className={parliamentHubLinkClassName}>
          Toate voturile
        </Link>
      }
    >
      <RecentVotesList votes={votes} />
    </ParliamentHubSection>
  )
}
