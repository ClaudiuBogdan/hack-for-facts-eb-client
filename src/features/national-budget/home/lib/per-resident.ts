/**
 * The national budget at one person's scale: the tables the page divides
 * by, kept here because the API serves neither (owner, 25 November 2026:
 * static tables, labelled; the ask to serve them is
 * `docs/issues/NB-002-population-and-gdp-tables.md`).
 */
import { plotOf } from '@/features/national-budget/analytics/lib/exact'

/** Where the population figures come from, for the page's data note. */
export const POPULATION_SOURCE = { name: 'INS, Tempo POP105A', read: '2026-11-25', provisional: [2026] } as const

/**
 * Resident population on 1 January (INS, Tempo POP105A; Eurostat
 * `demo_gind` JAN carries the same figures). A year is divided by the
 * population at its own 1 January; 2026 is provisional.
 */
const POPULATION: Readonly<Record<number, number>> = {
  2006: 21_257_016,
  2007: 21_130_503,
  2008: 20_635_460,
  2009: 20_440_290,
  2010: 20_294_683,
  2011: 20_199_059,
  2012: 20_095_996,
  2013: 20_020_074,
  2014: 19_947_311,
  2015: 19_870_647,
  2016: 19_760_585,
  2017: 19_643_949,
  2018: 19_533_481,
  2019: 19_414_458,
  2020: 19_328_838,
  2021: 19_201_662,
  2022: 19_043_098,
  2023: 19_055_228,
  2024: 19_067_576,
  2025: 19_043_151,
  2026: 19_041_322,
}

export function populationOf(year: number): number | null {
  return POPULATION[year] ?? null
}

/** An exact amount in lei over the year's resident population; null without either. */
export function perResident(exact: string | null | undefined, year: number): number | null {
  const lei = plotOf(exact)
  const people = populationOf(year)
  return lei === null || people === null ? null : lei / people
}

/** Where the GDP figures come from, for the borrowing section's note. */
export const GDP_SOURCE = { name: 'INS, Tempo CON111B (Eurostat nama_10_gdp, B1GQ, CP_MNAC)', read: '2026-11-24', provisional: [2025] } as const

/**
 * Annual GDP at current prices, million lei. The bulletins print the
 * deficit's share of GDP from 2019 on (not 2023's), and print no GDP for
 * the other years: there, the share is the printed deficit over this GDP,
 * and the page says which years. 2025 is provisional.
 */
const GDP_MILLION_LEI: Readonly<Record<number, number>> = {
  2006: 342_762.6,
  2007: 425_691.1,
  2008: 539_831.4,
  2009: 530_919.6,
  2010: 540_447.5,
  2011: 587_235.0,
  2012: 621_214.7,
  2013: 631_634.0,
  2014: 668_905.0,
  2015: 712_548.6,
  2016: 752_129.1,
  2017: 851_620.6,
  2018: 952_385.3,
  2019: 1_053_192.3,
  2020: 1_056_302.0,
  2021: 1_179_828.6,
  2022: 1_378_461.4,
  2023: 1_587_956.5,
  2024: 1_767_517.1,
  2025: 1_929_930.0,
}

/** A finished year's GDP in lei; null for a year the table doesn't hold. */
export function gdpLeiOf(year: number): number | null {
  const million = GDP_MILLION_LEI[year]
  return million === undefined ? null : million * 1e6
}

/**
 * Whole parts of a `whole` (100 lei by default), by the largest remainder:
 * each value's exact share rounded down, then the units left go to the
 * largest remainders, so the parts always add up to the whole.
 */
export function outOfHundred(values: readonly number[], whole = 100): readonly number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (total <= 0) return values.map(() => 0)
  const exact = values.map((value) => (Math.max(0, value) / total) * whole)
  const floors = exact.map(Math.floor)
  let left = whole - floors.reduce((sum, value) => sum + value, 0)
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest)
  for (const { index } of order) {
    if (left <= 0) break
    floors[index] = (floors[index] ?? 0) + 1
    left -= 1
  }
  return floors
}
