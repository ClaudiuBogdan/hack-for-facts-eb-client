import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type {
  ParliamentBillsSearch,
  ParliamentChamber,
  ParliamentMembersSearch,
  ParliamentVotesSearch,
  VoteChamber,
} from '@/schemas/parliament'
import type { VotesListScope } from '../lib/votes-filter-state'
import {
  fetchParliamentAgenda,
  fetchParliamentAgendas,
  fetchParliamentBillScheduling,
  fetchParliamentSpeechContext,
  fetchParliamentStenogramSessions,
  fetchParliamentTranscript,
  fetchParliamentBillDetail,
  fetchParliamentBills,
  fetchParliamentChamberComposition,
  fetchParliamentCommittee,
  fetchParliamentCommitteeDocuments,
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
  fetchParliamentBillActivity,
  fetchParliamentVoteActivity,
} from '../api/parliament-api'
import { LATEST_LEGISLATURE } from '../api/graphql/parliament-translate'
import type { ParliamentVotesFilterInput } from '../api/graphql/parliament-filters'
import type { ParliamentAgendaFilterInput } from '../api/parliament-agenda-api.live'
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

/**
 * A group as it stood in one legislature. `legislature` is part of the query key
 * because it changes the answer — memberCount is that term's seat count, and a
 * group absent from the term resolves to null.
 */
export function useParliamentGroup(groupId: string, legislature?: string) {
  // Resolved BEFORE it reaches the key, so `undefined` and the latest year are
  // one cache entry — the page asks for both (the shown term, and the latest for
  // a stable heading) and on the current term those must not be two fetches.
  const leg = legislature ?? LATEST_LEGISLATURE
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'group', groupId, leg],
    queryFn: () => fetchParliamentGroup(groupId, leg),
    enabled: Boolean(groupId),
  })
}

export function useParliamentGroupMembers(groupId: string, legislature?: string) {
  const leg = legislature ?? LATEST_LEGISLATURE
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'group-members', groupId, leg],
    queryFn: () => fetchParliamentGroupMembers(groupId, leg),
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
  chamber: VoteChamber | undefined,
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
export function useParliamentVoteKindCounts(scope: VotesListScope) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'vote-kind-counts', scope],
    queryFn: () => fetchParliamentVoteKindCounts(scope),
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

/**
 * Vote volume per day for one calendar year (the hub heatmap).
 *
 * `filter` is the SAME filter the votes list is showing, so a square counts what
 * the list beneath it would return. Without it the tooltip and the list answer
 * different questions under one gesture: on 2026-06-08 the chart said 18 while a
 * Senate-filtered list returned 10, and clicking that 18 landed on the 10.
 * Omitted on the hub, which has no filter panel.
 *
 * The filter is part of the query key, so each filter set caches separately.
 *
 * `retry: false` because the failure this query currently meets is a schema
 * error — the field is not served yet — and retrying a "Cannot query field"
 * three times only delays the message the panel is meant to show.
 */
export function useParliamentVoteActivity(
  year: number,
  filter?: ParliamentVotesFilterInput,
) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'vote-activity', year, filter ?? null],
    queryFn: () => fetchParliamentVoteActivity(year, filter),
    enabled: Boolean(year),
    retry: false,
  })
}

/**
 * Institution-wide legislative volume for one calendar year (the hub bills
 * heatmap). `retry: false` for the same reason as its vote sibling: the field
 * is not served yet, and retrying a schema error only delays the message.
 */
export function useParliamentBillActivity(year: number) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'bill-activity', year],
    queryFn: () => fetchParliamentBillActivity(year),
    enabled: Boolean(year),
    retry: false,
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

/**
 * A committee's documents, paged. Its own query — not part of the committee
 * detail — so "load more" costs one document page rather than re-fetching the
 * roster and up to 500 bills, and so a server that cannot answer it degrades
 * this section instead of blanking the page.
 */
export function useParliamentCommitteeDocuments(
  committeeKey: string,
  options: { readonly enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'committee-documents', committeeKey],
    queryFn: ({ pageParam }) =>
      fetchParliamentCommitteeDocuments(committeeKey, pageParam),
    initialPageParam: undefined as string | undefined,
    // The stuck-cursor guard belongs HERE, not in the fetcher: the fetcher draws
    // one page and forgets it, while this hook is what STORES a cursor and
    // re-supplies it on the next "Încarcă mai multe". A server that answers with
    // hasNextPage:true and the cursor it was just given would otherwise append
    // the same page on every press, forever (page params [undefined,'x','x',…] —
    // the shape reproduced against the committees browse). A cursor that does not
    // ADVANCE is therefore TERMINAL, not retried.
    getNextPageParam: (lastPage, _allPages, lastPageParam, allPageParams) => {
      if (!lastPage.hasNextPage || !lastPage.endCursor) return undefined
      if (
        lastPage.endCursor === lastPageParam ||
        allPageParams.includes(lastPage.endCursor)
      ) {
        console.warn(
          `[parliament] committee documents stopped: cursor did not advance after ${String(
            allPageParams.length,
          )} page(s).`,
        )
        return undefined
      }
      return lastPage.endCursor
    },
    enabled: Boolean(committeeKey) && (options.enabled ?? true),
  })
}

// ── plenary agenda (ordinea de zi) ───────────────────────────────────────────

export function useParliamentAgendas(page: number, filter?: ParliamentAgendaFilterInput) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'agendas', page, filter],
    queryFn: () => fetchParliamentAgendas(page, filter),
    staleTime: 5 * 60 * 1000,
  })
}

export function useParliamentAgenda(agendaKey: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'agenda', agendaKey],
    queryFn: () => fetchParliamentAgenda(agendaKey),
    staleTime: 5 * 60 * 1000,
  })
}

/** A bill's scheduling history. Enabled only when a bill key is known. */
export function useParliamentBillScheduling(billKey: string | undefined) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'bill-scheduling', billKey],
    queryFn: () => fetchParliamentBillScheduling(billKey ?? ''),
    enabled: billKey !== undefined && billKey !== '',
    staleTime: 5 * 60 * 1000,
  })
}
