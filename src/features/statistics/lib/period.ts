import { t } from '@lingui/core/macro'
import type { InsObservation, InsTimePeriod } from '@/schemas/ins'

/**
 * Period helpers for the statistics surface.
 *
 * Freshness/provenance is derived ONLY from data-period metadata
 * (`latestPeriod`, `iso_period`, `year`). We deliberately do NOT invent
 * `synced_at` / `last_updated` source fields — the "data-through" label is
 * the most recent observation period the dataset reports.
 */

/**
 * Sort key for a time period: `year * 10000 + quarter * 100 + month`.
 * Higher = more recent. Null month/quarter are treated as 0 so annual
 * periods sort before same-year sub-annual periods would if present.
 */
export function periodSortKey(period: InsTimePeriod): number {
  return (
    period.year * 10000 + (period.quarter ?? 0) * 100 + (period.month ?? 0)
  )
}

/**
 * Returns the most recent `InsTimePeriod` from a list of observations, or
 * `null` when there are none.
 */
export function getLatestTimePeriod(
  observations: readonly InsObservation[],
): InsTimePeriod | null {
  let latest: InsTimePeriod | null = null
  let latestKey = Number.NEGATIVE_INFINITY

  for (const observation of observations) {
    const key = periodSortKey(observation.time_period)
    if (key > latestKey) {
      latestKey = key
      latest = observation.time_period
    }
  }

  return latest
}

/**
 * Resolves the latest data-through period for a dataset group.
 *
 * Prefers an explicit `latestPeriod` (from `InsUatDatasetGroup.latestPeriod`);
 * falls back to scanning the observations. Returns `null` when no period is
 * available.
 */
export function resolveLatestPeriod(params: {
  readonly latestPeriod?: string | null
  readonly observations: readonly InsObservation[]
}): string | null {
  // Defensive: the live wire once delivered a structured object here (the
  // `period.trim` crash class). Until every lane Zod-parses its payload,
  // a non-string falls through to the observations instead of crashing.
  if (
    typeof params.latestPeriod === 'string' &&
    params.latestPeriod.trim().length > 0
  ) {
    return params.latestPeriod
  }

  const latest = getLatestTimePeriod(params.observations)
  return latest?.iso_period ?? null
}

/** Extracts the latest observation year from a list, or `null`. */
export function getLatestYear(
  observations: readonly InsObservation[],
): number | null {
  return getLatestTimePeriod(observations)?.year ?? null
}

/**
 * Romanian "data-through" label built from a period only.
 *
 * - Annual `"2024"` → `"Date până în 2024"`.
 * - Quarterly `"2024-Q1"` → `"Date până în T1 2024"`.
 * - Monthly `"2024-03"` → `"Date până în martie 2024"`.
 *
 * No invented sync timestamps are emitted.
 */
export function buildDataThroughLabel(period: string | null): string | null {
  if (!period || period.trim().length === 0) {
    return null
  }

  const trimmed = period.trim()

  const yearMatch = /^(\d{4})$/.exec(trimmed)
  if (yearMatch) {
    return t`Date până în ${yearMatch[1]}`
  }

  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(trimmed)
  if (quarterMatch) {
    return t`Date până în T${quarterMatch[2]} ${quarterMatch[1]}`
  }

  const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(trimmed)
  if (monthMatch) {
    const monthNames = [
      t`ianuarie`,
      t`februarie`,
      t`martie`,
      t`aprilie`,
      t`mai`,
      t`iunie`,
      t`iulie`,
      t`august`,
      t`septembrie`,
      t`octombrie`,
      t`noiembrie`,
      t`decembrie`,
    ]
    const monthIndex = Number.parseInt(monthMatch[2], 10) - 1
    return t`Date până în ${monthNames[monthIndex]} ${monthMatch[1]}`
  }

  return t`Date până în ${trimmed}`
}

/**
 * Cadence-aware staleness thresholds. A period's own grammar carries its
 * cadence (`2024` / `2024-Q1` / `2024-03`), so no dataset metadata is needed.
 *
 * Annual INS matrices normally publish with a 1–2 year lag, so in 2026 a 2023
 * or 2024 figure is CURRENT, not stale. Thresholds measured against the
 * 2026-08 frozen snapshot; re-validate when the corpus is reloaded.
 */
export const ANNUAL_STALE_AFTER_YEARS = 3
export const QUARTERLY_STALE_AFTER_MONTHS = 12
export const MONTHLY_STALE_AFTER_MONTHS = 6

/**
 * Cadence-aware "possibly outdated" hint derived ONLY from the latest data
 * period vs. a reference date (defaults to today). This is a UX hint from the
 * data period, never a provenance claim — absence labels stay separate.
 */
export function isPeriodStale(params: {
  readonly latestPeriod: string | null
  readonly referenceDate?: Date
}): boolean {
  const { latestPeriod } = params
  if (!latestPeriod) return false

  const trimmed = latestPeriod.trim()
  const reference = params.referenceDate ?? new Date()
  const referenceMonths = reference.getFullYear() * 12 + reference.getMonth() + 1

  const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(trimmed)
  if (monthMatch) {
    const months =
      Number.parseInt(monthMatch[1], 10) * 12 + Number.parseInt(monthMatch[2], 10)
    return referenceMonths - months > MONTHLY_STALE_AFTER_MONTHS
  }

  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(trimmed)
  if (quarterMatch) {
    const months =
      Number.parseInt(quarterMatch[1], 10) * 12 +
      Number.parseInt(quarterMatch[2], 10) * 3
    return referenceMonths - months > QUARTERLY_STALE_AFTER_MONTHS
  }

  const yearMatch = /^(\d{4})$/.exec(trimmed)
  if (yearMatch) {
    const year = Number.parseInt(yearMatch[1], 10)
    return reference.getFullYear() - year > ANNUAL_STALE_AFTER_YEARS
  }

  // Unrecognized grammar: never invent staleness.
  return false
}
