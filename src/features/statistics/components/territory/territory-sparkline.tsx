import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import { useChartReading } from '../../hooks/use-chart-reading'
import { activeNumberLocale } from '../../lib/format'
import { CHART_PLOT_CLASS } from '../../lib/period-chart'
import { formatHubPeriod } from '../../lib/period'
import { buildSparklinePaths, sparklineEndPoint, sparklinePointAt, type SparklinePoints } from '../../lib/territory-sparkline'
import { parseWireDecimal } from '../../lib/value-status'
import { ChartRule, ChartTooltip } from '../charts/period-chart-parts'

/** „Evoluție de la 2010 până în 2025, între 150 mii și 170 mii" — the line said in words. */
function sparklineLabel(points: SparklinePoints, truncated: boolean): string {
  const first = formatHubPeriod(points[0]?.[0].iso_period ?? '')
  const last = formatHubPeriod(points[points.length - 1]?.[0].iso_period ?? '')
  const numeric = points
    .map(([, value]) => parseWireDecimal(value))
    .filter((value): value is number => value !== null)
  const compact = new Intl.NumberFormat(activeNumberLocale(), { notation: 'compact', maximumFractionDigits: 1 })
  const low = compact.format(Math.min(...numeric))
  const high = compact.format(Math.max(...numeric))
  return `${t`Evoluție de la ${first} până în ${last}, între ${low} și ${high}`}${capNote(truncated)}`
}

// A capped history starts later than the series: said on the line itself,
// where the start is read, not as a sentence under every row.
const capNote = (truncated: boolean) => (truncated ? ` ${t`(ultimele 200 de observații)`}` : '')

/**
 * A territory indicator's history as a small line, beside the value that is
 * the reading — in the INS series colour (`chart-sky`), the colour of the
 * chart the row opens. The latest point is marked when it is the value the
 * row prints; a headline tile shades the area under the line. Fewer than two
 * readable points draw nothing: an empty slot says as much as a sentence
 * saying it.
 *
 * `decorative` stretches it to its box and leaves the naming and the dot to
 * the chart that reads it (`TerritorySparklineChart`).
 */
export function TerritorySparkline({
  points,
  width = 96,
  height = 24,
  area = false,
  truncated = false,
  decorative = false,
  className,
}: {
  readonly points: SparklinePoints
  readonly width?: number
  readonly height?: number
  /** Shade the area under the line. */
  readonly area?: boolean
  /** The server capped the history: the line starts later than the series. */
  readonly truncated?: boolean
  readonly decorative?: boolean
  readonly className?: string
}) {
  const paths = buildSparklinePaths(points, width, height)
  if (paths.length === 0) return null
  const first = formatHubPeriod(points[0]?.[0].iso_period ?? '')
  const last = formatHubPeriod(points[points.length - 1]?.[0].iso_period ?? '')
  // The dot sits on the last point only when that point has a value: a gap
  // at the end is not the latest value, and a dot on the one before would
  // claim it was.
  const end = decorative ? null : sparklineEndPoint(points, width, height)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      {...(decorative
        ? { 'aria-hidden': true, preserveAspectRatio: 'none' }
        : { role: 'img', 'aria-label': sparklineLabel(points, truncated) })}
      className={cn('shrink-0 overflow-visible text-chart-sky', className)}
    >
      {decorative ? null : <title>{`${first} – ${last}${capNote(truncated)}`}</title>}
      {area
        ? paths.map((d) => <path key={`area-${d}`} d={areaPath(d, height)} className="fill-chart-sky/10" />)
        : null}
      {paths.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {end ? <circle cx={end.x} cy={end.y} r={2.25} fill="currentColor" /> : null}
    </svg>
  )
}

/**
 * A headline tile's history, read period by period in the idiom of the INS
 * period charts (`useChartReading`): a mouse reads while it hovers, a tap
 * holds the reading until a tap elsewhere, the arrows, Home and End move
 * along it from the keyboard. The reading is the rule, a dot, and a box
 * with the period and its value in the tile's unit. It sits above the
 * tile's link, which the rest of the tile still opens.
 */
export function TerritorySparklineChart({
  points,
  truncated = false,
  format,
  className,
}: {
  readonly points: SparklinePoints
  readonly truncated?: boolean
  /** A value in the tile's own words: „160.228 persoane". */
  readonly format: (value: number) => string
  readonly className?: string
}) {
  const hintId = useId()
  const width = 240
  const height = 40
  // Under the plot, centred on the rule; a tile's own padding is the room it may overhang.
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useChartReading(points.length, { gutter: 16, centred: true })
  if (buildSparklinePaths(points, width, height).length === 0) return null

  const count = points.length
  const periodOf = (index: number) => formatHubPeriod(points[index]?.[0].iso_period ?? '')
  const valueOf = (index: number) => {
    const value = parseWireDecimal(points[index]?.[1] ?? null)
    return value === null ? '—' : format(value)
  }
  const dot = (index: number, emphasis: boolean) => {
    const at = sparklinePointAt(points, index, width, height)
    if (!at) return null
    return (
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-sky',
          emphasis ? 'size-2.5 ring-2 ring-card' : 'size-1.5',
        )}
        style={{ left: `${(at.x / width) * 100}%`, top: `${(at.y / height) * 100}%` }}
      />
    )
  }
  const xPct = (index: number) => ((2 + (index / (count - 1)) * (width - 4)) / width) * 100

  return (
    <div
      ref={plotRef}
      tabIndex={0}
      role="slider"
      aria-label={sparklineLabel(points, truncated)}
      aria-describedby={hintId}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={count - 1}
      aria-valuenow={active ?? count - 1}
      aria-valuetext={`${periodOf(active ?? count - 1)}: ${valueOf(active ?? count - 1)}`}
      // Above the tile's link (`after:inset-0`): a reading, not a click through.
      className={cn(CHART_PLOT_CLASS, 'z-10 rounded-sm', className)}
      {...handlers}
    >
      <span id={hintId} className="sr-only">
        {t`Săgețile stânga și dreapta trec de la un an la altul; Home și End duc la primul și la ultimul.`}
      </span>
      <TerritorySparkline points={points} width={width} height={height} area decorative className="block size-full" />
      {active === null ? (
        dot(count - 1, false)
      ) : (
        <>
          <ChartRule left={xPct(active)} />
          {dot(active, true)}
          <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft} className="top-full mt-2 min-w-0">
            <p className="font-medium tabular-nums text-foreground">{periodOf(active)}</p>
            <p className="tabular-nums text-foreground">{valueOf(active)}</p>
            {truncated && active === 0 ? (
              <p className="mt-1 text-[10px] text-muted-foreground">{t`(ultimele 200 de observații)`}</p>
            ) : null}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

function coordinates(path: string): readonly { readonly x: number; readonly y: number }[] {
  return [...path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }))
}

/** A run's line closed down to the baseline, for the shading under it. */
function areaPath(path: string, height: number): string {
  const points = coordinates(path)
  const firstX = points[0]?.x ?? 0
  const lastX = points[points.length - 1]?.x ?? 0
  return `${path} L${lastX},${height} L${firstX},${height} Z`
}
