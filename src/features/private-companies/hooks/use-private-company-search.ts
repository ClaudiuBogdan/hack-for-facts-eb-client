import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import {
  fetchPrivateCompanyCounties,
  fetchPrivateCompanySearch,
} from '../api/private-company-api'
import type {
  PrivateCompanyDirectorySearchState,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'

const PAGE_SIZE = 25

export function privateCompanySearchQueryKey(
  state: PrivateCompanyDirectorySearchState,
) {
  return [
    'private-company-search',
    state.q ?? '',
    state.county ?? '',
    state.status ?? '',
    state.caen ?? '',
    state.sort ?? '',
  ] as const
}

export function usePrivateCompanySearch(
  state: PrivateCompanyDirectorySearchState,
) {
  return useInfiniteQuery({
    queryKey: privateCompanySearchQueryKey(state),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchPrivateCompanySearch({
        q: state.q,
        county: state.county,
        status: state.status,
        caen: state.caen,
        sort: state.sort,
        pageSize: PAGE_SIZE,
        cursor: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage: PrivateCompanySearchResultPage) =>
      lastPage.nextCursor ?? undefined,
    // Keep the prior results visible (dimmed) while a new filter loads, instead
    // of flashing the empty/loading state on every filter change.
    placeholderData: keepPreviousData,
  })
}

export function usePrivateCompanyCounties() {
  return useQuery({
    queryKey: ['private-company-counties'],
    queryFn: () => fetchPrivateCompanyCounties(),
    staleTime: 60 * 60 * 1000,
  })
}
