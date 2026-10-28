/**
 * Parliament API facade. Routes every call to the live redesign-GraphQL module
 * or the JSON mock fixtures based on `isParliamentMockEnabled()` (mirrors the
 * private-companies pilot). UI components import only from here; the mock/live
 * split is invisible to them and the returned data shapes are identical.
 *
 * The mock modules, and the fixtures they carry, are imported on demand: only
 * in mock mode, on the first read that needs them. A static import put them in
 * every parliament page's code, live builds included. The synchronous,
 * render-time getters live in `parliament-api-sync.ts`.
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
  ParliamentVoteDetail,
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
import { fetchParliamentTranscriptLive } from './parliament-transcript-api.live'
import type { MemberVotesFilterInput } from '../lib/member-votes-filter'
import type { MemberSpeechesFilterInput } from '../lib/member-speeches-filter'
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
  fetchParliamentCommitteeDocumentsLive,
  fetchParliamentCommitteeLive,
  fetchParliamentCommitteesLive,
  fetchParliamentFreshnessLive,
  fetchParliamentBillActivityLive,
  fetchParliamentVoteActivityLive,
  fetchParliamentVoteDetailLive,
  fetchParliamentVotesLive,
} from './parliament-api.live'

// Fixtures, in their own chunks: fetched in mock mode only (see the header).
const loadParliamentMocks = () => import('./parliament-api.mock')
const loadAgendaMocks = () => import('./parliament-agenda-api.mock')
const loadSpeechesMocks = () => import('./parliament-speeches-api.mock')
const loadStenogramsMocks = () => import('./parliament-stenograms-api.mock')

export async function fetchParliamentHub(): Promise<ParliamentHubData> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentHubMock()
    : fetchParliamentHubLive()
}

export async function fetchParliamentMembers(
  search: ParliamentMembersSearch = {},
): Promise<ParliamentMembersList> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMembersMock(search)
    : fetchParliamentMembersLive(search)
}

export async function fetchParliamentChamberComposition(
  chamber: ParliamentChamber,
  search: ParliamentMembersSearch = {},
): Promise<ParliamentChamberComposition> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentChamberCompositionMock(chamber, search)
    : fetchParliamentChamberCompositionLive(chamber, search)
}

export async function fetchParliamentMember(
  memberId: string,
): Promise<ParliamentMember | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMemberMock(memberId)
    : fetchParliamentMemberLive(memberId)
}

export async function fetchParliamentGroups(
  chamber?: 'camera' | 'senat',
): Promise<ParliamentGroup[]> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentGroupsMock(chamber)
    : fetchParliamentGroupsLive(chamber)
}

export async function fetchParliamentGroup(
  groupId: string,
  legislature?: string,
): Promise<ParliamentGroup | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentGroupMock(groupId, legislature)
    : fetchParliamentGroupLive(groupId, legislature)
}

export async function fetchParliamentGroupMembers(
  groupId: string,
  legislature?: string,
): Promise<ParliamentMember[]> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentGroupMembersMock(groupId, legislature)
    : fetchParliamentGroupMembersLive(groupId, legislature)
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
    ? (await loadParliamentMocks()).fetchParliamentVotesMock(search, after)
    : fetchParliamentVotesLive(search, after)
}

export async function fetchParliamentBills(
  search: ParliamentBillsSearch = {},
): Promise<ParliamentBillList> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentBillsMock(search)
    : fetchParliamentBillsLive(search)
}

export async function fetchParliamentBillDetail(
  billId: string,
): Promise<ParliamentBillDetail | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentBillDetailMock(billId)
    : fetchParliamentBillDetailLive(billId)
}

export async function fetchParliamentBillRelatedVotes(
  billId: string,
): Promise<readonly ParliamentBillRelatedVote[]> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentBillRelatedVotesMock(billId)
    : fetchParliamentBillRelatedVotesLive(billId)
}

export async function fetchParliamentVoteDetail(
  chamber: ParliamentChamber,
  voteId: string,
): Promise<ParliamentVoteDetail | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentVoteDetailMock(chamber, voteId)
    : fetchParliamentVoteDetailLive(chamber, voteId)
}

export async function fetchParliamentMemberVotingHistory(
  memberId: string,
  after?: string,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVotingHistory | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMemberVotingHistoryMock(memberId, after, filter)
    : fetchParliamentMemberVotingHistoryLive(memberId, after, filter)
}

export async function fetchParliamentMemberVoteActivity(
  memberId: string,
  year: number,
  filter?: MemberVotesFilterInput,
): Promise<ParliamentMemberVoteActivity | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMemberVoteActivityMock(memberId, year, filter)
    : fetchParliamentMemberVoteActivityLive(memberId, year, filter)
}

export async function fetchParliamentMemberSpeeches(
  memberId: string,
  after?: string,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechesHistory | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMemberSpeechesMock(memberId, after, filter, q)
    : fetchParliamentMemberSpeechesLive(memberId, after, filter, q)
}

export async function fetchParliamentMemberSpeechActivity(
  memberId: string,
  year: number,
  filter?: MemberSpeechesFilterInput,
  q?: string,
): Promise<ParliamentMemberSpeechActivity | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMemberSpeechActivityMock(memberId, year, filter, q)
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
    ? (await loadParliamentMocks()).fetchParliamentVoteActivityMock(year, filter)
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
    ? (await loadParliamentMocks()).fetchParliamentBillActivityMock(year)
    : fetchParliamentBillActivityLive(year)
}

// ── global stenograme (all-parliament speeches page) ─────────────────────────

export async function fetchParliamentSpeeches(
  after?: string,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechesList> {
  return isParliamentMockEnabled()
    ? (await loadSpeechesMocks()).fetchParliamentSpeechesMock(after, filter, q)
    : fetchParliamentSpeechesLive(after, filter, q)
}

export async function fetchParliamentSpeechActivity(
  year: number,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechActivity | null> {
  return isParliamentMockEnabled()
    ? (await loadSpeechesMocks()).fetchParliamentSpeechActivityMock(year, filter, q)
    : fetchParliamentSpeechActivityLive(year, filter, q)
}

export async function fetchParliamentSpeechDetail(
  speechKey: string,
): Promise<ParliamentSpeech | null> {
  return isParliamentMockEnabled()
    ? (await loadSpeechesMocks()).fetchParliamentSpeechDetailMock(speechKey)
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
    ? (await loadAgendaMocks()).fetchParliamentAgendasMock(page, filter)
    : fetchParliamentAgendasLive(page, filter)
}

/** Resolves null for an unknown key — that is a 404, not an error. */
export async function fetchParliamentAgenda(
  agendaKey: string,
): Promise<ParliamentAgendaDetail | null> {
  return isParliamentMockEnabled()
    ? (await loadAgendaMocks()).fetchParliamentAgendaMock(agendaKey)
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
    ? (await loadAgendaMocks()).fetchParliamentBillSchedulingMock(billKey)
    : fetchParliamentBillSchedulingLive(billKey)
}

// ── canonical stenogram sittings (the reading surface) ──────────────────────

export async function fetchParliamentStenogramSessions(
  after?: string,
  filter?: ParliamentStenogramSessionsFilterInput,
  q?: string,
): Promise<ParliamentStenogramSessionsList> {
  return isParliamentMockEnabled()
    ? (await loadStenogramsMocks()).fetchParliamentStenogramSessionsMock(after, filter, q)
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
    ? (await loadStenogramsMocks()).fetchParliamentTranscriptMock(sessionKey)
    : fetchParliamentTranscriptLive(sessionKey, options)
}

/** A bounded SLICE of a sitting (GraphQL root). Not used by the reader. */
export async function fetchParliamentStenogramTranscript(
  sessionKey: string,
  offset?: number,
  limit?: number,
): Promise<ParliamentStenogramTranscript> {
  return isParliamentMockEnabled()
    ? (await loadStenogramsMocks()).fetchParliamentStenogramTranscriptMock(sessionKey, offset, limit)
    : fetchParliamentStenogramTranscriptLive(sessionKey, offset, limit)
}

export async function fetchParliamentSpeechContext(
  speechKey: string,
): Promise<ParliamentSpeechContext | null> {
  return isParliamentMockEnabled()
    ? (await loadStenogramsMocks()).fetchParliamentSpeechContextMock(speechKey)
    : fetchParliamentSpeechContextLive(speechKey)
}

export async function fetchParliamentMemberProfile(
  memberId: string,
): Promise<ParliamentMemberProfile | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMemberProfileMock(memberId)
    : fetchParliamentMemberProfileLive(memberId)
}

export async function fetchParliamentMemberInitiatives(
  memberId: string,
  page?: number,
  pageSize?: number,
): Promise<ParliamentMemberInitiativesList | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentMemberInitiativesMock(memberId, page, pageSize)
    : fetchParliamentMemberInitiativesLive(memberId, page, pageSize)
}

export async function fetchParliamentJudete(): Promise<
  ReadonlyArray<{ slug: string; name: string }>
> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentJudeteMock()
    : fetchParliamentJudeteLive()
}

export async function fetchParliamentFreshness(): Promise<ParliamentDataFreshness> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentFreshnessMock()
    : fetchParliamentFreshnessLive()
}

/**
 * Reads the committee directory whole (the live path follows the cursor to the
 * end). No `first`: it used to name the result size and would now name the
 * PER-PAGE size, so a caller asking for 20 would get up to 12 pages of them.
 */
export async function fetchParliamentCommittees(params: {
  chamber?: string
  legislature?: string
  after?: string
} = {}): Promise<{
  committees: ParliamentCommittee[]
  hasNextPage: boolean
  endCursor?: string
}> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentCommitteesMock(params)
    : fetchParliamentCommitteesLive(params)
}

export async function fetchParliamentCommittee(
  committeeKey: string,
): Promise<ParliamentCommitteeDetail | null> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentCommitteeMock(committeeKey)
    : fetchParliamentCommitteeLive(committeeKey)
}

/**
 * ONE page of a committee's documents. Unlike the committee browse, this does
 * not drain the cursor: 76 committees hold more than a screenful (max 2,469),
 * so the reader asks for the next page rather than waiting for all of them.
 */
export async function fetchParliamentCommitteeDocuments(
  committeeKey: string,
  after?: string,
): Promise<ParliamentCommitteeDocumentPage> {
  return isParliamentMockEnabled()
    ? (await loadParliamentMocks()).fetchParliamentCommitteeDocumentsMock(committeeKey, after)
    : fetchParliamentCommitteeDocumentsLive(committeeKey, after)
}
