import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { activeNumberLocale } from '../../lib/format'
import { formatHubPeriod } from '../../lib/period'
import { buildSparklinePaths, type SparklinePoints } from '../../lib/territory-sparkline'
import { parseWireDecimal } from '../../lib/value-status'

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
  const paths = buildSparklinePaths(points, width, height)
  if (paths.length === 0) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        <Trans>Serie prea scurtă pentru grafic</Trans>
      </span>
    )
  }
  const first = formatHubPeriod(points[0]?.[0].iso_period ?? '')
  const last = formatHubPeriod(points[points.length - 1]?.[0].iso_period ?? '')
  const numeric = points
    .map(([, value]) => parseWireDecimal(value))
    .filter((value): value is number => value !== null)
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
