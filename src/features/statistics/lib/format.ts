import { getUserLocale } from '@/lib/utils'

/** Locale-aware number formatting keyed to the active UI locale. */
export function activeNumberLocale(): string {
  return getUserLocale() === 'ro' ? 'ro-RO' : 'en-GB'
}

/**
 * Formats a decimal-string observation value in the active locale with
 * tabular figures. `null` renders as an explicit absence, never 0.
 */
export function formatObservationValue(value: string | null): string | null {
  if (value === null) return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return null
  return new Intl.NumberFormat(activeNumberLocale(), {
    style: 'decimal',
    maximumFractionDigits: 2,
  }).format(parsed)
}

/** Signed percent with one decimal, locale-aware ('+12,4%' / '-8,2%'). */
export function formatPercent(
  value: number,
  options?: { readonly signed?: boolean },
): string {
  const formatted = new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: 1,
    ...(options?.signed ? { signDisplay: 'exceptZero' as const } : {}),
  }).format(value)
  return `${formatted}%`
}

/**
 * An INS publication date (`2026-04-02`) in the active locale. Anything that
 * is not a plain ISO day renders verbatim — the field is published text, and
 * inventing a date from an unparseable one would be worse than showing it.
 */
export function formatSourceDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(activeNumberLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

/**
 * A wire value with thousands separators, and not one digit changed.
 *
 * The observations table and the chart tooltip print what INS published,
 * unrounded — that is the archival contract. But `22516004` beside a figure
 * that reads `22.516.004` looks like a different number, so this groups the
 * integer part and swaps the decimal mark for the locale's, working on the
 * STRING: parsing to a float would silently round a long decimal, which is
 * exactly what the contract forbids. Anything that is not a plain decimal
 * comes back verbatim.
 */
export function groupWireValue(raw: string, locale: string): string {
  const trimmed = raw.trim()
  const parsed = /^(-?)(\d+)(?:[.,](\d+))?$/.exec(trimmed)
  if (!parsed) return trimmed

  const [, sign, whole, fraction] = parsed
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5)
  const group = parts.find((part) => part.type === 'group')?.value ?? ','
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.'

  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, group)
  return `${sign}${grouped}${fraction ? `${decimal}${fraction}` : ''}`
}
