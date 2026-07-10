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
