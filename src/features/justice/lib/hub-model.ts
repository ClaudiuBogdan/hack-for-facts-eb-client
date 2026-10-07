import type { JudicialCourtLevel } from '@/schemas/judicial'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { countyNameRo } from '@/lib/territory-counties'
import type { JusticeHubSnapshot } from './hub-snapshot-types'
import { STAGE_KEYS, mergedMatters, stageKeyOf, yearBars, type Share, type StageKey, type YearBar } from './judicial-model'

/**
 * The justice front door's figures, derived from its snapshot. Pure: every
 * figure is a count the API served or a share of two; the only other source is
 * INS population, for the county rate.
 */

/** The levels a reader compares; the military courts and the ÎCCJ are counted, but too few for a column of their own. */
export const MAIN_LEVELS = ['judecatorie', 'tribunal', 'curte_de_apel'] as const satisfies readonly JudicialCourtLevel[]
export type MainLevel = (typeof MAIN_LEVELS)[number]
export type MatterScope = 'toate' | MainLevel

export function levelCount(snapshot: JusticeHubSnapshot, level: JudicialCourtLevel): number {
  return snapshot.cases.byLevelInYear[level] ?? 0
}

export function mattersIn(snapshot: JusticeHubSnapshot, scope: MatterScope): readonly Share[] {
  return mergedMatters(scope === 'toate' ? snapshot.matters.inYear : (snapshot.matters.byLevelInYear[scope] ?? []))
}

export interface CourtRow {
  readonly code: string
  readonly level: JudicialCourtLevel
  readonly county: string | null
  readonly count: number
  /** The court's share of its level's cases of the year. */
  readonly share: number
}

/** A level's courts by their cases of the snapshot's year, largest first; courts with none of that year stay out. */
export function courtsOf(snapshot: JusticeHubSnapshot, level: JudicialCourtLevel): readonly CourtRow[] {
  const courts = snapshot.courts.filter((court) => court.level === level && court.casesInYear > 0)
  const total = courts.reduce((sum, court) => sum + court.casesInYear, 0)
  return courts
    .map((court) => ({ code: court.code, level, county: court.county, count: court.casesInYear, share: total === 0 ? 0 : court.casesInYear / total }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
}

export type StageRow = Readonly<Record<StageKey | 'other', number>>

/**
 * The year's cases by level and stage. `other` holds what the counted stages
 * do not reach, so a level's row adds up to its total.
 */
export function stageMatrix(snapshot: JusticeHubSnapshot): Readonly<Partial<Record<JudicialCourtLevel, StageRow>>> {
  const matrix: Partial<Record<JudicialCourtLevel, Record<StageKey | 'other', number>>> = {}
  const rowOf = (level: JudicialCourtLevel) => (matrix[level] ??= { fond: 0, apel: 0, recurs: 0, contestatie: 0, extraordinare: 0, other: 0 })
  for (const level of Object.keys(snapshot.cases.byLevelInYear) as JudicialCourtLevel[]) rowOf(level)
  for (const stage of snapshot.stages) {
    for (const [level, count] of Object.entries(stage.byLevelInYear) as [JudicialCourtLevel, number][]) rowOf(level)[stageKeyOf(stage.stage)] += count
  }
  for (const level of Object.keys(matrix) as JudicialCourtLevel[]) {
    const row = rowOf(level)
    row.other = Math.max(0, levelCount(snapshot, level) - STAGE_KEYS.reduce((sum, key) => sum + row[key], 0))
  }
  return matrix
}

export function stageTotal(snapshot: JusticeHubSnapshot, key: StageKey): number {
  return snapshot.stages
    .filter((stage) => stageKeyOf(stage.stage) === key)
    .reduce((sum, stage) => sum + Object.values(stage.byLevelInYear).reduce((total, count) => total + (count ?? 0), 0), 0)
}

export interface CountyPopulation {
  /** The year of 1 January the residents were counted on. */
  readonly year: number
  readonly national: number
  readonly byCounty: ReadonlyMap<string, number>
}

/**
 * Cases of the snapshot's year at the county's judecătorii, per 1,000
 * residents; the country's on the same basis (every judecătorie over the
 * national population). Null when the population is not of the cases' year:
 * a rate takes its denominator from the same year.
 */
export function judecatoriiPerThousand(snapshot: JusticeHubSnapshot, population: CountyPopulation): StatisticsHubCountyLayer | null {
  if (population.year !== snapshot.year) return null
  const byCounty = new Map<string, number>()
  for (const court of snapshot.courts) {
    if (court.level !== 'judecatorie' || court.county === null) continue
    byCounty.set(court.county, (byCounty.get(court.county) ?? 0) + court.casesInYear)
  }
  const values = [...byCounty.entries()]
    .flatMap(([code, count]) => {
      const residents = population.byCounty.get(code)
      return residents ? [{ code, name: countyNameRo(code) ?? code, value: (count / residents) * 1000 }] : []
    })
    .sort((a, b) => a.code.localeCompare(b.code))
  return {
    code: `justice-judecatorii-${snapshot.year}`,
    period: String(snapshot.year),
    unit: 'other',
    unitLabel: null,
    values,
    missingCounties: [...population.byCounty.keys()].filter((code) => !byCounty.has(code)).sort(),
    national: (levelCount(snapshot, 'judecatorie') / population.national) * 1000,
  }
}

/** The capture's last year: the year of the Portal's newest modification. */
export function lastCaptureYear(snapshot: JusticeHubSnapshot): number {
  return Number(snapshot.asOf.portalModifiedAt.slice(0, 4))
}

/** The first year the capture holds whole: two years before the reference year (scrapper JR-6: no shortfall from 2024, dense from 2023). */
export function firstWholeYear(snapshot: JusticeHubSnapshot): number {
  return snapshot.year - 2
}

export function hubYearBars(snapshot: JusticeHubSnapshot, from = 2019): readonly YearBar[] {
  return yearBars(snapshot.cases.byYear, { from, lastYear: lastCaptureYear(snapshot), firstWholeYear: firstWholeYear(snapshot) })
}

export function echrJudgmentsTotal(snapshot: JusticeHubSnapshot): number {
  return snapshot.decisions.echrJudgments.reduce((sum, entry) => sum + entry.count, 0)
}

/** A series in its keys' order (years, months). */
export function sortedSeries(groups: readonly { readonly key: string; readonly count: number }[]): readonly { readonly key: string; readonly count: number }[] {
  return [...groups].sort((a, b) => a.key.localeCompare(b.key))
}
