import { queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchProcurementAuthoritySlice,
  fetchProcurementBasisOverview,
  fetchProcurementCpvCategoryPage,
  fetchProcurementContractDetail,
  fetchProcurementDirectAcquisitionDetail,
  fetchProcurementLanding,
  fetchProcurementProcedureDetail,
  fetchProcurementSearch,
  fetchProcurementSupplierRecords,
  fetchProcurementInstitutionOverview,
  fetchProcurementSupplierSlice,
  fetchProcurementTerritoryOverview,
  type ProcurementAuthoritySliceScope,
  type ProcurementSliceScope,
  type ProcurementBasisOverviewRequest,
  type ProcurementInstitutionScopes,
} from '../api/procurement-api'
import type {
  AuthorityProcurementSlice,
  CpvCategoryPage,
  ProcurementInstitutionOverview,
} from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import {
  fetchProcurementAnalysis,
  type ProcurementAnalysisRequest,
} from '../api/procurement-analysis-api'
import {
  fetchProcurementLeaderboard,
  type ProcurementLeaderboardRequest,
} from '../api/procurement-leaderboard-api'
import { fetchProcurementGeographyOptions } from '../api/procurement-reference-api'

const PROCUREMENT_QUERY_KEY = ['procurement'] as const

export function useProcurementLanding(
  filters: ProcurementLandingFilters = {},
  enabled = true,
) {
  return useQuery({
    enabled,
    queryKey: [
      ...PROCUREMENT_QUERY_KEY,
      'landing',
      filters.dateFrom ?? null,
      filters.dateTo ?? null,
      filters.rankBy ?? null,
      filters.buyerRegion ?? null,
      filters.buyerCounty ?? null,
      filters.buyerSiruta ?? null,
      filters.supplierRegion ?? null,
      filters.supplierCounty ?? null,
      filters.supplierSiruta ?? null,
      filters.q ?? null,
      filters.valueMin ?? null,
      filters.valueMax ?? null,
      filters.authorityCui ?? null,
      filters.supplierCui ?? null,
      filters.cpvDivision ?? null,
      filters.cpvGroup ?? null,
      filters.cpvClass ?? null,
      filters.cpvCategory ?? null,
      filters.cpvCode ?? null,
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
      filters.rankBy ?? null,
      filters.buyerRegion ?? null,
      filters.buyerCounty ?? null,
      filters.buyerSiruta ?? null,
      filters.supplierRegion ?? null,
      filters.supplierCounty ?? null,
      filters.supplierSiruta ?? null,
      filters.q ?? null,
      filters.valueMin ?? null,
      filters.valueMax ?? null,
      filters.authorityCui ?? null,
      filters.supplierCui ?? null,
      filters.cpvDivision ?? null,
      filters.cpvGroup ?? null,
      filters.cpvClass ?? null,
      filters.cpvCategory ?? null,
      filters.cpvCode ?? null,
    ],
    queryFn: () => fetchProcurementTerritoryOverview(filters),
    enabled,
  })
}

/**
 * Analytics bundle for a NON-default value logic (vbasis ≠ awarded, or the
 * counts-only modifications population). The awarded default stays on
 * `useProcurementLanding` — this hook never fires for it.
 */
export function useProcurementBasisOverview(
  request: ProcurementBasisOverviewRequest,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'basis-overview', request],
    queryFn: () => fetchProcurementBasisOverview(request),
    enabled,
  })
}

export function useProcurementAnalysis(request: ProcurementAnalysisRequest) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'analysis', request],
    queryFn: () => fetchProcurementAnalysis(request),
  })
}

export function useProcurementLeaderboard(
  request: ProcurementLeaderboardRequest,
  enabled = true,
) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'leaderboard', request],
    queryFn: () => fetchProcurementLeaderboard(request),
    enabled,
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

export function useProcurementSupplierSlice(
  cui: string,
  scope?: ProcurementSliceScope,
) {
  return useQuery({
    queryKey: [...PROCUREMENT_QUERY_KEY, 'supplier-slice', cui, scope ?? null],
    queryFn: () => fetchProcurementSupplierSlice(cui, scope),
    enabled: Boolean(cui),
  })
}

/**
 * Exported as options rather than inlined in the hooks below so the route
 * loader can prefetch the *same* cache entries the page reads. Key drift
 * between loader and hook would silently double every request.
 */
export function procurementInstitutionOverviewQueryOptions(
  cui: string,
  scopes: ProcurementInstitutionScopes,
) {
  return queryOptions({
    queryKey: [
      ...PROCUREMENT_QUERY_KEY,
      'institution-overview',
      cui,
      scopes,
    ] as const,
    queryFn: () =>
      fetchProcurementInstitutionOverview({ authorityCui: cui, scopes }),
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

/**
 * Institution profile spine — all six populations + the four signals for one
 * buyer, under the page's current scope. The scope is part of the query key,
 * so period/CPV/supplier changes refetch exactly like the hub does.
 */
export function useProcurementInstitutionOverview(
  cui: string,
  scopes: ProcurementInstitutionScopes,
  initialData?: ProcurementInstitutionOverview,
) {
  return useQuery({
    ...procurementInstitutionOverviewQueryOptions(cui, scopes),
    initialData,
    enabled: Boolean(cui),
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
