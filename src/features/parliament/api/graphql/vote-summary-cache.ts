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

/**
 * Most entries one map keeps; past it the oldest go first. A tab that walks
 * through many bills and votes would otherwise grow these maps for as long as
 * it stays open.
 */
const MAX_ENTRIES = 5_000

/**
 * Filled in the browser only. The getters bridge a browser render to the
 * query cache; on the server a module-level map is shared by every request and
 * lives as long as the process, and since the hub's votes are now read for the
 * first render, every listed vote would accumulate there with no expiry. No
 * server render reads these getters.
 */
const IS_SERVER = typeof window === 'undefined'

const summaryByVoteId = new Map<string, ParliamentVoteSummary>()
const divisionByVoteId = new Map<string, number>()
/**
 * memberId (mandateKey) → constituency (județ), primed from a vote's ballots —
 * the only place the resolved member's constituency is surfaced flat next to its
 * mandate_key. The vote-detail județ column reads it via `getMemberJudetMap()`.
 */
const judetByMemberId = new Map<string, string>()

/** Set, keeping the most recent entries (a Map iterates oldest first). */
function remember<V>(map: Map<string, V>, key: string, value: V): void {
  map.delete(key)
  map.set(key, value)
  while (map.size > MAX_ENTRIES) {
    const oldest = map.keys().next()
    if (oldest.done) break
    map.delete(oldest.value)
  }
}

export function primeVoteSummary(
  summary: ParliamentVoteSummary,
  divisionNumber?: number,
): void {
  if (IS_SERVER) return
  remember(summaryByVoteId, summary.voteId, summary)
  if (typeof divisionNumber === 'number' && divisionNumber > 0) {
    remember(divisionByVoteId, summary.voteId, divisionNumber)
  }
}

export function primeMemberJudet(
  memberId: string,
  constituency: string | null | undefined,
): void {
  if (IS_SERVER) return
  const c = constituency?.trim()
  if (memberId && c) remember(judetByMemberId, memberId, c)
}

export function getMemberJudetCache(): Readonly<Record<string, string>> {
  return Object.fromEntries(judetByMemberId)
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
  judetByMemberId.clear()
}
