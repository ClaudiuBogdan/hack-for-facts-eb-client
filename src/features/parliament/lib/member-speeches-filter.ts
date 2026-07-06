/**
 * Build the GraphQL `ParliamentMemberSpeechesFilter` input from the member
 * interventii-tab search params. Pure (params in, filter object out) so it is
 * unit-testable without a network, mirroring `buildMemberVotesFilter`.
 *
 * The same filter drives two server fields:
 *   - `speechesConnection(filter:)` — the paged list (full filter, incl. range).
 *   - `speechActivity(filter:)`     — the heatmap aggregate, which REJECTS
 *     `spokenAt` (the `year` argument bounds the range). Pass `stripDate: true`.
 *
 * Free-text `q` travels SEPARATELY as a GraphQL arg (not a filter field); it is
 * carried in the search params but never assembled into this object.
 */
import type {
  MemberSpeechesSearch,
  ParliamentChamber,
} from '@/schemas/parliament'

/** GraphQL filter-input shape (chamber `eq` is a String scalar). */
export interface MemberSpeechesFilterInput {
  spokenAt?: { gte?: string; lte?: string }
  chamber?: { eq: string }
}

/** A spoken-date bound in `YYYY-MM-DD` (the GraphQL `Date` scalar form). */
function toDateBound(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const day = trimmed.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

/**
 * Map the UI `session` facet to a GraphQL chamber token:
 *   - `proprie` → the member's own chamber (`camera`→`camera_deputatilor`);
 *   - `comun`   → joint sittings (`comun`).
 */
function sessionChamber(
  session: 'proprie' | 'comun',
  memberChamber: ParliamentChamber,
): string {
  if (session === 'comun') return 'comun'
  return memberChamber === 'camera' ? 'camera_deputatilor' : 'senat'
}

/**
 * Build the filter object, or `undefined` when no facet is active (so callers
 * omit the `$filter` variable entirely). With `stripDate`, the date range is
 * dropped — the shape the `speechActivity` field accepts.
 */
export function buildMemberSpeechesFilter(
  search: MemberSpeechesSearch,
  memberChamber: ParliamentChamber,
  options: { stripDate?: boolean } = {},
): MemberSpeechesFilterInput | undefined {
  const filter: MemberSpeechesFilterInput = {}

  if (search.session) {
    filter.chamber = { eq: sessionChamber(search.session, memberChamber) }
  }

  if (!options.stripDate) {
    const gte = toDateBound(search.from)
    const lte = toDateBound(search.to)
    if (gte || lte) {
      filter.spokenAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) }
    }
  }

  return Object.keys(filter).length > 0 ? filter : undefined
}

/** The normalized free-text query, or `undefined` when blank. */
export function getMemberSpeechQ(
  search: MemberSpeechesSearch,
): string | undefined {
  const q = search.q?.trim()
  return q ? q : undefined
}

/**
 * Count the active FILTER facets (date range, session, free-text q). The heatmap
 * year (`an`) is navigation, not a filter, so it never counts. Drives the
 * trigger badge + the active-count line.
 */
export function countActiveMemberSpeechFilters(
  search: MemberSpeechesSearch,
): number {
  let count = 0
  if (search.from || search.to) count += 1
  if (search.session) count += 1
  if (getMemberSpeechQ(search)) count += 1
  return count
}
