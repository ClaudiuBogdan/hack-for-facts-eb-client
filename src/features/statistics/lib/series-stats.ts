import type { InsObservation } from '@/schemas/ins'
import { parseWireDecimal } from './value-status'

/**
 * The summary facts shown beside the tier-0 figure: where the series has been,
 * not just where it ended.
 *
 * „10" alone says nothing. The same 10 is the lowest a series has ever gone or
 * a routine year, and the page cannot tell the reader which without the
 * extremes and the mean beside it.
 */

/** One end of the series, or one of its extremes. */
export interface SeriesPoint {
  readonly value: number
  /** The wire value, verbatim — never re-rounded for display. */
  readonly raw: string
  readonly period: string
}

export interface SeriesStats {
  /** USABLE observations, never the row count. */
  readonly count: number
  readonly first: SeriesPoint | null
  readonly latest: SeriesPoint | null
  readonly peak: SeriesPoint | null
  readonly trough: SeriesPoint | null
  readonly mean: number | null
}

const EMPTY: SeriesStats = {
  count: 0,
  first: null,
  latest: null,
  peak: null,
  trough: null,
  mean: null,
}

/**
 * One point, parsed EXACTLY as the chart parses it.
 *
 * `parseWireDecimal` is the chart's own reader, and reusing it is the point:
 * `Number.parseFloat('0oops')` is `0`, so a summary built on `parseFloat` would
 * report a new minimum for a row the figure below it draws as a gap. The
 * summary and the figure must never disagree about what a value is.
 */
function toPoint(row: InsObservation): SeriesPoint | null {
  const raw = row.value
  if (raw === null) return null
  const value = parseWireDecimal(raw)
  if (value === null) return null
  return { value, raw, period: row.time_period.iso_period }
}

/**
 * Summarizes observations that are ALREADY sorted oldest-first and already
 * filtered to one cell — this function does no selecting of its own.
 */
export function summarizeSeries(
  rows: readonly InsObservation[],
): SeriesStats {
  const points = rows
    .map(toPoint)
    .filter((point): point is SeriesPoint => point !== null)
  if (points.length === 0) return EMPTY

  let peak = points[0]!
  let trough = points[0]!
  let sum = 0
  for (const point of points) {
    if (point.value > peak.value) peak = point
    if (point.value < trough.value) trough = point
    sum += point.value
  }

  return {
    count: points.length,
    first: points[0]!,
    latest: points[points.length - 1]!,
    peak,
    trough,
    // A sum can overflow where every term was finite; an „∞" mean is not a fact.
    mean: Number.isFinite(sum) ? sum / points.length : null,
  }
}
