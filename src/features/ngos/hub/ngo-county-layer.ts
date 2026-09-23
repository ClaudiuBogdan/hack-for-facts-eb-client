import { t } from '@lingui/core/macro'
import { COUNTY_MAP_STEPS, countyScale, type CountyScale } from '@/features/statistics/lib/county-map'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { formatNgoShare, formatNgoSigned } from './ngo-format'
import { REGISTRY_STATUS_VALUE, registrySearch, type NgoCountyLayer, type NgoCountyValue } from './registry-figures'

/** What the county map and its ranking share: names, the colour scale, the county's registry search and its reading against the country. */

const COUNTY_NAMES = new Map<string, string>(ROMANIA_COUNTIES.map((county) => [county.code, county.nameRo]))
export function countyName(code: string): string {
  return COUNTY_NAMES.get(code) ?? code
}

export function layerScale(layer: NgoCountyLayer): CountyScale {
  return countyScale(
    layer.values.map((county) => county.value),
    COUNTY_MAP_STEPS,
  )
}

/** Where a county's registered NGOs are listed: the registry, filtered by the county as the registry spells it. */
export function countyRegistrySearch(county: NgoCountyValue) {
  return registrySearch({ county: county.source, status: REGISTRY_STATUS_VALUE.registered })
}

/** The county against the country: a rate by its difference, a count by its share of the total. */
export function describeAgainstCountry(layer: NgoCountyLayer, value: number): string | null {
  if (layer.national <= 0) return null
  if (layer.kind === 'rate') {
    const difference = formatNgoSigned(value - layer.national, layer.digits)
    return t`${difference} față de România`
  }
  const share = formatNgoShare(value / layer.national)
  return t`${share} din totalul țării`
}
