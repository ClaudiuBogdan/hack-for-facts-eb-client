/**
 * Locale-aware formatters for the legislation surfaces.
 *
 * Keyed to the active Lingui locale via `Intl`, never a hardcoded `ro-RO`
 * (DESIGN.md §Don'ts). Dates are formatted in UTC: the source values are plain
 * `YYYY-MM-DD` publication dates, and rendering them in the viewer's timezone
 * would slide a gazette issue onto the previous day west of Greenwich.
 */

export function formatLegalNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatLegalPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatLegalDate(value: string, locale: string): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

/**
 * The viewer's civil date as `YYYY-MM-DD`, from LOCAL time components — the
 * change feed's default window ends "today", and Romania runs 2–3 hours ahead
 * of UTC, so a UTC-derived today would misclassify a law effective "today" as
 * future until 02:00–03:00 local. `daysFromNow` shifts whole civil days
 * (1 = tomorrow, the future view's `since`).
 */
export function localIsoDate(daysFromNow = 0): string {
  const now = new Date()
  now.setDate(now.getDate() + daysFromNow)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
