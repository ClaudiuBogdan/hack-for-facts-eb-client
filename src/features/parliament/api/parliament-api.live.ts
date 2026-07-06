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
  type ParliamentMembersList,
  type ParliamentMembersSearch,
  type ParliamentVoteDetail,
  type ParliamentVotesList,
  type ParliamentVotesSearch,
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
  PARLIAMENT_MEMBERS_QUERY,
  PARLIAMENT_RESOLVE_QUERY,
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
  parliamentMemberInitiativesResponseSchema,
  parliamentMemberProfileResponseSchema,
  parliamentMemberResponseSchema,
  parliamentMemberVoteActivityResponseSchema,
  parliamentMemberVotesResponseSchema,
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
  mapMember,
  mapMemberInitiatives,
  mapMemberProfile,
  mapMemberVoteActivity,
  mapMemberVotingHistory,
  mapVoteDetail,
  mapVoteListItem,
} from './graphql/parliament-mappers'
import type { MemberVotesFilterInput } from '../lib/member-votes-filter'
import {
  buildBillsFilter,
  buildBillsSort,
  buildMembersFilter,
  buildVotesFilter,
} from './graphql/parliament-filters'
import {
  LATEST_LEGISLATURE,
  toGraphqlChamber,
} from './graphql/parliament-translate'
import { resolveGroupColor } from '../lib/group-colors'

const DEFAULT_MEMBERS_PAGE_SIZE = 20
const DEFAULT_VOTES_PAGE_SIZE = 10
const DEFAULT_BILLS_PAGE_SIZE = 10
/** Ballot connection cap to assemble a vote's full member-level ballot list. */
const MAX_BALLOTS = 500
/** Server caps the ballots connection at 200/page (parliament-repo.ts). */
const BALLOTS_PAGE_SIZE = 200

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
  const effectiveSearch =
    search.chamber && search.chamber !== 'all'
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
  const [currentGroups, allGroups, recent] = await Promise.all([
    loadAllGroups(true),
    loadAllGroups(),
    fetchParliamentVotesLive({ pageSize: 6 }),
  ])

  return ParliamentHubDataSchema.parse({
    legislature: {
      id: LATEST_LEGISLATURE,
      label: `Legislatura ${LATEST_LEGISLATURE}`,
      startYear: Number(LATEST_LEGISLATURE),
      endYear: Number(LATEST_LEGISLATURE) + 4,
    },
    lastSyncedAt: new Date().toISOString(),
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
): Promise<ParliamentVotesList> {
  const filter = buildVotesFilter(search)
  const pageSize = search.pageSize ?? DEFAULT_VOTES_PAGE_SIZE

  const data = await graphqlQuery<unknown>(
    PARLIAMENT_VOTES_QUERY,
    { filter, sort: 'voteDate', first: pageSize },
    { operationName: 'parliamentVotes' },
  )
  const parsed = parliamentVotesResponseSchema.parse(data)
  const votes = parsed.parliamentVotes.edges.map((e) => mapVoteListItem(e.node))

  // The votes surface is a cursor connection with no exact total; the UI list is
  // single-page (recent votes). Report the page as page 1 of 1 over the page set.
  return {
    votes,
    total: votes.length,
    page: 1,
    pageSize,
    totalPages: 1,
  }
}

export async function fetchParliamentVoteDetailLive(
  chamber: ParliamentChamber,
  voteId: string,
): Promise<ParliamentVoteDetail | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_VOTE_QUERY,
    { voteKey: voteId, ballotsFirst: BALLOTS_PAGE_SIZE },
    { operationName: 'parliamentVote' },
  )
  const parsed = parliamentVoteResponseSchema.parse(data)
  if (!parsed.parliamentVote) return null

  // The server caps ballots at 200/page; votes with >200 ballots (≈half of all
  // divisions) would otherwise truncate the per-member list. Page through the
  // ballots cursor (bounded by MAX_BALLOTS) and append before mapping.
  const vote = parsed.parliamentVote
  const allBallotEdges = [...vote.ballots.edges]
  let pageInfo = vote.ballots.pageInfo
  while (pageInfo.hasNextPage && pageInfo.endCursor && allBallotEdges.length < MAX_BALLOTS) {
    const moreData = await graphqlQuery<unknown>(
      PARLIAMENT_VOTE_BALLOTS_QUERY,
      { voteKey: voteId, first: BALLOTS_PAGE_SIZE, after: pageInfo.endCursor },
      { operationName: 'parliamentVoteBallots' },
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

// ── member profile ──────────────────────────────────────────────────────────

export async function fetchParliamentMemberProfileLive(
  memberId: string,
): Promise<ParliamentMemberProfile | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_PROFILE_QUERY,
    { mandateKey: memberId },
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
      const { foldSlug } = await import('./graphql/parliament-translate')
      const members = await fetchParliamentMembersLive({ pageSize: 500 })
      const seen = new Map<string, string>()
      for (const m of members.members) {
        if (m.judetName && !seen.has(m.judetSlug)) seen.set(m.judetSlug, m.judetName)
      }
      // foldSlug is already applied by mapMember; keep names as the DB display.
      void foldSlug
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

const DEFAULT_COMMITTEES_PAGE_SIZE = 60

export async function fetchParliamentCommitteesLive(params: {
  chamber?: string
  legislature?: string
  first?: number
  after?: string
}): Promise<{ committees: ParliamentCommittee[]; hasNextPage: boolean; endCursor?: string }> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_COMMITTEES_QUERY,
    {
      ...(params.chamber ? { chamber: params.chamber } : {}),
      ...(params.legislature ? { legislature: params.legislature } : {}),
      first: params.first ?? DEFAULT_COMMITTEES_PAGE_SIZE,
      ...(params.after ? { after: params.after } : {}),
    },
    { operationName: 'parliamentCommittees' },
  )
  const parsed = parliamentCommitteesResponseSchema.parse(data)
  // Null root = server internal error (H2); degrade to an empty, non-paginating
  // list rather than crashing the browse page.
  const connection = parsed.parliamentCommittees
  if (!connection) return { committees: [], hasNextPage: false }
  const { edges, pageInfo } = connection
  return {
    committees: edges.map((e) => mapCommittee(e.node)),
    hasNextPage: pageInfo.hasNextPage,
    ...(pageInfo.endCursor ? { endCursor: pageInfo.endCursor } : {}),
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
