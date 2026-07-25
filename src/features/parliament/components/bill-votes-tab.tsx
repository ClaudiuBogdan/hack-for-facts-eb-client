import type { ParliamentBillDetail } from '@/schemas/parliament'
import { getParliamentVoteSummary } from '../api/parliament-api'
import { VoteChamberVoteCard } from './vote-chamber-vote-card'

type Props = {
  readonly bill: ParliamentBillDetail
}

/** Voturi tab — related parliamentary divisions */
export function BillVotesTab({ bill }: Props) {
  if (bill.relatedVotes.length === 0) {
    return (
      <p className="text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        Nu există voturi asociate acestui proiect în datele curente.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-2xl">
          Voturi asociate
        </h2>
        <p className="mt-2 text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Divizările parlamentare legate de acest proiect de lege.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {bill.relatedVotes.map((vote) => {
          const summary = getParliamentVoteSummary(vote.chamber, vote.voteId)
          if (!summary) return null

          return (
            <VoteChamberVoteCard key={`${vote.chamber}-${vote.voteId}`} vote={summary} />
          )
        })}
      </div>
    </div>
  )
}
