import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import type { Currency } from '@/schemas/charts'
import { formatBudget2026CompactAmount, formatBudget2026Currency } from '../formatting'
import { SectionWrapper } from './section-wrapper'
import type { BudgetTotals } from '../types'

type TrendsSectionProps = {
  readonly totals: BudgetTotals
  readonly currency: Currency
}

type TrendDataPoint = {
  readonly year: string
  readonly value: number
  readonly statusLabel: string
  readonly pointColor: string
  readonly isEstimate: boolean
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<{ readonly payload: TrendDataPoint }>
  readonly label?: string | number
  readonly currency: Currency
}) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatBudget2026Currency(item.value, currency, 'compact')}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground/70">
        {item.statusLabel}
      </p>
    </div>
  )
}

export function TrendsSection({ totals, currency }: TrendsSectionProps) {
  const chartData = useMemo<readonly TrendDataPoint[]>(() => {
    const cb = totals.credite_bugetare
    const entries: TrendDataPoint[] = [
      { year: '2024', value: cb.realizari_2024, statusLabel: 'Realizat 2024', pointColor: '#3b82f6', isEstimate: false },
      { year: '2025', value: cb.executie_preliminata_2025, statusLabel: 'Executie preliminata 2025', pointColor: '#3b82f6', isEstimate: false },
      { year: '2026', value: cb.propuneri_2026, statusLabel: 'Propuneri 2026', pointColor: '#1d4ed8', isEstimate: false },
      { year: '2027', value: cb.estimari_2027, statusLabel: 'Estimare 2027', pointColor: '#93c5fd', isEstimate: true },
      { year: '2028', value: cb.estimari_2028, statusLabel: 'Estimare 2028', pointColor: '#93c5fd', isEstimate: true },
      { year: '2029', value: cb.estimari_2029, statusLabel: 'Estimare 2029', pointColor: '#93c5fd', isEstimate: true },
    ]
    return entries
  }, [totals])

  return (
    <SectionWrapper id="trends">
      <div className="rounded-[28px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.03] shadow-xl shadow-primary/5">
        <div className="p-6 pb-2 sm:p-8 sm:pb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {'Tendinte'}
          </p>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {'Evolutia cheltuielilor 2024-2029'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {`Credite bugetare totale afisate in ${currency}. Dupa 2026, valorile sunt estimari.`}
          </p>
        </div>
        <div className="p-4 sm:p-8">
          <div style={{ width: '100%', height: 380 }}>
            <SafeResponsiveContainer width="100%" height="100%" minHeight={300}>
              <AreaChart
                data={chartData as TrendDataPoint[]}
                margin={{ top: 20, right: 24, bottom: 8, left: 24 }}
              >
                <defs>
                  <linearGradient id="trendGradientSolid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="trendGradientLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 13, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-foreground"
                />
                <YAxis
                  tickFormatter={(val: number) => formatBudget2026CompactAmount(val, currency)}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  className="fill-muted-foreground"
                  label={{
                    value: currency,
                    position: 'top',
                    offset: 8,
                    style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
                  }}
                />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <ReferenceLine
                  x="2026"
                  stroke="hsl(var(--foreground))"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Propus',
                    position: 'top',
                    style: {
                      fontSize: 12,
                      fontWeight: 700,
                      fill: 'hsl(var(--foreground))',
                    },
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#trendGradientSolid)"
                  dot={(props) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: TrendDataPoint }
                    const isProposed = payload.year === '2026'
                    return (
                      <circle
                        key={payload.year}
                        cx={cx}
                        cy={cy}
                        r={isProposed ? 6 : 4}
                        fill={payload.pointColor}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )
                  }}
                />
              </AreaChart>
            </SafeResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
              {'Realizat 2024'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
              {'Preliminat 2025'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-700" />
              {'Propus 2026'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-300" />
              {'Estimari'}
            </span>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
