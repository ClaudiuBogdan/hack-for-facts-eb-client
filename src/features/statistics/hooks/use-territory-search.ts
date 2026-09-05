import { queryOptions, useQuery } from '@tanstack/react-query'
import type { StatisticsTerritorySearchResult } from '@/schemas/statistics'
import {
  searchTerritories,
  TERRITORY_SEARCH_MIN_LENGTH,
} from '../api/territory-search-api'

const TERRITORY_SEARCH_STALE_TIME = 1000 * 60 * 60

/**
 * Territory search. Disabled below the minimum term length so an empty landing
 * page never issues a request, and cached for an hour — the 3,239 INS
 * territories change about once a decade.
 */
export const territorySearchQueryOptions = (term: string | undefined) => {
  const search = (term ?? '').trim()

  return queryOptions<StatisticsTerritorySearchResult>({
    queryKey: ['statistics', 'native-v2', 'territory-search', search],
    queryFn: ({ signal }) => searchTerritories(search, signal),
    enabled: search.length >= TERRITORY_SEARCH_MIN_LENGTH,
    staleTime: TERRITORY_SEARCH_STALE_TIME,
  })
}

export function useTerritorySearch(term: string | undefined) {
  return useQuery(territorySearchQueryOptions(term))
}
