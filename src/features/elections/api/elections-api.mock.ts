import type {
  ContestResultsResponse,
  ElectionResponse,
  ElectionsIndexResponse,
} from './elections-api'
import type {
  Candidacy,
  ContestSearch,
  ElectionHubSearch,
  ElectionsLandingSearch,
  HeadlineContest,
  MandateAllocation,
} from '../types'
import {
  contestSummaries,
  electionSummaries,
  electionsCoverage,
  headlineContests,
  local2024Competitors,
  localCandidacies,
  localContestResults,
  localMandates,
  localPollingStations,
  presidentialHeadline,
} from '../mocks/fixtures/elections-fixtures'

function includesText(value: string, query: string): boolean {
  return value.toLocaleLowerCase('ro-RO').includes(query.toLocaleLowerCase('ro-RO'))
}

export async function fetchElectionsIndexMock(
  search: ElectionsLandingSearch,
): Promise<ElectionsIndexResponse> {
  const includeArchive = search.arhiva === 1
  const query = search.q?.trim() ?? ''
  const familyFilter = new Set(search.family)
  const authorityFilter = new Set<string>(search.authority)

  const visible = electionSummaries.filter((election) => {
    if (!includeArchive && election.year < 2008) return false
    if (query.length > 0 && !includesText(election.name, query)) return false
    if (familyFilter.size > 0 && !familyFilter.has(election.family)) return false
    if (authorityFilter.size > 0 && !authorityFilter.has(election.authority)) return false
    if (search.year !== undefined && election.year !== search.year) return false
    if (search.yearFrom !== undefined && election.year < search.yearFrom) return false
    if (search.yearTo !== undefined && election.year > search.yearTo) return false
    if (search.round !== undefined && election.round !== search.round) return false
    return true
  })

  const sorted = [...visible].sort((left, right) => {
    if (search.sort === 'date_asc') return left.date.localeCompare(right.date)
    if (search.sort === 'name_asc') return left.name.localeCompare(right.name, 'ro')
    return right.date.localeCompare(left.date)
  })

  return {
    items: sorted,
    featured:
      electionSummaries.find(
        (election) => election.electionKey === 'prezidentiale-2025-tur-2',
      ) ?? null,
    coverage: electionsCoverage,
    hiddenArchiveCount: electionSummaries.filter((election) => election.year < 2008).length,
  }
}

export async function fetchElectionMock(
  electionKey: string,
  search: ElectionHubSearch,
): Promise<ElectionResponse> {
  const election = electionSummaries.find((item) => item.electionKey === electionKey) ?? null
  if (election === null) {
    return { election: null, contests: [], headline: [], coverage: null }
  }

  const officeFilter = new Set(search.office)
  const scopeFilter = new Set<string>(search.scope)
  const query = search.q?.trim() ?? ''
  const contests = contestSummaries.filter((contest) => {
    if (contest.electionKey !== electionKey) return false
    if (officeFilter.size > 0 && !officeFilter.has(contest.office)) return false
    if (scopeFilter.size > 0 && !scopeFilter.has(contest.scopeType)) return false
    if (
      query.length > 0 &&
      !includesText(`${contest.officeLabel} ${contest.scopeLabel}`, query)
    ) {
      return false
    }
    return true
  })

  const headline: readonly HeadlineContest[] =
    electionKey === 'prezidentiale-2025-tur-2' ? [presidentialHeadline] : headlineContests

  return {
    election,
    contests,
    headline,
    coverage: election.coverage,
  }
}

export async function fetchContestResultsMock({
  contestKey,
  search,
}: {
  readonly contestKey: string
  readonly search: ContestSearch
}): Promise<ContestResultsResponse | null> {
  if (contestKey !== 'local-2024-cluj-napoca-primar') return null

  const page = search.page ?? 1
  const pageSize = search.pageSize ?? 50
  const start = (page - 1) * pageSize
  const pagedCompetitors = local2024Competitors.slice(start, start + pageSize)
  const expert = search.expert === 1
  const scope = search.scope ?? localContestResults.contest.scopeType
  const unitScope =
    scope === 'chamber' || scope === 'source_constituency' ? 'county' : scope

  return {
    ...localContestResults,
    children: [...(expert ? localPollingStations : localContestResults.children)],
    competitors: [...pagedCompetitors],
    pollingStations: expert ? [...localPollingStations] : [],
    page,
    pageSize,
    totalCount: local2024Competitors.length,
    unit: {
      ...localContestResults.unit,
      scopeType: unitScope,
    },
  }
}

export async function fetchContestMandatesMock(
  contestKey: string,
): Promise<readonly MandateAllocation[]> {
  if (contestKey !== 'local-2024-cluj-napoca-primar') return []
  return localMandates
}

export async function fetchContestCandidaciesMock(
  contestKey: string,
): Promise<readonly Candidacy[]> {
  if (contestKey !== 'local-2024-cluj-napoca-primar') return []
  return localCandidacies
}
