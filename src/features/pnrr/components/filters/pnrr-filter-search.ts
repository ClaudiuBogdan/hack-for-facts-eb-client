import Fuse from 'fuse.js'
import type { PnrrFilterOption } from './PnrrStyledMultiSelect'

export function normalizePnrrFilterSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLocaleLowerCase('ro-RO')
    .trim()
    .replace(/\s+/g, ' ')
}

function optionSearchText(option: PnrrFilterOption): string {
  return normalizePnrrFilterSearchText(
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

export function filterPnrrOptions(
  options: readonly PnrrFilterOption[],
  search: string,
): PnrrFilterOption[] {
  const normalizedSearch = normalizePnrrFilterSearchText(search)
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
    getFn: (option) => optionSearchText(option as PnrrFilterOption),
    keys: ['searchText'],
  })
    .search(normalizedSearch)
    .map((result) => result.item)
}
