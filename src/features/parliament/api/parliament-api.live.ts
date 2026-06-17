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
  type ParliamentGroup,
  type ParliamentHubData,
  type ParliamentMember,
  type ParliamentMemberProfile,
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
  PARLIAMENT_GROUP_MEMBERS_QUERY,
  PARLIAMENT_GROUPS_QUERY,
  PARLIAMENT_MEMBER_PROFILE_QUERY,
  PARLIAMENT_MEMBER_QUERY,
  PARLIAMENT_MEMBER_VOTES_QUERY,
  PARLIAMENT_MEMBERS_QUERY,
  PARLIAMENT_RESOLVE_QUERY,
  PARLIAMENT_VOTE_BALLOTS_QUERY,
  PARLIAMENT_VOTE_QUERY,
  PARLIAMENT_VOTES_QUERY,
  parliamentBillResponseSchema,
  parliamentBillsResponseSchema,
  parliamentGroupMembersResponseSchema,
  parliamentGroupsResponseSchema,
  parliamentMemberProfileResponseSchema,
  parliamentMemberResponseSchema,
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
  mapGroup,
  mapMember,
  mapMemberProfile,
  mapMemberVotingHistory,
  mapVoteDetail,
  mapVoteListItem,
} from './graphql/parliament-mappers'
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

let groupsCache: Promise<ParliamentGroup[]> | null = null

async function loadGroupsForChamber(
  chamber: 'camera_deputatilor' | 'senat',
): Promise<ParliamentGroup[]> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_GROUPS_QUERY,
    { legislature: LATEST_LEGISLATURE, chamber },
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
 */
async function loadAllGroups(): Promise<ParliamentGroup[]> {
  if (!groupsCache) {
    groupsCache = (async () => {
      const [camera, senat] = await Promise.all([
        loadGroupsForChamber('camera_deputatilor'),
        loadGroupsForChamber('senat'),
      ])
      return [...camera, ...senat]
    })().catch((error) => {
      groupsCache = null // allow retry on next call
      throw error
    })
  }
  return groupsCache
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
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_GROUP_MEMBERS_QUERY,
    { groupId, legislature: LATEST_LEGISLATURE },
    { operationName: 'parliamentGroupMembers' },
  )
  const parsed = parliamentGroupMembersResponseSchema.parse(data)
  return parsed.parliamentGroupMembers
    .map(mapMember)
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'ro'))
}

// ── hub ─────────────────────────────────────────────────────────────────────

export async function fetchParliamentHubLive(): Promise<ParliamentHubData> {
  const [groups, recent] = await Promise.all([
    loadAllGroups(),
    fetchParliamentVotesLive({ pageSize: 6 }),
  ])

  const memberCountByChamber = groups.reduce(
    (acc, g) => {
      // Explicit per-chamber sum (no `else` catch-all): groups carry a real
      // chamber from the two-chamber fetch, so a stray group with an unexpected
      // chamber is ignored rather than silently inflating senat.
      if (g.chamber === 'camera') acc.camera += g.memberCount
      else if (g.chamber === 'senat') acc.senat += g.memberCount
      return acc
    },
    { camera: 0, senat: 0 },
  )

  return ParliamentHubDataSchema.parse({
    legislature: {
      id: LATEST_LEGISLATURE,
      label: `Legislatura ${LATEST_LEGISLATURE}`,
      startYear: Number(LATEST_LEGISLATURE),
      endYear: Number(LATEST_LEGISLATURE) + 4,
    },
    lastSyncedAt: new Date().toISOString(),
    sources: ['cdep.ro', 'senat.ro'],
    groups,
    recentVotes: recent.votes,
    memberCountByChamber,
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
  // The hemicycle needs the FULL roster so non-matching seats render greyed —
  // `buildChamberComposition` applies the search itself (via `isActive`). Fetch
  // every member (no grup/judet/q server filter), bounded only by legislature.
  const [groups, membersPage] = await Promise.all([
    loadAllGroups(),
    fetchParliamentMembersLive({ page: 1, pageSize: 500 }),
  ])
  const colorMap = Object.fromEntries(
    groups.map((g) => [g.groupId, g.color ?? resolveGroupColor({ groupId: g.groupId, name: g.name })]),
  )
  return ParliamentChamberCompositionSchema.parse(
    buildChamberComposition(chamber, groups, membersPage.members, colorMap, search),
  )
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

export async function fetchParliamentMemberVotingHistoryLive(
  memberId: string,
): Promise<ParliamentMemberVotingHistory | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_MEMBER_VOTES_QUERY,
    { mandateKey: memberId, first: 100 },
    { operationName: 'parliamentMemberVotes' },
  )
  const parsed = parliamentMemberVotesResponseSchema.parse(data)
  if (!parsed.parliamentMember) return null
  const { edges, total } = parsed.parliamentMember.votes
  return mapMemberVotingHistory(
    memberId,
    edges.map((e) => e.node),
    total,
  )
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

  let mapped = bills.map((b) => mapBillSummary(b))
  // billType / non-promulgat billLocation have no live column; apply them
  // client-side OVER THE PAGE. When such a facet is active the server `total`
  // no longer describes the rows we return, so collapse pagination to a single
  // page of the filtered slice rather than report a misleading "page 1 of N".
  const hasClientFacet =
    Boolean(search.billType) ||
    Boolean(search.billLocation && search.billLocation !== 'promulgat')
  if (search.billType) {
    mapped = mapped.filter((b) => b.billType === search.billType)
  }
  if (search.billLocation && search.billLocation !== 'promulgat') {
    mapped = mapped.filter((b) => b.currentLocation === search.billLocation)
  }

  if (hasClientFacet) {
    return {
      bills: mapped,
      total: mapped.length,
      page: 1,
      pageSize,
      totalPages: 1,
    }
  }

  return {
    bills: mapped,
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

// Re-export for the facade's chamber translation needs.
export { toGraphqlChamber }
