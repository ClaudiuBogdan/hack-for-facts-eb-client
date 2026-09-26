import type { InsDatasetFilterInput } from '@/schemas/ins'
import type { StatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import { isRootContextCode } from './context-tree'

/** Rows per explorer page. */
export const EXPLORER_PAGE_SIZE = 25

/** The cadences the explorer can filter on, in display order: the subset INS uses for a series. */
export const EXPLORER_PERIODICITY_VALUES = ['ANNUAL', 'QUARTERLY', 'MONTHLY'] as const satisfies readonly NonNullable<
  StatisticsDatasetExplorerSearch['frecventa']
>[number][]

export type ExplorerPeriodicity = (typeof EXPLORER_PERIODICITY_VALUES)[number]

/** Filter knobs that are not part of the shareable URL state. */
export interface DatasetFilterOptions {
  /** Ask the server for the fact-loaded datasets only. */
  readonly onlyWithData?: boolean
}

/**
 * The server-side dataset filter for a given explorer URL state.
 *
 * `dataStatus` is not a URL filter: the catalog page shows the whole catalog
 * and every row carries its own status badge. It stays a call-site option because
 * the hub search and the comparison picker open a series straight away, so
 * they ask for the fact-loaded datasets only.
 *
 * It is `dataStatus`, never `syncStatus`: `syncStatus` describes the *sync
 * pipeline* of a dataset (`SYNCED`, `SYNCING`, `FAILED`, …) while `dataStatus`
 * answers the product question "does this dataset have facts?". Omitting it
 * entirely makes the server serve only the fact-loaded datasets, so reaching
 * the full 1,898-dataset catalog means passing both members explicitly.
 */
export function buildDatasetFilterInput(
  search: StatisticsDatasetExplorerSearch,
  options: DatasetFilterOptions = {},
): InsDatasetFilterInput {
  const filter: InsDatasetFilterInput = {
    dataStatus: options.onlyWithData
      ? ['AVAILABLE']
      : ['AVAILABLE', 'CATALOG_ONLY'],
  }

  if (search.q) filter.search = catalogSearchTerm(search.q)
  // One param carries the whole hierarchy: a domain filters the subtree under
  // it, anything deeper is the exact context a dataset hangs from. The server
  // has no filter between the two, which is why the rail's middle level opens
  // instead of filtering (`isSelectableContextLevel`).
  if (search.context) {
    if (isRootContextCode(search.context)) filter.rootContextCode = search.context
    else filter.contextCode = search.context
  }
  if (search.frecventa) filter.periodicity = [...search.frecventa]
  if (search.uat) filter.hasUatData = true
  if (search.judet) filter.hasCountyData = true

  return filter
}

/** A noun's „-ție"/„-ția" ending, once the diacritics are folded: what its other forms share. */
const TIE_ENDING = /ti[ea]$/i
/** Shorter than this, the ending is the word („tie"): nothing to stem. */
const MIN_STEM_LENGTH = 5

/**
 * The term the catalog is asked for, from what the reader typed. The server
 * matches a plain substring against names INS writes without diacritics and
 * often in capitals („POPULATIA DUPA DOMICILIU"), so „populație" and
 * „populatie" both go as `populati`: the diacritics folded, then a noun's
 * „-ție"/„-tie"/„-ția"/„-tia" ending cut to the stem its forms share. The
 * address keeps `q` as typed; only the request changes.
 */
export function catalogSearchTerm(q: string): string {
  const folded = q
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
  const words = folded.split(/\s+/)
  const last = words[words.length - 1] ?? ''
  if (last.length < MIN_STEM_LENGTH || !TIE_ENDING.test(last)) return folded
  return folded.slice(0, -1)
}

/** Zero-based offset for the requested page. */
export function explorerOffset(search: StatisticsDatasetExplorerSearch): number {
  const page = search.pagina ?? 1
  return (page - 1) * EXPLORER_PAGE_SIZE
}

/**
 * Number of active filters shown on the filter-sheet trigger badge.
 *
 * `q` is excluded (it has its own visible input) and so is `pagina` (not a
 * filter). This mirrors the parliament convention.
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

/** True when any sheet filter or search term is applied. */
export function hasActiveExplorerFilters(
  search: StatisticsDatasetExplorerSearch,
): boolean {
  return countActiveExplorerFilters(search) > 0 || Boolean(search.q)
}

/**
 * Clears every filter, keeping nothing — including the page, since a filter
 * change invalidates the current offset.
 */
export function clearedExplorerSearch(): StatisticsDatasetExplorerSearch {
  return {}
}

/** Clears the sheet's filters and keeps the search term, which has its own field. */
export function clearedExplorerFilters(search: StatisticsDatasetExplorerSearch): StatisticsDatasetExplorerSearch {
  return search.q ? { q: search.q } : {}
}
