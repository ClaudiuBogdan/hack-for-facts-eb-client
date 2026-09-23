import type { NgoHubLayerKey } from '@/schemas/ngos'
import type { RegistrySearch } from '../registry/api'
import type {
  NgoRegistryCategoryKey,
  NgoRegistryCountySummary,
  NgoRegistryStatusKey,
  NgoRegistrySummary,
} from './registry-summary-types'

/**
 * The figures `/ong-uri` derives from the registry summary, as pure
 * functions: the county layers the map colours, the legal forms and the
 * statuses with their shares, and the registry searches each figure opens.
 */

/** Registered NGOs per this many residents. */
export const DENSITY_PER = 10_000

export interface NgoCountyValue {
  readonly code: string
  /** The county as the registry spells it, for the registry filter. */
  readonly source: string
  readonly value: number
}

export interface NgoCountyLayer {
  readonly key: NgoHubLayerKey
  /** `rate` draws against the national value; `count` from zero, as a share of the total. */
  readonly kind: 'rate' | 'count'
  readonly values: readonly NgoCountyValue[]
  /** The country's own value: the rate for all of Romania, or the national total for a count. */
  readonly national: number
  /** Decimals every figure of the layer is shown with. */
  readonly digits: number
  /** Entries the layer counts nationally but the registry places in no county. */
  readonly unplaced: number
}

/** Registered NGOs per 10,000 residents, to one decimal. */
export function densityOf(registered: number, residents: number): number {
  return residents > 0 ? Math.round((registered / residents) * DENSITY_PER * 10) / 10 : 0
}

export function totalResidents(summary: Pick<NgoRegistrySummary, 'counties'>): number {
  return summary.counties.reduce((sum, county) => sum + county.residents, 0)
}

/** The national density counts every registered NGO, those with no county included. */
export function nationalDensity(summary: Pick<NgoRegistrySummary, 'counties' | 'status'>): number {
  return densityOf(summary.status.registered, totalResidents(summary))
}

function countyValue(county: NgoRegistryCountySummary, key: NgoHubLayerKey): number {
  switch (key) {
    case 'densitate':
      return densityOf(county.registered, county.residents)
    case 'total':
      return county.registered
    case 'noi':
      return county.added
  }
}

export function countyLayer(summary: NgoRegistrySummary, key: NgoHubLayerKey): NgoCountyLayer {
  const values = summary.counties.map((county) => ({ code: county.code, source: county.source, value: countyValue(county, key) }))
  // A rate's unplaced entries are the registered ones it divides, as for the count of registered NGOs.
  if (key === 'densitate') return { key, kind: 'rate', values, national: nationalDensity(summary), digits: 1, unplaced: summary.noCounty }
  const national = key === 'total' ? summary.status.registered : registrationsIn(summary, summary.year)
  const placed = values.reduce((sum, county) => sum + county.value, 0)
  return { key, kind: 'count', values, national, digits: 0, unplaced: Math.max(0, national - placed) }
}

/** Counties highest first; a tie keeps name order, so the ranking is stable. */
export function rankCounties(values: readonly NgoCountyValue[], nameOf: (code: string) => string): readonly NgoCountyValue[] {
  return [...values].sort((a, b) => b.value - a.value || nameOf(a.code).localeCompare(nameOf(b.code), 'ro'))
}

/** New entries in a year: registry numbers given that year. */
export function registrationsIn(summary: Pick<NgoRegistrySummary, 'registrations'>, year: number): number {
  return summary.registrations.find((entry) => entry.year === year)?.count ?? 0
}

/** A year's count spread over its days, to one decimal. */
export function perDay(count: number, year: number): number {
  const days = new Date(Date.UTC(year + 1, 0, 1)).getTime() - new Date(Date.UTC(year, 0, 1)).getTime()
  return Math.round((count / (days / 86_400_000)) * 10) / 10
}

export interface NgoShare<K extends string> {
  readonly key: K
  readonly count: number
  /** Of the rows' own total, 0 to 1. */
  readonly share: number
}

function shares<K extends string>(counts: Readonly<Record<K, number>>, order: readonly K[]): readonly NgoShare<K>[] {
  const total = order.reduce((sum, key) => sum + counts[key], 0)
  return order.map((key) => ({ key, count: counts[key], share: total > 0 ? counts[key] / total : 0 }))
}

export const NGO_CATEGORY_ORDER: readonly NgoRegistryCategoryKey[] = [
  'association',
  'foundation',
  'federation',
  'religious_association',
  'foreign_legal_person',
]

/** Registered NGOs by legal form, largest first. */
export function categoryShares(summary: Pick<NgoRegistrySummary, 'categories'>): readonly NgoShare<NgoRegistryCategoryKey>[] {
  return [...shares(summary.categories, NGO_CATEGORY_ORDER)].sort((a, b) => b.count - a.count)
}

/** The legal path an NGO leaves by: dissolved, then wound up, then struck off. */
export const NGO_STATUS_ORDER: readonly NgoRegistryStatusKey[] = ['registered', 'dissolved', 'inLiquidation', 'deregistered']

export function statusShares(summary: Pick<NgoRegistrySummary, 'status'>): readonly NgoShare<NgoRegistryStatusKey>[] {
  return shares(summary.status, NGO_STATUS_ORDER)
}

/** How the registry spells each status, which its filter matches exactly. */
export const REGISTRY_STATUS_VALUE: Readonly<Record<NgoRegistryStatusKey, string>> = {
  registered: 'Inregistrat',
  dissolved: 'Dizolvata',
  inLiquidation: 'In Lichidare',
  deregistered: 'Radiat',
}

/** A registry search with every filter the registry route keeps in its URL, empty unless given. */
export function registrySearch(filters: Partial<Omit<RegistrySearch, 'after'>> = {}): RegistrySearch {
  return {
    q: filters.q ?? '',
    county: filters.county ?? '',
    category: filters.category ?? '',
    status: filters.status ?? '',
    registryNumber: filters.registryNumber ?? '',
    publicUtility: filters.publicUtility ?? '',
    after: '',
  }
}

/** A registry number as the registry writes it: `3446/A/2026` (A–E: the registry's parts, by legal form). */
const REGISTRY_NUMBER = /^\d{1,6}\s*\/\s*[a-e]\s*\/\s*\d{4}$/i

/** What a typed query asks the registry for: a registry number is looked up exactly, anything else by name. */
export function registryQuery(input: string): Pick<RegistrySearch, 'q' | 'registryNumber'> {
  const text = input.trim().replace(/\s+/g, ' ')
  if (REGISTRY_NUMBER.test(text)) return { q: '', registryNumber: text.replace(/\s/g, '').toUpperCase() }
  return { q: text, registryNumber: '' }
}
