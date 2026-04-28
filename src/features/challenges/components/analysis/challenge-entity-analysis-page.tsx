import { t } from '@lingui/core/macro'
import { AlertTriangle, Minus, Plus, RefreshCw, Users } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import { FilteredSpendingInfo } from '@/components/budget-explorer/FilteredSpendingInfo'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import type { TreemapInput } from '@/components/budget-explorer/budget-transform'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import {
  filterTreemapNodesByAmountRange,
  getTreemapValueBounds,
  hasModifiedTreemapAmountRange,
} from '@/components/budget-explorer/treemap-visible-nodes'
import { getEntityFeatureInfo } from '@/components/entities/utils'
import { EntityFinancialSummary, type EntityFinancialSummaryTrend } from '@/components/entities/EntityFinancialSummary'
import { EntityFinancialTrends } from '@/components/entities/EntityFinancialTrends'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'
import { useEntityTypeLabel } from '@/hooks/filters/useFilterLabels'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { usePeriodLabel } from '@/hooks/use-period-label'
import { useRecentEntities } from '@/hooks/useRecentEntities'
import {
  DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
  DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES,
} from '@/lib/analytics-defaults'
import type { EntityPageLoaderPayload } from '@/features/entities/page-core'
import type {
  EntityDetailsData,
  ExecutionLineItem,
  FundingSourceOption,
} from '@/lib/api/entities'
import { DEFAULT_CURRENCY, DEFAULT_INFLATION_ADJUSTED } from '@/lib/globalSettings/params'
import { useGlobalSettings } from '@/lib/hooks/useGlobalSettings'
import {
  entityDetailsQueryOptions,
  entityExecutionLineItemsQueryOptions,
  useEntityDetails,
  useEntityExecutionLineItems,
  useEntityRelationships,
  reportsConnectionQueryOptions,
} from '@/lib/hooks/useEntityDetails'
import type { NormalizationOptions } from '@/lib/normalization'
import { getReportDateRange } from '@/lib/period-utils'
import { defaultYearRange } from '@/schemas/charts'
import {
  type GqlReportType,
  type ReportPeriodInput,
  type ReportPeriodType,
  type TMonth,
  type TQuarter,
  toReportTypeValue,
  toCommitmentReportType,
  toExecutionReportType,
} from '@/schemas/reporting'
import type { ChallengeLocale } from '../../types'
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport'
import { areMapCentersEqual } from '@/features/advanced-map-analytics/map-viewport-utils'
import type { MapEntitySelection } from '@/features/advanced-map-analytics/types/map-entity-selection'
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics'
import { ChallengeEntityAnalysisLoadingShell } from './challenge-entity-analysis-loading-shell'
import { ChallengeEntityAnalysisExplainer } from './challenge-entity-analysis-explainer'
import { ChallengeCommitmentsExplainer } from './challenge-commitments-explainer'
import { ChallengeEntityFaqSection } from './challenge-entity-faq-section'
import { ChallengeEntityViewNavigator } from './challenge-entity-view-navigator'
import { ChallengeEntityAnalysisHeader } from './challenge-entity-analysis-header'
import {
  buildChallengeEntityAnalysisReportPeriod,
  buildChallengeEntityAnalysisTrendPeriod,
  challengeEntitySubordinateRankingQueryOptions,
  type ChallengeEntityForcedSettings,
  type ChallengeEntityInitialSettings,
} from './challenge-entity-analysis-queries'
import {
  ChallengeEntityReportControls,
  type ChallengeEntityMainCreditorOption,
} from './challenge-entity-report-controls'
import { ChallengeEntityGroupedLineItems } from './challenge-entity-grouped-line-items'
import {
  type ChallengeEntityMarkdownExportPageContext,
} from './challenge-entity-markdown-export'
import type { BudgetItemAnalyticsProps } from './budget-item-analytics-context'
import {
  buildBudgetItemAnalyticsPath,
  getBudgetItemAnalyticsSelection,
  type BudgetItemAnalyticsRequest,
} from './budget-item-analytics-target'
import {
  getDefaultBudgetItemAnalyticsViewState,
  type BudgetItemAnalyticsSearchState,
} from './budget-item-analytics-search-state'
import type { ChallengeEntityViewOption } from './challenge-entity-view-menu'
import {
  CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS,
  getChallengeEntityMapPreviewDefinition,
  type ChallengeEntityMapPreviewKey,
} from './challenge-entity-public-maps'
import {
  ChallengeEntitySubordinatesSection,
  type ChallengeEntitySubordinateCardItem,
} from './challenge-entity-subordinates-section'
import { DeferredSectionGate } from './challenge-entity-deferred-section-gate'
import {
  CHALLENGE_ENTITY_ANALYSIS_EXPENSE_TYPE_VALUES,
  ChallengeEntityAnalysisCommitmentsDetailLevel,
  ChallengeEntityAnalysisCommitmentsGrouping,
  ChallengeEntityAnalysisExpenseType,
  ChallengeEntityAnalysisTreemapDepth,
  ChallengeEntityAnalysisView,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'

type ChallengeEntityAnalysisPageProps = {
  readonly entityCui: string
  readonly languageQuery?: ChallengeLocale
  readonly pageVariant?: 'primarie' | 'entities'
  readonly hasExplicitReportType?: boolean
  readonly state: ChallengeEntityAnalysisPageState
  readonly commitmentsGrouping?: ChallengeEntityAnalysisCommitmentsGrouping
  readonly commitmentsDetailLevel?: ChallengeEntityAnalysisCommitmentsDetailLevel
  readonly analyticsTarget?: BudgetItemAnalyticsSearchState
  readonly initialSettings?: ChallengeEntityInitialSettings
  readonly forcedSettings?: ChallengeEntityForcedSettings
  readonly ssrLoaderPayload?: Pick<
    EntityPageLoaderPayload,
    'ssrEntityDetailsParams' | 'ssrEntityExecutionLineItemsParams'
  > &
    Partial<Pick<EntityPageLoaderPayload, 'entitySeoSnapshot'>>
  readonly ssrEntityDetailsParams?: Parameters<typeof entityDetailsQueryOptions>[0]
  readonly ssrEntityExecutionLineItemsParams?: Parameters<
    typeof entityExecutionLineItemsQueryOptions
  >[0]
  readonly onStateChange: (
    patch: Partial<ChallengeEntityAnalysisPageState>,
  ) => void
  readonly onCommitmentsViewStateChange?: (
    grouping: ChallengeEntityAnalysisCommitmentsGrouping,
    detailLevel: ChallengeEntityAnalysisCommitmentsDetailLevel,
  ) => void
  readonly onAnalyticsTargetChange?: (
    target: BudgetItemAnalyticsSearchState | null,
  ) => void
  readonly onEntityCuiChange?: (selection: MapEntitySelection) => void
  readonly onEntityResolved?: () => void
  readonly belowHeader?:
    | ReactNode
    | ((context: {
        readonly entity: EntityDetailsData
        readonly isUatEntity: boolean
        readonly locale: 'ro' | 'en'
      }) => ReactNode)
}

type EntityExecutionLineItemsData = {
  readonly nodes: ExecutionLineItem[]
  readonly fundingSources: FundingSourceOption[]
}

export type ChallengeTreemapAccountCategory = 'ch' | 'vn'
export type ChallengeEntityReportType = Extract<
  GqlReportType,
  'PRINCIPAL_AGGREGATED' | 'SECONDARY_AGGREGATED' | 'DETAILED'
>
type ChallengeEntityAggregateReportType = Exclude<
  ChallengeEntityReportType,
  'DETAILED'
>
type ResolvedEntityDefaultReportType = {
  readonly entityCui: string
  readonly reportType: ChallengeEntityReportType
}
export type ChallengeEntityAnalysisPageState = {
  readonly periodType: ReportPeriodType
  readonly selectedYear: number
  readonly quarter: TQuarter
  readonly month: TMonth
  readonly reportType: ChallengeEntityReportType
  readonly mainCreditorCui?: string
  readonly normalization: 'total' | 'per_capita'
  readonly activeView: ChallengeEntityAnalysisView
  readonly treemapAccountCategory: ChallengeTreemapAccountCategory
  readonly expenseType?: ChallengeEntityAnalysisExpenseType
  readonly treemapPrimary: 'fn' | 'ec'
  readonly treemapDepth: ChallengeEntityAnalysisTreemapDepth
  readonly treemapPath: readonly string[]
  readonly evolutionAccountCategory: ChallengeTreemapAccountCategory
  readonly evolutionPrimary: 'fn' | 'ec'
  readonly mapPreviewKey: ChallengeEntityMapPreviewKey
  readonly showPeriodGrowth?: boolean
}

const CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH = ['51', '51.01', '51.01.03'] as const
const CHALLENGE_ADMINISTRATIVE_EXPENSE_SEARCH_TERM =
  `fn:${CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH[CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH.length - 1]}` as const
const CHALLENGE_SHOW_PERIOD_GROWTH = false
const CHALLENGE_AVAILABLE_YEARS = Array.from(
  { length: defaultYearRange.end - defaultYearRange.start + 1 },
  (_, index) => defaultYearRange.end - index,
)
const CHALLENGE_ENTITY_EXPENSE_TYPE_ORDER = [
  undefined,
  ...CHALLENGE_ENTITY_ANALYSIS_EXPENSE_TYPE_VALUES,
] as const satisfies readonly (ChallengeEntityAnalysisExpenseType | undefined)[]
const DEFAULT_TREEMAP_FILTER_STATE = {
  reportType: 'PRINCIPAL_AGGREGATED',
  normalization: 'total',
  treemapAccountCategory: 'ch',
  expenseType: undefined,
  treemapPrimary: 'fn',
  treemapDepth: 'chapter',
} as const satisfies Pick<
  ChallengeEntityAnalysisPageState,
  | 'reportType'
  | 'normalization'
  | 'treemapAccountCategory'
  | 'expenseType'
  | 'treemapPrimary'
  | 'treemapDepth'
>
const CHALLENGE_ENTITY_DETAILED_REPORT_TYPE = 'DETAILED' as const

function matchesSelectedExpenseType(
  lineItem: Pick<ExecutionLineItem, 'expense_type'>,
  expenseType: ChallengeEntityAnalysisExpenseType | undefined,
) {
  if (!expenseType) {
    return true
  }

  return lineItem.expense_type === expenseType
}

function loadMapAnalyticsPublicPreviewCard() {
  return import(
    '@/features/advanced-map-analytics/components/map-analytics-public-preview-card'
  )
}

function loadChallengeEntityCategoryEvolution() {
  return import('./challenge-entity-category-evolution')
}

function loadChallengeEntityReportsSection() {
  return import('./challenge-entity-reports-section')
}

function loadBudgetItemAnalyticsModal() {
  return import('./budget-item-analytics-modal')
}

function loadContractsView() {
  return import('@/components/entities/views/ContractsView')
}

function loadCommitmentsView() {
  return import('@/components/entities/views/Commitments')
}

function loadInsStatsView() {
  return import('@/components/entities/views/ins-stats-view')
}
function loadEntityProfileView() {
  return import('@/components/entities/views/entity-profile-view')
}

const DeferredMapAnalyticsPublicPreviewCard = lazy(() =>
  loadMapAnalyticsPublicPreviewCard().then((module) => ({
    default: module.MapAnalyticsPublicPreviewCard,
  })),
)
const DeferredChallengeEntityCategoryEvolution = lazy(() =>
  loadChallengeEntityCategoryEvolution().then((module) => ({
    default: module.ChallengeEntityCategoryEvolution,
  })),
)
const DeferredChallengeEntityReportsSection = lazy(() =>
  loadChallengeEntityReportsSection().then((module) => ({
    default: module.ChallengeEntityReportsSection,
  })),
)
const DeferredBudgetItemAnalyticsModal = lazy(() =>
  loadBudgetItemAnalyticsModal().then((module) => ({
    default: module.BudgetItemAnalyticsModal,
  })),
)
const DeferredContractsView = lazy(() =>
  loadContractsView().then((module) => ({
    default: module.ContractsView,
  })),
)
const DeferredCommitmentsView = lazy(() =>
  loadCommitmentsView().then((module) => ({
    default: module.CommitmentsView,
  })),
)
const DeferredInsStatsView = lazy(() =>
  loadInsStatsView().then((module) => ({
    default: module.InsStatsView,
  })),
)
const DeferredEntityProfileView = lazy(() =>
  loadEntityProfileView().then((module) => ({
    default: module.EntityProfileView,
  })),
)
const CHALLENGE_ENTITY_VIEW_LABELS = {
  ro: {
    'main-info': 'Execuții Bugetare',
    contracts: 'Contracte',
    commitments: 'Angajamente',
    ins: 'INS',
    profile: 'Contact',
  },
  en: {
    'main-info': 'Budget Execution',
    contracts: 'Contracts',
    commitments: 'Commitments',
    ins: 'INS',
    profile: 'Contact',
  },
} as const satisfies Record<'ro' | 'en', Record<ChallengeEntityAnalysisView, string>>

const MAP_PREVIEW_LABELS = {
  ro: {
    expenses: 'Cheltuieli',
    income: 'Venituri',
    balance: 'Balanță bugetară',
    'local-taxes': 'Taxe și impozite locale',
  },
  en: {
    expenses: 'Expenses',
    income: 'Revenue',
    balance: 'Budget balance',
    'local-taxes': 'Local taxes and fees',
  },
} as const satisfies Record<
  'ro' | 'en',
  Record<ChallengeEntityMapPreviewKey, string>
>

const MAP_PREVIEW_BASE_NAMES = {
  ro: {
    expenses: 'Cheltuieli UAT',
    income: 'Venituri UAT',
    balance: 'Balanță bugetară UAT',
    'local-taxes': 'Taxe și impozite locale UAT',
  },
  en: {
    expenses: 'Expenses by UAT',
    income: 'Revenue by UAT',
    balance: 'Budget Balance by UAT',
    'local-taxes': 'Local Taxes and Fees by UAT',
  },
} as const satisfies Record<
  'ro' | 'en',
  Record<ChallengeEntityMapPreviewKey, string>
>

const MAP_PREVIEW_SERIES_LABELS = {
  ro: {
    expenses: 'Cheltuieli',
    income: 'Venituri',
    'balance-income': 'Venituri',
    'balance-expenses': 'Cheltuieli',
    balance: 'Balanță bugetară',
    'local-taxes-property': 'Impozite și taxe pe proprietate',
    'local-taxes-goods-use': 'Taxe pe utilizarea bunurilor',
    'local-taxes': 'Taxe și impozite locale',
    'population-2021': 'Populație',
  },
  en: {
    expenses: 'Expenses',
    income: 'Revenue',
    'balance-income': 'Revenue',
    'balance-expenses': 'Expenses',
    balance: 'Budget balance',
    'local-taxes-property': 'Property taxes and fees',
    'local-taxes-goods-use': 'Taxes on goods use',
    'local-taxes': 'Local taxes and fees',
    'population-2021': 'Population',
  },
} as const

const MAP_PREVIEW_MISC_COPY = {
  ro: {
    populationUnit: 'loc.',
    noData: 'Fără date',
    showRevenue: 'Arată venituri',
    showSpending: 'Arată cheltuieli',
    showGroupedRevenue: 'Arată cum sunt grupate veniturile',
    showRevenueSources: 'Arată din ce au venit banii',
    showGroupedSpending: 'Arată cum s-au cheltuit banii',
    showSpendingUses: 'Arată pe ce s-au cheltuit banii',
    showAllSpending: 'Arată toate cheltuielile',
    showAdministrativeSpending: 'Arată cheltuieli administrative primărie',
    showEntityAdministrativeSpending: 'Arată cheltuieli administrative',
    revenueWithoutEconomicCode: 'Veniturile nu au cod economic.',
    showMapPreviewOptions: 'Arată opțiunile hărții',
    hideMapPreviewOptions: 'Ascunde opțiunile hărții',
    showExtraOptions: 'Arată opțiunile suplimentare',
    hideExtraOptions: 'Ascunde opțiunile suplimentare',
    resetFilters: 'Resetează filtrele',
    activeFiltersLabel: 'Filtre active',
    selectedPathLabel: 'Selecție',
    reportLabel: 'Raport',
    normalizationFilterLabel: 'Normalizare',
    expenseTypeLabel: 'Tip cheltuială',
    detailLevel: 'Nivel de detaliu',
    chapter: 'Capitol',
    subchapter: 'Subcapitol',
    paragraph: 'Paragraf',
    allExpenses: 'Toate',
    operationsExpenses: 'Operațiuni',
    developmentExpenses: 'Dezvoltare',
    spendingDistribution: 'Distribuția Cheltuielilor',
    revenueDistribution: 'Distribuția Veniturilor',
    spendingGrouped: 'Cum s-au cheltuit banii',
    spendingUses: 'Pe ce s-au cheltuit banii',
    revenueGrouped: 'Cum sunt grupate veniturile',
    revenueSources: 'Din ce au venit banii',
  },
  en: {
    populationUnit: 'inhabitants',
    noData: 'No data',
    showRevenue: 'Show revenue',
    showSpending: 'Show spending',
    showGroupedRevenue: 'Show how revenue is grouped',
    showRevenueSources: 'Show where the money came from',
    showGroupedSpending: 'Show how the money was spent',
    showSpendingUses: 'Show where the money was spent',
    showAllSpending: 'Show all spending',
    showAdministrativeSpending: 'Show city hall administrative spending',
    showEntityAdministrativeSpending: 'Show administrative spending',
    revenueWithoutEconomicCode: 'Revenue has no economic code.',
    showMapPreviewOptions: 'Show map preview options',
    hideMapPreviewOptions: 'Hide map preview options',
    showExtraOptions: 'Show extra options',
    hideExtraOptions: 'Hide extra options',
    resetFilters: 'Reset filters',
    activeFiltersLabel: 'Active filters',
    selectedPathLabel: 'Selected path',
    reportLabel: 'Report',
    normalizationFilterLabel: 'Normalization',
    expenseTypeLabel: 'Expense type',
    detailLevel: 'Detail level',
    chapter: 'Chapter',
    subchapter: 'Subchapter',
    paragraph: 'Paragraph',
    allExpenses: 'All',
    operationsExpenses: 'Operations',
    developmentExpenses: 'Development',
    spendingDistribution: 'Spending breakdown',
    revenueDistribution: 'Revenue breakdown',
    spendingGrouped: 'How the money was spent',
    spendingUses: 'Where the money was spent',
    revenueGrouped: 'How revenue is grouped',
    revenueSources: 'Where the money came from',
  },
} as const

function resolveChallengePageLocale(
  locale: ChallengeLocale | undefined,
): 'ro' | 'en' {
  return locale === 'en' ? 'en' : 'ro'
}

function getLocalizedMapPreviewLabel(
  previewKey: ChallengeEntityMapPreviewKey,
  locale: ChallengeLocale | undefined,
): string {
  return MAP_PREVIEW_LABELS[resolveChallengePageLocale(locale)][previewKey]
}

function getLocalizedMapPreviewBaseName(
  previewKey: ChallengeEntityMapPreviewKey,
  locale: ChallengeLocale | undefined,
): string {
  return MAP_PREVIEW_BASE_NAMES[resolveChallengePageLocale(locale)][previewKey]
}

function formatLocalizedMapPreviewName(
  previewKey: ChallengeEntityMapPreviewKey,
  locale: ChallengeLocale | undefined,
  selectedPeriodLabel: string,
): string {
  return `${getLocalizedMapPreviewBaseName(previewKey, locale)} (${selectedPeriodLabel})`
}

function localizeMapPreviewState(
  previewKey: ChallengeEntityMapPreviewKey,
  mapState: AdvancedMapAnalyticsUrlState,
  languageQuery: ChallengeLocale | undefined,
): AdvancedMapAnalyticsUrlState {
  const pageLocale = resolveChallengePageLocale(languageQuery)
  const localizedPopulationLabel =
    MAP_PREVIEW_SERIES_LABELS[pageLocale]['population-2021']
  const localizedPopulationUnit =
    MAP_PREVIEW_MISC_COPY[pageLocale].populationUnit
  const localizedMapName = getLocalizedMapPreviewBaseName(
    previewKey,
    languageQuery,
  )
  let didChangeSeries = false
  let didChangeBins = false

  const localizedSeries = mapState.series.map((series) => {
    const localizedSeriesLabel =
      MAP_PREVIEW_SERIES_LABELS[pageLocale][
      series.id as keyof typeof MAP_PREVIEW_SERIES_LABELS.ro
      ]

    if (
      series.type !== 'geojson-dataset-series' ||
      series.datasetKey !== 'insPop2021'
    ) {
      if (!localizedSeriesLabel || series.label === localizedSeriesLabel) {
        return series
      }

      didChangeSeries = true
      return {
        ...series,
        label: localizedSeriesLabel,
      }
    }

    if (
      series.label === localizedPopulationLabel &&
      series.unit === localizedPopulationUnit
    ) {
      return series
    }

    didChangeSeries = true
    return {
      ...series,
      label: localizedPopulationLabel,
      unit: localizedPopulationUnit,
    }
  })

  const localizedBinsPresets = mapState.binsPresets.map((preset) => {
    const localizedTitle = getLocalizedMapPreviewBaseName(
      previewKey,
      languageQuery,
    )
    const localizedNoDataLabel = MAP_PREVIEW_MISC_COPY[pageLocale].noData

    if (
      preset.label === localizedTitle &&
      preset.config.title === localizedTitle &&
      preset.config.noData.label === localizedNoDataLabel
    ) {
      return preset
    }

    didChangeBins = true
    return {
      ...preset,
      label: localizedTitle,
      config: {
        ...preset.config,
        title: localizedTitle,
        noData: {
          ...preset.config.noData,
          label: localizedNoDataLabel,
        },
      },
    }
  })

  if (
    !didChangeSeries &&
    !didChangeBins &&
    mapState.mapName === localizedMapName
  ) {
    return mapState
  }

  return {
    ...mapState,
    mapName: localizedMapName,
    series: localizedSeries,
    binsPresets: localizedBinsPresets,
  }
}

function toTrendValues(
  series: EntityDetailsData['incomeTrend'],
  reportPeriod: ReportPeriodInput,
): EntityFinancialSummaryTrend | undefined {
  const points = series?.data ?? []
  const selectedAnchor =
    reportPeriod.selection.interval?.start ?? reportPeriod.selection.dates?.[0]

  if (!selectedAnchor) {
    return undefined
  }

  const selectedPointIndex = points.findIndex(
    (point) => String(point.x) === String(selectedAnchor),
  )

  if (selectedPointIndex < 1) return undefined

  const previousPoint = points[selectedPointIndex - 1]
  const currentPoint = points[selectedPointIndex]

  return {
    previousValue: Number(previousPoint?.y),
    currentValue: Number(currentPoint?.y),
  }
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return t`Try again in a few moments.`
}

function normalizeClassificationCode(code: string | null | undefined) {
  return (code ?? '').replace(/[^0-9.]/g, '')
}

function hasClassificationPrefix(
  code: string,
  prefixes: readonly string[],
) {
  return prefixes.some((prefix) => code.startsWith(prefix))
}

function doesCodePathStartWith(
  path: readonly string[],
  prefix: readonly string[],
) {
  return prefix.every((segment, index) => path[index] === segment)
}

function filterTopLevelGroupedLineItems(
  lineItems: readonly ExecutionLineItem[],
  excludeEconomicCodes: readonly string[],
  excludeFunctionalCodes: readonly string[],
) {
  return lineItems.filter((lineItem) => {
    const economicCode = normalizeClassificationCode(
      lineItem.economicClassification?.economic_code,
    )
    const functionalCode = normalizeClassificationCode(
      lineItem.functionalClassification?.functional_code,
    )

    if (
      excludeEconomicCodes.length > 0 &&
      hasClassificationPrefix(economicCode, excludeEconomicCodes)
    ) {
      return false
    }

    if (
      excludeFunctionalCodes.length > 0 &&
      hasClassificationPrefix(functionalCode, excludeFunctionalCodes)
    ) {
      return false
    }

    return true
  })
}

function getTreemapSubtitle(
  locale: ChallengeLocale | undefined,
  pageVariant: 'primarie' | 'entities',
  accountCategory: ChallengeTreemapAccountCategory,
  activePrimary: 'fn' | 'ec',
  reportType: ChallengeEntityReportType,
  normalization: ChallengeEntityAnalysisPageState['normalization'],
  expenseType: ChallengeEntityAnalysisExpenseType | undefined,
  treemapDepth: ChallengeEntityAnalysisTreemapDepth,
) {
  const pageCopy = MAP_PREVIEW_MISC_COPY[resolveChallengePageLocale(locale)]
  const baseDescription =
    accountCategory === 'vn'
      ? activePrimary === 'ec'
        ? pageCopy.revenueSources
        : pageCopy.revenueGrouped
      : activePrimary === 'ec'
        ? pageCopy.spendingUses
        : pageCopy.spendingGrouped
  const nonDefaultFilters: string[] = []

  if (reportType !== 'PRINCIPAL_AGGREGATED') {
    const reportLabel =
      reportType === 'SECONDARY_AGGREGATED'
        ? locale === 'en'
          ? 'secondary creditor'
          : 'ordonator secundar'
        : pageVariant === 'entities'
          ? locale === 'en'
            ? 'entity only'
            : 'doar entitatea'
          : locale === 'en'
            ? 'only city hall'
            : 'doar primăria'
    nonDefaultFilters.push(`${pageCopy.reportLabel}: ${reportLabel}`)
  }

  if (normalization !== 'total') {
    nonDefaultFilters.push(
      `${pageCopy.normalizationFilterLabel}: per capita`,
    )
  }

  if (treemapDepth !== 'chapter') {
    const depthLabel =
      treemapDepth === 'subchapter' ? pageCopy.subchapter : pageCopy.paragraph
    nonDefaultFilters.push(`${pageCopy.detailLevel}: ${depthLabel}`)
  }

  if (accountCategory === 'ch' && expenseType != null) {
    nonDefaultFilters.push(
      `${pageCopy.expenseTypeLabel}: ${getExpenseTypeLabel(locale, expenseType)}`,
    )
  }

  const parts: string[] = [baseDescription, ...nonDefaultFilters]

  return parts.join(' · ')
}

function getTreemapPrimaryCtaLabel(
  locale: ChallengeLocale | undefined,
  accountCategory: ChallengeTreemapAccountCategory,
  activePrimary: 'fn' | 'ec',
) {
  const pageCopy = MAP_PREVIEW_MISC_COPY[resolveChallengePageLocale(locale)]

  if (accountCategory === 'vn') {
    return activePrimary === 'ec'
      ? pageCopy.showGroupedRevenue
      : pageCopy.showRevenueSources
  }

  return activePrimary === 'ec'
    ? pageCopy.showGroupedSpending
    : pageCopy.showSpendingUses
}

function getReportTypeCtaLabel(
  locale: ChallengeLocale | undefined,
  reportType: ChallengeEntityReportType,
  pageVariant: 'primarie' | 'entities',
  aggregateReportType: ChallengeEntityAggregateReportType,
) {
  if (aggregateReportType === 'SECONDARY_AGGREGATED') {
    return locale === 'en'
      ? reportType === 'DETAILED'
        ? 'Show secondary-creditor report'
        : 'Show only this entity'
      : reportType === 'DETAILED'
        ? 'Arată raport ordonator secundar'
        : 'Arată doar entitatea'
  }

  if (pageVariant === 'entities') {
    if (locale === 'en') {
      return reportType === 'PRINCIPAL_AGGREGATED'
        ? 'Show only this entity'
        : 'Show entity and institutions'
    }

    return reportType === 'PRINCIPAL_AGGREGATED'
      ? 'Arată doar entitatea'
      : 'Arată entitatea și instituțiile'
  }

  if (locale === 'en') {
    return reportType === 'PRINCIPAL_AGGREGATED'
      ? 'Show only city hall spending'
      : 'Show city hall and subordinate spending'
  }

  return reportType === 'PRINCIPAL_AGGREGATED'
    ? 'Arată Doar Cheltuieli Primăriei'
    : 'Arată Cheltuieli Primăriei și Instituțiilor Subordonate'
}

function getNormalizationCtaLabel(
  locale: ChallengeLocale | undefined,
  normalization: ChallengeEntityAnalysisPageState['normalization'],
) {
  if (locale === 'en') {
    return normalization === 'total'
      ? 'Show per capita'
      : 'Show total'
  }

  return normalization === 'total'
    ? 'Arată per capita'
    : 'Arată total'
}

function getExpenseTypeLabel(
  locale: ChallengeLocale | undefined,
  expenseType: ChallengeEntityAnalysisExpenseType | undefined,
) {
  if (locale === 'en') {
    switch (expenseType) {
      case 'functionare':
        return 'Operations'
      case 'dezvoltare':
        return 'Development'
      default:
        return 'All'
    }
  }

  switch (expenseType) {
    case 'functionare':
      return 'Operațiuni'
    case 'dezvoltare':
      return 'Dezvoltare'
    default:
      return 'Toate'
  }
}

function getNextExpenseType(
  expenseType: ChallengeEntityAnalysisExpenseType | undefined,
): ChallengeEntityAnalysisExpenseType | undefined {
  const currentIndex = CHALLENGE_ENTITY_EXPENSE_TYPE_ORDER.indexOf(expenseType)
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + 1) % CHALLENGE_ENTITY_EXPENSE_TYPE_ORDER.length

  return CHALLENGE_ENTITY_EXPENSE_TYPE_ORDER[nextIndex]
}

function hasNonDefaultTreemapFilters(
  state: Pick<
    ChallengeEntityAnalysisPageState,
    | 'reportType'
    | 'normalization'
    | 'treemapAccountCategory'
    | 'expenseType'
    | 'treemapPrimary'
    | 'treemapDepth'
    | 'treemapPath'
  >,
) {
  return (
    state.reportType !== DEFAULT_TREEMAP_FILTER_STATE.reportType ||
    state.normalization !== DEFAULT_TREEMAP_FILTER_STATE.normalization ||
    state.treemapAccountCategory !==
    DEFAULT_TREEMAP_FILTER_STATE.treemapAccountCategory ||
    state.expenseType !== DEFAULT_TREEMAP_FILTER_STATE.expenseType ||
    state.treemapPrimary !== DEFAULT_TREEMAP_FILTER_STATE.treemapPrimary ||
    state.treemapDepth !== DEFAULT_TREEMAP_FILTER_STATE.treemapDepth ||
    state.treemapPath.length > 0
  )
}

function getNextTreemapDepth(
  depth: ChallengeEntityAnalysisTreemapDepth,
): ChallengeEntityAnalysisTreemapDepth {
  switch (depth) {
    case 'chapter':
      return 'subchapter'
    case 'subchapter':
      return 'paragraph'
    case 'paragraph':
    default:
      return 'chapter'
  }
}

function arePublicMapViewportsEqual(
  firstViewport: PublicMapViewport | undefined,
  secondViewport: PublicMapViewport | undefined,
) {
  if (firstViewport === undefined && secondViewport === undefined) {
    return true
  }

  if (firstViewport === undefined || secondViewport === undefined) {
    return false
  }

  return (
    firstViewport.mapZoom === secondViewport.mapZoom &&
    areMapCentersEqual(firstViewport.mapCenter, secondViewport.mapCenter)
  )
}

function toPublicMapViewport(
  featureInfo:
    | ReturnType<typeof getEntityFeatureInfo>
    | null
    | undefined,
): PublicMapViewport | undefined {
  if (!featureInfo || !Array.isArray(featureInfo.center)) {
    return undefined
  }

  const [latitude, longitude] = featureInfo.center
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined
  }

  return {
    mapCenter: [latitude, longitude],
    mapZoom: featureInfo.zoom,
  }
}

function clonePublicMapViewport(
  viewport: {
    readonly mapCenter?: readonly [number, number]
    readonly mapZoom?: number
  },
): PublicMapViewport {
  return {
    mapCenter: viewport.mapCenter
      ? [...viewport.mapCenter] as [number, number]
      : undefined,
    mapZoom: viewport.mapZoom,
  }
}

type EntityHierarchyRelation = {
  readonly cui: string
  readonly name: string
}

function uniqueEntityRelations(
  relations: readonly (EntityHierarchyRelation | null | undefined)[],
  currentEntityCui: string,
): EntityHierarchyRelation[] {
  const seenCuis = new Set<string>()
  const uniqueRelations: EntityHierarchyRelation[] = []

  for (const relation of relations) {
    const cui = relation?.cui?.trim()
    const name = relation?.name?.trim()

    if (!cui || !name || cui === currentEntityCui || seenCuis.has(cui)) {
      continue
    }

    seenCuis.add(cui)
    uniqueRelations.push({ cui, name })
  }

  return uniqueRelations
}

function getSingleEntityRelationCui(
  relations: readonly EntityHierarchyRelation[],
): string | undefined {
  return relations.length === 1 ? relations[0]?.cui : undefined
}

function areQueryKeysEqual(
  left: readonly unknown[],
  right: readonly unknown[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function toChallengeEntityReportType(
  reportType: GqlReportType | null | undefined,
): ChallengeEntityReportType | undefined {
  return toExecutionReportType(reportType ?? undefined)
}

function MapPreviewSectionFallback() {
  return (
    <Card className="overflow-hidden rounded-[28px] border-border/50">
      <CardContent className="flex h-[420px] items-center justify-center p-6 sm:h-[460px]">
        <LoadingSpinner text={t`Loading map...`} />
      </CardContent>
    </Card>
  )
}

function DeferredSectionFallback(props: {
  readonly titleWidthClassName?: string
  readonly bodyHeightClassName?: string
  readonly showControls?: boolean
}) {
  const {
    titleWidthClassName = 'w-40',
    bodyHeightClassName = 'h-[320px]',
    showControls = false,
  } = props

  return (
    <div className="space-y-3">
      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <Skeleton className={`h-6 ${titleWidthClassName}`} />
        </CardHeader>
        <CardContent>
          <Skeleton className={`w-full ${bodyHeightClassName}`} />
        </CardContent>
      </Card>

      {showControls ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>
      ) : null}
    </div>
  )
}

function EntityViewContentFallback() {
  return (
    <Card className="rounded-[28px] border-border/50">
      <CardContent className="flex min-h-[360px] items-center justify-center p-6">
        <LoadingSpinner text={t`Loading view…`} />
      </CardContent>
    </Card>
  )
}

export function ChallengeEntityAnalysisPage({
  entityCui,
  languageQuery,
  pageVariant = 'primarie',
  hasExplicitReportType = true,
  state,
  commitmentsGrouping,
  commitmentsDetailLevel,
  analyticsTarget,
  initialSettings,
  forcedSettings,
  ssrLoaderPayload,
  ssrEntityDetailsParams,
  ssrEntityExecutionLineItemsParams,
  onStateChange,
  onCommitmentsViewStateChange,
  onAnalyticsTargetChange,
  onEntityCuiChange,
  onEntityResolved,
  belowHeader,
}: ChallengeEntityAnalysisPageProps) {
  const {
    periodType,
    selectedYear,
    quarter,
    month,
    reportType: stateReportType,
    mainCreditorCui,
    normalization: normalizationMode,
    activeView,
    treemapAccountCategory,
    expenseType,
    treemapPrimary,
    treemapDepth,
    treemapPath,
    evolutionAccountCategory,
    evolutionPrimary,
    mapPreviewKey,
  } = state
  const locale = languageQuery === 'en' ? 'en' : 'ro'
  const queryClient = useQueryClient()
  const entityTypeLabel = useEntityTypeLabel()
  const selectedMapPreviewDefinition = useMemo(
    () => getChallengeEntityMapPreviewDefinition(mapPreviewKey),
    [mapPreviewKey],
  )
  const selectedMapPreviewFallbackViewport = useMemo(
    () => clonePublicMapViewport(selectedMapPreviewDefinition.fallbackViewport),
    [selectedMapPreviewDefinition],
  )
  const selectedMapPreviewStateDefinition = useMemo(
    () =>
      localizeMapPreviewState(
        selectedMapPreviewDefinition.key,
        selectedMapPreviewDefinition.mapState,
        languageQuery,
      ),
    [languageQuery, selectedMapPreviewDefinition],
  )
  const [isMapPreviewSelectorExpanded, setIsMapPreviewSelectorExpanded] =
    useState(false)
  const [isTreemapControlsExpanded, setIsTreemapControlsExpanded] =
    useState(false)
  const [publicMapViewport, setPublicMapViewport] =
    useState<PublicMapViewport>()
  const seededPublicMapEntityCuiRef = useRef<string | null>(null)
  const seededPublicMapViewportSourceRef = useRef<'fallback' | 'entity' | null>(
    null,
  )
  const lastAutoSeededPublicMapViewportRef = useRef<
    PublicMapViewport | undefined
  >(undefined)
  const rememberedAggregateReportTypeRef = useRef<{
    readonly entityCui: string
    readonly reportType: ChallengeEntityAggregateReportType
  } | null>(null)
  const [
    resolvedEntityDefaultReportTypeState,
    setResolvedEntityDefaultReportTypeState,
  ] = useState<ResolvedEntityDefaultReportType | null>(null)
  const {
    currency,
    inflationAdjusted,
    displayCurrency,
    displayInflationAdjusted,
    confirmSettingsApplied,
    setSettings,
  } = useGlobalSettings(initialSettings ?? {
    currency: DEFAULT_CURRENCY,
    inflationAdjusted: DEFAULT_INFLATION_ADJUSTED,
  }, forcedSettings)
  const resolvedSsrEntityDetailsParams =
    ssrLoaderPayload?.ssrEntityDetailsParams ?? ssrEntityDetailsParams
  const resolvedSsrEntityExecutionLineItemsParams =
    ssrLoaderPayload?.ssrEntityExecutionLineItemsParams ??
    ssrEntityExecutionLineItemsParams
  const ssrEntityDetailsCacheData = useMemo(() => {
    if (!resolvedSsrEntityDetailsParams) {
      return undefined
    }

    const ssrQueryOptions = entityDetailsQueryOptions(
      resolvedSsrEntityDetailsParams,
    )

    return queryClient.getQueryData<EntityDetailsData>(ssrQueryOptions.queryKey)
  }, [queryClient, resolvedSsrEntityDetailsParams])
  const ssrEntityExecutionLineItemsCacheData = useMemo(() => {
    if (!resolvedSsrEntityExecutionLineItemsParams) {
      return undefined
    }

    const ssrQueryOptions = entityExecutionLineItemsQueryOptions(
      resolvedSsrEntityExecutionLineItemsParams,
    )

    return queryClient.getQueryData<EntityExecutionLineItemsData>(
      ssrQueryOptions.queryKey,
    )
  }, [queryClient, resolvedSsrEntityExecutionLineItemsParams])
  const reportPeriod = useMemo(
    () =>
      buildChallengeEntityAnalysisReportPeriod({
        periodType,
        selectedYear,
        quarter,
        month,
      }),
    [month, periodType, quarter, selectedYear],
  )
  const trendPeriod = useMemo(
    () =>
      buildChallengeEntityAnalysisTrendPeriod({
        periodType,
        selectedYear,
      }),
    [periodType, selectedYear],
  )
  const periodLabel = usePeriodLabel(reportPeriod) || String(selectedYear)
  const showPeriodGrowth =
    state.showPeriodGrowth ?? CHALLENGE_SHOW_PERIOD_GROWTH
  const queryNormalizationOptions = useMemo<NormalizationOptions>(
    () => ({
      normalization: normalizationMode,
      show_period_growth: showPeriodGrowth,
      currency,
      inflation_adjusted: inflationAdjusted,
    }),
    [currency, inflationAdjusted, normalizationMode, showPeriodGrowth],
  )
  const displayNormalizationOptions = useMemo<NormalizationOptions>(
    () => ({
      normalization: normalizationMode,
      show_period_growth: showPeriodGrowth,
      currency: displayCurrency,
      inflation_adjusted: displayInflationAdjusted,
    }),
    [
      displayCurrency,
      displayInflationAdjusted,
      normalizationMode,
      showPeriodGrowth,
    ],
  )
  const localizedSelectedMapPreviewName = useMemo(
    () =>
      formatLocalizedMapPreviewName(
        selectedMapPreviewDefinition.key,
        languageQuery,
        periodLabel,
      ),
    [languageQuery, periodLabel, selectedMapPreviewDefinition.key],
  )
  const entityRelationshipsQuery = useEntityRelationships({
    cui: entityCui,
  })
  const relationshipChildren = entityRelationshipsQuery.data?.children ?? []
  const preloadedParentMainCreditors = useMemo(
    () =>
      uniqueEntityRelations(
        ssrEntityDetailsCacheData?.parents ?? [],
        entityCui,
      ),
    [entityCui, ssrEntityDetailsCacheData?.parents],
  )
  const relationshipParentMainCreditors = useMemo(
    () =>
      uniqueEntityRelations(
        entityRelationshipsQuery.data?.parents ?? [],
        entityCui,
      ),
    [entityCui, entityRelationshipsQuery.data?.parents],
  )
  const shouldUseEntityDefaultReportType =
    pageVariant === 'entities' &&
    !hasExplicitReportType &&
    stateReportType === DEFAULT_TREEMAP_FILTER_STATE.reportType
  const shouldInferMainCreditorFromParent =
    pageVariant !== 'entities' && !shouldUseEntityDefaultReportType
  const inferredMainCreditorCui =
    mainCreditorCui ??
    (
      shouldInferMainCreditorFromParent
        ? (
            getSingleEntityRelationCui(relationshipParentMainCreditors) ??
            getSingleEntityRelationCui(preloadedParentMainCreditors)
          )
        : undefined
    )
  const hasPreloadedOrRelationshipParentMainCreditor =
    preloadedParentMainCreditors.length > 0 ||
    relationshipParentMainCreditors.length > 0
  const shouldForceDetailedForParentOnlyEntity =
    shouldInferMainCreditorFromParent &&
    hasPreloadedOrRelationshipParentMainCreditor &&
    relationshipChildren.length === 0
  const preloadedEntityDefaultReportType = useMemo(
    () =>
      ssrEntityDetailsCacheData?.cui === entityCui
        ? toChallengeEntityReportType(
            ssrEntityDetailsCacheData.default_report_type,
          )
        : toChallengeEntityReportType(
            ssrLoaderPayload?.entitySeoSnapshot?.defaultReportType as
              | GqlReportType
              | null
              | undefined,
          ),
    [
      entityCui,
      ssrEntityDetailsCacheData?.cui,
      ssrEntityDetailsCacheData?.default_report_type,
      ssrLoaderPayload?.entitySeoSnapshot?.defaultReportType,
    ],
  )
  const resolvedEntityDefaultReportType =
    resolvedEntityDefaultReportTypeState?.entityCui === entityCui
      ? resolvedEntityDefaultReportTypeState.reportType
      : undefined
  const entityDefaultReportTypeForQuery =
    shouldUseEntityDefaultReportType
      ? resolvedEntityDefaultReportType ?? preloadedEntityDefaultReportType
      : undefined
  const entityDetailsReportType =
    shouldForceDetailedForParentOnlyEntity
      ? 'DETAILED'
      : shouldUseEntityDefaultReportType
        ? entityDefaultReportTypeForQuery
        : stateReportType
  const entityDetailsQueryParams = useMemo(
    () => ({
      cui: entityCui,
      reportPeriod,
      reportType: entityDetailsReportType,
      trendPeriod,
      mainCreditorCui: inferredMainCreditorCui,
      ...queryNormalizationOptions,
    }),
    [
      entityCui,
      entityDetailsReportType,
      inferredMainCreditorCui,
      queryNormalizationOptions,
      reportPeriod,
      trendPeriod,
    ],
  )
  const ssrEntityDetailsPlaceholder = useMemo(() => {
    if (!ssrEntityDetailsCacheData || !resolvedSsrEntityDetailsParams) {
      return undefined
    }

    const ssrQueryOptions = entityDetailsQueryOptions(
      resolvedSsrEntityDetailsParams,
    )
    const currentQueryOptions = entityDetailsQueryOptions(
      entityDetailsQueryParams,
    )

    return areQueryKeysEqual(
      ssrQueryOptions.queryKey,
      currentQueryOptions.queryKey,
    )
      ? ssrEntityDetailsCacheData
      : undefined
  }, [
    entityDetailsQueryParams,
    resolvedSsrEntityDetailsParams,
    ssrEntityDetailsCacheData,
  ])
  const entityDetailsQuery = useEntityDetails(entityDetailsQueryParams, {
    ssrPlaceholder: ssrEntityDetailsPlaceholder,
  })
  useRecentEntities(
    pageVariant === 'entities' && entityDetailsQuery.data
      ? entityDetailsQuery.data
      : null,
  )
  const isCountyLevelMapEntity = Boolean(
    entityDetailsQuery.data &&
    (
      entityDetailsQuery.data.entity_type === 'admin_county_council' ||
      entityDetailsQuery.data.cui === '4267117'
    ),
  )
  const isUatEntity = Boolean(entityDetailsQuery.data?.is_uat)
  const hasResolvedEntityDetails = Boolean(entityDetailsQuery.data)
  const canUsePerCapitaNormalization = isUatEntity
  const supportsEntityMapPreview = Boolean(
    entityDetailsQuery.data && (isUatEntity || isCountyLevelMapEntity),
  )
  const entityMapViewType = useMemo<'UAT' | 'County'>(() => {
    if (isCountyLevelMapEntity) {
      return 'County'
    }

    return 'UAT'
  }, [isCountyLevelMapEntity])
  const entityGeoJsonQuery = useGeoJsonData(entityMapViewType, {
    enabled: supportsEntityMapPreview,
  })
  const entityGeoJsonData = entityGeoJsonQuery.data
  const parentMainCreditorEntities = useMemo(
    () => {
      return uniqueEntityRelations(
        [
          ...preloadedParentMainCreditors,
          ...relationshipParentMainCreditors,
          ...(entityDetailsQuery.data?.parents ?? []),
        ],
        entityCui,
      )
    },
    [
      entityCui,
      entityDetailsQuery.data?.parents,
      preloadedParentMainCreditors,
      relationshipParentMainCreditors,
    ],
  )
  const hasParentMainCreditors = parentMainCreditorEntities.length > 0
  const hasLinkedSubordinates = relationshipChildren.length > 0
  const showParentMainCreditorSection =
    hasParentMainCreditors && !hasLinkedSubordinates
  const shouldForceDetailedForParentMainCreditorSection =
    showParentMainCreditorSection && shouldInferMainCreditorFromParent
  const queriedEntityDefaultReportType = toChallengeEntityReportType(
    entityDetailsQuery.data?.default_report_type,
  )
  const isSecondaryCreditorEntity =
    entityDetailsQuery.data?.entity_type === 'secondary_creditor' ||
    ssrLoaderPayload?.entitySeoSnapshot?.entityType === 'secondary_creditor'
  const selectedReportType =
    shouldForceDetailedForParentMainCreditorSection
      ? 'DETAILED'
      : shouldUseEntityDefaultReportType
        ? (
            queriedEntityDefaultReportType ??
            entityDefaultReportTypeForQuery ??
            stateReportType
          )
        : stateReportType
  const isResolvingEntityDefaultReportType =
    shouldUseEntityDefaultReportType &&
    queriedEntityDefaultReportType !== undefined &&
    entityDetailsReportType !== queriedEntityDefaultReportType
  const rememberedAggregateReportType =
    rememberedAggregateReportTypeRef.current?.entityCui === entityCui
      ? rememberedAggregateReportTypeRef.current.reportType
      : 'PRINCIPAL_AGGREGATED'
  const shouldUseSecondaryAggregateReportType =
    selectedReportType === 'SECONDARY_AGGREGATED' ||
    queriedEntityDefaultReportType === 'SECONDARY_AGGREGATED' ||
    preloadedEntityDefaultReportType === 'SECONDARY_AGGREGATED' ||
    entityDefaultReportTypeForQuery === 'SECONDARY_AGGREGATED' ||
    stateReportType === 'SECONDARY_AGGREGATED' ||
    isSecondaryCreditorEntity ||
    (hasParentMainCreditors && hasLinkedSubordinates)
  const aggregateReportType: ChallengeEntityAggregateReportType =
    shouldUseSecondaryAggregateReportType
      ? 'SECONDARY_AGGREGATED'
      : selectedReportType === 'DETAILED'
        ? rememberedAggregateReportType
        : 'PRINCIPAL_AGGREGATED'
  const reportTypeOptions = useMemo(
    () => [aggregateReportType, CHALLENGE_ENTITY_DETAILED_REPORT_TYPE] as const,
    [aggregateReportType],
  )
  const canChangeReportType = !shouldForceDetailedForParentMainCreditorSection
  useEffect(() => {
    rememberedAggregateReportTypeRef.current = {
      entityCui,
      reportType: aggregateReportType,
    }
  }, [aggregateReportType, entityCui])
  const mainCreditorOptions = useMemo<readonly ChallengeEntityMainCreditorOption[]>(
    () =>
      parentMainCreditorEntities.map((parentEntity) => ({
        id: parentEntity.cui,
        label: parentEntity.name,
      })),
    [parentMainCreditorEntities],
  )
  const shouldEnableEntityLineItemsQuery =
    !shouldUseEntityDefaultReportType ||
    entityDetailsReportType === selectedReportType
  const entityLineItemsQueryParams = useMemo(
    () => ({
      cui: entityCui,
      reportPeriod,
      reportType: selectedReportType,
      mainCreditorCui: inferredMainCreditorCui,
      enabled: shouldEnableEntityLineItemsQuery,
      ...queryNormalizationOptions,
    }),
    [
      entityCui,
      inferredMainCreditorCui,
      queryNormalizationOptions,
      reportPeriod,
      selectedReportType,
      shouldEnableEntityLineItemsQuery,
    ],
  )
  const ssrEntityExecutionLineItemsPlaceholder = useMemo(() => {
    if (
      !ssrEntityExecutionLineItemsCacheData ||
      !resolvedSsrEntityExecutionLineItemsParams
    ) {
      return undefined
    }

    const ssrQueryOptions = entityExecutionLineItemsQueryOptions(
      resolvedSsrEntityExecutionLineItemsParams,
    )
    const currentQueryOptions = entityExecutionLineItemsQueryOptions(
      entityLineItemsQueryParams,
    )

    return areQueryKeysEqual(
      ssrQueryOptions.queryKey,
      currentQueryOptions.queryKey,
    )
      ? ssrEntityExecutionLineItemsCacheData
      : undefined
  }, [
    entityLineItemsQueryParams,
    resolvedSsrEntityExecutionLineItemsParams,
    ssrEntityExecutionLineItemsCacheData,
  ])
  const entityLineItemsQuery = useEntityExecutionLineItems(
    entityLineItemsQueryParams,
    {
      ssrPlaceholder: ssrEntityExecutionLineItemsPlaceholder,
    },
  )
  useEffect(() => {
    if (
      !shouldUseEntityDefaultReportType ||
      queriedEntityDefaultReportType === undefined ||
      resolvedEntityDefaultReportType === queriedEntityDefaultReportType
    ) {
      return
    }

    setResolvedEntityDefaultReportTypeState({
      entityCui,
      reportType: queriedEntityDefaultReportType,
    })
  }, [
    entityCui,
    queriedEntityDefaultReportType,
    resolvedEntityDefaultReportType,
    shouldUseEntityDefaultReportType,
  ])
  const selectedMapPreviewCopy = useMemo(
    () =>
      selectedMapPreviewDefinition.buildPreviewCopy({
        selectedPeriodLabel: periodLabel,
        normalization: normalizationMode,
        currency,
        inflationAdjusted,
        reportType: selectedReportType,
      }),
    [
      currency,
      inflationAdjusted,
      normalizationMode,
      periodLabel,
      selectedReportType,
      selectedMapPreviewDefinition,
    ],
  )
  useEffect(() => {
    if (
      !shouldForceDetailedForParentMainCreditorSection ||
      !hasExplicitReportType ||
      stateReportType === 'DETAILED'
    ) {
      return
    }

    onStateChange({
      reportType: 'DETAILED',
      treemapPath: [],
    })
  }, [
    hasExplicitReportType,
    onStateChange,
    shouldForceDetailedForParentMainCreditorSection,
    stateReportType,
  ])
  useEffect(() => {
    if (
      !hasResolvedEntityDetails ||
      canUsePerCapitaNormalization ||
      normalizationMode !== 'per_capita'
    ) {
      return
    }

    onStateChange({ normalization: 'total' })
  }, [
    canUsePerCapitaNormalization,
    hasResolvedEntityDetails,
    normalizationMode,
    onStateChange,
  ])
  const subordinateRankingQuery = useQuery({
    ...challengeEntitySubordinateRankingQueryOptions({
      entityCui,
      reportPeriod,
      normalizationOptions: {
        currency,
        inflation_adjusted: inflationAdjusted,
      },
      enabled:
        !showParentMainCreditorSection &&
        (
          Boolean(entityRelationshipsQuery.data) ||
          entityRelationshipsQuery.isError
        ),
    }),
    placeholderData: (previousData) => previousData,
  })

  const isInitialLoading =
    isResolvingEntityDefaultReportType ||
    (entityDetailsQuery.isLoading && !entityDetailsQuery.data) ||
    (entityLineItemsQuery.isLoading && !entityLineItemsQuery.data)

  const treemapLineItems = useMemo(
    () =>
      (entityLineItemsQuery.data?.nodes ?? []).filter(
        (lineItem) =>
          lineItem.account_category === treemapAccountCategory &&
          (
            treemapAccountCategory !== 'ch' ||
            matchesSelectedExpenseType(lineItem, expenseType)
          ),
      ),
    [entityLineItemsQuery.data?.nodes, expenseType, treemapAccountCategory],
  )
  const treemapExcludeEconomicCodes = useMemo(
    () =>
      treemapAccountCategory === 'ch'
        ? [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES]
        : [],
    [treemapAccountCategory],
  )
  const treemapExcludeFunctionalCodes = useMemo(
    () =>
      treemapAccountCategory === 'vn'
        ? [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES]
        : [],
    [treemapAccountCategory],
  )
  const groupedLineItems = useMemo(
    () =>
      filterTopLevelGroupedLineItems(
        treemapLineItems,
        treemapExcludeEconomicCodes,
        treemapExcludeFunctionalCodes,
      ),
    [
      treemapExcludeEconomicCodes,
      treemapExcludeFunctionalCodes,
      treemapLineItems,
    ],
  )
  const groupedLineItemsPresetSearchTerm = useMemo(() => {
    if (treemapAccountCategory !== 'ch' || treemapPrimary !== 'fn') {
      return undefined
    }

    if (
      !doesCodePathStartWith(
        treemapPath,
        CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH,
      )
    ) {
      return undefined
    }

    return CHALLENGE_ADMINISTRATIVE_EXPENSE_SEARCH_TERM
  }, [treemapAccountCategory, treemapPath, treemapPrimary])

  const treemapNodes = useMemo<AggregatedNode[]>(
    () =>
      treemapLineItems.map((lineItem) => ({
        fn_c: lineItem.functionalClassification?.functional_code ?? '',
        fn_n: lineItem.functionalClassification?.functional_name ?? '',
        ec_c: lineItem.economicClassification?.economic_code ?? '',
        ec_n: lineItem.economicClassification?.economic_name ?? '',
        amount: Number(lineItem.amount ?? 0),
        count: 1,
      })),
    [treemapLineItems],
  )

  const {
    activePrimary,
    treemapData,
    breadcrumbs,
    excludedItemsSummary,
    onNodeClick,
    onBreadcrumbClick,
  } = useTreemapDrilldown({
    nodes: treemapNodes,
    initialPrimary: treemapPrimary,
    initialPath: [...treemapPath],
    rootDepth:
      treemapDepth === 'paragraph'
        ? 6
        : treemapDepth === 'subchapter'
          ? 4
          : 2,
    excludeEcCodes: treemapExcludeEconomicCodes,
    excludeFnCodes: treemapExcludeFunctionalCodes,
    onPathChange: (path) => onStateChange({ treemapPath: path }),
  })
  const { amountFilter, unit: treemapUnit } = useTreemapAmountFilter({
    data: treemapData,
    normalization: displayNormalizationOptions.normalization,
    currency: displayNormalizationOptions.currency,
  })
  const isIncomeTreemap = treemapAccountCategory === 'vn'
  const showsIncomeEconomicMessage = isIncomeTreemap && activePrimary === 'ec'
  const treemapValueBounds = useMemo(
    () => getTreemapValueBounds(treemapData),
    [treemapData],
  )
  const hasModifiedTreemapRange = useMemo(
    () => hasModifiedTreemapAmountRange(treemapData, amountFilter.range),
    [amountFilter.range, treemapData],
  )
  const visibleTreemapNodes = useMemo<readonly TreemapInput[]>(
    () =>
      showsIncomeEconomicMessage
        ? []
        : filterTreemapNodesByAmountRange(treemapData, amountFilter.range),
    [amountFilter.range, showsIncomeEconomicMessage, treemapData],
  )
  const visibleSubordinateRankings = useMemo(
    () => subordinateRankingQuery.data?.nodes ?? [],
    [subordinateRankingQuery.data?.nodes],
  )
  const totalSubordinateCount =
    subordinateRankingQuery.data?.pageInfo?.totalCount ?? 0

  const summaryTrends = useMemo(
    () => ({
      income: toTrendValues(entityDetailsQuery.data?.incomeTrend, reportPeriod),
      expenses: toTrendValues(
        entityDetailsQuery.data?.expenseTrend,
        reportPeriod,
      ),
      balance: toTrendValues(
        entityDetailsQuery.data?.balanceTrend,
        reportPeriod,
      ),
    }),
    [
      reportPeriod,
      entityDetailsQuery.data?.balanceTrend,
      entityDetailsQuery.data?.expenseTrend,
      entityDetailsQuery.data?.incomeTrend,
    ],
  )

  const parentPopulation = entityDetailsQuery.data?.uat?.population ?? 0

  const parentMainCreditorCards = useMemo<ChallengeEntitySubordinateCardItem[]>(
    () =>
      parentMainCreditorEntities.map((parentEntity) => ({
        entityCui: parentEntity.cui,
        entityName: parentEntity.name,
        entityTypeLabel:
          locale === 'en' ? 'Main budget creditor' : 'Ordonator principal',
        entitySearch: {
          year: selectedYear,
          period: periodType,
          ...(periodType === 'QUARTER' ? { quarter } : {}),
          ...(periodType === 'MONTH' ? { month } : {}),
          report_type: 'PRINCIPAL_AGGREGATED',
          normalization: normalizationMode,
          currency: displayCurrency,
          inflation_adjusted: displayInflationAdjusted,
          ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
        },
      })),
    [
      displayCurrency,
      displayInflationAdjusted,
      languageQuery,
      locale,
      month,
      normalizationMode,
      parentMainCreditorEntities,
      periodType,
      quarter,
      selectedYear,
    ],
  )

  const subordinateCards = useMemo<ChallengeEntitySubordinateCardItem[]>(
    () =>
      visibleSubordinateRankings.map((subordinateEntity) => {
        const rawEntityTypeLabel = subordinateEntity.entity_type
          ? entityTypeLabel.map(subordinateEntity.entity_type)
          : null
        const subordinateEntityTypeLabel =
          rawEntityTypeLabel && !rawEntityTypeLabel.startsWith('id::')
            ? rawEntityTypeLabel
            : null
        const rawAmount = Number(
          subordinateEntity.total_amount ?? subordinateEntity.amount ?? 0,
        )
        const totalSpending =
          normalizationMode === 'per_capita' && parentPopulation > 0
            ? rawAmount / parentPopulation
            : rawAmount

        return {
          entityCui: subordinateEntity.entity_cui,
          entityName: subordinateEntity.entity_name,
          entityTypeLabel: subordinateEntityTypeLabel,
          totalSpending,
          entitySearch: {
            year: selectedYear,
            period: periodType,
            ...(periodType === 'QUARTER' ? { quarter } : {}),
            ...(periodType === 'MONTH' ? { month } : {}),
            report_type: 'DETAILED',
            main_creditor_cui: inferredMainCreditorCui ?? entityCui,
            normalization: normalizationMode,
            currency: displayCurrency,
            inflation_adjusted: displayInflationAdjusted,
            ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
          },
        }
      }),
    [
      displayCurrency,
      displayInflationAdjusted,
      entityCui,
      entityTypeLabel,
      inferredMainCreditorCui,
      languageQuery,
      month,
      normalizationMode,
      parentPopulation,
      periodType,
      quarter,
      selectedYear,
      visibleSubordinateRankings,
    ],
  )

  const entityPublicMapViewport = useMemo(() => {
    if (
      !supportsEntityMapPreview ||
      !entityDetailsQuery.data ||
      !entityGeoJsonData
    ) {
      return undefined
    }

    return toPublicMapViewport(
      getEntityFeatureInfo(entityDetailsQuery.data, entityGeoJsonData),
    )
  }, [entityDetailsQuery.data, entityGeoJsonData, supportsEntityMapPreview])
  const isEntityPublicMapViewportReady = useMemo(
    () =>
      supportsEntityMapPreview &&
      Boolean(entityDetailsQuery.data) &&
      !entityDetailsQuery.isFetching &&
      (
        Boolean(entityGeoJsonData) ||
        Boolean(entityGeoJsonQuery.error) ||
        !entityGeoJsonQuery.isLoading
      ),
    [
      entityDetailsQuery.data,
      entityDetailsQuery.isFetching,
      entityGeoJsonData,
      entityGeoJsonQuery.error,
      entityGeoJsonQuery.isLoading,
      supportsEntityMapPreview,
    ],
  )
  const isPublicMapPreviewReady =
    publicMapViewport !== undefined &&
    seededPublicMapEntityCuiRef.current === entityCui &&
    seededPublicMapViewportSourceRef.current !== null

  const seedPublicMapViewport = useCallback(
    (nextViewport: PublicMapViewport, source: 'fallback' | 'entity') => {
      setPublicMapViewport((previousViewport) =>
        arePublicMapViewportsEqual(previousViewport, nextViewport)
          ? previousViewport
          : nextViewport,
      )
      seededPublicMapEntityCuiRef.current = entityCui
      seededPublicMapViewportSourceRef.current = source
      lastAutoSeededPublicMapViewportRef.current =
        clonePublicMapViewport(nextViewport)
    },
    [entityCui],
  )

  const showAllSubordinatesSearch = useMemo(
    () => ({
      ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
      view: 'table',
      sortBy: 'total_amount',
      sortOrder: 'desc',
      filter: {
        account_category: 'ch',
        main_creditor_cui: entityCui,
        report_period: reportPeriod,
        report_type: toReportTypeValue('DETAILED'),
        normalization: normalizationMode,
        currency: displayCurrency,
        inflation_adjusted: displayInflationAdjusted,
        show_period_growth: showPeriodGrowth,
        exclude: {
          entity_cuis: [entityCui],
        },
      },
    }),
    [
      displayCurrency,
      displayInflationAdjusted,
      entityCui,
      languageQuery,
      normalizationMode,
      reportPeriod,
      showPeriodGrowth,
    ],
  )
  const handleSelectedPeriodChange = useCallback(
    (nextPeriodLabel: string) => {
      if (periodType === 'MONTH') {
        const nextMonth = nextPeriodLabel as TMonth
        if (nextMonth !== month) {
          onStateChange({ month: nextMonth })
        }
        return
      }

      if (periodType === 'QUARTER') {
        const nextQuarter = nextPeriodLabel as TQuarter
        if (nextQuarter !== quarter) {
          onStateChange({ quarter: nextQuarter })
        }
      }
    },
    [month, onStateChange, periodType, quarter],
  )

  const handleYearChange = useCallback(
    (nextYear: number) => {
      if (!Number.isFinite(nextYear) || nextYear === selectedYear) {
        return
      }

      onStateChange({ selectedYear: nextYear })
    },
    [onStateChange, selectedYear],
  )

  const analyticsView = analyticsTarget?.view ?? getDefaultBudgetItemAnalyticsViewState()
  const selectedBudgetItemAnalyticsProps =
    useMemo<BudgetItemAnalyticsProps | null>(() => {
      if (!analyticsTarget) {
        return null
      }

      const analyticsSelection = getBudgetItemAnalyticsSelection(
        analyticsTarget.target.path,
      )

      return {
        context: {
          entityCui,
          selectedYear,
          accountCategory: treemapAccountCategory,
          expenseType,
          reportType: selectedReportType,
          reportTypeOptions,
          reportCopyVariant:
            pageVariant === 'entities' ? 'entity' : 'city-hall',
          canChangeReportType,
          canChangeNormalization: canUsePerCapitaNormalization,
          currentReportPeriod: reportPeriod,
          historyReportPeriod: trendPeriod,
          normalization: normalizationMode,
          currency,
          inflationAdjusted,
          subjectLabel: analyticsTarget.target.subjectLabel ?? '',
          language: languageQuery,
          functionalCode: analyticsSelection.functionalCode,
          economicCode: analyticsSelection.economicCode,
        },
        analyticsView,
        onAnalyticsViewChange: (patch) => {
          if (!analyticsTarget) {
            return
          }

          onAnalyticsTargetChange?.({
            ...analyticsTarget,
            view: {
              ...analyticsView,
              ...patch,
            },
          })
        },
        onSelectionChange: (selection) => {
          if (selection === null) {
            onAnalyticsTargetChange?.(null)
            return
          }

          const nextPath = buildBudgetItemAnalyticsPath(selection)

          onAnalyticsTargetChange?.({
            target: {
              path: nextPath,
            },
            view: analyticsView,
          })
        },
        onReportTypeChange: (nextReportType) => {
          if (!canChangeReportType) {
            return
          }

          if (nextReportType !== selectedReportType) {
            onStateChange({ reportType: nextReportType })
          }
        },
        onNormalizationChange: (nextNormalization) => {
          if (
            nextNormalization === 'per_capita' &&
            !canUsePerCapitaNormalization
          ) {
            return
          }

          if (nextNormalization !== normalizationMode) {
            onStateChange({ normalization: nextNormalization })
          }
        },
        onInflationAdjustedChange: (nextInflationAdjusted) => {
          if (nextInflationAdjusted !== displayInflationAdjusted) {
            setSettings({ inflationAdjusted: nextInflationAdjusted })
          }
        },
        onExpenseTypeChange: (nextExpenseType) => {
          if (nextExpenseType !== expenseType) {
            onStateChange({
              expenseType: nextExpenseType,
              treemapPath: [],
            })
          }
        },
        onYearChange: handleYearChange,
        onPeriodChange: handleSelectedPeriodChange,
        onEntityCuiChange,
      }
    }, [
      analyticsTarget,
      analyticsView,
      canChangeReportType,
      canUsePerCapitaNormalization,
      currency,
      displayInflationAdjusted,
      expenseType,
      entityCui,
      handleSelectedPeriodChange,
      handleYearChange,
      inflationAdjusted,
      languageQuery,
      normalizationMode,
      onAnalyticsTargetChange,
      onEntityCuiChange,
      onStateChange,
      pageVariant,
      reportPeriod,
      reportTypeOptions,
      selectedReportType,
      selectedYear,
      setSettings,
      treemapAccountCategory,
      trendPeriod,
    ])
  const isBudgetItemAnalyticsOpen = Boolean(selectedBudgetItemAnalyticsProps)

  const handleBudgetItemAnalyticsRequest = useCallback(
    (request: BudgetItemAnalyticsRequest) => {
      onAnalyticsTargetChange?.({
        target: request,
        view: analyticsView,
      })
    },
    [analyticsView, onAnalyticsTargetChange],
  )

  const handleBudgetItemAnalyticsOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onAnalyticsTargetChange?.(null)
    }
  }, [onAnalyticsTargetChange])

  useEffect(() => {
    if (entityDetailsQuery.data && !entityDetailsQuery.isFetching) {
      onEntityResolved?.()
    }
  }, [
    entityDetailsQuery.data,
    entityDetailsQuery.isFetching,
    onEntityResolved,
  ])

  useEffect(() => {
    const areCoreQueriesSettled =
      Boolean(entityDetailsQuery.data) &&
      Boolean(entityLineItemsQuery.data) &&
      !entityDetailsQuery.isFetching &&
      !entityLineItemsQuery.isFetching

    if (areCoreQueriesSettled && !subordinateRankingQuery.isFetching) {
      confirmSettingsApplied()
    }
  }, [
    confirmSettingsApplied,
    entityDetailsQuery.data,
    entityDetailsQuery.isFetching,
    entityLineItemsQuery.data,
    entityLineItemsQuery.isFetching,
    subordinateRankingQuery.isFetching,
  ])

  useEffect(() => {
    if (!supportsEntityMapPreview) {
      return
    }

    if (seededPublicMapEntityCuiRef.current !== entityCui) {
      if (!isEntityPublicMapViewportReady) {
        return
      }

      const nextViewport =
        entityPublicMapViewport ?? selectedMapPreviewFallbackViewport

      seedPublicMapViewport(
        nextViewport,
        entityPublicMapViewport ? 'entity' : 'fallback',
      )
      return
    }

    if (seededPublicMapViewportSourceRef.current !== 'fallback') {
      return
    }

    const lastAutoSeededViewport = lastAutoSeededPublicMapViewportRef.current
    const isUsingAutoSeededFallbackViewport = arePublicMapViewportsEqual(
      publicMapViewport,
      lastAutoSeededViewport,
    )

    if (!isUsingAutoSeededFallbackViewport) {
      return
    }

    if (entityPublicMapViewport) {
      seedPublicMapViewport(entityPublicMapViewport, 'entity')
      return
    }

    if (
      !arePublicMapViewportsEqual(
        lastAutoSeededViewport,
        selectedMapPreviewFallbackViewport,
      )
    ) {
      seedPublicMapViewport(selectedMapPreviewFallbackViewport, 'fallback')
    }
  }, [
    entityCui,
    isEntityPublicMapViewportReady,
    entityPublicMapViewport,
    publicMapViewport,
    seedPublicMapViewport,
    selectedMapPreviewFallbackViewport,
    supportsEntityMapPreview,
  ])

  const handlePublicMapViewportChange = useCallback(
    (nextViewport: PublicMapViewport) => {
      setPublicMapViewport((previousViewport) => {
        const mergedViewport: PublicMapViewport = {
          mapZoom: nextViewport.mapZoom ?? previousViewport?.mapZoom,
          mapCenter: nextViewport.mapCenter ?? previousViewport?.mapCenter,
        }

        return arePublicMapViewportsEqual(previousViewport, mergedViewport)
          ? previousViewport
          : mergedViewport
      })
    },
    [],
  )

  const handleReportControlsChange = useCallback(
    (patch: {
      readonly periodType?: ReportPeriodType
      readonly selectedYear?: number
      readonly quarter?: TQuarter
      readonly month?: TMonth
      readonly reportType?: ChallengeEntityReportType
      readonly mainCreditorCui?: string
    }) => {
      onStateChange({
        ...patch,
        ...(patch.reportType !== undefined ? { treemapPath: [] } : {}),
      })
    },
    [onStateChange],
  )

  const handleTreemapAccountCategoryToggle = () => {
    const nextAccountCategory = treemapAccountCategory === 'ch' ? 'vn' : 'ch'

    onStateChange({
      treemapAccountCategory: nextAccountCategory,
      treemapPrimary:
        nextAccountCategory === 'vn' ? 'fn' : treemapPrimary,
      treemapPath: [],
    })
  }

  const handleTreemapPrimaryToggle = () => {
    const nextPrimary = activePrimary === 'fn' ? 'ec' : 'fn'

    onStateChange({
      treemapPrimary: nextPrimary,
      treemapPath: [],
    })
  }

  const handleTreemapDepthChange = (
    nextDepth: ChallengeEntityAnalysisTreemapDepth,
  ) => {
    if (nextDepth === treemapDepth) {
      return
    }

    onStateChange({
      treemapDepth: nextDepth,
      treemapPath: [],
    })
  }

  const handleTreemapDepthToggle = () => {
    handleTreemapDepthChange(getNextTreemapDepth(treemapDepth))
  }

  const handleExpenseTypeChange = (
    nextExpenseType: ChallengeEntityAnalysisExpenseType | undefined,
  ) => {
    if (nextExpenseType === expenseType) {
      return
    }

    onStateChange({
      expenseType: nextExpenseType,
      treemapPath: [],
    })
  }

  const handleExpenseTypeToggle = () => {
    handleExpenseTypeChange(getNextExpenseType(expenseType))
  }

  const handleAdministrativeExpensesShortcut = () => {
    onStateChange({
      treemapAccountCategory: 'ch',
      expenseType: undefined,
      treemapPrimary: 'fn',
      treemapPath: [...CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH],
    })
  }

  const handleResetTreemapToAllExpenses = () => {
    onStateChange({
      treemapAccountCategory: 'ch',
      expenseType: undefined,
      treemapPrimary: activePrimary,
      treemapPath: [],
    })
  }

  const handleResetTreemapFilters = () => {
    onStateChange({
      reportType: canChangeReportType
        ? aggregateReportType
        : selectedReportType,
      normalization: DEFAULT_TREEMAP_FILTER_STATE.normalization,
      treemapAccountCategory:
        DEFAULT_TREEMAP_FILTER_STATE.treemapAccountCategory,
      expenseType: DEFAULT_TREEMAP_FILTER_STATE.expenseType,
      treemapPrimary: DEFAULT_TREEMAP_FILTER_STATE.treemapPrimary,
      treemapDepth: DEFAULT_TREEMAP_FILTER_STATE.treemapDepth,
      treemapPath: [],
    })
  }

  const handleReportTypeToggle = () => {
    if (!canChangeReportType) {
      return
    }

    const nextReportType =
      selectedReportType === CHALLENGE_ENTITY_DETAILED_REPORT_TYPE
        ? aggregateReportType
        : CHALLENGE_ENTITY_DETAILED_REPORT_TYPE

    onStateChange({
      reportType: nextReportType,
      treemapPath: [],
    })
  }

  const handleNormalizationToggle = () => {
    if (!canUsePerCapitaNormalization) {
      return
    }

    onStateChange({
      normalization: normalizationMode === 'total' ? 'per_capita' : 'total',
    })
  }

  const handleNormalizationOptionsChange = useCallback(
    (next: NormalizationOptions) => {
      if (
        (
          next.normalization === 'total' ||
          (
            next.normalization === 'per_capita' &&
            canUsePerCapitaNormalization
          )
        ) &&
        next.normalization !== normalizationMode
      ) {
        onStateChange({
          normalization: next.normalization,
        })
      }

      const nextGlobalSettingsPatch: {
        currency?: 'RON' | 'EUR' | 'USD'
        inflationAdjusted?: boolean
      } = {}

      if (
        next.currency !== undefined &&
        next.currency !== displayCurrency
      ) {
        nextGlobalSettingsPatch.currency = next.currency
      }

      if (
        next.inflation_adjusted !== undefined &&
        next.inflation_adjusted !== displayInflationAdjusted
      ) {
        nextGlobalSettingsPatch.inflationAdjusted = next.inflation_adjusted
      }

      if (Object.keys(nextGlobalSettingsPatch).length > 0) {
        setSettings(nextGlobalSettingsPatch)
      }
    },
    [
      canUsePerCapitaNormalization,
      displayCurrency,
      displayInflationAdjusted,
      normalizationMode,
      onStateChange,
      setSettings,
    ],
  )

  const handleViewChange = useCallback(
    (nextView: ChallengeEntityAnalysisView) => {
      if (nextView === activeView) {
        return
      }

      onStateChange({
        activeView: nextView,
      })
    },
    [activeView, onStateChange],
  )

  const handleMapPreviewSelection = (nextMapPreviewKey: ChallengeEntityMapPreviewKey) => {
    if (nextMapPreviewKey === mapPreviewKey) {
      return
    }

    onStateChange({
      mapPreviewKey: nextMapPreviewKey,
    })
  }

  const handleMapPreviewSelectorToggle = useCallback(() => {
    setIsMapPreviewSelectorExpanded((previousState) => !previousState)
  }, [])

  const handleTreemapControlsToggle = useCallback(() => {
    setIsTreemapControlsExpanded((previousState) => !previousState)
  }, [])

  const visibleMapPreviewDefinitions = useMemo(
    () =>
      isMapPreviewSelectorExpanded
        ? CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS
        : [selectedMapPreviewDefinition],
    [isMapPreviewSelectorExpanded, selectedMapPreviewDefinition],
  )
  const availableViews = useMemo<readonly ChallengeEntityViewOption[]>(
    () => {
      const views: ChallengeEntityViewOption[] = [
        {
          id: 'main-info',
          label: CHALLENGE_ENTITY_VIEW_LABELS[locale]['main-info'],
        },
        {
          id: 'contracts',
          label: CHALLENGE_ENTITY_VIEW_LABELS[locale].contracts,
        },
        {
          id: 'commitments',
          label: CHALLENGE_ENTITY_VIEW_LABELS[locale].commitments,
        },
      ]

      if (isUatEntity) {
        views.push({
          id: 'ins',
          label: CHALLENGE_ENTITY_VIEW_LABELS[locale].ins,
        })
      }

      views.push({
        id: 'profile',
        label: CHALLENGE_ENTITY_VIEW_LABELS[locale].profile,
      })

      return views
    },
    [
      isUatEntity,
      locale,
    ],
  )

  const handleRetry = () => {
    void entityDetailsQuery.refetch()
    void entityLineItemsQuery.refetch()
  }

  const handleSubordinatesRetry = () => {
    if (!showParentMainCreditorSection) {
      void subordinateRankingQuery.refetch()
    }

    void entityRelationshipsQuery.refetch()
  }

  const handleCategoryEvolutionPrefetch = useCallback(() => {
    void loadChallengeEntityCategoryEvolution()
  }, [])

  const handleReportsSectionPrefetch = useCallback(() => {
    const {
      start: reportDateStart,
      end: reportDateEnd,
    } = getReportDateRange(reportPeriod)

    void loadChallengeEntityReportsSection()
    void queryClient.prefetchQuery(
      reportsConnectionQueryOptions({
        filter: {
          entity_cui: entityCui,
          report_type: selectedReportType,
          report_date_start: reportDateStart || undefined,
          report_date_end: reportDateEnd || undefined,
          main_creditor_cui: inferredMainCreditorCui,
        },
        limit: 24,
        offset: 0,
        enabled: entityCui.length > 0,
      }),
    )
  }, [
    entityCui,
    inferredMainCreditorCui,
    queryClient,
    reportPeriod,
    selectedReportType,
  ])

  if (isInitialLoading) {
    return <ChallengeEntityAnalysisLoadingShell />
  }

  if (entityDetailsQuery.data === null) {
    return (
      <Alert className="rounded-[28px] border-border/60 bg-muted/30">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>{t`Entity not found`}</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            {t`We could not find an entity for this CUI. Check the identifier or search for another entity.`}
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  if (
    entityDetailsQuery.isError ||
    entityLineItemsQuery.isError ||
    !entityDetailsQuery.data
  ) {
    return (
      <Alert className="rounded-[28px] border-destructive/50 bg-destructive/5">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>{t`We could not load the analysis.`}</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            {resolveErrorMessage(
              entityDetailsQuery.error ??
              entityLineItemsQuery.error,
            )}
          </p>
          <Button type="button" variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t`Try Again`}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const entity = entityDetailsQuery.data
  const allowPerCapita = canUsePerCapitaNormalization
  const allowAdministrativeExpenseShortcut = isUatEntity
  const pageLocale = resolveChallengePageLocale(languageQuery)
  const resolvedBelowHeader =
    typeof belowHeader === 'function'
      ? belowHeader({
          entity,
          isUatEntity,
          locale: pageLocale,
        })
      : belowHeader

  const pageCopy = MAP_PREVIEW_MISC_COPY[pageLocale]
  const treemapTitle =
    treemapAccountCategory === 'vn'
      ? pageCopy.revenueDistribution
      : pageCopy.spendingDistribution
  const treemapSubtitle = getTreemapSubtitle(
    languageQuery,
    pageVariant,
    treemapAccountCategory,
    activePrimary,
    selectedReportType,
    normalizationMode,
    expenseType,
    treemapDepth,
  )
  const treemapPrimaryCtaLabel = getTreemapPrimaryCtaLabel(
    languageQuery,
    treemapAccountCategory,
    activePrimary,
  )
  const treemapDepthLabel =
    treemapDepth === 'chapter'
      ? pageCopy.chapter
      : treemapDepth === 'subchapter'
        ? pageCopy.subchapter
        : pageCopy.paragraph
  const treemapDepthCtaLabel = `${pageCopy.detailLevel}: ${treemapDepthLabel}`
  const expenseTypeCtaLabel = `${pageCopy.expenseTypeLabel}: ${getExpenseTypeLabel(
    languageQuery,
    expenseType,
  )}`
  const groupedLineItemsAccountTitle =
    treemapAccountCategory === 'vn'
      ? getLocalizedMapPreviewLabel('income', languageQuery)
      : getLocalizedMapPreviewLabel('expenses', languageQuery)
  const treemapAccountCategoryCtaLabel =
    treemapAccountCategory === 'ch'
      ? pageCopy.showRevenue
      : pageCopy.showSpending
  const reportTypeCtaLabel = getReportTypeCtaLabel(
    languageQuery,
    selectedReportType,
    pageVariant,
    aggregateReportType,
  )
  const normalizationCtaLabel = getNormalizationCtaLabel(
    languageQuery,
    normalizationMode,
  )
  const showsResetTreemapFiltersButton = hasNonDefaultTreemapFilters({
    reportType: selectedReportType,
    normalization: normalizationMode,
    treemapAccountCategory,
    expenseType,
    treemapPrimary,
    treemapDepth,
    treemapPath,
  })
  const treemapSecondaryControlsId = 'challenge-entity-treemap-secondary-controls'
  const showTreemapResetShortcut =
    treemapAccountCategory === 'ch' && breadcrumbs.length > 0
  const markdownExportContext: ChallengeEntityMarkdownExportPageContext = {
    locale: pageLocale,
    entity: {
      name: entity.name,
      cui: entity.cui,
      countyName: entity.uat?.county_name,
      population: entity.is_uat === true ? entity.uat?.population : undefined,
    },
    filters: {
      year: selectedYear,
      reportType: selectedReportType,
      normalization: normalizationMode,
      currency: displayCurrency,
      inflationAdjusted: displayInflationAdjusted,
      treemapAccountCategory,
      budgetTotal:
        treemapAccountCategory === 'vn'
          ? Number(entity.totalIncome ?? 0)
          : Number(entity.totalExpenses ?? 0),
      expenseType,
      treemapPrimary,
      currentTreemapPrimary: activePrimary,
      treemapDepth,
      breadcrumbs,
      ...(treemapExcludeEconomicCodes.length > 0
        ? { excludedEconomicCodes: treemapExcludeEconomicCodes }
        : {}),
      ...(treemapExcludeFunctionalCodes.length > 0
        ? { excludedFunctionalCodes: treemapExcludeFunctionalCodes }
        : {}),
      ...(hasModifiedTreemapRange
        ? {
            amountRange: {
              minValue: treemapValueBounds.minValue,
              maxValue: treemapValueBounds.maxValue,
              selectedMin: amountFilter.range[0],
              selectedMax: amountFilter.range[1],
            },
          }
        : {}),
    },
    treemap: {
      title: treemapTitle,
      subtitle: treemapSubtitle,
      visibleNodes: visibleTreemapNodes,
      ...(showsIncomeEconomicMessage
        ? { unavailableReason: pageCopy.revenueWithoutEconomicCode }
        : {}),
    },
  }
  const hasVisibleSubordinateCards = subordinateCards.length > 0
  const hasVisibleParentMainCreditorCards = parentMainCreditorCards.length > 0
  const summaryTrendLabel =
    periodType === 'QUARTER'
      ? 'QoQ'
      : periodType === 'MONTH'
        ? 'MoM'
        : undefined
  const isSubordinatesSectionLoading =
    showParentMainCreditorSection
      ? (
          !hasVisibleParentMainCreditorCards &&
          entityRelationshipsQuery.isLoading &&
          !entityRelationshipsQuery.data
        )
      : (
          (
            subordinateRankingQuery.isLoading &&
            !subordinateRankingQuery.data
          ) ||
          (
            !hasVisibleSubordinateCards &&
            entityRelationshipsQuery.isLoading &&
            !entityRelationshipsQuery.data
          )
        )
  const isSubordinatesSectionError =
    showParentMainCreditorSection
      ? (
          !hasVisibleParentMainCreditorCards &&
          entityRelationshipsQuery.isError
        )
      : (
          subordinateRankingQuery.isError ||
          (
            !hasVisibleSubordinateCards &&
            entityRelationshipsQuery.isError
          )
        )

  const renderActiveView = () => {
    switch (activeView) {
      case 'contracts':
        return (
          <Suspense fallback={<EntityViewContentFallback />}>
            <DeferredContractsView entity={entity} />
          </Suspense>
        )

      case 'commitments':
        return (
          <Suspense fallback={<EntityViewContentFallback />}>
            <DeferredCommitmentsView
              entity={entity}
              currentYear={selectedYear}
              reportPeriod={reportPeriod}
              trendPeriod={trendPeriod}
              reportType={selectedReportType}
              normalizationOptions={queryNormalizationOptions}
              onNormalizationChange={handleNormalizationOptionsChange}
              commitmentsGrouping={commitmentsGrouping}
              commitmentsDetailLevel={commitmentsDetailLevel}
              onCommitmentsGroupingChange={onCommitmentsViewStateChange}
              onYearChange={handleYearChange}
              onSelectPeriod={handleSelectedPeriodChange}
              selectedQuarter={quarter}
              selectedMonth={month}
              onReportTypeToggle={
                canChangeReportType ? handleReportTypeToggle : undefined
              }
              onNormalizationToggle={
                allowPerCapita ? handleNormalizationToggle : undefined
              }
              reportTypeLabel={reportTypeCtaLabel}
              normalizationLabel={normalizationCtaLabel}
              allowPerCapita={allowPerCapita}
              headerSlot={
                <ChallengeCommitmentsExplainer
                  locale={locale}
                  reportType={selectedReportType}
                  inflationAdjusted={displayInflationAdjusted}
                  isPerCapita={normalizationMode === 'per_capita'}
                />
              }
              reportsSlot={
                <DeferredChallengeEntityReportsSection
                  locale={locale}
                  entityCui={entityCui}
                  reportPeriod={reportPeriod}
                  reportType={toCommitmentReportType(selectedReportType) ?? selectedReportType}
                  mainCreditorCui={inferredMainCreditorCui}
                />
              }
            />
          </Suspense>
        )

      case 'ins':
        return (
          <Suspense fallback={<EntityViewContentFallback />}>
            <DeferredInsStatsView
              entity={entity}
              reportPeriod={reportPeriod}
            />
          </Suspense>
        )

      case 'profile':
        return (
          <Suspense fallback={<EntityViewContentFallback />}>
            <DeferredEntityProfileView entity={entity} />
          </Suspense>
        )

      case 'main-info':
      default:
        return (
          <>
            <ChallengeEntityAnalysisExplainer
              locale={locale}
              reportType={selectedReportType}
              inflationAdjusted={displayInflationAdjusted}
              copyVariant={isUatEntity ? 'city-hall' : 'entity'}
            />

            <EntityFinancialSummary
              totalIncome={entity.totalIncome}
              totalExpenses={entity.totalExpenses}
              budgetBalance={entity.budgetBalance}
              periodLabel={periodLabel}
              normalizationOptions={displayNormalizationOptions}
              trends={summaryTrends}
              trendLabel={summaryTrendLabel}
              density="compact-desktop"
            />

            <EntityFinancialTrends
              entityCui={entityCui}
              incomeTrend={entity.incomeTrend ?? null}
              expenseTrend={entity.expenseTrend ?? null}
              balanceTrend={entity.balanceTrend ?? null}
              currentYear={selectedYear}
              entityName={entity.name}
              normalizationOptions={displayNormalizationOptions}
              onYearChange={handleYearChange}
              onSelectPeriod={handleSelectedPeriodChange}
              periodType={periodType}
              selectedQuarter={quarter}
              selectedMonth={month}
              showControls={false}
              showChartEditorLink={false}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {canChangeReportType ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                  onClick={handleReportTypeToggle}
                >
                  {reportTypeCtaLabel}
                </Button>
              ) : null}
              {allowPerCapita ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                  onClick={handleNormalizationToggle}
                >
                  <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {normalizationCtaLabel}
                </Button>
              ) : null}
            </div>

            {supportsEntityMapPreview ? (
              <div className="space-y-3">
                {isPublicMapPreviewReady ? (
                  <Suspense fallback={<MapPreviewSectionFallback />}>
                    <DeferredMapAnalyticsPublicPreviewCard
                      mapKey={selectedMapPreviewDefinition.key}
                      mapDescription={selectedMapPreviewCopy.mapDescription}
                      mapStateDefinition={selectedMapPreviewStateDefinition}
                      reportPeriodOverride={reportPeriod}
                      selectedYearOverride={selectedYear}
                      reportTypeOverride={toReportTypeValue(selectedReportType)}
                      normalizationOverride={normalizationMode}
                      currencyOverride={currency}
                      inflationAdjustedOverride={inflationAdjusted}
                      mapNameOverride={localizedSelectedMapPreviewName}
                      mapZoomOverride={publicMapViewport.mapZoom}
                      mapCenterOverride={publicMapViewport.mapCenter}
                      mapViewType={entityMapViewType}
                      onMapViewportChange={handlePublicMapViewportChange}
                      onEntityCuiSelect={onEntityCuiChange}
                    />
                  </Suspense>
                ) : (
                  <MapPreviewSectionFallback />
                )}

                <div
                  id="challenge-entity-map-preview-switcher"
                  className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
                >
                  {visibleMapPreviewDefinitions.map((mapPreviewDefinition) => (
                    <Button
                      key={mapPreviewDefinition.key}
                      type="button"
                      variant={
                        mapPreviewDefinition.key === selectedMapPreviewDefinition.key
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                      onClick={() =>
                        handleMapPreviewSelection(mapPreviewDefinition.key)
                      }
                    >
                      {getLocalizedMapPreviewLabel(
                        mapPreviewDefinition.key,
                        languageQuery,
                      )}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-full rounded-full sm:w-9"
                    onClick={handleMapPreviewSelectorToggle}
                    aria-controls="challenge-entity-map-preview-switcher"
                    aria-expanded={isMapPreviewSelectorExpanded}
                    aria-label={
                      isMapPreviewSelectorExpanded
                        ? pageCopy.hideMapPreviewOptions
                        : pageCopy.showMapPreviewOptions
                    }
                  >
                    {isMapPreviewSelectorExpanded ? <Minus /> : <Plus />}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <Card className="rounded-[28px] border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-black tracking-tight">
                        {treemapTitle}
                      </CardTitle>
                      <p className="text-sm font-medium text-muted-foreground">
                        {showsIncomeEconomicMessage
                          ? pageCopy.revenueWithoutEconomicCode
                          : treemapSubtitle}
                      </p>
                    </div>
                    {showsIncomeEconomicMessage ? null : (
                      <FilteredSpendingInfo
                        excludedItemsSummary={excludedItemsSummary ?? undefined}
                        unit={treemapUnit}
                        amountFilter={amountFilter}
                        triggerVariant="icon"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
                    {showsIncomeEconomicMessage ? (
                      <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                        {pageCopy.revenueWithoutEconomicCode}
                      </div>
                    ) : (
                      <BudgetTreemap
                        data={treemapData}
                        primary={activePrimary}
                        onNodeClick={onNodeClick}
                        onBreadcrumbClick={onBreadcrumbClick}
                        path={breadcrumbs}
                        normalization={displayNormalizationOptions.normalization}
                        currency={displayNormalizationOptions.currency}
                        excludedItemsSummary={excludedItemsSummary}
                        amountFilter={amountFilter}
                        onAnalyticsRequest={handleBudgetItemAnalyticsRequest}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={handleTreemapAccountCategoryToggle}
                      >
                        {treemapAccountCategoryCtaLabel}
                      </Button>
                      {isIncomeTreemap ? null : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                          onClick={handleTreemapPrimaryToggle}
                        >
                          {treemapPrimaryCtaLabel}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="w-full rounded-full sm:w-9"
                        onClick={handleTreemapControlsToggle}
                        aria-controls={treemapSecondaryControlsId}
                        aria-expanded={isTreemapControlsExpanded}
                        aria-label={
                          isTreemapControlsExpanded
                            ? pageCopy.hideExtraOptions
                            : pageCopy.showExtraOptions
                        }
                      >
                        {isTreemapControlsExpanded ? <Minus /> : <Plus />}
                      </Button>
                    </div>
                    <Collapsible
                      open={isTreemapControlsExpanded}
                      onOpenChange={setIsTreemapControlsExpanded}
                    >
                      <CollapsibleContent
                        id={treemapSecondaryControlsId}
                        className="space-y-2"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {allowPerCapita ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                              onClick={handleNormalizationToggle}
                            >
                              <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                              {normalizationCtaLabel}
                            </Button>
                          ) : null}
                          {isIncomeTreemap ? null : showTreemapResetShortcut ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                              onClick={handleResetTreemapToAllExpenses}
                            >
                              {pageCopy.showAllSpending}
                            </Button>
                          ) : allowAdministrativeExpenseShortcut ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                              onClick={handleAdministrativeExpensesShortcut}
                            >
                              {pageVariant === 'entities'
                                ? pageCopy.showEntityAdministrativeSpending
                                : pageCopy.showAdministrativeSpending}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                            onClick={handleTreemapDepthToggle}
                          >
                            {treemapDepthCtaLabel}
                          </Button>
                          {isIncomeTreemap ? null : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                              onClick={handleExpenseTypeToggle}
                            >
                              {expenseTypeCtaLabel}
                            </Button>
                          )}
                          {showsResetTreemapFiltersButton ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                              onClick={handleResetTreemapFilters}
                            >
                              {pageCopy.resetFilters}
                            </Button>
                          ) : null}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  <ChallengeEntityGroupedLineItems
                    accountTitle={groupedLineItemsAccountTitle}
                    lineItems={groupedLineItems}
                    accountCategory={treemapAccountCategory}
                    groupBy={treemapPrimary}
                    depth={treemapDepth}
                    currentYear={selectedYear}
                    normalizationOptions={displayNormalizationOptions}
                    presetSearchTerm={groupedLineItemsPresetSearchTerm}
                    onAnalyticsRequest={handleBudgetItemAnalyticsRequest}
                    exportContext={markdownExportContext}
                  />
                </CardContent>
              </Card>
            </div>

            <DeferredSectionGate
              className="min-h-[520px] sm:min-h-[540px]"
              fallback={
                <DeferredSectionFallback
                  titleWidthClassName="w-52"
                  bodyHeightClassName="h-[360px]"
                  showControls
                />
              }
              onPrefetch={handleCategoryEvolutionPrefetch}
            >
              <DeferredChallengeEntityCategoryEvolution
                locale={locale}
                entityCui={entityCui}
                lineItems={entityLineItemsQuery.data?.nodes ?? []}
                currentYear={selectedYear}
                reportType={selectedReportType}
                periodType={periodType}
                trendPeriod={trendPeriod}
                queryNormalizationOptions={queryNormalizationOptions}
                displayNormalizationOptions={displayNormalizationOptions}
                onYearChange={handleYearChange}
                onSelectPeriod={handleSelectedPeriodChange}
                selectedQuarter={quarter}
                selectedMonth={month}
                accountCategory={evolutionAccountCategory}
                primary={evolutionPrimary}
                onStateChange={(patch) => onStateChange(patch)}
              />
            </DeferredSectionGate>

            <ChallengeEntitySubordinatesSection
              locale={locale}
              items={
                showParentMainCreditorSection
                  ? parentMainCreditorCards
                  : subordinateCards
              }
              totalResultsCount={
                showParentMainCreditorSection
                  ? parentMainCreditorCards.length
                  : totalSubordinateCount
              }
              isLoading={isSubordinatesSectionLoading}
              isError={isSubordinatesSectionError}
              onRetry={handleSubordinatesRetry}
              normalizationOptions={displayNormalizationOptions}
              showAllSearch={
                showParentMainCreditorSection
                  ? undefined
                  : showAllSubordinatesSearch
              }
              emptyStateKind={hasLinkedSubordinates ? 'spending' : 'children'}
              variant={
                showParentMainCreditorSection
                  ? 'parent-main-creditors'
                  : 'subordinates'
              }
            />

            <DeferredSectionGate
              fallback={
                <DeferredSectionFallback
                  titleWidthClassName="w-44"
                  bodyHeightClassName="h-[220px]"
                />
              }
              onPrefetch={handleReportsSectionPrefetch}
            >
              <DeferredChallengeEntityReportsSection
                locale={locale}
                entityCui={entityCui}
                reportPeriod={reportPeriod}
                reportType={selectedReportType}
                mainCreditorCui={inferredMainCreditorCui}
              />
            </DeferredSectionGate>

            <ChallengeEntityViewNavigator
              views={availableViews}
              activeView={activeView}
              onViewChange={handleViewChange}
              locale={locale}
            />

            <ChallengeEntityFaqSection
              locale={locale}
              inflationAdjusted={displayInflationAdjusted}
            />
          </>
        )
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">
      <ChallengeEntityAnalysisHeader
        entity={entity}
        reportControlsLabel={periodLabel}
        renderReportControls={() => (
          <ChallengeEntityReportControls
            locale={languageQuery}
            periodType={periodType}
            selectedYear={selectedYear}
            quarter={quarter}
            month={month}
            availableYears={CHALLENGE_AVAILABLE_YEARS}
            reportType={selectedReportType}
            reportTypeOptions={reportTypeOptions}
            reportCopyVariant={
              pageVariant === 'entities' ? 'entity' : 'city-hall'
            }
            showReportTypeControl={canChangeReportType}
            mainCreditorOptions={mainCreditorOptions}
            mainCreditorCui={inferredMainCreditorCui}
            onChange={handleReportControlsChange}
          />
        )}
        activeView={activeView}
        availableViews={availableViews}
        onViewChange={handleViewChange}
        showInflationBadge={displayInflationAdjusted}
        languageQuery={languageQuery}
      />

      {resolvedBelowHeader}

      {renderActiveView()}

      {isBudgetItemAnalyticsOpen && selectedBudgetItemAnalyticsProps ? (
        <Suspense fallback={null}>
          <DeferredBudgetItemAnalyticsModal
            open={isBudgetItemAnalyticsOpen}
            onOpenChange={handleBudgetItemAnalyticsOpenChange}
            analyticsProps={selectedBudgetItemAnalyticsProps}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
