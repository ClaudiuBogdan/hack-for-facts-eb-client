import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { activeNumberLocale, groupWireValue } from '../lib/format'
import { formatChartPeriod, formatHubPeriod } from '../lib/hub-format'
import {
  seriesAxis,
  type TimeSeries,
  type TimeSeriesPoint,
} from '../lib/time-series'
import { describeValueStatus } from '../lib/value-status'

type Props = {
  readonly series: TimeSeries
  readonly title: string
  readonly unitLabel: string | null
  readonly wholeHistory?: boolean
}

const LINE_COLOR = 'hsl(var(--chart-1))'
const FLAG_COLOR = 'hsl(38 92% 45%)'
const SURFACE_COLOR = 'hsl(var(--background))'

/**
 * Past this many periods the plain markers stop being markers. SOM101F's 200
 * monthly points get ~470px of plot on a phone — 2,4px apart, so `r=2,5` dots
 * merge into a 5px band and the shape is carried by the blob rather than the
 * line. Flagged points keep their marker at any density: they are the ones
 * worth finding.
 */
const DENSE_ABOVE_POINTS = 60

/**
 * Number formats for the value axis, tightest first, with the gutter each one
 * needs at 12px. The search below takes the first that works, so the axis only
 * gets wider when the labels genuinely need the room.
 */
const AXIS_FORMATS: readonly {
  readonly options: Intl.NumberFormatOptions
  readonly width: number
}[] = [
  { options: { notation: 'compact', maximumFractionDigits: 1 }, width: 56 },
  { options: { notation: 'compact', maximumFractionDigits: 2 }, width: 68 },
  { options: { notation: 'compact', maximumFractionDigits: 3 }, width: 76 },
  { options: { maximumFractionDigits: 0 }, width: 84 },
  { options: { maximumFractionDigits: 2 }, width: 92 },
]

/**
 * The value axis's labels, at the first precision that tells its ticks apart.
 *
 * Compact notation at one decimal cannot resolve a step smaller than a few
 * percent of the magnitude: a window of 21,45–21,65 mil. formats every one of
 * its five ticks as „21,5 mil." or „21,6 mil.", which is worse than the flat
 * line the padded domain was meant to fix — the plot magnifies a change and
 * hides the scale that would let anyone read it. So the format is chosen by
 * testing it: the first one that gives every tick a distinct label wins, and
 * the axis gutter grows with it.
 */
function axisLabels(
  ticks: readonly number[] | undefined,
  locale: string,
): { readonly format: (value: number) => string; readonly width: number } {
  for (const candidate of AXIS_FORMATS) {
    const formatter = new Intl.NumberFormat(locale, candidate.options)
    const format = (value: number) => formatter.format(value)
    if (!ticks || ticks.length < 2) return { format, width: candidate.width }
    const labels = ticks.map(format)
    if (new Set(labels).size === labels.length)
      return { format, width: candidate.width }
  }
  // Nothing separated them; print the values in full rather than repeat one
  // label down the whole axis.
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 })
  return { format: (value: number) => formatter.format(value), width: 104 }
}

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
export function DetailObservationsChart({ series, title, unitLabel, wholeHistory = false }: Props) {
  const axis = seriesAxis(series.points)
  const valueAxis = axisLabels(axis.ticks, activeNumberLocale())
  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {unitLabel ? (
          <p className="text-xs text-muted-foreground">{unitLabel}</p>
        ) : null}
      </figcaption>

      <div className="h-72 w-full min-w-0">
        <SafeResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series.points as TimeSeriesPoint[]}
            margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          >
            {/* Solid hairline. A dashed grid reads as a projection or a
                threshold when it is neither. */}
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={formatChartPeriod}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={axis.domain}
              {...(axis.ticks ? { ticks: [...axis.ticks] } : {})}
              width={valueAxis.width}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={valueAxis.format}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              content={<SeriesTooltip unitLabel={unitLabel} />}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
              dot={<SeriesDot dense={series.points.length > DENSE_ABOVE_POINTS} />}
              activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE_COLOR }}
            />
          </LineChart>
        </SafeResponsiveContainer>
      </div>

      {series.truncated ? (
        <p className="text-xs text-muted-foreground">
          {wholeHistory ? <Trans>The chart shows the latest {series.points.length} periods. Earlier observations remain in the table and complete export.</Trans> : <Trans>
            Graficul afișează ultimele {series.points.length} perioade. Restrânge
            intervalul pentru a vedea perioade mai vechi.
          </Trans>}
        </p>
      ) : null}
    </figure>
  )
}

type DotProps = {
  readonly cx?: number
  readonly cy?: number
  readonly payload?: TimeSeriesPoint
  /** Set by the chart when the points are too close to read as points. */
  readonly dense?: boolean
}

/**
 * Plain points stay small and recessive, and disappear entirely once the
 * series is dense enough that they would draw a band instead of a line.
 * Flagged points grow and gain a surface ring so they read as "look here".
 */
function SeriesDot({ cx, cy, payload, dense }: DotProps) {
  if (cx === undefined || cy === undefined || !payload || payload.value === null) {
    return null
  }

  const flagged = payload.valueStatus !== null
  if (dense && !flagged) return null

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
  readonly unitLabel?: string | null
}

function SeriesTooltip({ active, payload, unitLabel }: TooltipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">
        {formatHubPeriod(point.period)}
      </p>
      <p className="mt-0.5 tabular-nums text-popover-foreground">
        {point.raw === null ? (
          t`Fără date`
        ) : (
          <>
            {groupWireValue(point.raw, activeNumberLocale())}
            {unitLabel ? (
              <span className="ml-1 font-normal text-muted-foreground">
                {unitLabel}
              </span>
            ) : null}
          </>
        )}
      </p>
      {point.valueStatus !== null ? (
        <p className="mt-0.5 text-amber-700 dark:text-amber-400">
          {point.valueStatus === '' ? '""' : point.valueStatus} — {describeValueStatus(point.valueStatus)}
        </p>
      ) : null}
    </div>
  )
}
