/**
 * Pure geometry + labelling helpers for the member vote-activity heatmap
 * (GitHub-style calendar grid). No React, no I/O — unit-tested directly.
 *
 * The grid is Monday-first: 7 rows (Luni…Duminică) × N week-columns. It spans
 * from the Monday on/before Jan 1 to the Sunday on/after Dec 31 of `year`, so
 * every column is a full week; cells outside the year are `inYear: false`
 * placeholders that keep the weekday rows aligned.
 *
 * Dates are built in UTC and formatted as `YYYY-MM-DD` to stay stable across
 * timezones/DST (the server's day keys are plain calendar dates).
 */

/** One day cell of the grid. */
export interface VoteActivityGridCell {
  /** `YYYY-MM-DD`. */
  readonly isoDate: string
  /** False for the leading/trailing pad days outside `year`. */
  readonly inYear: boolean
}

/** A week column (7 cells, Monday…Sunday). */
export interface VoteActivityGridWeek {
  readonly days: readonly VoteActivityGridCell[]
}

/** A month label anchored to the column that holds the 1st of that month. */
export interface VoteActivityMonthLabel {
  readonly columnIndex: number
  /** 0–11. */
  readonly month: number
  readonly label: string
}

export interface VoteActivityGrid {
  readonly weeks: readonly VoteActivityGridWeek[]
  readonly monthLabels: readonly VoteActivityMonthLabel[]
}

/** Romanian month abbreviations (index 0 = ianuarie). */
export const RO_MONTHS_SHORT = [
  'ian.',
  'feb.',
  'mar.',
  'apr.',
  'mai',
  'iun.',
  'iul.',
  'aug.',
  'sep.',
  'oct.',
  'nov.',
  'dec.',
] as const

/**
 * Romanian weekday letters, Monday-first (index 0 = Luni). The heatmap shows
 * these sparsely (rows 0/2/4 → L / M / V), matching the GitHub convention.
 */
export const RO_WEEKDAY_LABELS = ['L', 'Ma', 'M', 'J', 'V', 'S', 'D'] as const

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function isoFromUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )}`
}

/** Monday-first weekday index (Mon = 0 … Sun = 6) for a UTC date. */
function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7
}

/**
 * Build the Monday-first calendar grid for ANY window of days, inclusive.
 *
 * The window generalises `buildYearGrid`, which is now a wrapper over it: a
 * rolling "last 12 months" spans two calendar years and cannot be drawn by a
 * builder that only knows about Januaries. The first column starts on the
 * Monday on/before `startIso`; the last ends on the Sunday on/after `endIso`;
 * cells outside the window are emitted as blanks so the weeks stay square.
 *
 * `inYear` reads "inside the window" — the field keeps its name because the
 * vote-activity chart and this heatmap both draw from it, and a rename buys
 * nothing but churn.
 */
export function buildWindowGrid({
  startIso,
  endIso,
}: {
  readonly startIso: string
  readonly endIso: string
}): VoteActivityGrid {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)

  const gridStart = new Date(start)
  gridStart.setUTCDate(start.getUTCDate() - mondayIndex(start))
  const gridEnd = new Date(end)
  gridEnd.setUTCDate(end.getUTCDate() + (6 - mondayIndex(end)))

  const weeks: VoteActivityGridWeek[] = []
  const monthLabels: VoteActivityMonthLabel[] = []
  // Keyed by YEAR-month, not month: a rolling window crosses a new year and
  // would otherwise label only the first December it meets.
  const seenMonths = new Set<string>()

  const cursor = new Date(gridStart)
  while (cursor.getTime() <= gridEnd.getTime()) {
    const days: VoteActivityGridCell[] = []
    for (let row = 0; row < 7; row++) {
      const inYear =
        cursor.getTime() >= start.getTime() && cursor.getTime() <= end.getTime()
      const month = cursor.getUTCMonth()
      const monthKey = `${String(cursor.getUTCFullYear())}-${String(month)}`
      // The column holding the FIRST in-window day of a month anchors its
      // label — the 1st itself may fall outside a rolling window's first month.
      if (inYear && !seenMonths.has(monthKey)) {
        seenMonths.add(monthKey)
        monthLabels.push({
          columnIndex: weeks.length,
          month,
          label: RO_MONTHS_SHORT[month],
        })
      }
      days.push({ isoDate: isoFromUtc(cursor), inYear })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    weeks.push({ days })
  }

  return { weeks, monthLabels }
}

/**
 * Build the Monday-first calendar grid for `year`. The first column starts on
 * the Monday on/before Jan 1; the last ends on the Sunday on/after Dec 31.
 */
export function buildYearGrid(year: number): VoteActivityGrid {
  return buildWindowGrid({
    startIso: isoFromUtc(new Date(Date.UTC(year, 0, 1))),
    endIso: isoFromUtc(new Date(Date.UTC(year, 11, 31))),
  })
}

/**
 * Bucket a day's vote count into an intensity level 0–4 (fixed thresholds):
 *   0 = none · 1 = 1–9 · 2 = 10–29 · 3 = 30–99 · 4 = 100+.
 */
export function bucketFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count < 10) return 1
  if (count < 30) return 2
  if (count < 100) return 3
  return 4
}

/**
 * Bucket a day's speech-turn count into an intensity level 0–4. Thresholds are
 * measured on the speech grain (per-day p50=3, p90=12 — far denser-tailed than
 * votes), so the ramp is 0 / 1–2 / 3–5 / 6–12 / 13+:
 *   0 = none · 1 = 1–2 · 2 = 3–5 · 3 = 6–12 · 4 = 13+.
 */
export function speechBucketFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 12) return 3
  return 4
}
