import { assertLiveApiAvailable } from '@/lib/scraper-references/mock-mode'

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
import { isElectionsMockEnabled } from '../lib/mock-mode'
import {
  fetchContestCandidaciesMock,
  fetchContestMandatesMock,
  fetchContestResultsMock,
  fetchElectionMock,
  fetchElectionsIndexMock,
} from './elections-api.mock'

const ELECTIONS_LIVE_API_ERROR =
  'Elections live API is not connected yet. Enable mock mode with VITE_USE_MOCK_DATA=true or VITE_MOCK_DATASETS=elections.'

function unavailableElectionsLiveApi(): never {
  assertLiveApiAvailable('elections', ELECTIONS_LIVE_API_ERROR)
  throw new Error(ELECTIONS_LIVE_API_ERROR)
}

// MVP recovery slice is intentionally mock-first. The future live cutover
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
  if (!isElectionsMockEnabled()) return unavailableElectionsLiveApi()
  return fetchElectionsIndexMock(search)
}

export async function fetchElection(
  electionKey: string,
  search: ElectionHubSearch,
): Promise<ElectionResponse> {
  if (!isElectionsMockEnabled()) return unavailableElectionsLiveApi()
  return fetchElectionMock(electionKey, search)
}

export async function fetchContestResults({
  contestKey,
  search,
}: {
  readonly contestKey: string
  readonly search: ContestSearch
}): Promise<ContestResultsResponse | null> {
  if (!isElectionsMockEnabled()) return unavailableElectionsLiveApi()
  return fetchContestResultsMock({ contestKey, search })
}

export async function fetchContestMandates(
  contestKey: string,
): Promise<readonly MandateAllocation[]> {
  if (!isElectionsMockEnabled()) return unavailableElectionsLiveApi()
  return fetchContestMandatesMock(contestKey)
}

export async function fetchContestCandidacies(
  contestKey: string,
): Promise<readonly Candidacy[]> {
  if (!isElectionsMockEnabled()) return unavailableElectionsLiveApi()
  return fetchContestCandidaciesMock(contestKey)
}
