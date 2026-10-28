/**
 * One formatter for every square: building an `Intl.DateTimeFormat` costs far
 * more than using one, and a year-long heatmap formats hundreds of days.
 *
 * Formatted in UTC on purpose: the day keys are plain calendar dates, and a
 * local-time render would slide a square onto the previous day west of GMT.
 */
const ACTIVITY_DATE_FORMAT = new Intl.DateTimeFormat('ro-RO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Long Romanian date for a heatmap day key ("2026-03-20" → "20 martie 2026"). */
export function formatActivityDate(isoDate: string): string {
  return ACTIVITY_DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`))
}
