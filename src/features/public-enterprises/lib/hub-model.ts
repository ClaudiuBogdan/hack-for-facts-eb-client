import { foldCountyName } from '@/features/private-companies/lib/county-names'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type {
  PublicEnterpriseAuthorityGroup,
  PublicEnterprisePopulation,
  PublicEnterpriseSizeMeasure,
} from '@/schemas/public-enterprises'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import type {
  PublicEnterpriseStatusCount,
  PublicEnterpriseAuthorityRow,
  PublicEnterpriseHubSnapshot,
  PublicEnterpriseRankedEnterprise,
  PublicEnterpriseSplit,
} from './hub-snapshot-types'

/**
 * What the public-enterprise hub reads off its snapshot, as pure functions:
 * the rankings, the county layer, the activities, the statuses. Nothing here
 * adds money across enterprises: the counts are of enterprises, the money is
 * one enterprise's own figure.
 */

const GROUP_RANKING = { stat: 'central', judete: 'county', local: 'local' } as const satisfies Record<PublicEnterpriseAuthorityGroup, keyof PublicEnterpriseHubSnapshot['control']['ranking']>

/** The authorities with the most enterprises in ANAF's list, for one group. */
export function authorityRanking(snapshot: PublicEnterpriseHubSnapshot, group: PublicEnterpriseAuthorityGroup): readonly PublicEnterpriseAuthorityRow[] {
  return snapshot.control.ranking[GROUP_RANKING[group]]
}

/** The largest enterprises of the financial year by one measure, as filed. */
export function largestEnterprises(snapshot: PublicEnterpriseHubSnapshot, measure: PublicEnterpriseSizeMeasure): readonly PublicEnterpriseRankedEnterprise[] {
  const largest = snapshot.financials.largest
  return measure === 'salariati' ? largest.employees : measure === 'pierdere' ? largest.loss : largest.turnover
}

/** One population's count in a row split by level. */
export function populationCount(row: PublicEnterpriseSplit, population: PublicEnterprisePopulation): number {
  return population === 'locale' ? row.local : population === 'centrale' ? row.central : row.total
}

/** How many current members a population holds: all, or one level's (ANAF's list). */
export function populationTotal(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation): number {
  return population === 'locale' ? snapshot.control.local : population === 'centrale' ? snapshot.control.central : snapshot.members.current
}

// ──────────────────────────────────────────────────────────── counties ──

const CODE_BY_NAME = new Map(ROMANIA_COUNTIES.map((county) => [foldCountyName(county.nameRo), county.code]))

/** A county name as the trade registry writes it („Timiş", „Bucureşti") to its code; null where it names no county. */
export function countyCode(name: string | null): string | null {
  return name ? (CODE_BY_NAME.get(foldCountyName(name)) ?? null) : null
}

/**
 * The enterprises by the county of their seat, as the hubs' county band reads
 * a layer. Every member was read, so a county with none there is a zero, not
 * a gap; a count has no national figure to colour against.
 */
export function countyLayer(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation): StatisticsHubCountyLayer {
  const byCode = new Map<string, number>()
  for (const row of snapshot.counties) {
    const code = countyCode(row.county)
    if (code) byCode.set(code, (byCode.get(code) ?? 0) + populationCount(row, population))
  }
  return {
    code: `public-enterprises-${population}`,
    period: snapshot.generatedAt.slice(0, 4),
    unit: 'count',
    unitLabel: null,
    values: ROMANIA_COUNTIES.map((county) => ({ code: county.code, name: county.nameRo, value: byCode.get(county.code) ?? 0 })),
    missingCounties: [],
    national: null,
  }
}

/** Members whose seat names no county the map knows: said under the map, never dropped. */
export function unplacedCount(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation): number {
  return snapshot.counties.filter((row) => countyCode(row.county) === null).reduce((sum, row) => sum + populationCount(row, population), 0)
}

/** The counties, most enterprises first; ties by name. */
export function countyRanking(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation): StatisticsHubCountyLayer['values'] {
  return [...countyLayer(snapshot, population).values].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ro'))
}

// ────────────────────────────────────────────────────────── activities ──

export type SectorRow = { readonly division: string; readonly count: number }

/** The CAEN divisions with at least one enterprise of the population, most first. */
export function sectorRanking(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation): readonly SectorRow[] {
  return snapshot.sectors
    .flatMap((row) => (row.division === null ? [] : [{ division: row.division, count: populationCount(row, population) }]))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.division.localeCompare(b.division))
}

/** Members ANAF holds no main CAEN code for. */
export function withoutSector(snapshot: PublicEnterpriseHubSnapshot, population: PublicEnterprisePopulation): number {
  const row = snapshot.sectors.find((entry) => entry.division === null)
  return row ? populationCount(row, population) : 0
}

// ──────────────────────────────────────────────────────────── control ──

/** The kinds of authority, most enterprises first. */
export function authorityKinds(snapshot: PublicEnterpriseHubSnapshot): PublicEnterpriseHubSnapshot['control']['kinds'] {
  return [...snapshot.control.kinds].sort((a, b) => b.enterprises - a.enterprises || a.kind.localeCompare(b.kind))
}

// ──────────────────────────────────────────────────────────── statuses ──

/** How many ANAF's list marks with one status (`ACTIV`, `INACTIV`); a status it does not use counts none. */
export function s1001Count(snapshot: PublicEnterpriseHubSnapshot, status: 'ACTIV' | 'INACTIV'): number {
  return snapshot.status.s1001.find((row) => row.status === status)?.enterprises ?? 0
}

export function sourceOf(snapshot: PublicEnterpriseHubSnapshot, family: PublicEnterpriseHubSnapshot['sources'][number]['family']) {
  return snapshot.sources.find((source) => source.family === family) ?? null
}

/** The source lanes in one state (`partial`, `unavailable`): the page names them in its caveats. */
export function sourcesIn(snapshot: PublicEnterpriseHubSnapshot, laneStatus: 'partial' | 'unavailable'): readonly PublicEnterpriseHubSnapshot['sources'][number]['family'][] {
  return snapshot.sources.filter((source) => source.laneStatus === laneStatus).map((source) => source.family)
}

/** The authority with the most enterprises in ANAF's list, whichever its group. */
export function leadingAuthority(snapshot: PublicEnterpriseHubSnapshot): PublicEnterpriseAuthorityRow | null {
  const { central, county, local } = snapshot.control.ranking
  return [...central, ...county, ...local].reduce<PublicEnterpriseAuthorityRow | null>((best, row) => (best === null || row.enterprises > best.enterprises ? row : best), null)
}

/**
 * A source's statuses, its most frequent first, the tail folded into one
 * count (`rest`) so a long list of rare words stays one row: every
 * enterprise is still counted.
 */
export function statusesWithRest(rows: readonly PublicEnterpriseStatusCount[], shown: number): { readonly rows: readonly PublicEnterpriseStatusCount[]; readonly rest: number } {
  return { rows: rows.slice(0, shown), rest: rows.slice(shown).reduce((sum, row) => sum + row.enterprises, 0) }
}
