import { useQuery } from '@tanstack/react-query'
import {
  contestCandidaciesQueryKey,
  contestMandatesQueryKey,
  contestResultsQueryKey,
  electionHubQueryKey,
  electionsLandingQueryKey,
} from '@/schemas/elections'
import type {
  ContestSearch,
  ElectionHubSearch,
  ElectionsLandingSearch,
} from '../types'
import {
  fetchContestCandidacies,
  fetchContestMandates,
  fetchContestResults,
  fetchElection,
  fetchElectionsIndex,
} from '../api/elections-api'

export function useElectionsIndex(search: ElectionsLandingSearch) {
  return useQuery({
    queryKey: electionsLandingQueryKey(search),
    queryFn: () => fetchElectionsIndex(search),
  })
}

export function useElection(electionKey: string, search: ElectionHubSearch) {
  return useQuery({
    queryKey: electionHubQueryKey(electionKey, search),
    queryFn: () => fetchElection(electionKey, search),
  })
}

export function useContestResults(contestKey: string, search: ContestSearch) {
  return useQuery({
    queryKey: contestResultsQueryKey(contestKey, search),
    queryFn: () => fetchContestResults({ contestKey, search }),
  })
}

export function useContestMandates(contestKey: string) {
  return useQuery({
    queryKey: contestMandatesQueryKey(contestKey),
    queryFn: () => fetchContestMandates(contestKey),
  })
}

export function useContestCandidacies(contestKey: string) {
  return useQuery({
    queryKey: contestCandidaciesQueryKey(contestKey),
    queryFn: () => fetchContestCandidacies(contestKey),
  })
}
