import {
  filterOptions,
  normalizeFilterSearchText,
  type FilterOption,
} from '@/lib/filter-option-search'

export type PnrrFilterOption = FilterOption

export const normalizePnrrFilterSearchText = normalizeFilterSearchText

export function filterPnrrOptions(
  options: readonly PnrrFilterOption[],
  search: string,
): PnrrFilterOption[] {
  return filterOptions(options, search)
}
