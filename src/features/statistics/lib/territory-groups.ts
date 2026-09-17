import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { StatisticsHubUnit, StatisticsIndicatorTile } from '@/schemas/statistics'

/**
 * How the territory hub orders its seventy-odd indicators.
 *
 * INS matrix codes carry their domain in the first three letters (`POP`,
 * `FOM`, `GOS`…), which is the only grouping the catalog gives at this
 * level; the context path names the sub-chapter but not a domain a reader
 * would browse by. The headline four come first as a band; everything else
 * is one group per domain, in a fixed order that starts with people and ends
 * with the specialised domains.
 */

export interface TerritoryGroupDefinition {
  readonly key: string
  readonly label: MessageDescriptor
  readonly prefixes: readonly string[]
}

export const TERRITORY_GROUPS: readonly TerritoryGroupDefinition[] = [
  { key: 'populatie', label: msg`Populație`, prefixes: ['POP'] },
  { key: 'munca', label: msg`Muncă și șomaj`, prefixes: ['FOM', 'SOM'] },
  { key: 'locuire', label: msg`Locuire`, prefixes: ['LOC'] },
  { key: 'educatie', label: msg`Educație`, prefixes: ['SCL'] },
  { key: 'sanatate', label: msg`Sănătate`, prefixes: ['SAN'] },
  { key: 'utilitati', label: msg`Utilități publice`, prefixes: ['GOS'] },
  { key: 'turism', label: msg`Turism`, prefixes: ['TUR'] },
  { key: 'cultura', label: msg`Cultură`, prefixes: ['ART'] },
  { key: 'agricultura', label: msg`Agricultură`, prefixes: ['AGR'] },
  { key: 'justitie', label: msg`Justiție`, prefixes: ['JUS'] },
  { key: 'administratie', label: msg`Administrație`, prefixes: ['ADM'] },
]

export const TERRITORY_OTHER_GROUP: TerritoryGroupDefinition = {
  key: 'altele',
  label: msg`Alte domenii`,
  prefixes: [],
}

/** The four the band leads with, in order. The hub's own registry says the same. */
export const TERRITORY_HEADLINE_CODES: readonly string[] = ['POP107D', 'FOM104D', 'SOM101F', 'LOC101B']

export interface TerritoryGroup {
  readonly definition: TerritoryGroupDefinition
  readonly tiles: readonly StatisticsIndicatorTile[]
}

export function territoryGroupOf(code: string): TerritoryGroupDefinition {
  const prefix = code.slice(0, 3).toUpperCase()
  return TERRITORY_GROUPS.find((group) => group.prefixes.includes(prefix)) ?? TERRITORY_OTHER_GROUP
}

/**
 * Splits the hub's tiles into the headline band and the domain groups.
 * Headline tiles are not repeated in their group; groups with nothing in
 * them are absent, and „Alte domenii" comes last.
 */
export function groupTerritoryTiles(tiles: readonly StatisticsIndicatorTile[]): {
  readonly headline: readonly StatisticsIndicatorTile[]
  readonly groups: readonly TerritoryGroup[]
} {
  const byCode = new Map(tiles.map((tile) => [tile.datasetCode, tile]))
  const headline = TERRITORY_HEADLINE_CODES.flatMap((code) => {
    const tile = byCode.get(code)
    return tile ? [tile] : []
  })
  const headlineCodes = new Set(headline.map((tile) => tile.datasetCode))
  const buckets = new Map<string, StatisticsIndicatorTile[]>()
  for (const tile of tiles) {
    if (headlineCodes.has(tile.datasetCode)) continue
    const group = territoryGroupOf(tile.datasetCode)
    const bucket = buckets.get(group.key) ?? []
    bucket.push(tile)
    buckets.set(group.key, bucket)
  }
  const groups = [...TERRITORY_GROUPS, TERRITORY_OTHER_GROUP].flatMap((definition) => {
    const bucket = buckets.get(definition.key)
    return bucket && bucket.length > 0 ? [{ definition, tiles: bucket }] : []
  })
  return { headline, groups }
}

/** The word after a tile's number, from the unit the API resolved for it. */
export function tileUnit(tile: Pick<StatisticsIndicatorTile, 'unitSymbol' | 'unitNameRo'>): StatisticsHubUnit {
  const symbol = tile.unitSymbol?.toLowerCase() ?? ''
  const name = tile.unitNameRo?.toLowerCase() ?? ''
  if (symbol === 'persons' || name.startsWith('numar persoane')) return 'persons'
  if (symbol === 'percent' || name.startsWith('procent')) return 'percent'
  if (symbol === 'count' || name === 'numar') return 'count'
  if (name === 'ani') return 'years'
  return 'other'
}
