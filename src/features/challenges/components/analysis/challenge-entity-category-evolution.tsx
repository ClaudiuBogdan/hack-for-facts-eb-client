import { ChartCoverageNotice } from '@/components/charts/components/chart-coverage-notice';
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
import { usePeriodLabel } from '@/hooks/use-period-label'
import { cn } from '@/lib/utils'
import type { ChallengeEntityReportControlsChange } from './challenge-entity-report-controls'
import { buildTreemapChartState } from '@/lib/chart-links'
import type { ExecutionLineItem } from '@/lib/api/entities'
import type { NormalizationOptions } from '@/lib/normalization'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Chart } from '@/schemas/charts'
import type { ExecutionGqlReportType, ReportPeriodInput, ReportPeriodType, TMonth, TQuarter } from '@/schemas/reporting'
import { toReportTypeValue } from '@/schemas/reporting'
import type { ChallengeLocale } from '../../types'
import type {
  ChallengeEntityAnalysisPageState,
  ChallengeTreemapAccountCategory,
} from './challenge-entity-analysis-page'

type ChallengeCategoryEvolutionProps = {
  readonly locale: ChallengeLocale
  readonly entityCui: string
  readonly mainCreditorCui?: string
  readonly lineItems: ExecutionLineItem[] | undefined
  readonly reportPeriod?: ReportPeriodInput
  readonly lineItemsFallback?: ReactNode
  readonly hasLineItemsError?: boolean
  readonly currentYear: number
  readonly reportType: ExecutionGqlReportType
  readonly periodType: ReportPeriodType
  readonly trendPeriod: ReportPeriodInput
  readonly queryNormalizationOptions: NormalizationOptions
  readonly displayNormalizationOptions: NormalizationOptions
  readonly onYearChange?: (year: number) => void
  readonly onSelectPeriod?: (label: string) => void
  readonly onPeriodChange?: (patch: ChallengeEntityReportControlsChange) => void
  readonly onPrefetchPeriod?: (patch: ChallengeEntityReportControlsChange) => void
  readonly onCancelPrefetchPeriod?: () => void
  readonly selectedQuarter?: TQuarter
  readonly selectedMonth?: TMonth
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
const EMPTY_LINE_ITEMS: ExecutionLineItem[] = []
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
    ? t`Show top functional categories`
    : t`Show top economic categories`
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
  mainCreditorCui,
  lineItems,
  reportPeriod,
  lineItemsFallback,
  hasLineItemsError,
  currentYear,
  reportType,
  periodType,
  trendPeriod,
  queryNormalizationOptions,
  displayNormalizationOptions,
  onYearChange,
  onSelectPeriod,
  onPeriodChange,
  onPrefetchPeriod,
  onCancelPrefetchPeriod,
  selectedQuarter,
  selectedMonth,
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
    accountCategory === 'ch' ? t`Show revenue` : t`Show spending`
  const primaryCtaLabel = getEvolutionPrimaryCtaLabel(primary)

  const filteredLineItems = useMemo(
    () =>
      (lineItems ?? EMPTY_LINE_ITEMS).filter(
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
      }),
    [aggregatedNodes, primary],
  )

  const trendFilterInput = useMemo(
    () => ({
      entity_cuis: [entityCui],
      ...(mainCreditorCui ? { main_creditor_cui: mainCreditorCui } : {}),
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
      mainCreditorCui,
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

  const xAxisMarker =
    periodType === 'MONTH' && selectedMonth
      ? `${currentYear}-${selectedMonth}`
      : periodType === 'QUARTER' && selectedQuarter
        ? `${currentYear}-${selectedQuarter}`
        : currentYear
  const pending = lineItems === undefined || isLoadingData
  const failed = hasLineItemsError || Boolean(dataError)
  const scope = JSON.stringify([entityCui, accountCategory, primary, reportType, mainCreditorCui, displayNormalizationOptions])
  const previousChart = useRef<{
    readonly scope: string
    readonly reportPeriod: ReportPeriodInput
    readonly chart: Chart
    readonly dataMap: NonNullable<typeof dataSeriesMap>
    readonly timeSeriesData: typeof timeSeriesData
    readonly unitMap: typeof unitMap
    readonly marker: number | string
  } | undefined>(undefined)
  useEffect(() => {
    if (!reportPeriod || showsIncomeEconomicMessage || previousChart.current?.scope !== scope) {
      previousChart.current = undefined
    }
    if (pending || failed) return
    previousChart.current = reportPeriod && !showsIncomeEconomicMessage && dataSeriesMap?.size && timeSeriesData.length
      ? { scope, reportPeriod, chart: inlineChart, dataMap: dataSeriesMap, timeSeriesData, unitMap, marker: xAxisMarker }
      : undefined
  }, [scope, reportPeriod, showsIncomeEconomicMessage, pending, failed, inlineChart, dataSeriesMap, timeSeriesData, unitMap, xAxisMarker])
  const previous = previousChart.current
  const retained = (pending || failed) && !showsIncomeEconomicMessage && previous?.scope === scope ? previous : undefined
  const shownPeriod = retained?.reportPeriod ?? reportPeriod
  const shownPeriodLabel = usePeriodLabel(shownPeriod)
  const requestedPeriodLabel = usePeriodLabel(reportPeriod)
  const shownFrequency = shownPeriod?.type ?? periodType
  const shownYear = retained ? Number(String(retained.marker).slice(0, 4)) : currentYear

  const selectionFor = (value: number | string) => {
    if (shownFrequency !== periodType) return
    const label = String(value)
    if (shownFrequency === 'MONTH') {
      const match = /^(?:(\d{4})-)?(0[1-9]|1[0-2])$/.exec(label)
      if (match) return { selectedYear: Number(match[1] ?? shownYear), month: match[2] as TMonth }
    } else if (shownFrequency === 'QUARTER') {
      const match = /^(?:(\d{4})-)?(Q[1-4])$/.exec(label)
      if (match) return { selectedYear: Number(match[1] ?? shownYear), quarter: match[2] as TQuarter }
    } else if (/^\d{4}$/.test(label)) {
      return { selectedYear: Number(label) }
    }
  }

  const handleXAxisClick = (value: number | string) => {
    const selection = selectionFor(value)
    if (!selection) return
    if (onPeriodChange) {
      onPeriodChange(selection)
    } else if (selection.month) {
      onSelectPeriod?.(selection.month)
    } else if (selection.quarter) {
      onSelectPeriod?.(selection.quarter)
    } else {
      onYearChange?.(selection.selectedYear)
    }
  }

  const handleXAxisHover = (value: number | string | undefined) => {
    const selection = value === undefined ? undefined : selectionFor(value)
    if (selection) onPrefetchPeriod?.(selection)
    else onCancelPrefetchPeriod?.()
  }

  if (lineItemsFallback && !retained) return lineItemsFallback

  const shownDataMap = retained?.dataMap ?? dataSeriesMap
  const shownChart = retained?.chart ?? inlineChart
  const shownTimeSeries = retained?.timeSeriesData ?? timeSeriesData
  const shownUnitMap = retained?.unitMap ?? unitMap

  return (
    <div className="space-y-3">
      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="min-w-0 text-xl font-black tracking-tight">
                {title}
              </CardTitle>
              {chartLink && !retained && !showsIncomeEconomicMessage ? (
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
              {subtitle}{shownPeriodLabel && !showsIncomeEconomicMessage ? ` · ${shownPeriodLabel}` : ''}
            </p>
          </div>
        </CardHeader>
        {(!pending || retained) && <div className="px-6"><ChartCoverageNotice dataSeriesMap={shownDataMap} /></div>}
        {retained && failed && (
          <p role="status" className="px-6 text-sm text-muted-foreground">
            {t`Could not load ${requestedPeriodLabel}. Showing ${shownPeriodLabel}.`}
          </p>
        )}

        <CardContent>
          {showsIncomeEconomicMessage ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
              {copy.noEconomicCode}
            </div>
          ) : !retained && lineItems !== undefined && seriesConfigs.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
              {copy.noData}
            </div>
          ) : !retained && pending ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-border/50 bg-muted/[0.14]">
              <LoadingSpinner text={copy.loading} />
            </div>
          ) : !retained && dataError ? (
            <div className="rounded-[24px] border border-dashed border-status-blocked-fg/30 bg-status-blocked-bg px-6 py-12 text-center text-sm font-medium text-status-blocked-fg">
              {dataError.message}
            </div>
          ) : !shownDataMap || shownDataMap.size === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
              {copy.noData}
            </div>
          ) : (
            <div
              aria-busy={Boolean(retained) && !failed || undefined}
              className={cn('rounded-[24px] border border-border/50 bg-muted/[0.12] px-2 py-4 sm:px-4', retained && !failed && 'opacity-65')}
            >
              <ChartRenderer
                chart={shownChart}
                dataMap={shownDataMap}
                timeSeriesData={shownTimeSeries}
                aggregatedData={EMPTY_AGGREGATED_DATA}
                unitMap={shownUnitMap}
                height={360}
                isPreview
                xAxisMarker={retained?.marker ?? xAxisMarker}
                onXAxisClick={shownFrequency === periodType ? handleXAxisClick : undefined}
                onXAxisHover={onPrefetchPeriod ? handleXAxisHover : undefined}
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
