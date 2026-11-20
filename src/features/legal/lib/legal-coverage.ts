/**
 * The legislation module's coverage facts.
 *
 * The corpus figures that used to live here as dated measurements (act and
 * document counts, citation-edge counts, the gazette match rate, the
 * article-structure gap, the CCR decision count, the gazette and changes
 * frontiers) are gone (2026-11-20, legal_v2 on dev): each one either has a
 * live query now (`legal-freshness-api.ts`, the STATUS aggregate) or was
 * removed from the copy, because a measurement of one corpus must not print
 * under another. What remains is not a measurement of the corpus' size.
 */

/**
 * The first year with gazette issues in the corpus: MO nr. 1/1989 of 22
 * December 1989. A historical bound (the gazette directory's earliest year
 * option), not a count that can drift; `moIssues` cannot list years.
 */
export const GAZETTE_FIRST_ISSUE_YEAR = 1989

/**
 * How old the newest gazette issue may be before the gazette tab says its
 * data is stale. Chosen, not measured: Monitorul Oficial publishes on most
 * working days, so a week without an issue in the corpus means discovery
 * has stopped, not a quiet week.
 */
export const GAZETTE_STALE_AFTER_DAYS = 7

/**
 * How old the newest already-in-force change may be before the changes tab
 * says its data is stale. Chosen, not measured: amendments take effect most
 * weeks, so a month without one means event capture is behind.
 */
export const CHANGES_STALE_AFTER_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Whether a frontier date is older than `afterDays` before `today` (both
 * `YYYY-MM-DD`). Null when the frontier is unknown — no claim either way.
 */
export function isFrontierStale(
  frontier: string | null,
  afterDays: number,
  today: string,
): boolean | null {
  if (frontier === null) return null
  const age = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${frontier.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(age)) return null
  return age > afterDays * DAY_MS
}

/** The older of two frontier dates — the honest "date până la" of both. */
export function olderFrontier(a: string | null, b: string | null): string | null {
  if (a === null) return b
  if (b === null) return a
  return a <= b ? a : b
}

/** `YYYY-MM-DD` of `now` in Bucharest — the day "already in force" means. */
export function bucharestToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
