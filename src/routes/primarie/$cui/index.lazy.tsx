import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MapEntitySelection } from '@/features/advanced-map-analytics/types/map-entity-selection'
import {
  ChallengeEntityAnalysisPage,
  type ChallengeEntityAnalysisPageState,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-page'
import type { ChallengeEntityInitialSettings } from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import type { BudgetItemAnalyticsSearchState } from '@/features/challenges/components/analysis/budget-item-analytics-search-state'
import {
  CHALLENGE_ENTITY_ANALYSIS_INS_SEARCH_KEYS,
  encodeChallengeEntityAnalyticsSearchState,
  type ChallengeEntityAnalysisRouteSearch,
  type ChallengeEntityAnalysisUrlState,
  buildChallengeEntityAnalysisCanonicalSearchPatch,
  encodeChallengeTreemapPath,
  normalizeChallengeEntityAnalysisSearch,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'

export const Route = createLazyFileRoute('/primarie/$cui/')({
  component: PrimarieEntityRoutePage,
})

function mergeWindowManagedSearchState(
  previousSearch: Record<string, unknown>,
): Record<string, unknown> {
  const nextSearch = { ...previousSearch }

  if (typeof window === 'undefined') {
    return nextSearch
  }

  const currentSearchParams = new URLSearchParams(window.location.search)

  for (const searchKey of CHALLENGE_ENTITY_ANALYSIS_INS_SEARCH_KEYS) {
    const searchValue = currentSearchParams.get(searchKey)

    if (searchValue === null) {
      continue
    }

    nextSearch[searchKey] = searchValue
  }

  return nextSearch
}

function applySearchPatch(
  previousSearch: Record<string, unknown>,
  patch: Partial<ChallengeEntityAnalysisRouteSearch>,
) {
  const nextSearch = mergeWindowManagedSearchState(previousSearch) as Record<
    string,
    unknown
  >

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete nextSearch[key]
      continue
    }

    nextSearch[key] = value
  }

  return nextSearch
}

function isSearchPatchEmpty(
  patch: Partial<ChallengeEntityAnalysisRouteSearch>,
): boolean {
  return Object.keys(patch).length === 0
}

function toPageState(
  searchState: ChallengeEntityAnalysisUrlState,
): ChallengeEntityAnalysisPageState {
  return {
    periodType: searchState.period,
    selectedYear: searchState.year,
    quarter: searchState.quarter,
    month: searchState.month,
    reportType: searchState.report_type,
    mainCreditorCui: searchState.main_creditor_cui,
    normalization: searchState.normalization,
    activeView: searchState.view,
    treemapAccountCategory: searchState.treemap_account,
    expenseType: searchState.expense_type,
    treemapPrimary: searchState.treemap_primary,
    treemapDepth: searchState.treemap_depth,
    treemapPath: searchState.treemap_path?.split(',').filter(Boolean) ?? [],
    evolutionAccountCategory: searchState.evolution_account,
    evolutionPrimary: searchState.evolution_primary,
    mapPreviewKey: searchState.public_map,
  }
}

function normalizeSelectionText(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : undefined
}

function formatCityHallLabel(entityName: string, language: 'ro' | 'en'): string {
  const trimmedEntityName = entityName.trim()

  if (!trimmedEntityName) {
    return language === 'en' ? 'Selected city hall' : 'Primăria selectată'
  }

  const lowerEntityName = trimmedEntityName.toLowerCase()
  const hasRomanianPrefix =
    lowerEntityName.startsWith('primăria ') ||
    lowerEntityName.startsWith('primaria ')
  const hasEnglishPrefix = lowerEntityName.startsWith('city hall ')

  if (language === 'en') {
    if (hasEnglishPrefix) {
      return trimmedEntityName
    }

    if (hasRomanianPrefix) {
      const strippedEntityName = lowerEntityName.startsWith('primăria ')
        ? trimmedEntityName.slice('primăria '.length)
        : trimmedEntityName.slice('primaria '.length)

      return `City Hall ${strippedEntityName}`
    }

    return `City Hall ${trimmedEntityName}`
  }

  if (lowerEntityName.startsWith('primăria ')) {
    return trimmedEntityName
  }

  if (lowerEntityName.startsWith('primaria ')) {
    return `Primăria ${trimmedEntityName.slice('primaria '.length)}`
  }

  if (hasEnglishPrefix) {
    return `Primăria ${trimmedEntityName.slice('city hall '.length)}`
  }

  return `Primăria ${trimmedEntityName}`
}

export function PrimarieEntityRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | {
      initialSettings?: ChallengeEntityInitialSettings
    }
    | undefined
  const navigate = useNavigate({
    from: '/primarie/$cui',
  })
  const [pendingMapEntitySelection, setPendingMapEntitySelection] =
    useState<MapEntitySelection | null>(null)
  const [isConfirmingMapEntitySelection, setIsConfirmingMapEntitySelection] =
    useState(false)

  const normalizedSearch = useMemo(
    () =>
      normalizeChallengeEntityAnalysisSearch(
        search as ChallengeEntityAnalysisRouteSearch,
      ),
    [search],
  )
  const pageState = useMemo(
    () => toPageState(normalizedSearch),
    [normalizedSearch],
  )

  useEffect(() => {
    setPendingMapEntitySelection(null)
    setIsConfirmingMapEntitySelection(false)
  }, [cui])

  useEffect(() => {
    const canonicalPatch = buildChallengeEntityAnalysisCanonicalSearchPatch(
      search as ChallengeEntityAnalysisRouteSearch,
      normalizedSearch,
    )

    if (isSearchPatchEmpty(canonicalPatch)) {
      return
    }

    void navigate({
      search: (previousSearch) =>
        applySearchPatch(
          previousSearch as Record<string, unknown>,
          canonicalPatch,
        ),
      replace: true,
    })
  }, [navigate, normalizedSearch, search])

  const updateSearch = useCallback(
    (
      patch: Partial<ChallengeEntityAnalysisRouteSearch>,
      options?: {
        readonly replace?: boolean
        readonly resetScroll?: boolean
      },
    ) => {
      if (isSearchPatchEmpty(patch)) {
        return
      }

      startTransition(() => {
        void navigate({
          search: (previousSearch) =>
            applySearchPatch(
              previousSearch as Record<string, unknown>,
              patch,
            ),
          replace: options?.replace ?? true,
          resetScroll: options?.resetScroll ?? false,
        })
      })
    },
    [navigate],
  )

  const handleStateChange = useCallback(
    (patch: Partial<ChallengeEntityAnalysisPageState>) => {
      const searchPatch: Partial<ChallengeEntityAnalysisRouteSearch> = {}

      if (patch.selectedYear !== undefined) {
        searchPatch.year = patch.selectedYear
      }

      if (patch.periodType !== undefined) {
        searchPatch.period = patch.periodType
      }

      if (patch.month !== undefined) {
        searchPatch.month = patch.month
      }

      if (patch.quarter !== undefined) {
        searchPatch.quarter = patch.quarter
      }

      if (patch.reportType !== undefined) {
        searchPatch.report_type = patch.reportType
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'mainCreditorCui')) {
        searchPatch.main_creditor_cui = patch.mainCreditorCui
      }

      if (patch.normalization !== undefined) {
        searchPatch.normalization = patch.normalization
      }

      if (patch.activeView !== undefined) {
        searchPatch.view = patch.activeView
      }

      if (patch.treemapAccountCategory !== undefined) {
        searchPatch.treemap_account = patch.treemapAccountCategory
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'expenseType')) {
        searchPatch.expense_type = patch.expenseType
      }

      if (patch.treemapPrimary !== undefined) {
        searchPatch.treemap_primary = patch.treemapPrimary
      }

      if (patch.treemapDepth !== undefined) {
        searchPatch.treemap_depth = patch.treemapDepth
      }

      if (patch.treemapPath !== undefined) {
        searchPatch.treemap_path = encodeChallengeTreemapPath(patch.treemapPath)
      } else if (patch.treemapDepth !== undefined) {
        searchPatch.treemap_path = undefined
      }

      if (patch.evolutionAccountCategory !== undefined) {
        searchPatch.evolution_account = patch.evolutionAccountCategory
      }

      if (patch.evolutionPrimary !== undefined) {
        searchPatch.evolution_primary = patch.evolutionPrimary
      }

      if (patch.mapPreviewKey !== undefined) {
        searchPatch.public_map = patch.mapPreviewKey
      }

      const nextNormalizedState = normalizeChallengeEntityAnalysisSearch({
        ...(search as ChallengeEntityAnalysisRouteSearch),
        ...searchPatch,
      })

      updateSearch(
        buildChallengeEntityAnalysisCanonicalSearchPatch(
          search as ChallengeEntityAnalysisRouteSearch,
          nextNormalizedState,
        ),
        patch.activeView !== undefined
          ? {
              replace: false,
              resetScroll: true,
            }
          : undefined,
      )
    },
    [search, updateSearch],
  )

  const handleCommitmentsViewStateChange = useCallback(
    (
      grouping: 'fn' | 'ec',
      detailLevel: 'chapter' | 'detailed',
    ) => {
      updateSearch({
        commitments_grouping: grouping,
        commitments_detail_level: detailLevel,
      })
    },
    [updateSearch],
  )

  const handleConfirmMapEntitySelection = useCallback(() => {
    if (!pendingMapEntitySelection) {
      return
    }

    setIsConfirmingMapEntitySelection(true)

    startTransition(() => {
      void Promise.resolve()
        .then(() =>
          navigate({
            to: '/primarie/$cui',
            params: { cui: pendingMapEntitySelection.entityCui },
            search: (previousSearch) =>
              mergeWindowManagedSearchState(
                previousSearch as Record<string, unknown>,
              ),
            replace: false,
            resetScroll: false,
          }),
        )
        .finally(() => {
        setPendingMapEntitySelection(null)
        setIsConfirmingMapEntitySelection(false)
        })
    })
  }, [navigate, pendingMapEntitySelection])

  const handleMapEntitySelection = useCallback(
    (selection: MapEntitySelection) => {
      setPendingMapEntitySelection(selection)
    },
    [],
  )

  const handleAnalyticsTargetChange = useCallback(
    (target: BudgetItemAnalyticsSearchState | null) => {
      updateSearch({
        analytics: encodeChallengeEntityAnalyticsSearchState(target),
      })
    },
    [updateSearch],
  )

  const dialogLanguage = normalizedSearch.lang === 'en' ? 'en' : 'ro'
  const selectedEntityName = normalizeSelectionText(
    pendingMapEntitySelection?.entityName,
  )
  const selectedCountyName = normalizeSelectionText(
    pendingMapEntitySelection?.countyName,
  )
  const selectedCityHallLabel = selectedEntityName
    ? formatCityHallLabel(selectedEntityName, dialogLanguage)
    : dialogLanguage === 'en'
      ? 'Selected city hall'
      : 'Primăria selectată'
  const confirmationTitle =
    dialogLanguage === 'en'
      ? 'Switch to a different city hall?'
      : 'Schimbi primăria?'
  const confirmationDescription =
    dialogLanguage === 'en'
      ? 'Your current filters and view will be kept.'
      : 'Filtrele și vizualizarea curentă rămân la fel.'
  const confirmationButtonLabel =
    dialogLanguage === 'en' ? 'Open analysis' : 'Deschide analiza'
  const cancelButtonLabel =
    dialogLanguage === 'en' ? 'Cancel' : 'Anulează'

  return (
    <>
      <ChallengeEntityAnalysisPage
        entityCui={cui}
        languageQuery={normalizedSearch.lang}
        state={pageState}
        commitmentsGrouping={normalizedSearch.commitments_grouping}
        commitmentsDetailLevel={normalizedSearch.commitments_detail_level}
        analyticsTarget={normalizedSearch.analytics}
        initialSettings={loaderData?.initialSettings}
        onStateChange={handleStateChange}
        onCommitmentsViewStateChange={handleCommitmentsViewStateChange}
        onAnalyticsTargetChange={handleAnalyticsTargetChange}
        onEntityCuiChange={handleMapEntitySelection}
      />

      <Dialog
        open={Boolean(pendingMapEntitySelection)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isConfirmingMapEntitySelection) {
            setPendingMapEntitySelection(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmationTitle}</DialogTitle>
            <DialogDescription>
              {confirmationDescription}
            </DialogDescription>
          </DialogHeader>

          {pendingMapEntitySelection ? (
            <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {selectedCityHallLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {[selectedCountyName, `CUI ${pendingMapEntitySelection.entityCui}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingMapEntitySelection(null)}
              disabled={isConfirmingMapEntitySelection}
            >
              {cancelButtonLabel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmMapEntitySelection}
              disabled={
                !pendingMapEntitySelection || isConfirmingMapEntitySelection
              }
            >
              {confirmationButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
