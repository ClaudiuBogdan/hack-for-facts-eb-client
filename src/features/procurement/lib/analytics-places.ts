import { t } from '@lingui/core/macro'
import type { Filter } from './analytics-model'
import { formatProcurementCountyName } from './procurement-geography'

/**
 * The places a location filter can name, as one searchable index: the eight
 * regions and the counties from the API, the UATs from the map's file (the
 * API has no locality names). Every place carries its bare name, for a list
 * under its level's head, and a label with its kind first, for where nothing
 * else names the level — the chip: „Reg. Centru", „Jud. Sibiu", and a
 * locality's official kind, „Municipiul Sibiu", „Orașul Miercurea
 * Sibiului", „Comuna Poiana Sibiului" (the owner, 30 September 2026).
 *
 * A county's own code (the county council, and whatever else is registered
 * at the county itself) is named for a link that carries it, but offered in
 * no list: picking the county covers it.
 */

export type PlaceLevel = 'regiune' | 'judet' | 'localitate'
export type PlaceKind = 'comuna' | 'oras' | 'municipiu' | 'resedinta' | 'sector' | 'judet'

export interface Place {
  readonly level: PlaceLevel
  /** The value the URL carries: the region's name as the API spells it, the county's code, the SIRUTA. */
  readonly value: string
  /** The bare name, „Sibiu". */
  readonly name: string
  /** The name with its kind first, „Jud. Sibiu", „Municipiul Sibiu". */
  readonly label: string
  readonly region: string | null
  /** The county's code (`SB`), for a county or a locality. */
  readonly county: string | null
  readonly kind: PlaceKind | null
  readonly population: number | null
  /** The bare name without diacritics, in lower case, and its words: what a search matches. */
  readonly key: string
  readonly words: readonly string[]
}

export interface PlaceIndex {
  readonly regions: readonly Place[]
  readonly counties: readonly Place[]
  /** Null until the map's file is read. */
  readonly localities: readonly Place[] | null
  /** Every place by `level:value`, the county's own codes included. */
  readonly byValue: ReadonlyMap<string, Place>
}

/** The API's regions and counties, as `fetchProcurementGeographyOptions` gives them. */
export interface PlaceGeography {
  readonly regions: readonly { readonly region: string }[]
  readonly counties: readonly { readonly countyCode: string; readonly countyName: string; readonly region: string | null }[]
}

/** A GeoJSON file's features, only as far as the index reads them. */
export type PlaceFeatures = { readonly features?: readonly { readonly properties?: Record<string, unknown> }[] } | undefined

/** „Sălcioara" and „Salcioara" alike; „ş" (cedilla) and „ș" (comma) alike. */
export function placeKey(text: string): string {
  return text.normalize('NFD').replace(/\p{M}+/gu, '').toLocaleLowerCase('ro-RO').trim()
}

function wordsOf(key: string): readonly string[] {
  return key.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

function place(fields: Omit<Place, 'key' | 'words'>): Place {
  const key = placeKey(fields.name)
  return { ...fields, key, words: wordsOf(key) }
}

/** The map file's `natLevName`, as the kinds the index knows. */
const KINDS: Readonly<Record<string, PlaceKind>> = {
  Comuna: 'comuna',
  Oras: 'oras',
  'Municipiu resedinta de judet': 'resedinta',
  'Municipiu, altul decat resedinta de judet': 'municipiu',
  'Sectoarele municipiului Bucuresti': 'sector',
}

/** The API's region names carry no diacritics; the one that needs them, spelled. The URL keeps the API's own. */
const REGION_NAMES: Readonly<Record<string, string>> = { 'Bucuresti-Ilfov': 'București-Ilfov' }

export function regionDisplayName(value: string): string {
  return REGION_NAMES[value] ?? value
}

/** A county's name as the map spells it; București is the city's own. Names are the places', in either language. */
export function countyDisplayName(code: string, name: string): string {
  return code === 'B' ? 'București' : formatProcurementCountyName(name)
}

/**
 * A locality's name with its official kind first. A sector under București
 * is „Sectorul 3", the path above it naming the city; a kind the file does
 * not give falls back to „UAT".
 */
export function localityLabel(name: string, kind: PlaceKind | null): string {
  switch (kind) {
    case 'municipiu':
    case 'resedinta':
      return t`Municipiul ${name}`
    case 'oras':
      return t`Orașul ${name}`
    case 'comuna':
      return t`Comuna ${name}`
    case 'sector': {
      const number = /(\d+)\s*$/u.exec(name)?.[1]
      return number ? t`Sectorul ${number}` : name
    }
    default:
      return t`UAT ${name}`
  }
}

/** A locality's kind as its tag in a list; a commune, nine in ten, carries none. */
export function kindLabel(kind: PlaceKind | null): string | null {
  switch (kind) {
    case 'oras':
      return t`oraș`
    case 'municipiu':
      return t`municipiu`
    case 'resedinta':
      return t`reședință`
    case 'sector':
      return t`sector`
    default:
      return null
  }
}

/**
 * The index over the API's regions and counties and, once read, the map's
 * UATs and counties' own codes. Either stands without the other: the
 * localities, found without the API, lack only their region.
 */
export function placeIndexOf(geography: PlaceGeography | undefined, uat: PlaceFeatures, counties: PlaceFeatures): PlaceIndex {
  const regions = (geography?.regions ?? []).map((item) => {
    const name = regionDisplayName(item.region)
    return place({ level: 'regiune', value: item.region, name, label: t`Reg. ${name}`, region: item.region, county: null, kind: null, population: null })
  })
  const countyPlaces = (geography?.counties ?? []).map((item) => {
    const name = countyDisplayName(item.countyCode, item.countyName)
    // București is a municipality with a county's rank, not a county.
    const label = item.countyCode === 'B' ? t`Municipiul ${name}` : t`Jud. ${name}`
    return place({ level: 'judet', value: item.countyCode, name, label, region: item.region, county: item.countyCode, kind: null, population: null })
  })
  const regionOf = new Map(countyPlaces.map((county) => [county.county, county.region]))
  let localities: Place[] | null = null
  const ownCodes: Place[] = []
  if (uat?.features && counties?.features) {
    localities = []
    for (const feature of uat.features) {
      const props = feature.properties ?? {}
      if (props.natcode === undefined || props.natcode === null) continue
      const county = typeof props.countyMn === 'string' ? props.countyMn : null
      const name = String(props.name ?? props.natcode)
      const kind = typeof props.natLevName === 'string' ? (KINDS[props.natLevName] ?? null) : null
      localities.push(
        place({
          level: 'localitate',
          value: String(props.natcode),
          name,
          label: localityLabel(name, kind),
          region: county ? (regionOf.get(county) ?? null) : null,
          county,
          kind,
          population: typeof props.insPop2021 === 'number' ? props.insPop2021 : null,
        }),
      )
    }
    for (const feature of counties.features) {
      const props = feature.properties ?? {}
      if (props.countyCode === undefined || props.countyCode === null || typeof props.mnemonic !== 'string') continue
      const name = countyDisplayName(props.mnemonic, String(props.name ?? ''))
      ownCodes.push(
        place({
          level: 'localitate',
          value: String(props.countyCode),
          name,
          label: props.mnemonic === 'B' ? t`Municipiul ${name} (instituțiile municipiului)` : t`Jud. ${name} (instituțiile județului)`,
          region: regionOf.get(props.mnemonic) ?? null,
          county: props.mnemonic,
          kind: 'judet',
          population: null,
        }),
      )
    }
  }
  const byValue = new Map<string, Place>()
  for (const item of [...regions, ...countyPlaces, ...(localities ?? []), ...ownCodes]) byValue.set(`${item.level}:${item.value}`, item)
  return { regions, counties: countyPlaces, localities, byValue }
}

// ──────────────────────────────────────────────────────────────── search ──

/** What a search narrows to: the place picked so far. */
export interface PlaceScope {
  readonly region: string | null
  readonly county: string | null
}

export interface PlaceMatches {
  readonly regions: readonly Place[]
  readonly counties: readonly Place[]
  readonly localities: readonly Place[]
}

/**
 * How well a place answers the words typed: its whole name, its start, one
 * of its words, or — from three letters — a word inside another (a hyphen's
 * second half). Two letters inside a name („nt" in „Centru") are noise.
 */
function rank(item: Place, key: string, words: readonly string[]): number | null {
  if (item.key === key) return 0
  if (item.key.startsWith(key)) return 1
  if (words.every((word) => item.words.some((own) => own.startsWith(word)))) return 2
  if (key.length >= 3 && item.key.includes(key)) return 3
  return null
}

function ordered(items: readonly Place[], key: string, words: readonly string[]): Place[] {
  return items
    .flatMap((item) => {
      const score = rank(item, key, words)
      return score === null ? [] : [{ item, score }]
    })
    .sort((a, b) => a.score - b.score || (b.item.population ?? -1) - (a.item.population ?? -1) || a.item.name.localeCompare(b.item.name, 'ro'))
    .map((entry) => entry.item)
}

function inScope(item: Place, scope: PlaceScope): boolean {
  if (scope.county) return item.county === scope.county
  if (scope.region) return item.region === scope.region
  return true
}

/**
 * The places whose names hold the words typed, within the scope picked so
 * far, coarse to fine. A county's code typed whole („IS", „CJ") answers
 * first, before any region or name that merely holds its letters: Enter
 * picks the first.
 */
export function searchPlaces(index: PlaceIndex, term: string, scope: PlaceScope, limit = 8): PlaceMatches {
  const key = placeKey(term)
  const words = wordsOf(key)
  if (words.length === 0) return { regions: [], counties: [], localities: [] }
  const scoped = scope.county ? [] : index.counties.filter((item) => inScope(item, scope))
  const coded = scoped.find((item) => item.value.toLowerCase() === key)
  const regions = scope.region || scope.county || coded ? [] : ordered(index.regions, key, words)
  const counties = coded ? [coded, ...ordered(scoped, key, words).filter((item) => item !== coded)] : ordered(scoped, key, words)
  const localities = ordered((index.localities ?? []).filter((item) => inScope(item, scope)), key, words).slice(0, limit)
  return { regions, counties, localities }
}

/** What a scope offers before a word is typed: the regions, a region's counties, a county's largest places. */
export function browsePlaces(index: PlaceIndex, scope: PlaceScope, limit = 10): PlaceMatches {
  if (scope.county) {
    const largest = (index.localities ?? [])
      .filter((item) => item.county === scope.county)
      .sort((a, b) => (b.population ?? -1) - (a.population ?? -1))
      .slice(0, limit)
    return { regions: [], counties: [], localities: largest }
  }
  if (scope.region) return { regions: [], counties: index.counties.filter((item) => item.region === scope.region), localities: [] }
  return { regions: index.regions, counties: [], localities: [] }
}

/** A filter's place from the region down: the crumbs a picked place is shown as, the last the place itself. */
export function placePath(index: PlaceIndex, filter: Filter | undefined): readonly Place[] {
  const value = filter?.values[0]
  if (!filter || !value) return []
  const level = filter.level as PlaceLevel
  // A value the index does not know (yet), named as the level's own label would name it.
  const name = level === 'regiune' ? regionDisplayName(value) : value
  const picked =
    index.byValue.get(`${level}:${value}`) ??
    place({
      level,
      value,
      name,
      label: level === 'localitate' ? t`SIRUTA ${value}` : level === 'judet' ? t`Jud. ${name}` : t`Reg. ${name}`,
      region: level === 'regiune' ? value : null,
      county: level === 'judet' ? value : null,
      kind: null,
      population: null,
    })
  const county = picked.level === 'judet' ? picked : picked.county ? index.byValue.get(`judet:${picked.county}`) : undefined
  const region = picked.level === 'regiune' ? picked : picked.region ? index.byValue.get(`regiune:${picked.region}`) : undefined
  const crumbs: Place[] = []
  if (region && picked.level !== 'regiune') crumbs.push(region)
  if (county && picked.level !== 'judet') crumbs.push(county)
  crumbs.push(picked)
  return crumbs
}

/** The scope a path narrows the next search to. */
export function scopeOf(path: readonly Place[]): PlaceScope {
  const last = path[path.length - 1]
  if (!last) return { region: null, county: null }
  return { region: last.region, county: last.level === 'regiune' ? null : last.county }
}
