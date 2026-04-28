import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { CampaignAccessShareCard } from '@/features/campaigns/buget/components/CampaignAccessShareCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { EntitySearchSchema } from '@/components/entities/validation'
import type { MapEntitySelection } from '@/features/advanced-map-analytics/types/map-entity-selection'
import {
  ChallengeEntityAnalysisPage,
  type ChallengeEntityAnalysisPageState,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-page'
import type { ChallengeEntityInitialSettings } from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import type { BudgetItemAnalyticsSearchState } from '@/features/challenges/components/analysis/budget-item-analytics-search-state'
import {
  CHALLENGE_ENTITY_ANALYSIS_INS_SEARCH_KEYS,
  buildChallengeEntityAnalysisCanonicalSearchPatch,
  encodeChallengeEntityAnalyticsSearchState,
  encodeChallengeTreemapPath,
  normalizeChallengeEntityAnalysisSearch,
  type ChallengeEntityAnalysisRouteSearch,
  type ChallengeEntityAnalysisUrlState,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import type { EntityPageLoaderPayload } from '@/features/entities/page-core'
import { normalizeEntitiesEntityRouteView } from '@/features/entities/page-core/route-adapters/entities-entity-route-adapter'
import {
  hasForcedOverrides,
  type ForcedOverrides,
} from '@/lib/globalSettings/params'
import { toExecutionReportType, type GqlReportType } from '@/schemas/reporting'

export const Route = createLazyFileRoute('/entities/$cui')({
  component: EntityDetailsRoutePage,
})

type EntitiesEntityRouteLoaderData = {
  readonly initialSettings?: ChallengeEntityInitialSettings
  readonly ssrSettings?: ChallengeEntityInitialSettings
  readonly forcedOverrides?: ForcedOverrides
  readonly entityPageBootstrap?: {
    readonly loaderPayload?: Pick<
      EntityPageLoaderPayload,
      | 'entitySeoSnapshot'
      | 'ssrEntityDetailsParams'
      | 'ssrEntityExecutionLineItemsParams'
    >
  }
}

function mapEntitiesReportTypeToChallengeReportType(
  reportType: GqlReportType | undefined,
): ChallengeEntityAnalysisRouteSearch['report_type'] {
  return toExecutionReportType(reportType)
}

function mapEntitiesNormalizationToChallengeNormalization(
  normalization: EntitySearchSchema['normalization'],
): ChallengeEntityAnalysisUrlState['normalization'] {
  return normalization === 'per_capita' || normalization === 'per_capita_euro'
    ? 'per_capita'
    : 'total'
}

function mapEntitiesCurrencyToChallengeCurrency(
  search: EntitySearchSchema | undefined,
): ChallengeEntityAnalysisRouteSearch['currency'] {
  if (
    search?.normalization === 'total_euro' ||
    search?.normalization === 'per_capita_euro'
  ) {
    return 'EUR'
  }

  return search?.currency
}

function getLegacyEuroForcedSettings(
  search: EntitySearchSchema | undefined,
): ForcedOverrides | undefined {
  return (
    search?.normalization === 'total_euro' ||
    search?.normalization === 'per_capita_euro'
  )
    ? { currency: 'EUR' }
    : undefined
}

function toChallengeRouteSearch(
  search: EntitySearchSchema | undefined,
): ChallengeEntityAnalysisRouteSearch {
  return {
    lang: search?.lang,
    period: search?.period,
    year: search?.year,
    month: search?.month,
    quarter: search?.quarter,
    report_type: mapEntitiesReportTypeToChallengeReportType(search?.report_type),
    main_creditor_cui: search?.main_creditor_cui,
    normalization: mapEntitiesNormalizationToChallengeNormalization(
      search?.normalization,
    ),
    view: normalizeEntitiesEntityRouteView(search?.view),
    treemap_account: search?.treemap_account ?? search?.accountCategory,
    expense_type: search?.expense_type,
    treemap_primary: search?.treemap_primary ?? search?.treemapPrimary,
    treemap_depth: search?.treemap_depth,
    treemap_path: search?.treemap_path ?? search?.treemapPath,
    evolution_account: search?.evolution_account,
    evolution_primary: search?.evolution_primary,
    public_map: search?.public_map,
    notificationModal: search?.notificationModal,
    analytics: search?.analytics as ChallengeEntityAnalysisRouteSearch['analytics'],
    commitments_grouping:
      search?.commitments_grouping ?? search?.commitmentsGrouping,
    commitments_detail_level:
      search?.commitments_detail_level ?? search?.commitmentsDetailLevel,
    currency: mapEntitiesCurrencyToChallengeCurrency(search),
    inflation_adjusted: search?.inflation_adjusted,
    show_period_growth: search?.show_period_growth,
    insDataset: search?.insDataset,
    insSearch: search?.insSearch,
    insRoot: search?.insRoot,
    insTemporal: search?.insTemporal,
    insExplorer: search?.insExplorer,
    insSeries: search?.insSeries,
    insUnit: search?.insUnit,
  }
}

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
    showPeriodGrowth: searchState.show_period_growth,
  }
}

function normalizeSelectionText(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : undefined
}

export function EntityDetailsRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch() as EntitySearchSchema
  const loaderData = Route.useLoaderData() as
    | EntitiesEntityRouteLoaderData
    | undefined
  const navigate = useNavigate({
    from: '/entities/$cui',
  })
  const [pendingMapEntitySelection, setPendingMapEntitySelection] =
    useState<MapEntitySelection | null>(null)
  const [isConfirmingMapEntitySelection, setIsConfirmingMapEntitySelection] =
    useState(false)

  const challengeSearch = useMemo(
    () => toChallengeRouteSearch(search),
    [search],
  )
  const normalizedSearch = useMemo(
    () => normalizeChallengeEntityAnalysisSearch(challengeSearch),
    [challengeSearch],
  )
  const hasExplicitReportType = search?.report_type !== undefined
  const pageState = useMemo(
    () => toPageState(normalizedSearch),
    [normalizedSearch],
  )
  const searchInitialSettings = useMemo<ChallengeEntityInitialSettings | undefined>(
    () => {
      if (
        challengeSearch.currency === undefined &&
        challengeSearch.inflation_adjusted === undefined
      ) {
        return undefined
      }

      return {
        currency: challengeSearch.currency ?? 'RON',
        inflationAdjusted: challengeSearch.inflation_adjusted ?? false,
      }
    },
    [challengeSearch.currency, challengeSearch.inflation_adjusted],
  )

  useEffect(() => {
    setPendingMapEntitySelection(null)
    setIsConfirmingMapEntitySelection(false)
  }, [cui])

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
      } else if (
        search?.report_type !== undefined &&
        search.report_type !== challengeSearch.report_type
      ) {
        searchPatch.report_type = challengeSearch.report_type
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'mainCreditorCui')) {
        searchPatch.main_creditor_cui = patch.mainCreditorCui
      }

      if (patch.normalization !== undefined) {
        searchPatch.normalization = patch.normalization
      } else if (
        search?.normalization !== undefined &&
        search.normalization !== challengeSearch.normalization
      ) {
        searchPatch.normalization = challengeSearch.normalization
      }

      if (patch.activeView !== undefined) {
        searchPatch.view = patch.activeView
      } else if (
        search?.view !== undefined &&
        search.view !== challengeSearch.view
      ) {
        searchPatch.view = challengeSearch.view
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
        ...challengeSearch,
        ...searchPatch,
      })
      const canonicalSearchPatch =
        buildChallengeEntityAnalysisCanonicalSearchPatch(
          challengeSearch,
          nextNormalizedState,
        )

      if (
        !hasExplicitReportType &&
        searchPatch.report_type === undefined
      ) {
        canonicalSearchPatch.report_type = undefined
      }

      if (
        searchPatch.view !== undefined &&
        search?.view !== searchPatch.view
      ) {
        canonicalSearchPatch.view = searchPatch.view
      }
      if (
        searchPatch.report_type !== undefined &&
        search?.report_type !== searchPatch.report_type
      ) {
        canonicalSearchPatch.report_type = searchPatch.report_type
      }
      if (
        searchPatch.normalization !== undefined &&
        search?.normalization !== searchPatch.normalization
      ) {
        canonicalSearchPatch.normalization = searchPatch.normalization
      }
      if (
        challengeSearch.currency !== undefined &&
        search?.currency !== challengeSearch.currency
      ) {
        canonicalSearchPatch.currency = challengeSearch.currency
      }

      updateSearch(
        canonicalSearchPatch,
        patch.activeView !== undefined
          ? {
              replace: false,
              resetScroll: true,
            }
          : undefined,
      )
    },
    [
      challengeSearch,
      hasExplicitReportType,
      search?.currency,
      search?.normalization,
      search?.report_type,
      search?.view,
      updateSearch,
    ],
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
            to: '/entities/$cui',
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
  const initialSettings =
    loaderData?.initialSettings ??
    loaderData?.ssrSettings ??
    searchInitialSettings
  const forcedSettings = hasForcedOverrides(loaderData?.forcedOverrides)
    ? loaderData.forcedOverrides
    : getLegacyEuroForcedSettings(search)
  const ssrLoaderPayload = loaderData?.entityPageBootstrap?.loaderPayload
  const selectedEntityName = normalizeSelectionText(
    pendingMapEntitySelection?.entityName,
  )
  const selectedCountyName = normalizeSelectionText(
    pendingMapEntitySelection?.countyName,
  )
  const selectedEntityLabel =
    selectedEntityName ??
    (dialogLanguage === 'en' ? 'Selected entity' : 'Entitatea selectată')
  const confirmationTitle =
    dialogLanguage === 'en'
      ? 'Switch to a different entity?'
      : 'Schimbi entitatea?'
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
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <ChallengeEntityAnalysisPage
          entityCui={cui}
          languageQuery={normalizedSearch.lang}
          pageVariant="entities"
          hasExplicitReportType={hasExplicitReportType}
          state={pageState}
          commitmentsGrouping={normalizedSearch.commitments_grouping}
          commitmentsDetailLevel={normalizedSearch.commitments_detail_level}
          analyticsTarget={normalizedSearch.analytics}
          initialSettings={initialSettings}
          forcedSettings={forcedSettings}
          ssrLoaderPayload={ssrLoaderPayload}
          onStateChange={handleStateChange}
          onCommitmentsViewStateChange={handleCommitmentsViewStateChange}
          onAnalyticsTargetChange={handleAnalyticsTargetChange}
          onEntityCuiChange={handleMapEntitySelection}
          belowHeader={({ isUatEntity }) =>
            isUatEntity ? (
              <CampaignAccessShareCard entityCui={cui} locale={dialogLanguage} />
            ) : null
          }
        />
      </div>

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
                {selectedEntityLabel}
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
