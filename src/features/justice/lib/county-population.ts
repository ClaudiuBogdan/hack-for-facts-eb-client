import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import type { CountyPopulation } from './hub-model'

/** Residents on 1 January of the population year, by county, from the companies hub's INS read (POP105A). */
export const COUNTY_POPULATION: CountyPopulation = {
  year: COMPANY_HUB_SNAPSHOT.fiscalYear,
  national: COMPANY_HUB_SNAPSHOT.national.population,
  byCounty: new Map(COMPANY_HUB_SNAPSHOT.counties.map((county) => [county.code, county.population])),
}
