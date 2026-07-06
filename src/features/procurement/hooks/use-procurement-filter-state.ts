/**
 * Single owner of the procurement search URL state (PNRR-style centralized
 * filter hook). Every mutation goes through `commit`: merge patch → reset
 * `page: 1` for filter writers → `cleanProcurementSearch` (strip defaults and
 * empties) → `navigate` with `replace: true` so filter edits don't spam
 * history. The URL stays the single source of truth.
 */
import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  cleanProcurementSearch,
  type ProcurementSearchState,
  type ProcurementSort,
  type ProcurementSource,
} from '@/schemas/procurement-search'
import type {
  ProcurementGrain,
  ProcurementStatus,
  ReviewSignalKind,
} from '@/schemas/procurement'
import {
  buildActiveFilterChips,
  CLEAR_ALL_FILTERS_PATCH,
  countActiveProcurementFilters,
  type ProcurementFilterPatch,
} from '../lib/filter-meta'

export function useProcurementFilterState(search: ProcurementSearchState) {
  const navigate = useNavigate({ from: '/procurement/search' })

  const commit = useCallback(
    (patch: ProcurementFilterPatch, options?: { readonly resetScroll?: boolean }) => {
      void navigate({
        search: cleanProcurementSearch({ ...search, ...patch }),
        replace: true,
        resetScroll: options?.resetScroll ?? false,
      })
    },
    [navigate, search],
  )

  /** Filter writers always reset to page 1 (a new result set). */
  const updateFilters = useCallback(
    (patch: ProcurementFilterPatch) => {
      commit({ ...patch, page: 1 })
    },
    [commit],
  )

  const setQuery = useCallback(
    (q: string) => updateFilters({ q: q.trim() || undefined }),
    [updateFilters],
  )

  const setSource = useCallback(
    (source: ProcurementSource | undefined) => updateFilters({ source }),
    [updateFilters],
  )

  const setStatuses = useCallback(
    (statuses: readonly ProcurementStatus[]) =>
      updateFilters({ status: statuses.length > 0 ? [...statuses] : undefined }),
    [updateFilters],
  )

  const setSignal = useCallback(
    (signal: ReviewSignalKind | undefined) => updateFilters({ signal }),
    [updateFilters],
  )

  const setDates = useCallback(
    (dateFrom: string | undefined, dateTo: string | undefined) =>
      updateFilters({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        // Explicit dates supersede the coarse year facet.
        year: dateFrom || dateTo ? undefined : search.year,
      }),
    [updateFilters, search.year],
  )

  const setYear = useCallback(
    (year: number | undefined) =>
      updateFilters({ year, dateFrom: undefined, dateTo: undefined }),
    [updateFilters],
  )

  const setValueRange = useCallback(
    (valueMin: number | undefined, valueMax: number | undefined) =>
      updateFilters({ valueMin, valueMax }),
    [updateFilters],
  )

  /** `cpv` (exact code) for 3+ digits, `cpv_division` for a 2-digit input. */
  const setCpv = useCallback(
    (code: string | undefined) => {
      const trimmed = code?.trim()
      if (!trimmed) {
        updateFilters({ cpv: undefined, cpv_division: undefined })
      } else if (/^\d{2}$/.test(trimmed)) {
        updateFilters({ cpv: undefined, cpv_division: trimmed })
      } else {
        updateFilters({ cpv: trimmed, cpv_division: undefined })
      }
    },
    [updateFilters],
  )

  const setAuthorityCui = useCallback(
    (cui: string | undefined) =>
      updateFilters({ authority_cui: cui?.trim() || undefined }),
    [updateFilters],
  )

  const setSupplierCui = useCallback(
    (cui: string | undefined) =>
      updateFilters({ supplier_cui: cui?.trim() || undefined }),
    [updateFilters],
  )

  /**
   * Grain switch clears grain-invalid facets: the status vocabulary differs
   * per grain, and procedures/modifications don't support all party facets.
   */
  const setGrain = useCallback(
    (grain: ProcurementGrain) => {
      updateFilters({
        grain,
        status: undefined,
        supplier_cui: grain === 'procedures' ? undefined : search.supplier_cui,
      })
    },
    [updateFilters, search.supplier_cui],
  )

  const setSort = useCallback(
    (sort: ProcurementSort) => updateFilters({ sort }),
    [updateFilters],
  )

  /** Page changes keep filters; scroll back to the top of the list. */
  const setPage = useCallback(
    (page: number) => commit({ page }, { resetScroll: true }),
    [commit],
  )

  const setPageSize = useCallback(
    (pageSize: number) => updateFilters({ pageSize }),
    [updateFilters],
  )

  const clearFilters = useCallback(
    () => updateFilters(CLEAR_ALL_FILTERS_PATCH),
    [updateFilters],
  )

  const chips = useMemo(() => buildActiveFilterChips(search), [search])
  const activeCount = countActiveProcurementFilters(search)

  return {
    search,
    updateFilters,
    setQuery,
    setSource,
    setStatuses,
    setSignal,
    setDates,
    setYear,
    setValueRange,
    setCpv,
    setAuthorityCui,
    setSupplierCui,
    setGrain,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
    chips,
    activeCount,
  }
}

export type ProcurementFilterState = ReturnType<typeof useProcurementFilterState>
