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
import type { ProcurementRecordKindOption } from '@/schemas/procurement-search'
import {
  cleanProcurementHubSearch,
  hubStateToLandingFilters,
  hubStateToListSearchState,
  resolveProcurementOverviewPeriod,
  type ProcurementCpvLevel,
  type ProcurementRankBy,
  type ProcurementHubState,
  type ProcurementHubView,
  type ProcurementRankDim,
  type ProcurementRankPageSize,
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
      commit({ page: 1, rankPage: 1, ...patch })
    },
    [commit],
  )

  const setView = useCallback(
    (view: ProcurementHubView) => commit({ view }),
    [commit],
  )

  const setRankDim = useCallback(
    (rankDim: ProcurementRankDim) => updateFilters({ rankDim, rankPage: 1 }),
    [updateFilters],
  )

  const setCpvLevel = useCallback(
    (cpvLevel: ProcurementCpvLevel) => updateFilters({ cpvLevel, rankPage: 1 }),
    [updateFilters],
  )

  const setRankBy = useCallback(
    (rankBy: ProcurementRankBy) => updateFilters({ rankBy, rankPage: 1 }),
    [updateFilters],
  )

  const setRankPage = useCallback(
    (rankPage: number) => commit({ rankPage }, { resetScroll: true }),
    [commit],
  )

  const setRankPageSize = useCallback(
    (rankPageSize: ProcurementRankPageSize) =>
      updateFilters({ rankPageSize, rankPage: 1 }),
    [updateFilters],
  )

  // q scopes aggregates too (server row filter, 2026-07-24) — searching no
  // longer bounces the hub into the list view.
  const setQuery = useCallback(
    (q: string | undefined) =>
      updateFilters({
        q: q?.trim() || undefined,
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

  /**
   * One CPV input, level by digit count: 2 = division, 3 = group, 4 = class,
   * 5 = category, else exact code. Levels 3–5 normalize to the canonical
   * 8-digit level code (trailing zeros — the server scope contract); at most
   * one level is ever set.
   */
  const setCpv = useCallback(
    (code: string | undefined) => {
      const trimmed = code?.trim()
      const clear = {
        cpv: undefined,
        cpv_division: undefined,
        cpv_group: undefined,
        cpv_class: undefined,
        cpv_category: undefined,
      }
      if (!trimmed) {
        updateFilters(clear)
      } else if (/^\d{2}$/.test(trimmed)) {
        updateFilters({ ...clear, cpv_division: trimmed })
      } else if (/^\d{2}[1-9]$/.test(trimmed)) {
        updateFilters({ ...clear, cpv_group: trimmed.padEnd(8, '0') })
      } else if (/^\d{3}[1-9]$/.test(trimmed)) {
        updateFilters({ ...clear, cpv_class: trimmed.padEnd(8, '0') })
      } else if (/^\d{4}[1-9]$/.test(trimmed)) {
        updateFilters({ ...clear, cpv_category: trimmed.padEnd(8, '0') })
      } else if (/^\d{2}[1-9]0{5}$/.test(trimmed)) {
        updateFilters({ ...clear, cpv_group: trimmed })
      } else if (/^\d{3}[1-9]0{4}$/.test(trimmed)) {
        updateFilters({ ...clear, cpv_class: trimmed })
      } else if (/^\d{4}[1-9]0{3}$/.test(trimmed)) {
        updateFilters({ ...clear, cpv_category: trimmed })
      } else {
        updateFilters({ ...clear, cpv: trimmed })
      }
    },
    [updateFilters],
  )

  const setRecordKinds = useCallback(
    (kinds: readonly ProcurementRecordKindOption[]) =>
      updateFilters({
        record_kind: kinds.length > 0 ? [...kinds] : undefined,
      }),
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
      readonly buyerSiruta?: string
    }) =>
      updateFilters({
        buyerRegion: next.buyerRegion,
        buyerCounty: next.buyerCounty,
        buyerSiruta: next.buyerSiruta,
      }),
    [updateFilters],
  )

  const setSupplierGeography = useCallback(
    (next: {
      readonly supplierRegion?: string
      readonly supplierCounty?: string
      readonly supplierSiruta?: string
    }) =>
      updateFilters({
        supplierRegion: next.supplierRegion,
        supplierCounty: next.supplierCounty,
        supplierSiruta: next.supplierSiruta,
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
      cpv_group: undefined,
      cpv_class: undefined,
      cpv_category: undefined,
      record_kind: undefined,
      period: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      buyerRegion: undefined,
      buyerCounty: undefined,
      buyerSiruta: undefined,
      supplierRegion: undefined,
      supplierCounty: undefined,
      supplierSiruta: undefined,
      measure: undefined,
      view: state.view,
      grain: state.grain,
      // Keep mapGrain / mapParty — map chrome, not global filters.
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
        setRecordKinds,
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
      setRecordKinds,
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
    setRankDim,
    setCpvLevel,
    setRankBy,
    setRankPage,
    setRankPageSize,
    setQuery,
    setSource,
    setStatuses,
    setValueCategories,
    setRecordKinds,
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
