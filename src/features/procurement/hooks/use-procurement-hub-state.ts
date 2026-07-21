/**
 * Centralized hub URL state (A2 / F2) — PNRR-style commit for `/procurement`.
 */
import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type {
  ProcurementGrain,
  ProcurementStatus,
  ReviewSignalKind,
} from '@/schemas/procurement'
import {
  cleanProcurementHubSearch,
  hubStateToLandingFilters,
  hubStateToListSearchState,
  resolveProcurementOverviewPeriod,
  type ProcurementHubState,
  type ProcurementHubView,
  type ProcurementSort,
  type ProcurementSource,
  type ProcurementValueCategory,
} from '@/schemas/procurement-hub'
import {
  buildActiveFilterChips,
  CLEAR_ALL_FILTERS_PATCH,
  countActiveProcurementFilters,
  type ProcurementFilterPatch,
} from '../lib/filter-meta'
import { buildHubActiveFilterChips } from '../lib/hub-filter-chips'

export type ProcurementHubFilterPatch = Partial<ProcurementHubState>

export function useProcurementHubState(state: ProcurementHubState) {
  const navigate = useNavigate({ from: '/procurement/' })

  const commit = useCallback(
    (
      patch: ProcurementHubFilterPatch,
      options?: { readonly resetScroll?: boolean },
    ) => {
      void navigate({
        search: cleanProcurementHubSearch({ ...state, ...patch }),
        replace: true,
        resetScroll: options?.resetScroll ?? false,
      })
    },
    [navigate, state],
  )

  const updateFilters = useCallback(
    (patch: ProcurementHubFilterPatch) => {
      commit({ ...patch, page: 1 })
    },
    [commit],
  )

  const setView = useCallback(
    (view: ProcurementHubView) => commit({ view }),
    [commit],
  )

  const setQuery = useCallback(
    (q: string | undefined) =>
      updateFilters({
        q: q?.trim() || undefined,
        view: 'list',
      }),
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

  const setValueCategories = useCallback(
    (categories: readonly ProcurementValueCategory[]) =>
      updateFilters({
        value_state: categories.length > 0 ? [...categories] : undefined,
      }),
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
        period: undefined,
        year: dateFrom || dateTo ? undefined : state.year,
      }),
    [updateFilters, state.year],
  )

  const setPeriodAll = useCallback(() => {
    updateFilters({
      period: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      year: undefined,
    })
  }, [updateFilters])

  const setPreviousYear = useCallback(() => {
    const resolved = resolveProcurementOverviewPeriod({})
    updateFilters({
      period: undefined,
      dateFrom: resolved.dateFrom,
      dateTo: resolved.dateTo,
      year: undefined,
    })
  }, [updateFilters])

  const setYear = useCallback(
    (year: number | undefined) =>
      updateFilters({ year, dateFrom: undefined, dateTo: undefined, period: undefined }),
    [updateFilters],
  )

  const setValueRange = useCallback(
    (valueMin: number | undefined, valueMax: number | undefined) =>
      updateFilters({ valueMin, valueMax }),
    [updateFilters],
  )

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

  const setBuyerGeography = useCallback(
    (next: {
      readonly buyerRegion?: string
      readonly buyerCounty?: string
    }) =>
      updateFilters({
        buyerRegion: next.buyerRegion,
        buyerCounty: next.buyerCounty,
      }),
    [updateFilters],
  )

  const setSupplierGeography = useCallback(
    (next: {
      readonly supplierRegion?: string
      readonly supplierCounty?: string
    }) =>
      updateFilters({
        supplierRegion: next.supplierRegion,
        supplierCounty: next.supplierCounty,
      }),
    [updateFilters],
  )

  const setGrain = useCallback(
    (grain: ProcurementGrain) => {
      updateFilters({
        grain,
        status: undefined,
        supplier_cui: grain === 'procedures' ? undefined : state.supplier_cui,
      })
    },
    [updateFilters, state.supplier_cui],
  )

  const setSort = useCallback(
    (sort: ProcurementSort) => updateFilters({ sort }),
    [updateFilters],
  )

  const setPage = useCallback(
    (page: number) => commit({ page }, { resetScroll: true }),
    [commit],
  )

  const setPageSize = useCallback(
    (pageSize: number) => updateFilters({ pageSize }),
    [updateFilters],
  )

  const clearFilters = useCallback(() => {
    updateFilters({
      ...CLEAR_ALL_FILTERS_PATCH,
      q: undefined,
      period: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      buyerRegion: undefined,
      buyerCounty: undefined,
      supplierRegion: undefined,
      supplierCounty: undefined,
      view: state.view,
      grain: state.grain,
    })
  }, [updateFilters, state.view, state.grain])

  const listSearch = useMemo(() => hubStateToListSearchState(state), [state])
  const landingFilters = useMemo(() => hubStateToLandingFilters(state), [state])
  const period = useMemo(() => resolveProcurementOverviewPeriod(state), [state])

  const listChips = useMemo(() => buildActiveFilterChips(listSearch), [listSearch])
  const listActiveCount = countActiveProcurementFilters(listSearch)

  const hubChips = useMemo(
    () => buildHubActiveFilterChips(state, period),
    [state, period],
  )

  /** Shape compatible with `ProcurementFilterState` for list UI reuse. */
  const listFilterState = useMemo(
    () =>
      ({
        search: listSearch,
        updateFilters: (patch: ProcurementFilterPatch) =>
          updateFilters(patch as ProcurementHubFilterPatch),
        setQuery,
        setSource,
        setStatuses,
        setValueCategories,
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
        chips: listChips,
        activeCount: listActiveCount,
      }) as import('./use-procurement-filter-state').ProcurementFilterState,
    [
      listSearch,
      updateFilters,
      setQuery,
      setSource,
      setStatuses,
      setValueCategories,
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
      listChips,
      listActiveCount,
    ],
  )

  return {
    state,
    listSearch,
    landingFilters,
    period,
    hubChips,
    listFilterState,
    commit,
    updateFilters,
    setView,
    setQuery,
    setSource,
    setStatuses,
    setValueCategories,
    setSignal,
    setDates,
    setPeriodAll,
    setPreviousYear,
    setYear,
    setValueRange,
    setCpv,
    setAuthorityCui,
    setSupplierCui,
    setBuyerGeography,
    setSupplierGeography,
    setGrain,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
  }
}

export type ProcurementHubFilterState = ReturnType<typeof useProcurementHubState>
