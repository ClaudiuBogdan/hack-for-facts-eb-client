import { useQuery } from '@tanstack/react-query'
import type {
  ParliamentBillsSearch,
  ParliamentChamber,
  ParliamentMembersSearch,
  ParliamentVotesSearch,
} from '@/schemas/parliament'
import {
  fetchParliamentBillDetail,
  fetchParliamentBills,
  fetchParliamentGroup,
  fetchParliamentGroupMembers,
  fetchParliamentGroups,
  fetchParliamentHub,
  fetchParliamentJudete,
  fetchParliamentMember,
  fetchParliamentMemberProfile,
  fetchParliamentMemberVotingHistory,
  fetchParliamentMembers,
  fetchParliamentVoteDetail,
  fetchParliamentVotes,
} from '../api/parliament-api'

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

export function useParliamentMemberVotingHistory(memberId: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'member-votes', memberId],
    queryFn: () => fetchParliamentMemberVotingHistory(memberId),
    enabled: Boolean(memberId),
  })
}

export function useParliamentMemberProfile(memberId: string) {
  return useQuery({
    queryKey: [...PARLIAMENT_QUERY_KEY, 'member-profile', memberId],
    queryFn: () => fetchParliamentMemberProfile(memberId),
    enabled: Boolean(memberId),
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
