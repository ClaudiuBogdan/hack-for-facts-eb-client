import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { useChartReading } from '../hooks/use-chart-reading'
import { CHART_HEIGHT, CHART_PLOT_CLASS, CHART_WIDTH, niceScale, opensYear, periodTickIndices } from '../lib/hub-chart'
import { formatChartPeriod, formatHubPeriod } from '../lib/hub-format'
import { ChartGridLines, ChartPeriodAxis, ChartRule, ChartTooltip, ChartValueTicks } from './hub/hub-chart-parts'

export interface ComparisonChartLine {
  readonly code: string
  readonly label: string
  /** A CSS colour: the territory's slot in the comparison palette. */
  readonly color: string
  /** One per period; null where the territory has no number. */
  readonly values: readonly (number | null)[]
}

/**
 * Up to six territories on one period axis, drawn like the hub's chart:
 * round value ticks, the years under it, and a reading at the period
 * pointed at — a rule, a dot on each line and a tooltip with every
 * territory's figure there, highest first. A gap in a line stays a gap.
 *
 * In `zero` mode (change since the window's start) the axis always holds 0
 * and its gridline is drawn darker: above it grew, below it shrank.
 */
export function ComparisonLinesChart({
  label,
  periods,
  lines,
  format,
  formatTick,
  zero = false,
  highlight,
}: {
  /** What the chart shows, for its accessible name. */
  readonly label: string
  readonly periods: readonly string[]
  readonly lines: readonly ComparisonChartLine[]
  readonly format: (value: number) => string
  readonly formatTick: (value: number) => string
  readonly zero?: boolean
  /** A territory to bring forward; the rest recede. */
  readonly highlight?: string
}) {
  const count = periods.length
  const numbers = lines.flatMap((line) => line.values.filter((value): value is number => value !== null))
  const bounds = zero ? [...numbers, 0] : numbers
  const scale = niceScale(Math.min(...bounds), Math.max(...bounds))
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useChartReading(count)
  const hintId = useId()

  if (count < 2 || numbers.length === 0) return null

  const xAt = (index: number) => (index / (count - 1)) * 100
  const yAt = (value: number) => (1 - (value - scale.from) / (scale.to - scale.from)) * 100
  const toXY = (index: number, value: number) =>
    `${((xAt(index) * CHART_WIDTH) / 100).toFixed(1)},${((yAt(value) * CHART_HEIGHT) / 100).toFixed(1)}`
  const toPath = (values: readonly (number | null)[]) =>
    values.map((value, index) => (value === null ? '' : `${index === 0 || values[index - 1] === null ? 'M' : 'L'}${toXY(index, value)}`)).join(' ')
  const recedes = (code: string) => highlight !== undefined && highlight !== code

  /** The lines with a figure at `index`, highest first. */
  const readingAt = (index: number) =>
    lines
      .map((line) => ({ line, value: line.values[index] ?? null }))
      .sort((a, b) => (a.value === null || b.value === null ? Number(a.value === null) - Number(b.value === null) : b.value - a.value))
  const spoken = (index: number) =>
    [formatHubPeriod(periods[index] ?? ''), ...readingAt(index).map(({ line, value }) => `${line.label} ${value === null ? '—' : format(value)}`)].join(', ')
  const dot = (line: ComparisonChartLine, index: number) => {
    const value = line.values[index] ?? null
    if (value === null) return null
    return (
      <span
        key={`${line.code}-${index}`}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition-opacity',
          recedes(line.code) && 'opacity-25',
        )}
        style={{ left: `${xAt(index)}%`, top: `${yAt(value)}%`, backgroundColor: line.color }}
      />
    )
  }
  /**
   * At rest, where each line ends — and every point a gap leaves alone on
   * both sides, which draws no line and would otherwise not show at all.
   */
  const restingPoints = (line: ComparisonChartLine) =>
    line.values.flatMap((value, index) => {
      if (value === null) return []
      const alone = (line.values[index - 1] ?? null) === null && (line.values[index + 1] ?? null) === null
      const last = line.values.slice(index + 1).every((next) => next === null)
      return alone || last ? [index] : []
    })

  return (
    <figure className="pl-14">
      <div
        ref={plotRef}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-describedby={hintId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={active ?? count - 1}
        aria-valuetext={spoken(active ?? count - 1)}
        className={cn(CHART_PLOT_CLASS, 'h-56 sm:h-72')}
        {...handlers}
      >
        <span id={hintId} className="sr-only">
          {t`Săgețile stânga și dreapta trec de la o perioadă la alta; Home și End duc la prima și la ultima.`}
        </span>

        <ChartValueTicks ticks={scale.ticks} top={yAt} format={formatTick} />

        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="block size-full overflow-visible" aria-hidden="true">
          <ChartGridLines ticks={scale.ticks} top={yAt} emphasis={zero ? 0 : undefined} />
          {lines.map((line) => (
            <path
              key={line.code}
              d={toPath(line.values)}
              fill="none"
              stroke={line.color}
              className={cn('transition-opacity', recedes(line.code) && 'opacity-25')}
              strokeWidth={highlight === line.code ? 3 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {active === null ? (
          lines.flatMap((line) => restingPoints(line).map((index) => dot(line, index)))
        ) : (
          <>
            <ChartRule left={xAt(active)} />
            {lines.map((line) => dot(line, active))}
            <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft}>
              <MonoLabel className="block text-muted-foreground">{formatHubPeriod(periods[active] ?? '')}</MonoLabel>
              <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1">
                {readingAt(active).map(({ line, value }) => (
                  <div key={line.code} className="contents">
                    <dt className="flex min-w-0 items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
                      <span className="truncate">{line.label}</span>
                    </dt>
                    <dd className={cn('text-right tabular-nums', value === null ? 'text-muted-foreground' : 'font-medium')}>
                      {value === null ? '—' : format(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </ChartTooltip>
          </>
        )}
      </div>

      <ChartPeriodAxis
        periods={periods}
        ticks={periodTickIndices(periods)}
        left={xAt}
        active={active}
        label={(period) => (/^\d{4}$/.test(period) ? period : opensYear(period) ? period.slice(0, 4) : formatChartPeriod(period))}
      />
    </figure>
  )
}
