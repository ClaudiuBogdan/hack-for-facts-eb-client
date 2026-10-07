import { getUserLocale } from '@/lib/utils'

/** The hub's numbers in the reader's locale: whole counts, millions with two decimals, whole percents. */

const localeTag = () => (getUserLocale() === 'en' ? 'en-GB' : 'ro-RO')

export function countText(value: number): string {
  return new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 0 }).format(value)
}

/** 1.677.596 → „1,68 mil." (Romanian) / „1.68m" (English). */
export function millionsText(value: number): string {
  const millions = new Intl.NumberFormat(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 1_000_000)
  return getUserLocale() === 'en' ? `${millions}m` : `${millions} mil.`
}

/** A share as a whole percent, a share under one percent as „<1%". */
export function percentText(share: number): string {
  if (share > 0 && share < 0.01) return '<1%'
  return `${new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 0 }).format(share * 100)}%`
}

/** A one-decimal rate („8,7"). */
export function rateText(value: number): string {
  return new Intl.NumberFormat(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

/** „2026-06-22T15:37:22Z" → „22 iunie 2026". */
export function dayText(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  return new Intl.DateTimeFormat(localeTag(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

/** „2026-03" → „mar. 2026". */
export function monthText(month: string, style: 'short' | 'long' = 'short'): string {
  const [year, value] = month.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year ?? 1970, (value ?? 1) - 1, 1)
  return new Intl.DateTimeFormat(localeTag(), { month: style, year: 'numeric', timeZone: 'UTC' }).format(date)
}
