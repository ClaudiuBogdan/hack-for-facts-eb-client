import type {
  Candidacy,
  ContestResults,
  ContestSearch,
  ContestSummary,
  CoverageMeta,
  ElectionHubSearch,
  ElectionSummary,
  ElectionsLandingSearch,
  HeadlineContest,
  MandateAllocation,
  ReportingUnitRef,
} from '../types'
import {
  fetchContestCandidaciesMock,
  fetchContestMandatesMock,
  fetchContestResultsMock,
  fetchElectionMock,
  fetchElectionsIndexMock,
} from './elections-api.mock'

// MVP recovery slice is intentionally mock-forced. The future live cutover
// should replace this single seam after the elections API contract exists.
export type ElectionsIndexResponse = {
  readonly items: readonly ElectionSummary[]
  readonly featured: ElectionSummary | null
  readonly coverage: CoverageMeta
  readonly hiddenArchiveCount: number
}

export type ElectionResponse = {
  readonly election: ElectionSummary | null
  readonly contests: readonly ContestSummary[]
  readonly headline: readonly HeadlineContest[]
  readonly coverage: CoverageMeta | null
}

export type ContestResultsResponse = ContestResults & {
  readonly pollingStations: readonly ReportingUnitRef[]
}

export async function fetchElectionsIndex(
  search: ElectionsLandingSearch,
): Promise<ElectionsIndexResponse> {
  return fetchElectionsIndexMock(search)
}

export async function fetchElection(
  electionKey: string,
  search: ElectionHubSearch,
): Promise<ElectionResponse> {
  return fetchElectionMock(electionKey, search)
}

export async function fetchContestResults({
  contestKey,
  search,
}: {
  readonly contestKey: string
  readonly search: ContestSearch
}): Promise<ContestResultsResponse | null> {
  return fetchContestResultsMock({ contestKey, search })
}

export async function fetchContestMandates(
  contestKey: string,
): Promise<readonly MandateAllocation[]> {
  return fetchContestMandatesMock(contestKey)
}

export async function fetchContestCandidacies(
  contestKey: string,
): Promise<readonly Candidacy[]> {
  return fetchContestCandidaciesMock(contestKey)
}
