import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect } from 'react'
import { cleanPnrrSearch, parsePnrrSearchString } from '@/schemas/pnrr'
import type { PnrrSearchState, PnrrView } from '@/schemas/pnrr'
import type { Currency } from '@/schemas/charts'

const clearMapViewport = (search: Partial<PnrrSearchState>): Partial<PnrrSearchState> => {
  const next = { ...search }
  delete next.mapLat
  delete next.mapLng
  delete next.mapZoom
  return next
}

export function usePnrrFilterState() {
  const navigate = useNavigate({ from: '/pnrr' })
  const search = useSearch({ from: '/pnrr' }) as PnrrSearchState
  const location = useLocation()

  useEffect(() => {
    if (!location.searchStr) return

    const canonicalSearch = parsePnrrSearchString(location.searchStr)
    const canonicalKeys = new Set(Object.keys(canonicalSearch))
    const hasOnlyCanonicalKeys = Array.from(new URLSearchParams(location.searchStr).keys()).every(
      (key) => canonicalKeys.has(key)
    )

    if (hasOnlyCanonicalKeys) return

    navigate({
      search: canonicalSearch,
      replace: true,
      resetScroll: false,
    })
  }, [location.searchStr, navigate])

  const updateSearch = useCallback(
    (partial: Partial<PnrrSearchState>) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch(
            clearMapViewport({ ...(prev as Partial<PnrrSearchState>), ...partial, page: 1 })
          ),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setView = useCallback(
    (view: PnrrView) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({ ...(prev as Partial<PnrrSearchState>), view, page: 1 }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const showBeneficiaryProjects = useCallback(
    (beneficiary: { readonly name: string; readonly cui: string | null }) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...(prev as Partial<PnrrSearchState>),
            view: 'projects',
            beneficiarySearch: beneficiary.cui ? undefined : beneficiary.name,
            beneficiaryCui: beneficiary.cui ?? undefined,
            page: 1,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const showUatView = useCallback(
    (view: Extract<PnrrView, 'projects' | 'beneficiaries'>, uat: { readonly siruta: string; readonly name: string }) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...(prev as Partial<PnrrSearchState>),
            view,
            uatSiruta: uat.siruta,
            uatName: uat.name,
            uatSirutas: undefined,
            page: 1,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setSearch = useCallback(
    (value: string | undefined) => updateSearch({ search: value || undefined }),
    [updateSearch]
  )

  const setBeneficiarySearch = useCallback(
    (value: string | undefined) => updateSearch({ beneficiarySearch: value || undefined }),
    [updateSearch]
  )

  const setBeneficiaryCui = useCallback(
    (value: string | undefined) => updateSearch({ beneficiaryCui: value || undefined }),
    [updateSearch]
  )

  const setUatFilter = useCallback(
    (value: { readonly siruta: string; readonly name: string } | undefined) =>
      updateSearch({ uatSiruta: value?.siruta, uatName: value?.name, uatSirutas: undefined }),
    [updateSearch]
  )

  const setUatFilters = useCallback(
    (values: string[]) =>
      updateSearch({
        uatSirutas: values.length ? values : undefined,
        uatSiruta: undefined,
        uatName: undefined,
      }),
    [updateSearch]
  )

  const setComponents = useCallback(
    (values: string[]) => updateSearch({ components: values.length ? values : undefined }),
    [updateSearch]
  )

  const setCounties = useCallback(
    (values: string[]) => updateSearch({ counties: values.length ? values : undefined }),
    [updateSearch]
  )

  const setFundingSources = useCallback(
    (values: ('grant' | 'loan' | 'grant/loan')[]) =>
      updateSearch({ fundingSources: values.length ? values : undefined }),
    [updateSearch]
  )

  const setMeasures = useCallback(
    (values: string[]) => updateSearch({ measures: values.length ? values : undefined }),
    [updateSearch]
  )

  const setCris = useCallback(
    (values: string[]) => updateSearch({ cris: values.length ? values : undefined }),
    [updateSearch]
  )

  const setProgressCategories = useCallback(
    (values: PnrrSearchState['progressCategories']) =>
      updateSearch({ progressCategories: values?.length ? values : undefined }),
    [updateSearch]
  )

  const setOnlyAnomalies = useCallback(
    (value: boolean) => updateSearch({ onlyAnomalies: value || undefined }),
    [updateSearch]
  )

  const setExcludeMicro = useCallback(
    (value: boolean) => updateSearch({ excludeMicro: value || undefined }),
    [updateSearch]
  )

  const setAnomalyTypes = useCallback(
    (values: string[]) => updateSearch({ anomalyTypes: values.length ? values : undefined }),
    [updateSearch]
  )

  const setDataQualitySignalTypes = useCallback(
    (values: string[]) =>
      updateSearch({ dataQualitySignalTypes: values.length ? values : undefined }),
    [updateSearch]
  )

  const setGranularity = useCallback(
    (value: PnrrSearchState['granularity']) => updateSearch({ granularity: value }),
    [updateSearch]
  )

  const setEntityTypes = useCallback(
    (values: PnrrSearchState['entityTypes']) =>
      updateSearch({ entityTypes: values?.length ? values : undefined }),
    [updateSearch]
  )

  const setBeneficiaryTypes = useCallback(
    (values: PnrrSearchState['beneficiaryTypes']) =>
      updateSearch({ beneficiaryTypes: values?.length ? values : undefined }),
    [updateSearch]
  )

  const setIncludeNational = useCallback(
    (value: boolean) => updateSearch({ includeNational: value }),
    [updateSearch]
  )

  const setCurrency = useCallback(
    (currency: Currency) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...(prev as Partial<PnrrSearchState>),
            currency,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setSorting = useCallback(
    (sortBy: PnrrSearchState['sortBy'], sortOrder: PnrrSearchState['sortOrder']) =>
      updateSearch({ sortBy, sortOrder }),
    [updateSearch]
  )

  const setPagination = useCallback(
    (page: number, pageSize?: number) => {
      navigate({
        search: (prev) => {
          const previous = prev as Partial<PnrrSearchState>

          return cleanPnrrSearch({
            ...previous,
            page,
            pageSize: pageSize ?? previous.pageSize,
          })
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const setMapView = useCallback(
    (lat: number, lng: number, zoom: number) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...(prev as Partial<PnrrSearchState>),
            mapLat: lat,
            mapLng: lng,
            mapZoom: zoom,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const clearFilters = useCallback(() => {
    navigate({
      search: (prev) =>
        cleanPnrrSearch({
          view: search.view,
          currency: search.currency,
          page: 1,
          pageSize: (prev as Partial<PnrrSearchState>).pageSize,
        }),
      replace: true,
      resetScroll: false,
    })
  }, [navigate, search.currency, search.view])

  return {
    search,
    setView,
    showBeneficiaryProjects,
    showUatView,
    setSearch,
    setBeneficiarySearch,
    setBeneficiaryCui,
    setUatFilter,
    setUatFilters,
    setComponents,
    setCounties,
    setFundingSources,
    setMeasures,
    setCris,
    setProgressCategories,
    setOnlyAnomalies,
    setExcludeMicro,
    setAnomalyTypes,
    setDataQualitySignalTypes,
    setGranularity,
    setEntityTypes,
    setBeneficiaryTypes,
    setIncludeNational,
    setCurrency,
    setSorting,
    setPagination,
    setMapView,
    clearFilters,
  }
}
