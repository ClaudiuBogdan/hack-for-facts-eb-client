import type { InsTimePeriod } from '@/schemas/ins'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { parseWireDecimal } from './value-status'

/** Chronological points; a `null` value is a gap INS published as one. */
export type SparklinePoints = readonly (readonly [InsTimePeriod, string | null])[]

/**
 * The line's points: the tile's cells at the cadence its headline value
 * has, oldest first — the cells of another cadence are kept as cells and
 * never mixed into the line. No cadence, no points.
 */
export function tileSparklinePoints(tile: StatisticsIndicatorTile): SparklinePoints {
  if (tile.sparklineCadence === null) return []
  return tile.observations
    .filter((row) => row.time_period.periodicity === tile.sparklineCadence)
    .map((row) => [row.time_period, row.value] as const)
}

function periodSequence(period: InsTimePeriod) {
  if (period.periodicity === 'MONTHLY' && period.month) return period.year * 12 + period.month - 1
  if (period.periodicity === 'QUARTERLY' && period.quarter) return period.year * 4 + period.quarter - 1
  return period.year
}

/**
 * One path per unbroken run. A missing period, or a `null` value, ends the
 * run and starts another, so a gap INS never published is a gap in the
 * line — never a bridge drawn across it. Fewer than two readable points is
 * no line at all.
 */
export function buildSparklinePaths(points: SparklinePoints, width: number, height: number): readonly string[] {
  const numeric = points
    .map(([, value]) => parseWireDecimal(value))
    .filter((value): value is number => value !== null)
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
    const parsed = parseWireDecimal(value)
    const gap = previous !== null && sequence - previous > 1
    if (parsed === null || gap) {
      if (current.length > 1) paths.push(current.join(' '))
      current = []
    }
    if (parsed !== null) {
      const x = pad + (points.length === 1 ? 0 : (index / (points.length - 1)) * (width - pad * 2))
      const y = pad + (1 - (parsed - min) / range) * (height - pad * 2)
      current.push(`${current.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    }
    previous = sequence
  })
  if (current.length > 1) paths.push(current.join(' '))
  return paths
}
