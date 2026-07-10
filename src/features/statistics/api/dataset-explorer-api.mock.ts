import { normalizeFilterSearchText } from '@/lib/filter-option-search'
import type {
  StatisticsDatasetExplorerSearch,
  StatisticsDatasetPage,
  StatisticsDatasetSummary,
} from '@/schemas/statistics'
import {
  buildDatasetFilterInput,
  EXPLORER_PAGE_SIZE,
  explorerOffset,
} from '../lib/explorer-filter'
import { MOCK_EXPLORER_DATASETS } from '../mocks/statistics-explorer-fixtures'

/**
 * Mock dataset explorer. Applies the same `InsDatasetFilterInput` the live
 * adapter sends, in-memory — so a filter that works in mock mode works against
 * the server, and `explorer-filter` stays the single source of filter truth.
 */
export function fetchDatasetPageMock(
  search: StatisticsDatasetExplorerSearch,
): Promise<StatisticsDatasetPage> {
  const filter = buildDatasetFilterInput(search)
  const needle = filter.search ? normalizeFilterSearchText(filter.search) : null

  const matches = MOCK_EXPLORER_DATASETS.filter((dataset) => {
    if (!matchesDataStatus(dataset, filter.dataStatus)) return false
    if (needle && !matchesSearch(dataset, needle)) return false
    if (filter.rootContextCode && dataset.contextPath !== filter.rootContextCode) return false
    if (filter.periodicity && !filter.periodicity.some((p) => dataset.periodicity.includes(p))) {
      return false
    }
    if (filter.hasUatData && !dataset.hasUatData) return false
    if (filter.hasCountyData && !dataset.hasCountyData) return false
    return true
  })

  const offset = explorerOffset(search)
  const page = matches.slice(offset, offset + EXPLORER_PAGE_SIZE)

  return Promise.resolve({
    datasets: page,
    totalCount: matches.length,
    hasNextPage: offset + page.length < matches.length,
  })
}

function matchesDataStatus(
  dataset: StatisticsDatasetSummary,
  dataStatus: readonly ('AVAILABLE' | 'CATALOG_ONLY')[] | undefined,
): boolean {
  if (!dataStatus) return true
  const wire = dataset.dataStatus === 'available' ? 'AVAILABLE' : 'CATALOG_ONLY'
  return dataStatus.includes(wire)
}

function matchesSearch(dataset: StatisticsDatasetSummary, needle: string): boolean {
  const haystack = normalizeFilterSearchText(
    `${dataset.code} ${dataset.nameRo ?? ''} ${dataset.nameEn ?? ''}`,
  )
  return haystack.includes(needle)
}
