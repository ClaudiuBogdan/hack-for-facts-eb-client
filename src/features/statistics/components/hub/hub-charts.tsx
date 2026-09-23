import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { StatisticsHubSeriesPoint } from '@/schemas/statistics'
import { useChartReading } from '../../hooks/use-chart-reading'
import { CHART_HEIGHT, CHART_PLOT_CLASS, CHART_WIDTH, gapRegions, niceScale, yearTickIndices } from '../../lib/hub-chart'
import { alignSeriesByPeriod, formatHubNumber, formatHubSigned } from '../../lib/hub-format'
import { ChartGridLines, ChartPeriodAxis, ChartRule, ChartTooltip, ChartValueTicks } from './hub-chart-parts'

/** One inline SVG path, no chart library. Decorative: the value beside it is the reading. */
export function HubSparkline({
  points,
  width = 96,
  height = 28,
  className,
}: {
  readonly points: readonly StatisticsHubSeriesPoint[]
  readonly width?: number
  readonly height?: number
  readonly className?: string
}) {
  if (points.length < 2) return null
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 2
  const x = (index: number) => pad + (index / (points.length - 1)) * (width - pad * 2)
  const y = (value: number) => pad + (1 - (value - min) / span) * (height - pad * 2)
  const d = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      className={cn('shrink-0 overflow-visible', className)}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r={2} fill="currentColor" />
    </svg>
  )
}

type ChartSeries = { readonly label: string; readonly points: readonly StatisticsHubSeriesPoint[] }

/**
 * Two national series on one period axis, with the space between them shaded
 * by which one runs above: births and deaths, where the grey is the years of
 * natural decrease. Inline SVG stretched to the frame; every text — ticks,
 * legend, tooltip — is HTML over it, so it reads at any width.
 *
 * Pointing at the chart (or dragging a finger along it, or the arrow keys
 * once it has focus) picks the nearest year: a vertical rule, a dot on each
 * line and a tooltip with both values and their difference. To a screen
 * reader the chart is a slider over the years whose value is that reading,
 * so its arrow keys reach the chart instead of the reading cursor.
 */
export function HubTwoLineChart({
  a,
  b,
  gap,
  highlight,
}: {
  readonly a: ChartSeries
  readonly b: ChartSeries
  /** Names for the space between the lines: the difference in the tooltip, and each shading in the legend. */
  readonly gap?: { readonly label: string; readonly aAbove: string; readonly bAbove: string }
  /** The series to bring forward; the other recedes. */
  readonly highlight?: 'a' | 'b'
}) {
  const aligned = alignSeriesByPeriod(a.points, b.points)
  const count = aligned.periods.length
  const values = [...aligned.a, ...aligned.b].filter((value): value is number => value !== null)
  const scale = niceScale(Math.min(...values), Math.max(...values))
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useChartReading(count)
  const hintId = useId()

  if (count < 2 || values.length === 0) return null

  const xAt = (index: number) => (index / (count - 1)) * 100
  const yAt = (value: number) => (1 - (value - scale.from) / (scale.to - scale.from)) * 100
  const toXY = (index: number, value: number) => `${((xAt(index) * CHART_WIDTH) / 100).toFixed(1)},${((yAt(value) * CHART_HEIGHT) / 100).toFixed(1)}`
  const toPath = (series: readonly (number | null)[]) =>
    series.map((value, index) => (value === null ? '' : `${index === 0 || series[index - 1] === null ? 'M' : 'L'}${toXY(index, value)}`)).join(' ')
  const regions = gap ? gapRegions(aligned.a, aligned.b) : []
  const signs = new Set(regions.map((region) => region.sign))

  const readingAt = (index: number) => {
    const first = aligned.a[index] ?? null
    const second = aligned.b[index] ?? null
    return { period: aligned.periods[index] ?? '', a: first, b: second, difference: first !== null && second !== null ? first - second : null }
  }
  const reading = active === null ? null : readingAt(active)
  const spoken = (index: number) => {
    const at = readingAt(index)
    return [
      at.period,
      `${a.label} ${at.a === null ? '—' : formatHubNumber(at.a)}`,
      `${b.label} ${at.b === null ? '—' : formatHubNumber(at.b)}`,
      gap && at.difference !== null ? `${gap.label} ${formatHubSigned(at.difference)}` : null,
    ]
      .filter(Boolean)
      .join(', ')
  }
  const recede = (series: 'a' | 'b') => highlight !== undefined && highlight !== series && 'opacity-30'
  const dot = (series: 'a' | 'b', index: number) => {
    const value = series === 'a' ? aligned.a[index] : aligned.b[index]
    if (value === null || value === undefined) return null
    return (
      <span
        key={`${series}-${index}`}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition-opacity',
          series === 'a' ? 'bg-primary' : 'bg-muted-foreground',
          recede(series),
        )}
        style={{ left: `${xAt(index)}%`, top: `${yAt(value)}%` }}
      />
    )
  }

  return (
    <figure>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className={cn('flex items-center gap-1.5 transition-opacity', recede('a'))}>
          <span className="h-0.5 w-4 rounded-full bg-primary" aria-hidden="true" />
          {a.label}
        </span>
        <span className={cn('flex items-center gap-1.5 transition-opacity', recede('b'))}>
          <span className="h-0.5 w-4 rounded-full bg-muted-foreground" aria-hidden="true" />
          {b.label}
        </span>
        {gap && signs.has(-1) ? (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[2px] bg-foreground/10 ring-1 ring-inset ring-foreground/20" aria-hidden="true" />
            {gap.bAbove}
          </span>
        ) : null}
        {gap && signs.has(1) ? (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[2px] bg-primary/15 ring-1 ring-inset ring-primary/30" aria-hidden="true" />
            {gap.aAbove}
          </span>
        ) : null}
      </figcaption>

      <div className="mt-4 pl-14">
        <div
          ref={plotRef}
          tabIndex={0}
          role="slider"
          aria-label={t`${a.label} și ${b.label}, ${aligned.periods[0]}–${aligned.periods[count - 1]}`}
          aria-describedby={hintId}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={active ?? count - 1}
          aria-valuetext={spoken(active ?? count - 1)}
          className={cn(CHART_PLOT_CLASS, 'h-56 sm:h-64 lg:h-[22.5rem]')}
          {...handlers}
        >
          <span id={hintId} className="sr-only">
            {t`Săgețile stânga și dreapta trec de la un an la altul; Home și End duc la primul și la ultimul.`}
          </span>

          <ChartValueTicks ticks={scale.ticks} top={yAt} format={(tick) => formatHubNumber(tick)} />

          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="block size-full overflow-visible" aria-hidden="true">
            <ChartGridLines ticks={scale.ticks} top={yAt} />
            {regions.map((region, index) => (
              <path
                key={index}
                d={
                  region.polygon
                    .map(([x, value], point) => `${point === 0 ? 'M' : 'L'}${toXY(x, value)}`)
                    .join(' ') + 'Z'
                }
                className={region.sign < 0 ? 'fill-foreground/10' : 'fill-primary/15'}
              />
            ))}
            <path
              d={toPath(aligned.b)}
              fill="none"
              className={cn('stroke-muted-foreground transition-opacity', recede('b'))}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={toPath(aligned.a)}
              fill="none"
              className={cn('stroke-primary transition-opacity', recede('a'))}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {active === null ? (
            // At rest, the latest point of each line.
            <>
              {dot('a', count - 1)}
              {dot('b', count - 1)}
            </>
          ) : (
            <>
              <ChartRule left={xAt(active)} />
              {dot('b', active)}
              {dot('a', active)}
              {reading ? (
                <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft}>
                  <MonoLabel className="block text-muted-foreground">{reading.period}</MonoLabel>
                  <dl className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
                    <dt className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-primary" />
                      {a.label}
                    </dt>
                    <dd className="text-right font-medium tabular-nums">{reading.a === null ? '—' : formatHubNumber(reading.a)}</dd>
                    <dt className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-muted-foreground" />
                      {b.label}
                    </dt>
                    <dd className="text-right font-medium tabular-nums">{reading.b === null ? '—' : formatHubNumber(reading.b)}</dd>
                    {gap && reading.difference !== null ? (
                      <>
                        <dt className="mt-1 border-t pt-1 text-muted-foreground">{gap.label}</dt>
                        <dd className="mt-1 border-t pt-1 text-right font-medium tabular-nums">{formatHubSigned(reading.difference)}</dd>
                      </>
                    ) : null}
                  </dl>
                </ChartTooltip>
              ) : null}
            </>
          )}
        </div>

        <ChartPeriodAxis periods={aligned.periods} ticks={yearTickIndices(aligned.periods)} left={xAt} active={active} />
      </div>
    </figure>
  )
}
