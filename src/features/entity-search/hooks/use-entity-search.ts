/**
 * TanStack Query hook for the global entity search. The route/component owns the
 * debounce (the typed `q` lives in a URL param); this hook just turns a settled
 * `EntitySearchInput` into a query.
 *
 * - disabled when `q` is blank (returns no data, never a loading state)
 * - queryKey covers every normalized input field so filter changes refetch
 * - passes the React Query AbortSignal through to `searchEntitiesLive`
 * - `keepPreviousData` so the list does not flash while typing/filtering
 *
 * Paging is OFFSET-based, not a growing `limit`: the server clamps `limit` to 50,
 * so raising it could never reach past the second page. The next offset is the
 * server's own `continuation.nextOffset`, used exactly: hidden candidates make
 * the visible hits fewer (even zero) than the page, so `hits.length` says
 * nothing about where the next page starts or whether there is one.
 */
import {
  keepPreviousData,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query'
import { searchEntitiesLive } from '../api/entity-search-api.live'
import type {
  EntitySearchInput,
  EntitySearchResult,
} from '@/schemas/entity-search'

export function entitySearchQueryKey(input: EntitySearchInput) {
  return [
    'entity-search',
    input.q.trim(),
    [...(input.docTypes ?? [])].map((t) => t.trim()).sort(),
    [...(input.roles ?? [])].map((r) => r.trim()).sort(),
    input.county?.trim() ?? '',
    input.isActive ?? null,
    input.isUat ?? null,
    [...new Set(input.entityTags ?? [])].sort(),
    [...new Set(input.excludeEntityTags ?? [])].sort(),
    input.limit ?? null,
  ] as const
}

export function useEntitySearch(
  input: EntitySearchInput,
): UseInfiniteQueryResult<InfiniteData<EntitySearchResult, number>, Error> {
  const enabled = input.q.trim().length > 0

  return useInfiniteQuery({
    queryKey: entitySearchQueryKey(input),
    queryFn: ({ pageParam, signal }) =>
      searchEntitiesLive({ ...input, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.continuation.nextOffset ?? undefined,
    enabled,
    // Keep prior results visible while a new query/filter loads instead of
    // flashing the empty/loading state on every keystroke.
    placeholderData: keepPreviousData,
    // NO automatic retry, overriding the global `retry: 1` (D5). A search-engine
    // outage is no longer an error here — the server answers `ok` with
    // `degraded: true` — so anything that DOES reach this branch is a real
    // transport or server failure or a withheld answer, and retrying it
    // silently doubles the load on something already failing while the user
    // waits through two backoffs for the same answer. The page offers an
    // explicit retry instead.
    retry: false,
  })
}
