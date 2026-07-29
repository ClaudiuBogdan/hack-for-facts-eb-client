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
  ParliamentGroupCohesion,
  VoteKind,
  ParliamentChamberComposition,
  ParliamentCommittee,
  ParliamentCommitteeDetail,
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
  ParliamentVoteDetail,
  ParliamentVoteSummary,
  ParliamentVotesList,
  ParliamentVotesSearch,
  VoteChamber,
} from '@/schemas/parliament'
import { isParliamentMockEnabled } from '../lib/mock-mode'
import type { ParliamentVotesFilterInput } from './graphql/parliament-filters'
import type { VotesListScope } from '../lib/votes-filter-state'
import type { ParliamentSpeechesFilterInput } from '../lib/parliament-speeches-filter'
import type { ParliamentStenogramSessionsFilterInput } from '../lib/parliament-stenogram-filter'
import type {
  ParliamentSpeech,
  ParliamentSpeechActivity,
  ParliamentSpeechContext,
  ParliamentSpeechesList,
  ParliamentAgendaDetail,
  ParliamentAgendaList,
  ParliamentBillScheduling,
  ParliamentStenogramSessionsList,
  ParliamentStenogramTranscript,
} from '@/schemas/parliament'
import {
  fetchParliamentSpeechesMock,
  fetchParliamentSpeechActivityMock,
  fetchParliamentSpeechDetailMock,
} from './parliament-speeches-api.mock'
import {
  fetchParliamentSpeechesLive,
  fetchParliamentSpeechActivityLive,
  fetchParliamentSpeechDetailLive,
} from './parliament-speeches-api.live'
import {
  fetchParliamentSpeechContextLive,
  fetchParliamentStenogramSessionsLive,
  fetchParliamentStenogramTranscriptLive,
} from './parliament-stenograms-api.live'
import {
  fetchParliamentAgendaLive,
  fetchParliamentAgendasLive,
  fetchParliamentBillSchedulingLive,
  type ParliamentAgendaFilterInput,
} from './parliament-agenda-api.live'
import {
  fetchParliamentAgendaMock,
  fetchParliamentAgendasMock,
  fetchParliamentBillSchedulingMock,
} from './parliament-agenda-api.mock'
import {
  fetchParliamentSpeechContextMock,
  fetchParliamentStenogramSessionsMock,
  fetchParliamentStenogramTranscriptMock,
  fetchParliamentTranscriptMock,
} from './parliament-stenograms-api.mock'
import { fetchParliamentTranscriptLive } from './parliament-transcript-api.live'
import type { MemberVotesFilterInput } from '../lib/member-votes-filter'
import type { MemberSpeechesFilterInput } from '../lib/member-speeches-filter'
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
  fetchParliamentMemberVoteActivityMock,
  fetchParliamentMemberVotingHistoryMock,
  fetchParliamentMemberSpeechesMock,
  fetchParliamentMemberSpeechActivityMock,
  fetchParliamentMembersMock,
  fetchParliamentCommitteeMock,
  fetchParliamentCommitteesMock,
  fetchParliamentFreshnessMock,
  fetchParliamentBillActivityMock,
  fetchParliamentVoteActivityMock,
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
  fetchParliamentGroupCohesionLive,
  fetchParliamentVoteKindCountsLive,
  fetchParliamentGroupMembersLive,
  fetchParliamentGroupsLive,
  fetchParliamentHubLive,
  fetchParliamentJudeteLive,
  fetchParliamentMemberInitiativesLive,
  fetchParliamentMemberLive,
  fetchParliamentMemberProfileLive,
  fetchParliamentMemberVoteActivityLive,
  fetchParliamentMemberVotingHistoryLive,
  fetchParliamentMemberSpeechesLive,
  fetchParliamentMemberSpeechActivityLive,
  fetchParliamentMembersLive,
  fetchParliamentCommitteeLive,
  fetchParliamentCommitteesLive,
  fetchParliamentFreshnessLive,
  fetchParliamentBillActivityLive,
  fetchParliamentVoteActivityLive,
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

/**
 * Cohesion has NO mock branch — it is served live in every mode.
 *
 * There is nothing honest to mock: cohesion is derived from ballot records the
 * fixtures do not carry, so any mock would be a fabricated claim about how
 * elected representatives voted, on a feature where `isParliamentMockEnabled`
 * gates behaviour rather than adding provenance chrome. If the live call fails
 * the panel says so, which is the truthful outcome.
 */
export async function fetchParliamentGroupCohesion(
  chamber: VoteChamber,
  window: { from: string; to: string },
): Promise<ParliamentGroupCohesion[]> {
  return fetchParliamentGroupCohesionLive(chamber, window)
}

/**
 * Vote-kind counts. Like cohesion, there is no mock branch — the buckets are a
 * server-side classification of the real corpus, and inventing counts would put
 * fabricated numbers next to every checkbox in the filter.
 */
export async function fetchParliamentVoteKindCounts(
  scope: VotesListScope,
): Promise<Record<VoteKind, number>> {
  return fetchParliamentVoteKindCountsLive(scope)
}

export async function fetchParliamentVotes(
  search: ParliamentVotesSearch = {},
  after?: string,
): Promise<ParliamentVotesList> {
  return isParliamentMockEnabled()
    ? fetchParliamentVotesMock(search, after)
    : fetchParliamentVotesLive(search, after)
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
  after?: string,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVotingHistory | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberVotingHistoryMock(memberId, after, filter)
    : fetchParliamentMemberVotingHistoryLive(memberId, after, filter)
}

export async function fetchParliamentMemberVoteActivity(
  memberId: string,
  year: number,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVoteActivity | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberVoteActivityMock(memberId, year, filter)
    : fetchParliamentMemberVoteActivityLive(memberId, year, filter)
}

export async function fetchParliamentMemberSpeeches(
  memberId: string,
  after?: string,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechesHistory | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberSpeechesMock(memberId, after, filter, q)
    : fetchParliamentMemberSpeechesLive(memberId, after, filter, q)
}

export async function fetchParliamentMemberSpeechActivity(
  memberId: string,
  year: number,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechActivity | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentMemberSpeechActivityMock(memberId, year, filter, q)
    : fetchParliamentMemberSpeechActivityLive(memberId, year, filter, q)
}

/**
 * Institution-wide vote volume per day, one calendar year at a time.
 *
 * Mock mode counts the vote fixtures. LIVE MODE REJECTS: the API has no
 * institution-wide vote aggregate yet, so this call fails until the server
 * grows `parliamentVoteActivity` — by design, so the hub states the gap rather
 * than drawing a heatmap out of the ~16 paged requests the votes connection
 * would otherwise cost.
 */
export async function fetchParliamentVoteActivity(
  year: number,
  filter?: ParliamentVotesFilterInput,
): Promise<ParliamentVoteActivity | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentVoteActivityMock(year, filter)
    : fetchParliamentVoteActivityLive(year, filter)
}

/**
 * Institution-wide legislative activity per day, for one calendar year.
 *
 * Mock mode counts the bill fixtures by their last-updated day. LIVE MODE
 * REJECTS: the API has no `parliamentBillActivity` aggregate yet, so the hub
 * card states the gap instead of counting the one page of bills it can see.
 */
export async function fetchParliamentBillActivity(
  year: number,
): Promise<ParliamentBillActivity | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentBillActivityMock(year)
    : fetchParliamentBillActivityLive(year)
}

// ── global stenograme (all-parliament speeches page) ─────────────────────────

export async function fetchParliamentSpeeches(
  after?: string,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechesList> {
  return isParliamentMockEnabled()
    ? fetchParliamentSpeechesMock(after, filter, q)
    : fetchParliamentSpeechesLive(after, filter, q)
}

export async function fetchParliamentSpeechActivity(
  year: number,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechActivity | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentSpeechActivityMock(year, filter, q)
    : fetchParliamentSpeechActivityLive(year, filter, q)
}

export async function fetchParliamentSpeechDetail(
  speechKey: string,
): Promise<ParliamentSpeech | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentSpeechDetailMock(speechKey)
    : fetchParliamentSpeechDetailLive(speechKey)
}

// ── plenary agenda (ordinea de zi) ──────────────────────────────────────────
//
// CDep only: the Senate plenary agenda is not extracted, so an empty result
// for a Senate bill is a gap in what we hold, not a fact about the bill.

export async function fetchParliamentAgendas(
  page = 1,
  filter?: ParliamentAgendaFilterInput,
): Promise<ParliamentAgendaList> {
  return isParliamentMockEnabled()
    ? fetchParliamentAgendasMock(page, filter)
    : fetchParliamentAgendasLive(page, filter)
}

/** Resolves null for an unknown key — that is a 404, not an error. */
export async function fetchParliamentAgenda(
  agendaKey: string,
): Promise<ParliamentAgendaDetail | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentAgendaMock(agendaKey)
    : fetchParliamentAgendaLive(agendaKey)
}

/**
 * Every order of business a bill was PLACED ON. Scheduling evidence only —
 * never render this as "debated on" or "voted on".
 */
export async function fetchParliamentBillScheduling(
  billKey: string,
): Promise<ParliamentBillScheduling[]> {
  return isParliamentMockEnabled()
    ? fetchParliamentBillSchedulingMock(billKey)
    : fetchParliamentBillSchedulingLive(billKey)
}

// ── canonical stenogram sittings (the reading surface) ──────────────────────

export async function fetchParliamentStenogramSessions(
  after?: string,
  filter?: ParliamentStenogramSessionsFilterInput,
  q?: string,
): Promise<ParliamentStenogramSessionsList> {
  return isParliamentMockEnabled()
    ? fetchParliamentStenogramSessionsMock(after, filter, q)
    : fetchParliamentStenogramSessionsLive(after, filter, q)
}

/**
 * The COMPLETE transcript — what the document reader uses.
 *
 * Goes over REST (`GET …/stenograms/:sessionKey/transcript`), which serves one
 * whole sitting per response and is HTTP-cacheable. The reader must never hold
 * a prefix: find-in-document, print and citation are all whole-document
 * operations.
 */
export async function fetchParliamentTranscript(
  sessionKey: string,
  options?: { readonly signal?: AbortSignal },
): Promise<ParliamentStenogramTranscript> {
  return isParliamentMockEnabled()
    ? fetchParliamentTranscriptMock(sessionKey)
    : fetchParliamentTranscriptLive(sessionKey, options)
}

/** A bounded SLICE of a sitting (GraphQL root). Not used by the reader. */
export async function fetchParliamentStenogramTranscript(
  sessionKey: string,
  offset?: number,
  limit?: number,
): Promise<ParliamentStenogramTranscript> {
  return isParliamentMockEnabled()
    ? fetchParliamentStenogramTranscriptMock(sessionKey, offset, limit)
    : fetchParliamentStenogramTranscriptLive(sessionKey, offset, limit)
}

export async function fetchParliamentSpeechContext(
  speechKey: string,
): Promise<ParliamentSpeechContext | null> {
  return isParliamentMockEnabled()
    ? fetchParliamentSpeechContextMock(speechKey)
    : fetchParliamentSpeechContextLive(speechKey)
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
