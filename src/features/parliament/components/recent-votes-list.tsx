import { Link } from '@tanstack/react-router'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import {
  formatVoteDate,
  getChamberShortLabel,
  getOutcomeLabel,
} from '../lib/formatting'

type Props = {
  readonly votes: ReadonlyArray<ParliamentVoteSummary>
}

/** Vote list — PNRR-style row dividers */
export function RecentVotesList({ votes }: Props) {
  if (votes.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-[var(--pnrr-muted)] sm:px-6">
        Nu există voturi recente.
      </p>
    )
  }

  return (
    <div className="divide-y divide-[var(--pnrr-border)]/20">
      {votes.map((vote) => (
        <Link
          key={vote.voteId}
          to="/parlament/voturi/$chamber/$voteId"
          params={{ chamber: vote.chamber, voteId: vote.voteId }}
          className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-snug text-[var(--pnrr-fg)] hover:underline">
              {vote.title}
            </p>
            <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
              {formatVoteDate(vote.heldAt)} · {getChamberShortLabel(vote.chamber)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-[var(--pnrr-fg)]">
            {getOutcomeLabel(vote.outcome)}
          </p>
        </Link>
      ))}
    </div>
  )
}
