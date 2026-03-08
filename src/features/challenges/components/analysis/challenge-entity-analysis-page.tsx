import { t } from '@lingui/core/macro'
import { AlertTriangle, Minus, Plus, RefreshCw, Users } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import { FilteredSpendingInfo } from '@/components/budget-explorer/FilteredSpendingInfo'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import { getEntityFeatureInfo } from '@/components/entities/utils'
import { EntityFinancialSummary, type EntityFinancialSummaryTrend } from '@/components/entities/EntityFinancialSummary'
import { EntityFinancialTrends } from '@/components/entities/EntityFinancialTrends'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'
import { useEntityTypeLabel } from '@/hooks/filters/useFilterLabels'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import {
  DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
  DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES,
} from '@/lib/analytics-defaults'
import type { EntityDetailsData, ExecutionLineItem } from '@/lib/api/entities'
import { DEFAULT_CURRENCY, DEFAULT_INFLATION_ADJUSTED } from '@/lib/globalSettings/params'
import { useGlobalSettings } from '@/lib/hooks/useGlobalSettings'
import {
  useEntityDetails,
  useEntityExecutionLineItems,
  reportsConnectionQueryOptions,
} from '@/lib/hooks/useEntityDetails'
import type { NormalizationOptions } from '@/lib/normalization'
import { DEFAULT_SELECTED_YEAR, defaultYearRange } from '@/schemas/charts'
import {
  type GqlReportType,
  toReportTypeValue,
} from '@/schemas/reporting'
import type { ChallengeLocale } from '../../types'
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport'
import { areMapCentersEqual } from '@/features/advanced-map-analytics/map-viewport-utils'
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics'
import { ChallengeEntityAnalysisLoadingShell } from './challenge-entity-analysis-loading-shell'
import { ChallengeEntityAnalysisExplainer } from './challenge-entity-analysis-explainer'
import { ChallengeEntityFaqSection } from './challenge-entity-faq-section'
import { ChallengeEntityAnalysisHeader } from './challenge-entity-analysis-header'
import { ChallengeEntityAnomalySummary } from './challenge-entity-anomaly-summary'
import {
  CHALLENGE_TREND_PERIOD,
  buildChallengeEntityAnalysisReportPeriod,
  challengeEntitySubordinateRankingQueryOptions,
  type ChallengeEntityInitialSettings,
} from './challenge-entity-analysis-queries'
import { ChallengeEntityGroupedLineItems } from './challenge-entity-grouped-line-items'
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

type ChallengeEntityAnalysisPageProps = {
  readonly entityCui: string
  readonly languageQuery?: ChallengeLocale
  readonly state: ChallengeEntityAnalysisPageState
  readonly initialSettings?: ChallengeEntityInitialSettings
  readonly onStateChange: (
    patch: Partial<ChallengeEntityAnalysisPageState>,
  ) => void
  readonly onEntityResolved?: () => void
}

export type ChallengeTreemapAccountCategory = 'ch' | 'vn'
export type ChallengeEntityReportType = Extract<
  GqlReportType,
  'PRINCIPAL_AGGREGATED' | 'DETAILED'
>
export type ChallengeEntityAnalysisPageState = {
  readonly selectedYear: number
  readonly reportType: ChallengeEntityReportType
  readonly normalization: 'total' | 'per_capita'
  readonly treemapAccountCategory: ChallengeTreemapAccountCategory
  readonly treemapPrimary: 'fn' | 'ec'
  readonly treemapPath: readonly string[]
  readonly evolutionAccountCategory: ChallengeTreemapAccountCategory
  readonly evolutionPrimary: 'fn' | 'ec'
  readonly mapPreviewKey: ChallengeEntityMapPreviewKey
}

const CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH = ['51', '51.01', '51.01.03'] as const
const CHALLENGE_SHOW_PERIOD_GROWTH = false
const CHALLENGE_AVAILABLE_YEARS = Array.from(
  { length: DEFAULT_SELECTED_YEAR - defaultYearRange.start + 1 },
  (_, index) => DEFAULT_SELECTED_YEAR - index,
)

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
const CHALLENGE_DETAILED_ANALYTICS_REPORT_TYPE = toReportTypeValue('DETAILED')

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
    revenueWithoutEconomicCode: 'Veniturile nu au cod economic.',
    showMapPreviewOptions: 'Arată opțiunile hărții',
    hideMapPreviewOptions: 'Ascunde opțiunile hărții',
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
    revenueWithoutEconomicCode: 'Revenue has no economic code.',
    showMapPreviewOptions: 'Show map preview options',
    hideMapPreviewOptions: 'Hide map preview options',
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
  selectedYear: number,
): string {
  return `${getLocalizedMapPreviewBaseName(previewKey, locale)} (${selectedYear})`
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
  selectedYear: number,
): EntityFinancialSummaryTrend | undefined {
  const points = series?.data ?? []
  const selectedPointIndex = points.findIndex(
    (point) => Number(String(point.x).slice(0, 4)) === selectedYear,
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
  accountCategory: ChallengeTreemapAccountCategory,
  activePrimary: 'fn' | 'ec',
) {
  const pageCopy = MAP_PREVIEW_MISC_COPY[resolveChallengePageLocale(locale)]

  if (accountCategory === 'vn') {
    return activePrimary === 'ec'
      ? pageCopy.revenueSources
      : pageCopy.revenueGrouped
  }

  return activePrimary === 'ec'
    ? pageCopy.spendingUses
    : pageCopy.spendingGrouped
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
) {
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

export function ChallengeEntityAnalysisPage({
  entityCui,
  languageQuery,
  state,
  initialSettings,
  onStateChange,
  onEntityResolved,
}: ChallengeEntityAnalysisPageProps) {
  const {
    selectedYear,
    reportType: selectedReportType,
    normalization: normalizationMode,
    treemapAccountCategory,
    treemapPrimary,
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
  const [publicMapViewport, setPublicMapViewport] =
    useState<PublicMapViewport>()
  const seededPublicMapEntityCuiRef = useRef<string | null>(null)
  const seededPublicMapViewportSourceRef = useRef<'fallback' | 'entity' | null>(
    null,
  )
  const lastAutoSeededPublicMapViewportRef = useRef<
    PublicMapViewport | undefined
  >(undefined)
  const {
    currency,
    inflationAdjusted,
    displayCurrency,
    displayInflationAdjusted,
    confirmSettingsApplied,
  } = useGlobalSettings(initialSettings ?? {
    currency: DEFAULT_CURRENCY,
    inflationAdjusted: DEFAULT_INFLATION_ADJUSTED,
  })
  const reportPeriod = useMemo(
    () => buildChallengeEntityAnalysisReportPeriod(selectedYear),
    [selectedYear],
  )
  const periodLabel = `${selectedYear}`
  const queryNormalizationOptions = useMemo<NormalizationOptions>(
    () => ({
      normalization: normalizationMode,
      show_period_growth: CHALLENGE_SHOW_PERIOD_GROWTH,
      currency,
      inflation_adjusted: inflationAdjusted,
    }),
    [currency, inflationAdjusted, normalizationMode],
  )
  const displayNormalizationOptions = useMemo<NormalizationOptions>(
    () => ({
      normalization: normalizationMode,
      show_period_growth: CHALLENGE_SHOW_PERIOD_GROWTH,
      currency: displayCurrency,
      inflation_adjusted: displayInflationAdjusted,
    }),
    [displayCurrency, displayInflationAdjusted, normalizationMode],
  )
  const selectedMapPreviewCopy = useMemo(
    () =>
      selectedMapPreviewDefinition.buildPreviewCopy({
        selectedYear,
        normalization: normalizationMode,
        currency,
        inflationAdjusted,
        reportType: selectedReportType,
      }),
    [
      currency,
      inflationAdjusted,
      normalizationMode,
      selectedReportType,
      selectedMapPreviewDefinition,
      selectedYear,
    ],
  )
  const localizedSelectedMapPreviewName = useMemo(
    () =>
      formatLocalizedMapPreviewName(
        selectedMapPreviewDefinition.key,
        languageQuery,
        selectedYear,
      ),
    [languageQuery, selectedMapPreviewDefinition.key, selectedYear],
  )
  const entityDetailsQuery = useEntityDetails({
    cui: entityCui,
    reportPeriod,
    reportType: selectedReportType,
    trendPeriod: CHALLENGE_TREND_PERIOD,
    ...queryNormalizationOptions,
  })
  const entityLineItemsQuery = useEntityExecutionLineItems({
    cui: entityCui,
    reportPeriod,
    reportType: selectedReportType,
    ...queryNormalizationOptions,
  })
  const entityMapViewType = useMemo<'UAT' | 'County'>(() => {
    if (
      entityDetailsQuery.data?.entity_type === 'admin_county_council' ||
      entityDetailsQuery.data?.cui === '4267117'
    ) {
      return 'County'
    }

    return 'UAT'
  }, [entityDetailsQuery.data?.cui, entityDetailsQuery.data?.entity_type])
  const entityGeoJsonQuery = useGeoJsonData(entityMapViewType)
  const entityGeoJsonData = entityGeoJsonQuery.data

  const subordinateRankingQuery = useQuery({
    ...challengeEntitySubordinateRankingQueryOptions({
      entityCui,
      reportPeriod,
      normalizationOptions: {
        currency,
        inflation_adjusted: inflationAdjusted,
      },
    }),
    placeholderData: (previousData) => previousData,
  })

  const isInitialLoading =
    (entityDetailsQuery.isLoading && !entityDetailsQuery.data) ||
    (entityLineItemsQuery.isLoading && !entityLineItemsQuery.data)

  const treemapLineItems = useMemo(
    () =>
      (entityLineItemsQuery.data?.nodes ?? []).filter(
        (lineItem) => lineItem.account_category === treemapAccountCategory,
      ),
    [entityLineItemsQuery.data?.nodes, treemapAccountCategory],
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
    rootDepth: 2,
    excludeEcCodes: treemapExcludeEconomicCodes,
    excludeFnCodes: treemapExcludeFunctionalCodes,
    onPathChange: (path) => onStateChange({ treemapPath: path }),
  })
  const { amountFilter, unit: treemapUnit } = useTreemapAmountFilter({
    data: treemapData,
    normalization: displayNormalizationOptions.normalization,
    currency: displayNormalizationOptions.currency,
  })

  const visibleSubordinateRankings = useMemo(
    () => subordinateRankingQuery.data?.nodes ?? [],
    [subordinateRankingQuery.data?.nodes],
  )
  const totalSubordinateCount =
    subordinateRankingQuery.data?.pageInfo?.totalCount ?? 0

  const summaryTrends = useMemo(
    () => ({
      income: toTrendValues(entityDetailsQuery.data?.incomeTrend, selectedYear),
      expenses: toTrendValues(
        entityDetailsQuery.data?.expenseTrend,
        selectedYear,
      ),
      balance: toTrendValues(
        entityDetailsQuery.data?.balanceTrend,
        selectedYear,
      ),
    }),
    [
      entityDetailsQuery.data?.balanceTrend,
      entityDetailsQuery.data?.expenseTrend,
      entityDetailsQuery.data?.incomeTrend,
      selectedYear,
    ],
  )

  const parentPopulation = entityDetailsQuery.data?.uat?.population ?? 0

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
            period: 'YEAR',
            report_type: 'DETAILED',
            main_creditor_cui: entityCui,
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
      languageQuery,
      normalizationMode,
      parentPopulation,
      selectedYear,
      visibleSubordinateRankings,
    ],
  )

  const entityPublicMapViewport = useMemo(() => {
    if (!entityDetailsQuery.data || !entityGeoJsonData) {
      return undefined
    }

    return toPublicMapViewport(
      getEntityFeatureInfo(entityDetailsQuery.data, entityGeoJsonData),
    )
  }, [entityDetailsQuery.data, entityGeoJsonData])
  const isEntityPublicMapViewportReady = useMemo(
    () =>
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
        report_type: CHALLENGE_DETAILED_ANALYTICS_REPORT_TYPE,
        normalization: normalizationMode,
        currency: displayCurrency,
        inflation_adjusted: displayInflationAdjusted,
        show_period_growth: CHALLENGE_SHOW_PERIOD_GROWTH,
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
    ],
  )

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

  const handleYearChange = (nextYear: number) => {
    if (!Number.isFinite(nextYear) || nextYear === selectedYear) {
      return
    }

    onStateChange({ selectedYear: nextYear })
  }

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

  const handleAdministrativeExpensesShortcut = () => {
    onStateChange({
      treemapAccountCategory: 'ch',
      treemapPrimary: 'fn',
      treemapPath: [...CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH],
    })
  }

  const handleResetTreemapToAllExpenses = () => {
    onStateChange({
      treemapAccountCategory: 'ch',
      treemapPrimary: activePrimary,
      treemapPath: [],
    })
  }

  const handleReportTypeToggle = () => {
    const nextReportType =
      selectedReportType === 'PRINCIPAL_AGGREGATED'
        ? 'DETAILED'
        : 'PRINCIPAL_AGGREGATED'

    onStateChange({
      reportType: nextReportType,
      treemapPath: [],
    })
  }

  const handleNormalizationToggle = () => {
    onStateChange({
      normalization: normalizationMode === 'total' ? 'per_capita' : 'total',
    })
  }

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

  const visibleMapPreviewDefinitions = useMemo(
    () =>
      isMapPreviewSelectorExpanded
        ? CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS
        : [selectedMapPreviewDefinition],
    [isMapPreviewSelectorExpanded, selectedMapPreviewDefinition],
  )

  const handleRetry = () => {
    void entityDetailsQuery.refetch()
    void entityLineItemsQuery.refetch()
  }

  const handleSubordinatesRetry = () => {
    void subordinateRankingQuery.refetch()
  }

  const handleCategoryEvolutionPrefetch = useCallback(() => {
    void loadChallengeEntityCategoryEvolution()
  }, [])

  const handleReportsSectionPrefetch = useCallback(() => {
    void loadChallengeEntityReportsSection()
    void queryClient.prefetchQuery(
      reportsConnectionQueryOptions({
        filter: {
          entity_cui: entityCui,
          reporting_year: selectedYear,
          report_type: selectedReportType,
        },
        limit: 24,
        offset: 0,
        enabled: entityCui.length > 0,
      }),
    )
  }, [entityCui, queryClient, selectedReportType, selectedYear])

  if (isInitialLoading) {
    return <ChallengeEntityAnalysisLoadingShell />
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

  const pageCopy = MAP_PREVIEW_MISC_COPY[resolveChallengePageLocale(languageQuery)]
  const treemapTitle =
    treemapAccountCategory === 'vn'
      ? pageCopy.revenueDistribution
      : pageCopy.spendingDistribution
  const isIncomeTreemap = treemapAccountCategory === 'vn'
  const showsIncomeEconomicMessage = isIncomeTreemap && activePrimary === 'ec'
  const treemapSubtitle = getTreemapSubtitle(
    languageQuery,
    treemapAccountCategory,
    activePrimary,
  )
  const treemapPrimaryCtaLabel = getTreemapPrimaryCtaLabel(
    languageQuery,
    treemapAccountCategory,
    activePrimary,
  )
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
  )
  const normalizationCtaLabel = getNormalizationCtaLabel(
    languageQuery,
    normalizationMode,
  )
  const showTreemapResetShortcut =
    treemapAccountCategory === 'ch' && breadcrumbs.length > 0
  const isSubordinatesSectionLoading =
    subordinateRankingQuery.isLoading && !subordinateRankingQuery.data
  const isSubordinatesSectionError = subordinateRankingQuery.isError

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">
      <ChallengeEntityAnalysisHeader
        entity={entityDetailsQuery.data}
        selectedYear={selectedYear}
        availableYears={CHALLENGE_AVAILABLE_YEARS}
        onYearChange={handleYearChange}
        showInflationBadge={displayInflationAdjusted}
        languageQuery={languageQuery}
      />

      <ChallengeEntityAnalysisExplainer
        locale={locale}
        reportType={selectedReportType}
        inflationAdjusted={displayInflationAdjusted}
      />

      <EntityFinancialSummary
        totalIncome={entityDetailsQuery.data.totalIncome}
        totalExpenses={entityDetailsQuery.data.totalExpenses}
        budgetBalance={entityDetailsQuery.data.budgetBalance}
        periodLabel={periodLabel}
        normalizationOptions={displayNormalizationOptions}
        trends={summaryTrends}
        density="compact-desktop"
      />

      <EntityFinancialTrends
        entityCui={entityCui}
        incomeTrend={entityDetailsQuery.data.incomeTrend ?? null}
        expenseTrend={entityDetailsQuery.data.expenseTrend ?? null}
        balanceTrend={entityDetailsQuery.data.balanceTrend ?? null}
        currentYear={selectedYear}
        entityName={entityDetailsQuery.data.name}
        normalizationOptions={displayNormalizationOptions}
        onYearChange={handleYearChange}
        showControls={false}
        showChartEditorLink={false}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
          onClick={handleReportTypeToggle}
        >
          {reportTypeCtaLabel}
        </Button>
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
      </div>

      <div className="space-y-3">
        {isPublicMapPreviewReady ? (
          <Suspense fallback={<MapPreviewSectionFallback />}>
            <DeferredMapAnalyticsPublicPreviewCard
              mapKey={selectedMapPreviewDefinition.key}
              mapDescription={selectedMapPreviewCopy.mapDescription}
              mapStateDefinition={selectedMapPreviewStateDefinition}
              selectedYearOverride={selectedYear}
              reportTypeOverride={toReportTypeValue(selectedReportType)}
              normalizationOverride={normalizationMode}
              currencyOverride={currency}
              inflationAdjustedOverride={inflationAdjusted}
              mapNameOverride={localizedSelectedMapPreviewName}
              mapZoomOverride={publicMapViewport.mapZoom}
              mapCenterOverride={publicMapViewport.mapCenter}
              onMapViewportChange={handlePublicMapViewportChange}
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
            className="rounded-full"
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
                />
              )}
            </div>

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
                size="sm"
                className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                onClick={handleNormalizationToggle}
              >
                <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {normalizationCtaLabel}
              </Button>
              <div className="hidden basis-full sm:block" />
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
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                  onClick={handleAdministrativeExpensesShortcut}
                >
                  {pageCopy.showAdministrativeSpending}
                </Button>
              )}
            </div>

            <ChallengeEntityGroupedLineItems
              accountTitle={groupedLineItemsAccountTitle}
              lineItems={groupedLineItems}
              accountCategory={treemapAccountCategory}
              groupBy={treemapPrimary}
              currentYear={selectedYear}
              normalizationOptions={displayNormalizationOptions}
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
          trendPeriod={CHALLENGE_TREND_PERIOD}
          queryNormalizationOptions={queryNormalizationOptions}
          displayNormalizationOptions={displayNormalizationOptions}
          onYearChange={handleYearChange}
          accountCategory={evolutionAccountCategory}
          primary={evolutionPrimary}
          onStateChange={(patch) => onStateChange(patch)}
        />
      </DeferredSectionGate>

      <ChallengeEntitySubordinatesSection
        locale={locale}
        items={subordinateCards}
        totalResultsCount={totalSubordinateCount}
        isLoading={isSubordinatesSectionLoading}
        isError={isSubordinatesSectionError}
        onRetry={handleSubordinatesRetry}
        normalizationOptions={displayNormalizationOptions}
        showAllSearch={showAllSubordinatesSearch}
      />

      <ChallengeEntityAnomalySummary
        locale={locale}
        lineItems={entityLineItemsQuery.data?.nodes ?? []}
        normalizationOptions={displayNormalizationOptions}
      />

      <DeferredSectionGate
        className="min-h-[320px] sm:min-h-[360px]"
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
          selectedYear={selectedYear}
          reportType={selectedReportType}
        />
      </DeferredSectionGate>

      <ChallengeEntityFaqSection
        locale={locale}
        inflationAdjusted={displayInflationAdjusted}
      />
    </div>
  )
}
