import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentMember } from '@/schemas/parliament'
import { useParliamentMemberVotingHistory } from '../hooks/use-parliament-data'
import { formatMemberName, getChamberLabel } from '../lib/formatting'
import {
  memberDetailNoticeClassName,
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'
import { MemberVoteRecordCard } from './member-vote-record-card'

type Props = {
  readonly member: ParliamentMember
}

/** Voting history tab inside the member shell — cursor-paged (load more). */
export function MemberVotingTab({ member }: Props) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useParliamentMemberVotingHistory(member.memberId)
  const memberName = formatMemberName(member.firstName, member.lastName)

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-none" />
  }

  const pages = data?.pages ?? []
  const votes = pages.flatMap((page) => page?.votes ?? [])
  const total = pages[0]?.total ?? votes.length

  return (
    <div className="space-y-8">
      <div>
        <h2 className={memberDetailSectionTitleClassName}>Istoric voturi</h2>
        <p className={memberDetailSectionIntroClassName}>
          Voturile publicate pentru {memberName} sunt afișate mai jos. Puteți
          consulta și lista completă de voturi din{' '}
          <Link
            to="/parlament"
            search={{ tab: 'voturi', chamber: member.chamber }}
            className="font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)]"
          >
            {getChamberLabel(member.chamber)}
          </Link>
          .
        </p>
      </div>

      <aside className={memberDetailNoticeClassName}>
        <p>
          Alegerea individuală a parlamentarului este afișată alături de
          rezultatul general al divizării. Faceți clic pe un vot pentru detalii
          complete.
        </p>
      </aside>

      {votes.length > 0 ? (
        <div className="space-y-4">
          <p className="border border-[#b1b4b6] bg-[#f3f2f1] px-5 py-3 text-sm text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)]">
            Afișate <span className="font-bold">{votes.length}</span> din{' '}
            <span className="font-bold">{total}</span> voturi
          </p>
          {votes.map((vote) => (
            <MemberVoteRecordCard
              key={vote.voteId}
              voteId={vote.voteId}
              chamber={vote.chamber}
              title={vote.title}
              heldAt={vote.heldAt}
              choice={vote.choice}
              divisionNumber={vote.divisionNumber}
              tally={vote.tally}
            />
          ))}
          {hasNextPage ? (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-2 px-6"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? 'Se încarcă…' : 'Încarcă mai multe voturi'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există înregistrări de vot publicate pentru acest parlamentar.
        </p>
      )}
    </div>
  )
}
