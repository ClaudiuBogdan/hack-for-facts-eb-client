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
 * Build the Monday-first calendar grid for `year`. The first column starts on
 * the Monday on/before Jan 1; the last ends on the Sunday on/after Dec 31.
 */
export function buildYearGrid(year: number): VoteActivityGrid {
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const dec31 = new Date(Date.UTC(year, 11, 31))

  const gridStart = new Date(jan1)
  gridStart.setUTCDate(jan1.getUTCDate() - mondayIndex(jan1))
  const gridEnd = new Date(dec31)
  gridEnd.setUTCDate(dec31.getUTCDate() + (6 - mondayIndex(dec31)))

  const weeks: VoteActivityGridWeek[] = []
  const monthLabels: VoteActivityMonthLabel[] = []
  const seenMonths = new Set<number>()

  const cursor = new Date(gridStart)
  while (cursor.getTime() <= gridEnd.getTime()) {
    const days: VoteActivityGridCell[] = []
    for (let row = 0; row < 7; row++) {
      const inYear = cursor.getUTCFullYear() === year
      // The column holding the 1st of an in-year month anchors that month label.
      if (inYear && cursor.getUTCDate() === 1 && !seenMonths.has(cursor.getUTCMonth())) {
        const month = cursor.getUTCMonth()
        seenMonths.add(month)
        monthLabels.push({ columnIndex: weeks.length, month, label: RO_MONTHS_SHORT[month] })
      }
      days.push({ isoDate: isoFromUtc(cursor), inYear })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    weeks.push({ days })
  }

  return { weeks, monthLabels }
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
