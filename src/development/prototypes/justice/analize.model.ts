import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { JUSTICE_HUB_SNAPSHOT } from '@/features/justice/lib/hub-snapshot'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_LAST_CAPTURE_YEAR, JUSTICE_REFERENCE_YEAR } from '@/features/justice/lib/hub-years'
import type { CountGroup, StageKey } from '@/features/justice/lib/judicial-model'
import { STAGE_KEYS } from '@/features/justice/lib/judicial-model'
import type { JudicialCourtLevel } from '@/schemas/judicial'

/**
 * The justice analysis page's question, pure: what the address holds, the
 * filter each read sends to `judicialCaseload`, and the rows an answer draws.
 * Every figure is a count the API served, a sum of them, or a share of two.
 */

// ─────────────────────────────────────────────────────────────── codes ──

/** The levels as the page groups them: the two military courts are one group. */
export type LevelKey = 'judecatorie' | 'tribunal' | 'curte_de_apel' | 'inalta_curte' | 'militare'
export const LEVEL_KEYS: readonly LevelKey[] = ['judecatorie', 'tribunal', 'curte_de_apel', 'inalta_curte', 'militare']

export const LEVEL_CODES: Readonly<Record<LevelKey, readonly JudicialCourtLevel[]>> = {
  judecatorie: ['judecatorie'],
  tribunal: ['tribunal'],
  curte_de_apel: ['curte_de_apel'],
  inalta_curte: ['inalta_curte'],
  militare: ['tribunal_militar', 'curte_militara_apel'],
}

export function levelKeyOf(level: string): LevelKey | null {
  return LEVEL_KEYS.find((key) => (LEVEL_CODES[key] as readonly string[]).includes(level)) ?? null
}

/**
 * Every matter the API stores, by the key the pages merge it under: the
 * Portal's code, and the ÎCCJ archive's own label (cedilla diacritics) where
 * its cases carry one. A filter on a matter sends both.
 */
export const MATTER_CODES = {
  civil: ['Civil'],
  penal: ['Penal'],
  litigiicuprofesionistii: ['Litigiicuprofesionistii', 'Litigii cu profesioniştii'],
  contenciosadministrativsifiscal: ['Contenciosadministrativsifiscal', 'Contencios administrativ şi fiscal'],
  minorisifamilie: ['Minorisifamilie', 'Minori şi familie'],
  asigurarisociale: ['Asigurarisociale', 'Asigurări sociale'],
  litigiidemunca: ['Litigiidemunca', 'Litigii de muncă'],
  faliment: ['Faliment'],
  proprietateintelectuala: ['ProprietateIntelectuala', 'Proprietate Intelectuală'],
  insolventapersoaneifizice: ['Insolventapersoaneifizice'],
  dreptmaritimsifluvial: ['Dreptmaritimsifluvial', 'Drept maritim şi fluvial'],
  altematerii: ['Altematerii'],
} as const satisfies Readonly<Record<string, readonly string[]>>

export type MatterKey = keyof typeof MATTER_CODES
export const MATTER_KEYS = Object.keys(MATTER_CODES) as MatterKey[]

/** A raw matter as the key it is merged under; null for a matter the page does not know. */
export function matterKeyOf(raw: string): MatterKey | null {
  return MATTER_KEYS.find((key) => (MATTER_CODES[key] as readonly string[]).includes(raw)) ?? null
}

/**
 * The stages the API stores with more than a few hundred cases, by the
 * group a reader knows; they hold all but some 1,500 of the 6.3 million
 * cases. What none of them counts is „Alte etape": the rest of the total.
 */
export const STAGE_CODES: Readonly<Record<StageKey, readonly string[]>> = {
  fond: ['Fond'],
  apel: ['Apel'],
  recurs: ['Recurs'],
  contestatie: ['ContestaţieNCPP'],
  extraordinare: ['RevizuireFond', 'ContestatieinanulareApel', 'RevizuireApel', 'ContestatieinanulareFond', 'RevizuireRecurs', 'ContestatieinanulareRecurs', 'ContestatieInAnulareNCPP', 'RevizuireContestatieNCPP', 'Recurs în interesul legii'],
}

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
    return level
      ? [
          [
            court.code,
            {
              code: court.code,
              apiLevel: court.level,
              level,
              county: court.county,
            },
          ] as const,
        ]
      : []
  }),
)

export const COUNTY_CODES: readonly string[] = [...new Set([...COURTS.values()].flatMap((court) => (court.county ? [court.county] : [])))].sort()

// ──────────────────────────────────────────────────────────── question ──

export type Grouping = 'instante' | 'judete' | 'materii' | 'etape' | 'niveluri'
export const GROUPINGS: readonly Grouping[] = ['instante', 'judete', 'materii', 'etape', 'niveluri']

export type Measure = 'dosare' | 'locuitori'

/** The cross table's columns (variant `incrucisat`). */
export type Columns = 'ani' | 'etape' | 'niveluri'
export const COLUMNS: readonly Columns[] = ['ani', 'etape', 'niveluri']

export interface Question {
  readonly year: number
  readonly levels: readonly LevelKey[]
  readonly matters: readonly MatterKey[]
  readonly stages: readonly StageKey[]
  readonly counties: readonly string[]
  readonly courts: readonly string[]
  readonly dupa: Grouping
  readonly masura: Measure
  readonly coloane: Columns
}

/** The years a question can be asked of: the capture's whole years and its last part-year, newest first. */
export const YEARS: readonly number[] = Array.from({ length: JUSTICE_LAST_CAPTURE_YEAR - JUSTICE_FIRST_WHOLE_YEAR + 1 }, (_, index) => JUSTICE_LAST_CAPTURE_YEAR - index)

/** The years the years band draws: from the crawl's start (May 2013) to the capture's end. */
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
  coloane: 'ani',
}

/** The address's keys, in Romanian as the other analysis pages' are. */
export const SEARCH_KEYS = ['an', 'nivel', 'materie', 'etapa', 'judet', 'instanta', 'dupa', 'masura', 'coloane'] as const
/** The year travels as a number: the router would write a numeric string quoted (`an=%222024%22`). */
export type AnalyzeSearch = Partial<Record<Exclude<(typeof SEARCH_KEYS)[number], 'an'>, string>> & { readonly an?: number }

function listOf<T extends string>(value: unknown, allowed: (item: string) => item is T): readonly T[] {
  if (typeof value !== 'string' && typeof value !== 'number') return []
  return [
    ...new Set(
      String(value)
        .split(',')
        .map((item) => item.trim()),
    ),
  ].filter(allowed)
}

const isLevel = (item: string): item is LevelKey => (LEVEL_KEYS as readonly string[]).includes(item)
const isMatter = (item: string): item is MatterKey => (MATTER_KEYS as readonly string[]).includes(item)
const isStage = (item: string): item is StageKey => (STAGE_KEYS as readonly string[]).includes(item)
const isCounty = (item: string): item is string => COUNTY_CODES.includes(item)
const isCourt = (item: string): item is string => COURTS.has(item)

/** The question an address asks; a value the page does not know is dropped, never guessed. */
export function questionOf(search: Readonly<Record<string, unknown>>): Question {
  const year = Number(search.an)
  const one = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback)
  return {
    year: YEARS.includes(year) ? year : DEFAULT_QUESTION.year,
    levels: listOf(search.nivel, isLevel),
    matters: listOf(search.materie, isMatter),
    stages: listOf(search.etapa, isStage),
    counties: listOf(search.judet, isCounty),
    courts: listOf(search.instanta, isCourt),
    dupa: one(search.dupa, GROUPINGS, DEFAULT_QUESTION.dupa),
    masura: one(search.masura, ['dosare', 'locuitori'] as const, DEFAULT_QUESTION.masura),
    coloane: one(search.coloane, COLUMNS, DEFAULT_QUESTION.coloane),
  }
}

/** The address of a question: its defaults left out, so the bare page is the default question. */
export function searchOf(question: Question): AnalyzeSearch {
  const list = (values: readonly string[]) => (values.length > 0 ? values.join(',') : undefined)
  return {
    an: question.year === DEFAULT_QUESTION.year ? undefined : question.year,
    nivel: list(question.levels),
    materie: list(question.matters),
    etapa: list(question.stages),
    judet: list(question.counties),
    instanta: list(question.courts),
    dupa: question.dupa === DEFAULT_QUESTION.dupa ? undefined : question.dupa,
    masura: question.masura === DEFAULT_QUESTION.masura ? undefined : question.masura,
    coloane: question.coloane === DEFAULT_QUESTION.coloane ? undefined : question.coloane,
  }
}

export function filterCount(question: Question): number {
  return question.levels.length + question.matters.length + question.stages.length + question.counties.length + question.courts.length
}

export function toggled<T>(values: readonly T[], value: T): readonly T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

// ───────────────────────────────────────────────────────────── filters ──

export interface CaseloadFilter {
  readonly institutionCode?: { readonly in: readonly string[] }
  readonly courtLevel?: { readonly in: readonly string[] }
  readonly category?: { readonly in: readonly string[] }
  readonly stage?: { readonly in: readonly string[] }
  readonly year?: { readonly eq: number } | { readonly gte: number }
}

/** The courts a question's places name: the courts picked, within the counties picked; null when it names no place. */
export function courtsOf(question: Pick<Question, 'counties' | 'courts'>): readonly string[] | null {
  if (question.courts.length === 0 && question.counties.length === 0) return null
  const inCounties = question.counties.length > 0 ? [...COURTS.values()].filter((court) => court.county !== null && question.counties.includes(court.county)).map((court) => court.code) : null
  if (question.courts.length === 0) return inCounties
  return inCounties ? question.courts.filter((code) => inCounties.includes(code)) : question.courts
}

/**
 * What a read sends: the question's filters, a year (or every year from
 * the band's first, for the years read), and what the read itself narrows
 * to (a stage's, a level's column). Null when the question can match no case
 * (a court picked outside the county picked): there is nothing to read.
 */
export function filterOf(
  question: Question,
  {
    year = question.year,
    levels = question.levels,
    stages = question.stages,
  }: {
    readonly year?: number | 'all'
    readonly levels?: readonly LevelKey[]
    readonly stages?: readonly StageKey[]
  } = {},
): CaseloadFilter | null {
  const courts = courtsOf(question)
  if (courts !== null && courts.length === 0) return null
  return {
    ...(courts ? { institutionCode: { in: courts } } : {}),
    ...(levels.length > 0 ? { courtLevel: { in: levels.flatMap((level) => LEVEL_CODES[level]) } } : {}),
    ...(question.matters.length > 0
      ? {
          category: {
            in: question.matters.flatMap((matter) => MATTER_CODES[matter]),
          },
        }
      : {}),
    ...(stages.length > 0 ? { stage: { in: stages.flatMap((stage) => STAGE_CODES[stage]) } } : {}),
    year: year === 'all' ? { gte: BAND_FROM } : { eq: year },
  }
}

/** Whether a year's count compares with the year before: both whole years of the capture. */
export function comparable(year: number): boolean {
  return year - 1 >= JUSTICE_FIRST_WHOLE_YEAR && year < JUSTICE_LAST_CAPTURE_YEAR
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

/** The county key of the courts with none: the ÎCCJ, which judges for the whole country. */
export const NO_COUNTY = 'tara'

export interface Row {
  readonly key: string
  /** A ranked group, the groups past the list folded into one, or a group that is not ranked (the ÎCCJ among counties). */
  readonly kind: 'group' | 'rest' | 'apart'
  readonly count: number
  /** The year before's count; null when the years do not compare or it was not read. */
  readonly before: number | null
  /** Its share of the total. */
  readonly share: number
  /** Cases per 1,000 residents, where the measure asks for it. */
  readonly rate: number | null
}

export interface RankedRows {
  readonly rows: readonly Row[]
  readonly total: number
  /** How many groups there are before folding. */
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
  apart: unranked = new Set<string>(),
}: {
  readonly now: Counts
  readonly before: Counts | null
  readonly total: number
  readonly top: number
  /** Residents by key, when the measure is per resident: a group without residents is not ranked. */
  readonly residents?: ReadonlyMap<string, number> | null
  /** Groups drawn after the ranked ones, never ranked among them. */
  readonly apart?: ReadonlySet<string>
}): RankedRows {
  const rateOf = (key: string, count: number) => {
    const people = residents?.get(key)
    return people ? (count / people) * 1000 : null
  }
  const all = [...now.entries()].map(([key, count]): Row => {
    const rate = residents ? rateOf(key, count) : null
    const kind = unranked.has(key) || (residents && rate === null) ? 'apart' : 'group'
    return {
      key,
      kind,
      count,
      before: before ? (before.get(key) ?? 0) : null,
      share: total > 0 ? count / total : 0,
      rate,
    }
  })
  const ranked = all.filter((row) => row.kind === 'group').sort((a, b) => (residents ? (b.rate ?? 0) - (a.rate ?? 0) : b.count - a.count) || a.key.localeCompare(b.key))
  const apart = all.filter((row) => row.kind === 'apart')
  const shown = ranked.slice(0, top)
  const folded = ranked.slice(top)
  const rest: Row[] =
    folded.length > 0
      ? [
          {
            key: 'restul',
            kind: 'rest',
            count: folded.reduce((sum, row) => sum + row.count, 0),
            before: before ? folded.reduce((sum, row) => sum + (row.before ?? 0), 0) : null,
            share: total > 0 ? folded.reduce((sum, row) => sum + row.count, 0) / total : 0,
            rate: null,
          },
        ]
      : []
  return { rows: [...shown, ...rest, ...apart], total, groups: ranked.length }
}

/** The stages' counts and „Alte etape" as the rest of the total, so they add up. */
export function stageCounts(byStage: ReadonlyMap<StageKey, number>, total: number): Counts {
  const counted = [...byStage.values()].reduce((sum, count) => sum + count, 0)
  const counts = new Map<string, number>(STAGE_KEYS.flatMap((key) => ((byStage.get(key) ?? 0) > 0 ? [[key, byStage.get(key)!] as const] : [])))
  if (total - counted > 0) counts.set('alte', total - counted)
  return counts
}

/** The relative change from one count to another; null when there is nothing to compare with. */
export function changeOf(now: number, before: number | null): number | null {
  if (before === null || before === 0) return null
  return now / before - 1
}

/** The share of a total the largest five groups hold. */
export function topShare(counts: Counts, total: number, top = 5): number | null {
  if (total === 0 || counts.size <= top) return null
  return (
    [...counts.values()]
      .sort((a, b) => b - a)
      .slice(0, top)
      .reduce((sum, count) => sum + count, 0) / total
  )
}

// ──────────────────────────────────────────────────────────── drilling ──

/** A group's row narrows the question to it and groups by what that leaves open. */
export function drilled(question: Question, grouping: Grouping, key: string): Question | null {
  switch (grouping) {
    case 'instante':
      return COURTS.has(key) ? { ...question, courts: [key], dupa: 'materii' } : null
    case 'judete':
      return COUNTY_CODES.includes(key)
        ? {
            ...question,
            counties: [key],
            courts: [],
            dupa: 'instante',
            masura: 'dosare',
          }
        : null
    case 'materii':
      return isMatter(key) ? { ...question, matters: [key], dupa: 'instante' } : null
    case 'etape':
      return isStage(key) ? { ...question, stages: [key], dupa: 'instante' } : null
    case 'niveluri':
      return isLevel(key) ? { ...question, levels: [key], dupa: 'instante' } : null
  }
}

// ──────────────────────────────────────────────────────────── questions ──

export type QuestionGroup = 'unde' | 'ce' | 'trepte'

export interface ReadyQuestion {
  readonly id: string
  readonly group: QuestionGroup
  readonly text: MessageDescriptor
  readonly patch: Partial<Question>
}

export const QUESTION_GROUPS: readonly {
  readonly id: QuestionGroup
  readonly title: MessageDescriptor
}[] = [
  { id: 'unde', title: msg`Unde` },
  { id: 'ce', title: msg`Ce se judecă` },
  { id: 'trepte', title: msg`Pe trepte` },
]

export const QUESTIONS: readonly ReadyQuestion[] = [
  {
    id: 'incarcate',
    group: 'unde',
    text: msg`Ce instanțe au cele mai multe dosare?`,
    patch: { dupa: 'instante' },
  },
  {
    id: 'locuitori',
    group: 'unde',
    text: msg`Unde sunt cele mai multe dosare la 1.000 de locuitori?`,
    patch: { levels: ['judecatorie'], dupa: 'judete', masura: 'locuitori' },
  },
  {
    id: 'cluj',
    group: 'unde',
    text: msg`Care sunt cele mai încărcate instanțe din județul Cluj?`,
    patch: { counties: ['CJ'], dupa: 'instante' },
  },
  {
    id: 'faliment',
    group: 'unde',
    text: msg`Unde se judecă falimentele?`,
    patch: { matters: ['faliment'], dupa: 'instante' },
  },
  {
    id: 'munca',
    group: 'unde',
    text: msg`Unde se judecă cele mai multe litigii de muncă?`,
    patch: { matters: ['litigiidemunca'], dupa: 'judete' },
  },
  {
    id: 'materii',
    group: 'ce',
    text: msg`Ce se judecă în România?`,
    patch: { dupa: 'materii' },
  },
  {
    id: 'curti',
    group: 'ce',
    text: msg`Ce judecă curțile de apel?`,
    patch: { levels: ['curte_de_apel'], dupa: 'materii' },
  },
  {
    id: 'iccj',
    group: 'ce',
    text: msg`Ce ajunge la Înalta Curte?`,
    patch: { levels: ['inalta_curte'], dupa: 'materii' },
  },
  {
    id: 'apel',
    group: 'trepte',
    text: msg`Unde ajung apelurile?`,
    patch: { stages: ['apel'], dupa: 'instante' },
  },
  {
    id: 'penal',
    group: 'trepte',
    text: msg`În ce etapă sunt dosarele penale?`,
    patch: { matters: ['penal'], dupa: 'etape' },
  },
  {
    id: 'niveluri',
    group: 'trepte',
    text: msg`Cum se împart dosarele pe niveluri de instanță?`,
    patch: { dupa: 'niveluri' },
  },
]

/** A ready question as a whole question: the year stays the reader's, every other filter is the question's own. */
export function askedQuestion(current: Question, ready: ReadyQuestion): Question {
  return {
    ...DEFAULT_QUESTION,
    year: current.year,
    coloane: current.coloane,
    ...ready.patch,
  }
}
