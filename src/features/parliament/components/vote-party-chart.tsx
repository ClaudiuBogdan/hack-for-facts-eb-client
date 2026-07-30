import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import type { ParliamentGroupVoteBreakdown } from '@/schemas/parliament'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { PARLIAMENT_ACTION_BLUE } from '../lib/hub-theme'
import {
  VOTE_DETAIL_CHART_PLOT_BG,
  voteDetailCardClassName,
  voteDetailSectionTitleClassName,
} from '../lib/vote-detail-theme'

type Props = {
  readonly groups: ReadonlyArray<ParliamentGroupVoteBreakdown>
  readonly groupColors: Readonly<Record<string, string>>
  readonly pentruTotal: number
  readonly impotrivaTotal: number
  readonly onDownloadResults?: () => void
  readonly embedded?: boolean
  readonly className?: string
}

type ChartSeries = {
  readonly id: string
  readonly name: string
  readonly color: string
}

type VotePartyTooltipEntry = {
  readonly name?: string | number
  readonly value?: string | number
  readonly color?: string
}

type VotePartyTooltipProps = {
  readonly active?: boolean
  readonly label?: string
  readonly payload?: ReadonlyArray<VotePartyTooltipEntry>
}

const CHART_AXIS_COLOR = '#505a5f'
const CHART_GRID_COLOR = '#dee0e2'
const CHART_AXIS_LINE = '#b1b4b6'

function buildYAxisTicks(maxValue: number): number[] {
  const step = 50
  const ceiling = Math.max(step, Math.ceil(maxValue / step) * step)
  const ticks: number[] = []
  for (let value = 0; value <= ceiling; value += step) {
    ticks.push(value)
  }
  return ticks
}

const PNRR_TOOLTIP_STYLE = {
  borderRadius: 0,
  border: '2px solid var(--pnrr-border)',
  boxShadow: 'none',
  background: 'var(--pnrr-card)',
  color: 'var(--pnrr-fg)',
  padding: '10px 14px',
} as const

function VotePartyChartTooltip({
  active,
  label,
  payload,
}: VotePartyTooltipProps) {
  if (!active || !payload?.length) return null

  const items = payload
    .filter((entry) => Number(entry.value ?? 0) > 0)
    .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))

  return (
    <div className="min-w-[10.5rem]" style={PNRR_TOOLTIP_STYLE}>
      <p className="mb-2.5 border-b border-[var(--pnrr-border)] pb-2 text-sm font-bold leading-tight">
        {label}
      </p>
      <ul className="space-y-2">
        {items.map((entry) => (
          <li
            key={String(entry.name ?? entry.value)}
            className="grid grid-cols-[0.625rem_1fr_auto] items-center gap-x-2.5"
          >
            <span
              className="h-2.5 w-2.5 shrink-0"
              style={{ backgroundColor: entry.color ?? '#505a5f' }}
              aria-hidden
            />
            <span className="text-sm font-bold leading-none">
              {String(entry.name ?? '')}
            </span>
            <span className="text-sm font-bold tabular-nums leading-none">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type VotePartyLegendEntry = {
  readonly value?: string
  readonly color?: string
}

function VotePartyChartLegend({
  payload,
}: {
  readonly payload?: ReadonlyArray<VotePartyLegendEntry>
}) {
  if (!payload?.length) return null

  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-5">
      {payload.map((entry) => (
        <li
          key={entry.value}
          className="flex items-center gap-2 text-sm leading-none text-[#505a5f] dark:text-[var(--pnrr-muted)]"
        >
          <span
            className="h-3 w-3 shrink-0"
            style={{ backgroundColor: entry.color ?? '#505a5f' }}
            aria-hidden
          />
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

function buildChartModel(
  groups: ReadonlyArray<ParliamentGroupVoteBreakdown>,
  groupColors: Readonly<Record<string, string>>,
  pentruTotal: number,
  impotrivaTotal: number,
): {
  readonly rows: ReadonlyArray<Record<string, string | number>>
  readonly series: ReadonlyArray<ChartSeries>
} {
  const activeGroups = groups.filter(
    (group) => group.pentru > 0 || group.impotriva > 0,
  )
  const series = activeGroups.map((group) => ({
    id: group.groupId,
    name: group.groupName,
    color: groupColors[group.groupId] ?? '#505a5f',
  }))

  const pentruRow: Record<string, string | number> = {
    label: `Pentru (${pentruTotal})`,
  }
  const impotrivaRow: Record<string, string | number> = {
    label: `Împotrivă (${impotrivaTotal})`,
  }

  for (const group of activeGroups) {
    pentruRow[group.groupId] = group.pentru
    impotrivaRow[group.groupId] = group.impotriva
  }

  return {
    rows: [pentruRow, impotrivaRow],
    series,
  }
}

function VotePartyChartShell({
  embedded,
  className,
  children,
}: {
  readonly embedded?: boolean
  readonly className?: string
  readonly children: ReactNode
}) {
  if (embedded) {
    return <div className={className}>{children}</div>
  }

  return (
    <section className={cn(voteDetailCardClassName, className)}>
      {children}
    </section>
  )
}

/** UK Parliament “Votes by party” stacked bar chart */
export function VotePartyChart({
  groups,
  groupColors,
  pentruTotal,
  impotrivaTotal,
  onDownloadResults,
  embedded = false,
  className,
}: Props) {
  const { rows, series } = buildChartModel(
    groups,
    groupColors,
    pentruTotal,
    impotrivaTotal,
  )
  const conflictingTotal = groups.reduce(
    (sum, group) => sum + group.conflicting,
    0,
  )
  const unknownTotal = groups.reduce((sum, group) => sum + group.unknown, 0)

  const yAxisMax = Math.max(pentruTotal, impotrivaTotal)
  const yTicks = buildYAxisTicks(yAxisMax)

  const sectionClassName = cn('p-5 sm:p-6', className)

  if (series.length === 0) {
    return (
      <VotePartyChartShell embedded={embedded} className={sectionClassName}>
        <h2 className={voteDetailSectionTitleClassName}>
          Voturi pe grupuri parlamentare
        </h2>
        <p className="mt-4 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există date de grup disponibile pentru această divizare.
        </p>
      </VotePartyChartShell>
    )
  }

  return (
    <VotePartyChartShell embedded={embedded} className={sectionClassName}>
      <h2 className={voteDetailSectionTitleClassName}>
        Voturi pe grupuri parlamentare
      </h2>

      {conflictingTotal > 0 || unknownTotal > 0 ? (
        <p className="mt-4 border-l-4 border-[#d4351c] bg-[#f3f2f1] px-4 py-3 text-sm text-[#0b0c0c] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
          <Trans>
            Poziții fără alegere efectivă: {conflictingTotal} cu observații
            contradictorii
            {unknownTotal > 0 ? ` · ${String(unknownTotal)} neclare` : ''}. Sunt
            participări, dar nu intră în barele „Pentru” sau „Împotrivă”.
          </Trans>
        </p>
      ) : null}

      <div
        className="mt-5 p-4 sm:p-5"
        style={{ backgroundColor: VOTE_DETAIL_CHART_PLOT_BG }}
      >
        <div className="h-[22rem] w-full min-w-0">
          <SafeResponsiveContainer width="100%" height="100%" minHeight={320}>
            <BarChart
              data={[...rows]}
              margin={{ top: 8, right: 24, left: 4, bottom: 4 }}
              barCategoryGap="10%"
              barGap={0}
            >
              <CartesianGrid
                stroke={CHART_GRID_COLOR}
                vertical={false}
                strokeWidth={1}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 14, fontWeight: 400 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 14, fontWeight: 400 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                allowDecimals={false}
                ticks={yTicks}
                domain={[0, yTicks[yTicks.length - 1] ?? yAxisMax]}
                width={36}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                wrapperStyle={{ zIndex: 20, outline: 'none' }}
                contentStyle={{
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  background: 'transparent',
                  boxShadow: 'none',
                }}
                content={(props) => (
                  <VotePartyChartTooltip
                    active={props.active}
                    label={
                      typeof props.label === 'string' ? props.label : undefined
                    }
                    payload={
                      props.payload as
                        | ReadonlyArray<VotePartyTooltipEntry>
                        | undefined
                    }
                  />
                )}
              />
              <Legend
                content={(props) => (
                  <VotePartyChartLegend
                    payload={
                      props.payload as
                        | ReadonlyArray<VotePartyLegendEntry>
                        | undefined
                    }
                  />
                )}
              />
              {series.map((item) => (
                <Bar
                  key={item.id}
                  dataKey={item.id}
                  name={item.name}
                  stackId="stack"
                  fill={item.color}
                  maxBarSize={360}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      </div>

      {onDownloadResults ? (
        <div className="mt-4 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="h-10 rounded-none border-0 px-4 text-sm font-normal text-white hover:opacity-90"
                style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
              >
                Descarcă rezultatele
                <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none">
              <DropdownMenuItem onClick={onDownloadResults}>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </VotePartyChartShell>
  )
}
