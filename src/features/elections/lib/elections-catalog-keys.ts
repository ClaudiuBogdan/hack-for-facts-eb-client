import { ELECTIONS_PAGE_SIZE, type ElectionContestsSearch, type ElectionsCatalogSearch } from '@/schemas/elections-catalog'

/**
 * The elections pages' query keys, in a module of their own: the routes'
 * eager code (their `head`, their seed guard) reads by them without pulling
 * in the pages' reads.
 *
 * A list's key is everything its read sends — the exact filter values, the
 * page and the page size — in a fixed order, built from the parsed address
 * rather than from the search object, so two addresses that differ only in
 * key order or in an `undefined` left behind share one entry. The ballot
 * day's date is not part of a contests key: the day's own key is. Keys and
 * labels stay whole values inside the array: nothing is joined into a string
 * a comma or a colon could make ambiguous.
 */
const ALL = ['elections-catalog'] as const

export const electionsCatalogKeys = {
  all: ALL,
  events: (search: ElectionsCatalogSearch) => [...ALL, 'events', { page: search.pagina ?? 1, pageSize: ELECTIONS_PAGE_SIZE }] as const,
  event: (eventKey: string) => [...ALL, 'event', eventKey] as const,
  contests: (occurrenceKey: string, search: ElectionContestsSearch) =>
    [
      ...ALL,
      'contests',
      occurrenceKey,
      {
        office: search.functie ?? null,
        placeType: search.arie ?? null,
        county: search.judet ?? null,
        page: search.pagina ?? 1,
        pageSize: ELECTIONS_PAGE_SIZE,
      },
    ] as const,
  contest: (contestKey: string) => [...ALL, 'contest', contestKey] as const,
  /** A contest's own figures: everything the read sends, all of it from the contest's record. */
  result: (target: { readonly contestKey: string; readonly occurrenceKey: string; readonly office: string; readonly placeKey: string }) =>
    [...ALL, 'result', target.contestKey, { occurrenceKey: target.occurrenceKey, office: target.office, placeKey: target.placeKey }] as const,
}

/** A key as one string: a server read seeds the page only when it was read for the key the page asks under. */
export function seedKeyOf(queryKey: readonly unknown[]): string {
  return JSON.stringify(queryKey)
}
