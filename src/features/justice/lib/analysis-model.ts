import type { JudicialCourtLevel } from '@/schemas/judicial'
import {
  ANALYSIS_SEARCH_KEYS,
  ICCJ_CODE,
  LEVEL_CODES,
  LEVEL_KEYS,
  levelKeyOf,
  MATTER_CODES,
  MATTER_KEYS,
  matterKeyOf,
  OTHER_STAGES,
  STAGE_CODES,
  type AnalysisSearchKey,
  type LevelKey,
  type MatterKey,
} from './analysis-codes'
import { JUSTICE_HUB_SNAPSHOT } from './hub-snapshot'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_LAST_CAPTURE_YEAR, JUSTICE_REFERENCE_YEAR } from './hub-years'
import { STAGE_KEYS, type CountGroup, type StageKey } from './judicial-model'

/**
 * The justice analysis page's question, pure (design.md §15): what the
 * address holds, the filter each `judicialCaseload` read sends, and the rows
 * an answer draws. Every figure is a count the API served, a sum of them, or
 * a share of two. The codes it filters by are `analysis-codes.ts`'s.
 */

export { ANALYSIS_SEARCH_KEYS, ICCJ_CODE, LEVEL_CODES, LEVEL_KEYS, levelKeyOf, MATTER_CODES, MATTER_KEYS, matterKeyOf, OTHER_STAGES, STAGE_CODES, type AnalysisSearchKey, type LevelKey, type MatterKey }

// ────────────────────────────────────────────────────────────── courts ──

export interface CourtInfo {
  readonly code: string
  /** The level as the API stores it, and its group on this page. */
  readonly apiLevel: JudicialCourtLevel
  readonly level: LevelKey
  /** The county abbreviation the API stores (`B`, `CJ`); null for the ÎCCJ. */
  readonly county: string | null
}

/** Every court the API lists, from the front door's snapshot (the reference list does not move with the capture). */
export const COURTS: ReadonlyMap<string, CourtInfo> = new Map(
  JUSTICE_HUB_SNAPSHOT.courts.flatMap((court) => {
    const level = levelKeyOf(court.level)
    return level ? [[court.code, { code: court.code, apiLevel: court.level, level, county: court.county }] as const] : []
  }),
)

export const COUNTY_CODES: readonly string[] = [...new Set([...COURTS.values()].flatMap((court) => (court.county ? [court.county] : [])))].sort()

/** The county key of the courts with none: the ÎCCJ, which judges for the whole country. */
export const NO_COUNTY = 'tara'

// ──────────────────────────────────────────────────────────── question ──

export type Grouping = 'instante' | 'judete' | 'materii' | 'etape' | 'niveluri'
export const GROUPINGS: readonly Grouping[] = ['instante', 'judete', 'materii', 'etape', 'niveluri']

export type Measure = 'dosare' | 'locuitori'

export interface Question {
  readonly year: number
  readonly levels: readonly LevelKey[]
  readonly matters: readonly MatterKey[]
  readonly stages: readonly StageKey[]
  readonly counties: readonly string[]
  readonly courts: readonly string[]
  readonly dupa: Grouping
  readonly masura: Measure
}

/** The years a question can be asked of: the capture's whole years and its last part-year, newest first. */
export const YEARS: readonly number[] = Array.from({ length: JUSTICE_LAST_CAPTURE_YEAR - JUSTICE_FIRST_WHOLE_YEAR + 1 }, (_, index) => JUSTICE_LAST_CAPTURE_YEAR - index)

/** The years band's first year: the crawl began in May 2013. */
export const BAND_FROM = 2013

export const DEFAULT_QUESTION: Question = {
  year: JUSTICE_REFERENCE_YEAR,
  levels: [],
  matters: [],
  stages: [],
  counties: [],
  courts: [],
  dupa: 'instante',
  masura: 'dosare',
}

/** The address as the page writes it. The year travels as a number: the router would write a numeric string quoted (`an=%222024%22`). */
export type AnalysisSearch = Partial<Record<Exclude<AnalysisSearchKey, 'an'>, string>> & { readonly an?: number }

function listOf<T extends string>(value: unknown, allowed: (item: string) => item is T): readonly T[] {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(',').map((item) => item.trim()))].filter(allowed)
}

const isLevel = (item: string): item is LevelKey => (LEVEL_KEYS as readonly string[]).includes(item)
const isMatter = (item: string): item is MatterKey => (MATTER_KEYS as readonly string[]).includes(item)
const isStage = (item: string): item is StageKey => (STAGE_KEYS as readonly string[]).includes(item)
const isCounty = (item: string): item is string => COUNTY_CODES.includes(item)
const isCourt = (item: string): item is string => COURTS.has(item)

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/** The question an address asks; a value the page does not know is dropped, never guessed. */
export function questionOf(search: Readonly<Record<string, unknown>>): Question {
  const year = typeof search.an === 'number' || typeof search.an === 'string' ? Number(search.an) : NaN
  return {
    year: YEARS.includes(year) ? year : DEFAULT_QUESTION.year,
    levels: listOf(search.nivel, isLevel),
    matters: listOf(search.materie, isMatter),
    stages: listOf(search.etapa, isStage),
    counties: listOf(search.judet, isCounty),
    courts: listOf(search.instanta, isCourt),
    dupa: oneOf(search.dupa, GROUPINGS, DEFAULT_QUESTION.dupa),
    masura: oneOf(search.masura, ['dosare', 'locuitori'] as const, DEFAULT_QUESTION.masura),
  }
}

/** The address of a question: its defaults left out, so the bare page is the default question. */
export function searchOf(question: Question): AnalysisSearch {
  const list = (values: readonly string[]) => (values.length > 0 ? values.join(',') : undefined)
  const search: Record<string, string | number | undefined> = {
    an: question.year === DEFAULT_QUESTION.year ? undefined : question.year,
    nivel: list(question.levels),
    materie: list(question.matters),
    etapa: list(question.stages),
    judet: list(question.counties),
    instanta: list(question.courts),
    dupa: question.dupa === DEFAULT_QUESTION.dupa ? undefined : question.dupa,
    masura: question.masura === DEFAULT_QUESTION.masura ? undefined : question.masura,
  }
  return Object.fromEntries(Object.entries(search).filter(([, value]) => value !== undefined)) as AnalysisSearch
}

/** The page's address for a question, its year written out: a link someone cites must not move when the default year does. */
export function analysisUrl(question: Question, origin: string): string {
  const search = { an: question.year, ...searchOf(question) }
  return `${origin}/justice/analytics?${new URLSearchParams(Object.entries(search).map(([key, value]) => [key, String(value)])).toString()}`
}

/** The address's keys that are not the page's — `lang`, the site's own — which every change of question keeps. */
export function siteSearchOf<S extends Readonly<Record<string, unknown>>>(search: S): Partial<S> {
  return Object.fromEntries(Object.entries(search).filter(([key]) => !(ANALYSIS_SEARCH_KEYS as readonly string[]).includes(key))) as Partial<S>
}

export function filterCount(question: Question): number {
  return question.levels.length + question.matters.length + question.stages.length + question.counties.length + question.courts.length
}

export function toggled<T>(values: readonly T[], value: T): readonly T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

/** Whether the question's rate can be drawn: counties, in the year their residents were counted. */
export function rateAllowed(question: Question, populationYear: number): boolean {
  return question.dupa === 'judete' && question.year === populationYear
}

// ───────────────────────────────────────────────────────────── filters ──

export interface CaseloadFilter {
  readonly institutionCode?: { readonly in: readonly string[] }
  readonly courtLevel?: { readonly in: readonly string[] }
  readonly category?: { readonly in: readonly string[] }
  readonly stage?: { readonly in: readonly string[] }
  readonly year: { readonly eq: number } | { readonly gte: number }
}

/** The courts a question's places name: the courts picked, within the counties picked; null when it names no place. */
export function courtsOf(question: Pick<Question, 'counties' | 'courts'>): readonly string[] | null {
  if (question.courts.length === 0 && question.counties.length === 0) return null
  const inCounties = question.counties.length > 0 ? [...COURTS.values()].filter((court) => court.county !== null && question.counties.includes(court.county)).map((court) => court.code) : null
  if (question.courts.length === 0) return inCounties
  return inCounties ? question.courts.filter((code) => inCounties.includes(code)) : question.courts
}

/**
 * What a read sends: the question's filters, a year (or every year from the
 * band's first, for the years read), and what the read itself narrows to (a
 * stage's or no level's count). Null when the question can match no case (a
 * court picked outside the county picked): there is nothing to read.
 */
export function filterOf(
  question: Question,
  {
    year = question.year,
    levels = question.levels,
    stages = question.stages,
  }: { readonly year?: number | 'all'; readonly levels?: readonly LevelKey[]; readonly stages?: readonly StageKey[] } = {},
): CaseloadFilter | null {
  const courts = courtsOf(question)
  if (courts !== null && courts.length === 0) return null
  return {
    ...(courts ? { institutionCode: { in: courts } } : {}),
    ...(levels.length > 0 ? { courtLevel: { in: levels.flatMap((level) => LEVEL_CODES[level]) } } : {}),
    ...(question.matters.length > 0 ? { category: { in: question.matters.flatMap((matter) => MATTER_CODES[matter]) } } : {}),
    ...(stages.length > 0 ? { stage: { in: stages.flatMap((stage) => STAGE_CODES[stage]) } } : {}),
    year: year === 'all' ? { gte: BAND_FROM } : { eq: year },
  }
}

/** Where a question's cases come from: the ÎCCJ's own archive alone, the portal alone, or both. */
export type AnalysisSource = 'portal' | 'iccj' | 'both'

/** The levels a question reads, from what it can match: its courts within its counties, narrowed to its levels — or its levels alone. */
export function sourceOf(question: Pick<Question, 'courts' | 'counties' | 'levels'>): AnalysisSource {
  const courts = courtsOf(question)
  if (courts === null && question.levels.length === 0) return 'both'
  const levels = courts === null ? question.levels : [...new Set(courts.flatMap((code) => COURTS.get(code)?.level ?? []))].filter((level) => question.levels.length === 0 || question.levels.includes(level))
  if (!levels.includes('inalta_curte')) return 'portal'
  return levels.length === 1 ? 'iccj' : 'both'
}

/**
 * Whether a question's year compares with the year before: two whole years
 * of the Portal's capture. The ÎCCJ's archive is a recent, partial set (a few
 * hundred cases dated 2024, thousands dated 2025): its years do not compare.
 */
export function comparable(question: Pick<Question, 'year' | 'courts' | 'counties' | 'levels'>): boolean {
  return question.year - 1 >= JUSTICE_FIRST_WHOLE_YEAR && question.year < JUSTICE_LAST_CAPTURE_YEAR && sourceOf(question) !== 'iccj'
}

/** Whether a row's change on the year before is shown: not for a row that is the ÎCCJ alone (its court, its level, its countyless row), whose count is its archive's. */
export function changeShown(grouping: Grouping, key: string): boolean {
  if (grouping === 'instante') return key !== ICCJ_CODE
  if (grouping === 'judete') return key !== NO_COUNTY
  if (grouping === 'niveluri') return key !== 'inalta_curte'
  return true
}

// ─────────────────────────────────────────────────────────────── rows ──

/** One group's count, by the key the page draws it under. */
export type Counts = ReadonlyMap<string, number>

/** A read's groups by the grouping's key: courts by code, counties by abbreviation (the ÎCCJ apart), matters merged, levels grouped. */
export function countsBy(grouping: Exclude<Grouping, 'etape'>, groups: readonly CountGroup[]): Counts {
  const counts = new Map<string, number>()
  const add = (key: string, count: number) => counts.set(key, (counts.get(key) ?? 0) + count)
  for (const group of groups) {
    if (group.count === 0) continue
    if (grouping === 'instante') add(group.key, group.count)
    else if (grouping === 'judete') add(COURTS.get(group.key)?.county ?? NO_COUNTY, group.count)
    else if (grouping === 'materii') add(matterKeyOf(group.key) ?? group.key, group.count)
    else add(levelKeyOf(group.key) ?? group.key, group.count)
  }
  return counts
}

/** The stages' counts and „Alte etape" as the rest of the total, so they add up. */
export function stageCounts(byStage: ReadonlyMap<StageKey, number>, total: number): Counts {
  const counted = [...byStage.values()].reduce((sum, count) => sum + count, 0)
  const counts = new Map<string, number>(STAGE_KEYS.flatMap((key) => ((byStage.get(key) ?? 0) > 0 ? [[key, byStage.get(key)!] as const] : [])))
  if (total - counted > 0) counts.set(OTHER_STAGES, total - counted)
  return counts
}

/** Groups drawn after the ranked ones, never ranked among them: the ÎCCJ among counties (it has none), the stages none of the groups counts. */
export const UNRANKED: ReadonlySet<string> = new Set([NO_COUNTY, OTHER_STAGES])

export interface Row {
  readonly key: string
  /** A ranked group, the groups past the list folded into one, or a group that is not ranked. */
  readonly kind: 'group' | 'rest' | 'apart'
  readonly count: number
  /** The year before's count; null when the years do not compare. */
  readonly before: number | null
  /** Its share of the total. */
  readonly share: number
  /** Cases per 1,000 residents, where the measure asks for it. */
  readonly rate: number | null
}

export interface RankedRows {
  readonly rows: readonly Row[]
  readonly total: number
  /** How many groups are ranked before folding. */
  readonly groups: number
}

/**
 * The ranked answer: the largest groups (by count or by rate), the rest
 * folded into one row, the groups that are not ranked after it. The rows add
 * up to the total, which is the read's own denominator.
 */
export function rankedRows({
  now,
  before,
  total,
  top,
  residents,
}: {
  readonly now: Counts
  readonly before: Counts | null
  readonly total: number
  readonly top: number
  /** Residents by key, when the measure is per resident: a group without residents is not ranked. */
  readonly residents?: ReadonlyMap<string, number> | null
}): RankedRows {
  const rows = [...now.entries()].map(([key, count]): Row => {
    const people = residents?.get(key)
    const rate = people ? (count / people) * 1000 : null
    const kind = UNRANKED.has(key) || (residents && rate === null) ? 'apart' : 'group'
    return { key, kind, count, before: before ? (before.get(key) ?? 0) : null, share: total > 0 ? count / total : 0, rate }
  })
  const ranked = rows.filter((row) => row.kind === 'group').sort((a, b) => (residents ? (b.rate ?? 0) - (a.rate ?? 0) : b.count - a.count) || a.key.localeCompare(b.key))
  const folded = ranked.slice(top)
  const sum = (items: readonly Row[], value: (row: Row) => number) => items.reduce((total, row) => total + value(row), 0)
  // The groups the year before had and this year has not are in „Restul" too: the year before's column adds up to its total.
  const beforeOnly = before ? [...before].reduce((total, [key, count]) => (now.has(key) ? total : total + count), 0) : 0
  const count = sum(folded, (row) => row.count)
  const rest: Row[] =
    folded.length > 0 || beforeOnly > 0
      ? [{ key: 'restul', kind: 'rest', count, before: before ? sum(folded, (row) => row.before ?? 0) + beforeOnly : null, share: total > 0 ? count / total : 0, rate: null }]
      : []
  return { rows: [...ranked.slice(0, top), ...rest, ...rows.filter((row) => row.kind === 'apart')], total, groups: ranked.length }
}

/** The relative change from one count to another; null when there is nothing to compare with. */
export function changeOf(now: number, before: number | null): number | null {
  if (before === null || before === 0) return null
  return now / before - 1
}

/** The share of a total the largest groups hold; null when there are no more groups than that. */
export function topShare(counts: Counts, total: number, top = 5): number | null {
  if (total === 0 || counts.size <= top) return null
  return [...counts.values()].sort((a, b) => b - a).slice(0, top).reduce((sum, count) => sum + count, 0) / total
}

// ──────────────────────────────────────────────────────────── drilling ──

/** A group's row narrows the question to it and groups by what that leaves open; null for a row that names no filter. */
export function drilled(question: Question, grouping: Grouping, key: string): Question | null {
  switch (grouping) {
    case 'instante':
      return isCourt(key) ? { ...question, courts: [key], dupa: 'materii' } : null
    case 'judete':
      return isCounty(key) ? { ...question, counties: [key], courts: [], dupa: 'instante', masura: 'dosare' } : null
    case 'materii':
      return isMatter(key) ? { ...question, matters: [key], dupa: 'instante' } : null
    case 'etape':
      return isStage(key) ? { ...question, stages: [key], dupa: 'instante' } : null
    case 'niveluri':
      return isLevel(key) ? { ...question, levels: [key], dupa: 'instante' } : null
  }
}
