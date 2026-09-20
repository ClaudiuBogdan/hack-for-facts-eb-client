import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useId } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { activeNumberLocale, groupWireValue } from '../lib/format'
import type { SeriesStats } from '../lib/series-stats'
import { formatChartPeriod, formatHubPeriod } from '../lib/hub-format'
import {
  seriesAxis,
  type TimeSeries,
  type TimeSeriesPoint,
} from '../lib/time-series'
import { describeValueStatus } from '../lib/value-status'
import { cn } from '@/lib/utils'

type Props = {
  readonly series: TimeSeries
  readonly title: string
  readonly unitLabel: string | null
  readonly wholeHistory?: boolean
  /**
   * Three opt-in treatments. Every existing caller gets today's plain line;
   * the detail page asks for all three.
   */
  /** Tint the area under the line — right for a quantity with a real zero. */
  readonly area?: boolean
  /**
   * Mark the peak, the trough and the latest point with their values, so a
   * line whose extremes are the point of the page does not need hovering.
   * Needs `stats`; extremes the chart does not CONTAIN are not marked.
   */
  readonly annotate?: boolean
  /** Draw the series mean as a horizontal reference, when the plot holds it. */
  readonly mean?: boolean
  readonly stats?: SeriesStats
  /** Height utility for the plot area. */
  readonly height?: string
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

/** A published value on a mark, in the active locale. */
function formatMarkValue(value: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: 2,
  }).format(value)
}

/** A COMPUTED value on a mark: no decimals past a thousand — see the mean. */
function formatDerivedMark(value: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value)
}

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
export function DetailObservationsChart({
  series,
  title,
  unitLabel,
  wholeHistory = false,
  area = false,
  annotate = false,
  mean = false,
  stats,
  height = 'h-72',
}: Props) {
  const axis = seriesAxis(series.points)
  const valueAxis = axisLabels(axis.ticks, activeNumberLocale())
  // Referenced by id, so two charts sharing one would make the second paint
  // with the first's fill.
  const gradientId = `ins-series-area-${useId().replace(/:/g, '')}`
  const marks = annotate && stats ? stats : null

  /**
   * Where to hang an extreme's label — and whether to hang one at all.
   *
   * A centred label on a point at the series START is drawn half outside the
   * plot and clipped. And an extreme the chart does not CONTAIN cannot be
   * annotated: the stats cover every observation while `buildTimeSeries` caps
   * the plot at `CHART_MAX_POINTS`, so a long monthly series' peak can live
   * outside its own figure. Recharts drops such a dot silently, which is the
   * worst outcome — the summary claims a maximum and the figure neither shows
   * nor denies it. `null` means „not on this chart, do not mark it"; the
   * truncation note is what explains the absence.
   */
  const labelPosition = (
    period: string,
    fallback: 'top' | 'bottom',
  ): 'left' | 'right' | 'top' | 'bottom' | null => {
    const index = series.points.findIndex((point) => point.period === period)
    if (index < 0) return null
    const ratio = index / Math.max(1, series.points.length - 1)
    if (ratio < 0.12) return 'right'
    if (ratio > 0.88) return 'left'
    return fallback
  }

  const peakPosition = marks?.peak
    ? labelPosition(marks.peak.period, 'top')
    : null
  const troughPosition = marks?.trough
    ? labelPosition(marks.trough.period, 'bottom')
    : null
  const latestOnChart =
    marks?.latest !== undefined &&
    marks?.latest !== null &&
    series.points.some((point) => point.period === marks.latest!.period)
  // The trough is not marked twice when the series ends on it.
  const troughIsLatest =
    marks?.trough != null &&
    marks?.latest != null &&
    marks.trough.period === marks.latest.period

  const plottedValues = series.points
    .map((point) => point.value)
    .filter((value): value is number => value !== null)
  const plottedMax =
    plottedValues.length > 0 ? Math.max(...plottedValues) : null
  const plottedMin =
    plottedValues.length > 0 ? Math.min(...plottedValues) : null
  // `seriesAxis` returns `[0, 'auto']` on the zero-baseline path and Recharts
  // derives the top from the data, so the effective ceiling is the highest
  // plotted value rather than the literal `'auto'`.
  const domainTop =
    typeof axis.domain[1] === 'number' ? axis.domain[1] : plottedMax
  /**
   * The floor Recharts will actually draw, not the one `seriesAxis` requested.
   * Its zero-baseline path asks for `0`, but Recharts expands the domain to
   * hold the data — so on an all-negative series the requested floor sits
   * ABOVE every point, and comparing the mean against it hid a reference that
   * belongs squarely inside the plot.
   */
  const domainFloor =
    plottedMin === null ? axis.domain[0] : Math.min(axis.domain[0], plottedMin)
  /**
   * The mean is drawn only when the plot's own scale contains it. It covers
   * every observation while the domain covers the plotted ones, so on a capped
   * series it can fall outside and Recharts discards it (`ifOverflow` defaults
   * to `discard`) — the reference vanishes and nothing says why. Withholding
   * it deliberately is the same picture without the mystery.
   */
  const meanOnChart =
    mean &&
    stats?.mean != null &&
    domainTop !== null &&
    stats.mean >= domainFloor &&
    stats.mean <= domainTop

  const endLabel =
    marks?.latest != null ? formatMarkValue(marks.latest.value) : ''
  /**
   * The right gutter has to hold the end label, whatever it says. A fixed
   * 44px fits „10" and truncates „21.646.220" to „21.64…" — the one number on
   * the chart a reader is most likely looking for. Recharts gives no measured
   * text, so this estimates from the label's length, floored so a short label
   * still clears the edge and capped so a pathological one cannot eat the plot.
   */
  const rightGutter = annotate
    ? Math.min(120, Math.max(24, Math.round(endLabel.length * 7.2) + 14))
    : 16

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {unitLabel ? (
          <p className="text-xs text-muted-foreground">{unitLabel}</p>
        ) : null}
      </figcaption>

      <div className={cn(height, 'w-full min-w-0')}>
        <SafeResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series.points as TimeSeriesPoint[]}
            margin={{
              top: annotate ? 24 : 8,
              right: rightGutter,
              bottom: 0,
              left: 8,
            }}
          >
            {area ? (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.01} />
                </linearGradient>
              </defs>
            ) : null}
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
            {meanOnChart && stats?.mean != null ? (
              <ReferenceLine
                y={stats.mean}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeWidth={1}
                // Anchored right: a falling series leaves its right side empty,
                // while the left is where the line and the area tint are
                // busiest.
                label={{
                  value: t`medie ${formatDerivedMark(stats.mean)}`,
                  position: 'insideTopRight',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 11,
                }}
              />
            ) : null}

            {area ? (
              <Area
                type="linear"
                dataKey="value"
                stroke="none"
                fill={`url(#${gradientId})`}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={false}
              />
            ) : null}

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

            {marks?.peak && peakPosition ? (
              <ReferenceDot
                x={marks.peak.period}
                y={marks.peak.value}
                r={4}
                fill={SURFACE_COLOR}
                stroke={LINE_COLOR}
                strokeWidth={2}
                label={{
                  value: t`maxim ${formatMarkValue(marks.peak.value)}`,
                  position: peakPosition,
                  // An edge label is drawn on the dot's own baseline, which on
                  // a first-point extreme lays the text across the line.
                  dy:
                    peakPosition === 'left' || peakPosition === 'right'
                      ? -12
                      : 0,
                  fill: 'hsl(var(--foreground))',
                  fontSize: 11,
                }}
              />
            ) : null}
            {marks?.trough && troughPosition && !troughIsLatest ? (
              <ReferenceDot
                x={marks.trough.period}
                y={marks.trough.value}
                r={4}
                fill={SURFACE_COLOR}
                stroke={LINE_COLOR}
                strokeWidth={2}
                label={{
                  value: t`minim ${formatMarkValue(marks.trough.value)}`,
                  position: troughPosition,
                  dy:
                    troughPosition === 'left' || troughPosition === 'right'
                      ? 12
                      : 0,
                  fill: 'hsl(var(--foreground))',
                  fontSize: 11,
                }}
              />
            ) : null}
            {marks?.latest && latestOnChart ? (
              <ReferenceDot
                x={marks.latest.period}
                y={marks.latest.value}
                r={4}
                fill={LINE_COLOR}
                stroke={SURFACE_COLOR}
                strokeWidth={2}
                label={{
                  value: endLabel,
                  position: 'right',
                  fill: 'hsl(var(--foreground))',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            ) : null}
          </ComposedChart>
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
