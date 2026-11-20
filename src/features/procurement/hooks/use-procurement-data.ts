import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { DA_QUERY_CACHE } from '../lib/disclosure-cache'
import {
  fetchProcurementAuthoritySlice,
  fetchProcurementSearch,
  fetchProcurementSupplierRecords,
  fetchProcurementSupplierSlice,
  type ProcurementAuthoritySliceScope,
  type ProcurementSliceScope,
} from '../api/procurement-api'
import type { AuthorityProcurementSlice } from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'

const PROCUREMENT_QUERY_KEY = ['procurement'] as const

export function useProcurementSearch(
  params: ProcurementSearchState,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'search', params],
    queryFn: () => fetchProcurementSearch(params),
    // Keep the previous page visible while the next one loads (list paging).
    placeholderData: (prev) => prev,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Options rather than an inlined query so the company profile's loader can
 * start the *same* cache entry the page reads, alongside the profile.
 */
export function procurementSupplierSliceQueryOptions(
  cui: string,
  scope?: ProcurementSliceScope,
) {
  return queryOptions({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'supplier-slice', cui, scope ?? null] as const,
    queryFn: ({ signal }) => fetchProcurementSupplierSlice(cui, scope, signal),
    // D6: the slice reads the supplier-records connection, which carries no publication yet: kept only while shown.
    ...DA_QUERY_CACHE,
  })
}

export function useProcurementSupplierSlice(
  cui: string,
  scope?: ProcurementSliceScope,
) {
  return useQuery({
    ...procurementSupplierSliceQueryOptions(cui, scope),
    enabled: Boolean(cui),
  })
}

export function procurementAuthoritySliceQueryOptions(
  cui: string,
  scope?: ProcurementAuthoritySliceScope,
) {
  return queryOptions({
    queryKey: [
      ...PROCUREMENT_QUERY_KEY,
      'authority-slice',
      cui,
      scope ?? null,
    ] as const,
    queryFn: ({ signal }) => fetchProcurementAuthoritySlice(cui, scope, signal),
    // D6: the slice ranks direct purchases' suppliers; kept only while shown, as the supplier's.
    ...DA_QUERY_CACHE,
  })
}

export function useProcurementAuthoritySlice(
  cui: string,
  initialData?: AuthorityProcurementSlice,
  scope?: ProcurementAuthoritySliceScope,
) {
  return useQuery({
    ...procurementAuthoritySliceQueryOptions(cui, scope),
    initialData,
    enabled: Boolean(cui),
  })
}

/** Cursor-paged supplier flow records ("load more" list on company pages). */
export function useProcurementSupplierRecords(cui: string) {
  return useInfiniteQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'supplier-records', cui],
    queryFn: ({ pageParam }) => fetchProcurementSupplierRecords(cui, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last?.hasNextPage && last.endCursor ? last.endCursor : undefined,
    enabled: Boolean(cui),
  })
}
