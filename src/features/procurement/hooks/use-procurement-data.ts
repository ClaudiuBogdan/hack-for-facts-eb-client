import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchProcurementAuthoritySlice,
  fetchProcurementSearch,
  fetchProcurementSupplierRecords,
  fetchProcurementSupplierSlice,
  type ProcurementAuthoritySliceScope,
  type ProcurementSliceScope,
} from '../api/procurement-api'
import type {
  AuthorityProcurementSlice,
  ProcurementRecordDetail,
} from '@/schemas/procurement'
import type { DetailGrainKey, DetailRecord } from '../lib/detail-config'
import { RECORD_DETAIL_FETCHERS } from '../lib/detail-fetchers'
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

export function procurementRecordDetailQueryOptions(
  grain: DetailGrainKey,
  id: string,
) {
  return queryOptions({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'record-detail', grain, id] as const,
    queryFn: () => RECORD_DETAIL_FETCHERS[grain](id),
    enabled: Boolean(id),
  })
}

/**
 * `initialData` carries the server-rendered payload into the first client
 * render, so a server-rendered visit does not re-request what SSR already
 * resolved. Matches how the sibling institution route seeds its queries.
 */
export function useProcurementRecordDetail(
  grain: DetailGrainKey,
  id: string,
  initialData?: ProcurementRecordDetail<DetailRecord>,
) {
  return useQuery({
    ...procurementRecordDetailQueryOptions(grain, id),
    initialData,
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
    queryFn: () => fetchProcurementSupplierSlice(cui, scope),
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
    queryFn: () => fetchProcurementAuthoritySlice(cui, scope),
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
