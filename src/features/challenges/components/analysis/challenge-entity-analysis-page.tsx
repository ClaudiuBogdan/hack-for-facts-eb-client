import { t } from '@lingui/core/macro'
import { AlertTriangle, RefreshCw, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { useTreemapDrilldown } from '@/components/budget-explorer/useTreemapDrilldown'
import { EntityFinancialSummary, type EntityFinancialSummaryTrend } from '@/components/entities/EntityFinancialSummary'
import { EntityFinancialSummarySkeleton } from '@/components/entities/EntityFinancialSummarySkeleton'
import { EntityFinancialTrends } from '@/components/entities/EntityFinancialTrends'
import { EntityFinancialTrendsSkeleton } from '@/components/entities/EntityFinancialTrendsSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEntityTypeLabel } from '@/hooks/filters/useFilterLabels'
import {
  DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
  DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES,
} from '@/lib/analytics-defaults'
import { fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import type { EntityDetailsData } from '@/lib/api/entities'
import { DEFAULT_CURRENCY, DEFAULT_INFLATION_ADJUSTED } from '@/lib/globalSettings/params'
import { useGlobalSettings } from '@/lib/hooks/useGlobalSettings'
import {
  useEntityDetails,
  useEntityExecutionLineItems,
  useEntityRelationships,
} from '@/lib/hooks/useEntityDetails'
import type { NormalizationOptions } from '@/lib/normalization'
import { DEFAULT_SELECTED_YEAR, defaultYearRange } from '@/schemas/charts'
import {
  type DateInput,
  type GqlReportType,
  makeSingleTimePeriod,
  makeTrendPeriod,
  type ReportPeriodInput,
  toReportTypeValue,
} from '@/schemas/reporting'
import type { ChallengeLocale } from '../../types'
import { ChallengeEntityAnalysisExplainer } from './challenge-entity-analysis-explainer'
import { ChallengeEntityAnalysisHeader } from './challenge-entity-analysis-header'
import { ChallengeEntityAnomalySummary } from './challenge-entity-anomaly-summary'
import { ChallengeEntityCategoryEvolution } from './challenge-entity-category-evolution'
import {
  ChallengeEntitySubordinatesSection,
  type ChallengeEntitySubordinateCardItem,
} from './challenge-entity-subordinates-section'

type ChallengeEntityAnalysisPageProps = {
  readonly entityCui: string
  readonly languageQuery?: ChallengeLocale
  readonly state: ChallengeEntityAnalysisPageState
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
}

const CHALLENGE_TREND_PERIOD = makeTrendPeriod(
  'YEAR',
  DEFAULT_SELECTED_YEAR,
  defaultYearRange.start,
  DEFAULT_SELECTED_YEAR,
) as ReportPeriodInput
const CHALLENGE_DETAILED_ANALYTICS_REPORT_TYPE = toReportTypeValue('DETAILED')
const MAX_VISIBLE_SUBORDINATE_CARDS = 3
const CHALLENGE_ADMINISTRATIVE_EXPENSE_PATH = ['51', '51.01', '51.01.03'] as const
const CHALLENGE_SHOW_PERIOD_GROWTH = false
const CHALLENGE_AVAILABLE_YEARS = Array.from(
  { length: DEFAULT_SELECTED_YEAR - defaultYearRange.start + 1 },
  (_, index) => DEFAULT_SELECTED_YEAR - index,
)

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

  return t`Încearcă din nou peste câteva momente.`
}

function getTreemapTitle(accountCategory: ChallengeTreemapAccountCategory) {
  return accountCategory === 'vn'
    ? t`Distribuția Veniturilor`
    : t`Distribuția Cheltuielilor`
}

function getTreemapSubtitle(
  accountCategory: ChallengeTreemapAccountCategory,
  activePrimary: 'fn' | 'ec',
) {
  if (accountCategory === 'vn') {
    return activePrimary === 'ec'
      ? t`Din ce au venit banii`
      : t`Cum sunt grupate veniturile`
  }

  return activePrimary === 'ec'
    ? t`Pe ce s-au cheltuit banii`
    : t`Cum s-au cheltuit banii`
}

function getTreemapPrimaryCtaLabel(
  accountCategory: ChallengeTreemapAccountCategory,
  activePrimary: 'fn' | 'ec',
) {
  if (accountCategory === 'vn') {
    return activePrimary === 'ec'
      ? t`Arată cum sunt grupate veniturile`
      : t`Arată din ce au venit banii`
  }

  return activePrimary === 'ec'
    ? t`Arată cum s-au cheltuit banii`
    : t`Arată pe ce s-au cheltuit banii`
}

export function ChallengeEntityAnalysisLoadingShell() {
  return (
    <div className="space-y-6" aria-label={t`Loading…`}>
      <section className="rounded-[32px] border border-border/50 bg-background px-6 py-7 shadow-sm sm:px-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      </section>

      <Card className="rounded-[28px] border-border/50">
        <CardContent className="space-y-3 px-6 py-6">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>

      <EntityFinancialSummarySkeleton />
      <EntityFinancialTrendsSkeleton />

      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[520px] w-full" />
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-[24px]" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function ChallengeEntityAnalysisPage({
  entityCui,
  languageQuery,
  state,
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
  } = state
  const locale = languageQuery === 'en' ? 'en' : 'ro'
  const entityTypeLabel = useEntityTypeLabel()
  const {
    currency,
    inflationAdjusted,
    displayCurrency,
    displayInflationAdjusted,
    confirmSettingsApplied,
  } = useGlobalSettings({
    currency: DEFAULT_CURRENCY,
    inflationAdjusted: DEFAULT_INFLATION_ADJUSTED,
  })
  const reportPeriod = useMemo(
    () =>
      makeSingleTimePeriod(
        'YEAR',
        `${selectedYear}` as DateInput,
      ) as ReportPeriodInput,
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
  const relationshipsQuery = useEntityRelationships({
    cui: entityCui,
  })

  const subordinateEntityCuis = useMemo(
    () =>
      (relationshipsQuery.data?.children ?? [])
        .map((child) => child.cui)
        .filter((childCui): childCui is string => Boolean(childCui)),
    [relationshipsQuery.data?.children],
  )

  const subordinateRankingQuery = useQuery({
    queryKey: [
      'challenge-entity-subordinates',
      entityCui,
      subordinateEntityCuis,
      reportPeriod,
      currency,
      inflationAdjusted,
    ],
    queryFn: () =>
      fetchEntityAnalytics({
        filter: {
          account_category: 'ch',
          main_creditor_cui: entityCui,
          entity_cuis: subordinateEntityCuis,
          report_period: reportPeriod,
          report_type: CHALLENGE_DETAILED_ANALYTICS_REPORT_TYPE,
          normalization: 'total',
          currency,
          inflation_adjusted: inflationAdjusted,
          show_period_growth: CHALLENGE_SHOW_PERIOD_GROWTH,
        },
        sort: {
          by: 'total_amount',
          order: 'desc',
        },
        limit: subordinateEntityCuis.length,
      }),
    enabled: subordinateEntityCuis.length > 0,
    staleTime: 1000 * 60 * 5,
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
    excludeEcCodes:
      treemapAccountCategory === 'ch'
        ? [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES]
        : [],
    excludeFnCodes:
      treemapAccountCategory === 'vn'
        ? [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES]
        : [],
    onPathChange: (path) => onStateChange({ treemapPath: path }),
  })

  const visibleSubordinateRankings = useMemo(
    () =>
      [...(subordinateRankingQuery.data?.nodes ?? [])]
        .filter((node) => Number(node.total_amount ?? node.amount ?? 0) > 0)
        .sort(
          (leftNode, rightNode) =>
            Number(rightNode.total_amount ?? rightNode.amount ?? 0) -
            Number(leftNode.total_amount ?? leftNode.amount ?? 0),
        )
        .slice(0, MAX_VISIBLE_SUBORDINATE_CARDS),
    [subordinateRankingQuery.data?.nodes],
  )

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

    const isSubordinatesFlowSettled =
      !relationshipsQuery.isFetching &&
      !subordinateRankingQuery.isFetching

    if (areCoreQueriesSettled && isSubordinatesFlowSettled) {
      confirmSettingsApplied()
    }
  }, [
    confirmSettingsApplied,
    entityDetailsQuery.data,
    entityDetailsQuery.isFetching,
    entityLineItemsQuery.data,
    entityLineItemsQuery.isFetching,
    relationshipsQuery.isFetching,
    subordinateRankingQuery.isFetching,
  ])

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

  const handleRetry = () => {
    void entityDetailsQuery.refetch()
    void entityLineItemsQuery.refetch()
  }

  const handleSubordinatesRetry = () => {
    void relationshipsQuery.refetch()
    void subordinateRankingQuery.refetch()
  }

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
        <AlertTitle>{t`Nu am putut încărca analiza.`}</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>
            {resolveErrorMessage(
              entityDetailsQuery.error ??
                entityLineItemsQuery.error,
            )}
          </p>
          <Button type="button" variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t`Încearcă Din Nou`}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const treemapTitle = getTreemapTitle(treemapAccountCategory)
  const isIncomeTreemap = treemapAccountCategory === 'vn'
  const showsIncomeEconomicMessage = isIncomeTreemap && activePrimary === 'ec'
  const treemapSubtitle = getTreemapSubtitle(
    treemapAccountCategory,
    activePrimary,
  )
  const treemapPrimaryCtaLabel = getTreemapPrimaryCtaLabel(
    treemapAccountCategory,
    activePrimary,
  )
  const treemapAccountCategoryCtaLabel =
    treemapAccountCategory === 'ch' ? t`Arată venituri` : t`Arată cheltuieli`
  const showTreemapResetShortcut =
    treemapAccountCategory === 'ch' && breadcrumbs.length > 0
  const isSubordinatesSectionLoading =
    (relationshipsQuery.isLoading && !relationshipsQuery.data) ||
    (subordinateEntityCuis.length > 0 &&
      subordinateRankingQuery.isLoading &&
      !subordinateRankingQuery.data)
  const isSubordinatesSectionError =
    relationshipsQuery.isError || subordinateRankingQuery.isError

  return (
    <div className="space-y-6 pb-10">
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
        onReportTypeToggle={handleReportTypeToggle}
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

      <div className="space-y-3">
        <Card className="rounded-[28px] border-border/50">
          <CardHeader>
            <div className="space-y-1">
              <CardTitle className="text-xl font-black tracking-tight">
                {treemapTitle}
              </CardTitle>
              <p className="text-sm font-medium text-muted-foreground">
                {showsIncomeEconomicMessage
                  ? t`Veniturile nu au cod economic.`
                  : treemapSubtitle}
              </p>
            </div>
          </CardHeader>
          <CardContent className="-mx-4 px-4 sm:mx-0 sm:px-0">
            {showsIncomeEconomicMessage ? (
              <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                {t`Veniturile nu au cod economic.`}
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
              />
            )}
          </CardContent>
        </Card>

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
            {normalizationMode === 'total'
              ? t`Arată per capita`
              : t`Arată total`}
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
              {t`Arată toate cheltuielile`}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
              onClick={handleAdministrativeExpensesShortcut}
            >
              {t`Arată cheltuieli administrative primărie`}
            </Button>
          )}
        </div>
      </div>

      <ChallengeEntityCategoryEvolution
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

      <ChallengeEntitySubordinatesSection
        locale={locale}
        items={subordinateCards}
        totalChildrenCount={subordinateEntityCuis.length}
        isLoading={isSubordinatesSectionLoading}
        isError={isSubordinatesSectionError}
        hasChildren={subordinateEntityCuis.length > 0}
        onRetry={handleSubordinatesRetry}
        normalizationOptions={displayNormalizationOptions}
        showAllSearch={showAllSubordinatesSearch}
      />

      <ChallengeEntityAnomalySummary
        locale={locale}
        lineItems={entityLineItemsQuery.data?.nodes ?? []}
        normalizationOptions={displayNormalizationOptions}
      />
    </div>
  )
}
