/**
 * Build the GraphQL `ParliamentMemberVotesFilter` input from the member
 * voting-tab search params. Pure (params in, filter object out) so it is
 * unit-testable without a network, mirroring the `buildVotesFilter` convention.
 *
 * The same filter drives two server fields:
 *   - `votes(filter:)`        — the paged list (full filter, incl. date range).
 *   - `voteActivity(filter:)` — the heatmap aggregate, which REJECTS `voteDate`
 *     (the `year` argument bounds the range). Pass `stripDate: true` there.
 */
import type {
  MemberVoteChoice,
  MemberVotesSearch,
  ParliamentChamber,
} from '@/schemas/parliament'

/** GraphQL filter-input shape (all `eq`/`in` fields are String scalars). */
export interface MemberVotesFilterInput {
  voteDate?: { gte?: string; lte?: string }
  chamber?: { eq: string }
  outcome?: { eq: string }
  choice?: { in: string[] }
}

const MEMBER_VOTE_CHOICES = [
  'pentru',
  'impotriva',
  'abtinere',
  'nu_a_votat',
] as const

/** A vote-date bound in `YYYY-MM-DD` (the GraphQL `Date` scalar form). */
function toDateBound(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const day = trimmed.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

/** Keep only recognised choice tokens; drops junk from a hand-edited URL. */
function normalizeChoices(value: string | string[] | undefined): string[] {
  if (!value) return []
  const raw = Array.isArray(value) ? value : [value]
  return raw.filter((c): c is (typeof MEMBER_VOTE_CHOICES)[number] =>
    (MEMBER_VOTE_CHOICES as readonly string[]).includes(c),
  )
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
 * dropped — the shape the `voteActivity` field accepts.
 */
export function buildMemberVotesFilter(
  search: MemberVotesSearch,
  memberChamber: ParliamentChamber,
  options: { stripDate?: boolean } = {},
): MemberVotesFilterInput | undefined {
  const filter: MemberVotesFilterInput = {}

  const choices = normalizeChoices(search.choice)
  if (choices.length > 0) filter.choice = { in: choices }

  if (search.outcome) filter.outcome = { eq: search.outcome }

  if (search.session) {
    filter.chamber = { eq: sessionChamber(search.session, memberChamber) }
  }

  if (!options.stripDate) {
    const gte = toDateBound(search.from)
    const lte = toDateBound(search.to)
    if (gte || lte) {
      filter.voteDate = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) }
    }
  }

  return Object.keys(filter).length > 0 ? filter : undefined
}

/** The recognised choice tokens selected in the search (for chips + toggles). */
export function getMemberVoteChoiceValues(
  search: MemberVotesSearch,
): MemberVoteChoice[] {
  return normalizeChoices(search.choice) as MemberVoteChoice[]
}

/**
 * Count the active FILTER facets (date range, choice, outcome, session). The
 * heatmap year (`an`) is navigation, not a filter, so it never counts. Drives
 * the trigger badge + "active count" line.
 */
export function countActiveMemberVoteFilters(search: MemberVotesSearch): number {
  let count = 0
  if (search.from || search.to) count += 1
  if (getMemberVoteChoiceValues(search).length > 0) count += 1
  if (search.outcome) count += 1
  if (search.session) count += 1
  return count
}
