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
  ParliamentGroup,
  ParliamentHubData,
  ParliamentMember,
  ParliamentMemberProfile,
  ParliamentMemberVotingHistory,
  ParliamentMembersList,
  ParliamentMembersSearch,
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
  ParliamentGroupSchema,
  ParliamentHubDataSchema,
  ParliamentMemberSchema,
  ParliamentMemberVotingHistorySchema,
  ParliamentMembersListSchema,
  ParliamentVoteDetailSchema,
  ParliamentVoteSummarySchema,
  ParliamentVotesListSchema,
} from '@/schemas/parliament'

import groupsData from '../mocks/groups.json'
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

const MOCK_LAST_SYNCED = '2026-05-20T08:00:00+03:00'
const DEFAULT_VOTES_PAGE_SIZE = 10
const DEFAULT_BILLS_PAGE_SIZE = 10

const groups = groupsData.map((g) => ParliamentGroupSchema.parse(g))

function buildGroupColorMap(
  groupList: ReadonlyArray<ParliamentGroup>,
): Record<string, string> {
  return Object.fromEntries(
    groupList.map((group) => [group.groupId, group.color ?? '#505a5f']),
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
  const base = voteSummariesData.map((v) => ParliamentVoteSummarySchema.parse(v))
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
          outcome: i % 4 === 0 ? 'respins' : i % 7 === 0 ? 'amânat' : 'adoptat',
          outcomeLabel:
            i % 4 === 0
              ? 'Proiectul a fost respins'
              : i % 7 === 0
                ? 'Votul a fost amânat'
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

const voteDetailsMap = voteDetailsData as Record<string, unknown>

function voteDetailBreakdownMatchesTally(detail: ParliamentVoteDetail): boolean {
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
      .sort((a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime())
    sorted.forEach((vote, index) => {
      map.set(vote.voteId, sorted.length - index)
    })
  }
  return map
}

const divisionNumbersByVoteId = getDivisionNumbersByChamber()

function parseDateBoundary(value: string | undefined, endOfDay: boolean): Date | null {
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
      return detail?.groupBreakdown?.some((g) => grupFilterValues.includes(g.groupId))
    })
  }
  return result.sort(
    (a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime(),
  )
}

function paginateVotes(
  search: ParliamentVotesSearch,
  filtered: ParliamentVoteSummary[],
): ParliamentVotesList {
  const pageSize = search.pageSize ?? DEFAULT_VOTES_PAGE_SIZE
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages)
  const start = (page - 1) * pageSize
  const slice = filtered.slice(start, start + pageSize)

  return ParliamentVotesListSchema.parse({
    votes: slice.map((vote) => ({
      ...vote,
      divisionNumber: divisionNumbersByVoteId.get(vote.voteId) ?? 1,
    })),
    total,
    page,
    pageSize,
    totalPages,
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
      voteId,
      chamber: detail.chamber,
      title: detail.title,
      heldAt: detail.heldAt,
      choice: memberVote.choice,
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

export async function fetchParliamentGroupMock(
  groupId: string,
): Promise<ParliamentGroup | null> {
  return groups.find((g) => g.groupId === groupId) ?? null
}

export async function fetchParliamentGroupMembersMock(
  groupId: string,
): Promise<ParliamentMember[]> {
  return members.filter((m) => m.groupId === groupId)
}

export async function fetchParliamentVotesMock(
  search: ParliamentVotesSearch = {},
): Promise<ParliamentVotesList> {
  const filtered = filterVotes(search)
  return paginateVotes(search, filtered)
}

function filterBills(search: ParliamentBillsSearch): ParliamentBillSummary[] {
  let result = [...bills]

  if (search.billType) {
    result = result.filter((bill) => bill.billType === search.billType)
  }
  if (search.billLocation) {
    result = result.filter((bill) => bill.currentLocation === search.billLocation)
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
        return new Date(a.lastUpdatedAt).getTime() - new Date(b.lastUpdatedAt).getTime()
      case 'updated_desc':
      default:
        return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
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
      chamber: vote.chamber,
      title: vote.title,
      heldAt: vote.heldAt,
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

export function getParliamentGroupColorMapMock(): Readonly<Record<string, string>> {
  return groupColorMap
}

export function getMemberJudetMapMock(): Readonly<Record<string, string>> {
  return Object.fromEntries(
    members.map((member) => [member.memberId, member.judetName]),
  )
}

export async function fetchParliamentMemberVotingHistoryMock(
  memberId: string,
): Promise<ParliamentMemberVotingHistory | null> {
  return buildMemberVotingHistory(memberId)
}

export async function fetchParliamentMemberProfileMock(
  memberId: string,
): Promise<ParliamentMemberProfile | null> {
  const member = members.find((entry) => entry.memberId === memberId)
  if (!member) return null
  return resolveParliamentMemberProfile(member)
}

export async function fetchParliamentJudeteMock(): Promise<
  ReadonlyArray<{ slug: string; name: string }>
> {
  return judeteData as ReadonlyArray<{ slug: string; name: string }>
}
