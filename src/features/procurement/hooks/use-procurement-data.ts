/**
 * TanStack Query hooks for the procurement feature. Key convention (mirrors
 * parliament): `[namespace, resource, ...discriminators]` — filters flow in
 * as the last key segment so any change refetches.
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchProcurementAuthoritySlice,
  fetchProcurementCpvCategoryPage,
  fetchProcurementContractDetail,
  fetchProcurementDirectAcquisitionDetail,
  fetchProcurementLanding,
  fetchProcurementProcedureDetail,
  fetchProcurementSearch,
  fetchProcurementSupplierRecords,
  fetchProcurementSupplierSlice,
  fetchProcurementTerritoryOverview,
} from '../api/procurement-api'
import type {
  AuthorityProcurementSlice,
  CpvCategoryPage,
} from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import {
  fetchProcurementAnalysis,
  type ProcurementAnalysisRequest,
} from '../api/procurement-analysis-api'
import { fetchProcurementGeographyOptions } from '../api/procurement-reference-api'

const PROCUREMENT_QUERY_KEY = ['procurement'] as const

export function useProcurementLanding(filters: ProcurementLandingFilters = {}) {
  return useQuery({
    queryKey: [
      ...PROCUREMENT_QUERY_KEY,
      'landing',
      filters.dateFrom ?? null,
      filters.dateTo ?? null,
      filters.buyerRegion ?? null,
      filters.buyerCounty ?? null,
      filters.buyerSiruta ?? null,
      filters.supplierRegion ?? null,
      filters.supplierCounty ?? null,
    ],
    queryFn: () => fetchProcurementLanding(filters),
  })
}

/**
 * Territory drawer mini-overview (party rankings + CPV + monthly under geo).
 * Always requests authorities/suppliers — see fetchProcurementTerritoryOverview TODOs.
 */
export function useProcurementTerritoryOverview(
  filters: ProcurementLandingFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      ...PROCUREMENT_QUERY_KEY,
      'territory-overview',
      filters.dateFrom ?? null,
      filters.dateTo ?? null,
      filters.period ?? null,
      filters.buyerRegion ?? null,
      filters.buyerCounty ?? null,
      filters.buyerSiruta ?? null,
    ],
    queryFn: () => fetchProcurementTerritoryOverview(filters),
    enabled,
  })
}

export function useProcurementAnalysis(request: ProcurementAnalysisRequest) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'analysis', request],
    queryFn: () => fetchProcurementAnalysis(request),
  })
}

export function useProcurementGeographyOptions() {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'geography-options'],
    queryFn: fetchProcurementGeographyOptions,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}

export function useProcurementSearch(params: ProcurementSearchState) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'search', params],
    queryFn: () => fetchProcurementSearch(params),
    // Keep the previous page visible while the next one loads (list paging).
    placeholderData: (prev) => prev,
  })
}

export function useProcurementProcedureDetail(id: string) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'procedure', id],
    queryFn: () => fetchProcurementProcedureDetail(id),
    enabled: Boolean(id),
  })
}

export function useProcurementContractDetail(id: string) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'contract', id],
    queryFn: () => fetchProcurementContractDetail(id),
    enabled: Boolean(id),
  })
}

export function useProcurementDirectAcquisitionDetail(id: string) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'direct-acquisition', id],
    queryFn: () => fetchProcurementDirectAcquisitionDetail(id),
    enabled: Boolean(id),
  })
}

export function useProcurementCpvCategory(
  code: string,
  initialData?: CpvCategoryPage,
) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'cpv', code],
    queryFn: () => fetchProcurementCpvCategoryPage(code),
    initialData,
    enabled: Boolean(code),
  })
}

export function useProcurementSupplierSlice(cui: string) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'supplier-slice', cui],
    queryFn: () => fetchProcurementSupplierSlice(cui),
    enabled: Boolean(cui),
  })
}

export function useProcurementAuthoritySlice(
  cui: string,
  initialData?: AuthorityProcurementSlice,
) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'authority-slice', cui],
    queryFn: () => fetchProcurementAuthoritySlice(cui),
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
