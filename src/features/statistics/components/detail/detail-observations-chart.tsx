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
import { activeNumberLocale, groupWireValue } from '../../lib/format'
import type { SeriesPoint, SeriesStats } from '../../lib/series-stats'
import { formatChartPeriod, formatHubPeriod } from '../../lib/period'
import {
  isolatedPeriods,
  seriesAxis,
  type TimeSeries,
  type TimeSeriesPoint,
} from '../../lib/time-series'
import { describeValueStatus } from '../../lib/value-status'
import { cn } from '@/lib/utils'

type Props = {
  readonly series: TimeSeries
  /** The figure's accessible name; with the unit, it is its only caption. */
  readonly title: string
  readonly unitLabel: string | null
  /**
   * Three opt-in treatments over the line every caller gets; the detail page
   * asks for all three.
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

/**
 * Sky blue rather than the navy `--chart-1` every other chart opens with:
 * this is the one figure on the page, and the product owner asked for it to
 * carry its own colour. It is a token, so both themes get a shade that holds
 * 3:1 against the band.
 */
const LINE_COLOR = 'hsl(var(--chart-sky))'
const FLAG_COLOR = 'hsl(38 92% 45%)'
/** The band's own surface: rings cut out of the line in it. */
const SURFACE_COLOR = 'hsl(var(--card))'
/**
 * A halo under every mark label: the label's own outline in the band's
 * colour, painted beneath its fill. The line runs through the extremes it
 * labels — a trough in a V, a mean the series keeps crossing — and without
 * one „minim 0" and „medie 1,38" were struck through.
 */
const LABEL_HALO = {
  stroke: SURFACE_COLOR,
  strokeWidth: 4,
  strokeLinejoin: 'round',
  paintOrder: 'stroke',
} as const

/**
 * Past this many periods the line carries the shape and plain markers only
 * bead it: 34 annual points drew 34 dots competing with the three marks that
 * matter — the peak, the trough and the latest value. (At SOM101F's 200
 * monthly points they merged into a solid 5px band on a phone.) Hovering
 * still finds every period. Flagged points keep their marker at any density:
 * they are the ones worth finding, and so does a point with no neighbour,
 * which draws no segment and would otherwise not be drawn at all.
 */
const MARKERS_UP_TO_POINTS = 24

/**
 * The annotations' layer: one under the line's own markers. Recharts 3 puts
 * both on its `scatter` layer (600), where their order is left to mount
 * order, and a flagged latest point's amber marker could land under the
 * latest value's mark — hiding the one sign the value was qualified.
 */
const ANNOTATION_Z_INDEX = 599

/** A published value on a mark: the wire value, grouped, never re-rounded. */
function formatMarkValue(point: SeriesPoint): string {
  return groupWireValue(point.raw, activeNumberLocale())
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
  const chartId = useId().replace(/:/g, '')
  const gradientId = `ins-series-area-${chartId}`
  const glowId = `ins-series-glow-${chartId}`
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
  const latestOnChart =
    marks?.latest !== undefined &&
    marks?.latest !== null &&
    series.points.some((point) => point.period === marks.latest!.period)
  // The trough is not marked twice when the series ends on it — nor at all
  // when it IS the peak: a flat series (every value 0) has one extreme, and
  // two labels on the same point wrote „maxim 0" over „minim 0".
  const troughIsLatest =
    marks?.trough != null &&
    marks?.latest != null &&
    marks.trough.period === marks.latest.period
  const troughIsPeak =
    marks?.trough != null &&
    marks?.peak != null &&
    marks.trough.period === marks.peak.period

  const plottedValues = series.points
    .map((point) => point.value)
    .filter((value): value is number => value !== null)
  const plottedMax =
    plottedValues.length > 0 ? Math.max(...plottedValues) : null
  const plottedMin =
    plottedValues.length > 0 ? Math.min(...plottedValues) : null

  // A minimum on the floor of the plot — a 0 on a zero baseline — has no room
  // below it: a label hung there lands on the year ticks („minim 0" over
  // „2018"). It hangs above the point instead.
  const troughOnFloor =
    marks?.trough != null &&
    plottedMax !== null &&
    marks.trough.value - axis.domain[0] <=
      Math.max(0, plottedMax - axis.domain[0]) * 0.06
  const troughPosition = marks?.trough
    ? labelPosition(marks.trough.period, troughOnFloor ? 'top' : 'bottom')
    : null
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

  const isolated = isolatedPeriods(series.points)
  // A period that carries an annotation is drawn by it: a plain marker on top
  // punched a dot into the peak's ring. A flagged one is kept, above it.
  const annotated = new Set<string>()
  if (marks?.peak && peakPosition) annotated.add(marks.peak.period)
  if (marks?.trough && troughPosition && !troughIsLatest && !troughIsPeak)
    annotated.add(marks.trough.period)
  if (marks?.latest && latestOnChart) annotated.add(marks.latest.period)

  const endLabel = marks?.latest != null ? formatMarkValue(marks.latest) : ''
  // An extreme the plot does not contain is not marked; the note under the
  // plot then says the facts over it cover more than it shows.
  const extremesOffChart =
    marks !== null &&
    ((marks.peak !== null && peakPosition === null) ||
      (marks.trough !== null && troughPosition === null))
  /**
   * The right gutter has to hold the end label, whatever it says. A fixed
   * 44px fits „10" and truncates „21.646.220" to „21.64…" — the one number on
   * the chart a reader is most likely looking for. Recharts gives no measured
   * text, so this estimates from the label's length, floored so a short label
   * still clears the edge and capped so a pathological one cannot eat the plot.
   */
  const rightGutter = annotate
    ? Math.min(124, Math.max(28, Math.round(endLabel.length * 7.2) + 19))
    : 16

  return (
    <figure className="space-y-2">
      {/* Named for assistive tech only. On screen the figure above it
          already says what this is and in what unit, and a visible
          „EVOLUȚIE ÎN TIMP număr" over it said nothing a reader needed. */}
      <figcaption className="sr-only">
        {unitLabel ? `${title}, ${unitLabel}` : title}
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
            <defs>
              {/* Deepest under the line's highest point and gone before the
                  baseline, so the tint reads as the line's own shadow rather
                  than a filled block. */}
              {area ? (
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.3} />
                  <stop offset="60%" stopColor={LINE_COLOR} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
                </linearGradient>
              ) : null}
              {/* A soft glow under the line. The region is the whole plot in
                  user space: sized from the line's own box, a flat series —
                  every value 0 — has a box of zero height, and the filter
                  would erase the line it was meant to lift. */}
              <filter
                id={glowId}
                filterUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="100%"
                height="100%"
              >
                <feDropShadow
                  dx="0"
                  dy="3"
                  stdDeviation="3"
                  floodColor={LINE_COLOR}
                  floodOpacity={0.25}
                />
              </filter>
            </defs>
            {/* Solid hairline. A dashed grid reads as a projection or a
                threshold when it is neither. */}
            <CartesianGrid
              vertical={false}
              stroke="hsl(var(--border))"
              strokeOpacity={0.7}
            />
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
              // A crosshair in the line's colour, from the top of the plot to
              // the baseline: it ties the tooltip to the period it reads.
              cursor={{ stroke: LINE_COLOR, strokeOpacity: 0.6, strokeWidth: 1 }}
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
                  ...LABEL_HALO,
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
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
              connectNulls={false}
              isAnimationActive={false}
              dot={
                <SeriesDot
                  dense={series.points.length > MARKERS_UP_TO_POINTS}
                  isolated={isolated}
                  annotated={annotated}
                />
              }
              activeDot={<ActiveDot />}
            />

            {marks?.peak && peakPosition ? (
              <ReferenceDot
                zIndex={ANNOTATION_Z_INDEX}
                x={marks.peak.period}
                y={marks.peak.value}
                r={4}
                fill={SURFACE_COLOR}
                stroke={LINE_COLOR}
                strokeWidth={2}
                label={{
                  value: t`maxim ${formatMarkValue(marks.peak)}`,
                  position: peakPosition,
                  // An edge label is drawn on the dot's own baseline, which on
                  // a first-point extreme lays the text across the line.
                  dy:
                    peakPosition === 'left' || peakPosition === 'right'
                      ? -12
                      : 0,
                  fill: 'hsl(var(--foreground))',
                  fontSize: 11,
                  ...LABEL_HALO,
                }}
              />
            ) : null}
            {marks?.trough && troughPosition && !troughIsLatest && !troughIsPeak ? (
              <ReferenceDot
                zIndex={ANNOTATION_Z_INDEX}
                x={marks.trough.period}
                y={marks.trough.value}
                r={4}
                fill={SURFACE_COLOR}
                stroke={LINE_COLOR}
                strokeWidth={2}
                label={{
                  value: t`minim ${formatMarkValue(marks.trough)}`,
                  position: troughPosition,
                  dy:
                    troughPosition === 'left' || troughPosition === 'right'
                      ? troughOnFloor
                        ? -12
                        : 12
                      : 0,
                  fill: 'hsl(var(--foreground))',
                  fontSize: 11,
                  ...LABEL_HALO,
                }}
              />
            ) : null}
            {/* The latest value is where the reading ends, so it carries a
                halo: the same mark the hovered period gets. */}
            {marks?.latest && latestOnChart ? (
              <ReferenceDot
                zIndex={ANNOTATION_Z_INDEX}
                x={marks.latest.period}
                y={marks.latest.value}
                r={10}
                fill={LINE_COLOR}
                fillOpacity={0.18}
                stroke="none"
              />
            ) : null}
            {marks?.latest && latestOnChart ? (
              <ReferenceDot
                zIndex={ANNOTATION_Z_INDEX}
                x={marks.latest.period}
                y={marks.latest.value}
                r={5}
                fill={LINE_COLOR}
                stroke={SURFACE_COLOR}
                strokeWidth={2}
                label={{
                  value: endLabel,
                  position: 'right',
                  // Clear of the halo.
                  offset: 10,
                  fill: 'hsl(var(--foreground))',
                  fontSize: 12,
                  ...LABEL_HALO,
                  fontWeight: 600,
                }}
              />
            ) : null}
          </ComposedChart>
        </SafeResponsiveContainer>
      </div>

      {series.truncated ? (
        <p className="text-xs text-muted-foreground">
          {extremesOffChart && marks ? (
            <Trans>
              Graficul afișează ultimele {series.points.length} perioade; minimul
              și maximul de lângă cifră acoperă toate cele {marks.count} observații
              ale intervalului. Restrânge intervalul pentru a vedea perioade mai
              vechi.
            </Trans>
          ) : (
            <Trans>
              Graficul afișează ultimele {series.points.length} perioade. Restrânge
              intervalul pentru a vedea perioade mai vechi.
            </Trans>
          )}
        </p>
      ) : null}
    </figure>
  )
}

type DotProps = {
  readonly cx?: number
  readonly cy?: number
  readonly payload?: TimeSeriesPoint
  /** Set by the chart when the line alone carries the series' shape. */
  readonly dense?: boolean
  /** Periods with no plotted neighbour: see `isolatedPeriods`. */
  readonly isolated?: ReadonlySet<string>
  /** Periods an annotation already marks. */
  readonly annotated?: ReadonlySet<string>
}

/**
 * Plain points stay small and recessive, and disappear once the series is
 * long enough that the line carries it — except a point with no neighbour,
 * which has no line. Flagged points grow and gain a surface ring so they read
 * as "look here".
 */
function SeriesDot({ cx, cy, payload, dense, isolated, annotated }: DotProps) {
  if (cx === undefined || cy === undefined || !payload || payload.value === null) {
    return null
  }

  const flagged = payload.valueStatus !== null
  if (!flagged && annotated?.has(payload.period)) return null
  const alone = isolated?.has(payload.period) ?? false
  if (dense && !flagged && !alone) return null

  return (
    <circle
      cx={cx}
      cy={cy}
      r={flagged ? 5 : 3}
      fill={flagged ? FLAG_COLOR : LINE_COLOR}
      stroke={SURFACE_COLOR}
      strokeWidth={flagged ? 2 : 1.5}
    />
  )
}

/**
 * The hovered period: a ringed dot in a soft halo, in the flag's colour when
 * the point carries one, so hovering never paints over the only mark that
 * said the value was qualified.
 */
function ActiveDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload || payload.value === null) {
    return null
  }
  const color = payload.valueStatus !== null ? FLAG_COLOR : LINE_COLOR
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.18} />
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke={SURFACE_COLOR}
        strokeWidth={2.5}
      />
    </g>
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
    <div className="min-w-32 rounded-lg border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <p className="font-medium text-muted-foreground">
        {formatHubPeriod(point.period)}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5 tabular-nums">
        {point.raw === null ? (
          <span className="text-popover-foreground">{t`Fără date`}</span>
        ) : (
          <>
            {/* The point's own colour — the line's, or the flag's — so the
                value reads as the mark it came from. */}
            <span
              aria-hidden="true"
              className="size-2 shrink-0 self-center rounded-full"
              style={{
                backgroundColor:
                  point.valueStatus !== null ? FLAG_COLOR : LINE_COLOR,
              }}
            />
            <span className="text-sm font-semibold text-popover-foreground">
              {groupWireValue(point.raw, activeNumberLocale())}
            </span>
            {unitLabel ? (
              <span className="text-muted-foreground">{unitLabel}</span>
            ) : null}
          </>
        )}
      </p>
      {point.valueStatus !== null ? (
        <p className="mt-1 text-amber-700 dark:text-amber-400">
          {point.valueStatus === '' ? '""' : point.valueStatus} — {describeValueStatus(point.valueStatus)}
        </p>
      ) : null}
    </div>
  )
}
