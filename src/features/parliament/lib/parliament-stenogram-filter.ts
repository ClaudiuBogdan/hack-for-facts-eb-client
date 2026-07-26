/**
 * Build the GraphQL `ParliamentStenogramSessionsFilter` from the stenograme
 * search params. Pure (params in, filter object out), mirroring
 * `buildParliamentSpeechesFilter`.
 *
 * THE BOUNDEDNESS DIFFERENCE THAT SHAPES THE PAGE. `parliamentSpeeches` refuses
 * an unbounded list (there is no date index on 1.4M turns), which is why the
 * interventions view always injects a year window. `parliamentStenogramSessions`
 * needs NO bound — it is one row per captured sitting on an indexed date — so
 * the sittings view opens on the WHOLE history, newest first, and `an` is a
 * plain optional facet. That is why sittings is the default view: it is the one
 * that can answer "what happened in Parliament" without first making the reader
 * pick a year.
 *
 * Free-text `q` travels SEPARATELY as a GraphQL arg (it is answered by the
 * canonical search projection, not by a column).
 */
import type {
  ParliamentSpeechesSearch,
  ParliamentStenogrameView,
} from '@/schemas/parliament'

/** GraphQL `ParliamentStenogramSessionsFilter` input shape (scalar `eq` tokens). */
export interface ParliamentStenogramSessionsFilterInput {
  chamber?: { eq: string }
  sessionDate?: { gte?: string; lte?: string }
  year?: { eq: number }
  availability?: { eq: string }
  mandateKey?: { eq: string }
}

/** A sitting-date bound in `YYYY-MM-DD` (the GraphQL `Date` scalar form). */
function toDateBound(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const day = trimmed.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined
}

/** Map the UI `camera` facet to the GraphQL chamber token. */
export function cameraToChamberToken(
  camera: 'camera' | 'senat' | 'comun',
): string {
  return camera === 'camera' ? 'camera_deputatilor' : camera
}

/** The active view — sittings is the default and is omitted from the URL. */
export function getStenogrameView(
  search: ParliamentSpeechesSearch,
): ParliamentStenogrameView {
  return search.view === 'interventii' ? 'interventii' : 'sedinte'
}

/**
 * Build the sittings filter.
 *
 * `an` and `from`/`to` are NOT combined: an explicit date range is the more
 * specific statement, so it wins and the year is ignored for the query (the UI
 * keeps showing both chips so the reader can see why). Sending both would ask
 * the server for the intersection and silently return nothing whenever the
 * range sits outside the selected year.
 */
export function buildStenogramSessionsFilter(
  search: ParliamentSpeechesSearch,
): ParliamentStenogramSessionsFilterInput | undefined {
  const filter: ParliamentStenogramSessionsFilterInput = {}

  if (search.camera) {
    filter.chamber = { eq: cameraToChamberToken(search.camera) }
  }
  if (search.vorbitor) {
    filter.mandateKey = { eq: search.vorbitor }
  }
  if (search.disponibilitate) {
    filter.availability = { eq: search.disponibilitate }
  }

  const gte = toDateBound(search.from)
  const lte = toDateBound(search.to)
  if (gte || lte) {
    // Half-open is fine here: the sittings scan rides the date index either way.
    filter.sessionDate = { ...(gte && { gte }), ...(lte && { lte }) }
  } else if (search.an !== undefined && Number.isFinite(search.an)) {
    filter.year = { eq: search.an }
  }

  return Object.keys(filter).length > 0 ? filter : undefined
}

/**
 * Facets the reader can see and clear on the SITTINGS view. `q` is excluded for
 * the same reason as the interventions count: it lives in the always-visible
 * toolbar input with its own chip, so badging it would point at a filter the
 * sheet does not contain. Unlike the interventions view, `an` DOES count here —
 * on sittings it genuinely narrows the list rather than bounding an otherwise
 * illegal query.
 */
export function countActiveStenogramSessionFilters(
  search: ParliamentSpeechesSearch,
): number {
  let count = 0
  if (search.camera) count += 1
  if (search.vorbitor) count += 1
  if (search.disponibilitate) count += 1
  if (search.from || search.to) count += 1
  else if (search.an !== undefined) count += 1
  return count
}

/**
 * The facets that survive a view switch. Chamber, speaker, dates and the query
 * mean the same thing on both views, so a reader who filters the sittings and
 * then flips to interventions keeps their work. `disponibilitate` describes a
 * CAPTURE, which an individual turn does not have — it is dropped rather than
 * silently ignored, so the chip strip never shows a filter that is not applied.
 */
export function projectSearchForView(
  search: ParliamentSpeechesSearch,
  view: ParliamentStenogrameView,
): ParliamentSpeechesSearch {
  const next: ParliamentSpeechesSearch = {
    ...search,
    view: view === 'sedinte' ? undefined : view,
  }
  if (view === 'interventii') next.disponibilitate = undefined
  return next
}
