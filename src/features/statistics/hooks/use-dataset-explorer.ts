import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
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

/**
 * The cache key of one catalog page: the address's filters and page, in
 * canonical order, as the string itself. A 32-bit hash of it collided
 * („populatie" and „5dRbIa" shared one), serving one search's rows for
 * another and letting a server seed pass the guard for the wrong address.
 */
export function explorerPageKey(search: StatisticsDatasetExplorerSearch): string {
  return JSON.stringify(explorerHashSource(search))
}

export const datasetExplorerQueryOptions = (
  search: StatisticsDatasetExplorerSearch,
) =>
  queryOptions<StatisticsDatasetPage>({
    queryKey: statisticsKeys.explorerPage(explorerPageKey(search)),
    queryFn: ({ signal }) => fetchDatasetPage(search, {}, signal),
    // A refine keeps the rows it has, dimmed, until the next page lands: the
    // count, the pager and the reader's focus stay where they are.
    placeholderData: keepPreviousData,
    staleTime: STATISTICS_STALE_TIME.figures,
    retry: statisticsRetry,
  })

/**
 * A page of the INS dataset catalog for the current explorer URL state,
 * seeded from the route loader's server read when it was for this address.
 */
export function useDatasetExplorer(search: StatisticsDatasetExplorerSearch, initialData?: StatisticsDatasetPage) {
  return useQuery({
    ...datasetExplorerQueryOptions(search),
    ...(initialData ? { initialData } : {}),
  })
}
