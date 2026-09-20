import { useId, type ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react'
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  activeNumberLocale,
  formatPercent,
  groupWireValue,
} from '@/features/statistics/lib/format'
import {
  formatChartPeriod,
  formatHubPeriod,
} from '@/features/statistics/lib/hub-format'
import {
  seriesAxis,
  type TimeSeries,
  type TimeSeriesPoint,
} from '@/features/statistics/lib/time-series'
import { describeValueStatus } from '@/features/statistics/lib/value-status'
import type { SeriesPoint, SeriesStats } from './dataset-detail.data'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const LINE = 'hsl(var(--chart-1))'
const FLAG = 'hsl(38 92% 45%)'
const SURFACE = 'hsl(var(--background))'

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export function formatValue(value: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * A DERIVED figure — a mean — at a precision the source justifies.
 *
 * `formatValue` prints two decimals, which is right for a value INS published
 * and wrong for one we computed: a population mean came out as
 * „22.511.356,94", claiming a hundredth of a person across 35 censuses. Past a
 * thousand the decimals are noise, so they go.
 */
export function formatDerived(value: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value)
}

/**
 * A signed change, as a word and an arrow as well as a color — colour is never
 * the only signal (DESIGN.md §Colors). Falling is not "bad" here and rising is
 * not "good": an accident count falling is the happy direction, a birth rate
 * falling is not. So the tint is direction-neutral muted ink and the arrow
 * carries the direction.
 */
export function Delta({
  percent,
  label,
  className,
}: {
  readonly percent: number | null
  readonly label: string
  readonly className?: string
}) {
  if (percent === null) return null
  const Icon =
    percent > 0 ? ArrowUpRight : percent < 0 ? ArrowDownRight : ArrowRight
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 text-sm tabular-nums text-muted-foreground',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 self-center" aria-hidden />
      <span className="font-medium text-foreground">
        {formatPercent(percent, { signed: true })}
      </span>
      <span>{label}</span>
    </span>
  )
}

/** Label / figure / caption — the three tiers, as one tile. */
export function StatTile({
  label,
  value,
  caption,
  accent,
}: {
  readonly label: string
  readonly value: ReactNode
  readonly caption?: ReactNode
  readonly accent?: boolean
}) {
  return (
    <div
      className={cn(
        'min-w-0 px-4 py-3',
        accent && 'bg-muted/40',
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 truncate tabular-nums tracking-tight',
          accent ? 'text-2xl font-semibold' : 'text-lg font-medium',
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------

type ChartProps = {
  readonly series: TimeSeries
  readonly unitLabel: string | null
  readonly stats: SeriesStats
  /**
   * Three independent treatments, not one enum. The combined variant asks for
   * all three at once, which a single `treatment` prop could not express
   * without growing a name per combination.
   */
  /** Tint the area under the line. */
  readonly area?: boolean
  /** Mark the peak, the trough and the latest point, with their values. */
  readonly annotate?: boolean
  /** Draw the series mean as a horizontal reference. */
  readonly mean?: boolean
  readonly height?: string
  readonly className?: string
}

/**
 * One INS series, with the annotations a variant asks for.
 *
 * The gap rule from the production chart holds everywhere: `connectNulls` stays
 * false so a period INS never published stays a break in the line rather than a
 * segment between its neighbours.
 *
 * Extremes are marked rather than left for the reader to find. A 33-point line
 * whose peak and trough are the whole point of the page should not require
 * hovering to locate them.
 */
export function PrototypeChart({
  series,
  unitLabel,
  stats,
  area = false,
  annotate = false,
  mean = false,
  height = 'h-72',
  className,
}: ChartProps) {
  // The gradient is referenced by id, so two charts sharing one would make the
  // second paint with the first's fill. The harness renders several variants on
  // one page (`?v=a,b`), which is exactly that case.
  const gradientId = `proto-area-${useId().replace(/:/g, '')}`
  const axis = seriesAxis(series.points)
  const formatter = new Intl.NumberFormat(activeNumberLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const dense = series.points.length > 60

  /**
   * The right gutter has to hold the end label, whatever it says.
   *
   * A fixed 44px fits „10" and truncates „21.646.220" to „21.64…" — the one
   * number on the chart a reader is most likely to be looking for. Recharts
   * gives no measured text, so this estimates from the label's own length at
   * the 12px the label is drawn in.
   */
  const endLabel =
    annotate && stats.latest ? formatValue(stats.latest.value) : ''
  // Capped as well as floored: a pathologically long label must not eat the
  // plot it is labelling. Past the cap it truncates, which is the lesser loss.
  const rightGutter = annotate
    ? Math.min(120, Math.max(24, Math.round(endLabel.length * 7.2) + 14))
    : 16

  /**
   * Where to hang an extreme's label — and whether to hang one at all.
   *
   * Two things went wrong before this existed. A centred label on a point at
   * the series START is drawn half outside the plot and clipped. And an
   * extreme the chart does not CONTAIN cannot be annotated at all: the stats
   * cover every observation, while `buildTimeSeries` caps the plot at 200
   * periods, so SOM101F's peak (february 2010) lives outside its own figure.
   * Recharts drops such a dot silently, which is the worst outcome — the
   * summary claims a maximum and the figure neither shows nor denies it.
   *
   * `null` means „this extreme is not on the chart, do not mark it"; the
   * truncation note under the figure is what explains the absence.
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

  const peakPosition = stats.peak
    ? labelPosition(stats.peak.period, 'top')
    : null
  /**
   * An edge label is drawn on the dot's own baseline, which for POP107D's
   * first-point peak laid „maxim 23.143.860" straight across the line's next
   * few points. Nudged clear of the mark, away from the series.
   */
  const peakNudge =
    peakPosition === 'left' || peakPosition === 'right' ? -12 : 0
  const troughPosition = stats.trough
    ? labelPosition(stats.trough.period, 'bottom')
    : null
  const troughNudge =
    troughPosition === 'left' || troughPosition === 'right' ? 12 : 0
  /** The end dot needs the same membership test — see `labelPosition`. */
  const latestOnChart =
    stats.latest !== null &&
    series.points.some((point) => point.period === stats.latest!.period)

  /**
   * The mean is drawn only when the plot's own scale contains it.
   *
   * `seriesAxis` builds its domain from the PLOTTED points, while the mean
   * covers every observation. On a capped series whose early years sat an
   * order of magnitude higher, the mean lands outside the domain and Recharts
   * discards the line (`ifOverflow` defaults to `discard`) — the reference
   * silently vanishes and nothing says why. Withholding it deliberately is the
   * same picture, minus the mystery; the figure's truncation note already
   * says the summary covers more than the plot.
   */
  const plottedMax = series.points.reduce<number | null>(
    (highest, point) =>
      point.value === null
        ? highest
        : highest === null || point.value > highest
          ? point.value
          : highest,
    null,
  )
  // `seriesAxis` returns `[0, 'auto']` on the zero-baseline path, and Recharts
  // then derives the top from the data — so the effective ceiling is the
  // highest plotted value, not the literal `'auto'`.
  const domainTop =
    typeof axis.domain[1] === 'number' ? axis.domain[1] : plottedMax
  const meanOnChart =
    mean &&
    stats.mean !== null &&
    domainTop !== null &&
    stats.mean >= axis.domain[0] &&
    stats.mean <= domainTop

  return (
    <div className={cn('w-full min-w-0', className)}>
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
                <stop offset="0%" stopColor={LINE} stopOpacity={0.18} />
                <stop offset="100%" stopColor={LINE} stopOpacity={0.01} />
              </linearGradient>
            </defs>
          ) : null}

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
            width={56}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={(value: number) => formatter.format(value)}
          />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            content={<ChartTooltip unitLabel={unitLabel} />}
          />

          {meanOnChart && stats.mean !== null ? (
            <ReferenceLine
              y={stats.mean}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1}
              // Anchored right, not left. A series that falls leaves its right
              // side empty, while the left is where the line and the area fill
              // are busiest — „medie 31,3" set there sat on top of both.
              label={{
                value: `medie ${formatDerived(stats.mean)}`,
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
            stroke={LINE}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
            dot={<ChartDot dense={dense} />}
            activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE }}
          />

          {annotate && stats.peak && peakPosition ? (
            <ReferenceDot
              x={stats.peak.period}
              y={stats.peak.value}
              r={4}
              fill={SURFACE}
              stroke={LINE}
              strokeWidth={2}

              label={{
                value: `maxim ${formatValue(stats.peak.value)}`,
                position: peakPosition,
                dy: peakNudge,
                fill: 'hsl(var(--foreground))',
                fontSize: 11,
              }}
            />
          ) : null}
          {annotate && stats.trough && troughPosition && !stats.latestIsTrough ? (
            <ReferenceDot
              x={stats.trough.period}
              y={stats.trough.value}
              r={4}
              fill={SURFACE}
              stroke={LINE}
              strokeWidth={2}

              label={{
                value: `minim ${formatValue(stats.trough.value)}`,
                position: troughPosition,
                dy: troughNudge,
                fill: 'hsl(var(--foreground))',
                fontSize: 11,
              }}
            />
          ) : null}
          {annotate && stats.latest && latestOnChart ? (
            <ReferenceDot
              x={stats.latest.period}
              y={stats.latest.value}
              r={4}
              fill={LINE}
              stroke={SURFACE}
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

      {/* The cap is 200 periods. Saying so is not a footnote: without it the
          summary facts above describe a series wider than the figure below,
          and a reader has no way to know it. */}
      {series.truncated ? (
        <p className="mt-2 px-2 text-xs text-muted-foreground">
          Graficul afișează ultimele{' '}
          <span className="tabular-nums">{series.points.length}</span> perioade.
          Reperele de mai sus acoperă seria întreagă.
        </p>
      ) : null}
    </div>
  )
}

function ChartDot({
  cx,
  cy,
  payload,
  dense,
}: {
  readonly cx?: number
  readonly cy?: number
  readonly payload?: TimeSeriesPoint
  readonly dense?: boolean
}) {
  if (cx === undefined || cy === undefined || !payload || payload.value === null)
    return null
  const flagged = payload.valueStatus !== null
  if (dense && !flagged) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={flagged ? 5 : 2.5}
      fill={flagged ? FLAG : LINE}
      stroke={SURFACE}
      strokeWidth={flagged ? 2 : 0}
    />
  )
}

function ChartTooltip({
  active,
  payload,
  unitLabel,
}: {
  readonly active?: boolean
  readonly payload?: readonly { readonly payload: TimeSeriesPoint }[]
  readonly unitLabel?: string | null
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">
        {formatHubPeriod(point.period)}
      </p>
      <p className="mt-0.5 tabular-nums text-popover-foreground">
        {point.raw === null
          ? 'Fără date'
          : groupWireValue(point.raw, activeNumberLocale())}
        {point.raw !== null && unitLabel ? (
          <span className="ml-1 font-normal text-muted-foreground">
            {unitLabel}
          </span>
        ) : null}
      </p>
      {point.valueStatus !== null ? (
        <p className="mt-0.5 text-amber-700 dark:text-amber-400">
          {describeValueStatus(point.valueStatus)}
        </p>
      ) : null}
    </div>
  )
}


// ---------------------------------------------------------------------------
// The selection rail
// ---------------------------------------------------------------------------

/**
 * One axis in the standing rail: its name, its current value, and — when the
 * axis has something to choose — a count and a chevron.
 *
 * An axis with a single member renders as text, not as a button. Given the
 * same affordance as its neighbours it read as a control that did nothing when
 * pressed, which is the same rule `statisticsTheme.scopeChipStatic` encodes on
 * the production page.
 */
export function RailControl({
  label,
  value,
  fixed,
  count,
}: {
  readonly label: string
  readonly value: string
  readonly fixed?: boolean
  readonly count?: number | null
}) {
  const content = (
    <>
      <span className="flex min-w-0 flex-col items-start">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="mt-0.5 w-full truncate text-left text-sm font-medium">
          {value}
        </span>
      </span>
      {fixed ? null : (
        <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {count ? <span className="tabular-nums">{count}</span> : null}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </>
  )

  if (fixed) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {content}
    </button>
  )
}

/** One summary fact beside the hero: the number, and the period it belongs to. */
export function RailFact({
  label,
  point,
}: {
  readonly label: string
  readonly point: { readonly value: number; readonly period: string } | null
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">
        {point ? formatValue(point.value) : '—'}
        {point ? (
          <span className="ml-1 font-normal text-muted-foreground">
            {formatHubPeriod(point.period)}
          </span>
        ) : null}
      </dd>
    </div>
  )
}

/**
 * A numbered document section — methodology, sources, the institute's own
 * notes. A number is cheaper to reference than a chevron is to open, and these
 * are the parts of the page a reader cites rather than browses.
 */
export function DocumentNote({
  index,
  title,
  children,
}: {
  readonly index: number
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">
        <span className="tabular-nums text-muted-foreground">{index}.</span>{' '}
        {title}
      </h3>
      <div className="mt-1.5">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Shared states
// ---------------------------------------------------------------------------

export function VariantSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-hidden>
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * The prototype reads ONE fixed scope — `territoryLevels: ['NATIONAL']`, no
 * pins — where the real page resolves an anchor first. A matrix with no
 * territorial axis cannot answer that read (the server needs a pin or a unit),
 * so it fails here and works in production. Say which is which, rather than
 * blaming the API.
 */
export function VariantError({ code }: { readonly code: string }) {
  return (
    <div className="space-y-2 p-6 text-sm">
      <p className="text-destructive">Nu am putut încărca seria pentru {code}.</p>
      <p className="max-w-prose text-muted-foreground">
        Prototipul citește o singură selecție fixă — nivel național, fără pin-uri
        — pe când pagina reală rezolvă întâi o ancoră. O matrice fără axă
        teritorială nu poate răspunde acestei citiri aici, deși funcționează în
        producție. Încearcă alt cod (<code>?cod=POP107D</code>) sau deschide
        pagina reală.
      </p>
    </div>
  )
}

/**
 * The one-sentence read of the series, split so a variant can set the figure
 * differently from the clause that explains it.
 *
 * Every variant that shows it derives it from the SAME stats, so what differs
 * between the panes is where the sentence sits and how loud it is — not what
 * it claims.
 */
export type SeriesReading = {
  /** The latest value, formatted. */
  readonly figure: string
  readonly unit: string | null
  /** The clause after the figure, with no leading capital. */
  readonly clause: string
}

export function seriesReading(
  stats: SeriesStats,
  unitWord: string,
): SeriesReading | null {
  const { latest, first, peak } = stats
  if (!latest || !first) return null
  const unit = unitWord.trim().length > 0 ? unitWord : null
  const period = formatHubPeriod(latest.period)
  const figure = formatValue(latest.value)

  if (stats.latestIsTrough)
    return {
      figure,
      unit,
      clause: `în ${period} — cea mai mică valoare din seria începută în ${formatHubPeriod(first.period)}.`,
    }
  if (stats.latestIsPeak)
    return {
      figure,
      unit,
      clause: `în ${period} — cea mai mare valoare din seria începută în ${formatHubPeriod(first.period)}.`,
    }
  // „10 în 2020, față de un maxim de 10 în 2020." compares a lone observation
  // with itself. With nothing to compare against there is no reading to give.
  if (peak && peak.period !== latest.period)
    return {
      figure,
      unit,
      clause: `în ${period}, față de un maxim de ${formatValue(peak.value)} în ${formatHubPeriod(peak.period)}.`,
    }
  return null
}

/** The reading as one flat string, for variants that set it as plain prose. */
export function seriesSentence(
  stats: SeriesStats,
  unitWord: string,
): string | null {
  const reading = seriesReading(stats, unitWord)
  if (!reading) return null
  return `${reading.figure}${reading.unit ? ` ${reading.unit}` : ''} ${reading.clause}`
}

export type { SeriesPoint }
