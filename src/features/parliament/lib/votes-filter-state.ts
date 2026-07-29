import type {
  ParliamentVotesSearch,
  VoteChamber,
  VoteKind,
  VoteSort,
} from '@/schemas/parliament'

/**
 * What the votes list is narrowed to: one assembly (including `comun`, the
 * joint sittings) or the whole parliament.
 *
 * `all` and an ABSENT `?chamber=` mean the same list. The tab links carry no
 * chamber, so the default URL stays clean; `chamber=all` is written by the
 * facet's own option and by every link that came from a cross-chamber count
 * (the activity heatmap), and both render the mixed list.
 */
export type VotesListScope = 'camera' | 'senat' | 'comun' | 'all'

/**
 * The chamber the query should actually be bound to — `undefined` when the list
 * spans the whole parliament.
 *
 * One place decides it, so the header, the filter chip, the row badges and the
 * request can never disagree about whether a chamber is constraining the list.
 */
export function getVotesChamberFilter(
  search: ParliamentVotesSearch,
): VoteChamber | undefined {
  return search.chamber === undefined || search.chamber === 'all'
    ? undefined
    : search.chamber
}

/**
 * Sort options, worded for a reader rather than as a field name.
 *
 * One URL token carries both halves of what the server takes as two arguments
 * (`sort` + `dir`), so a shared link can never restore a field without its
 * direction.
 */
export const VOTE_SORT_LABELS: Readonly<Record<VoteSort, string>> = {
  voteDate_desc: 'Cele mai recente',
  voteDate_asc: 'Cele mai vechi',
  voteKey_desc: 'Identificator (descrescător)',
  voteKey_asc: 'Identificator (crescător)',
}

export const VOTE_SORT_ORDER: readonly VoteSort[] = [
  'voteDate_desc',
  'voteDate_asc',
  'voteKey_desc',
  'voteKey_asc',
]

export const DEFAULT_VOTE_SORT: VoteSort = 'voteDate_desc'

/** Split the UI token into the server's `sort` and `dir` arguments. */
export function toVoteSortArgs(sort: VoteSort | undefined): {
  sort: string
  dir: 'ASC' | 'DESC'
} {
  const [field, direction] = (sort ?? DEFAULT_VOTE_SORT).split('_')
  return {
    sort: field === 'voteKey' ? 'voteKey' : 'voteDate',
    dir: direction === 'asc' ? 'ASC' : 'DESC',
  }
}

/**
 * Kind labels, and how each one is actually determined.
 *
 * `legislative` is the ONLY bucket backed by a column (`bill_key IS NOT NULL`).
 * The other five are classified from the free-text title, so the panel says so
 * once rather than implying all six carry the same authority.
 */
export const VOTE_KIND_LABELS: Readonly<Record<VoteKind, string>> = {
  legislative: 'Proiecte de lege',
  amendment: 'Amendamente și articole',
  procedural: 'Proceduri de ședință',
  chamber_decision: 'Hotărâri ale camerei',
  attendance: 'Verificări de prezență',
  unclassified: 'Neclasificate',
}

/**
 * The same buckets in the SINGULAR — for a chip on ONE vote.
 *
 * The labels above name a facet you filter by ("Amendamente și articole"); these
 * name what a single division was. Using the plural on a card reads as a
 * category heading rather than a statement about that vote.
 *
 * `unclassified` is deliberately present rather than blank: 3,151 divisions land
 * there, most carrying a synthesized date title that says nothing, and an absent
 * chip would read as a rendering gap instead of the honest "the source gave us
 * nothing to classify" that it is.
 */
export const VOTE_KIND_CHIP_LABELS: Readonly<Record<VoteKind, string>> = {
  legislative: 'Proiect de lege',
  amendment: 'Amendament',
  procedural: 'Procedură',
  chamber_decision: 'Hotărâre',
  attendance: 'Prezență',
  unclassified: 'Neclasificat',
}

/** Display order: the substantive buckets first, the residue last. */
export const VOTE_KIND_ORDER: readonly VoteKind[] = [
  'legislative',
  'amendment',
  'chamber_decision',
  'procedural',
  'attendance',
  'unclassified',
]

/** `tipVot` arrives as one value or many; always read it as a list. */
export function readVoteKinds(
  search: ParliamentVotesSearch,
): readonly VoteKind[] {
  if (!search.tipVot) return []
  return Array.isArray(search.tipVot) ? search.tipVot : [search.tipVot]
}

/**
 * How many facets are narrowing the votes list right now — the number on the
 * filter button's badge.
 *
 * `q` is EXCLUDED. The search term has its own always-visible bar, so counting
 * it here would put a number on a button whose panel does not contain it, and a
 * reader clearing "1 filter" would not find the thing that was filtering.
 *
 * The group and its optional stance count as ONE. The GROUP is what makes it a
 * filter — alone it means "every vote this group took part in" — and the stance
 * only narrows that further, so counting them separately would claim two
 * constraints where the query carries one.
 *
 * The chamber counts, because it is a facet in the panel like any other: the
 * list is one surface over the whole parliament and a chamber NARROWS it.
 */
export function getActiveVoteFilterCount(
  search: ParliamentVotesSearch,
): number {
  return (
    (getVotesChamberFilter(search) ? 1 : 0) +
    (search.from || search.to ? 1 : 0) +
    (search.outcome ? 1 : 0) +
    (search.grupVot ? 1 : 0) +
    (readVoteKinds(search).length > 0 ? 1 : 0)
  )
}
