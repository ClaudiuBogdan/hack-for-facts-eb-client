import { COUNTY_MAP_STEPS, countyScale, type CountyScale } from '@/features/statistics/lib/county-map'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { STATUS_ACTIVE } from './company-status-codes'
import { sharedDecimals, type HubUnit } from './hub-format'

/**
 * The hub's county layers: one figure per county, keyed by the county code
 * (`CJ`, `B`), which is also the boundary file's mnemonic, so the map joins
 * without folding names.
 */

export interface HubCountyValue {
  /** The county code (`CJ`, `B`). */
  readonly code: string
  readonly value: number
}

export interface HubCountyLayer {
  readonly unit: HubUnit
  readonly values: readonly HubCountyValue[]
  /** The country's figure on the same basis: the total for a count, the national rate for a rate. */
  readonly national: number
}

const COUNTY_NAMES = new Map<string, string>(ROMANIA_COUNTIES.map((county) => [county.code, county.nameRo]))

export function countyName(code: string): string {
  return COUNTY_NAMES.get(code) ?? code
}

/**
 * The county as the registry spells it, which is how the directory's county
 * facet names it: the cedilla forms (`Timiş`, `Bucureşti`) ONRC writes, not
 * the comma-below ones the boundary file and `ROMANIA_COUNTIES` use. The
 * server folds both, so either filters the same rows; this one also ticks the
 * county's box in the directory's filter sheet.
 */
export function registryCountyName(code: string): string {
  return countyName(code).replace(/ș/g, 'ş').replace(/ț/g, 'ţ').replace(/Ș/g, 'Ş').replace(/Ț/g, 'Ţ')
}

/**
 * What a county opens, whatever the layer: the directory on its companies in
 * business. The map is a way into a place — its figure describes the place,
 * not a list — and the readout's link says where it leads („Firmele
 * județului").
 */
export function countyDirectorySearch(code: string) {
  return { county: [registryCountyName(code)], status: [STATUS_ACTIVE] }
}

/** Highest first; ties share the order they arrive in. */
export function rankCounties(values: readonly HubCountyValue[]): readonly HubCountyValue[] {
  return [...values].sort((a, b) => b.value - a.value)
}

/** The scale a layer is coloured by, on the map and in the ranking alike. */
export function hubLayerScale(layer: HubCountyLayer): CountyScale {
  return countyScale(
    layer.values.map((county) => county.value),
    COUNTY_MAP_STEPS,
  )
}

/** The decimals every figure of a layer carries, the national one included: one for a rate, none for a count. */
export function hubLayerDecimals(layer: HubCountyLayer): number {
  return layer.unit === 'per-thousand' ? sharedDecimals([...layer.values.map((county) => county.value), layer.national]) : 0
}

/** Codes of the counties the layer has no figure for: hatched, named, never zero. */
export function missingCounties(layer: HubCountyLayer): readonly string[] {
  const present = new Set(layer.values.map((county) => county.code))
  return ROMANIA_COUNTIES.filter((county) => !present.has(county.code)).map((county) => county.code)
}
