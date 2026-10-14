import { COUNTY_MAP_STEPS, countyScale, type CountyScale } from '@/features/statistics/lib/county-map'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
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
