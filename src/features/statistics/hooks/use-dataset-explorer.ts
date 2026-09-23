import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { generateHash } from '@/lib/utils'
import type {
  StatisticsDatasetExplorerSearch,
  StatisticsDatasetPage,
} from '@/schemas/statistics'
import { fetchDatasetPage } from '../api/dataset-explorer-api'
import { STATISTICS_STALE_TIME, statisticsKeys, statisticsRetry } from './query-config'

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
    uat: search.uat ?? false,
    judet: search.judet ?? false,
    pagina: search.pagina ?? 1,
  }
}

export const datasetExplorerQueryOptions = (
  search: StatisticsDatasetExplorerSearch,
) =>
  queryOptions<StatisticsDatasetPage>({
    queryKey: statisticsKeys.explorerPage(generateHash(JSON.stringify(explorerHashSource(search)))),
    queryFn: ({ signal }) => fetchDatasetPage(search, {}, signal),
    // A refine keeps the rows it has, dimmed, until the next page lands: the
    // count, the pager and the reader's focus stay where they are.
    placeholderData: keepPreviousData,
    staleTime: STATISTICS_STALE_TIME.figures,
    retry: statisticsRetry,
  })

/** A page of the INS dataset catalog for the current explorer URL state. */
export function useDatasetExplorer(search: StatisticsDatasetExplorerSearch) {
  return useQuery(datasetExplorerQueryOptions(search))
}
