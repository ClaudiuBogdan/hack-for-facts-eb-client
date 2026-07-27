import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type {
  ParliamentBillsSearch,
  ParliamentChamber,
  ParliamentMembersSearch,
  ParliamentVotesSearch,
} from '@/schemas/parliament'
import {
  fetchParliamentSpeechContext,
  fetchParliamentStenogramSessions,
  fetchParliamentTranscript,
  fetchParliamentBillDetail,
  fetchParliamentBills,
  fetchParliamentChamberComposition,
  fetchParliamentCommittee,
  fetchParliamentCommittees,
  fetchParliamentFreshness,
  fetchParliamentGroup,
  fetchParliamentGroupCohesion,
  fetchParliamentVoteKindCounts,
  fetchParliamentGroupMembers,
  fetchParliamentGroups,
  fetchParliamentHub,
  fetchParliamentJudete,
  fetchParliamentMember,
  fetchParliamentMemberInitiatives,
  fetchParliamentMemberProfile,
  fetchParliamentMemberVoteActivity,
  fetchParliamentMemberVotingHistory,
  fetchParliamentMemberSpeeches,
  fetchParliamentMemberSpeechActivity,
  fetchParliamentMembers,
  fetchParliamentSpeechActivity,
  fetchParliamentSpeechDetail,
  fetchParliamentSpeeches,
  fetchParliamentVoteDetail,
  fetchParliamentVotes,
} from '../api/parliament-api'
import type { MemberVotesFilterInput } from '../lib/member-votes-filter'
import type { MemberSpeechesFilterInput } from '../lib/member-speeches-filter'
import type { ParliamentSpeechesFilterInput } from '../lib/parliament-speeches-filter'
import type { ParliamentStenogramSessionsFilterInput } from '../lib/parliament-stenogram-filter'

const PARLIAMENT_QUERY_KEY = ['parliament'] as const

export function useParliamentHub() {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'hub'],
    queryFn: fetchParliamentHub,
  })
}

export function useParliamentMembers(search: ParliamentMembersSearch) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'members', search],
    queryFn: () => fetchParliamentMembers(search),
  })
}

function getCompositionFilterKey(search: ParliamentMembersSearch) {
  return {
    q: search.q,
    chamber: search.chamber,
    grup: search.grup,
    judet: search.judet,
  }
}

export function useParliamentChamberComposition(
  chamber: ParliamentChamber,
  search: ParliamentMembersSearch = {},
) {
  const filterKey = getCompositionFilterKey(search)

  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'composition', chamber, filterKey],
    queryFn: () => fetchParliamentChamberComposition(chamber, search),
  })
}

export function useParliamentMember(memberId: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'member', memberId],
    queryFn: () => fetchParliamentMember(memberId),
    enabled: Boolean(memberId),
  })
}

export function useParliamentGroups(chamber?: 'camera' | 'senat') {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'groups', chamber ?? 'all'],
    queryFn: () => fetchParliamentGroups(chamber),
  })
}

export function useParliamentGroup(groupId: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'group', groupId],
    queryFn: () => fetchParliamentGroup(groupId),
    enabled: Boolean(groupId),
  })
}

export function useParliamentGroupMembers(groupId: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'group-members', groupId],
    queryFn: () => fetchParliamentGroupMembers(groupId),
    enabled: Boolean(groupId),
  })
}

/**
 * Chamber-wide vote cohesion for the dossier's "cum votează grupul" panel.
 *
 * The window is computed ONCE per mount and carried in the query key, so the
 * cached rows and the window printed on screen can never describe different
 * spans of time.
 */
export function useParliamentGroupCohesion(
  chamber: ParliamentChamber | undefined,
  window: { from: string; to: string },
) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'group-cohesion', chamber, window],
    queryFn: () => fetchParliamentGroupCohesion(chamber!, window),
    enabled: Boolean(chamber),
    // A group's voting record over six months does not move minute to minute.
    staleTime: 10 * 60 * 1000,
  })
}

/** Per-kind vote counts for the filter panel. Stable enough to cache hard. */
export function useParliamentVoteKindCounts(chamber: ParliamentChamber) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'vote-kind-counts', chamber],
    queryFn: () => fetchParliamentVoteKindCounts(chamber),
    staleTime: 30 * 60 * 1000,
  })
}

/** A single (newest-first) page of votes — the hub's "recent votes" strips. */
export function useParliamentVotes(search: ParliamentVotesSearch) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'votes', search],
    queryFn: () => fetchParliamentVotes(search),
  })
}

/**
 * The chamber vote BROWSE list. `parliamentVotes` is a keyset connection with no
 * exact total, so this pages forward on the cursor instead of pretending to know
 * a page count.
 */
export function useParliamentVotesBrowse(search: ParliamentVotesSearch) {
  return useInfiniteQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'votes-browse', search],
    queryFn: ({ pageParam }) => fetchParliamentVotes(search, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage && lastPage.endCursor ? lastPage.endCursor : undefined,
  })
}

export function useParliamentVoteDetail(
  chamber: ParliamentChamber,
  voteId: string,
) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'vote', chamber, voteId],
    queryFn: () => fetchParliamentVoteDetail(chamber, voteId),
    enabled: Boolean(chamber && voteId),
  })
}

export function useParliamentMemberVotingHistory(
  memberId: string,
  filter?: MemberVotesFilterInput,
) {
  return useInfiniteQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'member-votes', memberId, filter ?? null],
    queryFn: ({ pageParam }) =>
      fetchParliamentMemberVotingHistory(memberId, pageParam, filter),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.hasNextPage && lastPage.endCursor ? lastPage.endCursor : undefined,
    enabled: Boolean(memberId),
  })
}

export function useParliamentMemberVoteActivity(
  memberId: string,
  year: number,
  filter?: MemberVotesFilterInput,
) {
  return useQuery({
    queryKey: [
      ...PARLIAMENT_QUERY_KEY,
      'member-vote-activity',
      memberId,
      year,
      filter ?? null,
    ],
    queryFn: () => fetchParliamentMemberVoteActivity(memberId, year, filter),
    enabled: Boolean(memberId && year),
    // NO placeholderData: the tab derives the default year from availableYears
    // and the grid shows per-filter intensities — stale carry-over would show
    // the wrong year/filter as if current. The aggregate is ~10ms; a brief
    // skeleton beats silently-wrong cells.
  })
}

export function useParliamentMemberSpeeches(
  memberId: string,
  filter?: MemberSpeechesFilterInput,
  q?: string,
) {
  return useInfiniteQuery({
    queryKey: [
      ...PARLIAMENT_QUERY_KEY,
      'member-speeches',
      memberId,
      filter ?? null,
      q ?? null,
    ],
    queryFn: ({ pageParam }) =>
      fetchParliamentMemberSpeeches(memberId, pageParam, filter, q),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.hasNextPage && lastPage.endCursor ? lastPage.endCursor : undefined,
    enabled: Boolean(memberId),
  })
}

export function useParliamentMemberSpeechActivity(
  memberId: string,
  year: number,
  filter?: MemberSpeechesFilterInput,
  q?: string,
) {
  return useQuery({
    queryKey: [
      ...PARLIAMENT_QUERY_KEY,
      'member-speech-activity',
      memberId,
      year,
      filter ?? null,
      q ?? null,
    ],
    queryFn: () => fetchParliamentMemberSpeechActivity(memberId, year, filter, q),
    enabled: Boolean(memberId && year),
    // NO placeholderData: same lesson as the vote-activity query — stale
    // carry-over would show the wrong year/filter cells as if current.
  })
}

// ── global stenograme (all-parliament speeches page) ─────────────────────────

export function useParliamentSpeeches(
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
) {
  return useInfiniteQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'speeches', filter ?? null, q ?? null],
    queryFn: ({ pageParam }) => fetchParliamentSpeeches(pageParam, filter, q),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage && lastPage.endCursor ? lastPage.endCursor : undefined,
  })
}

export function useParliamentSpeechActivity(
  year: number,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
) {
  return useQuery({
    queryKey: [
      ...PARLIAMENT_QUERY_KEY,
      'speech-activity',
      year,
      filter ?? null,
      q ?? null,
    ],
    queryFn: () => fetchParliamentSpeechActivity(year, filter, q),
    enabled: Boolean(year),
    // NO placeholderData: same lesson as the member activity queries — stale
    // carry-over would show the wrong year/filter cells as if current.
  })
}

export function useParliamentSpeechDetail(speechKey: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'speech', speechKey],
    queryFn: () => fetchParliamentSpeechDetail(speechKey),
    enabled: Boolean(speechKey),
  })
}

// ── canonical stenogram sittings ────────────────────────────────────────────

export function useParliamentStenogramSessions(
  filter?: ParliamentStenogramSessionsFilterInput,
  q?: string,
) {
  return useInfiniteQuery({
    queryKey: [
      ...PARLIAMENT_QUERY_KEY,
      'stenogram-sessions',
      filter ?? null,
      q ?? null,
    ],
    queryFn: ({ pageParam }) =>
      fetchParliamentStenogramSessions(pageParam, filter, q),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage && lastPage.endCursor ? lastPage.endCursor : undefined,
  })
}

/**
 * One sitting's COMPLETE ordered reading, in a single request.
 *
 * Not an infinite query, and deliberately so. The reader offers whole-document
 * operations — find-in-document, print, cite — and each is false if it runs on
 * a prefix. The REST endpoint serves one whole sitting per response (erroring
 * rather than truncating), so there is no partial state for this hook to model.
 *
 * `retry: false`: the typed failures this read produces (NOT_FOUND, a
 * SOURCE_ONLY capture) are FACTS, not flakes — retrying them three times only
 * delays the honest answer. The reader offers an explicit retry for the states
 * where one actually helps.
 */
export function useParliamentTranscript(sessionKey: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'transcript', sessionKey],
    queryFn: ({ signal }) => fetchParliamentTranscript(sessionKey, { signal }),
    enabled: Boolean(sessionKey),
    retry: false,
  })
}

export function useParliamentSpeechContext(speechKey: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'speech-context', speechKey],
    queryFn: () => fetchParliamentSpeechContext(speechKey),
    enabled: Boolean(speechKey),
    retry: false,
  })
}


export function useParliamentMemberProfile(memberId: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'member-profile', memberId],
    queryFn: () => fetchParliamentMemberProfile(memberId),
    enabled: Boolean(memberId),
  })
}

export function useParliamentMemberInitiatives(
  memberId: string,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'member-initiatives', memberId, page, pageSize],
    queryFn: () => fetchParliamentMemberInitiatives(memberId, page, pageSize),
    enabled: Boolean(memberId),
    // Keep the previous page visible while the next loads (smoother paging).
    placeholderData: (prev) => prev,
  })
}

export function useParliamentJudete() {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'judete'],
    queryFn: fetchParliamentJudete,
  })
}

export function useParliamentBills(search: ParliamentBillsSearch) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'bills', search],
    queryFn: () => fetchParliamentBills(search),
  })
}

export function useParliamentBillDetail(billId: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'bill', billId],
    queryFn: () => fetchParliamentBillDetail(billId),
    enabled: Boolean(billId),
  })
}

export function useParliamentFreshness() {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'freshness'],
    queryFn: fetchParliamentFreshness,
  })
}

export function useParliamentCommittees(params: {
  chamber?: string
  legislature?: string
} = {}) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'committees', params],
    queryFn: () => fetchParliamentCommittees(params),
  })
}

/**
 * Committee browse. `parliamentCommittees` is a cursor connection; the page used
 * to read only the first 60 rows and drop the cursor on the floor, so anything
 * past #60 was unreachable (and looked like it did not exist).
 */
export function useParliamentCommitteesBrowse(
  params: {
    chamber?: string
    legislature?: string
  } = {},
  // The browse runs TWO of these — one per chamber, because the Senate carries
  // no legislature and must not be asked for one. Whichever half the filters
  // exclude is switched off rather than fetched and discarded.
  options: { readonly enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'committees-browse', params],
    queryFn: ({ pageParam }) =>
      fetchParliamentCommittees({ ...params, ...(pageParam ? { after: pageParam } : {}) }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage && lastPage.endCursor ? lastPage.endCursor : undefined,
    enabled: options.enabled ?? true,
  })
}

export function useParliamentCommittee(committeeKey: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'committee', committeeKey],
    queryFn: () => fetchParliamentCommittee(committeeKey),
    enabled: Boolean(committeeKey),
  })
}
