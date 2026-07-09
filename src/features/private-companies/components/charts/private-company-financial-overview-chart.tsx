import { useMemo, useId } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  formatEmployeesDisplay,
  formatInteger,
  formatRonAmount,
  formatRonAmountCompact,
  formatRonNetResultCompact,
  getLatestFinancialYear,
} from '../../lib/formatting'
import {
  buildFinancialChartPoints,
  getNetResultValue,
  type CompanyFinancialChartPoint,
} from '../../lib/financial-chart-data'
import { PrivateCompanyTabEmpty } from '../private-company-tab-empty'
import { FinancialChartLegend } from './financial-chart-legend'
import { FinancialChartTooltip } from './financial-chart-tooltip'
import { FinancialLatestMetric } from './financial-latest-metric'
import {
  BAR_RADIUS,
  SERIES_COLORS,
  SERIES_STROKES,
  formatEmployeesAxis,
  formatRonAxis,
  getNetResultBarStyle,
} from './financial-chart-theme'

type Props = {
  readonly profile: PrivateCompanyProfile
  /** Hide latest-year KPI strip when a full table is shown above (e.g. Financials tab). */
  readonly showSummaryMetrics?: boolean
}

export function PrivateCompanyFinancialOverviewChart({
  profile,
  showSummaryMetrics = true,
}: Props) {
  const gradientId = useId().replace(/:/g, '')
  const chartPoints = useMemo(
    () => buildFinancialChartPoints(profile.financials),
    [profile.financials],
  )
  const latestYear = getLatestFinancialYear(profile.financials)
  const highlightYear = latestYear?.fiscalYear ?? null

  const latestNetTone =
    latestYear && getNetResultValue(latestYear) !== null
      ? (getNetResultValue(latestYear)! >= 0 ? 'positive' : 'negative')
      : 'default'

  if (!profile.fiscal.anafFound) {
    return (
      <PrivateCompanyTabEmpty
        title={t`No ANAF fiscal record`}
        description={t`This CUI is not in the ANAF public registry. Turnover, employees, and bilant history are not available.`}
      />
    )
  }

  if (chartPoints.length === 0) {
    return (
      <PrivateCompanyTabEmpty
        title={t`No bilant data`}
        description={t`ANAF does not return financial statements for this company in the loaded snapshot.`}
      />
    )
  }

  return (
    <div className="overflow-hidden border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
      {showSummaryMetrics && latestYear ? (
        <div className="grid grid-cols-2 gap-4 border-b-2 border-[var(--pnrr-border)] px-4 py-4 sm:grid-cols-3 sm:px-5">
          <FinancialLatestMetric
            label={<Trans>Turnover (I14) · {latestYear.fiscalYear}</Trans>}
            value={formatRonAmountCompact(latestYear.turnover)}
            title={
              latestYear.turnover !== null
                ? formatRonAmount(latestYear.turnover)
                : undefined
            }
          />
          <FinancialLatestMetric
            label={<Trans>Net result · {latestYear.fiscalYear}</Trans>}
            value={formatRonNetResultCompact(latestYear.netProfit, latestYear.netLoss)}
            title={
              latestYear.netProfit !== null
                ? formatRonAmount(latestYear.netProfit)
                : latestYear.netLoss !== null
                  ? `−${formatRonAmount(latestYear.netLoss)}`
                  : undefined
            }
            tone={latestNetTone}
          />
          <FinancialLatestMetric
            label={<Trans>Employees (I21) · {latestYear.fiscalYear}</Trans>}
            value={formatEmployeesDisplay(latestYear.employees)}
            title={
              latestYear.employees !== null
                ? formatInteger(latestYear.employees)
                : undefined
            }
          />
        </div>
      ) : null}

      <div className="px-2 pb-4 pt-2 sm:px-3">
        <SafeResponsiveContainer width="100%" height={300} minHeight={260}>
          <ComposedChart
            data={chartPoints as CompanyFinancialChartPoint[]}
            margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id={`turnover-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--pnrr-blue)" stopOpacity={0.88} />
                <stop offset="68%" stopColor="var(--pnrr-blue)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--pnrr-blue)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--pnrr-border)"
              strokeOpacity={0.35}
              strokeDasharray="4 6"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: 'var(--pnrr-muted)', fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--pnrr-border)', strokeWidth: 2 }}
            />
            <YAxis
              yAxisId="money"
              tickFormatter={formatRonAxis}
              tick={{ fill: 'var(--pnrr-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <YAxis
              yAxisId="people"
              orientation="right"
              tickFormatter={formatEmployeesAxis}
              tick={{ fill: 'var(--pnrr-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              content={<FinancialChartTooltip />}
              cursor={{ fill: 'var(--pnrr-hover)', opacity: 0.45 }}
            />
            <ReferenceLine
              yAxisId="money"
              y={0}
              stroke="var(--pnrr-muted)"
              strokeDasharray="3 4"
              strokeOpacity={0.6}
            />
            {highlightYear ? (
              <ReferenceLine
                x={String(highlightYear)}
                yAxisId="money"
                stroke="var(--pnrr-green)"
                strokeWidth={2}
                strokeOpacity={0.85}
              />
            ) : null}
            <Bar
              yAxisId="money"
              dataKey="turnover"
              name={t`Turnover`}
              fill={`url(#turnover-${gradientId})`}
              stroke={SERIES_STROKES.turnover}
              strokeWidth={2}
              radius={BAR_RADIUS}
              maxBarSize={48}
            />
            <Bar
              yAxisId="money"
              dataKey="netResult"
              name={t`Net result`}
              radius={BAR_RADIUS}
              maxBarSize={36}
              strokeWidth={1.5}
            >
              {chartPoints.map((point) => {
                const style = getNetResultBarStyle(point.netResult)
                return (
                  <Cell
                    key={point.year}
                    fill={style.fill}
                    fillOpacity={style.fillOpacity}
                    stroke={style.stroke}
                    strokeWidth={1.5}
                  />
                )
              })}
            </Bar>
            <Line
              yAxisId="people"
              type="monotone"
              dataKey="employees"
              name={t`Employees`}
              stroke={SERIES_COLORS.employees}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{
                r: 4,
                fill: 'var(--pnrr-card)',
                stroke: SERIES_STROKES.employees,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                strokeWidth: 2,
                stroke: SERIES_STROKES.employees,
                fill: SERIES_COLORS.employees,
              }}
            />
          </ComposedChart>
        </SafeResponsiveContainer>
        <FinancialChartLegend />
      </div>
    </div>
  )
}
