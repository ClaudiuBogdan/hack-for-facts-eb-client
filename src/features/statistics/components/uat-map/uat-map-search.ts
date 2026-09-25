import { normalizeFilterSearchText } from '@/lib/filter-option-search'

/**
 * The finder's search over the map's own UATs — no county among them, no
 * request: the names are already loaded. A UAT matches when every word typed
 * begins one of its name's words, diacritics aside („baia m" finds Baia
 * Mare); a word may also be its county's, to tell apart the seven Fântânele
 * („fantanele iasi").
 *
 * Closest first — the name typed whole, then its beginning, then its words,
 * then with the county — and among equals the larger place first.
 */

export interface UatSearchIndex {
  readonly names: readonly string[]
  readonly nameWords: readonly (readonly string[])[]
  readonly countyWords: readonly (readonly string[])[]
}

/** The names made searchable once: `countyNames` is each UAT's county, by index. */
export function uatSearchIndex(names: readonly string[], countyNames: readonly string[]): UatSearchIndex {
  const normalized = names.map(normalizeFilterSearchText)
  // Forty-two counties, not 3,181 of them.
  const counties = new Map<string, readonly string[]>()
  const wordsOf = (county: string) => counties.get(county) ?? counties.set(county, normalizeFilterSearchText(county).split(' ')).get(county)!
  return {
    names: normalized,
    nameWords: normalized.map((name) => name.split(' ')),
    countyWords: countyNames.map(wordsOf),
  }
}

const begins = (words: readonly string[], part: string) => words.some((word) => word.startsWith(part))

/** 0 the name typed whole, 1 its beginning, 2 its words, 3 with the county; null no match. */
function closeness(index: UatSearchIndex, uat: number, typed: string, parts: readonly string[]): number | null {
  const name = index.names[uat]!
  if (name === typed) return 0
  if (name.startsWith(typed)) return 1
  const nameWords = index.nameWords[uat]!
  const inName = parts.filter((part) => begins(nameWords, part))
  if (inName.length === parts.length) return 2
  if (inName.length > 0 && parts.every((part) => begins(nameWords, part) || begins(index.countyWords[uat]!, part))) return 3
  return null
}

/** The first `limit` UATs found, closest first, and how many were found in all. */
export function searchUats({
  index,
  search,
  size,
  limit,
}: {
  readonly index: UatSearchIndex
  readonly search: string
  /** Each UAT's size (its population): the larger first among equals. */
  readonly size: readonly (number | null)[]
  readonly limit: number
}): { readonly found: readonly number[]; readonly total: number } {
  const typed = normalizeFilterSearchText(search)
  if (typed === '') return { found: [], total: 0 }
  const parts = typed.split(' ')
  const matches: { readonly uat: number; readonly closeness: number }[] = []
  for (let uat = 0; uat < index.names.length; uat += 1) {
    const found = closeness(index, uat, typed, parts)
    if (found !== null) matches.push({ uat, closeness: found })
  }
  matches.sort(
    (a, b) => a.closeness - b.closeness || (size[b.uat] ?? 0) - (size[a.uat] ?? 0) || index.names[a.uat]!.localeCompare(index.names[b.uat]!, 'ro'),
  )
  return { found: matches.slice(0, limit).map((match) => match.uat), total: matches.length }
}
