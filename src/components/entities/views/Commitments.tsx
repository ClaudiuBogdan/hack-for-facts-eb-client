/**
 * Commitments Bugetare View for Entity Detail Page
 *
 * Progressive disclosure design:
 * 1. KPI Summary (3 cards)
 * 2. Trends Chart
 * 3. Financial Flow Visualization
 * 4. Category Breakdown + Info Panel
 * 5. Detailed Table
 */

import { useMemo, type ReactNode } from 'react'
import { EntityDetailsData } from '@/lib/api/entities'
import {
  useCommitmentsSummary,
  useCommitmentsAggregatedAll,
  useCommitmentsAnalytics,
} from '@/hooks/useCommitmentsData'
import {
  extractSummaryValues,
  buildCommitmentsFilter,
  buildPaidAggregatedInputs,
  combineCommitmentsAggregatedNodes,
} from '@/lib/api/commitments'
import type { CommitmentsAnalyticsInput } from '@/lib/api/commitments'
import type { CommitmentsFilterInput, CommitmentsAnalyticsSeries } from '@/schemas/commitments'
import type { NormalizationOptions } from '@/lib/normalization'
import { normalizeNormalizationOptions } from '@/lib/normalization'
import type { ReportPeriodInput, ReportPeriodType, GqlReportType, PeriodDate } from '@/schemas/reporting'
import { getQuarterForMonth, toCommitmentReportType } from '@/schemas/reporting'
import { getCodeAtDepth } from '@/lib/utils'
import {
  StatCard,
  CommitmentsTrends,
  CategoryChart,
  DetailTable,
  type CategoryData,
} from '@/components/commitments'
import { EntityReportsSummary } from '@/components/entities/EntityReportsSummary'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { getClassificationName } from '@/lib/classifications'
import {
  getEconomicChapterName,
  getEconomicSubchapterName,
} from '@/lib/economic-classifications'
import type { Grouping, DetailLevel } from '@/components/commitments/DetailTable'
import { buildEntityCommitmentsChartLink } from '@/lib/chart-links'

type Props = {
  readonly entity: EntityDetailsData | null | undefined
  readonly currentYear: number
  readonly reportPeriod: ReportPeriodInput
  readonly trendPeriod: ReportPeriodInput
  readonly reportType?: GqlReportType
  readonly mainCreditorCui?: string
  readonly normalizationOptions: NormalizationOptions
  readonly onNormalizationChange: (next: NormalizationOptions) => void
  readonly commitmentsGrouping?: Grouping
  readonly commitmentsDetailLevel?: DetailLevel
  readonly onCommitmentsGroupingChange?: (grouping: Grouping, detailLevel: DetailLevel) => void
  readonly onYearChange?: (year: number) => void
  readonly onSelectPeriod?: (label: string) => void
  readonly selectedQuarter?: string
  readonly selectedMonth?: string
  readonly onReportTypeToggle?: () => void
  readonly onNormalizationToggle?: () => void
  readonly reportTypeLabel?: string
  readonly normalizationLabel?: string
  readonly allowPerCapita?: boolean
  readonly headerSlot?: ReactNode
  readonly reportsSlot?: ReactNode
}

/**
 * Convert MONTH selections to QUARTER selections, since commitments data is natively quarterly.
 */
export function toCommitmentsReportPeriod(reportPeriod: ReportPeriodInput): ReportPeriodInput {
  if (reportPeriod.type !== 'MONTH') return reportPeriod

  // Convert month interval to quarter interval
  const interval = reportPeriod.selection.interval
  if (interval) {
    const startMonth = parseInt(interval.start.split('-')[1] || '1', 10)
    const endMonth = parseInt(interval.end.split('-')[1] || '12', 10)
    const startYear = interval.start.split('-')[0]
    const endYear = interval.end.split('-')[0]
    const startQ = getQuarterForMonth(startMonth)
    const endQ = getQuarterForMonth(endMonth)
    return {
      type: 'QUARTER' as ReportPeriodType,
      selection: {
        interval: {
          start: `${startYear}-${startQ}` as PeriodDate,
          end: `${endYear}-${endQ}` as PeriodDate,
        },
      },
    }
  }

  // Convert month dates → quarter dates (dedupe within the same quarter)
  const dates = reportPeriod.selection.dates ?? []
  const quarterDates = Array.from(new Set(
    dates.map((date) => {
      const [year, monthStr] = date.split('-')
      const month = parseInt(monthStr || '1', 10)
      const quarter = getQuarterForMonth(month)
      return `${year}-${quarter}` as PeriodDate
    })
  )).sort()

  return {
    type: 'QUARTER' as ReportPeriodType,
    selection: { dates: quarterDates },
  }
}

export function CommitmentsView({
  entity,
  currentYear,
  reportPeriod,
  trendPeriod,
  reportType,
  mainCreditorCui,
  normalizationOptions,
  onNormalizationChange,
  commitmentsGrouping,
  commitmentsDetailLevel,
  onCommitmentsGroupingChange,
  onYearChange,
  onSelectPeriod,
  selectedQuarter,
  selectedMonth,
  onReportTypeToggle,
  onNormalizationToggle,
  reportTypeLabel,
  normalizationLabel,
  allowPerCapita,
  headerSlot,
  reportsSlot,
}: Props) {
  const cui = entity?.cui ?? ''
  const entityName = entity?.name ?? ''
  const grouping: Grouping = commitmentsGrouping ?? 'fn'
  const detailLevel: DetailLevel = commitmentsDetailLevel ?? 'chapter'
  const normalized = normalizeNormalizationOptions(normalizationOptions)
  const effectiveReportType: GqlReportType = reportType ?? entity?.default_report_type ?? 'PRINCIPAL_AGGREGATED'
  const commitmentReportType = useMemo(() => toCommitmentReportType(effectiveReportType), [effectiveReportType])

  // Auto-convert MONTH → QUARTER for commitments data
  const commitmentsReportPeriod = useMemo(
    () => toCommitmentsReportPeriod(reportPeriod),
    [reportPeriod]
  )
  const commitmentsTrendPeriod = useMemo(
    () => toCommitmentsReportPeriod(trendPeriod),
    [trendPeriod]
  )

  // Build the filter for all commitments queries
  const filter = useMemo<CommitmentsFilterInput>(
    () =>
      buildCommitmentsFilter({
        reportPeriod: commitmentsReportPeriod,
        reportType: effectiveReportType,
        cui,
        normalization: normalized.normalization,
        currency: normalized.currency,
        inflationAdjusted: normalized.inflation_adjusted,
        excludeTransfers: true,
      }),
    [commitmentsReportPeriod, effectiveReportType, cui, normalized.normalization, normalized.currency, normalized.inflation_adjusted]
  )

  const trendFilter = useMemo(
    () =>
      buildCommitmentsFilter({
        reportPeriod: commitmentsTrendPeriod,
        reportType: effectiveReportType,
        cui,
        normalization: normalized.normalization,
        currency: normalized.currency,
        inflationAdjusted: normalized.inflation_adjusted,
        showPeriodGrowth: normalized.show_period_growth,
        excludeTransfers: true,
      }),
    [
      commitmentsTrendPeriod,
      effectiveReportType,
      cui,
      normalized.normalization,
      normalized.currency,
      normalized.inflation_adjusted,
      normalized.show_period_growth,
    ]
  )

  // Fetch summary data
  const { data: summaryData, isLoading: isSummaryLoading } = useCommitmentsSummary(
    filter,
    { enabled: !!cui }
  )

  const hasNonTreasuryPayments = useMemo(
    () => (summaryData?.nodes ?? []).some((n) => n.plati_non_trezor > 0),
    [summaryData]
  )

  // Fetch aggregated queries for the category chart
  // TODO: Consider a single aggregated query with multiple metrics when the API supports it
  const budgetAggInput = useMemo(
    () => ({ filter, metric: 'CREDITE_BUGETARE_DEFINITIVE' as const, limit: 20 }),
    [filter]
  )
  const committedAggInput = useMemo(
    () => ({ filter, metric: 'CREDITE_ANGAJAMENT' as const, limit: 20 }),
    [filter]
  )
  const { paidTreasury: paidTreasuryAggInput, paidNonTreasury: paidNonTreasuryAggInput } = useMemo(
    () => buildPaidAggregatedInputs({ filter, limit: 20 }),
    [filter]
  )

  const { data: budgetAgg, isLoading: isBudgetAggLoading } = useCommitmentsAggregatedAll(
    budgetAggInput,
    { enabled: !!cui }
  )
  const { data: committedAgg, isLoading: isCommittedAggLoading } = useCommitmentsAggregatedAll(
    committedAggInput,
    { enabled: !!cui }
  )
  const { data: paidTreasuryAgg, isLoading: isPaidTreasuryAggLoading } = useCommitmentsAggregatedAll(
    paidTreasuryAggInput,
    { enabled: !!cui }
  )
  const { data: paidNonTreasuryAgg } = useCommitmentsAggregatedAll(
    paidNonTreasuryAggInput,
    { enabled: !!cui && hasNonTreasuryPayments }
  )

  const analyticsInputs = useMemo<CommitmentsAnalyticsInput[]>(() => {
    if (!cui) return []
    const inputs: CommitmentsAnalyticsInput[] = [
      { filter: trendFilter, metric: 'CREDITE_BUGETARE_DEFINITIVE' as const, seriesId: 'budget' },
      { filter: trendFilter, metric: 'CREDITE_ANGAJAMENT' as const, seriesId: 'commitments' },
      { filter: trendFilter, metric: 'PLATI_TREZOR' as const, seriesId: 'payments_trezor' },
    ]
    if (hasNonTreasuryPayments) {
      inputs.push({ filter: trendFilter, metric: 'PLATI_NON_TREZOR' as const, seriesId: 'payments_non_trezor' })
    }
    return inputs
  }, [cui, trendFilter, hasNonTreasuryPayments])

  const { data: analyticsSeries, isLoading: isAnalyticsLoading } = useCommitmentsAnalytics(
    analyticsInputs,
    { enabled: !!cui }
  )

  const analyticsMap = useMemo(() => {
    const map = new Map<string, CommitmentsAnalyticsSeries>()
    for (const series of analyticsSeries ?? []) {
      map.set(series.seriesId, series)
    }
    return map
  }, [analyticsSeries])

  const budgetTrend = analyticsMap.get('budget') ?? null
  const commitmentsTrend = analyticsMap.get('commitments') ?? null
  const paymentsTrezorTrend = analyticsMap.get('payments_trezor') ?? null
  const paymentsNonTrezorTrend = analyticsMap.get('payments_non_trezor') ?? null

  // `PLATI_NON_TREZOR` may be unsupported/missing in some deployments; don't block UI on it.
  const isCategoryLoading = isBudgetAggLoading || isCommittedAggLoading || isPaidTreasuryAggLoading

  // Extract summary values from union type
  const summaryValues = useMemo(
    () => extractSummaryValues(summaryData?.nodes ?? []),
    [summaryData]
  )
  const { totalBudget, commitmentAuthority, committed, paid } = summaryValues

  // Join the aggregated queries into CategoryData[]
  // The API returns rows grouped by (functional_code, economic_code), so we
  // must sum amounts per group code before joining across metrics.
  // Grouping dimension (fn/ec) and detail level (chapter/detailed) are controlled
  // by the DetailTable toggle controls.
  const categoryData = useMemo<CategoryData[]>(() => {
    if (!budgetAgg || !committedAgg || !paidTreasuryAgg) return []

    const isFn = grouping === 'fn'
    const segmentCount = detailLevel === 'chapter' ? 1 : 2

    const getGroupCode = (n: { functional_code: string; economic_code: string | null }) => {
      const raw = isFn ? n.functional_code : (n.economic_code ?? '')
      return getCodeAtDepth(raw, segmentCount)
    }

    const resolveName = (code: string) => {
      if (isFn) return getClassificationName(code)
      if (segmentCount === 1) return getEconomicChapterName(code)
      return getEconomicSubchapterName(code)
    }

    const sumByGroup = (nodes: typeof budgetAgg.nodes) => {
      const map = new Map<string, { name: string; amount: number }>()
      for (const n of nodes) {
        const code = getGroupCode(n)
        if (!code) continue
        const existing = map.get(code)
        if (existing) {
          existing.amount += n.amount
        } else {
          const fallbackName = isFn ? n.functional_name : (n.economic_name ?? code)
          map.set(code, { name: resolveName(code) ?? fallbackName, amount: n.amount })
        }
      }
      return map
    }

    const budgetMap = sumByGroup(budgetAgg.nodes)
    const committedMap = sumByGroup(committedAgg.nodes)
    const paidNodes = combineCommitmentsAggregatedNodes(
      paidTreasuryAgg.nodes,
      paidNonTreasuryAgg?.nodes ?? []
    )
    const paidMap = sumByGroup(paidNodes)

    const allCodes = new Set([...budgetMap.keys(), ...committedMap.keys(), ...paidMap.keys()])
    return Array.from(allCodes).map((code) => ({
      id: code,
      name: budgetMap.get(code)?.name ?? committedMap.get(code)?.name ?? paidMap.get(code)?.name ?? code,
      budget: budgetMap.get(code)?.amount ?? 0,
      committed: committedMap.get(code)?.amount ?? 0,
      paid: paidMap.get(code)?.amount ?? 0,
    }))
  }, [budgetAgg, committedAgg, paidTreasuryAgg, paidNonTreasuryAgg, grouping, detailLevel])

  const categoryChartData = useMemo(() => {
    return [...categoryData]
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 20)
  }, [categoryData])

  const derivedSelectedQuarter = useMemo(() => {
    if (selectedQuarter) return selectedQuarter
    if (selectedMonth) {
      const monthNumber = parseInt(selectedMonth, 10)
      if (Number.isFinite(monthNumber)) return getQuarterForMonth(monthNumber)
    }
    return undefined
  }, [selectedQuarter, selectedMonth])

  const commitmentsChartLink = useMemo(() => {
    if (!entityName || !cui) return null
    return buildEntityCommitmentsChartLink(cui, entityName, {
      normalization: normalized.normalization,
      currency: normalized.currency,
      inflation_adjusted: normalized.inflation_adjusted,
      show_period_growth: normalized.show_period_growth,
    }, {
      reportType: effectiveReportType,
    })
  }, [
    entityName,
    cui,
    effectiveReportType,
    normalized.normalization,
    normalized.currency,
    normalized.inflation_adjusted,
    normalized.show_period_growth,
  ])

  if (!entity) {
    return null
  }

  // Rates (keep denominators consistent with each concept):
  // - payments vs annual budget credits (annual execution)
  // - commitments vs commitment authority (multiannual contracting)
  const commitmentUtilizationPercent =
    commitmentAuthority > 0 ? ((committed / commitmentAuthority) * 100).toFixed(1) : '0'
  const budgetExecutionPercent =
    totalBudget > 0 ? ((paid / totalBudget) * 100).toFixed(1) : '0'
  const commitmentsSubtitle =
    commitmentAuthority > 0
      ? `${commitmentUtilizationPercent}% ${t`of commitment authority`}`
      : t`Commitment authority unavailable`
  const paymentsSubtitle =
    totalBudget > 0
      ? `${budgetExecutionPercent}% ${t`of annual budget paid`}`
      : t`Annual budget unavailable`

  return (
    <div className="space-y-6">
      {headerSlot}

      {/* Level 1: KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title={t`Total Allocated Budget`}
          value={totalBudget}
          subtitle={t`Final Budget Credits`}
          variant="budget"
          currency={normalized.currency}
          isLoading={isSummaryLoading}
        />
        <StatCard
          title={t`Legal Commitments`}
          value={committed}
          subtitle={commitmentsSubtitle}
          variant="committed"
          currency={normalized.currency}
          isLoading={isSummaryLoading}
        />
        <StatCard
          title={t`Payments Made`}
          value={paid}
          subtitle={paymentsSubtitle}
          variant="paid"
          currency={normalized.currency}
          isLoading={isSummaryLoading}
        />
      </div>

      {/* Level 2: Trends Chart */}
      <section>
        <CommitmentsTrends
          budgetTrend={budgetTrend}
          commitmentsTrend={commitmentsTrend}
          treasuryPaymentsTrend={paymentsTrezorTrend}
          nonTreasuryPaymentsTrend={paymentsNonTrezorTrend}
          currentYear={currentYear}
          normalizationOptions={normalizationOptions}
          onNormalizationChange={onNormalizationChange}
          allowPerCapita={Boolean(entity?.is_uat || entity?.entity_type === 'admin_county_council')}
          periodType={commitmentsTrendPeriod.type}
          onYearChange={onYearChange}
          onSelectPeriod={onSelectPeriod}
          selectedQuarter={derivedSelectedQuarter}
          selectedMonth={selectedMonth}
          isLoading={isAnalyticsLoading}
          chartShortcutLink={commitmentsChartLink}
        />
      </section>

      {/* Level 3: Financial Flow Visualization is temporarily hidden. */}

      {/* Level 4: Category Breakdown */}
      <CategoryChart
        data={categoryChartData}
        currency={normalized.currency}
        isLoading={isCategoryLoading}
      />

      {/* Report type & normalization toggle buttons (opt-in) */}
      {(onReportTypeToggle || onNormalizationToggle) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {onReportTypeToggle && reportTypeLabel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
              onClick={onReportTypeToggle}
            >
              {reportTypeLabel}
            </Button>
          )}
          {onNormalizationToggle && normalizationLabel && allowPerCapita && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-auto rounded-full px-4 py-2 text-sm font-semibold"
              onClick={onNormalizationToggle}
            >
              <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {normalizationLabel}
            </Button>
          )}
        </div>
      )}

      {/* Level 5: Detailed Table */}
      <DetailTable
        data={categoryData}
        currency={normalized.currency}
        isLoading={isCategoryLoading}
        filter={filter}
        grouping={grouping}
        detailLevel={detailLevel}
        onGroupingChange={onCommitmentsGroupingChange}
      />

      {reportsSlot ?? (
        <div className="mt-6">
          <EntityReportsSummary
            cui={cui}
            reportPeriod={reportPeriod}
            reportType={commitmentReportType ?? effectiveReportType}
            mainCreditorCui={mainCreditorCui}
            limit={12}
          />
        </div>
      )}
    </div>
  )
}
