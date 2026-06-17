/**
 * A tiny module-level cache of vote summaries + division numbers, keyed by
 * voteId. It exists to bridge a sync/async mismatch: the bill detail tabs read
 * `getParliamentVoteSummary(chamber, voteId)` and `getVoteDivisionNumber(voteId)`
 * synchronously during render, but live data is fetched asynchronously. The bill
 * detail query already returns full related-vote summaries (tally + division),
 * so when a bill detail (or a vote detail) is fetched we PRIME this cache; the
 * sync getters then resolve from it.
 *
 * This is not a substitute for the query cache — it only holds the few related
 * votes a detail page needs, and is harmless if a lookup misses (the getters
 * fall back to `undefined`/`1`, which the components already tolerate).
 */
import type {
  ParliamentChamber,
  ParliamentVoteSummary,
} from '@/schemas/parliament'

const summaryByVoteId = new Map<string, ParliamentVoteSummary>()
const divisionByVoteId = new Map<string, number>()

export function primeVoteSummary(
  summary: ParliamentVoteSummary,
  divisionNumber?: number,
): void {
  summaryByVoteId.set(summary.voteId, summary)
  if (typeof divisionNumber === 'number' && divisionNumber > 0) {
    divisionByVoteId.set(summary.voteId, divisionNumber)
  }
}

export function lookupVoteSummary(
  chamber: ParliamentChamber,
  voteId: string,
): ParliamentVoteSummary | undefined {
  const summary = summaryByVoteId.get(voteId)
  if (!summary) return undefined
  return summary.chamber === chamber ? summary : undefined
}

export function lookupDivisionNumber(voteId: string): number | undefined {
  return divisionByVoteId.get(voteId)
}

/** Test-only: clear the cache between cases. */
export function __resetVoteSummaryCache(): void {
  summaryByVoteId.clear()
  divisionByVoteId.clear()
}
