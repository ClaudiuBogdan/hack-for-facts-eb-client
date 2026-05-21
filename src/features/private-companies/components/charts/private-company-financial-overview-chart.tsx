import { useMemo, useId, type ReactNode } from 'react'
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
import { formatNumber } from '@/lib/utils'
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

type Props = {
  readonly profile: PrivateCompanyProfile
  /** Hide latest-year KPI strip when a full table is shown above (e.g. Financials tab). */
  readonly showSummaryMetrics?: boolean
}

type TooltipPayloadItem = {
  readonly name: string
  readonly value: number
  readonly color: string
  readonly dataKey: string
}

const SERIES_COLORS = {
  turnover: 'var(--pnrr-blue)',
  netResultPositive: '#16a34a',
  netResultNegative: '#ef4444',
  employees: '#f59e0b',
} as const

const SERIES_STROKES = {
  turnover: '#1d4ed8',
  netResultPositive: '#15803d',
  netResultNegative: '#dc2626',
  netResultMuted: '#737373',
  employees: '#d97706',
} as const

const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0]

function getNetResultBarStyle(netResult: number | null): {
  fill: string
  fillOpacity: number
  stroke: string
} {
  if (netResult === null || !Number.isFinite(netResult)) {
    return {
      fill: 'var(--pnrr-muted)',
      fillOpacity: 0.2,
      stroke: SERIES_STROKES.netResultMuted,
    }
  }
  if (netResult >= 0) {
    return {
      fill: SERIES_COLORS.netResultPositive,
      fillOpacity: 0.72,
      stroke: SERIES_STROKES.netResultPositive,
    }
  }
  return {
    fill: SERIES_COLORS.netResultNegative,
    fillOpacity: 0.72,
    stroke: SERIES_STROKES.netResultNegative,
  }
}

const TOOLTIP_SERIES_ORDER = ['turnover', 'netResult', 'employees'] as const

type SeriesKey = (typeof TOOLTIP_SERIES_ORDER)[number]

function ChartSeriesSwatch({
  color,
  secondaryColor,
}: {
  readonly color: string
  readonly secondaryColor?: string
}) {
  if (secondaryColor) {
    return (
      <span
        className="flex h-3 w-3 shrink-0 overflow-hidden border border-[var(--pnrr-border)]"
        aria-hidden
      >
        <span className="h-full w-1/2" style={{ backgroundColor: color }} />
        <span
          className="h-full w-1/2"
          style={{ backgroundColor: secondaryColor }}
        />
      </span>
    )
  }

  return (
    <span
      className="h-3 w-3 shrink-0 border border-[var(--pnrr-border)]"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

function getNetResultSwatchColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'var(--pnrr-muted)'
  }
  return value >= 0
    ? SERIES_COLORS.netResultPositive
    : SERIES_COLORS.netResultNegative
}

function formatTooltipValue(dataKey: SeriesKey, value: number): string {
  if (dataKey === 'employees') {
    return formatEmployeesDisplay(value)
  }
  if (dataKey === 'netResult' && value < 0) {
    return `−${formatRonAmount(-value)}`
  }
  return formatRonAmount(value)
}

function ChartLegend() {
  const items: {
    key: SeriesKey
    label: string
    color: string
    secondaryColor?: string
  }[] = [
    { key: 'turnover', label: t`Turnover`, color: SERIES_COLORS.turnover },
    {
      key: 'netResult',
      label: t`Net result`,
      color: SERIES_COLORS.netResultPositive,
      secondaryColor: SERIES_COLORS.netResultNegative,
    },
    { key: 'employees', label: t`Employees`, color: SERIES_COLORS.employees },
  ]

  return (
    <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 pb-3 pt-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <ChartSeriesSwatch
            color={item.color}
            secondaryColor={item.secondaryColor}
          />
          <span className="text-xs font-bold text-[var(--pnrr-fg)]">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

function formatRonAxis(value: number): string {
  return `${formatNumber(value, 'compact')} lei`
}

function formatEmployeesAxis(value: number): string {
  return formatNumber(value, 'compact')
}

function getSeriesLabel(dataKey: SeriesKey): string {
  switch (dataKey) {
    case 'turnover':
      return t`Turnover`
    case 'netResult':
      return t`Net result`
    case 'employees':
      return t`Employees`
    default: {
      const exhaustive: never = dataKey
      return exhaustive
    }
  }
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  readonly active?: boolean
  readonly payload?: TooltipPayloadItem[]
  readonly label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  const payloadByKey = new Map(
    payload.map((item) => [item.dataKey, item] as const),
  )

  const rows = TOOLTIP_SERIES_ORDER.flatMap((dataKey) => {
    const item = payloadByKey.get(dataKey)
    if (!item || item.value === null || !Number.isFinite(item.value)) {
      return []
    }

    const swatchColor =
      dataKey === 'netResult'
        ? getNetResultSwatchColor(item.value)
        : dataKey === 'turnover'
          ? SERIES_COLORS.turnover
          : SERIES_COLORS.employees

    return [
      {
        dataKey,
        label: getSeriesLabel(dataKey),
        value: item.value,
        swatchColor,
      },
    ]
  })

  if (rows.length === 0) {
    return null
  }

  return (
    <div
      className="min-w-[14rem] border-2 border-[var(--pnrr-border)] p-3 shadow-lg backdrop-blur-sm"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        <Trans>Year {label}</Trans>
      </p>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li
            key={row.dataKey}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 font-semibold text-[var(--pnrr-fg)]">
              <ChartSeriesSwatch color={row.swatchColor} />
              {row.label}
            </span>
            <span className="shrink-0 font-black tabular-nums text-[var(--pnrr-fg)]">
              {formatTooltipValue(row.dataKey, row.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LatestMetric({
  label,
  value,
  title,
  tone = 'default',
}: {
  readonly label: ReactNode
  readonly value: ReactNode
  readonly title?: string
  readonly tone?: 'default' | 'positive' | 'negative'
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'negative'
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-[var(--pnrr-fg)]'

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums leading-none sm:text-xl ${valueClass}`}
        title={title}
      >
        {value}
      </p>
    </div>
  )
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
    <div
      className="overflow-hidden border-2 border-[var(--pnrr-border)]"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      {showSummaryMetrics && latestYear ? (
        <div className="grid grid-cols-2 gap-4 border-b-2 border-[var(--pnrr-border)] px-4 py-4 sm:grid-cols-3 sm:px-5">
          <LatestMetric
            label={
              <Trans>
                Turnover (I14) · {latestYear.fiscalYear}
              </Trans>
            }
            value={formatRonAmountCompact(latestYear.turnover)}
            title={
              latestYear.turnover !== null
                ? formatRonAmount(latestYear.turnover)
                : undefined
            }
          />
          <LatestMetric
            label={
              <Trans>
                Net result · {latestYear.fiscalYear}
              </Trans>
            }
            value={formatRonNetResultCompact(
              latestYear.netProfit,
              latestYear.netLoss,
            )}
            title={
              latestYear.netProfit !== null
                ? formatRonAmount(latestYear.netProfit)
                : latestYear.netLoss !== null
                  ? `−${formatRonAmount(latestYear.netLoss)}`
                  : undefined
            }
            tone={latestNetTone}
          />
          <LatestMetric
            label={
              <Trans>
                Employees (I21) · {latestYear.fiscalYear}
              </Trans>
            }
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
              <linearGradient
                id={`turnover-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--pnrr-blue)"
                  stopOpacity={0.88}
                />
                <stop
                  offset="68%"
                  stopColor="var(--pnrr-blue)"
                  stopOpacity={0.45}
                />
                <stop
                  offset="100%"
                  stopColor="var(--pnrr-blue)"
                  stopOpacity={0.1}
                />
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
              content={<ChartTooltip />}
              cursor={{
                fill: 'var(--pnrr-hover)',
                opacity: 0.45,
              }}
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
        <ChartLegend />
      </div>
    </div>
  )
}
