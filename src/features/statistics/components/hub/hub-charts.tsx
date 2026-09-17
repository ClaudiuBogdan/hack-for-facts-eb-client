import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { StatisticsHubSeriesPoint } from '@/schemas/statistics'
import { alignSeriesByPeriod, formatHubNumber } from '../../lib/hub-format'

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

/** Two national series on one period axis. Inline SVG; legend and axis are HTML, so they read at any width. */
export function HubTwoLineChart({
  a,
  b,
}: {
  readonly a: { readonly label: string; readonly points: readonly StatisticsHubSeriesPoint[] }
  readonly b: { readonly label: string; readonly points: readonly StatisticsHubSeriesPoint[] }
}) {
  const width = 640
  const height = 200
  const pad = 4
  const aligned = alignSeriesByPeriod(a.points, b.points)
  const all = [...aligned.a, ...aligned.b].filter((value): value is number => value !== null)
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const steps = Math.max(aligned.periods.length - 1, 1)
  // A run breaks at a null: a period one series lacks is a gap in its line.
  const toPath = (values: readonly (number | null)[]) =>
    values
      .map((value, index) => {
        if (value === null) return null
        const x = pad + (index / steps) * (width - pad * 2)
        const y = pad + (1 - (value - min) / span) * (height - pad * 2)
        return { x, y, start: index === 0 || values[index - 1] === null }
      })
      .map((point) => (point ? `${point.start ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}` : ''))
      .join(' ')
  const firstPeriod = aligned.periods[0]
  const lastPeriod = aligned.periods[aligned.periods.length - 1]
  const aLast = a.points[a.points.length - 1]
  const bLast = b.points[b.points.length - 1]

  return (
    <figure>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-primary" aria-hidden="true" />
          {a.label}
          {aLast ? (
            <span className="tabular-nums text-foreground">
              {formatHubNumber(aLast.value)} <span className="text-muted-foreground">({aLast.period})</span>
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-muted-foreground" aria-hidden="true" />
          {b.label}
          {bLast ? (
            <span className="tabular-nums text-foreground">
              {formatHubNumber(bLast.value)} <span className="text-muted-foreground">({bLast.period})</span>
            </span>
          ) : null}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-auto w-full overflow-visible"
        role="img"
        aria-label={t`${a.label} și ${b.label}, ${firstPeriod}–${lastPeriod}`}
      >
        <path d={toPath(aligned.b)} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={toPath(aligned.a)} fill="none" stroke="currentColor" className="text-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{firstPeriod}</span>
        <span>{lastPeriod}</span>
      </div>
    </figure>
  )
}
