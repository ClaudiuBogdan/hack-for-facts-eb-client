import type { StatisticsDatasetExplorerSearch, StatisticsDatasetPage } from '@/schemas/statistics'
import {
  buildDatasetFilterInput,
  EXPLORER_PAGE_SIZE,
  explorerOffset,
} from '../lib/explorer-filter'
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import { fetchInsDatasetPage } from './graphql/statistics-fetchers'
import { fetchDatasetPageMock } from './dataset-explorer-api.mock'

/**
 * Dataset explorer seam. Both adapters consume the same pure
 * `buildDatasetFilterInput`, so the mock cannot drift from live filter
 * semantics.
 */
export async function fetchDatasetPage(
  search: StatisticsDatasetExplorerSearch,
): Promise<StatisticsDatasetPage> {
  if (isStatisticsMockEnabled()) {
    return fetchDatasetPageMock(search)
  }

  return fetchInsDatasetPage({
    filter: buildDatasetFilterInput(search),
    limit: EXPLORER_PAGE_SIZE,
    offset: explorerOffset(search),
  })
}
