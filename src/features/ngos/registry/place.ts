import { t } from '@lingui/core/macro'
import type { NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'
import { countyNameRo } from '@/lib/territory-counties'

/**
 * The registry's places as the procurement panel's place picker reads
 * them (design.md §18.18): one search, its matches ranked the same way, a
 * pick shown with its kind. The registry's API filters only `county.eq`,
 * in the registry's own spelling, so the county is the only level offered —
 * no region (the API takes no list of counties) and no locality (it has no
 * locality filter) until it can apply them.
 */

export interface CountyPlace {
  /** What the query carries: the county as the registry spells it (`CLUJ`, `BUCURESTI`). */
  readonly value: string
  /** The county's code, which a search may type whole (`CJ`, `B`). */
  readonly code: string
  /** The bare name, for a list under the „Județe" head: „Cluj", „București". */
  readonly name: string
  /** The name with its kind, for the chip: „Jud. Cluj"; București is a municipality with a county's rank, „Municipiul București". */
  readonly label: string
  /** The bare name without diacritics, in lower case, and its words: what a search matches. */
  readonly key: string
  readonly words: readonly string[]
}

/** „Sălaj" and „Salaj" alike; „ş" (cedilla) and „ș" (comma) alike. */
export function placeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('ro-RO')
    .trim()
}

function wordsOf(key: string): readonly string[] {
  return key.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/** The counties the registry spells, alphabetical by their names. */
export function countyPlaces(counties: NgoRegistrySummary['counties']): readonly CountyPlace[] {
  return counties
    .map((county) => {
      const name = countyNameRo(county.code) ?? county.source
      const key = placeKey(name)
      return { value: county.source, code: county.code, name, label: county.code === 'B' ? t`Municipiul ${name}` : t`Jud. ${name}`, key, words: wordsOf(key) }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}

/** A query's county as its chip names it; a spelling the registry does not use is shown as it came, without a kind it cannot vouch for. */
export function countyPlaceOf(places: readonly CountyPlace[], value: string): CountyPlace {
  const key = placeKey(value)
  return places.find((place) => place.value === value) ?? { value, code: '', name: value, label: value, key, words: wordsOf(key) }
}

/**
 * How well a county answers the words typed: its whole name, its start,
 * one of its words, or — from three letters — a word inside another
 * („năsăud" in „Bistrița-Năsăud"). Two letters inside a name are noise.
 */
function rank(place: CountyPlace, key: string, words: readonly string[]): number | null {
  if (place.key === key) return 0
  if (place.key.startsWith(key)) return 1
  if (words.every((word) => place.words.some((own) => own.startsWith(word)))) return 2
  if (key.length >= 3 && place.key.includes(key)) return 3
  return null
}

/** The counties whose names hold the words typed; a county's code typed whole („IS", „B") answers first, so Enter picks it. */
export function searchCounties(places: readonly CountyPlace[], term: string): readonly CountyPlace[] {
  const key = placeKey(term)
  const words = wordsOf(key)
  if (words.length === 0) return []
  const coded = places.find((place) => place.code.toLowerCase() === key)
  const ranked = places
    .flatMap((place) => {
      const score = rank(place, key, words)
      return score === null ? [] : [{ place, score }]
    })
    .sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name, 'ro'))
    .map((entry) => entry.place)
  return coded ? [coded, ...ranked.filter((place) => place !== coded)] : ranked
}
