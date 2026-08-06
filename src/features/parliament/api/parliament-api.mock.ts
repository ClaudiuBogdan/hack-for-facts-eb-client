/**
 * Mock parliament data, served from JSON fixtures when mock mode is enabled
 * (`VITE_USE_MOCK_DATA=true` or `VITE_MOCK_DATASETS=political-parliament`). This
 * is the former `parliament-api.ts` body, moved here verbatim and exported with
 * `*Mock` names; the facade (`parliament-api.ts`) routes to these or the live
 * module. UI components and data shapes are unchanged.
 */
import type {
  ParliamentBillDetail,
  ParliamentBillList,
  ParliamentBillRelatedVote,
  ParliamentBillSummary,
  ParliamentBillsSearch,
  ParliamentChamber,
  ParliamentChamberComposition,
  ParliamentCommittee,
  ParliamentCommitteeDetail,
  ParliamentCommitteeDocumentPage,
  ParliamentDataFreshness,
  ParliamentGroup,
  ParliamentHubData,
  ParliamentMember,
  ParliamentMemberProfile,
  ParliamentMemberInitiativesList,
  ParliamentMemberVoteActivity,
  ParliamentMemberVotingHistory,
  ParliamentMemberSpeechesHistory,
  ParliamentMemberSpeechActivity,
  ParliamentMembersList,
  ParliamentMembersSearch,
  ParliamentBillActivity,
  ParliamentVoteActivity,
  ParliamentVoteActivityDay,
  ParliamentVoteDetail,
  ParliamentVoteSummary,
  ParliamentVotesList,
  ParliamentVotesSearch,
} from '@/schemas/parliament'
import {
  ParliamentBillDetailSchema,
  ParliamentBillListSchema,
  ParliamentBillSummarySchema,
  ParliamentChamberCompositionSchema,
  ParliamentCommitteeSchema,
  ParliamentCommitteeDetailSchema,
  ParliamentCommitteeDocumentPageSchema,
  ParliamentCommitteeDocumentSchema,
  ParliamentDataFreshnessSchema,
  ParliamentGroupSchema,
  ParliamentHubDataSchema,
  ParliamentMemberSchema,
  ParliamentMemberInitiativesListSchema,
  ParliamentMemberVoteActivitySchema,
  ParliamentMemberVotingHistorySchema,
  ParliamentMemberSpeechesHistorySchema,
  ParliamentMemberSpeechActivitySchema,
  ParliamentMembersListSchema,
  ParliamentBillActivitySchema,
  ParliamentVoteActivitySchema,
  ParliamentVoteDetailSchema,
  ParliamentVoteSummarySchema,
  ParliamentVotesListSchema,
} from '@/schemas/parliament'
import type { ParliamentVotesFilterInput } from './graphql/parliament-filters'
import { toGraphqlVoteChamber } from './graphql/parliament-translate'

import committeesData from '../mocks/committees.json'
import groupsData from '../mocks/groups.json'
import { LATEST_LEGISLATURE } from './graphql/parliament-translate'
import billDetailsData from '../mocks/bill-details.json'
import billsData from '../mocks/bills.json'
import judeteData from '../mocks/judete.json'
import legislatureData from '../mocks/legislature.json'
import membersData from '../mocks/members.json'
import voteDetailsData from '../mocks/vote-details.json'
import voteSummariesData from '../mocks/vote-summaries.json'
import {
  buildChamberComposition,
  ensureFullChamberRoster,
} from '../lib/chamber-composition'
import { filterMembersBySearch } from '../lib/member-search'
import { DEFAULT_MEMBERS_PAGE_SIZE } from '../lib/table-theme'
import {
  extendParliamentMembers,
  synthesizeVoteDetail,
} from '../lib/vote-detail-synthesis'
import { resolveParliamentMemberProfile } from '../lib/member-profile-data'
import { resolveParliamentBillDetail } from '../lib/bill-profile-data'
import { resolveGroupColor } from '../lib/group-colors'
import type { MemberVotesFilterInput } from '../lib/member-votes-filter'
import type { MemberSpeechesFilterInput } from '../lib/member-speeches-filter'

const MOCK_LAST_SYNCED = '2026-05-20T08:00:00+03:00'
const DEFAULT_VOTES_PAGE_SIZE = 10
const DEFAULT_BILLS_PAGE_SIZE = 10

// Resolve group colour through the single brand resolver (not the fixture's
// `color` field), so mock and live share one source of truth for colours.
const groups = groupsData.map((g) => {
  const parsed = ParliamentGroupSchema.parse(g)
  return {
    ...parsed,
    color: resolveGroupColor({ groupId: parsed.groupId, name: parsed.name }),
  }
})

function buildGroupColorMap(
  groupList: ReadonlyArray<ParliamentGroup>,
): Record<string, string> {
  return Object.fromEntries(
    groupList.map((group) => [
      group.groupId,
      resolveGroupColor({ groupId: group.groupId, name: group.name }),
    ]),
  )
}

const members = ensureFullChamberRoster(
  extendParliamentMembers(
    membersData.map((m) => ParliamentMemberSchema.parse(m)),
    groups,
  ),
  groups,
)
const groupColorMap = buildGroupColorMap(groups)

const EXTRA_VOTE_TITLES = [
  'Proiect de Lege privind sănătatea publică',
  'Proiect de Lege privind educația națională',
  'Proiect de Lege privind infrastructura rutieră',
  'Proiect de Lege privind energia regenerabilă',
  'Proiect de Lege privind transparența decizională',
  'Moțiune simplă privind politica socială',
  'Moțiune de cenzură împotriva Guvernului',
  'Proiect de Lege privind apărarea națională',
  'Proiect de Lege privind agricultura',
  'Proiect de Lege privind protecția mediului',
  'Proiect de Lege privind reforma fiscală',
  'Proiect de Lege privind digitalizarea justiției',
] as const

function buildExpandedVoteSummaries(): ParliamentVoteSummary[] {
  const base = voteSummariesData.map((v) =>
    ParliamentVoteSummarySchema.parse(v),
  )
  const extras: ParliamentVoteSummary[] = []

  for (const chamber of ['camera', 'senat'] as const) {
    const chamberBase = base.filter((v) => v.chamber === chamber)
    if (chamberBase.length === 0) continue

    for (let i = 0; i < 14; i++) {
      const template = chamberBase[i % chamberBase.length]!
      const titleTemplate = EXTRA_VOTE_TITLES[i % EXTRA_VOTE_TITLES.length]!
      const heldAt = new Date(template.heldAt)
      heldAt.setDate(heldAt.getDate() - (i + 1) * 3)

      extras.push(
        ParliamentVoteSummarySchema.parse({
          ...template,
          voteId: `${chamber}-gen-${String(i + 1).padStart(3, '0')}`,
          title: titleTemplate,
          heldAt: heldAt.toISOString(),
          // The readings that actually occur (prod 2026-07-29: adoptat 16,916 ·
          // respins 3,627 · 202 with no published result). `amânat` was minted
          // here and has never existed in the data.
          outcome:
            i % 4 === 0 ? 'respins' : i % 7 === 0 ? 'necunoscut' : 'adoptat',
          outcomeLabel:
            i % 4 === 0
              ? 'Proiectul a fost respins'
              : i % 7 === 0
                ? 'Sursa nu a publicat un rezultat'
                : 'Proiectul a fost adoptat',
        }),
      )
    }
  }

  return [...base, ...extras]
}

const voteSummaries = buildExpandedVoteSummaries()

const bills = billsData.map((bill) => ParliamentBillSummarySchema.parse(bill))
const billDetailsMap = billDetailsData as Record<string, unknown>

/**
 * Mock vote details, normalised to the live shape. The fixtures predate
 * `ballotKey` (the render-only per-ballot key that replaced the fabricated
 * `row-<n>` member ids), so derive it from the vote + the ballot's position —
 * exactly what the live mapper does from `voteKey` + `rowIndex`.
 */
const voteDetailsMap: Record<string, unknown> = Object.fromEntries(
  Object.entries(voteDetailsData as Record<string, unknown>).map(
    ([voteId, raw]) => {
      const detail = raw as {
        readonly memberVotes?: readonly Record<string, unknown>[]
      }
      if (!Array.isArray(detail.memberVotes)) return [voteId, raw]
      return [
        voteId,
        {
          ...detail,
          memberVotes: detail.memberVotes.map((mv, index) => ({
            ballotKey: `${voteId}#${String(index)}`,
            ...mv,
          })),
        },
      ]
    },
  ),
)

function voteDetailBreakdownMatchesTally(
  detail: ParliamentVoteDetail,
): boolean {
  const totalPentru = detail.groupBreakdown.reduce(
    (sum, group) => sum + group.pentru,
    0,
  )
  const totalImpotriva = detail.groupBreakdown.reduce(
    (sum, group) => sum + group.impotriva,
    0,
  )
  const totalAbtinere = detail.groupBreakdown.reduce(
    (sum, group) => sum + (group.abtinere ?? 0),
    0,
  )
  const totalNuAVotat = detail.groupBreakdown.reduce(
    (sum, group) => sum + (group.nuAVotat ?? 0),
    0,
  )

  return (
    totalPentru === detail.tally.pentru &&
    totalImpotriva === detail.tally.impotriva &&
    totalAbtinere === (detail.tally.abtinere ?? 0) &&
    totalNuAVotat === (detail.tally.nuAVotat ?? 0)
  )
}

function buildHubData(): ParliamentHubData {
  return ParliamentHubDataSchema.parse({
    legislature: legislatureData,
    lastSyncedAt: MOCK_LAST_SYNCED,
    sources: ['cdep.ro', 'senat.ro'],
    groups,
    recentVotes: voteSummaries,
    memberCountByChamber: { camera: 330, senat: 135 },
    budgetInstitutionSlugs: {
      camera: 'camera-deputatilor',
      senat: 'senatul-romaniei',
    },
  })
}

function filterMembers(search: ParliamentMembersSearch): ParliamentMember[] {
  return filterMembersBySearch(members, search, groups).sort((a, b) =>
    a.lastName.localeCompare(b.lastName, 'ro'),
  )
}

function paginateMembers(
  search: ParliamentMembersSearch,
  filtered: ParliamentMember[],
): ParliamentMembersList {
  const pageSize = search.pageSize ?? DEFAULT_MEMBERS_PAGE_SIZE
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages)
  const start = (page - 1) * pageSize
  const slice = filtered.slice(start, start + pageSize)

  return ParliamentMembersListSchema.parse({
    members: slice,
    total,
    page,
    pageSize,
    totalPages,
  })
}

function getDivisionNumbersByChamber(): Map<string, number> {
  const map = new Map<string, number>()
  for (const chamber of ['camera', 'senat'] as const) {
    const sorted = voteSummaries
      .filter((v) => v.chamber === chamber)
      .sort(
        (a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime(),
      )
    sorted.forEach((vote, index) => {
      map.set(vote.voteId, sorted.length - index)
    })
  }
  return map
}

const divisionNumbersByVoteId = getDivisionNumbersByChamber()

function parseDateBoundary(
  value: string | undefined,
  endOfDay: boolean,
): Date | null {
  if (!value?.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return date
}

function filterVotes(search: ParliamentVotesSearch): ParliamentVoteSummary[] {
  let result = [...voteSummaries]
  if (search.chamber && search.chamber !== 'all') {
    result = result.filter((v) => v.chamber === search.chamber)
  }
  if (search.outcome) {
    result = result.filter((v) => v.outcome === search.outcome)
  }
  if (search.from) {
    const fromDate = parseDateBoundary(search.from, false)
    if (fromDate) {
      result = result.filter((v) => new Date(v.heldAt) >= fromDate)
    }
  }
  if (search.to) {
    const toDate = parseDateBoundary(search.to, true)
    if (toDate) {
      result = result.filter((v) => new Date(v.heldAt) <= toDate)
    }
  }
  if (search.q?.trim()) {
    const query = search.q.trim().toLowerCase()
    const divisionQuery = /^\d+$/.test(query) ? Number(query) : null
    result = result.filter((v) => {
      if (v.title.toLowerCase().includes(query)) return true
      if (divisionQuery !== null) {
        return divisionNumbersByVoteId.get(v.voteId) === divisionQuery
      }
      return false
    })
  }
  const grupFilterValues = search.grup
    ? Array.isArray(search.grup)
      ? search.grup
      : [search.grup]
    : []
  if (grupFilterValues.length > 0) {
    result = result.filter((v) => {
      const detail = voteDetailsMap[v.voteId] as
        | { groupBreakdown?: Array<{ groupId: string }> }
        | undefined
      return detail?.groupBreakdown?.some((g) =>
        grupFilterValues.includes(g.groupId),
      )
    })
  }
  return result.sort(
    (a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime(),
  )
}

/**
 * Mirror the live CURSOR shape: the cursor is the index of the first row of the
 * next page, so the mock exercises the same load-more path as the API.
 */
function paginateVotes(
  search: ParliamentVotesSearch,
  filtered: ParliamentVoteSummary[],
  after?: string,
): ParliamentVotesList {
  const pageSize = search.pageSize ?? DEFAULT_VOTES_PAGE_SIZE
  const start = Number.isInteger(Number(after)) ? Math.max(0, Number(after)) : 0
  const slice = filtered.slice(start, start + pageSize)
  const nextStart = start + slice.length
  const hasNextPage = nextStart < filtered.length

  return ParliamentVotesListSchema.parse({
    votes: slice.map((vote) => {
      const divisionNumber = divisionNumbersByVoteId.get(vote.voteId)
      // Only when the fixture actually has one — never a positional stand-in.
      return divisionNumber === undefined ? vote : { ...vote, divisionNumber }
    }),
    pageSize,
    hasNextPage,
    ...(hasNextPage ? { endCursor: String(nextStart) } : {}),
  })
}

function buildMemberVotingHistory(
  memberId: string,
): ParliamentMemberVotingHistory | null {
  if (!members.some((m) => m.memberId === memberId)) return null
  const votes: ParliamentMemberVotingHistory['votes'] = []
  for (const [voteId, rawDetail] of Object.entries(voteDetailsMap)) {
    const detail = ParliamentVoteDetailSchema.parse(rawDetail)
    const memberVote = detail.memberVotes.find((mv) => mv.memberId === memberId)
    if (!memberVote) continue
    votes.push({
      positionKey: memberVote.ballotKey,
      voteId,
      // Member history rows still speak camera|senat (the live mapper collapses
      // joint sittings the same way); the fixtures carry no comun votes anyway.
      chamber: detail.chamber === 'comun' ? 'camera' : detail.chamber,
      title: detail.title,
      heldAt: detail.heldAt,
      choice: memberVote.choice,
      positionStatus: memberVote.positionStatus,
      observationCount: memberVote.observationCount,
      observedChoices: memberVote.observedChoices,
      outcome: detail.outcome,
      divisionNumber: divisionNumbersByVoteId.get(voteId),
      tally: detail.tally,
    })
  }
  votes.sort(
    (a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime(),
  )
  return ParliamentMemberVotingHistorySchema.parse({
    memberId,
    votes,
    total: votes.length,
    hasNextPage: false,
    endCursor: null,
  })
}

export async function fetchParliamentHubMock(): Promise<ParliamentHubData> {
  return buildHubData()
}

export async function fetchParliamentMembersMock(
  search: ParliamentMembersSearch = {},
): Promise<ParliamentMembersList> {
  const filtered = filterMembers(search)
  return paginateMembers(search, filtered)
}

export async function fetchParliamentChamberCompositionMock(
  chamber: ParliamentChamber,
  search: ParliamentMembersSearch = {},
): Promise<ParliamentChamberComposition> {
  return ParliamentChamberCompositionSchema.parse(
    buildChamberComposition(chamber, groups, members, groupColorMap, search),
  )
}

export async function fetchParliamentMemberMock(
  memberId: string,
): Promise<ParliamentMember | null> {
  return members.find((m) => m.memberId === memberId) ?? null
}

export async function fetchParliamentGroupsMock(
  chamber?: 'camera' | 'senat',
): Promise<ParliamentGroup[]> {
  if (!chamber) return groups
  return groups.filter((g) => g.chamber === chamber)
}

/**
 * The group fixtures describe the SITTING legislature only — there is no
 * historical mandate set in the mocks. Both adapters below therefore answer for
 * `LATEST_LEGISLATURE` and return nothing for any other term, rather than
 * serving the current roster under a historical heading: with the legislature
 * picker on the page, that would present today's members as 2016's.
 */
export async function fetchParliamentGroupMock(
  groupId: string,
  legislature: string = LATEST_LEGISLATURE,
): Promise<ParliamentGroup | null> {
  if (legislature !== LATEST_LEGISLATURE) return null
  return groups.find((g) => g.groupId === groupId) ?? null
}

export async function fetchParliamentGroupMembersMock(
  groupId: string,
  legislature: string = LATEST_LEGISLATURE,
): Promise<ParliamentMember[]> {
  if (legislature !== LATEST_LEGISLATURE) return []
  return members.filter((m) => m.groupId === groupId)
}

export async function fetchParliamentVotesMock(
  search: ParliamentVotesSearch = {},
  after?: string,
): Promise<ParliamentVotesList> {
  const filtered = filterVotes(search)
  return paginateVotes(search, filtered, after)
}

/**
 * Institution-wide per-day vote volume for one calendar year, counted off the
 * vote-summary fixtures.
 *
 * The fixtures carry no joint sittings, so `comun` is always 0 here — a
 * property of this sample, not a claim that the chambers never sit together.
 */
export async function fetchParliamentVoteActivityMock(
  year: number,
  filter?: ParliamentVotesFilterInput,
): Promise<ParliamentVoteActivity> {
  // availableYears drives the year picker, so it stays UNfiltered — the same
  // rule the server follows, or a search would delete years from navigation.
  const availableYears = Array.from(
    new Set(voteSummaries.map((vote) => Number(vote.heldAt.slice(0, 4)))),
  )
    .filter((candidate) => Number.isFinite(candidate))
    .sort((a, b) => b - a)

  // The chart answers the same question as the list beneath it, so the mock has
  // to honour the filter too — otherwise mock mode still shows the very
  // chart/list mismatch the live path was fixed for.
  const chamberEq = filter?.chamber?.eq
  const outcomeEq = filter?.outcome?.eq
  const qContains = filter?.q?.contains?.trim().toLowerCase()
  /**
   * `groupVote` and `kind` are NOT applied: the fixtures carry no ballots and no
   * classifier, so there is nothing here to filter on. They are named rather
   * than silently dropped — an unapplied facet makes the mock chart count MORE
   * than the mock list, which is the exact mismatch this filter exists to close.
   */
  const unsupported = [
    filter?.groupVote === undefined ? null : 'groupVote',
    filter?.kind === undefined ? null : 'kind',
  ].filter((f): f is string => f !== null)
  if (unsupported.length > 0) {
    console.warn(
      `[parliament-mock] vote activity ignores ${unsupported.join(', ')} — no fixture data; ` +
        `the chart will over-count relative to the list.`,
    )
  }
  const matchesFilter = (vote: (typeof voteSummaries)[number]): boolean => {
    if (
      chamberEq !== undefined &&
      toGraphqlVoteChamber(vote.chamber) !== chamberEq
    ) {
      return false
    }
    if (outcomeEq !== undefined && vote.outcome !== outcomeEq) return false
    if (qContains !== undefined && qContains !== '') {
      if (!vote.title.toLowerCase().includes(qContains)) return false
    }
    return true
  }

  const dayMap = new Map<string, ParliamentVoteActivityDay>()
  for (const vote of voteSummaries) {
    if (Number(vote.heldAt.slice(0, 4)) !== year) continue
    if (!matchesFilter(vote)) continue
    const date = vote.heldAt.slice(0, 10)
    const day = dayMap.get(date) ?? {
      date,
      total: 0,
      camera: 0,
      senat: 0,
      comun: 0,
    }
    dayMap.set(date, {
      ...day,
      total: day.total + 1,
      camera: day.camera + (vote.chamber === 'camera' ? 1 : 0),
      senat: day.senat + (vote.chamber === 'senat' ? 1 : 0),
    })
  }

  return ParliamentVoteActivitySchema.parse({
    year,
    availableYears,
    days: Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  })
}

/**
 * Institution-wide per-day legislative activity for one calendar year, counted
 * off the bill fixtures by `lastUpdatedAt` — the fixture stand-in for the
 * server's `lastEventDate`, and the same field the mock list sorts by.
 */
export async function fetchParliamentBillActivityMock(
  year: number,
): Promise<ParliamentBillActivity> {
  const availableYears = Array.from(
    new Set(bills.map((bill) => Number(bill.lastUpdatedAt.slice(0, 4)))),
  )
    .filter((candidate) => Number.isFinite(candidate))
    .sort((a, b) => b - a)

  const totals = new Map<string, number>()
  for (const bill of bills) {
    if (Number(bill.lastUpdatedAt.slice(0, 4)) !== year) continue
    const date = bill.lastUpdatedAt.slice(0, 10)
    totals.set(date, (totals.get(date) ?? 0) + 1)
  }

  return ParliamentBillActivitySchema.parse({
    year,
    availableYears,
    days: Array.from(totals, ([date, total]) => ({ date, total })).sort(
      (a, b) => a.date.localeCompare(b.date),
    ),
  })
}

function filterBills(search: ParliamentBillsSearch): ParliamentBillSummary[] {
  let result = [...bills]

  if (search.billType) {
    result = result.filter((bill) => bill.billType === search.billType)
  }
  if (search.billLocation) {
    result = result.filter(
      (bill) => bill.currentLocation === search.billLocation,
    )
  }
  if (search.q?.trim()) {
    const query = search.q.trim().toLowerCase()
    result = result.filter(
      (bill) =>
        bill.title.toLowerCase().includes(query) ||
        bill.number.toLowerCase().includes(query),
    )
  }

  const sortBy = search.sortBy ?? 'updated_desc'
  result.sort((a, b) => {
    switch (sortBy) {
      case 'title_asc':
        return a.title.localeCompare(b.title, 'ro')
      case 'title_desc':
        return b.title.localeCompare(a.title, 'ro')
      case 'updated_asc':
        return (
          new Date(a.lastUpdatedAt).getTime() -
          new Date(b.lastUpdatedAt).getTime()
        )
      case 'updated_desc':
      default:
        return (
          new Date(b.lastUpdatedAt).getTime() -
          new Date(a.lastUpdatedAt).getTime()
        )
    }
  })

  return result
}

function paginateBills(
  search: ParliamentBillsSearch,
  filtered: ParliamentBillSummary[],
): ParliamentBillList {
  const pageSize = search.pageSize ?? DEFAULT_BILLS_PAGE_SIZE
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages)
  const start = (page - 1) * pageSize
  const slice = filtered.slice(start, start + pageSize)

  return ParliamentBillListSchema.parse({
    bills: slice,
    total,
    page,
    pageSize,
    totalPages,
  })
}

function buildBillRelatedVotes(billId: string): ParliamentBillRelatedVote[] {
  return voteSummaries
    .filter((vote) => vote.relatedBillId === billId)
    .map((vote) => ({
      voteId: vote.voteId,
      // Bill-related-vote rows still speak camera|senat (live mapper collapses
      // joint sittings the same way); no comun votes in the fixtures.
      chamber: vote.chamber === 'comun' ? ('camera' as const) : vote.chamber,
      title: vote.title,
      heldAt: vote.heldAt,
      outcome: vote.outcome,
    }))
    .sort((a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime())
}

export async function fetchParliamentBillsMock(
  search: ParliamentBillsSearch = {},
): Promise<ParliamentBillList> {
  const filtered = filterBills(search)
  return paginateBills(search, filtered)
}

export async function fetchParliamentBillDetailMock(
  billId: string,
): Promise<ParliamentBillDetail | null> {
  const summary = bills.find((bill) => bill.billId === billId)
  if (!summary) return null

  const relatedVotes = buildBillRelatedVotes(billId)
  const raw = billDetailsMap[billId]
  if (raw) {
    const detail = ParliamentBillDetailSchema.parse(raw)
    return relatedVotes.length > 0 && detail.relatedVotes.length === 0
      ? { ...detail, relatedVotes }
      : detail
  }

  return resolveParliamentBillDetail(summary, relatedVotes)
}

export async function fetchParliamentBillRelatedVotesMock(
  billId: string,
): Promise<readonly ParliamentBillRelatedVote[]> {
  return buildBillRelatedVotes(billId)
}

export async function fetchParliamentVoteDetailMock(
  chamber: ParliamentChamber,
  voteId: string,
): Promise<ParliamentVoteDetail | null> {
  const raw = voteDetailsMap[voteId]
  if (raw) {
    const detail = ParliamentVoteDetailSchema.parse(raw)
    if (detail.chamber !== chamber) return null
    if (
      detail.memberVotes.length > 0 &&
      detail.groupBreakdown.length > 0 &&
      voteDetailBreakdownMatchesTally(detail)
    ) {
      return detail
    }
    return synthesizeVoteDetail(detail, members, groups)
  }

  const summary = voteSummaries.find(
    (v) => v.voteId === voteId && v.chamber === chamber,
  )
  if (!summary) return null
  return synthesizeVoteDetail(summary, members, groups)
}

export function getVoteDivisionNumberMock(voteId: string): number | undefined {
  return divisionNumbersByVoteId.get(voteId)
}

export function getParliamentVoteSummaryMock(
  chamber: ParliamentChamber,
  voteId: string,
): ParliamentVoteSummary | undefined {
  return voteSummaries.find(
    (vote) => vote.voteId === voteId && vote.chamber === chamber,
  )
}

export function getParliamentGroupColorMapMock(): Readonly<
  Record<string, string>
> {
  return groupColorMap
}

export function getMemberJudetMapMock(): Readonly<Record<string, string>> {
  return Object.fromEntries(
    members.map((member) => [member.memberId, member.judetName]),
  )
}

const MOCK_MEMBER_VOTES_PAGE_SIZE = 50

/** Map a GraphQL chamber token to the UI chamber a mock vote carries, or null
 * (`comun` — the mock has no joint votes, so a joint-session filter matches none). */
function mockChamberForToken(token: string): ParliamentChamber | null {
  if (token === 'senat') return 'senat'
  if (token === 'camera_deputatilor') return 'camera'
  return null // comun (or anything unexpected)
}

/**
 * Apply the GraphQL-shape member-votes filter to the mock voting-history rows.
 * Mirrors the server semantics: choice `in`, outcome `eq`, chamber `eq` (session),
 * and the inclusive vote-date range on `heldAt`.
 */
function applyMemberVotesFilter(
  votes: ParliamentMemberVotingHistory['votes'],
  filter: MemberVotesFilterInput | undefined,
): ParliamentMemberVotingHistory['votes'] {
  if (!filter) return votes
  // Compare DATE PARTS lexically (YYYY-MM-DD), like the server does on
  // vote_date. Timestamp comparison is timezone-dependent: under TZ=UTC a vote
  // held at 2026-05-15T00:00:00+03:00 sits before 2026-05-15T00:00:00Z and
  // would drop out of its own day.
  const from = filter.voteDate?.gte
  const to = filter.voteDate?.lte
  const chamber = filter.chamber
    ? mockChamberForToken(filter.chamber.eq)
    : undefined
  return votes.filter((vote) => {
    if (
      filter.choice &&
      (!vote.choice || !filter.choice.in.includes(vote.choice))
    )
      return false
    if (filter.outcome && vote.outcome !== filter.outcome.eq) return false
    if (filter.chamber && vote.chamber !== chamber) return false
    const day = vote.heldAt.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })
}

export async function fetchParliamentMemberVotingHistoryMock(
  memberId: string,
  after?: string,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVotingHistory | null> {
  const history = buildMemberVotingHistory(memberId)
  if (!history) return null
  const filtered = applyMemberVotesFilter(history.votes, filter)
  // Emulate the live cursor connection: the cursor is the numeric offset of
  // the next page (opaque to the UI, which only passes endCursor back).
  const start = after ? Math.max(0, Number.parseInt(after, 10) || 0) : 0
  const votes = filtered.slice(start, start + MOCK_MEMBER_VOTES_PAGE_SIZE)
  const end = start + votes.length
  const hasNextPage = end < filtered.length
  return {
    ...history,
    votes,
    total: filtered.length,
    hasNextPage,
    endCursor: hasNextPage ? String(end) : null,
  }
}

export async function fetchParliamentMemberVoteActivityMock(
  memberId: string,
  year: number,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVoteActivity | null> {
  const history = buildMemberVotingHistory(memberId)
  if (!history) return null
  // The activity aggregate is bounded by `year`; a date filter is never sent
  // here, so strip it before applying (parity with the server contract).
  const dateStripped: MemberVotesFilterInput | undefined = filter
    ? { ...filter, voteDate: undefined }
    : undefined
  const filtered = applyMemberVotesFilter(history.votes, dateStripped)

  const availableYears = Array.from(
    new Set(filtered.map((v) => Number(v.heldAt.slice(0, 4)))),
  )
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a)

  const dayMap = new Map<string, ParliamentMemberVoteActivity['days'][number]>()
  for (const vote of filtered) {
    if (Number(vote.heldAt.slice(0, 4)) !== year) continue
    const date = vote.heldAt.slice(0, 10)
    const day = dayMap.get(date) ?? {
      date,
      total: 0,
      pentru: 0,
      impotriva: 0,
      abtinere: 0,
      nuAVotat: 0,
      conflicting: 0,
      unknown: 0,
    }
    day.total += 1
    if (vote.positionStatus === 'conflicting_choice') day.conflicting += 1
    else if (vote.positionStatus !== 'confirmed') day.unknown += 1
    else if (vote.choice === 'pentru') day.pentru += 1
    else if (vote.choice === 'impotriva') day.impotriva += 1
    else if (vote.choice === 'abtinere') day.abtinere += 1
    else if (vote.choice === 'nu_a_votat') day.nuAVotat += 1
    dayMap.set(date, day)
  }

  return ParliamentMemberVoteActivitySchema.parse({
    year,
    availableYears,
    days: Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  })
}

// ── member speeches (interventii) ────────────────────────────────────────────

const MOCK_MEMBER_SPEECHES_PAGE_SIZE = 50

/** One deterministic mock speech template (chamber resolved per member). */
export type MockSpeechTemplate = {
  readonly date: string
  /** 'own' → the member's own chamber; 'comun' → a joint sitting. */
  readonly sitting: 'own' | 'comun'
  readonly title: string | undefined
  readonly summary: string
  readonly fullText: string | undefined
}

/**
 * Fixed set of mock speech turns, spread across 2026 + 2025, with own-chamber
 * and joint-sitting rows, some with a title, some with a transcript. Same shape
 * for every member so `VITE_USE_MOCK_DATA=true` and the unit tests are stable.
 * Note: two 2026-05-13 and two 2025-06-15 rows exercise the multi-turn day.
 */
export const MOCK_SPEECH_TEMPLATES: readonly MockSpeechTemplate[] = [
  {
    date: '2026-05-13',
    sitting: 'own',
    title: 'Dezbatere privind bugetul educației',
    summary:
      'Mulțumesc, domnule președinte. Voi adresa o întrebare despre bugetul educației.',
    fullText:
      'Domnul deputat:\nMulțumesc, domnule președinte de ședință.\nVoi adresa o întrebare domnului ministru al educației despre alocările bugetare pentru anul în curs.',
  },
  {
    date: '2026-05-13',
    sitting: 'own',
    title: undefined,
    summary: 'Domnul vorbitor:',
    fullText: undefined,
  },
  {
    date: '2026-05-11',
    sitting: 'comun',
    title: 'Ședință comună privind sănătatea publică',
    summary:
      'Este vorba despre proiectul de lege privind sănătatea publică și rețeaua de spitale.',
    fullText:
      'Foarte scurt, domnule președinte.\nEste vorba despre proiectul de lege privind sănătatea publică.',
  },
  {
    date: '2026-03-20',
    sitting: 'comun',
    title: undefined,
    summary: 'Susțin amendamentul colegilor mei privind investițiile locale.',
    fullText:
      'Domnul senator:\nSusțin amendamentul depus de colegii mei privind investițiile în infrastructura locală.',
  },
  {
    date: '2026-02-10',
    sitting: 'own',
    title: 'Intervenție privind transparența administrației',
    summary:
      'O intervenție scurtă despre transparența administrației publice locale.',
    fullText: undefined,
  },
  {
    date: '2025-11-05',
    sitting: 'own',
    title: undefined,
    summary:
      'Vă mulțumesc pentru cuvânt. Câteva precizări despre transporturi.',
    fullText:
      'Vă mulțumesc pentru cuvânt.\nAm câteva precizări de făcut pe marginea proiectului privind transporturile.',
  },
  {
    date: '2025-10-01',
    sitting: 'comun',
    title: 'Moțiune simplă privind agricultura',
    summary: 'Poziția grupului privind moțiunea simplă pe agricultură.',
    fullText: undefined,
  },
  {
    date: '2025-06-15',
    sitting: 'own',
    title: undefined,
    summary: 'Domnul vorbitor:',
    fullText:
      'Domnul deputat:\nContinuăm dezbaterea privind fondurile europene alocate dezvoltării regionale.',
  },
  {
    date: '2025-06-15',
    sitting: 'own',
    title: 'Continuarea dezbaterii privind fondurile europene',
    summary:
      'Continuare a dezbaterii despre fondurile europene și absorbția lor.',
    fullText:
      'Continuăm dezbaterea privind fondurile europene și gradul de absorbție la nivel regional.',
  },
]

/** The member's own-chamber GraphQL token. */
export function mockOwnChamberToken(chamber: ParliamentChamber): string {
  return chamber === 'camera' ? 'camera_deputatilor' : 'senat'
}

/**
 * The mock sitting a turn belongs to — one captured sitting per (chamber, day),
 * the same grain the real canonical lane uses. Lives here (not in the stenogram
 * mock) so BOTH the member tab and the global corpus can stamp the same key
 * without importing each other.
 */
export function mockSessionKeyFor(chamber: string, day: string): string {
  return `canon:mock:${chamber}:${day}`
}

/**
 * The extended mock roster (fixture members + synthesized fill), shared with
 * the global-stenograme mock module so global speech turns reuse the SAME
 * speech keys and speaker identities as the member interventii tab.
 */
export const MOCK_PARLIAMENT_MEMBERS: readonly ParliamentMember[] = members

function buildMemberSpeeches(
  memberId: string,
): ParliamentMemberSpeechesHistory['speeches'] | null {
  const member = members.find((m) => m.memberId === memberId)
  if (!member) return null
  const own = mockOwnChamberToken(member.chamber)
  return MOCK_SPEECH_TEMPLATES.map((tpl, index) => {
    const chamber = tpl.sitting === 'own' ? own : 'comun'
    // Senate stenograms carry no per-turn anchor → lossy_root; CDEP/joint → exact.
    const lossy = chamber === 'senat'
    return {
      speechKey: `${memberId}:sp:${index}`,
      spokenAt: tpl.date,
      title: tpl.title,
      summary: tpl.summary,
      chamber,
      sourceUrl: lossy
        ? 'https://www.senat.ro/Legis/lista.aspx'
        : `https://www.cdep.ro/pls/steno/steno2015.stenograma?ids=${9000 + index}`,
      sourceUrlKind: lossy ? 'lossy_root' : 'exact',
      fullText: tpl.fullText,
      // Canonical pointers. `position` is deliberately NOT stamped here: the
      // member tab does not know a turn's place in the printed order, and the
      // reader anchors on the speech key anyway. Absent is the honest value.
      isCanonical: true,
      sessionKey: mockSessionKeyFor(chamber, tpl.date),
    }
  })
}

/** Map a session GraphQL chamber token to the mock speech chamber it matches. */
function applyMemberSpeechesFilter(
  speeches: ParliamentMemberSpeechesHistory['speeches'],
  filter: MemberSpeechesFilterInput | undefined,
  q: string | undefined,
): ParliamentMemberSpeechesHistory['speeches'] {
  const from = filter?.spokenAt?.gte
  const to = filter?.spokenAt?.lte
  const chamber = filter?.chamber?.eq
  const needle = q?.trim().toLowerCase()
  return speeches.filter((speech) => {
    if (chamber && speech.chamber !== chamber) return false
    // Compare DATE PARTS lexically (YYYY-MM-DD), like the server — timestamp
    // comparison would be timezone-dependent (the votes-slice lesson).
    const day = speech.spokenAt.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    if (needle) {
      const haystack = [speech.title, speech.summary, speech.fullText]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export async function fetchParliamentMemberSpeechesMock(
  memberId: string,
  after?: string,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechesHistory | null> {
  const all = buildMemberSpeeches(memberId)
  if (!all) return null
  // Keyset order = spokenAt desc (then insertion order for same-day turns).
  const ordered = [...all].sort((a, b) => b.spokenAt.localeCompare(a.spokenAt))
  const filtered = applyMemberSpeechesFilter(ordered, filter, q)
  const start = after ? Math.max(0, Number.parseInt(after, 10) || 0) : 0
  const speeches = filtered.slice(start, start + MOCK_MEMBER_SPEECHES_PAGE_SIZE)
  const end = start + speeches.length
  const hasNextPage = end < filtered.length
  return ParliamentMemberSpeechesHistorySchema.parse({
    memberId,
    speeches,
    total: filtered.length,
    hasNextPage,
    endCursor: hasNextPage ? String(end) : null,
  })
}

export async function fetchParliamentMemberSpeechActivityMock(
  memberId: string,
  year: number,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechActivity | null> {
  const all = buildMemberSpeeches(memberId)
  if (!all) return null
  // The activity aggregate is bounded by `year`; a date filter is never sent
  // here, so strip it before applying (parity with the server contract).
  const dateStripped: MemberSpeechesFilterInput | undefined = filter
    ? { ...filter, spokenAt: undefined }
    : undefined
  const filtered = applyMemberSpeechesFilter(all, dateStripped, q)

  const availableYears = Array.from(
    new Set(filtered.map((s) => Number(s.spokenAt.slice(0, 4)))),
  )
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a)

  const dayMap = new Map<
    string,
    ParliamentMemberSpeechActivity['days'][number]
  >()
  for (const speech of filtered) {
    if (Number(speech.spokenAt.slice(0, 4)) !== year) continue
    const date = speech.spokenAt.slice(0, 10)
    const day = dayMap.get(date) ?? { date, total: 0, proprie: 0, comun: 0 }
    day.total += 1
    if (speech.chamber === 'comun') day.comun += 1
    else day.proprie += 1
    dayMap.set(date, day)
  }

  return ParliamentMemberSpeechActivitySchema.parse({
    year,
    availableYears,
    days: Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  })
}

export async function fetchParliamentMemberProfileMock(
  memberId: string,
): Promise<ParliamentMemberProfile | null> {
  const member = members.find((entry) => entry.memberId === memberId)
  if (!member) return null
  return resolveParliamentMemberProfile(member)
}

const MOCK_INITIATIVES_TOTAL = 14
const MOCK_INITIATIVES_PAGE_SIZE = 10

export async function fetchParliamentMemberInitiativesMock(
  memberId: string,
  page = 1,
  pageSize = MOCK_INITIATIVES_PAGE_SIZE,
): Promise<ParliamentMemberInitiativesList | null> {
  if (!members.some((m) => m.memberId === memberId)) return null
  const total = MOCK_INITIATIVES_TOTAL
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  // Deterministic, latest-first synthetic list (mirrors the live DESC order).
  const initiatives = Array.from({ length: total }, (_, i) => {
    const day = String(Math.max(1, 28 - i)).padStart(2, '0')
    return {
      initiativeId: `${memberId}-init-${i + 1}`,
      title: `Propunere legislativă privind tema ${i + 1}`,
      registeredAt: `2026-05-${day}T00:00:00+03:00`,
      status: i % 3 === 0 ? 'Lege 100/2025' : 'în dezbatere',
      promulgatedLawNumber: i % 3 === 0 ? '100' : undefined,
      promulgatedLawYear: i % 3 === 0 ? 2025 : undefined,
    }
  }).slice(start, start + pageSize)

  return ParliamentMemberInitiativesListSchema.parse({
    memberId,
    initiatives,
    total,
    page: safePage,
    pageSize,
    totalPages,
  })
}

export async function fetchParliamentJudeteMock(): Promise<
  ReadonlyArray<{ slug: string; name: string }>
> {
  return judeteData as ReadonlyArray<{ slug: string; name: string }>
}

// ── data freshness ──────────────────────────────────────────────────────────

export async function fetchParliamentFreshnessMock(): Promise<ParliamentDataFreshness> {
  const latest = voteSummaries.reduce<string | null>((max, v) => {
    return !max || v.heldAt > max ? v.heldAt : max
  }, null)
  return ParliamentDataFreshnessSchema.parse({
    ...(latest ? { latestVoteDate: latest.slice(0, 10) } : {}),
    lastLoadedAt: MOCK_LAST_SYNCED,
  })
}

// ── committees ────────────────────────────────────────────────────────────

type MockCommitteeDetailRaw = {
  members: unknown[]
  linkedBillIds: string[]
  linkedBillsTotal: number
  meetingsCount: number
  documents: unknown[]
}

const committeeList = committeesData.committees.map((c) =>
  ParliamentCommitteeSchema.parse(c),
)
const committeeDetailsRaw = committeesData.details as Record<
  string,
  MockCommitteeDetailRaw
>

export async function fetchParliamentCommitteesMock(params: {
  chamber?: string
  legislature?: string
  first?: number
  after?: string
}): Promise<{
  committees: ParliamentCommittee[]
  hasNextPage: boolean
  endCursor?: string
}> {
  // Mirror the live filters: chamber + legislature (absent legislature → all
  // legislatures, so the mock reflects the browse default vs "toate" behaviour).
  const filtered = committeeList.filter(
    (c) =>
      (!params.chamber || c.chamber === params.chamber) &&
      (!params.legislature || c.legislature === params.legislature),
  )
  return { committees: filtered, hasNextPage: false }
}

export async function fetchParliamentCommitteeMock(
  committeeKey: string,
): Promise<ParliamentCommitteeDetail | null> {
  const base = committeeList.find((c) => c.committeeKey === committeeKey)
  const detail = committeeDetailsRaw[committeeKey]
  if (!base || !detail) return null
  const linkedBills = detail.linkedBillIds
    .map((id) => bills.find((b) => b.billId === id))
    .filter((b): b is ParliamentBillSummary => Boolean(b))
  return ParliamentCommitteeDetailSchema.parse({
    ...base,
    members: detail.members,
    linkedBills,
    linkedBillsTotal: detail.linkedBillsTotal,
    meetingsCount: detail.meetingsCount,
  })
}

/** Page size the mock emulates. Small on purpose, so "load more" is exercised. */
const MOCK_COMMITTEE_DOCUMENTS_PAGE_SIZE = 3

export async function fetchParliamentCommitteeDocumentsMock(
  committeeKey: string,
  after?: string,
): Promise<ParliamentCommitteeDocumentPage> {
  const detail = committeeDetailsRaw[committeeKey]
  const all = (detail?.documents ?? []).map((d) =>
    ParliamentCommitteeDocumentSchema.parse(d),
  )
  // Emulate the live cursor connection: the cursor is the numeric offset of the
  // next page (opaque to the UI, which only passes endCursor back).
  const start = after ? Math.max(0, Number.parseInt(after, 10) || 0) : 0
  const documents = all.slice(start, start + MOCK_COMMITTEE_DOCUMENTS_PAGE_SIZE)
  const end = start + documents.length
  const hasNextPage = end < all.length
  return ParliamentCommitteeDocumentPageSchema.parse({
    documents,
    total: all.length,
    hasNextPage,
    endCursor: hasNextPage ? String(end) : null,
  })
}
