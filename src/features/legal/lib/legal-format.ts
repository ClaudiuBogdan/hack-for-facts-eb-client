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
