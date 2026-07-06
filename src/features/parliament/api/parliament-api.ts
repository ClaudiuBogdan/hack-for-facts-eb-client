/**
 * Parliament API facade. Routes every call to the live redesign-GraphQL module
 * or the JSON mock fixtures based on `isParliamentMockEnabled()` (mirrors the
 * private-companies pilot). UI components import only from here; the mock/live
 * split is invisible to them and the returned data shapes are identical.
 *
 * The four synchronous getters (`getParliamentGroupColorMap`, `getMemberJudetMap`,
 * `getVoteDivisionNumber`, `getParliamentVoteSummary`) are read at render — and
 * one at module scope (the vote-detail route). They cannot await live data, so
 * the live implementations resolve from pure derivation (group colour) or a
 * module-level cache primed by the async fetchers (vote summaries / divisions).
 * `getMemberJudetMap` has no live backing (ballots carry no constituency) and
 * returns an empty map in live mode — a documented server gap, not fabrication.
 */
import type {
  ParliamentBillDetail,
  ParliamentBillList,
  ParliamentBillRelatedVote,
  ParliamentBillsSearch,
  ParliamentChamber,
  ParliamentChamberComposition,
  ParliamentCommittee,
  ParliamentCommitteeDetail,
  ParliamentDataFreshness,
  ParliamentGroup,
  ParliamentHubData,
  ParliamentMember,
  ParliamentMemberProfile,
  ParliamentMemberInitiativesList,
  ParliamentMemberVotingHistory,
  ParliamentMembersList,
  ParliamentMembersSearch,
  ParliamentVoteDetail,
  ParliamentVoteSummary,
  ParliamentVotesList,
  ParliamentVotesSearch,
} from '@/schemas/parliament'
import { isParliamentMockEnabled } from '../lib/mock-mode'
import {
  PARLIAMENT_GROUP_FALLBACK_COLOR,
  resolveGroupColor,
} from '../lib/group-colors'
import {
  getMemberJudetCache,
  lookupDivisionNumber,
  lookupVoteSummary,
} from './graphql/vote-summary-cache'
import {
  fetchParliamentBillDetailMock,
  fetchParliamentBillRelatedVotesMock,
  fetchParliamentBillsMock,
  fetchParliamentChamberCompositionMock,
  fetchParliamentGroupMembersMock,
  fetchParliamentGroupMock,
  fetchParliamentGroupsMock,
  fetchParliamentHubMock,
  fetchParliamentJudeteMock,
  fetchParliamentMemberInitiativesMock,
  fetchParliamentMemberMock,
  fetchParliamentMemberProfileMock,
  fetchParliamentMemberVotingHistoryMock,
  fetchParliamentMembersMock,
  fetchParliamentCommitteeMock,
  fetchParliamentCommitteesMock,
  fetchParliamentFreshnessMock,
  fetchParliamentVoteDetailMock,
  fetchParliamentVotesMock,
  getMemberJudetMapMock,
  getParliamentGroupColorMapMock,
  getParliamentVoteSummaryMock,
  getVoteDivisionNumberMock,
} from './parliament-api.mock'
import {
  fetchParliamentBillDetailLive,
  fetchParliamentBillRelatedVotesLive,
  fetchParliamentBillsLive,
  fetchParliamentChamberCompositionLive,
  fetchParliamentGroupLive,
  fetchParliamentGroupMembersLive,
  fetchParliamentGroupsLive,
  fetchParliamentHubLive,
  fetchParliamentJudeteLive,
  fetchParliamentMemberInitiativesLive,
  fetchParliamentMemberLive,
  fetchParliamentMemberProfileLive,
  fetchParliamentMemberVotingHistoryLive,
  fetchParliamentMembersLive,
  fetchParliamentCommitteeLive,
  fetchParliamentCommitteesLive,
  fetchParliamentFreshnessLive,
  fetchParliamentVoteDetailLive,
  fetchParliamentVotesLive,
} from './parliament-api.live'

export async function fetchParliamentHub(): Promise<ParliamentHubData> {
  return isParliamentMockEnabled()
    ? fetchParliamentHubMock()
    : fetchParliamentHubLive()
}

export async function fetchParliamentMembers(
  search: ParliamentMembersSearch = {},
): Promise<ParliamentMembersList> {
  return isParliamentMockEnabled()
    ? fetchParliamentMembersMock(search)
    : fetchParliamentMembersLive(search)
}

export async function fetchParliamentChamberComposition(
  chamber: ParliamentChamber,
  search: ParliamentMembersSearch = {},
): Promise<ParliamentChamberComposition> {
  return isParliamentMockEnabled()
    ? fetchParliamentChamberCompositionMock(chamber, search)
    : fetchParliamentChamberCompositionLive(chamber, search)
}

export async function fetchParliamentMember(
  memberId: string,
): Promise<ParliamentMember | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberMock(memberId)
    : fetchParliamentMemberLive(memberId)
}

export async function fetchParliamentGroups(
  chamber?: 'camera' | 'senat',
): Promise<ParliamentGroup[]> {
  return isParliamentMockEnabled()
    ? fetchParliamentGroupsMock(chamber)
    : fetchParliamentGroupsLive(chamber)
}

export async function fetchParliamentGroup(
  groupId: string,
): Promise<ParliamentGroup | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentGroupMock(groupId)
    : fetchParliamentGroupLive(groupId)
}

export async function fetchParliamentGroupMembers(
  groupId: string,
): Promise<ParliamentMember[]> {
  return isParliamentMockEnabled()
    ? fetchParliamentGroupMembersMock(groupId)
    : fetchParliamentGroupMembersLive(groupId)
}

export async function fetchParliamentVotes(
  search: ParliamentVotesSearch = {},
): Promise<ParliamentVotesList> {
  return isParliamentMockEnabled()
    ? fetchParliamentVotesMock(search)
    : fetchParliamentVotesLive(search)
}

export async function fetchParliamentBills(
  search: ParliamentBillsSearch = {},
): Promise<ParliamentBillList> {
  return isParliamentMockEnabled()
    ? fetchParliamentBillsMock(search)
    : fetchParliamentBillsLive(search)
}

export async function fetchParliamentBillDetail(
  billId: string,
): Promise<ParliamentBillDetail | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentBillDetailMock(billId)
    : fetchParliamentBillDetailLive(billId)
}

export async function fetchParliamentBillRelatedVotes(
  billId: string,
): Promise<readonly ParliamentBillRelatedVote[]> {
  return isParliamentMockEnabled()
    ? fetchParliamentBillRelatedVotesMock(billId)
    : fetchParliamentBillRelatedVotesLive(billId)
}

export async function fetchParliamentVoteDetail(
  chamber: ParliamentChamber,
  voteId: string,
): Promise<ParliamentVoteDetail | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentVoteDetailMock(chamber, voteId)
    : fetchParliamentVoteDetailLive(chamber, voteId)
}

export async function fetchParliamentMemberVotingHistory(
  memberId: string,
): Promise<ParliamentMemberVotingHistory | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberVotingHistoryMock(memberId)
    : fetchParliamentMemberVotingHistoryLive(memberId)
}

export async function fetchParliamentMemberProfile(
  memberId: string,
): Promise<ParliamentMemberProfile | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberProfileMock(memberId)
    : fetchParliamentMemberProfileLive(memberId)
}

export async function fetchParliamentMemberInitiatives(
  memberId: string,
  page?: number,
  pageSize?: number,
): Promise<ParliamentMemberInitiativesList | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberInitiativesMock(memberId, page, pageSize)
    : fetchParliamentMemberInitiativesLive(memberId, page, pageSize)
}

export async function fetchParliamentJudete(): Promise<
  ReadonlyArray<{ slug: string; name: string }>
> {
  return isParliamentMockEnabled()
    ? fetchParliamentJudeteMock()
    : fetchParliamentJudeteLive()
}

export async function fetchParliamentFreshness(): Promise<ParliamentDataFreshness> {
  return isParliamentMockEnabled()
    ? fetchParliamentFreshnessMock()
    : fetchParliamentFreshnessLive()
}

export async function fetchParliamentCommittees(params: {
  chamber?: string
  legislature?: string
  first?: number
  after?: string
} = {}): Promise<{
  committees: ParliamentCommittee[]
  hasNextPage: boolean
  endCursor?: string
}> {
  return isParliamentMockEnabled()
    ? fetchParliamentCommitteesMock(params)
    : fetchParliamentCommitteesLive(params)
}

export async function fetchParliamentCommittee(
  committeeKey: string,
): Promise<ParliamentCommitteeDetail | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentCommitteeMock(committeeKey)
    : fetchParliamentCommitteeLive(committeeKey)
}

// ── synchronous getters (render-time) ───────────────────────────────────────

export function getVoteDivisionNumber(voteId: string): number | undefined {
  return isParliamentMockEnabled()
    ? getVoteDivisionNumberMock(voteId)
    : lookupDivisionNumber(voteId)
}

export function getParliamentVoteSummary(
  chamber: ParliamentChamber,
  voteId: string,
): ParliamentVoteSummary | undefined {
  return isParliamentMockEnabled()
    ? getParliamentVoteSummaryMock(chamber, voteId)
    : lookupVoteSummary(chamber, voteId)
}

/**
 * Group → colour map. Group colour is not a stored field, so this returns a
 * derive-on-access object: any `groupId` (`<slug>-<chamber>`) resolves to its
 * party brand colour via the single `resolveGroupColor` resolver (the chamber
 * suffix is folded there — colour is per party). Mock mode returns the fixture
 * map unchanged.
 */
export function getParliamentGroupColorMap(): Readonly<Record<string, string>> {
  if (isParliamentMockEnabled()) {
    return getParliamentGroupColorMapMock()
  }
  return new Proxy<Record<string, string>>(
    {},
    {
      get: (_target, prop) =>
        typeof prop === 'string'
          ? resolveGroupColor({ groupId: prop })
          : PARLIAMENT_GROUP_FALLBACK_COLOR,
    },
  )
}

/**
 * Member → county map, used to label ballot rows on the vote-detail page. In
 * live mode it's primed from the vote's ballots (each resolved ballot now
 * carries the member's `constituencyName`) when the vote detail is fetched, so
 * the județ column is populated for the votes the user opens. Mock mode returns
 * the fixture map.
 */
export function getMemberJudetMap(): Readonly<Record<string, string>> {
  return isParliamentMockEnabled() ? getMemberJudetMapMock() : getMemberJudetCache()
}

/** Pure CSV serialiser — identical in both modes. */
export function exportVoteDetailAsCsv(detail: ParliamentVoteDetail): string {
  const header = 'memberId,memberName,groupName,choice'
  const rows = detail.memberVotes.map(
    (mv) => `${mv.memberId},"${mv.memberName}","${mv.groupName}",${mv.choice}`,
  )
  return [header, ...rows].join('\n')
}
