import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink, Minus, Plus, X } from 'lucide-react'
import { getEntityFeatureInfo } from '@/components/entities/utils'
import {
  convertToAggregatedData,
  convertToTimeSeriesData,
  useChartData,
} from '@/components/charts/hooks/useChartData'
import { ChartRenderer } from '@/components/charts/components/chart-renderer/components/ChartRenderer'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { createMapCloneHandoff } from '@/features/advanced-map-analytics/store/map-clone-handoff'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace'
import { useMapPreviewRuntimeState } from '@/features/advanced-map-analytics/hooks/use-map-preview-runtime-state'
import { Analytics } from '@/lib/analytics'
import { useEntityDetails } from '@/lib/hooks/useEntityDetails'
import { getCommitmentsMetricOptions } from '@/lib/commitments-metrics'
import { cn } from '@/lib/utils'
import { CHALLENGE_ENTITY_ANALYSIS_EXPENSE_TYPE_VALUES } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import {
  buildBudgetItemAnalyticsFilters,
  getBudgetItemAnalyticsEmptyStateMessage,
  normalizeBudgetItemAnalyticsCode,
  type BudgetItemAnalyticsFilters,
  type BudgetItemAnalyticsProps,
} from './budget-item-analytics-context'
import {
  buildBudgetItemAnalyticsViewState,
  getBudgetItemAnalyticsChartCardTitle,
  getBudgetItemAnalyticsTabLabel,
  type BudgetItemAnalyticsResolvedViewState,
} from './budget-item-analytics-view-state'
import { useBudgetItemAnalyticsTitle } from './use-budget-item-analytics-title'

const NOOP_ANNOTATION_HANDLER = () => {}
type BudgetItemAnalyticsCodeType = 'fn' | 'ec'
type BudgetItemAnalyticsExpenseType =
  BudgetItemAnalyticsProps['context']['expenseType']
type BudgetItemAnalyticsResolvedContext = BudgetItemAnalyticsResolvedViewState &
  BudgetItemAnalyticsFilters & {
    readonly analyticsProps: BudgetItemAnalyticsProps
  }
const BUDGET_ITEM_ANALYTICS_EXPENSE_TYPE_ORDER = [
  undefined,
  ...CHALLENGE_ENTITY_ANALYSIS_EXPENSE_TYPE_VALUES,
] as const satisfies readonly BudgetItemAnalyticsExpenseType[]

function buildAnalyticsCopy(language: BudgetItemAnalyticsResolvedViewState['language']) {
  return language === 'en'
    ? {
        openChartPage: 'Open on the charts page',
        openMapPage: 'Open in map editor',
        searchFunctionalLabel: 'search fn',
        searchEconomicLabel: 'search ec',
        addFunctionalLabel: 'Add fn',
        addEconomicLabel: 'Add ec',
        functionalFieldLabel: 'Functional prefix',
        economicFieldLabel: 'Economic prefix',
        functionalPlaceholder: '65 or 65.02',
        economicPlaceholder: '10 or 10.01',
        prefixHint: 'Press Enter or leave the field to apply.',
        reportTypeLabel: 'Report type',
        reportTypeDetailedLabel: 'Only city hall',
        reportTypeAggregatedLabel: 'City hall + subordinates',
        normalizationLabel: 'Normalization',
        inflationLabel: 'Inflation adjusted',
        timeframeLabel: 'Timeframe',
        selectedYearLabel: 'Selected year',
        commitmentsMetricLabel: 'Metric',
        expenseTypeLabel: 'Expense type',
        allExpensesLabel: 'All',
        operationsExpensesLabel: 'Operations',
        developmentExpensesLabel: 'Development',
        showExtraOptionsLabel: 'Show extra options',
        hideExtraOptionsLabel: 'Hide extra options',
      }
    : {
        openChartPage: 'Deschide în pagina de grafice',
        openMapPage: 'Deschide în editorul de hărți',
        searchFunctionalLabel: 'cauta fn',
        searchEconomicLabel: 'cauta ec',
        addFunctionalLabel: 'Adaugă fn',
        addEconomicLabel: 'Adaugă ec',
        functionalFieldLabel: 'Prefix funcțional',
        economicFieldLabel: 'Prefix economic',
        functionalPlaceholder: '65 sau 65.02',
        economicPlaceholder: '10 sau 10.01',
        prefixHint: 'Apasă Enter sau ieși din câmp pentru aplicare.',
        reportTypeLabel: 'Tip raport',
        reportTypeDetailedLabel: 'Doar primăria',
        reportTypeAggregatedLabel: 'Primăria și subordonatele',
        normalizationLabel: 'Normalizare',
        inflationLabel: 'Ajustat cu inflația',
        timeframeLabel: 'Interval',
        selectedYearLabel: 'An selectat',
        commitmentsMetricLabel: 'Metrică',
        expenseTypeLabel: 'Tip cheltuială',
        allExpensesLabel: 'Toate',
        operationsExpensesLabel: 'Operațiuni',
        developmentExpensesLabel: 'Dezvoltare',
        showExtraOptionsLabel: 'Arată opțiunile suplimentare',
        hideExtraOptionsLabel: 'Ascunde opțiunile suplimentare',
      }
}

function getBudgetItemAnalyticsExpenseTypeLabel(
  copy: ReturnType<typeof buildAnalyticsCopy>,
  expenseType: BudgetItemAnalyticsExpenseType,
) {
  if (expenseType === 'functionare') {
    return copy.operationsExpensesLabel
  }

  if (expenseType === 'dezvoltare') {
    return copy.developmentExpensesLabel
  }

  return copy.allExpensesLabel
}

function getNextBudgetItemAnalyticsExpenseType(
  expenseType: BudgetItemAnalyticsExpenseType,
): BudgetItemAnalyticsExpenseType {
  const currentIndex = BUDGET_ITEM_ANALYTICS_EXPENSE_TYPE_ORDER.indexOf(expenseType)
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + 1) % BUDGET_ITEM_ANALYTICS_EXPENSE_TYPE_ORDER.length

  return BUDGET_ITEM_ANALYTICS_EXPENSE_TYPE_ORDER[nextIndex]
}

type BudgetItemAnalyticsSectionProps = {
  readonly context: BudgetItemAnalyticsResolvedContext
}

function getEntityMapViewType(
  entity:
    | {
        readonly entity_type?: string | null
        readonly cui?: string | null
      }
    | null
    | undefined,
) {
  return entity?.entity_type === 'admin_county_council' || entity?.cui === '4267117'
    ? 'County'
    : 'UAT'
}

function toMapViewport(
  featureInfo: ReturnType<typeof getEntityFeatureInfo> | null | undefined,
) {
  if (!featureInfo || !Array.isArray(featureInfo.center)) {
    return undefined
  }

  const [latitude, longitude] = featureInfo.center
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined
  }

  return {
    mapCenter: [latitude, longitude] as [number, number],
    mapZoom: featureInfo.zoom,
  }
}

function getCodeEditorCopy(
  language: BudgetItemAnalyticsResolvedViewState['language'],
  type: BudgetItemAnalyticsCodeType,
) {
  const copy = buildAnalyticsCopy(language)

  if (type === 'fn') {
    return {
      addLabel: copy.addFunctionalLabel,
      fieldLabel: copy.functionalFieldLabel,
      placeholder: copy.functionalPlaceholder,
      hint: copy.prefixHint,
      editLabel: (code: string) =>
        language === 'en' ? `Edit fn:${code}` : `Editează fn:${code}`,
      removeLabel: (code: string) =>
        language === 'en' ? `Remove fn:${code}` : `Elimină fn:${code}`,
    }
  }

  return {
    addLabel: copy.addEconomicLabel,
    fieldLabel: copy.economicFieldLabel,
    placeholder: copy.economicPlaceholder,
    hint: copy.prefixHint,
    editLabel: (code: string) =>
      language === 'en' ? `Edit ec:${code}` : `Editează ec:${code}`,
    removeLabel: (code: string) =>
      language === 'en' ? `Remove ec:${code}` : `Elimină ec:${code}`,
  }
}

function ClassificationExplorerLink({
  language,
  type,
}: {
  readonly language: BudgetItemAnalyticsResolvedViewState['language']
  readonly type: BudgetItemAnalyticsCodeType
}) {
  const copy = buildAnalyticsCopy(language)
  const href =
    type === 'fn'
      ? '/classifications/functional'
      : '/classifications/economic'
  const label =
    type === 'fn'
      ? copy.searchFunctionalLabel
      : copy.searchEconomicLabel

  return (
    <Button
      asChild
      variant="ghost"
      className="h-auto rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-semibold hover:bg-muted"
    >
      <Link
        to={href}
        title={label}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
        <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </Button>
  )
}

type EditableAnalyticsCodeChipProps = {
  readonly language: BudgetItemAnalyticsResolvedViewState['language']
  readonly type: BudgetItemAnalyticsCodeType
  readonly value?: string
  readonly onChange: (nextValue?: string) => void
}

function EditableAnalyticsCodeChip({
  language,
  type,
  value,
  onChange,
}: EditableAnalyticsCodeChipProps) {
  const copy = getCodeEditorCopy(language, type)
  const [isOpen, setIsOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(value ?? '')
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const isActive = Boolean(value)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setDraftValue(value ?? '')
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)

    return () => window.clearTimeout(focusTimer)
  }, [isOpen, value])

  function commitDraft() {
    const normalizedDraftValue = normalizeBudgetItemAnalyticsCode(draftValue)
    setIsOpen(false)
    setDraftValue(normalizedDraftValue ?? '')

    if (normalizedDraftValue === value) {
      return
    }

    onChange(normalizedDraftValue)
  }

  function cancelDraft() {
    setDraftValue(value ?? '')
    setIsOpen(false)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border text-xs font-semibold',
        isActive
          ? 'border-border/60 bg-muted/60'
          : 'border-dashed border-border/60 bg-transparent text-muted-foreground',
      )}
    >
      <Popover
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setDraftValue(value ?? '')
          }

          setIsOpen(nextOpen)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={isActive ? copy.editLabel(value ?? '') : copy.addLabel}
            className="inline-flex items-center gap-1.5 px-3 py-1"
          >
            {isActive ? `${type}:${value}` : copy.addLabel}
            {!isActive ? <Plus className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[220px] space-y-2 p-3"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            {copy.fieldLabel}
          </label>
          <Input
            id={inputId}
            ref={inputRef}
            value={draftValue}
            placeholder={copy.placeholder}
            onChange={(event) =>
              setDraftValue(event.target.value.replace(/[^0-9.]/g, ''))
            }
            onBlur={() => commitDraft()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitDraft()
              }

              if (event.key === 'Escape') {
                event.preventDefault()
                cancelDraft()
              }
            }}
          />
          <p className="text-xs text-muted-foreground">{copy.hint}</p>
        </PopoverContent>
      </Popover>
      {isActive ? (
        <button
          type="button"
          aria-label={copy.removeLabel(value ?? '')}
          className="mr-1 rounded-full p-1 text-muted-foreground transition hover:bg-background/80 hover:text-foreground"
          onClick={() => onChange(undefined)}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

function AnalyticsControls({ context }: BudgetItemAnalyticsSectionProps) {
  const copy = buildAnalyticsCopy(context.language)
  const supportsCommitments =
    context.analyticsProps.context.accountCategory === 'ch'
  const showsExpenseType =
    context.activeTab === 'execution' &&
    context.analyticsProps.context.accountCategory === 'ch'
  const selectedYearLabel = `${copy.selectedYearLabel}: ${context.analyticsProps.context.selectedYear}`
  const currentAllTimeframeLabel =
    context.activeTab === 'commitments'
      ? context.commitmentsAllTimeframeLabel
      : context.executionAllTimeframeLabel
  const commitmentsMetricOptions = useMemo(
    () => getCommitmentsMetricOptions('YEAR'),
    [],
  )
  const expenseTypeButtonLabel = `${copy.expenseTypeLabel}: ${getBudgetItemAnalyticsExpenseTypeLabel(
    copy,
    context.analyticsProps.context.expenseType,
  )}`
  const [showExtraControls, setShowExtraControls] = useState(false)
  const extraControlsId = useId()

  return (
    <div className="flex flex-col gap-4 border-b px-6 py-5">
      {supportsCommitments ? (
        <Tabs
          value={context.activeTab}
          onValueChange={(nextValue) =>
            context.analyticsProps.onAnalyticsViewChange?.({
              tab: nextValue as 'execution' | 'commitments',
            })
          }
        >
          <TabsList className="grid w-full grid-cols-2 rounded-full">
            <TabsTrigger value="execution">
              {getBudgetItemAnalyticsTabLabel('execution', context.language)}
            </TabsTrigger>
            <TabsTrigger value="commitments">
              {getBudgetItemAnalyticsTabLabel('commitments', context.language)}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex min-w-[280px] items-center justify-between gap-3 rounded-full border border-border/60 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {copy.timeframeLabel}
          </span>
          <div className="flex rounded-full bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={
                context.analyticsProps.analyticsView.timeframe === 'selected'
                  ? 'default'
                  : 'ghost'
              }
              className="rounded-full"
              onClick={() =>
                context.analyticsProps.onAnalyticsViewChange?.({
                  timeframe: 'selected',
                })
              }
            >
              {selectedYearLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                context.analyticsProps.analyticsView.timeframe === 'all'
                  ? 'default'
                  : 'ghost'
              }
              className="rounded-full"
              onClick={() =>
                context.analyticsProps.onAnalyticsViewChange?.({
                  timeframe: 'all',
                })
              }
            >
              {currentAllTimeframeLabel}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="w-full rounded-full sm:w-9"
          onClick={() => setShowExtraControls((previousState) => !previousState)}
          aria-controls={extraControlsId}
          aria-expanded={showExtraControls}
          aria-label={
            showExtraControls
              ? copy.hideExtraOptionsLabel
              : copy.showExtraOptionsLabel
          }
        >
          {showExtraControls ? <Minus /> : <Plus />}
        </Button>
      </div>

      <Collapsible open={showExtraControls} onOpenChange={setShowExtraControls}>
        <CollapsibleContent id={extraControlsId} className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="flex min-w-[260px] items-center justify-between gap-3 rounded-full border border-border/60 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {copy.reportTypeLabel}
              </span>
              <Select
                value={context.analyticsProps.context.reportType}
                onValueChange={(value) =>
                  context.analyticsProps.onReportTypeChange?.(
                    value as typeof context.analyticsProps.context.reportType,
                  )
                }
              >
                <SelectTrigger
                  aria-label={copy.reportTypeLabel}
                  className="h-8 w-[210px] border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DETAILED">
                    {copy.reportTypeDetailedLabel}
                  </SelectItem>
                  <SelectItem value="PRINCIPAL_AGGREGATED">
                    {copy.reportTypeAggregatedLabel}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-[180px] items-center justify-between gap-3 rounded-full border border-border/60 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {copy.normalizationLabel}
              </span>
              <Select
                value={context.analyticsProps.context.normalization}
                onValueChange={(value) =>
                  context.analyticsProps.onNormalizationChange?.(
                    value as 'total' | 'per_capita',
                  )
                }
              >
                <SelectTrigger
                  aria-label={copy.normalizationLabel}
                  className="h-8 w-[140px] border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus:ring-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="per_capita">Per capita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex min-w-[220px] items-center justify-between gap-3 rounded-full border border-border/60 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {copy.inflationLabel}
              </span>
              <Switch
                checked={context.analyticsProps.context.inflationAdjusted}
                onCheckedChange={(checked) =>
                  context.analyticsProps.onInflationAdjustedChange?.(checked)
                }
              />
            </label>

            {supportsCommitments && context.activeTab === 'commitments' ? (
              <div className="flex min-w-[240px] items-center justify-between gap-3 rounded-full border border-border/60 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {copy.commitmentsMetricLabel}
                </span>
                <Select
                  value={context.analyticsProps.analyticsView.commitmentsMetric}
                  onValueChange={(value) =>
                    context.analyticsProps.onAnalyticsViewChange?.({
                      commitmentsMetric: value as typeof context.analyticsProps.analyticsView.commitmentsMetric,
                    })
                  }
                >
                  <SelectTrigger
                    aria-label={copy.commitmentsMetricLabel}
                    className="h-8 w-[220px] border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus:ring-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commitmentsMetricOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {showsExpenseType ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
                onClick={() =>
                  context.analyticsProps.onExpenseTypeChange?.(
                    getNextBudgetItemAnalyticsExpenseType(
                      context.analyticsProps.context.expenseType,
                    ),
                  )
                }
              >
                {expenseTypeButtonLabel}
              </Button>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function AnalyticsChartSection({ context }: BudgetItemAnalyticsSectionProps) {
  const copy = buildAnalyticsCopy(context.language)
  const { dataSeriesMap, isLoadingData, dataError } = useChartData({
    chart: context.chartSearch.chart,
    enabled: true,
  })
  const isAggregatedChart =
    context.chartSearch.chart.config.chartType === 'bar-aggr'
  const processedData = useMemo(() => {
    if (!dataSeriesMap) {
      return {
        timeSeriesData: [],
        aggregatedData: [],
        unitMap: new Map(),
      }
    }

    if (isAggregatedChart) {
      const { data, unitMap } = convertToAggregatedData(
        dataSeriesMap,
        context.chartSearch.chart,
      )

      return {
        timeSeriesData: [],
        aggregatedData: data,
        unitMap,
      }
    }

    const { data, unitMap } = convertToTimeSeriesData(
      dataSeriesMap,
      context.chartSearch.chart,
    )

    return {
      timeSeriesData: data,
      aggregatedData: [],
      unitMap,
    }
  }, [context.chartSearch.chart, dataSeriesMap, isAggregatedChart])

  const hasData =
    !!dataSeriesMap &&
    dataSeriesMap.size > 0 &&
    (isAggregatedChart
      ? processedData.aggregatedData.length > 0
      : processedData.timeSeriesData.length > 0)
  const chartCardTitle = getBudgetItemAnalyticsChartCardTitle(
    context.activeTab,
    context.language,
    context.activeTab === 'commitments'
      ? getCommitmentsMetricOptions('YEAR').find(
          (option) =>
            option.value === context.analyticsProps.analyticsView.commitmentsMetric,
        )?.label
      : undefined,
  )

  return (
    <Card className="flex min-h-[620px] flex-col overflow-hidden rounded-[24px] border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b px-5 py-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-black tracking-tight">
            {chartCardTitle}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {context.subjectLabel}
          </p>
        </div>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Link
            to="/charts/$chartId"
            params={{ chartId: context.chartSearch.chart.id }}
            search={context.chartSearch}
            preload="intent"
            aria-label={copy.openChartPage}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 px-4 py-4 sm:px-5">
        {isLoadingData ? (
          <div className="flex min-h-[500px] items-center justify-center rounded-[20px] border border-border/50 bg-muted/[0.12]">
            <LoadingSpinner text={t`Loading chart data…`} />
          </div>
        ) : dataError ? (
          <div className="flex min-h-[500px] items-center justify-center rounded-[20px] border border-dashed border-destructive/40 bg-destructive/5 px-6 py-12 text-center text-sm font-medium text-destructive">
            {dataError.message}
          </div>
        ) : !hasData ? (
          <div className="flex min-h-[500px] items-center justify-center rounded-[20px] border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm font-medium text-muted-foreground">
            {getBudgetItemAnalyticsEmptyStateMessage()}
          </div>
        ) : (
          <div className="rounded-[20px] border border-border/50 bg-muted/[0.12] px-2 py-4 sm:px-4">
            <ChartRenderer
              chart={context.chartSearch.chart}
              dataMap={dataSeriesMap}
              timeSeriesData={processedData.timeSeriesData}
              aggregatedData={processedData.aggregatedData}
              unitMap={processedData.unitMap}
              height={500}
              isPreview
              xAxisMarker={
                context.analyticsProps.analyticsView.timeframe === 'selected'
                  ? context.analyticsProps.context.selectedYear
                  : undefined
              }
              onXAxisClick={(value) => {
                if (context.analyticsProps.analyticsView.timeframe !== 'selected') {
                  return
                }

                const nextYear = Number(String(value).slice(0, 4))
                if (!Number.isFinite(nextYear)) {
                  return
                }

                context.analyticsProps.onYearChange?.(nextYear)
              }}
              onAnnotationPositionChange={NOOP_ANNOTATION_HANDLER}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MapSection({ context }: BudgetItemAnalyticsSectionProps) {
  const copy = buildAnalyticsCopy(context.language)
  const navigate = useNavigate()
  const mapSubjectLabel =
    context.seriesLabel.trim().length > 0
      ? context.seriesLabel
      : context.subjectLabel
  const entityDetailsQuery = useEntityDetails({
    cui: context.analyticsProps.context.entityCui,
    reportPeriod: context.analyticsProps.context.currentReportPeriod,
    reportType: context.analyticsProps.context.reportType,
    normalization: context.analyticsProps.context.normalization,
    currency: context.analyticsProps.context.currency,
    inflation_adjusted: context.analyticsProps.context.inflationAdjusted,
  })
  const entityMapViewType = useMemo(
    () => getEntityMapViewType(entityDetailsQuery.data),
    [entityDetailsQuery.data],
  )
  const entityGeoJsonQuery = useGeoJsonData(entityMapViewType, {
    enabled: Boolean(entityDetailsQuery.data),
  })
  const entityMapViewport = useMemo(
    () =>
      toMapViewport(
        entityDetailsQuery.data && entityGeoJsonQuery.data
          ? getEntityFeatureInfo(entityDetailsQuery.data, entityGeoJsonQuery.data)
          : null,
      ),
    [entityDetailsQuery.data, entityGeoJsonQuery.data],
  )
  const { mapState, setMapState } = useMapPreviewRuntimeState({
    mapKey: context.mapKey,
    mapStateDefinition: context.mapStateDefinition,
    forceMapActiveView: true,
    mapCenterOverride: entityMapViewport?.mapCenter,
    mapZoomOverride: entityMapViewport?.mapZoom,
  })

  function handleOpenMapPage() {
    const cloneRef = createMapCloneHandoff({
      mapState,
      mapDescription: context.mapDescription,
    })

    Analytics.capture(Analytics.EVENTS.AdvancedMapAnalyticsCloneHandoffUsed, {
      source: 'budget_item_analytics_modal',
    })

    navigate({
      to: '/maps/editor/new',
      search: { cloneRef },
    })
  }

  return (
    <Card className="flex min-h-[700px] flex-col overflow-hidden rounded-[24px] border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b px-5 py-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-black tracking-tight">
            {context.mapTitle}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {mapSubjectLabel}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={handleOpenMapPage}
          aria-label={copy.openMapPage}
          title={copy.openMapPage}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="h-[620px] overflow-hidden xl:h-[700px]">
          <MapAnalyticsWorkspace
            mode="public"
            layout="preview"
            previewContainerClassName="h-full min-h-0 sm:h-full"
            mapState={mapState}
            setMapState={setMapState}
            mapDescription={context.mapDescription}
            capabilities={{ readOnly: true }}
            mobileControlsDefaultCollapsed={true}
            onEntityCuiSelect={context.analyticsProps.onEntityCuiChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function AnalyticsSelectionChips({ context }: BudgetItemAnalyticsSectionProps) {
  const currentSelection = {
    functionalCode: context.normalizedFunctionalCode,
    economicCode: context.normalizedEconomicCode,
  }

  function handleCodeChange(
    type: BudgetItemAnalyticsCodeType,
    nextValue: string | undefined,
  ) {
    const nextSelection = {
      ...currentSelection,
      ...(type === 'fn'
        ? { functionalCode: nextValue }
        : { economicCode: nextValue }),
    }

    context.analyticsProps.onSelectionChange?.(nextSelection)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <EditableAnalyticsCodeChip
        language={context.language}
        type="fn"
        value={context.normalizedFunctionalCode}
        onChange={(nextValue) => handleCodeChange('fn', nextValue)}
      />
      <EditableAnalyticsCodeChip
        language={context.language}
        type="ec"
        value={context.normalizedEconomicCode}
        onChange={(nextValue) => handleCodeChange('ec', nextValue)}
      />
    </div>
  )
}

function AnalyticsSelectionLinks({
  language,
}: {
  readonly language: BudgetItemAnalyticsResolvedViewState['language']
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <ClassificationExplorerLink language={language} type="fn" />
      <ClassificationExplorerLink language={language} type="ec" />
    </div>
  )
}

export function BudgetItemAnalytics({
  context,
  analyticsView,
  onAnalyticsViewChange,
  onSelectionChange,
  onReportTypeChange,
  onNormalizationChange,
  onInflationAdjustedChange,
  onExpenseTypeChange,
  onYearChange,
  onEntityCuiChange,
  className,
}: Readonly<BudgetItemAnalyticsProps>) {
  const { resolvedTitle, seriesLabel } = useBudgetItemAnalyticsTitle(context)
  const filters = useMemo(
    () => buildBudgetItemAnalyticsFilters(context, analyticsView),
    [analyticsView, context],
  )
  const viewState = useMemo(
    () =>
      buildBudgetItemAnalyticsViewState({
        resolvedTitle,
        seriesLabel,
        language: context.language,
        context,
        analyticsView,
        normalizedFunctionalCode: filters.normalizedFunctionalCode,
        normalizedEconomicCode: filters.normalizedEconomicCode,
        executionChartFilter: filters.executionChartFilter,
        executionMapFilter: filters.executionMapFilter,
        commitmentsChartFilter: filters.commitmentsChartFilter,
        commitmentsMapFilter: filters.commitmentsMapFilter,
      }),
    [analyticsView, context, filters, resolvedTitle, seriesLabel],
  )

  const resolvedContext = useMemo(
    () => ({
      ...filters,
      ...viewState,
      analyticsProps: {
        context,
        analyticsView,
        onAnalyticsViewChange,
        onSelectionChange,
        onReportTypeChange,
        onNormalizationChange,
        onInflationAdjustedChange,
        onExpenseTypeChange,
        onYearChange,
        onEntityCuiChange,
        className,
      },
    }),
    [
      analyticsView,
      className,
      context,
      filters,
      onAnalyticsViewChange,
      onEntityCuiChange,
      onExpenseTypeChange,
      onInflationAdjustedChange,
      onNormalizationChange,
      onSelectionChange,
      onReportTypeChange,
      onYearChange,
      viewState,
    ],
  )

  return (
    <div
      className={cn('flex flex-col', className)}
      data-testid="budget-item-analytics"
    >
      <div className="border-b px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {resolvedContext.title}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          {resolvedContext.subjectLabel}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <AnalyticsSelectionChips context={resolvedContext} />
          <AnalyticsSelectionLinks language={resolvedContext.language} />
        </div>
      </div>
      <AnalyticsControls context={resolvedContext} />
      <div className="flex flex-col gap-5 px-6 py-5">
        <div
          className="flex flex-col gap-5"
          data-testid="budget-item-analytics-sections"
        >
          <div className="min-h-0">
            <AnalyticsChartSection context={resolvedContext} />
          </div>
          <div className="min-h-0">
            <MapSection context={resolvedContext} />
          </div>
        </div>
      </div>
    </div>
  )
}
