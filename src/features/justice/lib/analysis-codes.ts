import type { JudicialCourtLevel } from '@/schemas/judicial'
import type { StageKey } from './judicial-model'

/**
 * The codes the analysis page filters by — levels, matters, stages — what
 * each sends to the API, and the address's keys. Apart from the model, which
 * loads the courts' list with the front door's snapshot: the route module and
 * the pages that only link to the analysis (a court's) stay without it.
 */

/** The address's keys, in Romanian as the other analysis pages' are. */
export const ANALYSIS_SEARCH_KEYS = ['an', 'nivel', 'materie', 'etapa', 'judet', 'instanta', 'dupa', 'masura'] as const
export type AnalysisSearchKey = (typeof ANALYSIS_SEARCH_KEYS)[number]

/** The ÎCCJ's institution code: one court, a level of its own, no county, and an archive of its own. */
export const ICCJ_CODE = 'InaltaCurtedeCasatiesiJustitie'

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
  extraordinare: [
    'RevizuireFond',
    'ContestatieinanulareApel',
    'RevizuireApel',
    'ContestatieinanulareFond',
    'RevizuireRecurs',
    'ContestatieinanulareRecurs',
    'ContestatieInAnulareNCPP',
    'RevizuireContestatieNCPP',
    'Recurs în interesul legii',
  ],
}

/** The stages none of the groups counts, as a key of their own. */
export const OTHER_STAGES = 'alte'
