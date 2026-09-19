import type { InsObservation, InsPeriodicity } from '@/schemas/ins'
import { CHART_MAX_POINTS } from './dataset-selection'

/**
 * Turns INS observations into a chart-ready series.
 *
 * Two rules the rest of the module depends on:
 *
 * 1. **A gap stays a gap.** Every period in the requested window gets a point;
 *    periods INS never published carry `value: null`. Recharts draws those as
 *    breaks (`connectNulls={false}`), so a missing 2019 never becomes a line
 *    segment between 2018 and 2020.
 * 2. **Values are Decimal strings on the wire** and only become numbers here,
 *    for pixel positions. `Number()` of an unparseable value yields `NaN`,
 *    which we normalize to `null` — an unreadable value is a gap, not a zero.
 */

export interface TimeSeriesPoint {
  readonly period: string
  /** The plotted coordinate. `null` is a gap, never a zero. */
  readonly value: number | null
  /** The wire value, verbatim — what the tooltip prints, unrounded. */
  readonly raw: string | null
  /** INS quality flag (provisional, estimated, …). `null` for plain values. */
  readonly valueStatus: string | null
}

export interface TimeSeries {
  readonly points: readonly TimeSeriesPoint[]
  /** True when older periods were dropped to respect the point cap. */
  readonly truncated: boolean
}

const QUARTERS = [1, 2, 3, 4] as const

/**
 * Every ISO period between two years, inclusive, at the given periodicity.
 * `2024-Q1` for quarters, `2024-03` for months, `2024` for years.
 */
export function enumeratePeriods(params: {
  readonly from: number
  readonly to: number
  readonly periodicity: InsPeriodicity
}): readonly string[] {
  const { from, to, periodicity } = params
  if (to < from) return []

  const periods: string[] = []
  for (let year = from; year <= to; year += 1) {
    if (periodicity === 'ANNUAL') {
      periods.push(`${year}`)
      continue
    }

    if (periodicity === 'QUARTERLY') {
      for (const quarter of QUARTERS) {
        periods.push(`${year}-Q${quarter}`)
      }
      continue
    }

    for (let month = 1; month <= 12; month += 1) {
      periods.push(`${year}-${String(month).padStart(2, '0')}`)
    }
  }

  return periods
}

/**
 * Parses a wire value into a chart coordinate. Anything that isn't a finite
 * number — `null`, `''`, `'..'`, `':'` (INS's own missing-value markers) —
 * becomes `null`.
 */
export function toChartValue(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null

  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Builds the series for `[from, to]` at `periodicity`, injecting `null` for
 * every period the observations don't cover.
 *
 * When the window enumerates more than `maxPoints` periods the **most recent**
 * ones win: a 1992–2024 monthly dataset should open on the recent past, not on
 * 1992. The caller surfaces `truncated` so the user knows the window was cut.
 */
export function buildTimeSeries(params: {
  readonly observations: readonly InsObservation[]
  readonly periodicity: InsPeriodicity
  readonly from: number
  readonly to: number
  readonly maxPoints?: number
}): TimeSeries {
  const maxPoints = params.maxPoints ?? CHART_MAX_POINTS

  const observed = new Map<string, InsObservation>()
  for (const observation of params.observations) {
    if (observation.time_period.periodicity !== params.periodicity) continue
    observed.set(observation.time_period.iso_period, observation)
  }

  const allPeriods = enumeratePeriods({
    from: params.from,
    to: params.to,
    periodicity: params.periodicity,
  })

  const truncated = allPeriods.length > maxPoints
  const periods = truncated ? allPeriods.slice(-maxPoints) : allPeriods

  const points = periods.map<TimeSeriesPoint>((period) => {
    const observation = observed.get(period)
    return {
      period,
      value: toChartValue(observation?.value),
      raw: observation?.value ?? null,
      valueStatus: observation?.value_status?.trim() || null,
    }
  })

  return { points, truncated }
}

/** True when at least one point carries data — an all-gap series charts nothing. */
export function hasAnyValue(series: TimeSeries): boolean {
  return series.points.some((point) => point.value !== null)
}

/**
 * Below this, the series reaches far enough toward zero that a zero baseline
 * still shows the shape, and zero is the honest floor. Above it, the series
 * varies by less than half its own magnitude and a zero baseline spends most
 * of the plot on empty space — Romania's population falling 23,2M → 21,6M
 * drew as a flat stripe across the top, which is the one reading of that
 * series that is false.
 */
const ZERO_BASELINE_BELOW_RATIO = 0.5

/**
 * And below THIS the series is flat and a zero baseline says so honestly.
 * Padding a window around a range that spans a thousandth of its own
 * magnitude magnifies rounding into a trend: the plot would climb and fall
 * dramatically while every gridline it is measured against rounds to the same
 * label. A series that moved 0,5% moved 0,5%, and the chart should show that.
 */
const MIN_RELATIVE_SPAN = 0.01

/** A round step near `raw`, so the axis lands on 1/2/5 × 10ⁿ ticks. */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return Number.NaN
  const exponent = Math.floor(Math.log10(raw))
  const base = 10 ** exponent
  const normalized = raw / base
  const multiple =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return multiple * base
}

/** More gridlines than this is chartjunk, and an unbounded count is a hang. */
const MAX_TICKS = 12

/**
 * The y axis for a series.
 *
 * `[0, auto]` whenever the data comes near zero or crosses it; otherwise a
 * padded window around the observed range with its own explicit ticks. The
 * ticks have to be explicit: given only a domain, Recharts divides it into
 * four equal parts, which turns a clean 21–23,5 mil. window into
 * 21 / 21,6 / 22,3 / 22,9 / 23,5. Stepping the ticks ourselves keeps every
 * label a round number, so a baseline that is not zero still reads as a
 * number rather than as a mystery.
 *
 * Every arithmetic result is checked before it is used. This runs during
 * render, on both the server and the client, so a value INS could in
 * principle publish — 1e308, or a subnormal that underflows the step to zero
 * — must degrade to the zero baseline, never to `NaN` bounds or to a loop
 * that does not end. The domain is read back off the ticks so the two can
 * never disagree.
 */
export function seriesAxis(points: readonly TimeSeriesPoint[]): {
  readonly domain: [number, 'auto'] | [number, number]
  readonly ticks?: readonly number[]
} {
  const zeroBaseline: { domain: [number, 'auto'] } = { domain: [0, 'auto'] }

  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null && Number.isFinite(value))
  if (values.length === 0) return zeroBaseline

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min <= 0 || max <= 0) return zeroBaseline
  if (min / max < ZERO_BASELINE_BELOW_RATIO) return zeroBaseline

  const span = max - min
  if (span / max < MIN_RELATIVE_SPAN) return zeroBaseline

  const padding = span * 0.15
  const step = niceStep((span + 2 * padding) / 4)
  if (!Number.isFinite(step) || step <= 0) return zeroBaseline

  const lower = Math.max(0, Math.floor((min - padding) / step) * step)
  const upper = Math.ceil((max + padding) / step) * step
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower)
    return zeroBaseline

  const count = Math.round((upper - lower) / step)
  if (!Number.isFinite(count) || count < 1 || count > MAX_TICKS)
    return zeroBaseline

  // Floating-point steps drift, so every tick is computed from its index.
  const ticks: number[] = []
  for (let index = 0; index <= count; index += 1) {
    ticks.push(lower + index * step)
  }

  return { domain: [ticks[0]!, ticks[ticks.length - 1]!], ticks }
}
