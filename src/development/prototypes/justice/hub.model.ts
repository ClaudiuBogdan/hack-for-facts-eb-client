import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import type { JudicialCourtLevel } from '@/schemas/judicial'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { countyNameRo } from '@/lib/territory-counties'
import data from './hub.data.json'

/**
 * The justice hub's figures, derived from `hub.data.json` (regenerated from the
 * live API by `scripts/generate-justice-hub-fixtures.mjs`). Pure: every
 * figure is a count the API served or a share of two of them; the only other
 * source is INS population, for the county rate.
 */

export type HubData = typeof data
export const HUB = data as HubData

export type Level = JudicialCourtLevel
/** The levels a reader compares; the military courts and the ÎCCJ are counted, but too few for a column of their own. */
export const MAIN_LEVELS = ['judecatorie', 'tribunal', 'curte_de_apel'] as const satisfies readonly Level[]
export type MainLevel = (typeof MAIN_LEVELS)[number]

const squash = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

export interface Share {
  readonly key: string
  readonly count: number
  readonly share: number
}

/** A matter's groups merged by its squashed name: the ÎCCJ's „Contencios administrativ şi fiscal" is the Portal's `Contenciosadministrativsifiscal`. */
export function mergedMatters(groups: readonly { readonly key: string; readonly count: number }[]): readonly Share[] {
  const merged = new Map<string, number>()
  for (const group of groups) merged.set(squash(group.key), (merged.get(squash(group.key)) ?? 0) + group.count)
  const total = [...merged.values()].reduce((sum, count) => sum + count, 0)
  return [...merged.entries()]
    .map(([key, count]) => ({ key, count, share: total === 0 ? 0 : count / total }))
    .sort((a, b) => b.count - a.count)
}

export type MatterScope = 'toate' | MainLevel

export function mattersIn(scope: MatterScope): readonly Share[] {
  if (scope === 'toate') return mergedMatters(HUB.matters.inYear)
  return mergedMatters(HUB.matters.byLevelInYear[scope])
}

export interface CourtRow {
  readonly code: string
  readonly level: Level
  readonly county: string | null
  readonly count: number
  readonly share: number
}

/** The courts of a level by their cases dated in the reference year; the share is of the level's cases. */
export function courtsOf(level: Level): readonly CourtRow[] {
  const courts = HUB.courts.filter((court) => court.level === level)
  const total = courts.reduce((sum, court) => sum + court.casesInYear, 0)
  return courts
    .map((court) => ({ code: court.code, level, county: court.county, count: court.casesInYear, share: total === 0 ? 0 : court.casesInYear / total }))
    .sort((a, b) => b.count - a.count)
}

/** Cases dated in the reference year at a level. */
export function levelCount(level: Level): number {
  return (HUB.cases.byLevelInYear as Partial<Record<Level, number>>)[level] ?? 0
}

/** The stages a reader knows, the rest gathered as the extraordinary remedies. */
export type StageKey = 'fond' | 'apel' | 'recurs' | 'contestatie' | 'extraordinare'
export const STAGE_KEYS: readonly StageKey[] = ['fond', 'apel', 'recurs', 'contestatie', 'extraordinare']

function stageKey(stage: string): StageKey {
  if (stage === 'Fond') return 'fond'
  if (stage === 'Apel') return 'apel'
  if (stage === 'Recurs') return 'recurs'
  if (stage === 'ContestaţieNCPP') return 'contestatie'
  return 'extraordinare'
}

/** Cases dated in the reference year by level and stage; `other` keeps what the stage list does not reach, so rows add up to the level. */
export function stageMatrix(): Readonly<Record<Level, Readonly<Record<StageKey | 'other', number>>>> {
  const levels = Object.keys(HUB.cases.byLevelInYear) as Level[]
  const matrix = {} as Record<Level, Record<StageKey | 'other', number>>
  for (const level of levels) matrix[level] = { fond: 0, apel: 0, recurs: 0, contestatie: 0, extraordinare: 0, other: 0 }
  for (const stage of HUB.stages) {
    for (const [level, count] of Object.entries(stage.byLevelInYear) as [Level, number][]) {
      const row = matrix[level]
      if (row) row[stageKey(stage.stage)] += count
    }
  }
  for (const level of levels) {
    const row = matrix[level]
    const counted = STAGE_KEYS.reduce((sum, key) => sum + row[key], 0)
    row.other = Math.max(0, levelCount(level) - counted)
  }
  return matrix
}

export function stageTotal(key: StageKey): number {
  return HUB.stages.filter((stage) => stageKey(stage.stage) === key).reduce((sum, stage) => sum + stage.inYear, 0)
}

/** Residents on 1 January of the population year, from the companies hub's INS read (POP105A). */
const POPULATION = new Map(COMPANY_HUB_SNAPSHOT.counties.map((county) => [county.code, county.population]))
export const POPULATION_YEAR = COMPANY_HUB_SNAPSHOT.fiscalYear

/**
 * Cases dated in the reference year at the county's judecătorii, per 1,000
 * residents; the country's on the same basis (all judecătorii over the
 * national population). Null when the population year is not the cases' year.
 */
export function judecatoriiPerThousand(): StatisticsHubCountyLayer | null {
  if (POPULATION_YEAR !== HUB.year) return null
  const byCounty = new Map<string, number>()
  for (const court of HUB.courts) {
    if (court.level !== 'judecatorie' || court.county === null) continue
    byCounty.set(court.county, (byCounty.get(court.county) ?? 0) + court.casesInYear)
  }
  const values = [...byCounty.entries()]
    .filter(([code]) => POPULATION.has(code))
    .map(([code, count]) => ({ code, name: countyNameRo(code) ?? code, value: (count / (POPULATION.get(code) ?? 1)) * 1000 }))
  const national = (levelCount('judecatorie') / COMPANY_HUB_SNAPSHOT.national.population) * 1000
  return {
    code: 'justice-judecatorii-2025',
    period: String(HUB.year),
    unit: 'other',
    unitLabel: null,
    values,
    missingCounties: [...POPULATION.keys()].filter((code) => !byCounty.has(code)),
    national,
  }
}

export interface YearBar {
  readonly year: number
  readonly count: number
  /** Before the dense capture: the count is what the crawl reached, not the courts' caseload. */
  readonly partial: boolean
  /** The year the capture ends in: a part-year. */
  readonly running: boolean
}

/** The years the hub draws: 2019 to the capture's last year. */
export function yearBars(from = 2019): readonly YearBar[] {
  const lastYear = Number(HUB.asOf.portalModifiedAt.slice(0, 4))
  return HUB.cases.byYear
    .map((group) => ({ year: Number(group.key), count: group.count }))
    .filter((entry) => Number.isFinite(entry.year) && entry.year >= from && entry.year <= lastYear)
    .sort((a, b) => a.year - b.year)
    .map((entry) => ({ ...entry, partial: entry.year < HUB.year - 2, running: entry.year === lastYear }))
}

export function seriesOf(groups: readonly { readonly key: string; readonly count: number }[]): readonly { readonly key: string; readonly count: number }[] {
  return [...groups].sort((a, b) => a.key.localeCompare(b.key))
}
