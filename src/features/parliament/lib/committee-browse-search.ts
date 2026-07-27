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

/**
 * The institutional axis, and the one that actually separates these bodies:
 * a permanent committee sits for the legislature and screens bills in its
 * domain; a special one is convened for a single question; a joint one belongs
 * to both chambers. The browse had no way to ask for one.
 */
export type CommitteeTypeFilter = 'all' | 'permanent' | 'special' | 'joint'

export interface ParliamentCommitteeBrowseSearch {
  readonly chamber?: CommitteeChamberFilter
  /** A legislature start year, or `'all'` for every legislature. */
  readonly legislatura?: string
  readonly tip?: CommitteeTypeFilter
  /** Free-text over the committee NAME. Filtered client-side — see below. */
  readonly q?: string
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

const TYPE_VALUES: ReadonlySet<string> = new Set([
  'all',
  'permanent',
  'special',
  'joint',
])

/** Tolerant parse: unknown values fall back to the defaults, never to an error. */
export function parseCommitteeBrowseSearch(
  search: Record<string, unknown>,
): ParliamentCommitteeBrowseSearch {
  const chamber = search['chamber']
  const legislatura = search['legislatura']
  const tip = search['tip']
  const q = search['q']
  return {
    ...(typeof chamber === 'string' && CHAMBER_VALUES.has(chamber)
      ? { chamber: chamber as CommitteeChamberFilter }
      : {}),
    ...(typeof legislatura === 'string' && LEGISLATURE_VALUES.has(legislatura)
      ? { legislatura }
      : {}),
    ...(typeof tip === 'string' && TYPE_VALUES.has(tip)
      ? { tip: tip as CommitteeTypeFilter }
      : {}),
    ...(typeof q === 'string' && q.trim() ? { q: q.trim() } : {}),
  }
}

/**
 * Resolve the URL state into the API filter arguments for the CAMERA half.
 *
 * `parliamentCommittees` takes only `chamber` and `legislature` — there is no
 * type facet and no text search on the server, so `tip` and `q` are applied to
 * the fetched slice instead (see `selectCommittees`). That is sound only
 * because a chamber+legislature slice is at most ~45 rows and arrives whole;
 * filtering a partially-fetched list would describe a set the reader cannot see.
 */
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

/**
 * THE SENATE IS FETCHED SEPARATELY, AND WITHOUT A LEGISLATURE.
 *
 * All 33 Senate committees carry `legislature: null` in the source, while every
 * Camera row carries one. The browse defaulted to the current legislature and
 * passed it for both chambers, so choosing "Senat" asked for a combination that
 * cannot exist and the page answered "Nu există comisii disponibile" — telling
 * a reader the Senate has no committees. It has 33.
 *
 * Returns `undefined` when the current filters exclude the Senate entirely.
 */
export function toSenateCommitteeQueryParams(
  search: ParliamentCommitteeBrowseSearch,
): { chamber: string } | undefined {
  const chamber = search.chamber ?? 'all'
  if (chamber === 'camera_deputatilor') return undefined
  return { chamber: 'senat' }
}

/** True when the Senate rows on screen are unbounded by the legislature filter. */
export function isSenateLegislatureUnbounded(
  search: ParliamentCommitteeBrowseSearch,
): boolean {
  const chamber = search.chamber ?? 'all'
  if (chamber === 'camera_deputatilor') return false
  return (search.legislatura ?? DEFAULT_COMMITTEE_LEGISLATURE) !== 'all'
}

/** Strip diacritics and case so "juridica" finds "juridică". */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function matchesCommitteeQuery(name: string, q: string | undefined): boolean {
  if (!q) return true
  return fold(name).includes(fold(q))
}

/** Display order: the standing bodies first, then the ad-hoc ones. */
export const COMMITTEE_TYPE_ORDER: readonly string[] = [
  'permanent',
  'joint',
  'special',
]

export const COMMITTEE_TYPE_LABELS: Readonly<Record<string, string>> = {
  permanent: 'Comisii permanente',
  joint: 'Comisii comune',
  special: 'Comisii speciale',
}

export const COMMITTEE_TYPE_BADGES: Readonly<Record<string, string>> = {
  permanent: 'Permanentă',
  joint: 'Comună',
  special: 'Specială',
}

/** The unknown-type bucket. Named, never silently merged into "permanent". */
export const COMMITTEE_TYPE_UNKNOWN = 'unknown'

export type CommitteeGroup<T> = {
  readonly type: string
  readonly label: string
  readonly committees: readonly T[]
}

/**
 * Apply the client-side facets and group the result by type.
 *
 * Grouping is the page's whole hierarchy: the source orders committees by
 * `committee_key`, which is neither alphabetical nor meaningful, so a reader
 * scanning for one name had to read all 36. Within a group we sort by name with
 * Romanian collation.
 */
export function selectCommittees<
  T extends { readonly name: string; readonly committeeType?: string },
>(
  committees: readonly T[],
  search: ParliamentCommitteeBrowseSearch,
): readonly CommitteeGroup<T>[] {
  const tip = search.tip ?? 'all'
  const matched = committees.filter(
    (committee) =>
      (tip === 'all' || committee.committeeType === tip) &&
      matchesCommitteeQuery(committee.name, search.q),
  )

  const byType = new Map<string, T[]>()
  for (const committee of matched) {
    const type = committee.committeeType ?? COMMITTEE_TYPE_UNKNOWN
    byType.set(type, [...(byType.get(type) ?? []), committee])
  }

  const order = [...COMMITTEE_TYPE_ORDER, COMMITTEE_TYPE_UNKNOWN]
  return [...byType.entries()]
    .sort((left, right) => {
      const leftRank = order.indexOf(left[0])
      const rightRank = order.indexOf(right[0])
      return (
        (leftRank === -1 ? order.length : leftRank) -
        (rightRank === -1 ? order.length : rightRank)
      )
    })
    .map(([type, rows]) => ({
      type,
      label: COMMITTEE_TYPE_LABELS[type] ?? 'Alte comisii',
      committees: [...rows].sort((left, right) =>
        left.name.localeCompare(right.name, 'ro'),
      ),
    }))
}

