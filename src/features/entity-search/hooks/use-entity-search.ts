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
 * so raising it could never reach past the second page. It clamps `offset` to
 * 1000 because Meili stops scanning at `maxTotalHits`, which is why
 * `getNextPageParam` stops there rather than letting the user page into nothing.
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

/** Mirrors the server's own offset clamp (Meili maxTotalHits = 1000). */
const OFFSET_MAX = 1000

export function entitySearchQueryKey(input: EntitySearchInput) {
  return [
    'entity-search',
    input.q.trim(),
    [...(input.docTypes ?? [])].map((t) => t.trim()).sort(),
    [...(input.roles ?? [])].map((r) => r.trim()).sort(),
    input.county?.trim() ?? '',
    input.isActive ?? null,
    input.limit ?? null,
  ] as const
}

export function useEntitySearch(
  input: EntitySearchInput,
): UseInfiniteQueryResult<InfiniteData<EntitySearchResult, number>, Error> {
  const enabled = input.q.trim().length > 0
  const limit = input.limit ?? 20

  return useInfiniteQuery({
    queryKey: entitySearchQueryKey(input),
    queryFn: ({ pageParam, signal }) =>
      searchEntitiesLive({ ...input, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.hits.length, 0)
      const next = allPages.length * limit
      // Stop on a short page (the engine has nothing more), when everything the
      // engine will admit to is loaded, or at the engine's own scan ceiling.
      if (lastPage.hits.length < limit) return undefined
      if (loaded >= lastPage.estimatedTotalHits) return undefined
      return next < OFFSET_MAX ? next : undefined
    },
    enabled,
    // Keep prior results visible while a new query/filter loads instead of
    // flashing the empty/loading state on every keystroke.
    placeholderData: keepPreviousData,
    // NO automatic retry, overriding the global `retry: 1` (D5). A search-engine
    // outage is no longer an error here — the server answers `ok` with
    // `degraded: true` — so anything that DOES reach this branch is a real
    // transport or server failure, and retrying it silently doubles the load on
    // something already failing while the user waits through two backoffs for
    // the same answer. The empty state offers an explicit retry instead.
    retry: false,
  })
}
