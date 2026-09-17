import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { cn } from '@/lib/utils'
import { activeNumberLocale } from '../lib/format'

type SparklinePoints = StatisticsIndicatorTile['sparkline']

function periodSequence(period: SparklinePoints[number][0]) {
  if (period.periodicity === 'MONTHLY' && period.month) return period.year * 12 + period.month - 1
  if (period.periodicity === 'QUARTERLY' && period.quarter) return period.year * 4 + period.quarter - 1
  return period.year
}

/**
 * One path per unbroken run. A missing period, or a `null` value, ends the
 * run and starts another, so a gap INS never published is a gap in the
 * line — never a bridge drawn across it.
 */
function buildPaths(points: SparklinePoints, width: number, height: number): readonly string[] {
  const numeric = points
    .map(([, value]) => (value === null ? null : Number(value.replace(',', '.'))))
    .filter((value): value is number => Number.isFinite(value))
  if (numeric.length < 2) return []
  const min = Math.min(...numeric)
  const max = Math.max(...numeric)
  const range = max - min || 1
  const pad = 2
  const paths: string[] = []
  let current: string[] = []
  let previous: number | null = null
  points.forEach(([period, value], index) => {
    const sequence = periodSequence(period)
    const parsed = value === null ? Number.NaN : Number(value.replace(',', '.'))
    const gap = previous !== null && sequence - previous > 1
    if (!Number.isFinite(parsed) || gap) {
      if (current.length > 1) paths.push(current.join(' '))
      current = []
    }
    if (Number.isFinite(parsed)) {
      const x = pad + (points.length === 1 ? 0 : (index / (points.length - 1)) * (width - pad * 2))
      const y = pad + (1 - (parsed - min) / range) * (height - pad * 2)
      current.push(`${current.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    }
    previous = sequence
  })
  if (current.length > 1) paths.push(current.join(' '))
  return paths
}

/**
 * A territory indicator's history as a small line, decorative beside the
 * value that is the reading. Too short a series says so in words.
 */
export function TerritorySparkline({
  points,
  width = 96,
  height = 24,
  className,
}: {
  readonly points: SparklinePoints
  readonly width?: number
  readonly height?: number
  readonly className?: string
}) {
  const paths = buildPaths(points, width, height)
  if (paths.length === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        <Trans>Serie prea scurtă pentru grafic</Trans>
      </span>
    )
  }
  const first = points[0]?.[0].iso_period ?? ''
  const last = points[points.length - 1]?.[0].iso_period ?? ''
  const numeric = points
    .map(([, value]) => (value === null ? null : Number(value.replace(',', '.'))))
    .filter((value): value is number => Number.isFinite(value))
  const compact = new Intl.NumberFormat(activeNumberLocale(), { notation: 'compact', maximumFractionDigits: 1 })
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={t`Evoluție de la ${first} până în ${last}, între ${compact.format(Math.min(...numeric))} și ${compact.format(Math.max(...numeric))}`}
      className={cn('shrink-0 overflow-visible text-primary', className)}
    >
      <title>{`${first} – ${last}`}</title>
      {paths.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  )
}
