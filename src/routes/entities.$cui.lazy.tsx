import { lazy, Suspense, useMemo, useRef, useCallback, memo, useState, startTransition, useEffect } from 'react'
import { useEntityViewAnalytics } from '@/hooks/useEntityViewAnalytics'
import { createLazyFileRoute, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useHotkeys } from 'react-hotkeys-hook'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CampaignAccessShareCard } from '@/features/campaigns/buget/components/CampaignAccessShareCard'
import { ResponsivePopover } from '@/components/ui/ResponsivePopover'
import { EntityHeader } from '@/components/entities/EntityHeader'
import { EntityReportControls } from '@/components/entities/EntityReportControls'
import { EntityReportLabel } from '@/components/entities/EntityReportLabel'
import { ViewLoading } from '@/components/ui/ViewLoading'
import { AlertTriangle, Info } from 'lucide-react'
import { EntityNotificationAnnouncement } from '@/features/notifications/components/EntityNotificationAnnouncement'

import type { GqlReportType, ReportPeriodInput, ReportPeriodType, TMonth, TQuarter } from '@/schemas/reporting'
import { getInitialFilterState, makeTrendPeriod, toExecutionReportType } from '@/schemas/reporting'
import { AnalyticsFilterType, DEFAULT_SELECTED_YEAR, defaultYearRange, type Normalization } from '@/schemas/charts'

import { useEntityViews } from '@/hooks/useEntityViews'
import { useRecentEntities } from '@/hooks/useRecentEntities'
import { useEntityMapFilter } from '@/components/entities/hooks/useEntityMapFilter'
import { useEntityDetails, entityDetailsQueryOptions } from '@/lib/hooks/useEntityDetails'
import type { EntityPageLoaderPayload } from '@/features/entities/page-core'

import { Overview } from '@/components/entities/views/Overview'
import { EntityDetailsData } from '@/lib/api/entities'
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback'
import { FloatingQuickNav } from '@/components/ui/FloatingQuickNav'
import type { NormalizationOptions } from '@/lib/normalization'
import { useGlobalSettings } from '@/lib/hooks/useGlobalSettings'
import { isNonCountyUatEntity } from '@/lib/entity-navigation'
import { DEFAULT_CURRENCY, DEFAULT_INFLATION_ADJUSTED, resolveNormalizationSettings, type NormalizationInput } from '@/lib/globalSettings/params'
import { useQueryClient } from '@tanstack/react-query'

const TrendsView = lazy(() => import('@/components/entities/views/TrendsView').then(m => ({ default: m.TrendsView })))
const EmployeesView = lazy(() =>
  import('@/components/entities/views/EmployeesView')
    .then(module => ({ default: module?.EmployeesView ?? EmployeesViewUnavailable }))
    .catch((error: unknown) => {
      console.error('Failed to load EmployeesView module', error)
      return { default: EmployeesViewUnavailable }
    })
)
const MapView = lazy(() => import('@/components/entities/views/MapView').then(m => ({ default: m.MapView })))
const RankingView = lazy(() => import('@/components/entities/views/RankingView').then(m => ({ default: m.RankingView })))
const RelatedChartsView = lazy(() => import('@/components/entities/views/RelatedChartsView').then(m => ({ default: m.RelatedChartsView })))
const InsStatsView = lazy(() => import('@/components/entities/views/ins-stats-view').then(m => ({ default: m.InsStatsView })))
const EntityReports = lazy(() => import('@/components/entities/EntityReports'))
const EntityRelationships = lazy(() => import('@/components/entities/EntityRelationships').then(m => ({ default: m.EntityRelationships })))
const ContractsView = lazy(() =>
  import('@/components/entities/views/ContractsView')
    .then(module => ({ default: module?.ContractsView ?? ContractsViewUnavailable }))
    .catch((error: unknown) => {
      console.error('Failed to load ContractsView module', error)
      return { default: ContractsViewUnavailable }
    })
)
const CommitmentsView = lazy(() => import('@/components/entities/views/Commitments').then(m => ({ default: m.CommitmentsView })))

function EmployeesViewUnavailable() {
  return (
    <Alert className="max-w-lg w-full">
      <Info className="h-5 w-5" />
      <AlertTitle><Trans>Employees view unavailable</Trans></AlertTitle>
      <AlertDescription>
        <Trans>We could not load this section right now. Please refresh and try again.</Trans>
      </AlertDescription>
    </Alert>
  )
}

function ContractsViewUnavailable() {
  return (
    <Alert className="max-w-lg w-full">
      <Info className="h-5 w-5" />
      <AlertTitle><Trans>Contracts view unavailable</Trans></AlertTitle>
      <AlertDescription>
        <Trans>We could not load this section right now. Please refresh and try again.</Trans>
      </AlertDescription>
    </Alert>
  )
}

function stripBoundaryQuotes(value: string): string {
  return value.replace(/^"+|"+$/g, '')
}

function normalizeSearchPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const normalizedPatch: Record<string, unknown> = { ...patch }

  const month = normalizedPatch.month
  if (typeof month === 'string') {
    const normalizedMonth = stripBoundaryQuotes(month)
    normalizedPatch.month = /^\d{1,2}$/.test(normalizedMonth)
      ? normalizedMonth.padStart(2, '0')
      : normalizedMonth
  }

  const quarter = normalizedPatch.quarter
  if (typeof quarter === 'string') {
    normalizedPatch.quarter = stripBoundaryQuotes(quarter)
  }

  return normalizedPatch
}

export const Route = createLazyFileRoute('/entities/$cui')({
  component: EntityDetailsPage,
})

const { start: START_YEAR, end: END_YEAR } = defaultYearRange
const DEFAULT_PERIOD = 'YEAR'
const DEFAULT_MONTH = '01'
const DEFAULT_QUARTER = 'Q1'

function EntityDetailsPage() {
  const { cui } = useParams({ from: '/entities/$cui' })
  const search = useSearch({ from: '/entities/$cui' })
  const navigate = useNavigate({ from: '/entities/$cui' })
  const queryClient = useQueryClient()
  const loaderData = Route.useLoaderData() as {
    entityPageBootstrap?: {
      loaderPayload?: Pick<EntityPageLoaderPayload, 'ssrEntityDetailsParams'>
    }
    ssrSettings?: {
      currency?: 'RON' | 'EUR' | 'USD'
      inflationAdjusted?: boolean
    }
  } | undefined
  const yearSelectorRef = useRef<HTMLButtonElement>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useHotkeys('mod+;', () => yearSelectorRef.current?.click(), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
  })

  const selectedYear = search.year ?? DEFAULT_SELECTED_YEAR
  const period = search.period ?? DEFAULT_PERIOD
  const month = search.month ?? DEFAULT_MONTH
  const quarter = search.quarter ?? DEFAULT_QUARTER
  const reportTypeStateRaw = search.report_type as GqlReportType | undefined
  const reportTypeState = toExecutionReportType(reportTypeStateRaw)
  const mainCreditorState = search.main_creditor_cui
  const activeView = search.view ?? 'overview'
  const lineItemsTab = search.lineItemsTab as 'functional' | 'funding' | 'expenseType' | undefined
  const selectedFundingKey = search.selectedFundingKey as string | undefined
  const selectedExpenseTypeKey = search.selectedExpenseTypeKey as string | undefined
  const normalizationRaw = (search.normalization as NormalizationInput | undefined) ?? 'total'
  const showPeriodGrowth = Boolean((search as { show_period_growth?: unknown }).show_period_growth)
  const campaignLocale = search.lang === 'en' ? 'en' : 'ro'

  useEntityViewAnalytics({
    cui,
    view: activeView,
    period,
    year: selectedYear,
    normalization: normalizationRaw,
  })

  // Use shared helper for normalization resolution and forced overrides
  const { normalization, forcedOverrides } = useMemo(
    () => resolveNormalizationSettings(normalizationRaw),
    [normalizationRaw]
  )

  // Use unified global settings hook
  // currency/inflationAdjusted: for data fetching (always current target)
  // displayCurrency/displayInflationAdjusted: for UI display (lags until data arrives)
  const ssrSettings = useMemo(() => ({
    currency: loaderData?.ssrSettings?.currency ?? DEFAULT_CURRENCY,
    inflationAdjusted: loaderData?.ssrSettings?.inflationAdjusted ?? DEFAULT_INFLATION_ADJUSTED,
  }), [loaderData?.ssrSettings])

  const {
    currency,
    inflationAdjusted,
    displayCurrency,
    displayInflationAdjusted,
    persistedCurrency,
    persistedInflationAdjusted,
    persistSettings,
    confirmSettingsApplied,
  } = useGlobalSettings(ssrSettings, forcedOverrides)

  const treemapPrimary = search.treemapPrimary as 'fn' | 'ec' | undefined
  const accountCategory = search.accountCategory as 'ch' | 'vn' | undefined
  const commitmentsGrouping = search.commitmentsGrouping as 'fn' | 'ec' | undefined
  const commitmentsDetailLevel = search.commitmentsDetailLevel as 'chapter' | 'detailed' | undefined

  const transferFilter = search.transferFilter as 'all' | 'no-transfers' | 'transfers-only' | undefined

  const reportPeriod = useMemo(() => getInitialFilterState(period, selectedYear, month, quarter), [period, selectedYear, month, quarter])
  const trendPeriod = useMemo(() => makeTrendPeriod(period, selectedYear, START_YEAR, END_YEAR), [period, selectedYear])
  const years = useMemo(() => Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, idx) => END_YEAR - idx), [])
  const ssrLoaderPayload = loaderData?.entityPageBootstrap?.loaderPayload
  const ssrEntityDetailsParams = ssrLoaderPayload?.ssrEntityDetailsParams

  // Derive SSR entity from rehydrated cache using SSR params (once on mount)
  // This provides immediate data even if client params differ from SSR params
  const ssrPlaceholder = useMemo(() => {
    if (!ssrEntityDetailsParams) return undefined
    const ssrQueryOptions = entityDetailsQueryOptions(ssrEntityDetailsParams)
    return queryClient.getQueryData<EntityDetailsData>(ssrQueryOptions.queryKey)
  }, [queryClient, ssrEntityDetailsParams])

  const { data: entity, isLoading, isFetching, isError, error } = useEntityDetails({
    cui,
    normalization,
    currency,
    inflation_adjusted: inflationAdjusted,
    show_period_growth: showPeriodGrowth,
    reportPeriod,
    reportType: reportTypeState,
    trendPeriod,
    mainCreditorCui: mainCreditorState,
  }, {
    ssrPlaceholder,
  })

  // When data loads with new settings, confirm them so display values update
  // This prevents showing new currency label with old currency value
  useEffect(() => {
    if (entity && !isFetching) {
      confirmSettingsApplied()
    }
  }, [entity, isFetching, confirmSettingsApplied])

  useRecentEntities(entity)
  const { mapFilters, updateMapFilters } = useEntityMapFilter({ year: selectedYear, currency: displayCurrency })
  const views = useEntityViews(entity)

  const debouncedPrefetch = useDebouncedCallback(
    (payload: { report_period: ReportPeriodInput; report_type?: GqlReportType; main_creditor_cui?: string; normalization?: Normalization }) => {
      const { report_period, report_type, normalization: norm } = payload;
      const startAnchor = report_period.selection.interval?.start || '' as string;
      const hoveredYear = Number(String(startAnchor).slice(0, 4)) || selectedYear;
      const nextTrend = makeTrendPeriod(report_period.type, hoveredYear, START_YEAR, END_YEAR);
      queryClient.prefetchQuery(
        entityDetailsQueryOptions({
          cui,
          normalization: norm ?? normalization,
          currency,
          inflation_adjusted: inflationAdjusted,
          show_period_growth: showPeriodGrowth,
          reportPeriod: report_period,
          reportType: report_type,
          trendPeriod: nextTrend,
          mainCreditorCui: payload.main_creditor_cui ?? mainCreditorState,
        })
      );
    },
    100
  );

  const updateSearch = useCallback((patch: Record<string, unknown>) => {
    const normalizedPatch = normalizeSearchPatch(patch)

    // Skip navigation if nothing actually changes
    const isNoOp = Object.keys(normalizedPatch).every((key) => {
      const nextVal = normalizedPatch[key]
      const prevVal = (search as Record<string, unknown>)[key]
      return nextVal === undefined ? prevVal === undefined : prevVal === nextVal
    })
    if (isNoOp) return

    startTransition(() => {
      navigate({
        search: (prev) => {
          const nextSearch = { ...prev } as Record<string, unknown>
          for (const [key, value] of Object.entries(normalizedPatch)) {
            if (value === undefined) {
              // TanStack Router drops undefined values in serialization, but we delete
              // for correctness and to avoid `key=undefined` in edge cases.
              delete (nextSearch as Record<string, unknown>)[key]
              continue
            }
            ;(nextSearch as Record<string, unknown>)[key] = value
          }
          return nextSearch
        },
        replace: true,
        resetScroll: false,
      })
    })
  }, [navigate, search])

  const handleYearChange = useCallback((year: number) => updateSearch({ year }), [updateSearch])

  const handleSearchChange = useCallback((type: 'expense' | 'income', value: string) => {
    updateSearch({ [`${type}Search`]: value || undefined })
  }, [updateSearch])

  const handleLineItemsTabChange = useCallback((tab: 'functional' | 'funding' | 'expenseType') => {
    updateSearch({ lineItemsTab: tab })
  }, [updateSearch])

  const handleSelectedFundingKeyChange = useCallback((key: string) => {
    updateSearch({ selectedFundingKey: key || undefined })
  }, [updateSearch])

  const handleSelectedExpenseTypeKeyChange = useCallback((key: string) => {
    updateSearch({ selectedExpenseTypeKey: key || undefined })
  }, [updateSearch])

  const handleAnalyticsChange = useCallback((key: 'analyticsChartType' | 'analyticsDataType', value: string) => {
    updateSearch({ [key]: value })
  }, [updateSearch])

  const handlePeriodItemSelect = useCallback((label: string) => {
    if (period === 'QUARTER') updateSearch({ quarter: label })
    else if (period === 'MONTH') updateSearch({ month: label })
  }, [period, updateSearch])

  const handleTreemapPrimaryChange = useCallback((primary: 'fn' | 'ec') => {
    updateSearch({ treemapPrimary: primary })
  }, [updateSearch])

  const handleTreemapPathChange = useCallback((path?: string) => {
    updateSearch({ treemapPath: path })
  }, [updateSearch])

  const handleAccountCategoryChange = useCallback((category: 'ch' | 'vn') => {
    updateSearch({ accountCategory: category })
  }, [updateSearch])

  const handleTransferFilterChange = useCallback((filter: 'all' | 'no-transfers' | 'transfers-only') => {
    updateSearch({ transferFilter: filter })
  }, [updateSearch])

  const handleCommitmentsGroupingChange = useCallback((grouping: 'fn' | 'ec', detailLevel: 'chapter' | 'detailed') => {
    updateSearch({ commitmentsGrouping: grouping, commitmentsDetailLevel: detailLevel })
  }, [updateSearch])

  const advancedFilter = search.advancedFilter as string | undefined

  const handleAdvancedFilterChange = useCallback((filter: string | undefined) => {
    updateSearch({ advancedFilter: filter })
  }, [updateSearch])

  const handleNormalizationChange = useCallback((next: NormalizationOptions) => {
    const nextNormalizationRaw = (next.normalization as NormalizationInput | undefined) ?? normalizationRaw
    const { forcedOverrides: nextForcedOverrides } = resolveNormalizationSettings(nextNormalizationRaw)

    const currencyChangedByUser = next.currency !== undefined && next.currency !== displayCurrency
    const inflationChangedByUser = next.inflation_adjusted !== undefined && next.inflation_adjusted !== displayInflationAdjusted

    if (currencyChangedByUser && nextForcedOverrides.currency === undefined && next.currency !== undefined) {
      persistSettings({ currency: next.currency })
    }

    if (inflationChangedByUser && nextForcedOverrides.inflationAdjusted === undefined && next.inflation_adjusted !== undefined) {
      persistSettings({ inflationAdjusted: next.inflation_adjusted })
    }

    const isLeavingForcedCurrency = forcedOverrides.currency !== undefined && nextForcedOverrides.currency === undefined
    const isLeavingForcedInflation = forcedOverrides.inflationAdjusted !== undefined && nextForcedOverrides.inflationAdjusted === undefined

    const nextCurrencyParam = nextForcedOverrides.currency !== undefined
      ? undefined
      : currencyChangedByUser && next.currency !== undefined
        ? next.currency
        : isLeavingForcedCurrency
          ? persistedCurrency
          : next.currency ?? displayCurrency

    const nextInflationParam = nextForcedOverrides.inflationAdjusted !== undefined
      ? undefined
      : inflationChangedByUser && next.inflation_adjusted !== undefined
        ? next.inflation_adjusted
        : isLeavingForcedInflation
          ? persistedInflationAdjusted
          : next.inflation_adjusted ?? displayInflationAdjusted

    updateSearch({
      normalization: next.normalization,
      show_period_growth: next.show_period_growth,
      currency: nextCurrencyParam,
      inflation_adjusted: nextInflationParam,
    })
  }, [
    displayCurrency,
    displayInflationAdjusted,
    forcedOverrides.currency,
    forcedOverrides.inflationAdjusted,
    normalizationRaw,
    persistSettings,
    persistedCurrency,
    persistedInflationAdjusted,
    updateSearch,
  ])

  const updateReportPeriodInSearch = useCallback((patch: Record<string, unknown>) => {
    const normalizedPatch = normalizeSearchPatch(patch)

    startTransition(() => {
      navigate({
        search: (prev) => {
          const nextState = normalizeSearchPatch({ ...prev, ...normalizedPatch })
          const nextPeriod = nextState.period

          return {
            ...nextState,
            month: nextPeriod === 'MONTH' ? nextState.month : undefined,
            quarter: nextPeriod === 'QUARTER' ? nextState.quarter : undefined,
            report_type: ('report_type' in normalizedPatch && normalizedPatch.report_type) ? normalizedPatch.report_type : prev.report_type,
            main_creditor_cui: ('main_creditor_cui' in normalizedPatch && normalizedPatch.main_creditor_cui) ? normalizedPatch.main_creditor_cui : prev.main_creditor_cui,
          } as typeof prev
        },
        replace: true,
        resetScroll: false,
      })
    })
  }, [navigate])

  const handleReportControlsChange = useCallback((payload: { report_period: ReportPeriodInput; [key: string]: unknown }) => {
    const { report_period, ...restPayload } = payload
    const patch: Record<string, unknown> = { period: report_period.type, ...restPayload }
    const intervalDate = report_period.selection.interval?.start

    if (intervalDate) {
      patch.year = Number(intervalDate.slice(0, 4))
      if (report_period.type === 'MONTH') patch.month = intervalDate.split('-')[1]
      if (report_period.type === 'QUARTER') patch.quarter = intervalDate.split('-')[1]
    }
    updateReportPeriodInSearch(patch)
  }, [updateReportPeriodInSearch])

  // Prepare filter input for FloatingQuickNav
  // Use displayCurrency/displayInflationAdjusted for UI to prevent label/value mismatch
  const filterInput: AnalyticsFilterType = useMemo(() => ({
    entity_cuis: [cui],
    report_period: reportPeriod,
    account_category: accountCategory ?? 'ch',
    normalization: normalization,
    currency: displayCurrency,
    inflation_adjusted: displayInflationAdjusted,
    show_period_growth: showPeriodGrowth,
  }), [cui, reportPeriod, accountCategory, normalization, displayCurrency, displayInflationAdjusted, showPeriodGrowth])

  // Determine mapViewType based on entity type
  const mapViewType = useMemo<'UAT' | 'County'>(() => {
    if (entity?.entity_type === 'admin_county_council') return 'County'
    if (entity?.is_uat) return 'UAT'
    return 'UAT'
  }, [entity?.entity_type, entity?.is_uat])
  const showCampaignAccessCard = Boolean(
    entity &&
      isNonCountyUatEntity({
        cui: entity.cui,
        entityType: entity.entity_type,
        isUat: entity.is_uat,
      }),
  )

  if (isError) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
        <Alert variant="destructive" className="max-w-lg w-full">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle><Trans>Error Fetching Entity Details</Trans></AlertTitle>
          <AlertDescription>
            <Trans>There was a problem fetching the details for CUI: <strong>{cui}</strong>.</Trans>
            {error && <p className="mt-2 text-sm"><Trans>Details:</Trans> {error.message}</p>}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!entity && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
        <Alert className="max-w-lg w-full">
          <Info className="h-5 w-5" />
          <AlertTitle><Trans>No Data Found</Trans></AlertTitle>
          <AlertDescription>
            <Trans>No entity details found for CUI: <strong>{cui}</strong>. It's possible this entity does not exist or has no associated data.</Trans>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      {/* head handled via Route.head */}
      <EntityNotificationAnnouncement />
      <FloatingQuickNav
        mapViewType={mapViewType}
        mapActive
        chartActive
        tableActive
        filterInput={filterInput}
      />
      <div className="container mx-auto max-w-7xl space-y-4 sm:space-y-6 lg:space-y-8">
        <EntityHeader
          entity={entity}
          isLoading={isLoading}
          views={views}
          activeView={activeView}
          yearSelector={
            <ResponsivePopover
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              trigger={
                <Button variant="outline" ref={yearSelectorRef} aria-label={t`Reporting period`} className="rounded-xl px-4 py-2 shadow-sm h-auto text-left">
                  <EntityReportLabel period={reportPeriod} reportType={reportTypeState ?? entity?.default_report_type} mainCreditorLabel={mainCreditorState} />
                </Button>
              }
              content={
                <EntityReportControls
                  entity={entity}
                  periodType={period}
                  year={selectedYear}
                  month={month as TMonth}
                  quarter={quarter as TQuarter}
                  reportType={reportTypeState ?? entity?.default_report_type}
                  mainCreditor={String(mainCreditorState)}
                  normalization={normalization}
                  onChange={handleReportControlsChange}
                  onPrefetch={debouncedPrefetch}
                />
              }
              className="p-4 max-h-[60vh] sm:max-h-none sm:w-md overflow-auto"
              align="end"
              mobileSide="bottom"
            />
          }
        />
        {showCampaignAccessCard && entity ? (
          <CampaignAccessShareCard
            entityCui={entity.cui}
            locale={campaignLocale}
            className="max-w-none"
          />
        ) : null}
        <MemoizedViewsContent
          cui={cui}
          entity={entity}
          isLoading={isLoading}
          activeView={activeView}
          selectedYear={selectedYear}
          normalization={normalization}
          currency={displayCurrency}
          inflationAdjusted={displayInflationAdjusted}
          showPeriodGrowth={showPeriodGrowth}
          years={years}
          period={period}
          reportPeriod={reportPeriod}
          trendPeriod={trendPeriod}
          reportTypeState={reportTypeState}
          reportsTypeState={reportTypeStateRaw}
          mainCreditorCui={mainCreditorState}
          search={search}
          mapFilters={mapFilters}
          updateMapFilters={updateMapFilters}
          handleYearChange={handleYearChange}
          handleSearchChange={handleSearchChange}
          handleNormalizationChange={handleNormalizationChange}
          handlePeriodItemSelect={handlePeriodItemSelect}
          handleAnalyticsChange={handleAnalyticsChange}
          lineItemsTab={lineItemsTab ?? 'functional'}
          handleLineItemsTabChange={handleLineItemsTabChange}
          selectedFundingKey={selectedFundingKey ?? ''}
          selectedExpenseTypeKey={selectedExpenseTypeKey ?? ''}
          handleSelectedFundingKeyChange={handleSelectedFundingKeyChange}
          handleSelectedExpenseTypeKeyChange={handleSelectedExpenseTypeKeyChange}
          treemapPrimary={treemapPrimary}
          accountCategory={accountCategory}
          handleTreemapPrimaryChange={handleTreemapPrimaryChange}
          handleAccountCategoryChange={handleAccountCategoryChange}
          treemapPath={(search as Record<string, unknown>).treemapPath as string | undefined}
          handleTreemapPathChange={handleTreemapPathChange}
          transferFilter={transferFilter}
          handleTransferFilterChange={handleTransferFilterChange}
          advancedFilter={advancedFilter}
          handleAdvancedFilterChange={handleAdvancedFilterChange}
          commitmentsGrouping={commitmentsGrouping}
          commitmentsDetailLevel={commitmentsDetailLevel}
          handleCommitmentsGroupingChange={handleCommitmentsGroupingChange}
        />
      </div>
    </div>
  )
}

interface ViewsContentProps {
  cui: string;
  entity: EntityDetailsData | null | undefined;
  isLoading: boolean;
  activeView: string;
  selectedYear: number;
  normalization: Normalization;
  currency: 'RON' | 'EUR' | 'USD';
  inflationAdjusted: boolean;
  showPeriodGrowth: boolean;
  years: number[];
  period: ReportPeriodType;
  reportPeriod: ReportPeriodInput;
  trendPeriod: ReportPeriodInput;
  reportTypeState?: GqlReportType;
  reportsTypeState?: GqlReportType;
  mainCreditorCui?: string;
  search: { expenseSearch?: string, incomeSearch?: string, [key: string]: unknown };
  mapFilters: AnalyticsFilterType;
  updateMapFilters: (update: Partial<AnalyticsFilterType>) => void;
  handleYearChange: (year: number) => void;
  handleSearchChange: (type: 'expense' | 'income', value: string) => void;
  handleNormalizationChange: (next: NormalizationOptions) => void;
  handlePeriodItemSelect: (label: string) => void;
  handleAnalyticsChange: (key: 'analyticsChartType' | 'analyticsDataType', value: string) => void;
  lineItemsTab: 'functional' | 'funding' | 'expenseType';
  handleLineItemsTabChange: (tab: 'functional' | 'funding' | 'expenseType') => void;
  selectedFundingKey?: string;
  selectedExpenseTypeKey?: string;
  handleSelectedFundingKeyChange: (key: string) => void;
  handleSelectedExpenseTypeKeyChange: (key: string) => void;
  treemapPrimary?: 'fn' | 'ec';
  accountCategory?: 'ch' | 'vn';
  handleTreemapPrimaryChange: (primary: 'fn' | 'ec') => void;
  handleAccountCategoryChange: (category: 'ch' | 'vn') => void;
  treemapPath?: string;
  handleTreemapPathChange: (path?: string) => void;
  transferFilter?: 'all' | 'no-transfers' | 'transfers-only';
  handleTransferFilterChange: (filter: 'all' | 'no-transfers' | 'transfers-only') => void;
  advancedFilter?: string;
  handleAdvancedFilterChange: (filter: string | undefined) => void;
  commitmentsGrouping?: 'fn' | 'ec';
  commitmentsDetailLevel?: 'chapter' | 'detailed';
  handleCommitmentsGroupingChange: (grouping: 'fn' | 'ec', detailLevel: 'chapter' | 'detailed') => void;
}

function ViewsContent(props: ViewsContentProps) {
  const {
    cui, entity, activeView, selectedYear, normalization, currency, inflationAdjusted, showPeriodGrowth, years, period, reportPeriod, trendPeriod,
    reportTypeState, reportsTypeState, search, mapFilters, updateMapFilters, handleYearChange, mainCreditorCui,
    handleSearchChange, handleNormalizationChange, handlePeriodItemSelect, handleAnalyticsChange,
    lineItemsTab, handleLineItemsTabChange,
    selectedFundingKey, selectedExpenseTypeKey, handleSelectedFundingKeyChange, handleSelectedExpenseTypeKeyChange,
    isLoading, treemapPrimary, accountCategory, handleTreemapPrimaryChange, handleAccountCategoryChange,
    treemapPath, handleTreemapPathChange,
    transferFilter, handleTransferFilterChange,
    advancedFilter, handleAdvancedFilterChange,
    commitmentsGrouping, commitmentsDetailLevel, handleCommitmentsGroupingChange,
  } = props;

  const normalizationOptions: NormalizationOptions = {
    normalization,
    currency,
    inflation_adjusted: inflationAdjusted,
    show_period_growth: showPeriodGrowth,
  }

  const trendsViewProps = {
    entity,
    isLoading: isLoading,
    currentYear: selectedYear,
    onYearClick: handleYearChange,
    initialExpenseSearch: search.expenseSearch,
    initialIncomeSearch: search.incomeSearch,
    onSearchChange: handleSearchChange,
    normalizationOptions,
    onNormalizationChange: handleNormalizationChange,
    reportPeriod,
    trendPeriod,
    reportType: reportTypeState ?? entity?.default_report_type,
    onSelectPeriod: handlePeriodItemSelect,
    years,
    lineItemsTab: lineItemsTab ?? 'functional',
    onLineItemsTabChange: handleLineItemsTabChange,
    selectedFundingKey: selectedFundingKey ?? '',
    selectedExpenseTypeKey: selectedExpenseTypeKey ?? '',
    onSelectedFundingKeyChange: handleSelectedFundingKeyChange,
    onSelectedExpenseTypeKeyChange: handleSelectedExpenseTypeKeyChange,
    transferFilter,
    onTransferFilterChange: handleTransferFilterChange,
    advancedFilter,
    onAdvancedFilterChange: handleAdvancedFilterChange,
  }

  return (
    <Suspense fallback={<ViewLoading />}>
      {(() => {
        switch (activeView) {
          case 'reports': return <EntityReports cui={cui} initialType={reportsTypeState ?? entity?.default_report_type} />
          case 'expense-trends': return <TrendsView {...trendsViewProps} type="expense" treemapPrimary={treemapPrimary} onTreemapPrimaryChange={handleTreemapPrimaryChange} treemapPath={treemapPath} onTreemapPathChange={handleTreemapPathChange} />
          case 'income-trends': return <TrendsView {...trendsViewProps} type="income" treemapPrimary={treemapPrimary} onTreemapPrimaryChange={handleTreemapPrimaryChange} treemapPath={treemapPath} onTreemapPathChange={handleTreemapPathChange} />
          case 'map': return <MapView entity={entity} mapFilters={mapFilters} updateMapFilters={updateMapFilters} period={reportPeriod} />
          case 'employees': return <EmployeesView entity={entity} />
          case 'ranking': return <RankingView />
          case 'ins-stats': return <InsStatsView entity={entity} reportPeriod={reportPeriod} />
          case 'related-charts': return <RelatedChartsView entity={entity} normalizationOptions={normalizationOptions} />
          case 'relationships': return <EntityRelationships cui={cui} />
          case 'contracts': return <ContractsView entity={entity} />
          case 'commitments': return (
            <CommitmentsView
              entity={entity}
              currentYear={selectedYear}
              reportPeriod={reportPeriod}
              trendPeriod={trendPeriod}
              reportType={reportTypeState ?? entity?.default_report_type}
              mainCreditorCui={mainCreditorCui}
              normalizationOptions={normalizationOptions}
              onNormalizationChange={handleNormalizationChange}
              commitmentsGrouping={commitmentsGrouping}
              commitmentsDetailLevel={commitmentsDetailLevel}
              onCommitmentsGroupingChange={handleCommitmentsGroupingChange}
              onYearChange={handleYearChange}
              onSelectPeriod={handlePeriodItemSelect}
              selectedQuarter={search.quarter as string | undefined}
              selectedMonth={search.month as string | undefined}
            />
          )
          default: return <Overview cui={cui} entity={entity} isLoading={isLoading} selectedYear={selectedYear} normalizationOptions={normalizationOptions} years={years} periodType={period} reportPeriod={reportPeriod} reportType={reportTypeState} mainCreditorCui={mainCreditorCui} search={search} onChartNormalizationChange={handleNormalizationChange} onYearChange={handleYearChange} onPeriodItemSelect={handlePeriodItemSelect} onSearchChange={handleSearchChange} onAnalyticsChange={handleAnalyticsChange} onLineItemsTabChange={handleLineItemsTabChange} onSelectedFundingKeyChange={handleSelectedFundingKeyChange} onSelectedExpenseTypeKeyChange={handleSelectedExpenseTypeKeyChange} treemapPrimary={treemapPrimary} accountCategory={accountCategory} onTreemapPrimaryChange={handleTreemapPrimaryChange} onAccountCategoryChange={handleAccountCategoryChange} treemapPath={treemapPath} onTreemapPathChange={handleTreemapPathChange} transferFilter={transferFilter} onTransferFilterChange={handleTransferFilterChange} advancedFilter={advancedFilter} onAdvancedFilterChange={handleAdvancedFilterChange} />
        }
      })()}
    </Suspense>
  )
}

const MemoizedViewsContent = memo(ViewsContent);
