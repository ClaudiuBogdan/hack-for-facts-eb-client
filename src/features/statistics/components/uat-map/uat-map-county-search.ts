import { normalizeFilterSearchText } from '@/lib/filter-option-search'

/**
 * A county matches when every word typed begins one of its words, diacritics
 * aside — „bras" finds Brașov, „satu m" Satu Mare, „mures" Mureș and not
 * Maramureș — or when its code is typed whole („CJ").
 */
export function countyMatches(name: string, code: string, search: string): boolean {
  const typed = normalizeFilterSearchText(search)
  if (typed === '') return true
  if (typed === code.toLocaleLowerCase('ro-RO')) return true
  const words = normalizeFilterSearchText(name).split(' ')
  return typed.split(' ').every((part) => words.some((word) => word.startsWith(part)))
}
