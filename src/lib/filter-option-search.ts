import Fuse from 'fuse.js'
import type { Option } from '@/components/ui/multi-select'

export type FilterOption = Option & {
  readonly description?: string
  readonly searchText?: string
}

export function normalizeFilterSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLocaleLowerCase('ro-RO')
    .trim()
    .replace(/\s+/g, ' ')
}

function optionSearchText(option: FilterOption): string {
  return normalizeFilterSearchText(
    option.searchText ?? `${option.label} ${option.description ?? ''} ${option.value}`,
  )
}

function hasOrderedTokenMatch(search: string, value: string): boolean {
  const searchTokens = search.split(' ').filter(Boolean)
  const valueTokens = value.split(' ').filter(Boolean)
  if (searchTokens.length === 0) return true

  let searchIndex = 0
  for (const valueToken of valueTokens) {
    const searchToken = searchTokens[searchIndex]
    if (!searchToken) break
    if (valueToken.startsWith(searchToken)) searchIndex += 1
  }

  return searchIndex === searchTokens.length
}

export function filterOptions(
  options: readonly FilterOption[],
  search: string,
): FilterOption[] {
  const normalizedSearch = normalizeFilterSearchText(search)
  if (!normalizedSearch) return [...options]

  const deterministicMatches = options.filter((option) => {
    const text = optionSearchText(option)
    return text.includes(normalizedSearch) || hasOrderedTokenMatch(normalizedSearch, text)
  })
  if (deterministicMatches.length > 0) return deterministicMatches

  return new Fuse(options, {
    threshold: 0.35,
    ignoreLocation: true,
    shouldSort: true,
    getFn: (option) => optionSearchText(option as FilterOption),
    keys: ['searchText'],
  })
    .search(normalizedSearch)
    .map((result) => result.item)
}
