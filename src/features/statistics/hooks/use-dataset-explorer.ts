import { queryOptions, useQuery } from '@tanstack/react-query'
import { generateHash } from '@/lib/utils'
import type {
  StatisticsDatasetExplorerSearch,
  StatisticsDatasetPage,
} from '@/schemas/statistics'
import { fetchDatasetPage } from '../api/dataset-explorer-api'

const EXPLORER_STALE_TIME = 1000 * 60 * 15

/**
 * Query key source. Built explicitly rather than from the search object so that
 * two URL states that differ only in key order (or in an `undefined` field left
 * behind by a chip removal) share one cache entry.
 */
function explorerHashSource(search: StatisticsDatasetExplorerSearch) {
  return {
    q: search.q ?? null,
    context: search.context ?? null,
    frecventa: search.frecventa ? [...search.frecventa].sort() : null,
    stare: search.stare ?? null,
    uat: search.uat ?? false,
    judet: search.judet ?? false,
    pagina: search.pagina ?? 1,
  }
}

export const datasetExplorerQueryOptions = (
  search: StatisticsDatasetExplorerSearch,
) =>
  queryOptions<StatisticsDatasetPage>({
    queryKey: [
      'statisticsDatasetExplorer',
      generateHash(JSON.stringify(explorerHashSource(search))),
    ],
    queryFn: () => fetchDatasetPage(search),
    staleTime: EXPLORER_STALE_TIME,
  })

/** A page of the INS dataset catalog for the current explorer URL state. */
export function useDatasetExplorer(search: StatisticsDatasetExplorerSearch) {
  return useQuery(datasetExplorerQueryOptions(search))
}
