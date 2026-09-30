import { countyNameRo } from '@/lib/territory-counties'
import type { NgoHubLayerKey } from '@/schemas/ngos'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import type { RegistrySearch } from '../registry/api'
import type {
  NgoRegistryCategoryKey,
  NgoRegistryCountySummary,
  NgoRegistryStatusKey,
  NgoRegistrySummary,
} from './registry-summary-types'

/**
 * The figures `/ngos` derives from the registry summary, as pure
 * functions: the county layers the map colours, the legal forms and the
 * statuses with their shares, and the registry searches each figure opens.
 */

export function totalResidents(summary: Pick<NgoRegistrySummary, 'counties'>): number {
  return summary.counties.reduce((sum, county) => sum + county.residents, 0)
}

/** Residents per step of each rate: registered NGOs per 10,000, the year's new ones per 100,000. */
const LAYER_PER: Readonly<Record<Exclude<NgoHubLayerKey, 'total'>, number>> = { densitate: 10_000, noi: 100_000 }

/**
 * A registry layer in the shape the INS and procurement hubs' county band
 * reads. A rate is over the counties' residents, its national figure the
 * country's own ratio — every entry, the ones with no county included, over
 * the national population — never a mean of the county rates. The total is
 * each county's registered NGOs, a count: no national figure to stand a
 * county against, the ranking's bars from zero. The unit words are the
 * band's to say; the layer carries none.
 */
export function registryCountyLayer(summary: NgoRegistrySummary, key: NgoHubLayerKey): StatisticsHubCountyLayer {
  if (key === 'total') {
    return {
      code: 'ngo-registry-total',
      period: summary.capturedAt.slice(0, 4),
      unit: 'count',
      unitLabel: null,
      values: summary.counties.map((county) => ({ code: county.code, name: countyNameRo(county.code) ?? county.code, value: county.registered })),
      missingCounties: [],
      national: null,
    }
  }
  const per = LAYER_PER[key]
  const count = (county: NgoRegistryCountySummary) => (key === 'densitate' ? county.registered : county.added)
  const national = key === 'densitate' ? summary.status.registered : registrationsIn(summary, summary.year)
  const residents = totalResidents(summary)
  // A county with no population to divide by is hatched as missing, never drawn as zero.
  const placed = summary.counties.filter((county) => county.residents > 0)
  return {
    code: `ngo-registry-${key}`,
    // The registered NGOs are a count at the capture; the new ones, the year's registry numbers.
    period: key === 'densitate' ? summary.capturedAt.slice(0, 4) : String(summary.year),
    unit: 'other',
    unitLabel: null,
    values: placed.map((county) => ({
      code: county.code,
      name: countyNameRo(county.code) ?? county.code,
      value: (count(county) / county.residents) * per,
    })),
    missingCounties: summary.counties.filter((county) => county.residents <= 0).map((county) => county.code),
    national: residents > 0 ? (national / residents) * per : null,
  }
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
