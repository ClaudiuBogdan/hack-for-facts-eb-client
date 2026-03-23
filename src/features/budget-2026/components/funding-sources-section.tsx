import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  type PieLabelRenderProps,
} from 'recharts'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import type { Currency } from '@/schemas/charts'
import { formatBudget2026Currency } from '../formatting'
import { SectionWrapper } from './section-wrapper'
import type { FundingSourceItem } from '../types'

type FundingSourcesSectionProps = {
  readonly data: readonly FundingSourceItem[]
  readonly currency: Currency
}

type PieDataItem = {
  readonly name: string
  readonly value: number
  readonly percentage: number
  readonly fill: string
}

const COLORS: Record<string, string> = {
  'Buget de stat': '#3b82f6',
  'Venituri proprii': '#f59e0b',
  'Credite externe': '#8b5cf6',
  'Fonduri externe nerambursabile (UE)': '#10b981',
  'Nespecificat in sursa': '#64748b',
}

const FALLBACK_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#6366f1']

function CustomTooltip({
  active,
  payload,
  currency,
}: {
  readonly active?: boolean
  readonly payload?: ReadonlyArray<{ readonly payload: PieDataItem }>
  readonly currency: Currency
}) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="text-sm font-semibold text-foreground">{item.name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatBudget2026Currency(item.value, currency, 'compact')}
      </p>
      <p className="text-sm text-muted-foreground">
        {item.percentage.toFixed(1)}%
      </p>
    </div>
  )
}

function CustomLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx)
  const cy = Number(props.cy)
  const midAngle = Number(props.midAngle)
  const innerRadius = Number(props.innerRadius)
  const outerRadius = Number(props.outerRadius)
  const percent = Number(props.percent)

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  const pctDisplay = percent * 100
  if (pctDisplay < 3) return null

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-white text-[11px] font-semibold"
    >
      {pctDisplay.toFixed(1)}%
    </text>
  )
}

function CustomLegendContent({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2">
      {payload.map((entry) => (
        <span key={entry.value} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  )
}

export function FundingSourcesSection({ data, currency }: FundingSourcesSectionProps) {
  const pieData = useMemo<readonly PieDataItem[]>(() => {
    const total = data.reduce((sum, item) => sum + item.propuneri_2026, 0)
    return data.map((item, index) => ({
      name: item.label,
      value: item.propuneri_2026,
      percentage: total > 0 ? (item.propuneri_2026 / total) * 100 : 0,
      fill: COLORS[item.source] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }))
  }, [data])

  return (
    <SectionWrapper id="funding-sources">
      <div className="rounded-[28px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.03] shadow-xl shadow-primary/5">
        <div className="p-6 pb-2 sm:p-8 sm:pb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {'Surse de finantare'}
          </p>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {'Surse de finantare'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {'Ponderea surselor de finantare explicite din Anexa 3 pentru creditele bugetare din 2026.'}
          </p>
        </div>
        <div className="p-4 sm:p-8">
          <div style={{ width: '100%', height: 400 }}>
            <SafeResponsiveContainer width="100%" height="100%" minHeight={350}>
              <PieChart>
                <Pie
                  data={pieData as PieDataItem[]}
                  cx="50%"
                  cy="45%"
                  innerRadius="45%"
                  outerRadius="78%"
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={CustomLabel}
                  labelLine={false}
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.fill}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Legend
                  content={<CustomLegendContent />}
                  verticalAlign="bottom"
                />
              </PieChart>
            </SafeResponsiveContainer>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
