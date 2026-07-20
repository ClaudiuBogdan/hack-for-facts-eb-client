import type {
  ProcurementCountyOption,
  ProcurementGeographyOptions,
} from '../api/procurement-reference-api'

/** Reference county labels are uppercase; preserve Romanian diacritics. */
export function formatProcurementCountyName(value: string): string {
  return value
    .toLocaleLowerCase('ro-RO')
    .replace(/(^|[\s-])\p{L}/gu, (match) => match.toLocaleUpperCase('ro-RO'))
}

export function findProcurementCounty(
  geography: ProcurementGeographyOptions | undefined,
  countyCode: string | undefined,
): ProcurementCountyOption | undefined {
  if (!countyCode) return undefined
  return geography?.counties.find((county) => county.countyCode === countyCode)
}

export function effectiveBuyerRegion(
  geography: ProcurementGeographyOptions | undefined,
  filters: {
    readonly buyerRegion?: string
    readonly buyerCounty?: string
  },
): string | undefined {
  if (filters.buyerCounty) {
    return findProcurementCounty(geography, filters.buyerCounty)?.region ?? undefined
  }
  return filters.buyerRegion
}
