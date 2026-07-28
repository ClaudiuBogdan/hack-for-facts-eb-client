import { Link } from '@tanstack/react-router'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import { isFinalBillVote } from '../api/graphql/parliament-mappers'
import { formatVoteDayLong } from '../lib/formatting'
import { ParliamentCardChevron } from './parliament-card-chevron'

/** Law + headline-vote summary (the key result), above whichever view is chosen. */
export function BillOutcomeSummary({
  bill,
}: {
  readonly bill: ParliamentBillDetail
}) {
  // Prefer a vote the SOURCE marks as final (`bill_vote_links.role`); otherwise
  // fall back to the most recent related vote and LABEL IT AS SUCH. Calling the
  // newest vote "Vot final" was a claim the data never made — an amendment or a
  // procedural division is routinely the latest one.
  const roleFinalVote = bill.relatedVotes.find(isFinalBillVote)
  const headlineVote = roleFinalVote ?? bill.relatedVotes[0]
  const isProvenFinal = roleFinalVote !== undefined
  if (!bill.lawMilestone && !headlineVote) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {bill.lawMilestone ? (
        <div className="border-2 border-[#00703c] bg-[#f3faf5] p-4 dark:bg-[var(--pnrr-bg)]">
          <p className="text-xs font-black uppercase tracking-wide text-[#00703c]">
            Promulgată ca lege
          </p>
          <p className="mt-1 text-lg font-black text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {bill.lawMilestone.actTitle ??
              `Legea nr. ${bill.lawMilestone.lawNumber}/${bill.lawMilestone.lawYear ?? ''}`}
          </p>
        </div>
      ) : null}
      {headlineVote ? (
        <Link
          to="/parlament/voturi/$chamber/$voteId"
          params={{
            chamber: headlineVote.chamber,
            voteId: headlineVote.voteId,
          }}
          className="group flex items-start justify-between gap-3 border-2 border-[#1d70b8] bg-[#f0f6fb] p-4 transition-colors hover:bg-[#e3eef8] dark:bg-[var(--pnrr-bg)]"
        >
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#1d70b8]">
              {isProvenFinal ? 'Vot final' : 'Cel mai recent vot asociat'}
            </p>
            <p className="mt-1 truncate text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {formatVoteDayLong(headlineVote.heldAt)}
            </p>
          </div>
          <ParliamentCardChevron className="mt-1 shrink-0" />
        </Link>
      ) : null}
    </div>
  )
}
