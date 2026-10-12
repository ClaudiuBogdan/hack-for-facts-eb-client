import type { CompanyHubMapIndicator } from '@/schemas/private-company-search'
import type { HubCountyLayer } from './hub-counties'
import type { CompanyHubSnapshot, HubRegistrationYear } from './hub-snapshot-types'

/**
 * Pure readings of the hub snapshot: what each band draws, computed rather
 * than written in, so a regenerated snapshot cannot leave a sentence behind.
 */

/**
 * Per 1,000 residents, unrounded: the ranking orders the exact rates, and the
 * display rounds them to one decimal, so two counties that read „60,3" still
 * stand in their true order.
 */
export function perThousand(count: number, population: number): number {
  return population > 0 ? (count / population) * 1000 : 0
}

/**
 * One county layer of the snapshot. A rate is measured against the national
 * rate; a count or a sum against the national total, which also holds the
 * few companies the registry places in no county.
 */
export function hubCountyLayer(snapshot: CompanyHubSnapshot, indicator: CompanyHubMapIndicator): HubCountyLayer {
  const { counties, national } = snapshot
  switch (indicator) {
    case 'densitate':
      return {
        unit: 'per-thousand',
        values: counties.map((county) => ({ code: county.code, value: perThousand(county.activeFirms, county.population) })),
        national: perThousand(national.activeFirms, national.population),
      }
    case 'infiintari':
      return {
        unit: 'firms',
        values: counties.map((county) => ({ code: county.code, value: county.newFirms })),
        national: national.newFirms,
      }
    case 'cifra-de-afaceri':
      return {
        unit: 'lei',
        values: counties.map((county) => ({ code: county.code, value: county.turnover })),
        national: national.turnover,
      }
  }
}

/** The share of a year's registrations still in business, or null for a year the snapshot does not hold. */
export function survivalShare(registrations: readonly HubRegistrationYear[], year: number): number | null {
  const cohort = registrations.find((entry) => entry.year === year)
  return cohort && cohort.registered > 0 ? cohort.active / cohort.registered : null
}

/** The registrations as the two series the chart draws, oldest first. */
export function registrationSeries(registrations: readonly HubRegistrationYear[]) {
  return {
    registered: registrations.map((entry) => ({ period: String(entry.year), value: entry.registered })),
    active: registrations.map((entry) => ({ period: String(entry.year), value: entry.active })),
  }
}

/** The divisions most companies founded in the fiscal year chose, with their share of the year's total. */
export function newFirmsLeadingSectors(snapshot: CompanyHubSnapshot, limit: number) {
  return snapshot.newFirmsBySector.slice(0, limit).map((entry) => ({
    ...entry,
    share: snapshot.national.newFirms > 0 ? entry.firms / snapshot.national.newFirms : 0,
  }))
}
