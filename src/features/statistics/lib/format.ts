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
