import { t } from '@lingui/core/macro'
import { ChartRenderer } from '@/components/charts/components/chart-renderer/components/ChartRenderer'
import {
  convertToTimeSeriesData,
  useChartData,
  type DataPointPayload,
} from '@/components/charts/hooks/useChartData'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'
import { buildTreemapDataV2 } from '@/components/budget-explorer/budget-transform'
import { useTreemapChartLink } from '@/components/budget-explorer/useTreemapChartLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
  DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES,
} from '@/lib/analytics-defaults'
import { buildTreemapChartState } from '@/lib/chart-links'
import type { ExecutionLineItem } from '@/lib/api/entities'
import type { NormalizationOptions } from '@/lib/normalization'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import type { Chart } from '@/schemas/charts'
import type { ReportPeriodInput } from '@/schemas/reporting'
import { toReportTypeValue, type GqlReportType } from '@/schemas/reporting'
import type { ChallengeLocale } from '../../types'
import type {
  ChallengeEntityAnalysisPageState,
  ChallengeTreemapAccountCategory,
} from './challenge-entity-analysis-page'

type ChallengeCategoryEvolutionProps = {
  readonly locale: ChallengeLocale
  readonly entityCui: string
  readonly lineItems: ExecutionLineItem[]
  readonly currentYear: number
  readonly reportType: Extract<GqlReportType, 'PRINCIPAL_AGGREGATED' | 'DETAILED'>
  readonly trendPeriod: ReportPeriodInput
  readonly queryNormalizationOptions: NormalizationOptions
  readonly displayNormalizationOptions: NormalizationOptions
  readonly onYearChange: (year: number) => void
  readonly accountCategory: ChallengeTreemapAccountCategory
  readonly primary: 'fn' | 'ec'
  readonly onStateChange: (
    patch: Pick<
      Partial<ChallengeEntityAnalysisPageState>,
      'evolutionAccountCategory' | 'evolutionPrimary'
    >,
  ) => void
}

type ChallengeEvolutionPrimary = 'fn' | 'ec'

const TOP_CATEGORY_LIMIT = 5
const NOOP_ANNOTATION_HANDLER = () => {}
const EMPTY_AGGREGATED_DATA: DataPointPayload[] = []
const EMPTY_CHART: Chart = {
  id: 'challenge-entity-category-evolution-empty',
  title: '',
  config: {
    chartType: 'line',
    color: '#0f172a',
    showGridLines: true,
    showLegend: true,
    showTooltip: true,
    editAnnotations: false,
    showAnnotations: false,
    showDiffControl: false,
  },
  series: [],
  annotations: [],
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
}

const CATEGORY_EVOLUTION_COPY = {
  ro: {
    titleIncome: 'Evoluția Veniturilor',
    titleExpense: 'Evoluția Cheltuielilor',
    incomeSubtitle: 'Top 5 categorii funcționale pentru anul selectat',
    expenseEconomicSubtitle: 'Top 5 categorii economice pentru anul selectat',
    expenseFunctionalSubtitle: 'Top 5 categorii funcționale pentru anul selectat',
    incomeChartTitle: 'Evoluția primelor 5 categorii de venituri',
    expenseEconomicChartTitle:
      'Evoluția primelor 5 categorii economice de cheltuieli',
    expenseFunctionalChartTitle:
      'Evoluția primelor 5 categorii funcționale de cheltuieli',
    noEconomicCode: 'Veniturile nu au cod economic.',
    noData:
      'Nu există suficiente date pentru topul categoriilor în perioada selectată.',
    openChartPage: 'Deschide în pagina de grafice',
    loading: 'Loading chart data…',
  },
  en: {
    titleIncome: 'Revenue evolution',
    titleExpense: 'Spending evolution',
    incomeSubtitle: 'Top 5 functional categories for the selected year',
    expenseEconomicSubtitle: 'Top 5 economic categories for the selected year',
    expenseFunctionalSubtitle:
      'Top 5 functional categories for the selected year',
    incomeChartTitle: 'Evolution of the top 5 revenue categories',
    expenseEconomicChartTitle:
      'Evolution of the top 5 economic spending categories',
    expenseFunctionalChartTitle:
      'Evolution of the top 5 functional spending categories',
    noEconomicCode: 'Revenue does not have an economic code.',
    noData: 'There is not enough data for the top categories in this period.',
    openChartPage: 'Open on the charts page',
    loading: 'Loading chart data…',
  },
} as const

function getEvolutionTitle(
  locale: ChallengeLocale,
  accountCategory: ChallengeTreemapAccountCategory,
) {
  const copy = CATEGORY_EVOLUTION_COPY[locale]
  return accountCategory === 'vn'
    ? copy.titleIncome
    : copy.titleExpense
}

function getEvolutionSubtitle(
  locale: ChallengeLocale,
  accountCategory: ChallengeTreemapAccountCategory,
  primary: ChallengeEvolutionPrimary,
) {
  const copy = CATEGORY_EVOLUTION_COPY[locale]
  if (accountCategory === 'vn') {
    return copy.incomeSubtitle
  }

  return primary === 'ec'
    ? copy.expenseEconomicSubtitle
    : copy.expenseFunctionalSubtitle
}

function getEvolutionPrimaryCtaLabel(primary: ChallengeEvolutionPrimary) {
  return primary === 'ec'
    ? t`Arată top categorii funcționale`
    : t`Arată top categorii economice`
}

function getEvolutionChartTitle(
  locale: ChallengeLocale,
  accountCategory: ChallengeTreemapAccountCategory,
  primary: ChallengeEvolutionPrimary,
) {
  const copy = CATEGORY_EVOLUTION_COPY[locale]
  if (accountCategory === 'vn') {
    return copy.incomeChartTitle
  }

  return primary === 'ec'
    ? copy.expenseEconomicChartTitle
    : copy.expenseFunctionalChartTitle
}

export function ChallengeEntityCategoryEvolution({
  locale,
  entityCui,
  lineItems,
  currentYear,
  reportType,
  trendPeriod,
  queryNormalizationOptions,
  displayNormalizationOptions,
  onYearChange,
  accountCategory,
  primary,
  onStateChange,
}: ChallengeCategoryEvolutionProps) {
  const copy = CATEGORY_EVOLUTION_COPY[locale]
  const isIncomeMode = accountCategory === 'vn'
  const showsIncomeEconomicMessage = isIncomeMode && primary === 'ec'
  const title = getEvolutionTitle(locale, accountCategory)
  const subtitle = showsIncomeEconomicMessage
    ? copy.noEconomicCode
    : getEvolutionSubtitle(locale, accountCategory, primary)
  const accountCategoryCtaLabel =
    accountCategory === 'ch' ? t`Arată venituri` : t`Arată cheltuieli`
  const primaryCtaLabel = getEvolutionPrimaryCtaLabel(primary)

  const filteredLineItems = useMemo(
    () =>
      lineItems.filter(
        (lineItem) => lineItem.account_category === accountCategory,
      ),
    [accountCategory, lineItems],
  )

  const aggregatedNodes = useMemo<AggregatedNode[]>(
    () =>
      filteredLineItems.map((lineItem) => ({
        fn_c: lineItem.functionalClassification?.functional_code ?? '',
        fn_n: lineItem.functionalClassification?.functional_name ?? '',
        ec_c: lineItem.economicClassification?.economic_code ?? '',
        ec_n: lineItem.economicClassification?.economic_name ?? '',
        amount: Number(lineItem.amount ?? 0),
        count: 1,
      })),
    [filteredLineItems],
  )

  const topLevelCategories = useMemo(
    () =>
      buildTreemapDataV2({
        data: aggregatedNodes,
        primary,
        path: [],
        rootDepth: 2,
        excludeEcCodes:
          accountCategory === 'ch'
            ? [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES]
            : [],
        excludeFnCodes:
          accountCategory === 'vn'
            ? [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES]
            : [],
      }),
    [accountCategory, aggregatedNodes, primary],
  )

  const trendFilterInput = useMemo(
    () => ({
      entity_cuis: [entityCui],
      account_category: accountCategory,
      report_period: trendPeriod,
      report_type: toReportTypeValue(reportType),
      normalization: queryNormalizationOptions.normalization,
      currency: queryNormalizationOptions.currency,
      inflation_adjusted: queryNormalizationOptions.inflation_adjusted,
      show_period_growth: false,
    }),
    [
      accountCategory,
      entityCui,
      queryNormalizationOptions.currency,
      queryNormalizationOptions.inflation_adjusted,
      queryNormalizationOptions.normalization,
      reportType,
      trendPeriod,
    ],
  )

  const { seriesConfigs } = useTreemapChartLink({
    data: topLevelCategories,
    path: [],
    primary,
    filterInput: trendFilterInput,
    maxActiveSeries: TOP_CATEGORY_LIMIT,
    maxTotalSeries: TOP_CATEGORY_LIMIT,
  })

  const chartSearch = useMemo(() => {
    if (seriesConfigs.length === 0) {
      return null
    }

    const baseChartSearch = buildTreemapChartState({
      title: getEvolutionChartTitle(locale, accountCategory, primary),
      seriesConfigs,
      normalization: displayNormalizationOptions.normalization,
    })

    return {
      ...baseChartSearch,
      chart: {
        ...baseChartSearch.chart,
        title: '',
        config: {
          ...baseChartSearch.chart.config,
          chartType: 'line' as const,
          showLegend: true,
          showTooltip: true,
          showGridLines: true,
          showDiffControl: false,
        },
      },
    }
  }, [
    accountCategory,
    displayNormalizationOptions.normalization,
    locale,
    primary,
    seriesConfigs,
  ])

  const inlineChart = chartSearch?.chart ?? EMPTY_CHART
  const chartLink = chartSearch
    ? {
        to: '/charts/$chartId' as const,
        params: { chartId: chartSearch.chart.id },
        search: chartSearch,
      }
    : null

  const { dataSeriesMap, isLoadingData, dataError } = useChartData({
    chart: inlineChart,
    enabled: Boolean(chartSearch) && !showsIncomeEconomicMessage,
  })

  const { timeSeriesData, unitMap } = useMemo(() => {
    if (!chartSearch || !dataSeriesMap) {
      return {
        timeSeriesData: [],
        unitMap: new Map(),
      }
    }

    const result = convertToTimeSeriesData(dataSeriesMap, inlineChart)
    return {
      timeSeriesData: result.data,
      unitMap: result.unitMap,
    }
  }, [chartSearch, dataSeriesMap, inlineChart])

  const handleAccountCategoryToggle = () => {
    const nextAccountCategory =
      accountCategory === 'ch' ? 'vn' : 'ch'

    onStateChange({
      evolutionAccountCategory: nextAccountCategory,
      evolutionPrimary: nextAccountCategory === 'vn' ? 'fn' : primary,
    })
  }

  const handlePrimaryToggle = () => {
    onStateChange({
      evolutionPrimary: primary === 'fn' ? 'ec' : 'fn',
    })
  }

  const handleXAxisClick = (value: number | string) => {
    const nextYear = Number(String(value).slice(0, 4))
    if (!Number.isFinite(nextYear)) {
      return
    }

    onYearChange(nextYear)
  }

  return (
    <div className="space-y-3">
      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="min-w-0 text-xl font-black tracking-tight">
                {title}
              </CardTitle>
              {chartLink && !showsIncomeEconomicMessage ? (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="mt-[-2px] h-8 w-8 shrink-0 rounded-full"
                >
                  <Link
                    to={chartLink.to}
                    params={chartLink.params}
                    search={chartLink.search}
                    preload="intent"
                    aria-label={copy.openChartPage}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {showsIncomeEconomicMessage ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
              {copy.noEconomicCode}
            </div>
          ) : seriesConfigs.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
              {copy.noData}
            </div>
          ) : isLoadingData ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-border/50 bg-muted/[0.14]">
              <LoadingSpinner text={copy.loading} />
            </div>
          ) : dataError ? (
            <div className="rounded-[24px] border border-dashed border-destructive/40 bg-destructive/5 px-6 py-12 text-center text-sm font-medium text-destructive">
              {dataError.message}
            </div>
          ) : !dataSeriesMap || dataSeriesMap.size === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
              {copy.noData}
            </div>
          ) : (
            <div className="rounded-[24px] border border-border/50 bg-muted/[0.12] px-2 py-4 sm:px-4">
              <ChartRenderer
                chart={inlineChart}
                dataMap={dataSeriesMap}
                timeSeriesData={timeSeriesData}
                aggregatedData={EMPTY_AGGREGATED_DATA}
                unitMap={unitMap}
                height={360}
                isPreview
                xAxisMarker={currentYear}
                onXAxisClick={handleXAxisClick}
                onAnnotationPositionChange={NOOP_ANNOTATION_HANDLER}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
          onClick={handleAccountCategoryToggle}
        >
          {accountCategoryCtaLabel}
        </Button>

        {isIncomeMode ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
            onClick={handlePrimaryToggle}
          >
            {primaryCtaLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
