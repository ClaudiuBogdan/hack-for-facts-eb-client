import { Link } from '@tanstack/react-router'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import {
  getFinalBillVoteVerdict,
  isFinalBillVote,
} from '../api/graphql/parliament-mappers'
import { formatVoteDayLong, getChamberLabel } from '../lib/formatting'
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
  if (!bill.lawMilestone && !headlineVote) return null

  // A Romanian bill is voted finally in EACH chamber, so a bare "Vot final"
  // reads as "the procedure is over" — on PL-x 518/2026 it sat above a hero
  // saying "la comisii", because what had ended was the SENATE's reading and the
  // Chamber's had just begun. Naming the chamber and the verdict says what the
  // role actually claims. Both come from hard fields (the linked edge's role and
  // the vote's own chamber), never from the division tally.
  const verdict = roleFinalVote
    ? getFinalBillVoteVerdict(roleFinalVote)
    : undefined
  const voteLabel = roleFinalVote
    ? `Vot final în ${getChamberLabel(roleFinalVote.chamber)}`
    : 'Cel mai recent vot asociat'
  const voteDay = headlineVote ? formatVoteDayLong(headlineVote.heldAt) : ''
  const voteLine =
    verdict === 'adoptat'
      ? `Adoptat · ${voteDay}`
      : verdict === 'respins'
        ? `Respins · ${voteDay}`
        : voteDay

  // The other half of the confusion: a final vote is not necessarily the last
  // thing that happened. Proven from EVENT DATES alone — a step dated after the
  // vote — so it never asserts which chamber acted next, only that the timeline
  // right below carries more.
  const continuedAfterVote =
    roleFinalVote !== undefined &&
    bill.timeline.some(
      (step) =>
        step.date !== undefined &&
        step.date.slice(0, 10) > roleFinalVote.heldAt.slice(0, 10),
    )

  return (
    <div className="space-y-3">
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
                {voteLabel}
              </p>
              <p className="mt-1 truncate text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                {voteLine}
              </p>
            </div>
            <ParliamentCardChevron className="mt-1 shrink-0" />
          </Link>
        ) : null}
      </div>
      {continuedAfterVote ? (
        <p className="max-w-4xl text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Procedura a continuat după acest vot — vezi etapele de mai jos.
        </p>
      ) : null}
    </div>
  )
}
