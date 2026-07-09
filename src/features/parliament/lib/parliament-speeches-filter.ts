/**
 * Build the GraphQL `ParliamentSpeechesFilter` input from the global
 * stenograme-page search params. Pure (params in, filter object out), mirroring
 * `buildMemberSpeechesFilter`.
 *
 * The same filter drives two root fields:
 *   - `parliamentSpeeches(filter:)`      — the paged list (full filter).
 *   - `parliamentSpeechActivity(filter:)`— the heatmap aggregate, which REJECTS
 *     `spokenAt` (the `year` argument bounds the range). Pass `stripDate: true`.
 *
 * BOUNDEDNESS: the server refuses an unbounded speeches list (no date index on
 * 1.4M rows) — it requires a `mandateKey` bound or a fully-bounded `spokenAt`
 * window of at most 366 days. The LIST call therefore always carries a bound:
 * when neither `vorbitor` nor an explicit from/to range is set, the selected
 * year's window is injected (`options.year`, resolved by the page).
 *
 * Free-text `q` travels SEPARATELY as a GraphQL arg (not a filter field).
 */
import type {
  ParliamentSpeechesSearch,
  ParliamentSpeechSearchDepth,
} from '@/schemas/parliament'

/** GraphQL `ParliamentSpeechesFilter` input shape (scalar `eq` tokens). */
export interface ParliamentSpeechesFilterInput {
  spokenAt?: { gte?: string; lte?: string }
  chamber?: { eq: string }
  mandateKey?: { eq: string }
}

/**
 * Full-text window cap, mirroring the server's
 * `SPEECHES_FULLTEXT_WINDOW_MAX_DAYS`: transcripts are searched only when the
 * query is mandate-bounded or the date window is at most one quarter.
 */
export const SPEECHES_FULLTEXT_WINDOW_MAX_DAYS = 92

/** A spoken-date bound in `YYYY-MM-DD` (the GraphQL `Date` scalar form). */
function toDateBound(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const day = trimmed.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

/** Map the UI `camera` facet to the GraphQL chamber token. */
function cameraChamber(camera: 'camera' | 'senat' | 'comun'): string {
  return camera === 'camera' ? 'camera_deputatilor' : camera
}

/**
 * Inclusive day span of a `YYYY-MM-DD` window, or `null` when either end is
 * missing/invalid or from > to. UTC integer math — no locale, no DST.
 */
export function speechWindowDays(
  from: string | undefined,
  to: string | undefined,
): number | null {
  const gte = toDateBound(from)
  const lte = toDateBound(to)
  if (!gte || !lte) return null
  const start = Date.parse(`${gte}T00:00:00Z`)
  const end = Date.parse(`${lte}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return null
  return Math.round((end - start) / 86_400_000) + 1
}

/**
 * Build the filter object. Never returns `undefined` for the list shape: when
 * no explicit bound is active, the `options.year` window keeps the query valid
 * server-side. With `stripDate` (the activity aggregate), dates are dropped and
 * the result MAY be `undefined` (callers then omit the `$filter` variable).
 */
export function buildParliamentSpeechesFilter(
  search: ParliamentSpeechesSearch,
  options: { readonly stripDate?: boolean; readonly year: number },
): ParliamentSpeechesFilterInput | undefined {
  const filter: ParliamentSpeechesFilterInput = {}

  if (search.vorbitor) {
    filter.mandateKey = { eq: search.vorbitor }
  }
  if (search.camera) {
    filter.chamber = { eq: cameraChamber(search.camera) }
  }

  if (!options.stripDate) {
    const gte = toDateBound(search.from)
    const lte = toDateBound(search.to)
    if (gte && lte) {
      filter.spokenAt = { gte, lte }
    } else if (gte || lte) {
      // Half-open ranges don't bound the server query; close the open end with
      // the selected year's edge so the URL facet still narrows the list.
      filter.spokenAt = {
        gte: gte ?? `${options.year}-01-01`,
        lte: lte ?? `${options.year}-12-31`,
      }
    } else if (!search.vorbitor) {
      // No explicit bound at all — the year window keeps the query bounded.
      filter.spokenAt = {
        gte: `${options.year}-01-01`,
        lte: `${options.year}-12-31`,
      }
    }
  }

  return Object.keys(filter).length > 0 ? filter : undefined
}

/** The normalized free-text query, or `undefined` when blank. */
export function getParliamentSpeechQ(
  search: ParliamentSpeechesSearch,
): string | undefined {
  const q = search.q?.trim()
  return q ? q : undefined
}

/**
 * Pre-fetch HINT for the search-depth notice: does this search qualify for
 * full-transcript depth (speaker bound, or a window of at most ~one quarter)?
 * The rendered notice prefers the response's `searchDepth` — this hint only
 * covers the loading gap and the no-results state.
 */
export function isSpeechSearchBounded(
  search: ParliamentSpeechesSearch,
): boolean {
  if (search.vorbitor) return true
  const days = speechWindowDays(search.from, search.to)
  return days !== null && days <= SPEECHES_FULLTEXT_WINDOW_MAX_DAYS
}

/** The depth the notice should assume before/without a server response. */
export function expectedSearchDepth(
  search: ParliamentSpeechesSearch,
): ParliamentSpeechSearchDepth {
  return isSpeechSearchBounded(search) ? 'FULL_TEXT' : 'TITLE_SUMMARY'
}

/**
 * Count the active FILTER facets (speaker, chamber, date range, free-text q).
 * The year (`an`) is navigation, not a filter, so it never counts — mirroring
 * `countActiveMemberSpeechFilters`.
 */
export function countActiveParliamentSpeechFilters(
  search: ParliamentSpeechesSearch,
): number {
  let count = 0
  if (search.vorbitor) count += 1
  if (search.camera) count += 1
  if (search.from || search.to) count += 1
  if (getParliamentSpeechQ(search)) count += 1
  return count
}
