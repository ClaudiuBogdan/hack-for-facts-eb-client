import { LATEST_LEGISLATURE } from '../api/graphql/parliament-translate'

/**
 * URL state for the committee browse (`/parlament/comisii`).
 *
 * These filters used to be component `useState`, so a filtered list could not be
 * shared, bookmarked, or restored on back-navigation — and the page silently
 * reset to the default legislature on every mount. URL search params are this
 * app's shareable-state contract (AGENTS.md), so they live here.
 */
export type CommitteeChamberFilter = 'all' | 'camera_deputatilor' | 'senat'

export interface ParliamentCommitteeBrowseSearch {
  readonly chamber?: CommitteeChamberFilter
  /** A legislature start year, or `'all'` for every legislature. */
  readonly legislatura?: string
}

const CHAMBER_VALUES: ReadonlySet<string> = new Set([
  'all',
  'camera_deputatilor',
  'senat',
])

/** Post-1990 legislature start years, plus the explicit "all" escape hatch. */
export const COMMITTEE_LEGISLATURE_YEARS: readonly string[] = [
  '2024',
  '2020',
  '2016',
  '2012',
  '2008',
  '2004',
  '2000',
  '1996',
  '1992',
  '1990',
]

const LEGISLATURE_VALUES: ReadonlySet<string> = new Set([
  'all',
  ...COMMITTEE_LEGISLATURE_YEARS,
])

/**
 * The browse default. The server orders committees by `committee_key` (text), so
 * with no legislature filter the first page is the 1990 committees — default to
 * the current legislature instead.
 */
export const DEFAULT_COMMITTEE_LEGISLATURE = LATEST_LEGISLATURE

/** Tolerant parse: unknown values fall back to the defaults, never to an error. */
export function parseCommitteeBrowseSearch(
  search: Record<string, unknown>,
): ParliamentCommitteeBrowseSearch {
  const chamber = search['chamber']
  const legislatura = search['legislatura']
  return {
    ...(typeof chamber === 'string' && CHAMBER_VALUES.has(chamber)
      ? { chamber: chamber as CommitteeChamberFilter }
      : {}),
    ...(typeof legislatura === 'string' && LEGISLATURE_VALUES.has(legislatura)
      ? { legislatura }
      : {}),
  }
}

/** Resolve the URL state into the API filter arguments. */
export function toCommitteeQueryParams(
  search: ParliamentCommitteeBrowseSearch,
): { chamber?: string; legislature?: string } {
  const chamber = search.chamber ?? 'all'
  const legislatura = search.legislatura ?? DEFAULT_COMMITTEE_LEGISLATURE
  return {
    ...(chamber === 'all' ? {} : { chamber }),
    ...(legislatura === 'all' ? {} : { legislature: legislatura }),
  }
}
