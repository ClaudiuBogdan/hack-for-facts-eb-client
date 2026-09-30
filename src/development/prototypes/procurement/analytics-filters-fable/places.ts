import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { useCounties } from '@/features/procurement/hooks/use-procurement-analytics'
import { formatProcurementCountyName } from '@/features/procurement/lib/procurement-geography'
import type { Filter } from '@/features/procurement/lib/analytics-model'

/**
 * The places a location filter can name, as one searchable index: the eight
 * regions and the counties from the API, the UATs from the map's file (the
 * API has no locality names). Every place carries a label with its kind
 * first — „Reg. Centru", „Jud. Sibiu", „Municipiul Sibiu", „Comuna Poiana
 * Sibiului" (the owner, 30 September 2026) — for where nothing else names
 * the level (the chip), and its bare name for a list under a head. A
 * county's own code (the county council and
 * whatever else is registered at the county itself) is named for a link
 * that carries it, but offered in no list: picking the county covers it.
 */

export type PlaceLevel = 'regiune' | 'judet' | 'localitate'
export type PlaceKind = 'comuna' | 'oras' | 'municipiu' | 'resedinta' | 'sector' | 'judet'

export interface Place {
  readonly level: PlaceLevel
  /** The value the URL carries: the region's name as the API says it, the county's code, the SIRUTA. */
  readonly value: string
  /** The bare name, „Sibiu". */
  readonly name: string
  /** The name with its kind first, „Jud. Sibiu". */
  readonly label: string
  readonly region: string | null
  /** The county's code (`CJ`), for a county or a locality. */
  readonly county: string | null
  readonly kind: PlaceKind | null
  readonly population: number | null
  /** The bare name without diacritics, in lower case, and its words, for matching. */
  readonly key: string
  readonly words: readonly string[]
}

export interface PlaceIndex {
  readonly regions: readonly Place[]
  readonly counties: readonly Place[]
  /** Null while the map's file has not been read. */
  readonly localities: readonly Place[] | null
  readonly byValue: ReadonlyMap<string, Place>
}

const EMPTY: PlaceIndex = { regions: [], counties: [], localities: null, byValue: new Map() }

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

const KINDS: Readonly<Record<string, PlaceKind>> = {
  Comuna: 'comuna',
  Oras: 'oras',
  'Municipiu resedinta de judet': 'resedinta',
  'Municipiu, altul decat resedinta de judet': 'municipiu',
  'Sectoarele municipiului Bucuresti': 'sector',
}

/** The API's region names carry no diacritics; the one that needs them, spelled. The URL keeps the API's own. */
const REGION_NAMES: Readonly<Record<string, string>> = { 'Bucuresti-Ilfov': 'București-Ilfov' }

export function regionName(value: string): string {
  return REGION_NAMES[value] ?? value
}

export function countyName(code: string, name: string): string {
  return code === 'B' ? t`București` : formatProcurementCountyName(name)
}

/**
 * A locality's name with its official kind first (the owner, 30 September
 * 2026): „Municipiul Sibiu", „Orașul Miercurea Sibiului", „Comuna Poiana
 * Sibiului"; a sector under București is „Sectorul 3", the path above it
 * already naming the city. A kind the file does not give falls back to „UAT".
 */
function localityLabel(name: string, kind: PlaceKind | null): string {
  switch (kind) {
    case 'municipiu':
    case 'resedinta':
      return t`Municipiul ${name}`
    case 'oras':
      return t`Orașul ${name}`
    case 'comuna':
      return t`Comuna ${name}`
    case 'sector':
      return name.replace(/^București\s+/u, '')
    default:
      return t`UAT ${name}`
  }
}

/** A locality's kind as its tag; a commune, nine in ten, carries none. */
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

type Features = { readonly features?: readonly { readonly properties?: Record<string, unknown> }[] } | undefined

function build(geography: { readonly regions: readonly { region: string }[]; readonly counties: readonly { countyCode: string; countyName: string; region: string | null }[] } | undefined, uat: Features, judete: Features): PlaceIndex {
  if (!geography) return EMPTY
  const regions = geography.regions.map((item) => {
    const name = regionName(item.region)
    return place({ level: 'regiune', value: item.region, name, label: t`Reg. ${name}`, region: item.region, county: null, kind: null, population: null })
  })
  const counties = geography.counties.map((item) => {
    const name = countyName(item.countyCode, item.countyName)
    // București is a municipality with a county's rank, not a county: „Municipiul București" (the owner, 30 September 2026).
    return place({ level: 'judet', value: item.countyCode, name, label: item.countyCode === 'B' ? t`Municipiul ${name}` : t`Jud. ${name}`, region: item.region, county: item.countyCode, kind: null, population: null })
  })
  const regionOf = new Map(counties.map((county) => [county.county, county.region]))
  let localities: Place[] | null = null
  const ownCodes: Place[] = []
  if (uat?.features && judete?.features) {
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
    for (const feature of judete.features) {
      const props = feature.properties ?? {}
      if (props.countyCode === undefined || props.countyCode === null || typeof props.mnemonic !== 'string') continue
      const name = countyName(props.mnemonic, String(props.name ?? ''))
      ownCodes.push(place({ level: 'localitate', value: String(props.countyCode), name, label: t`Jud. ${name} (instituțiile județului)`, region: regionOf.get(props.mnemonic) ?? null, county: props.mnemonic, kind: 'judet', population: null }))
    }
  }
  const byValue = new Map<string, Place>()
  for (const item of [...regions, ...counties, ...(localities ?? []), ...ownCodes]) byValue.set(`${item.level}:${item.value}`, item)
  return { regions, counties, localities, byValue }
}

export interface PlaceReads {
  readonly index: PlaceIndex
  /** The map's files are being read. */
  readonly loading: boolean
  /** The map's files could not be read: the regions and the counties still stand, from the API. */
  readonly failed: boolean
  readonly retry: () => void
  /** The API's regions and counties could not be read. */
  readonly countiesFailed: boolean
  readonly countiesLoading: boolean
  readonly retryCounties: () => void
}

/** The index; the map's files are read only once a place is being looked for. */
export function usePlaceIndex(enabled: boolean): PlaceReads {
  const geography = useCounties()
  const uat = useGeoJsonData('UAT', { enabled })
  const judete = useGeoJsonData('County', { enabled })
  const index = useMemo(() => build(geography.data, uat.data as Features, judete.data as Features), [geography.data, uat.data, judete.data])
  const failed = enabled && (uat.isError || judete.isError)
  return {
    index,
    loading: enabled && !failed && index.localities === null,
    failed,
    retry: () => {
      if (uat.isError) void uat.refetch()
      if (judete.isError) void judete.refetch()
    },
    countiesFailed: geography.isError,
    countiesLoading: geography.isPending,
    retryCounties: () => void geography.refetch(),
  }
}

// ──────────────────────────────────────────────────────────────── search ──

export interface PlaceScope {
  readonly region: string | null
  readonly county: string | null
}

export interface PlaceMatches {
  readonly regions: readonly Place[]
  readonly counties: readonly Place[]
  readonly localities: readonly Place[]
}

/** How well a place answers the words typed: its whole name, its start, one of its words, or a word inside another (a hyphen's second half). */
function rank(item: Place, key: string, words: readonly string[]): number | null {
  if (item.key === key) return 0
  if (item.key.startsWith(key)) return 1
  if (words.every((word) => item.words.some((own) => own.startsWith(word)))) return 2
  if (item.key.includes(key)) return 3
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

/** The places whose names hold the words typed, within the scope picked so far, coarse to fine. */
export function searchPlaces(index: PlaceIndex, term: string, scope: PlaceScope, limit = 8): PlaceMatches {
  const key = placeKey(term)
  const words = wordsOf(key)
  if (words.length === 0) return { regions: [], counties: [], localities: [] }
  const regions = scope.region || scope.county ? [] : ordered(index.regions, key, words)
  // A county answers to its code too („CJ").
  const counties = scope.county ? [] : ordered(index.counties.filter((item) => inScope(item, scope)), key, words).concat(index.counties.filter((item) => inScope(item, scope) && item.value.toLowerCase() === key && !item.key.startsWith(key)))
  const localities = ordered((index.localities ?? []).filter((item) => inScope(item, scope)), key, words).slice(0, limit)
  return { regions, counties, localities }
}

/** What a scope offers before a word is typed: its regions, a region's counties, a county's largest places. */
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

/** The filter's place from the region down: the crumbs a picked place is shown as, and the scope a search narrows to. */
export function placePath(index: PlaceIndex, filter: Filter | undefined): readonly Place[] {
  if (!filter) return []
  const value = filter.values[0]
  if (!value) return []
  const level = filter.level as PlaceLevel
  const picked =
    index.byValue.get(`${level}:${value}`) ??
    place({ level, value, name: value, label: level === 'localitate' ? t`SIRUTA ${value}` : level === 'judet' ? t`Jud. ${value}` : t`Reg. ${regionName(value)}`, region: null, county: null, kind: null, population: null })
  const county = picked.level === 'judet' ? picked : picked.county ? index.byValue.get(`judet:${picked.county}`) : undefined
  const region = picked.level === 'regiune' ? picked : picked.region ? index.byValue.get(`regiune:${picked.region}`) : undefined
  const crumbs: Place[] = []
  if (region && picked.level !== 'regiune') crumbs.push(region)
  if (county && picked.level !== 'judet') crumbs.push(county)
  crumbs.push(picked)
  return crumbs
}

export function scopeOf(path: readonly Place[]): PlaceScope {
  const last = path[path.length - 1]
  if (!last) return { region: null, county: null }
  return { region: last.region, county: last.level === 'regiune' ? null : last.county }
}
