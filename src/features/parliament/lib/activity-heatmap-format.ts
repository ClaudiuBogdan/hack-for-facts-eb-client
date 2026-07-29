/**
 * Long Romanian date for a heatmap day key ("2026-03-20" → "20 martie 2026").
 *
 * Formatted in UTC on purpose: the day keys are plain calendar dates, and a
 * local-time render would slide a square onto the previous day west of GMT.
 */
export function formatActivityDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}
