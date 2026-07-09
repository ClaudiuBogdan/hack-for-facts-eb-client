import type { StatisticsTerritorySearchResult } from '@/schemas/statistics'
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import { searchInsTerritories } from './graphql/statistics-fetchers'
import { searchTerritoriesMock } from './territory-search-api.mock'

/** Minimum term length before the landing search hits the network. */
export const TERRITORY_SEARCH_MIN_LENGTH = 2

/** Results per territory-search page. */
export const TERRITORY_SEARCH_LIMIT = 20

const EMPTY_RESULT: StatisticsTerritorySearchResult = {
  rows: [],
  totalCount: 0,
  hasNextPage: false,
}

/**
 * Territory search seam. Terms shorter than
 * {@link TERRITORY_SEARCH_MIN_LENGTH} resolve to an empty result without a
 * request — a one-character query would match most of the 3,239 territories.
 */
export async function searchTerritories(
  term: string,
): Promise<StatisticsTerritorySearchResult> {
  const search = term.trim()
  if (search.length < TERRITORY_SEARCH_MIN_LENGTH) {
    return EMPTY_RESULT
  }

  if (isStatisticsMockEnabled()) {
    return searchTerritoriesMock(search)
  }

  return searchInsTerritories({
    filter: { search },
    limit: TERRITORY_SEARCH_LIMIT,
    offset: 0,
  })
}
