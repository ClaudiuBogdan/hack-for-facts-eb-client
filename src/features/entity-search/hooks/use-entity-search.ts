/**
 * TanStack Query hook for the global entity search. The route/component owns the
 * debounce (the typed `q` lives in a URL param); this hook just turns a settled
 * `EntitySearchInput` into a query.
 *
 * - disabled when `q` is blank (returns no data, never a loading state)
 * - queryKey covers every normalized input field so filter changes refetch
 * - passes the React Query AbortSignal through to `searchEntitiesLive`
 * - `keepPreviousData` so the list does not flash while typing/filtering
 */
import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
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
    input.county?.trim() ?? '',
    input.year ?? null,
    input.limit ?? null,
    input.offset ?? null,
  ] as const
}

export function useEntitySearch(
  input: EntitySearchInput,
): UseQueryResult<EntitySearchResult, Error> {
  const enabled = input.q.trim().length > 0
  return useQuery({
    queryKey: entitySearchQueryKey(input),
    queryFn: ({ signal }) => searchEntitiesLive(input, signal),
    enabled,
    // Keep prior results visible while a new query/filter loads instead of
    // flashing the empty/loading state on every keystroke.
    placeholderData: keepPreviousData,
  })
}
