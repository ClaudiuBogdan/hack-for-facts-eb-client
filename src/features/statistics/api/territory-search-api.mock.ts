import { normalizeFilterSearchText } from '@/lib/filter-option-search'
import type { StatisticsTerritorySearchResult } from '@/schemas/statistics'
import { MOCK_TERRITORIES } from '../mocks/statistics-explorer-fixtures'
import { TERRITORY_SEARCH_LIMIT } from './territory-search-api'

/**
 * Mock territory search. Matches diacritic-insensitively on name and SIRUTA,
 * mirroring the server's `name_normalized` column so mock semantics equal live
 * semantics ("targu mures" finds "Municipiul Târgu Mureș").
 */
export function searchTerritoriesMock(
  term: string,
): Promise<StatisticsTerritorySearchResult> {
  const needle = normalizeFilterSearchText(term)

  const matches = MOCK_TERRITORIES.filter((row) => {
    const haystack = normalizeFilterSearchText(row.name ?? '')
    return haystack.includes(needle) || (row.siruta ?? '').startsWith(term)
  })

  return Promise.resolve({
    rows: matches.slice(0, TERRITORY_SEARCH_LIMIT),
    totalCount: matches.length,
    hasNextPage: matches.length > TERRITORY_SEARCH_LIMIT,
  })
}
