import type { InsDatasetFilterInput } from '@/schemas/ins'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'

/** Rows per explorer page. */
export const EXPLORER_PAGE_SIZE = 25

/**
 * The server-side dataset filter for a given explorer URL state.
 *
 * `stare` maps to `dataStatus`, never to `syncStatus`: `syncStatus` describes
 * the *sync pipeline* of a dataset (`SYNCED`, `SYNCING`, `FAILED`, …) while
 * `dataStatus` answers the product question "does this dataset have facts?".
 * Omitting `dataStatus` entirely makes the server serve only the fact-loaded
 * datasets, so the "Toate" tab must pass both members explicitly to reach the
 * full 1,898-dataset catalog.
 */
export function buildDatasetFilterInput(
  search: StatisticsDatasetExplorerSearch,
): InsDatasetFilterInput {
  const filter: InsDatasetFilterInput = {
    dataStatus:
      search.stare === 'available'
        ? ['AVAILABLE']
        : search.stare === 'catalog-only'
          ? ['CATALOG_ONLY']
          : ['AVAILABLE', 'CATALOG_ONLY'],
  }

  if (search.q) filter.search = search.q
  if (search.context) filter.rootContextCode = search.context
  if (search.frecventa) filter.periodicity = [...search.frecventa]
  if (search.uat) filter.hasUatData = true
  if (search.judet) filter.hasCountyData = true

  return filter
}

/** Zero-based offset for the requested page. */
export function explorerOffset(search: StatisticsDatasetExplorerSearch): number {
  const page = search.pagina ?? 1
  return (page - 1) * EXPLORER_PAGE_SIZE
}

/**
 * Number of active filters shown on the filter-sheet trigger badge.
 *
 * `q` is excluded (it has its own visible input) and so is `stare` (it is a
 * visible segmented control, not a sheet filter) and `pagina` (not a filter).
 * This mirrors the parliament convention.
 */
export function countActiveExplorerFilters(
  search: StatisticsDatasetExplorerSearch,
): number {
  let count = 0
  if (search.context) count += 1
  if (search.frecventa) count += search.frecventa.length
  if (search.uat) count += 1
  if (search.judet) count += 1
  return count
}

/** True when any sheet filter, search term or status filter is applied. */
export function hasActiveExplorerFilters(
  search: StatisticsDatasetExplorerSearch,
): boolean {
  return (
    countActiveExplorerFilters(search) > 0 ||
    Boolean(search.q) ||
    Boolean(search.stare)
  )
}

/**
 * Clears every filter, keeping nothing — including the page, since a filter
 * change invalidates the current offset.
 */
export function clearedExplorerSearch(): StatisticsDatasetExplorerSearch {
  return {}
}
