import type { StatisticsDatasetExplorerSearch, StatisticsDatasetPage } from '@/schemas/statistics'
import {
  buildDatasetFilterInput,
  EXPLORER_PAGE_SIZE,
  explorerOffset,
  type DatasetFilterOptions,
} from '../lib/explorer-filter'
import { fetchInsDatasetPage } from './graphql/statistics-fetchers'

/** One page of the INS catalog for an explorer URL state, through the pure `buildDatasetFilterInput`. */
export async function fetchDatasetPage(
  search: StatisticsDatasetExplorerSearch,
  options: DatasetFilterOptions = {},
  signal?: AbortSignal,
): Promise<StatisticsDatasetPage> {
  return fetchInsDatasetPage({
    filter: buildDatasetFilterInput(search, options),
    limit: EXPLORER_PAGE_SIZE,
    offset: explorerOffset(search),
    signal,
  })
}
