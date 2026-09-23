import { activeNumberLocale } from '@/features/statistics/lib/format'

/** The hub's figures in the active locale: tabular, fixed decimals so a column lines up. */

export function formatNgoNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(activeNumberLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}

/** A difference, always signed: „+45,6", „−12,3". */
export function formatNgoSigned(value: number, digits = 1): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
  }).format(value)
}

/**
 * A share of a whole, 0 to 1: one decimal below 10%, none above („6,1%",
 * „86%"), the sign against the figure as the INS hub writes it. A share too
 * small to show at one decimal is „<0,1%", never a false zero.
 */
export function formatNgoShare(share: number): string {
  const percent = share * 100
  if (percent > 0 && percent < 0.05) return `<${formatNgoNumber(0.1, 1)}%`
  return `${formatNgoNumber(percent, percent < 10 ? 1 : 0)}%`
}

/** An ISO date as the reader says it: „19 septembrie 2026". */
export function formatNgoDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(activeNumberLocale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}
