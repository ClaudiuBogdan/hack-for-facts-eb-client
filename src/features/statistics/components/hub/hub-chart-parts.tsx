import type { ReactNode, Ref } from 'react'
import { cn } from '@/lib/utils'
import { CHART_HEIGHT, CHART_WIDTH } from '../../lib/hub-chart'

/**
 * The pieces every period chart of the INS pages draws the same way: the
 * value ticks in the gutter, the gridlines, the period axis, the rule and
 * the tooltip box. The plot is an inline SVG stretched to its frame
 * (`preserveAspectRatio="none"`, so lines keep one stroke with
 * `vector-effect`); every text is HTML over it, so it reads at any width.
 */

/** Value ticks in the plot's left gutter, at `top` percent. */
export function ChartValueTicks({
  ticks,
  top,
  format,
}: {
  readonly ticks: readonly number[]
  readonly top: (value: number) => number
  readonly format: (value: number) => string
}) {
  return ticks.map((tick) => (
    <span
      key={tick}
      aria-hidden="true"
      className="pointer-events-none absolute right-full -translate-y-1/2 pr-3 font-mono text-[10px] tabular-nums text-muted-foreground"
      style={{ top: `${top(tick)}%` }}
    >
      {format(tick)}
    </span>
  ))
}

/** One gridline per tick, drawn inside the plot's SVG; `emphasis` darkens one (a zero line). */
export function ChartGridLines({
  ticks,
  top,
  emphasis,
}: {
  readonly ticks: readonly number[]
  readonly top: (value: number) => number
  readonly emphasis?: number
}) {
  return ticks.map((tick) => (
    <line
      key={tick}
      x1={0}
      x2={CHART_WIDTH}
      y1={(top(tick) * CHART_HEIGHT) / 100}
      y2={(top(tick) * CHART_HEIGHT) / 100}
      className={tick === emphasis ? 'stroke-foreground/40' : 'stroke-border'}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
    />
  ))
}

/** The period labels under the plot, the active one in the foreground. */
export function ChartPeriodAxis({
  periods,
  ticks,
  left,
  active,
  label = (period) => period,
}: {
  readonly periods: readonly string[]
  readonly ticks: readonly number[]
  readonly left: (index: number) => number
  readonly active: number | null
  readonly label?: (period: string) => string
}) {
  const count = periods.length
  return (
    <div className="relative mt-2 h-4" aria-hidden="true">
      {ticks.map((index, position) => (
        <span
          key={index}
          className={cn(
            'absolute top-0 whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground',
            position === 0 ? 'translate-x-0' : position === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
            // A phone's axis has room for a decade only well clear of either end („2020" beside „2025").
            position > 0 && position < ticks.length - 1 && Math.min(index, count - 1 - index) < Math.max(8, (count - 1) * 0.15) && 'max-sm:hidden',
            active === index && 'text-foreground',
          )}
          style={{ left: `${left(index)}%` }}
        >
          {label(periods[index] ?? '')}
        </span>
      ))}
    </div>
  )
}

/** The vertical rule at the period being read. */
export function ChartRule({ left }: { readonly left: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-foreground/50"
      style={{ left: `${left}%` }}
    />
  )
}

/** The reading's box, positioned by `useChartReading`. */
export function ChartTooltip({
  tooltipRef,
  left,
  children,
}: {
  readonly tooltipRef: Ref<HTMLDivElement>
  readonly left: number
  readonly children: ReactNode
}) {
  return (
    <div
      ref={tooltipRef}
      aria-hidden="true"
      data-chart-tooltip
      // Its own width: near an edge an absolute box would shrink to the space left and wrap.
      className="pointer-events-none absolute top-0 z-10 w-max min-w-44 max-w-72 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      style={{ left }}
    >
      {children}
    </div>
  )
}
