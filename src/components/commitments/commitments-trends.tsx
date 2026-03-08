import React, { useEffect, useMemo, useRef } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { ExternalLink, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { NormalizationModeSelect } from '@/components/normalization/normalization-mode-select'
import { useMediaQuery } from '@/hooks/use-media-query'
import { normalizeNormalizationOptions } from '@/lib/normalization'
import type { NormalizationOptions } from '@/lib/normalization'
import { getNormalizationUnit } from '@/lib/utils'
import { yValueFormatter } from '@/components/charts/components/chart-renderer/utils'
import type { CommitmentsAnalyticsSeries } from '@/schemas/commitments'
import type { ReportPeriodType } from '@/schemas/reporting'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { CommitmentsTrendsSkeleton } from './commitments-trends-skeleton'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

type ChartShortcutLink = {
  to: '/charts/$chartId'
  params: { chartId: string }
  search: unknown
}

interface CommitmentsTrendsProps {
  budgetTrend?: CommitmentsAnalyticsSeries | null
  commitmentsTrend?: CommitmentsAnalyticsSeries | null
  treasuryPaymentsTrend?: CommitmentsAnalyticsSeries | null
  nonTreasuryPaymentsTrend?: CommitmentsAnalyticsSeries | null
  currentYear: number
  normalizationOptions: NormalizationOptions
  onNormalizationChange: (next: NormalizationOptions) => void
  allowPerCapita?: boolean
  onYearChange?: (year: number) => void
  isLoading?: boolean
  periodType?: ReportPeriodType
  onSelectPeriod?: (label: string) => void
  selectedQuarter?: string
  selectedMonth?: string
  onPrefetchPeriod?: (label: string) => void
  chartShortcutLink?: ChartShortcutLink | null
}

type AnalyticsPoint = CommitmentsAnalyticsSeries['data'][number]

type TooltipPayload = {
  name: string
  value: number
  color: string
  stroke?: string
  dataKey: string
}[]

const PAYMENT_TOTAL_SERIES = 'payments_total'

function toPointMap(series?: CommitmentsAnalyticsSeries | null): Map<string, AnalyticsPoint> | null {
  if (!series?.data?.length) return null
  return new Map(series.data.map((point) => [String(point.x), point]))
}

function safeNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0
}

function computeGrowthPercent(current: number, previous: number | null): number {
  if (previous === null || previous === 0) return 0
  return ((current - previous) / previous) * 100
}

const CommitmentsTrendsComponent: React.FC<CommitmentsTrendsProps> = ({
  budgetTrend,
  commitmentsTrend,
  treasuryPaymentsTrend,
  nonTreasuryPaymentsTrend,
  currentYear,
  normalizationOptions,
  onNormalizationChange,
  allowPerCapita = false,
  onYearChange,
  isLoading,
  periodType = 'YEAR',
  onSelectPeriod,
  selectedQuarter,
  selectedMonth,
  onPrefetchPeriod,
  chartShortcutLink,
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const normalized = normalizeNormalizationOptions(normalizationOptions)
  const unit = getNormalizationUnit({
    normalization: normalized.normalization,
    currency: normalized.currency,
    show_period_growth: normalized.show_period_growth,
  })
  const showPeriodGrowth = normalized.show_period_growth

  const trendsAvailable =
    (budgetTrend?.data.length ?? 0) ||
    (commitmentsTrend?.data.length ?? 0) ||
    (treasuryPaymentsTrend?.data.length ?? 0) ||
    (nonTreasuryPaymentsTrend?.data.length ?? 0)

  const mergedData = useMemo(() => {
    const baseSeries =
      (budgetTrend?.data?.length ? budgetTrend : null) ??
      (commitmentsTrend?.data?.length ? commitmentsTrend : null) ??
      (treasuryPaymentsTrend?.data?.length ? treasuryPaymentsTrend : null) ??
      (nonTreasuryPaymentsTrend?.data?.length ? nonTreasuryPaymentsTrend : null)

    const labels = baseSeries?.data.map((point) => String(point.x)) ?? []
    const budgetMap = toPointMap(budgetTrend)
    const commitmentsMap = toPointMap(commitmentsTrend)
    const treasuryPaymentsMap = toPointMap(treasuryPaymentsTrend)
    const nonTreasuryPaymentsMap = toPointMap(nonTreasuryPaymentsTrend)

    let prevBudget: number | null = null
    let prevCommitments: number | null = null
    let prevPayments: number | null = null

    return labels.map((label) => {
      const budgetPoint = budgetMap?.get(label)
      const commitmentsPoint = commitmentsMap?.get(label)
      const treasuryPaymentsPoint = treasuryPaymentsMap?.get(label)
      const nonTreasuryPaymentsPoint = nonTreasuryPaymentsMap?.get(label)

      const budgetLevel = safeNumber(budgetPoint?.y)
      const commitmentsLevel = safeNumber(commitmentsPoint?.y)
      const paymentsLevel =
        safeNumber(treasuryPaymentsPoint?.y) + safeNumber(nonTreasuryPaymentsPoint?.y)

      const budgetGrowth = budgetPoint?.growth_percent
      const commitmentsGrowth = commitmentsPoint?.growth_percent
      const paymentsGrowth = computeGrowthPercent(paymentsLevel, prevPayments)

      const budgetValue = showPeriodGrowth
        ? safeNumber(budgetGrowth ?? computeGrowthPercent(budgetLevel, prevBudget))
        : budgetLevel
      const commitmentsValue = showPeriodGrowth
        ? safeNumber(commitmentsGrowth ?? computeGrowthPercent(commitmentsLevel, prevCommitments))
        : commitmentsLevel
      const paymentsValue = showPeriodGrowth ? paymentsGrowth : paymentsLevel

      prevBudget = budgetLevel
      prevCommitments = commitmentsLevel
      prevPayments = paymentsLevel

      return {
        label,
        budget: budgetValue,
        commitments: commitmentsValue,
        [PAYMENT_TOTAL_SERIES]: paymentsValue,
      }
    })
  }, [
    budgetTrend,
    commitmentsTrend,
    treasuryPaymentsTrend,
    nonTreasuryPaymentsTrend,
    showPeriodGrowth,
  ])

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: TooltipPayload
    label?: string
  }) => {
    if (active && payload?.length) {
      const monthNames: Record<string, string> = {
        '01': t`January`,
        '02': t`February`,
        '03': t`March`,
        '04': t`April`,
        '05': t`May`,
        '06': t`June`,
        '07': t`July`,
        '08': t`August`,
        '09': t`September`,
        '10': t`October`,
        '11': t`November`,
        '12': t`December`,
      }
      const heading =
        periodType === 'YEAR' ? t`Year` : periodType === 'QUARTER' ? t`Quarter` : t`Month`
      const prettyLabel =
        periodType === 'MONTH' ? monthNames[label ?? ''] ?? String(label) : String(label)
      return (
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
          <p className="label font-bold mb-2">
            {heading}: {prettyLabel}
          </p>
          <div className="flex flex-col gap-2">
            {payload.map((pld) => (
              <div
                key={pld.dataKey}
                style={{ color: pld.stroke || pld.color }}
                className="flex flex-row gap-4 justify-between items-center text-sm"
              >
                <p>{pld.name}</p>
                <p className="font-mono text-md font-bold text-slate-800 dark:text-slate-400">
                  {yValueFormatter(pld.value, unit)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const handleChartClick = (e: any) => {
    if (!e || !e.activeLabel) return
    const raw = String(e.activeLabel)
    if (periodType === 'YEAR') {
      const match = raw.match(/^(\d{4})/)
      const year = match ? Number(match[1]) : Number(raw)
      if (onYearChange && Number.isFinite(year)) onYearChange(year)
      return
    }
    if (periodType === 'MONTH') {
      const m = raw.match(/^\d{4}-(0[1-9]|1[0-2])$/) || raw.match(/^(0[1-9]|1[0-2])$/)
      if (m) onSelectPeriod?.(m[1])
      return
    }
    if (periodType === 'QUARTER') {
      const m = raw.match(/^\d{4}-(Q[1-4])$/) || raw.match(/^(Q[1-4])$/)
      if (m) onSelectPeriod?.(m[1])
    }
  }

  const lastPrefetchLabelRef = useRef<string | null>(null)
  const lastPrefetchTsRef = useRef<number>(0)
  const handleChartHover = (e: any) => {
    if (!onPrefetchPeriod) return
    if (!e || !e.activeLabel) return
    const raw = String(e.activeLabel)
    let label = raw
    if (periodType === 'MONTH') {
      const m = raw.match(/^\d{4}-(0[1-9]|1[0-2])$/) || raw.match(/^(0[1-9]|1[0-2])$/)
      if (m) label = m[1]
    } else if (periodType === 'QUARTER') {
      const m = raw.match(/^\d{4}-(Q[1-4])$/) || raw.match(/^(Q[1-4])$/)
      if (m) label = m[1]
    } else if (periodType === 'YEAR') {
      const match = raw.match(/^(\d{4})/)
      if (match) label = match[1]
    }
    const now = Date.now()
    if (label === lastPrefetchLabelRef.current && now - lastPrefetchTsRef.current < 400)
      return
    lastPrefetchLabelRef.current = label
    lastPrefetchTsRef.current = now
    onPrefetchPeriod(label)
  }

  const dataSignature = useMemo(() => {
    const parts = (mergedData || []).map(
      (d) => `${d.label}|${d.budget}|${d.commitments}|${d[PAYMENT_TOTAL_SERIES]}`
    )
    return parts.join(';')
  }, [mergedData])

  const prevSignatureRef = useRef<string | null>(null)
  const shouldAnimate = prevSignatureRef.current !== dataSignature
  useEffect(() => {
    prevSignatureRef.current = dataSignature
  }, [dataSignature])

  if (isLoading) {
    return <CommitmentsTrendsSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            <span>
              <Trans>Commitment Trends</Trans>
            </span>
            {chartShortcutLink && (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7 ml-1" aria-label={t`Open in chart editor`}>
                <Link
                  to={chartShortcutLink.to}
                  params={chartShortcutLink.params}
                  search={chartShortcutLink.search as any}
                  preload="intent"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Checkbox
              id="commitments-growth-toggle"
              checked={showPeriodGrowth}
              onCheckedChange={(checked) => {
                onNormalizationChange({
                  ...normalizationOptions,
                  show_period_growth: Boolean(checked),
                })
              }}
            />
            <Label
              htmlFor="commitments-growth-toggle"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              <Trans>Show growth (%)</Trans>
            </Label>
            <NormalizationModeSelect
              value={normalized.normalization as any}
              allowPerCapita={allowPerCapita}
              onChange={(nextNormalization) => {
                onNormalizationChange({
                  ...normalizationOptions,
                  normalization: nextNormalization,
                  inflation_adjusted:
                    nextNormalization === 'percent_gdp' ? false : normalizationOptions.inflation_adjusted,
                })
              }}
              triggerClassName="h-8 text-xs"
              className="w-[180px]"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {!trendsAvailable ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">
            <Trans>No data available to display commitment evolution.</Trans>
          </p>
        ) : (
          <SafeResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={mergedData}
              margin={{ top: 30, right: 40, left: Math.min(unit.length * 5 + 20, 60), bottom: 5 }}
              onClick={handleChartClick}
              onMouseMove={handleChartHover}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(val) => yValueFormatter(val, unit)}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '14px' }} />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} strokeDasharray="2 4" />

              {periodType === 'YEAR' && (
                <ReferenceLine x={String(currentYear)} stroke="gray" strokeDasharray="6 3" strokeWidth={1} />
              )}
              {periodType === 'QUARTER' && selectedQuarter && (
                <ReferenceLine
                  x={`${currentYear}-${selectedQuarter}`}
                  stroke="gray"
                  strokeDasharray="6 3"
                  strokeWidth={1}
                />
              )}
              {periodType === 'MONTH' && selectedMonth && (
                <ReferenceLine
                  x={`${currentYear}-${selectedMonth}`}
                  stroke="gray"
                  strokeDasharray="6 3"
                  strokeWidth={1}
                />
              )}

              <Bar
                dataKey="budget"
                name={t`Budget credits`}
                fill="#10b981"
                fillOpacity={0.2}
                stroke="#059669"
                strokeWidth={2}
                radius={[3, 3, 0, 0]}
                isAnimationActive={shouldAnimate}
                animationEasing="ease-in-out"
                animationBegin={shouldAnimate ? 300 : 0}
              >
                {!isMobile && (
                  <LabelList
                    dataKey="budget"
                    position="top"
                    angle={periodType === 'QUARTER' ? 0 : -45}
                    offset={24}
                    fontSize={11}
                    formatter={(v: unknown) => yValueFormatter(Number(v), unit, 'compact')}
                  />
                )}
              </Bar>

              <Bar
                dataKey="commitments"
                name={t`Legal commitments`}
                fill="#3b82f6"
                fillOpacity={0.2}
                stroke="#2563eb"
                strokeWidth={2}
                radius={[3, 3, 0, 0]}
                isAnimationActive={shouldAnimate}
                animationEasing="ease-in-out"
                animationBegin={shouldAnimate ? 300 : 0}
              >
                {!isMobile && (
                  <LabelList
                    dataKey="commitments"
                    position="top"
                    angle={periodType === 'QUARTER' ? 0 : -45}
                    offset={24}
                    fontSize={11}
                    formatter={(v: unknown) => yValueFormatter(Number(v), unit, 'compact')}
                  />
                )}
              </Bar>

              <Line
                type="monotone"
                dataKey={PAYMENT_TOTAL_SERIES}
                name={t`Payments`}
                stroke="#0ea5e9"
                strokeWidth={2.5}
                isAnimationActive={shouldAnimate}
                animationBegin={shouldAnimate ? 900 : 0}
                dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#f8fafc' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </SafeResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function areSeriesEqual(a?: CommitmentsAnalyticsSeries | null, b?: CommitmentsAnalyticsSeries | null): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.seriesId !== b.seriesId || a.metric !== b.metric) return false
  const ad = a.data || []
  const bd = b.data || []
  if (ad.length !== bd.length) return false
  for (let i = 0; i < ad.length; i += 1) {
    const ap = ad[i]
    const bp = bd[i]
    if (String(ap.x) !== String(bp.x)) return false
    if (Number(ap.y) !== Number(bp.y)) return false
    if (Number(ap.growth_percent ?? 0) !== Number(bp.growth_percent ?? 0)) return false
  }
  return true
}

function areChartShortcutLinksEqual(
  left?: ChartShortcutLink | null,
  right?: ChartShortcutLink | null
): boolean {
  if (!left && !right) return true
  if (!left || !right) return false
  return left.to === right.to && left.params.chartId === right.params.chartId
}

function arePropsEqual(prev: CommitmentsTrendsProps, next: CommitmentsTrendsProps): boolean {
  return (
    areSeriesEqual(prev.budgetTrend, next.budgetTrend) &&
    areSeriesEqual(prev.commitmentsTrend, next.commitmentsTrend) &&
    areSeriesEqual(prev.treasuryPaymentsTrend, next.treasuryPaymentsTrend) &&
    areSeriesEqual(prev.nonTreasuryPaymentsTrend, next.nonTreasuryPaymentsTrend) &&
    prev.currentYear === next.currentYear &&
    prev.normalizationOptions.normalization === next.normalizationOptions.normalization &&
    prev.normalizationOptions.currency === next.normalizationOptions.currency &&
    prev.normalizationOptions.inflation_adjusted === next.normalizationOptions.inflation_adjusted &&
    prev.normalizationOptions.show_period_growth === next.normalizationOptions.show_period_growth &&
    (prev.periodType ?? 'YEAR') === (next.periodType ?? 'YEAR') &&
    prev.selectedQuarter === next.selectedQuarter &&
    prev.selectedMonth === next.selectedMonth &&
    areChartShortcutLinksEqual(prev.chartShortcutLink, next.chartShortcutLink) &&
    !!prev.isLoading === !!next.isLoading
  )
}

export const CommitmentsTrends = React.memo(CommitmentsTrendsComponent, arePropsEqual)
