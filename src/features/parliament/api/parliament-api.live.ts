/**
 * Live parliament data via the redesign GraphQL API. Mirrors the companies
 * pilot: every request goes through the shared `graphqlQuery` transport, raw
 * responses are Zod-parsed, then mapped onto the UI's `Parliament*` types.
 *
 * The live surface is narrower than the mock fixtures (no group colour, no
 * member contact/photo, no bill-type column, no member election results). The
 * mappers derive what they can and default the rest; this module wires the
 * queries, resolves slug filters to DB values, and assembles the list/detail
 * shapes the facade exposes. Fields with no live backing are documented as
 * server gaps in the team report, not silently faked.
 */
import {
  ParliamentChamberCompositionSchema,
  ParliamentHubDataSchema,
  type ParliamentBillDetail,
  type ParliamentBillList,
  type ParliamentBillRelatedVote,
  type ParliamentBillsSearch,
  type ParliamentChamber,
  type ParliamentGroupCohesion,
  type VoteKind,
  type ParliamentChamberComposition,
  type ParliamentCommittee,
  type ParliamentCommitteeDetail,
  type ParliamentDataFreshness,
  type ParliamentGroup,
  type ParliamentHubData,
  type ParliamentMember,
  type ParliamentMemberProfile,
  type ParliamentMemberInitiativesList,
  type ParliamentMemberVoteActivity,
  type ParliamentMemberVotingHistory,
  type ParliamentMemberSpeechesHistory,
  type ParliamentMemberSpeechActivity,
  type ParliamentMembersList,
  type ParliamentMembersSearch,
  type ParliamentBillActivity,
  type ParliamentVoteActivity,
  type ParliamentVoteDetail,
  type ParliamentVotesList,
  type ParliamentVotesSearch,
  type VoteChamber,
} from '@/schemas/parliament'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PARLIAMENT_BILL_QUERY,
  PARLIAMENT_BILLS_QUERY,
  PARLIAMENT_COMMITTEE_QUERY,
  PARLIAMENT_COMMITTEES_QUERY,
  PARLIAMENT_FRESHNESS_QUERY,
  PARLIAMENT_GROUP_MEMBERS_QUERY,
  PARLIAMENT_GROUPS_QUERY,
  PARLIAMENT_MEMBER_INITIATIVES_QUERY,
  PARLIAMENT_MEMBER_PROFILE_QUERY,
  PARLIAMENT_MEMBER_QUERY,
  PARLIAMENT_MEMBER_VOTE_ACTIVITY_QUERY,
  PARLIAMENT_MEMBER_VOTES_QUERY,
  PARLIAMENT_MEMBER_SPEECHES_QUERY,
  PARLIAMENT_MEMBER_SPEECH_ACTIVITY_QUERY,
  PARLIAMENT_MEMBERS_QUERY,
  PARLIAMENT_RESOLVE_QUERY,
  PARLIAMENT_BILL_ACTIVITY_QUERY,
  PARLIAMENT_VOTE_ACTIVITY_QUERY,
  PARLIAMENT_VOTE_BALLOTS_QUERY,
  PARLIAMENT_VOTE_QUERY,
  PARLIAMENT_VOTES_QUERY,
  parliamentBillResponseSchema,
  parliamentBillsResponseSchema,
  parliamentCommitteeResponseSchema,
  parliamentCommitteesResponseSchema,
  parliamentFreshnessResponseSchema,
  parliamentGroupMembersResponseSchema,
  parliamentGroupsResponseSchema,
  parliamentVoteCohesionResponseSchema,
  parliamentVoteKindCountsResponseSchema,
  PARLIAMENT_VOTE_KIND_COUNTS_QUERY,
  PARLIAMENT_VOTE_COHESION_QUERY,
  parliamentMemberInitiativesResponseSchema,
  parliamentMemberProfileResponseSchema,
  parliamentMemberResponseSchema,
  parliamentMemberVoteActivityResponseSchema,
  parliamentBillActivityResponseSchema,
  parliamentVoteActivityResponseSchema,
  parliamentMemberVotesResponseSchema,
  parliamentMemberSpeechesResponseSchema,
  parliamentMemberSpeechActivityResponseSchema,
  parliamentMembersResponseSchema,
  parliamentResolveResponseSchema,
  parliamentVoteBallotsResponseSchema,
  parliamentVoteResponseSchema,
  parliamentVotesResponseSchema,
} from './graphql/parliament-queries'
import {
  mapBillDetail,
  mapBillRelatedVotes,
  mapBillSummary,
  mapCommittee,
  mapCommitteeDetail,
  mapDataFreshness,
  mapGroup,
  mapGroupCohesion,
  mapMember,
  mapMemberInitiatives,
  mapMemberProfile,
  mapMemberVoteActivity,
  mapParliamentBillActivity,
  mapParliamentVoteActivity,
  mapMemberVotingHistory,
  mapMemberSpeeches,
  mapMemberSpeechActivity,
  mapVoteDetail,
  mapVoteListItem,
} from './graphql/parliament-mappers'
import type { MemberVotesFilterInput } from '../lib/member-votes-filter'
import type { MemberSpeechesFilterInput } from '../lib/member-speeches-filter'
import {
  buildBillsFilter,
  buildBillsSort,
  buildMembersFilter,
  buildVotesFilter,
  type ParliamentBillsFilterInput,
  type ParliamentVotesFilterInput,
} from './graphql/parliament-filters'
import {
  LATEST_LEGISLATURE,
  toGraphqlChamber,
  toGraphqlVoteChamber,
} from './graphql/parliament-translate'
import { resolveGroupColor } from '../lib/group-colors'
import { toVoteSortArgs, type VotesListScope } from '../lib/votes-filter-state'

const DEFAULT_MEMBERS_PAGE_SIZE = 20
const DEFAULT_VOTES_PAGE_SIZE = 10
const DEFAULT_BILLS_PAGE_SIZE = 10
/**
 * Measured 2026-07-30 maximum: 447 public ballots on a single vote.
 */
const BALLOTS_PAGE_SIZE = 500
/** Defensive client ceiling while retaining one fallback page for future growth. */
const MAX_BALLOTS = BALLOTS_PAGE_SIZE * 2

// ── groups ──────────────────────────────────────────────────────────────────

// Two caches: all-mandates (default, for the directory/filters) and current-only
// (for the hub composition + roster — SC-1 current-seat counts).
let groupsCache: Promise<ParliamentGroup[]> | null = null
let currentGroupsCache: Promise<ParliamentGroup[]> | null = null

async function loadGroupsForChamber(
  chamber: 'camera_deputatilor' | 'senat',
  current?: boolean,
): Promise<ParliamentGroup[]> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_GROUPS_QUERY,
    { legislature: LATEST_LEGISLATURE, chamber, ...(current ? { current: true } : {}) },
    { operationName: 'parliamentGroups' },
  )
  return parliamentGroupsResponseSchema.parse(data).parliamentGroups.map(mapGroup)
}

/**
 * Load all groups for the latest legislature, fetching BOTH chambers explicitly
 * and merging. The no-chamber `parliamentGroups` endpoint returns a
 * chamber-AGNOSTIC party aggregate (groupId = bare name, chamber = '',
 * memberCount = both chambers combined) — feeding that to the UI yields wrong
 * per-chamber groupIds, an all-`camera` chamber label, and a broken hub split
 * (camera:472, senat:0). The chamber-scoped call returns the correct
 * `<slug>-<chamber>` ids + per-chamber counts, so we always use it.
 *
 * `current` = true filters to CURRENT seats (SC-1): AUR shows 90 not 91, and the
 * per-chamber counts are 330/134 not 335/137. Use it ONLY for composition/roster
 * surfaces — never for attribution/voting-history (those keep all mandate rows).
 */
async function loadAllGroups(current?: boolean): Promise<ParliamentGroup[]> {
  const cacheRef = current ? currentGroupsCache : groupsCache
  if (!cacheRef) {
    const built = (async () => {
      const [camera, senat] = await Promise.all([
        loadGroupsForChamber('camera_deputatilor', current),
        loadGroupsForChamber('senat', current),
      ])
      return [...camera, ...senat]
    })().catch((error) => {
      if (current) currentGroupsCache = null
      else groupsCache = null
      throw error
    })
    if (current) currentGroupsCache = built
    else groupsCache = built
    return built
  }
  return cacheRef
}

export async function fetchParliamentGroupsLive(
  chamber?: 'camera' | 'senat',
): Promise<ParliamentGroup[]> {
  const groups = await loadAllGroups()
  return chamber ? groups.filter((g) => g.chamber === chamber) : groups
}

export async function fetchParliamentGroupLive(
  groupId: string,
): Promise<ParliamentGroup | null> {
  const groups = await loadAllGroups()
  return groups.find((g) => g.groupId === groupId) ?? null
}

/**
 * Resolve a chamber-scoped groupId (`psd-senat`) to its display name + chamber.
 * The server `group` filter matches `group_name` (chamber-agnostic), so the
 * chamber must be carried separately to avoid leaking the other chamber's
 * members of the same party.
 */
async function groupById(
  groupId: string,
): Promise<{ name: string; chamber: 'camera' | 'senat' } | null> {
  const groups = await loadAllGroups()
  const group = groups.find((g) => g.groupId === groupId)
  return group ? { name: group.name, chamber: group.chamber } : null
}

// ── resolve helpers (slug → DB value) ───────────────────────────────────────

async function resolveConstituency(slug: string): Promise<string | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_RESOLVE_QUERY,
    { dim: 'constituency', q: slug, legislature: LATEST_LEGISLATURE },
    { operationName: 'parliamentResolveConstituency' },
  )
  const parsed = parliamentResolveResponseSchema.parse(data)
  return parsed.parliamentResolveFilter[0]?.value ?? null
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean)
}

// ── members ───────────────────────────────────────────────────────────────

async function resolveMemberFilterValues(search: ParliamentMembersSearch): Promise<{
  groupNames: string[]
  constituencyNames: string[]
  /** Chamber implied by the selected group(s) when they all share one. */
  groupChamber?: 'camera' | 'senat'
}> {
  const groupIds = toArray(search.grup)
  const judetSlugs = toArray(search.judet)

  const groupHits = (
    await Promise.all(groupIds.map((id) => groupById(id)))
  ).filter((g): g is { name: string; chamber: 'camera' | 'senat' } => Boolean(g))
  const groupNames = groupHits.map((g) => g.name)

  // If every selected group is in the same chamber, that chamber bounds the
  // result — otherwise the party name alone leaks the other chamber's members.
  const chambers = new Set(groupHits.map((g) => g.chamber))
  const groupChamber = chambers.size === 1 ? [...chambers][0] : undefined

  const constituencyNames = (
    await Promise.all(judetSlugs.map((slug) => resolveConstituency(slug)))
  ).filter((n): n is string => Boolean(n))

  return { groupNames, constituencyNames, groupChamber }
}

export async function fetchParliamentMembersLive(
  search: ParliamentMembersSearch = {},
): Promise<ParliamentMembersList> {
  const resolved = await resolveMemberFilterValues(search)
  // An explicit chamber toggle wins; otherwise fall back to the group's chamber.
  // `comun` counts as "no toggle" — it is a votes-tab value on the shared
  // search object and buildMembersFilter drops it.
  const effectiveSearch =
    search.chamber === 'camera' || search.chamber === 'senat'
      ? search
      : resolved.groupChamber
        ? { ...search, chamber: resolved.groupChamber }
        : search
  const filter = buildMembersFilter(effectiveSearch, {
    legislature: LATEST_LEGISLATURE,
    groupNames: resolved.groupNames,
    constituencyNames: resolved.constituencyNames,
  })

  const pageSize = search.pageSize ?? DEFAULT_MEMBERS_PAGE_SIZE
  const page = Math.max(1, search.page ?? 1)

  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBERS_QUERY,
    { filter, page, pageSize },
    { operationName: 'parliamentMembers' },
  )
  const parsed = parliamentMembersResponseSchema.parse(data)
  const { total, members } = parsed.parliamentMembers
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    members: members
      .map(mapMember)
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'ro')),
    total,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
  }
}

export async function fetchParliamentMemberLive(
  memberId: string,
): Promise<ParliamentMember | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_QUERY,
    { mandateKey: memberId },
    { operationName: 'parliamentMember' },
  )
  const parsed = parliamentMemberResponseSchema.parse(data)
  return parsed.parliamentMember ? mapMember(parsed.parliamentMember) : null
}

export async function fetchParliamentGroupMembersLive(
  groupId: string,
): Promise<ParliamentMember[]> {
  // Group-detail roster is a CURRENT-seat surface (SC-1: current:true) — it shows
  // the party's CURRENT members (AUR → 90, superseded/deceased excluded), so the
  // roster count matches the composition swatch. Their votes/career are unaffected
  // (those live on member-detail/voting-history, which never pass current).
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_GROUP_MEMBERS_QUERY,
    { groupId, legislature: LATEST_LEGISLATURE, current: true },
    { operationName: 'parliamentGroupMembers' },
  )
  const parsed = parliamentGroupMembersResponseSchema.parse(data)
  return parsed.parliamentGroupMembers
    .map(mapMember)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'ro'))
}

/**
 * Chamber-wide vote cohesion for a bounded window.
 *
 * Asks for the WHOLE chamber, not one group: the dossier ranks its group among
 * its peers, and a single row cannot supply a rank. `from`/`to` must already be
 * inside the server's 500-vote cap — `cohesionWindow` picks them.
 */
export async function fetchParliamentGroupCohesionLive(
  chamber: VoteChamber,
  window: { from: string; to: string },
): Promise<ParliamentGroupCohesion[]> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_VOTE_COHESION_QUERY,
    { chamber: toGraphqlVoteChamber(chamber), from: window.from, to: window.to },
    { operationName: 'parliamentVoteCohesion' },
  )
  return parliamentVoteCohesionResponseSchema
    .parse(data)
    .parliamentVoteCohesion.map(mapGroupCohesion)
}

// ── hub ─────────────────────────────────────────────────────────────────────

/** Sum a group list into per-chamber counts (explicit, no else catch-all). */
function sumByChamber(
  groups: readonly ParliamentGroup[],
): { camera: number; senat: number } {
  return groups.reduce(
    (acc, g) => {
      if (g.chamber === 'camera') acc.camera += g.memberCount
      else if (g.chamber === 'senat') acc.senat += g.memberCount
      return acc
    },
    { camera: 0, senat: 0 },
  )
}

export async function fetchParliamentHubLive(): Promise<ParliamentHubData> {
  // Composition + headline = CURRENT seats (SC-1). Secondary = all mandates.
  const [currentGroups, allGroups, recent, freshness] = await Promise.all([
    loadAllGroups(true),
    loadAllGroups(),
    fetchParliamentVotesLive({ pageSize: 6 }),
    // REAL sync time. This used to be `new Date().toISOString()` — the shell then
    // rendered "Actualizat <now>" on every page load, i.e. it presented REQUEST
    // time as DATA time, which is always "just now" and therefore always wrong.
    fetchParliamentFreshnessLive(),
  ])

  return ParliamentHubDataSchema.parse({
    legislature: {
      id: LATEST_LEGISLATURE,
      label: `Legislatura ${LATEST_LEGISLATURE}`,
      startYear: Number(LATEST_LEGISLATURE),
      endYear: Number(LATEST_LEGISLATURE) + 4,
    },
    // Omitted (→ the UI drops the line) when the API has no freshness signal.
    ...(freshness.lastLoadedAt !== undefined && { lastSyncedAt: freshness.lastLoadedAt }),
    sources: ['cdep.ro', 'senat.ro'],
    // Composition swatches reflect CURRENT seats (AUR 90, not 91).
    groups: currentGroups,
    recentVotes: recent.votes,
    memberCountByChamber: sumByChamber(currentGroups), // 330 / 134 (current)
    memberCountByChamberAllMandates: sumByChamber(allGroups), // 335 / 137 (all)
    budgetInstitutionSlugs: {
      camera: 'camera-deputatilor',
      senat: 'senatul-romaniei',
    },
  })
}

// ── chamber composition ─────────────────────────────────────────────────────

export async function fetchParliamentChamberCompositionLive(
  chamber: ParliamentChamber,
  search: ParliamentMembersSearch = {},
): Promise<ParliamentChamberComposition> {
  const { buildChamberComposition } = await import('../lib/chamber-composition')
  // Composition is a CURRENT-seat surface (SC-1): current groups give the right
  // seat totals (330/134, not 335/137) and the current roster fills the seats
  // (superseded members don't occupy a seat). The hemicycle needs the full
  // CURRENT roster so non-matching seats render greyed — `buildChamberComposition`
  // applies the search itself (via `isActive`).
  const [groups, currentMembers] = await Promise.all([
    loadAllGroups(true),
    fetchCurrentMembersForComposition(),
  ])
  const colorMap = Object.fromEntries(
    groups.map((g) => [g.groupId, g.color ?? resolveGroupColor({ groupId: g.groupId, name: g.name })]),
  )
  return ParliamentChamberCompositionSchema.parse(
    buildChamberComposition(chamber, groups, currentMembers, colorMap, search),
  )
}

/**
 * Current-only member roster for the hemicycle composition (SC-1: current:true).
 * Separate from `fetchParliamentMembersLive` (the directory, which shows ALL
 * mandate rows) so the hard rule holds — current:true is composition-only.
 */
async function fetchCurrentMembersForComposition(): Promise<ParliamentMember[]> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBERS_QUERY,
    {
      filter: { legislature: { eq: LATEST_LEGISLATURE }, current: { eq: true } },
      page: 1,
      pageSize: 500,
    },
    { operationName: 'parliamentMembersCurrent' },
  )
  const parsed = parliamentMembersResponseSchema.parse(data)
  return parsed.parliamentMembers.members
    .map(mapMember)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'ro'))
}

// ── votes ─────────────────────────────────────────────────────────────────

export async function fetchParliamentVotesLive(
  search: ParliamentVotesSearch = {},
  after?: string,
): Promise<ParliamentVotesList> {
  const filter = buildVotesFilter(search)
  const pageSize = search.pageSize ?? DEFAULT_VOTES_PAGE_SIZE

  const data = await graphqlQuery<unknown>(
    PARLIAMENT_VOTES_QUERY,
    // `sort` and `dir` are both part of the CURSOR identity server-side, so
    // they must be re-sent unchanged on every page — a cursor minted under one
    // ordering is refused under another rather than paging the wrong way.
    { filter, ...toVoteSortArgs(search.ordine), first: pageSize, ...(after ? { after } : {}) },
    { operationName: 'parliamentVotes' },
  )
  const parsed = parliamentVotesResponseSchema.parse(data)
  const votes = parsed.parliamentVotes.edges.map((e) => mapVoteListItem(e.node))
  const { hasNextPage, endCursor } = parsed.parliamentVotes.pageInfo

  // Cursor state straight through, and the SERVER's own total — still no
  // invented page count, because `parliamentVotes` is keyset-paginated and
  // reports none. `total` is capped at 10,000; `totalEstimated` says when the
  // cap bit, so the UI can say "peste 10.000" instead of printing a number the
  // source did not actually reach.
  const { total, totalEstimated } = parsed.parliamentVotes
  return {
    votes,
    pageSize,
    hasNextPage,
    ...(endCursor ? { endCursor } : {}),
    ...(typeof total === 'number' ? { total } : {}),
    ...(typeof totalEstimated === 'boolean' ? { totalEstimated } : {}),
  }
}

/**
 * Per-kind vote counts for one list scope, in a single aliased request.
 *
 * Returned even when zero: a bucket the scope genuinely never uses (the
 * Senate has no amendment or attendance votes) must be VISIBLE as empty in the
 * filter, not quietly missing. `all` omits the chamber variable — the aliased
 * counts then describe the whole corpus, which is what the mixed list shows.
 */
export async function fetchParliamentVoteKindCountsLive(
  scope: VotesListScope,
): Promise<Record<VoteKind, number>> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_VOTE_KIND_COUNTS_QUERY,
    scope === 'all' ? {} : { chamber: { eq: toGraphqlVoteChamber(scope) } },
    { operationName: 'parliamentVoteKindCounts' },
  )
  const parsed = parliamentVoteKindCountsResponseSchema.parse(data)
  return {
    legislative: parsed.legislative.total ?? 0,
    amendment: parsed.amendment.total ?? 0,
    procedural: parsed.procedural.total ?? 0,
    chamber_decision: parsed.chamber_decision.total ?? 0,
    attendance: parsed.attendance.total ?? 0,
    unclassified: parsed.unclassified.total ?? 0,
  }
}

export async function fetchParliamentVoteDetailLive(
  chamber: ParliamentChamber,
  voteId: string,
): Promise<ParliamentVoteDetail | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_VOTE_QUERY,
    { voteKey: voteId, ballotsFirst: BALLOTS_PAGE_SIZE },
    { auth: 'none', operationName: 'parliamentVote' },
  )
  const parsed = parliamentVoteResponseSchema.parse(data)
  if (!parsed.parliamentVote) return null

  // Every current vote fits in one measured 500-row page. Keep the cursor
  // fallback for future larger votes so the member list is never silently
  // truncated.
  const vote = parsed.parliamentVote
  const allBallotEdges = [...vote.ballots.edges]
  let pageInfo = vote.ballots.pageInfo
  while (pageInfo.hasNextPage && pageInfo.endCursor && allBallotEdges.length < MAX_BALLOTS) {
    const moreData = await graphqlQuery<unknown>(
      PARLIAMENT_VOTE_BALLOTS_QUERY,
      { voteKey: voteId, first: BALLOTS_PAGE_SIZE, after: pageInfo.endCursor },
      { auth: 'none', operationName: 'parliamentVoteBallots' },
    )
    const moreParsed = parliamentVoteBallotsResponseSchema.parse(moreData)
    if (!moreParsed.parliamentVote) break
    allBallotEdges.push(...moreParsed.parliamentVote.ballots.edges)
    pageInfo = moreParsed.parliamentVote.ballots.pageInfo
  }

  // The route addresses votes by chamber, but a voteKey is globally unique and
  // `comun` (joint) votes collapse to `camera` in the UI — so the mapped
  // detail's chamber is authoritative; the route param is for routing only.
  void chamber
  return mapVoteDetail({
    ...vote,
    ballots: { edges: allBallotEdges, pageInfo },
  })
}

const MEMBER_VOTES_PAGE_SIZE = 50

export async function fetchParliamentMemberVotingHistoryLive(
  memberId: string,
  after?: string,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVotingHistory | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_VOTES_QUERY,
    // NOTE: omit `after` entirely on the first page — the server treats an
    // explicit null cursor as malformed. Omit `filter` when there is none.
    {
      mandateKey: memberId,
      first: MEMBER_VOTES_PAGE_SIZE,
      ...(after !== undefined && { after }),
      ...(filter ? { filter } : {}),
    },
    { operationName: 'parliamentMemberVotes' },
  )
  const parsed = parliamentMemberVotesResponseSchema.parse(data)
  if (!parsed.parliamentMember) return null
  const { edges, total, pageInfo } = parsed.parliamentMember.votes
  return mapMemberVotingHistory(
    memberId,
    edges.map((e) => e.node),
    total,
    pageInfo,
  )
}

export async function fetchParliamentMemberVoteActivityLive(
  memberId: string,
  year: number,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVoteActivity | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_VOTE_ACTIVITY_QUERY,
    { mandateKey: memberId, year, ...(filter ? { filter } : {}) },
    { operationName: 'parliamentMemberVoteActivity' },
  )
  const parsed = parliamentMemberVoteActivityResponseSchema.parse(data)
  if (!parsed.parliamentMember) return null
  return mapMemberVoteActivity(parsed.parliamentMember.voteActivity)
}

/**
 * Institution-wide vote activity for one calendar year.
 *
 * The field this asks for does not exist on the API yet (see
 * `PARLIAMENT_VOTE_ACTIVITY_QUERY`), so in live mode this REJECTS until the
 * server ships it. That is deliberate: the caller renders the rejection as a
 * stated error, which is the honest reading of "we cannot count this yet".
 */
export async function fetchParliamentVoteActivityLive(
  year: number,
  filter?: ParliamentVotesFilterInput,
): Promise<ParliamentVoteActivity | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_VOTE_ACTIVITY_QUERY,
    { year, ...(filter ? { filter } : {}) },
    { operationName: 'parliamentVoteActivity' },
  )
  const parsed = parliamentVoteActivityResponseSchema.parse(data)
  if (!parsed.parliamentVoteActivity) return null
  return mapParliamentVoteActivity(parsed.parliamentVoteActivity)
}

/**
 * Institution-wide legislative activity for one calendar year.
 *
 * Served since 2026-08-05 — the server built `parliamentBillActivity` to this
 * exact contract (see `PARLIAMENT_BILL_ACTIVITY_QUERY`). Counts are a
 * current-recency snapshot: a bill sits on exactly one day (its latest event)
 * and moves when a new event lands, so older days retain only the bills
 * untouched since.
 */
export async function fetchParliamentBillActivityLive(
  year: number,
  filter?: ParliamentBillsFilterInput,
): Promise<ParliamentBillActivity | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_BILL_ACTIVITY_QUERY,
    { year, ...(filter ? { filter } : {}) },
    { operationName: 'parliamentBillActivity' },
  )
  const parsed = parliamentBillActivityResponseSchema.parse(data)
  if (!parsed.parliamentBillActivity) return null
  return mapParliamentBillActivity(parsed.parliamentBillActivity)
}

// ── member speeches (interventii) ─────────────────────────────────────────────

const MEMBER_SPEECHES_PAGE_SIZE = 50

export async function fetchParliamentMemberSpeechesLive(
  memberId: string,
  after?: string,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechesHistory | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_SPEECHES_QUERY,
    // Omit `after` on page 1 (a null cursor is malformed); omit `filter`/`q`
    // when unset so the server sees a clean query.
    {
      mandateKey: memberId,
      first: MEMBER_SPEECHES_PAGE_SIZE,
      ...(after !== undefined && { after }),
      ...(filter ? { filter } : {}),
      ...(q ? { q } : {}),
    },
    { operationName: 'parliamentMemberSpeeches' },
  )
  const parsed = parliamentMemberSpeechesResponseSchema.parse(data)
  if (!parsed.parliamentMember) return null
  const { edges, total, pageInfo } = parsed.parliamentMember.speechesConnection
  return mapMemberSpeeches(memberId, edges, total, pageInfo)
}

export async function fetchParliamentMemberSpeechActivityLive(
  memberId: string,
  year: number,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechActivity | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_SPEECH_ACTIVITY_QUERY,
    { mandateKey: memberId, year, ...(filter ? { filter } : {}), ...(q ? { q } : {}) },
    { operationName: 'parliamentMemberSpeechActivity' },
  )
  const parsed = parliamentMemberSpeechActivityResponseSchema.parse(data)
  if (!parsed.parliamentMember) return null
  return mapMemberSpeechActivity(parsed.parliamentMember.speechActivity)
}

// ── member profile ──────────────────────────────────────────────────────────

/** How many control items the profile payload carries (the tab shows the total too). */
const MEMBER_PROFILE_CONTROL_PAGE_SIZE = 25

export async function fetchParliamentMemberProfileLive(
  memberId: string,
): Promise<ParliamentMemberProfile | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_PROFILE_QUERY,
    { mandateKey: memberId, controlPageSize: MEMBER_PROFILE_CONTROL_PAGE_SIZE },
    { operationName: 'parliamentMemberProfile' },
  )
  const parsed = parliamentMemberProfileResponseSchema.parse(data)
  if (!parsed.parliamentMember) return null
  return mapMemberProfile(parsed.parliamentMember)
}

const DEFAULT_INITIATIVES_PAGE_SIZE = 10

export async function fetchParliamentMemberInitiativesLive(
  memberId: string,
  page = 1,
  pageSize = DEFAULT_INITIATIVES_PAGE_SIZE,
): Promise<ParliamentMemberInitiativesList | null> {
  const safePage = Math.max(1, page)
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_INITIATIVES_QUERY,
    { mandateKey: memberId, page: safePage, pageSize },
    { operationName: 'parliamentMemberInitiatives' },
  )
  const parsed = parliamentMemberInitiativesResponseSchema.parse(data)
  if (!parsed.parliamentMember) return null
  // Server orders registration-date DESC (latest-first) — preserve that order.
  return mapMemberInitiatives(memberId, parsed.parliamentMember.initiatives, safePage, pageSize)
}

// ── bills ─────────────────────────────────────────────────────────────────

export async function fetchParliamentBillsLive(
  search: ParliamentBillsSearch = {},
): Promise<ParliamentBillList> {
  const filter = buildBillsFilter(search)
  const sort = buildBillsSort(search)
  const pageSize = search.pageSize ?? DEFAULT_BILLS_PAGE_SIZE
  const page = Math.max(1, search.page ?? 1)

  const data = await graphqlQuery<unknown>(
    PARLIAMENT_BILLS_QUERY,
    { filter, sort, page, pageSize },
    { operationName: 'parliamentBills' },
  )
  const parsed = parliamentBillsResponseSchema.parse(data)
  const { total, bills } = parsed.parliamentBills
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // billType + billLocation are now SERVER-backed (buildBillsFilter maps them to
  // the billType/status tokens), so filtering spans the full result set and the
  // server `total` is exact — pagination is honest, no client-side over-page
  // facet or page-collapse.
  return {
    bills: bills.map((b) => mapBillSummary(b)),
    total,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
  }
}

export async function fetchParliamentBillDetailLive(
  billId: string,
): Promise<ParliamentBillDetail | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_BILL_QUERY,
    { billKey: billId },
    { operationName: 'parliamentBill' },
  )
  const parsed = parliamentBillResponseSchema.parse(data)
  return parsed.parliamentBill ? mapBillDetail(parsed.parliamentBill) : null
}

export async function fetchParliamentBillRelatedVotesLive(
  billId: string,
): Promise<readonly ParliamentBillRelatedVote[]> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_BILL_QUERY,
    { billKey: billId },
    { operationName: 'parliamentBillRelatedVotes' },
  )
  const parsed = parliamentBillResponseSchema.parse(data)
  return parsed.parliamentBill ? mapBillRelatedVotes(parsed.parliamentBill) : []
}

/**
 * Judet list for the member filter, derived from live constituency values.
 * `parliamentResolveFilter` has no "list all" mode, so we enumerate the distinct
 * `constituencyName`s from a full members page and fold them to slugs. (Cached.)
 */
let judeteCache: Promise<ReadonlyArray<{ slug: string; name: string }>> | null = null

export async function fetchParliamentJudeteLive(): Promise<
  ReadonlyArray<{ slug: string; name: string }>
> {
  if (!judeteCache) {
    judeteCache = (async () => {
      const members = await fetchParliamentMembersLive({ pageSize: 500 })
      const seen = new Map<string, string>()
      for (const m of members.members) {
        if (m.judetName && !seen.has(m.judetSlug)) seen.set(m.judetSlug, m.judetName)
      }
      // `foldSlug` is already applied by mapMember; keep names as the DB display.
      return Array.from(seen.entries())
        .map(([slug, name]) => ({ slug, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
    })().catch((error) => {
      judeteCache = null
      throw error
    })
  }
  return judeteCache
}

/** Best-effort resolve passthrough for callers that need the raw resolve hits. */
export async function resolveParliamentFilterLive(
  dim: 'group' | 'constituency' | 'person' | 'recipient' | 'control_type' | 'outcome' | 'chamber',
  q: string,
): Promise<Array<{ value: string; label: string }>> {
  const trimmed = q.trim()
  if (!trimmed) return []
  try {
    const data = await graphqlQuery<unknown>(
      PARLIAMENT_RESOLVE_QUERY,
      { dim, q: trimmed, legislature: LATEST_LEGISLATURE },
      { operationName: 'parliamentResolveFilter' },
    )
    const parsed = parliamentResolveResponseSchema.parse(data)
    return parsed.parliamentResolveFilter.map((h) => ({ value: h.value, label: h.label }))
  } catch (error) {
    if (error instanceof GraphQLRequestError) return []
    throw error
  }
}

// ── data freshness ──────────────────────────────────────────────────────────

export async function fetchParliamentFreshnessLive(): Promise<ParliamentDataFreshness> {
  try {
    const data = await graphqlQuery<unknown>(
      PARLIAMENT_FRESHNESS_QUERY,
      {},
      { operationName: 'parliamentDataFreshness' },
    )
    const parsed = parliamentFreshnessResponseSchema.parse(data)
    return mapDataFreshness(
      parsed.parliamentDataFreshness ?? { latestVoteDate: null, lastLoadedAt: null },
    )
  } catch (error) {
    // Freshness is a decorative header line — never fail the hub over it.
    if (error instanceof GraphQLRequestError) return {}
    throw error
  }
}

// ── committees ────────────────────────────────────────────────────────────

/** Server-side cap on `first` for `parliamentCommittees`. Asking for more is clamped. */
const COMMITTEES_PAGE_SIZE = 100

/**
 * Pages to draw before giving up and handing the cursor back to the caller.
 * Each read is bound to ONE chamber, so the largest single draw is Camera's 466
 * rows = 5 pages (Senate is 191 = 2); 12 leaves better than 2x headroom. NOT a
 * silent cap: on exhaustion the partial set is returned WITH `hasNextPage`, so
 * the page keeps its "load more" escape hatch instead of quietly presenting a
 * prefix as the whole.
 *
 * Cost, measured 2026-08-05 rather than assumed: the whole directory is 360 KiB
 * of JSON (~561 bytes/row) over 7 requests; the DEFAULT view (current
 * legislature) is 227 rows over 3 requests. That is roughly double the old
 * one-page read, and it is the price of a search box, a type filter and a set
 * of counts that describe the whole directory instead of an arbitrary prefix.
 *
 * Two stop paths differ deliberately: a mid-directory FAILURE rejects (a partial
 * directory presented as whole is the bug being fixed), while hitting the cap
 * returns what it has plus the cursor to continue. Don't "harmonise" them.
 */
const COMMITTEES_MAX_PAGES = 12

async function fetchCommitteesPage(params: {
  chamber?: string
  legislature?: string
  after?: string
}): Promise<{ committees: ParliamentCommittee[]; hasNextPage: boolean; endCursor?: string }> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_COMMITTEES_QUERY,
    {
      ...(params.chamber ? { chamber: params.chamber } : {}),
      ...(params.legislature ? { legislature: params.legislature } : {}),
      first: COMMITTEES_PAGE_SIZE,
      ...(params.after ? { after: params.after } : {}),
    },
    { operationName: 'parliamentCommittees' },
  )
  const parsed = parliamentCommitteesResponseSchema.parse(data)
  // A null root is a SERVER FAILURE, not an empty result. It used to be swallowed
  // into `{ committees: [] }`, which the browse page rendered as "Nu există
  // comisii disponibile" — telling the reader that Parliament has no committees
  // for that filter. Surface it so the UI can offer a retry instead.
  const connection = parsed.parliamentCommittees
  if (!connection) {
    throw new GraphQLRequestError('parliamentCommittees returned null', {
      query: 'parliamentCommittees',
    })
  }
  const { edges, pageInfo } = connection
  return {
    committees: edges.map((e) => mapCommittee(e.node)),
    hasNextPage: pageInfo.hasNextPage,
    ...(pageInfo.endCursor ? { endCursor: pageInfo.endCursor } : {}),
  }
}

/**
 * Reads the committee directory to COMPLETION, not one page of it.
 *
 * The browse page's search box, type filter, grouping and counts all run over
 * the rows in hand (`selectCommittees`), so a bounded first page silently
 * bounded all four: with 191 Senate committees behind a 60-row page, searching
 * "comunica" returned an older instance of a committee (#54) and not the current
 * one (#172), which read as missing data. The corpus is 657 rows, so the whole
 * set is the right unit to hold (see COMMITTEES_MAX_PAGES for the measured cost).
 *
 * A fifth thing the bounded read broke, and the one no reader could have caught:
 * the server orders by BYTE order under a `C` collation while the client
 * re-sorts with `localeCompare(…, 'ro')`. Re-sorting a byte-ordered PREFIX
 * linguistically yields an order that looks Romanian and is simply wrong.
 * Reading to completion is what makes the displayed ORDER correct, not just the
 * search.
 *
 * Deliberately NOT a server-side `q`: a server `q` would fix one of those five
 * and leave the type facet, the grouping, the counts and the order broken. (That
 * `foldText` — NFD + strip combining marks — is what makes `ș` U+0219 and
 * `ş` U+015F both match a typed `s` is true, and re-deriving it in SQL is a
 * known way to lose half the corpus; but `unaccent` could be made to agree, so
 * that argument alone would not settle it.)
 */
export async function fetchParliamentCommitteesLive(params: {
  chamber?: string
  legislature?: string
  after?: string
}): Promise<{ committees: ParliamentCommittee[]; hasNextPage: boolean; endCursor?: string }> {
  let page = await fetchCommitteesPage(params)
  const committees = [...page.committees]
  // A cursor that does not ADVANCE re-serves the same rows forever. Following it
  // would append the same page up to the cap. Each cursor is followed once.
  const followed = new Set<string>()
  // ...and the set lives only for THIS call, so stopping is not enough: this
  // function sits under a `useInfiniteQuery`, which stores the cursor we return
  // and re-supplies it on the next "load more". Handing a known-stuck cursor
  // back means every press appends the same page again (observed: page params
  // [undefined, 'stuck', 'stuck']). A stuck cursor is therefore TERMINAL.
  let stalled = false

  for (let drawn = 1; page.hasNextPage && page.endCursor; drawn += 1) {
    if (followed.has(page.endCursor)) {
      console.warn(
        `[parliament] committee browse stopped: cursor did not advance after ${committees.length} rows.`,
      )
      stalled = true
      break
    }
    if (drawn >= COMMITTEES_MAX_PAGES) {
      console.warn(
        `[parliament] committee browse stopped at ${COMMITTEES_MAX_PAGES} pages (${committees.length} rows); more remain — filters and counts cover only these.`,
      )
      break
    }
    followed.add(page.endCursor)
    // The filters ride along on EVERY page. Dropping them here would silently
    // mix chambers into a result the caller asked to be chamber-bound.
    page = await fetchCommitteesPage({ ...params, after: page.endCursor })
    committees.push(...page.committees)
  }

  if (page.hasNextPage && !page.endCursor) {
    console.warn(
      `[parliament] committee browse stopped after ${committees.length} rows: the server reports more but returned no cursor.`,
    )
  }

  return {
    committees,
    hasNextPage: page.hasNextPage,
    // Withholding the cursor is what makes a stall terminal: `getNextPageParam`
    // returns undefined, so the hook stops offering "load more" rather than
    // replaying the stuck cursor. The CAP path deliberately keeps its cursor —
    // there, continuing is exactly the right thing to offer.
    ...(page.endCursor && !stalled ? { endCursor: page.endCursor } : {}),
  }
}

export async function fetchParliamentCommitteeLive(
  committeeKey: string,
): Promise<ParliamentCommitteeDetail | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_COMMITTEE_QUERY,
    { committeeKey },
    { operationName: 'parliamentCommittee' },
  )
  const parsed = parliamentCommitteeResponseSchema.parse(data)
  return parsed.parliamentCommittee
    ? mapCommitteeDetail(parsed.parliamentCommittee)
    : null
}

// Re-export for the facade's chamber translation needs.
export { toGraphqlChamber }
