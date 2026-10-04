import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { isRegistryPublished } from '@/schemas/private-company-registry'
import type {
  PrivateCompanyDirectorySearchState,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import { fetchPrivateCompanyCounties, fetchPrivateCompanySearch } from '../api/private-company-api'
import { retryRegistryRead } from '../api/company-registry-errors'
import { invalidCaenSelectors } from '../lib/company-caen-selector'
import { boundScopeKey, isCachedQuery, useRegistryReadLedger, useReportRegistryMove, type CompanyRegistryScope } from './use-company-registry-scope'

const PAGE_SIZE = 25

/** Stable key for a multi-value facet — selection order must not split the cache. */
function facetKey(values: readonly string[] | undefined): string {
  return values && values.length > 0 ? [...values].sort().join(',') : ''
}

/**
 * Every list query is keyed by the registry scope first: rows, cursors and
 * totals of one scope never answer for another.
 */
export function privateCompanySearchQueryKey(state: PrivateCompanyDirectorySearchState, scopeKey: string | null) {
  return [
    'private-company-search',
    scopeKey ?? '',
    state.q ?? '',
    facetKey(state.county),
    facetKey(state.status),
    state.caen ?? '',
    facetKey(state.onrcCaen),
    facetKey(state.legalForm),
    state.regFrom ?? '',
    state.regTo ?? '',
    state.vat ?? '',
    state.inactive ?? '',
    state.sort ?? '',
  ] as const
}

/** The URL asks something only the ONRC registry can answer: a registry filter or the recorded-date sort. */
export function usesRegistry(state: PrivateCompanyDirectorySearchState): boolean {
  return (
    Boolean(state.county?.length) ||
    Boolean(state.status?.length) ||
    Boolean(state.caen?.trim()) ||
    Boolean(state.onrcCaen?.length) ||
    Boolean(state.legalForm?.length) ||
    Boolean(state.regFrom) ||
    Boolean(state.regTo) ||
    state.sort === 'registration-date'
  )
}

/**
 * Why the list is not read: no trusted scope yet, a registry that cannot
 * answer the URL's registry filters (a state, never an empty list), or an
 * exact CAEN selector that is not one (said, never dropped).
 */
export type DirectoryBlock = 'unpinned' | 'registry-unavailable' | 'invalid-selector' | null

export function directoryBlock(state: PrivateCompanyDirectorySearchState, scope: CompanyRegistryScope): DirectoryBlock {
  if (boundScopeKey(scope) === null || scope.status !== 'ready') return 'unpinned'
  if (invalidCaenSelectors(state.onrcCaen).length > 0) return 'invalid-selector'
  if (usesRegistry(state) && !isRegistryPublished(scope.pinned.registry)) return 'registry-unavailable'
  return null
}

const SEARCH_KEY = ['private-company-search'] as const
const COUNTIES_KEY = ['private-company-counties'] as const

export function usePrivateCompanySearch(state: PrivateCompanyDirectorySearchState, scope: CompanyRegistryScope) {
  const scopeKey = boundScopeKey(scope)
  const block = directoryBlock(state, scope)
  const ledger = useRegistryReadLedger()
  const queryClient = useQueryClient()
  const query = useInfiniteQuery({
    queryKey: privateCompanySearchQueryKey(state, scopeKey),
    initialPageParam: null as string | null,
    enabled: block === null,
    queryFn: ({ pageParam, signal }) =>
      ledger.track(scopeKey ?? '', () => fetchPrivateCompanySearch({
        q: state.q,
        county: state.county,
        status: state.status,
        caen: state.caen,
        onrcCaen: state.onrcCaen,
        legalForm: state.legalForm,
        regFrom: state.regFrom,
        regTo: state.regTo,
        vat: state.vat,
        inactive: state.inactive,
        sort: state.sort,
        pageSize: PAGE_SIZE,
        cursor: pageParam,
        scopeKey: scopeKey ?? '',
        signal,
      })),
    getNextPageParam: (lastPage: PrivateCompanySearchResultPage) => lastPage.nextCursor ?? undefined,
    retry: retryRegistryRead,
    // The prior results stay visible (dimmed) while a new filter loads — only
    // when they are the same scope's, from an entry no refusal retired: another
    // scope's rows, or refused ones, are never shown.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === (scopeKey ?? '') && scopeKey !== null && isCachedQuery(queryClient, previousQuery) ? previous : undefined,
  })
  useReportRegistryMove(query.error, scope, ledger, SEARCH_KEY)
  return { ...query, block }
}

/**
 * The county options under the pinned scope (a published edition only): the
 * county consensus of the companies with an „în funcțiune" observation.
 */
export function usePrivateCompanyCounties(scope: CompanyRegistryScope) {
  const scopeKey = boundScopeKey(scope)
  const published = scope.status === 'ready' && isRegistryPublished(scope.pinned.registry)
  const ledger = useRegistryReadLedger()
  const query = useQuery({
    queryKey: [...COUNTIES_KEY, scopeKey] as const,
    queryFn: ({ signal }) => ledger.track(scopeKey ?? '', () => fetchPrivateCompanyCounties(scopeKey ?? '', signal)),
    enabled: scopeKey !== null && published,
    staleTime: 60 * 60 * 1000,
    retry: retryRegistryRead,
  })
  useReportRegistryMove(query.error, scope, ledger, COUNTIES_KEY)
  return query
}
