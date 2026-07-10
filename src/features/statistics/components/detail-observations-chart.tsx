import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TimeSeries, TimeSeriesPoint } from '../lib/time-series'
import { describeValueStatus } from '../lib/value-status'

type Props = {
  readonly series: TimeSeries
  readonly title: string
  readonly unitLabel: string | null
}

const LINE_COLOR = 'hsl(var(--chart-1))'
const FLAG_COLOR = 'hsl(38 92% 45%)'
const SURFACE_COLOR = 'hsl(var(--background))'

const compactNumber = new Intl.NumberFormat('ro-RO', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * A single INS series over time.
 *
 * The one rule that shapes this component: **a gap must look like a gap.**
 * `buildTimeSeries` injects an explicit `null` for every period INS never
 * published, and `connectNulls={false}` makes Recharts break the line there.
 * Interpolating across a missing 2019 would invent a figure the institute never
 * measured — the single most damaging thing this page could do.
 *
 * One series, so no legend: the title names it. Points carrying an INS quality
 * flag get a larger ringed marker in the status color *and* the flag spelled
 * out in the tooltip, so identity never rests on color alone.
 */
export function DetailObservationsChart({ series, title, unitLabel }: Props) {
  return (
    <figure className="space-y-2">
      <figcaption className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {unitLabel ? (
          <p className="text-xs text-muted-foreground">{unitLabel}</p>
        ) : null}
      </figcaption>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series.points as TimeSeriesPoint[]}
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value: number) => compactNumber.format(value)}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              content={<SeriesTooltip />}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
              dot={<SeriesDot />}
              activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE_COLOR }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {series.truncated ? (
        <p className="text-xs text-muted-foreground">
          <Trans>
            Graficul afișează ultimele {series.points.length} perioade. Restrânge
            intervalul pentru a vedea perioade mai vechi.
          </Trans>
        </p>
      ) : null}
    </figure>
  )
}

type DotProps = {
  readonly cx?: number
  readonly cy?: number
  readonly payload?: TimeSeriesPoint
}

/**
 * Plain points stay small and recessive; flagged points grow and gain a surface
 * ring so they read as "look here" against a dense line.
 */
function SeriesDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload || payload.value === null) {
    return null
  }

  const flagged = payload.valueStatus !== null

  return (
    <circle
      cx={cx}
      cy={cy}
      r={flagged ? 5 : 2.5}
      fill={flagged ? FLAG_COLOR : LINE_COLOR}
      stroke={SURFACE_COLOR}
      strokeWidth={flagged ? 2 : 0}
    />
  )
}

type TooltipProps = {
  readonly active?: boolean
  readonly payload?: readonly { readonly payload: TimeSeriesPoint }[]
}

function SeriesTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{point.period}</p>
      <p className="mt-0.5 tabular-nums text-popover-foreground">
        {point.raw ?? t`Fără date`}
      </p>
      {point.valueStatus ? (
        <p className="mt-0.5 text-amber-700 dark:text-amber-400">
          {point.valueStatus} — {describeValueStatus(point.valueStatus)}
        </p>
      ) : null}
    </div>
  )
}
