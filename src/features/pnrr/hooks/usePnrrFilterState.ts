import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect } from 'react'
import { cleanPnrrSearch, parsePnrrSearchString } from '@/schemas/pnrr'
import type { PnrrSearchState, PnrrView } from '@/schemas/pnrr'
import type { Currency } from '@/schemas/charts'

type AnomalyPanelSignal =
  | { readonly kind: 'risk'; readonly type: string }
  | { readonly kind: 'data-quality'; readonly type: string }

const clearMapViewport = (search: Partial<PnrrSearchState>): Partial<PnrrSearchState> => {
  const next = { ...search }
  delete next.mapLat
  delete next.mapLng
  delete next.mapZoom
  return next
}

const clearPanelSearch = (search: Partial<PnrrSearchState>): Partial<PnrrSearchState> => {
  const next = { ...search }
  delete next.panel
  delete next.panelProjectId
  delete next.panelBeneficiaryCui
  delete next.panelCountyCode
  delete next.panelUatSiruta
  delete next.panelSignalKind
  delete next.panelSignalType
  return next
}

const getPanelSearch = (search: Partial<PnrrSearchState>): Partial<PnrrSearchState> => ({
  panel: search.panel,
  panelProjectId: search.panelProjectId,
  panelBeneficiaryCui: search.panelBeneficiaryCui,
  panelCountyCode: search.panelCountyCode,
  panelUatSiruta: search.panelUatSiruta,
  panelSignalKind: search.panelSignalKind,
  panelSignalType: search.panelSignalType,
})

function normalizeSearchParamScalar(value: string): string {
  const trimmed = value.trim()
  try {
    const parsed = JSON.parse(trimmed)
    if (
      typeof parsed === 'string' ||
      typeof parsed === 'number' ||
      typeof parsed === 'boolean'
    ) {
      return String(parsed)
    }
  } catch {
    // The router can emit plain values; keep comparing against the raw text.
  }

  return trimmed
}

function searchParamValueMatches(value: string, canonicalValue: unknown): boolean {
  if (Array.isArray(canonicalValue)) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return (
          parsed.length === canonicalValue.length &&
          parsed.every((item, index) => String(item) === String(canonicalValue[index]))
        )
      }
    } catch {
      // Fall through to a scalar comparison for non-JSON array params.
    }

    return canonicalValue.length === 1 && normalizeSearchParamScalar(value) === canonicalValue[0]
  }

  return normalizeSearchParamScalar(value) === String(canonicalValue)
}

function hasCanonicalSearchParams(
  searchStr: string,
  canonicalSearch: Partial<PnrrSearchState>,
): boolean {
  const params = new URLSearchParams(searchStr)
  const canonicalKeys = new Set(Object.keys(canonicalSearch))

  const hasOnlyCanonicalKeys = Array.from(params.keys()).every((key) =>
    canonicalKeys.has(key),
  )
  if (!hasOnlyCanonicalKeys) return false

  return Object.entries(canonicalSearch).every(([key, value]) => {
    const rawValue = params.get(key)
    return rawValue !== null && searchParamValueMatches(rawValue, value)
  })
}

export function usePnrrFilterState() {
  const navigate = useNavigate({ from: '/pnrr' })
  const search = useSearch({ from: '/pnrr' }) as PnrrSearchState
  const location = useLocation()

  useEffect(() => {
    if (location.pathname !== '/pnrr') return
    if (!location.searchStr) return

    const canonicalSearch = parsePnrrSearchString(location.searchStr)
    if (hasCanonicalSearchParams(location.searchStr, canonicalSearch)) return

    navigate({
      search: canonicalSearch,
      replace: true,
      resetScroll: false,
    })
  }, [location.pathname, location.searchStr, navigate])

  const updateSearch = useCallback(
    (partial: Partial<PnrrSearchState>) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch(
            clearMapViewport({
              ...(prev as Partial<PnrrSearchState>),
              ...partial,
              page: 1,
              beneficiaryPage: 1,
            }),
          ),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate]
  )

  const updatePanelSearch = useCallback(
    (partial: Partial<PnrrSearchState>) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...clearPanelSearch(prev as Partial<PnrrSearchState>),
            ...partial,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
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
            ...clearPanelSearch(prev as Partial<PnrrSearchState>),
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
            ...clearPanelSearch(prev as Partial<PnrrSearchState>),
            view,
            uatSiruta: uat.siruta,
            uatSirutas: undefined,
            page: 1,
            beneficiaryPage: 1,
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
      updateSearch({ uatSiruta: value?.siruta, uatSirutas: undefined }),
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
    (sortBy: PnrrSearchState['sortBy'], sortOrder: PnrrSearchState['sortOrder']) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...(prev as Partial<PnrrSearchState>),
            sortBy,
            sortOrder,
            page: 1,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )

  const setBeneficiarySorting = useCallback(
    (
      beneficiarySortBy: PnrrSearchState['beneficiarySortBy'],
      beneficiarySortOrder: PnrrSearchState['beneficiarySortOrder'],
    ) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...(prev as Partial<PnrrSearchState>),
            beneficiarySortBy,
            beneficiarySortOrder,
            beneficiaryPage: 1,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
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

  const setBeneficiaryPagination = useCallback(
    (beneficiaryPage: number) => {
      navigate({
        search: (prev) =>
          cleanPnrrSearch({
            ...(prev as Partial<PnrrSearchState>),
            beneficiaryPage,
          }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
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

  const openProjectPanel = useCallback(
    (projectId: string) => {
      navigate({
        search: (prev) => {
          const previous = prev as Partial<PnrrSearchState>
          const isNestedMapPanel =
            (previous.panel === 'map-county' && previous.panelCountyCode) ||
            (previous.panel === 'map-uat' && previous.panelUatSiruta)

          if (isNestedMapPanel) {
            return cleanPnrrSearch({
              ...previous,
              panelProjectId: projectId,
            })
          }

          return cleanPnrrSearch({
            ...clearPanelSearch(previous),
            panel: 'project',
            panelProjectId: projectId,
          })
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )

  const openBeneficiaryPanel = useCallback(
    (beneficiary: { readonly name: string; readonly cui: string | null }) => {
      if (!beneficiary.cui) return

      updatePanelSearch({
        panel: 'beneficiary',
        panelBeneficiaryCui: beneficiary.cui,
      })
    },
    [updatePanelSearch],
  )

  const openMapCountyPanel = useCallback(
    (countyCode: string) => {
      updatePanelSearch({
        panel: 'map-county',
        panelCountyCode: countyCode,
      })
    },
    [updatePanelSearch],
  )

  const openMapUatPanel = useCallback(
    (uat: { readonly siruta: string }) => {
      updatePanelSearch({
        panel: 'map-uat',
        panelUatSiruta: uat.siruta,
      })
    },
    [updatePanelSearch],
  )

  const openAnomalyInfoPanel = useCallback(
    (signal?: AnomalyPanelSignal) => {
      updatePanelSearch({
        panel: 'anomaly-info',
        panelSignalKind: signal?.kind,
        panelSignalType: signal?.type,
      })
    },
    [updatePanelSearch],
  )

  const closePanel = useCallback(() => {
    navigate({
      search: (prev) =>
        cleanPnrrSearch(clearPanelSearch(prev as Partial<PnrrSearchState>)),
      replace: true,
      resetScroll: false,
    })
  }, [navigate])

  const closeProjectPanel = useCallback(() => {
    navigate({
      search: (prev) => {
        const previous = prev as Partial<PnrrSearchState>

        if (previous.panel === 'project') {
          return cleanPnrrSearch(clearPanelSearch(previous))
        }

        const next = { ...previous }
        delete next.panelProjectId
        return cleanPnrrSearch(next)
      },
      replace: true,
      resetScroll: false,
    })
  }, [navigate])

  const clearFilters = useCallback(() => {
    navigate({
      search: (prev) => {
        const previous = prev as Partial<PnrrSearchState>

        return cleanPnrrSearch({
          ...getPanelSearch(previous),
          view: search.view,
          currency: search.currency,
          page: 1,
          pageSize: previous.pageSize,
        })
      },
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
    setBeneficiarySorting,
    setPagination,
    setBeneficiaryPagination,
    setMapView,
    openProjectPanel,
    openBeneficiaryPanel,
    openMapCountyPanel,
    openMapUatPanel,
    openAnomalyInfoPanel,
    closePanel,
    closeProjectPanel,
    clearFilters,
  }
}
