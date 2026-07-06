import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type {
  ParliamentBillsSearch,
  ParliamentChamber,
  ParliamentMembersSearch,
  ParliamentVotesSearch,
} from '@/schemas/parliament'
import {
  fetchParliamentBillDetail,
  fetchParliamentBills,
  fetchParliamentChamberComposition,
  fetchParliamentCommittee,
  fetchParliamentCommittees,
  fetchParliamentFreshness,
  fetchParliamentGroup,
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
  fetchParliamentVoteDetail,
  fetchParliamentVotes,
} from '../api/parliament-api'
import type { MemberVotesFilterInput } from '../lib/member-votes-filter'
import type { MemberSpeechesFilterInput } from '../lib/member-speeches-filter'

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

export function useParliamentVotes(search: ParliamentVotesSearch) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'votes', search],
    queryFn: () => fetchParliamentVotes(search),
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

export function useParliamentCommittee(committeeKey: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'committee', committeeKey],
    queryFn: () => fetchParliamentCommittee(committeeKey),
    enabled: Boolean(committeeKey),
  })
}
