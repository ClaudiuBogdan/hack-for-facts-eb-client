import { t } from '@lingui/core/macro'
import { getUserLocale } from '@/lib/utils'

/**
 * Number formatting for the companies hub: the UI language's separators, the
 * figure and its unit as two strings so the unit can sit in the quiet tier.
 *
 * The directory and the profile pin `ro-RO` (`formatInteger`); the hub
 * follows the INS hub instead, whose figures are read beside prose in the
 * page's own language.
 */

/**
 * What a hub figure counts. `firms`, `persons` and `lei` add up across
 * counties and sectors; `per-thousand` (firms per 1,000 residents) does not.
 */
export type HubUnit = 'firms' | 'persons' | 'lei' | 'per-thousand'

export function hubNumberLocale(): string {
  return getUserLocale() === 'ro' ? 'ro-RO' : 'en-GB'
}

/** One formatter per locale and precision: a county hover formats about two hundred figures. */
const formatters = new Map<string, Intl.NumberFormat>()
function formatter(locale: string, digits: number, signed: boolean): Intl.NumberFormat {
  const key = `${locale}|${digits}|${signed}`
  let cached = formatters.get(key)
  if (!cached) {
    cached = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      ...(signed ? { signDisplay: 'exceptZero' as const } : {}),
    })
    formatters.set(key, cached)
  }
  return cached
}

/** Fixed decimals, so a column of figures lines up („8,0" under „12,4"). */
export function formatHubNumber(value: number, options?: { readonly digits?: number; readonly signed?: boolean }): string {
  return formatter(hubNumberLocale(), options?.digits ?? 0, Boolean(options?.signed)).format(value)
}

export function isAdditiveUnit(unit: HubUnit): boolean {
  return unit !== 'per-thousand'
}

/** The unit as a word after the figure. */
export function hubUnitWord(unit: HubUnit): string {
  switch (unit) {
    case 'firms':
      return t({ message: 'firme', context: 'companies hub unit' })
    case 'persons':
      return t`salariați`
    case 'lei':
      return t`lei`
    case 'per-thousand':
      return t`la 1.000 de locuitori`
  }
}

/** A non-breaking space, as `Intl` puts before its own suffixes: a figure and its scale never part. */
const NBSP = '\u00a0'

/**
 * Money on one scale per magnitude, never past billions: `Intl`'s compact
 * notation would switch to „tril." at 10¹², print București's 1.081 bn over
 * Ilfov's 192 bn as „1,1" over „192,1", and „trilion" means 10¹⁸ in Romanian
 * usage besides.
 */
function formatMoney(value: number): string {
  const magnitude = Math.abs(value)
  if (magnitude >= 1e9) return `${formatHubNumber(value / 1e9, { digits: 1 })}${NBSP}${t`mld.`}`
  if (magnitude >= 1e6) return `${formatHubNumber(value / 1e6, { digits: 1 })}${NBSP}${t`mil.`}`
  return formatHubNumber(value)
}

/** A figure and its unit. Counts stay whole („341.116"), since a reader compares them digit by digit. */
export function formatHubValue(value: number, unit: HubUnit, options?: { readonly digits?: number }): { readonly value: string; readonly unit: string } {
  return {
    value: unit === 'lei' ? formatMoney(value) : formatHubNumber(value, { digits: options?.digits }),
    unit: hubUnitWord(unit),
  }
}

/** `{ value, unit }` joined, for a title or an accessible name. */
export function formatHubValueText(value: number, unit: HubUnit, digits?: number): string {
  const formatted = formatHubValue(value, unit, { digits })
  return `${formatted.value} ${formatted.unit}`
}

/**
 * A percent to one decimal with the sign against the figure („26,4%"), as the
 * INS hub writes it; `Intl`'s percent style puts a space before it in Romanian.
 */
function formatPercent(fraction: number, signed = false): string {
  return `${formatHubNumber(fraction * 100, { digits: 1, signed })}%`
}

/** A share of a whole, one decimal: „26,4%". */
export function formatHubShare(part: number, whole: number): string {
  return whole > 0 ? formatPercent(part / whole) : '—'
}

/** A signed change in percent between two positive figures, or null when there is no base. */
export function formatHubChange(from: number | null, to: number): string | null {
  return from !== null && from > 0 ? formatPercent((to - from) / from, true) : null
}

/**
 * A county against the country. A count or a sum is its share of the total —
 * of the statements filed, for money, which is why it is not called the
 * country's; a rate differs from the national rate in its own unit.
 */
export function describeAgainstNational(value: number, national: number, unit: HubUnit, digits: number): string | null {
  if (isAdditiveUnit(unit)) {
    return national > 0 ? t`${formatHubShare(value, national)} din total` : null
  }
  return t`${formatHubNumber(value - national, { digits, signed: true })} față de România`
}

/** The decimals a set of figures shares, at most one: a rate column lines up („8,0" under „12,4"). */
export function sharedDecimals(values: readonly number[]): number {
  return values.some((value) => Math.abs(Math.round(value) - value) > 1e-9) ? 1 : 0
}

/** `2026-07` → „iulie 2026", in the page's language. */
export function formatHubMonth(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period
  return new Intl.DateTimeFormat(hubNumberLocale(), { month: 'long', year: 'numeric' }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1))
}
