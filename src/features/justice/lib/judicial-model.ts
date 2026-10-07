/**
 * Pure rules shared by the justice pages: how matters, stages and years are
 * read from the judicial API's counts. Every figure stays a count the API
 * served or a share of two of them.
 */

export interface CountGroup {
  readonly key: string
  readonly count: number
}

export interface Share {
  /** The matter, squashed to letters (`contenciosadministrativsifiscal`): one key for the Portal's code and the ÎCCJ's label. */
  readonly key: string
  readonly count: number
  /** The share of the groups' total; 0 when they total nothing. */
  readonly share: number
}

const squash = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

/**
 * Matters merged by name, largest first. The ÎCCJ's cases carry the matter as
 * its raw label with cedilla diacritics („Contencios administrativ şi fiscal")
 * beside the Portal's code (`Contenciosadministrativsifiscal`): one matter,
 * one row.
 */
export function mergedMatters(groups: readonly CountGroup[]): readonly Share[] {
  const merged = new Map<string, number>()
  for (const group of groups) {
    const key = squash(group.key)
    merged.set(key, (merged.get(key) ?? 0) + group.count)
  }
  const total = [...merged.values()].reduce((sum, count) => sum + count, 0)
  return [...merged.entries()]
    .map(([key, count]) => ({ key, count, share: total === 0 ? 0 : count / total }))
    .filter((matter) => matter.count > 0)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

/** The stages a reader knows; revisions and annulment appeals are gathered as the extraordinary remedies. */
export type StageKey = 'fond' | 'apel' | 'recurs' | 'contestatie' | 'extraordinare'
export const STAGE_KEYS: readonly StageKey[] = ['fond', 'apel', 'recurs', 'contestatie', 'extraordinare']

/** The four stages a court page counts one by one; the rest is the remainder of the year's total. */
export const MAIN_STAGES: readonly { readonly stage: string; readonly key: StageKey }[] = [
  { stage: 'Fond', key: 'fond' },
  { stage: 'Apel', key: 'apel' },
  { stage: 'Recurs', key: 'recurs' },
  { stage: 'ContestaţieNCPP', key: 'contestatie' },
]

export function stageKeyOf(stage: string): StageKey {
  return MAIN_STAGES.find((main) => main.stage === stage)?.key ?? 'extraordinare'
}

export interface YearBar {
  readonly year: number
  readonly count: number
  /** Before the capture went whole: the count is what the crawl reached, not the court's caseload. */
  readonly partial: boolean
  /** The year the capture ends in: a part-year. */
  readonly running: boolean
}

/**
 * The years a chart draws, from `from` to the capture's last year. The API
 * keys years as text and keeps `(none)` and `infinity` for undated cases:
 * those are not years and stay out of the bars (the total still counts them).
 */
export function yearBars(groups: readonly CountGroup[], { from, lastYear, firstWholeYear }: { readonly from: number; readonly lastYear: number; readonly firstWholeYear: number }): readonly YearBar[] {
  return groups
    .map((group) => ({ year: Number(group.key), count: group.count }))
    .filter((entry) => Number.isInteger(entry.year) && entry.year >= from && entry.year <= lastYear)
    .sort((a, b) => a.year - b.year)
    .map((entry) => ({ ...entry, partial: entry.year < firstWholeYear, running: entry.year === lastYear }))
}

/** The year a date string (`2026-06-22…`) falls in; null when it is not a plain date. */
export function yearOf(date: string | null): number | null {
  if (date === null) return null
  const match = /^(\d{4})-\d{2}-\d{2}/.exec(date)
  return match ? Number(match[1]) : null
}
