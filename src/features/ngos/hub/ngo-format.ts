import { t } from '@lingui/core/macro'
import { activeNumberLocale } from '@/features/statistics/lib/format'

/** The hub's figures in the active locale: tabular, fixed decimals so a column lines up. */

export function formatNgoNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(activeNumberLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
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

/** A non-breaking space, as `Intl` puts before its own suffixes: a figure and its scale never part. */
const NBSP = ' '

/**
 * Money in lei on one scale per magnitude — „33,5 mld.", „449,7 mil.",
 * „8.948" — with the unit apart, so it can sit a step quieter. Never past
 * billions: „trilion" means 10¹⁸ in Romanian usage.
 */
export function formatNgoMoney(value: number): { readonly value: string; readonly unit: string } {
  const magnitude = Math.abs(value)
  const figure =
    magnitude >= 1e9
      ? `${formatNgoNumber(value / 1e9, 1)}${NBSP}${t`mld.`}`
      : magnitude >= 1e6
        ? `${formatNgoNumber(value / 1e6, 1)}${NBSP}${t`mil.`}`
        : formatNgoNumber(value)
  return { value: figure, unit: t`lei` }
}

/** A value-axis tick of money: round steps need no decimal („0", „10 mld.", „2,5 mld."). */
export function formatNgoMoneyTick(value: number): string {
  const magnitude = Math.abs(value)
  const [scaled, suffix] = magnitude >= 1e9 ? [value / 1e9, t`mld.`] : magnitude >= 1e6 ? [value / 1e6, t`mil.`] : [value, '']
  const figure = new Intl.NumberFormat(activeNumberLocale(), { maximumFractionDigits: 1 }).format(scaled)
  return suffix ? `${figure}${NBSP}${suffix}` : figure
}

/** `formatNgoMoney` joined, for a sentence or an accessible name. */
export function formatNgoMoneyText(value: number): string {
  const money = formatNgoMoney(value)
  return `${money.value} ${money.unit}`
}

/** A signed change in percent from one positive figure to another („+8,6%", „−19,6%"), or null with no base. */
export function formatNgoChange(from: number | null, to: number): string | null {
  if (from === null || from <= 0) return null
  const percent = new Intl.NumberFormat(activeNumberLocale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(((to - from) / from) * 100)
  return `${percent}%`
}

/** An ISO date as the reader says it: „19 septembrie 2026". */
export function formatNgoDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(activeNumberLocale(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}
