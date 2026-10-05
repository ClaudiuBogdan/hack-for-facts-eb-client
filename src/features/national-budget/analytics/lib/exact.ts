/**
 * The national budget's exact decimals, on the app's own `@/lib/exact-decimal`:
 * a float only to draw (`plotOf`), the printed digits for what a reader is
 * told (`exactText`, `exactCompact`), and shares and changes divided on the
 * decimals and rounded at the digit they show (`exactPercent`, `exactChange`).
 * The names are the ones the page and its prototype were written against.
 *
 * The API's schema accepts a decimal in more forms than the shared library
 * reads („+12.5", „.5", „12."); each is brought to the library's one form
 * first, so an amount the server vouches for is never dropped as unreadable.
 */
import {
  compactDecimal,
  decimalSign,
  decimalToPlot,
  formatDecimal,
  parseDecimal,
  percentOf,
  roundDecimal,
  shiftDecimal,
  sumDecimals,
  type DecimalLocale,
  type DecimalScale,
} from '@/lib/exact-decimal'
import { getUserLocale } from '@/lib/utils'

/** The reader's notation: Romanian groups and decimal comma, or English. */
const readerLocale = (): DecimalLocale => (getUserLocale() === 'ro' ? 'ro' : 'en')

/** A decimal in the shared library's form: „+12.5" → „12.5", „.5" → „0.5", „-.5" → „-0.5", „12." → „12". Anything else as it came. */
export function canonicalDecimal(exact: string): string {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/u.exec(exact)
  if (!match) return exact
  const [, sign, integer = '', fraction = ''] = match
  if (!integer && !fraction) return exact
  return `${sign === '-' ? '-' : ''}${integer || '0'}${fraction ? `.${fraction}` : ''}`
}

/** A plotting coordinate only: never state, never arithmetic on amounts. Null for anything not a decimal. */
export function plotOf(exact: string | null | undefined): number | null {
  return exact === null || exact === undefined ? null : decimalToPlot(canonicalDecimal(exact))
}

/** Native thousand lei to lei, exactly: the decimal point moves three places to the right („41160812.5" → „41160812500"). */
export function thousandToLei(exact: string): string {
  const parts = parseDecimal(canonicalDecimal(exact))
  if (!parts) return exact
  const fraction = parts.fraction.padEnd(3, '0')
  const integer = `${parts.integer}${fraction.slice(0, 3)}`.replace(/^0+(?=\d)/u, '')
  const rest = fraction.slice(3).replace(/0+$/u, '')
  return `${parts.negative ? '-' : ''}${integer}${rest ? `.${rest}` : ''}`
}

/**
 * The exact amount in the reader's notation, rounded half away from zero on
 * the digits themselves: „310.520.639.938,73". A real minus sign, none on a
 * value that rounds to zero; no float in between.
 */
export function exactText(exact: string, digits = 2, locale: DecimalLocale = readerLocale()): string {
  const rounded = roundDecimal(canonicalDecimal(exact), digits)
  if (rounded === null) return exact
  return formatDecimal(decimalSign(rounded) === 0 ? rounded.replace(/^-/u, '') : rounded, locale)
}

/**
 * An amount on one scale, rounded on its digits: billions and millions with
 * one decimal, smaller amounts whole („2,0" billions for 2.049999999… bn,
 * where a float would say 2,1). Null for a value that isn't a decimal.
 */
export function exactCompact(exact: string, locale: DecimalLocale = readerLocale()): { readonly value: string; readonly scale: DecimalScale | null } | null {
  const canonical = canonicalDecimal(exact)
  if (!parseDecimal(canonical)) return null
  const compact = compactDecimal(canonical, locale)
  // „−0,0" is zero: no sign to show.
  return { value: compact.value.replace(/^−(?=[0.,]+$)/u, ''), scale: compact.scale }
}

/** The amount divided by 10^power and rounded to `digits` on its digits, in the reader's notation: a chart's label on its unit. */
export function exactScaled(exact: string, power: number, digits: number, locale: DecimalLocale = readerLocale()): string | null {
  const scaled = power === 0 ? canonicalDecimal(exact) : shiftDecimal(canonicalDecimal(exact), power)
  if (scaled === null || !parseDecimal(scaled)) return null
  return exactText(scaled, digits, locale)
}

/** The amount in billions with one decimal, rounded on its digits: for a column headed „mld. lei". */
export function exactBillions(exact: string, locale: DecimalLocale = readerLocale()): string | null {
  return exactScaled(exact, 9, 1, locale)
}

/**
 * The amount divided by 10^power and rounded to `digits` on its digits, as
 * the number a figure band formats: the rounding is done, the number only
 * carries those digits. Null for a value that isn't a decimal.
 */
export function exactRounded(exact: string, power: number, digits: number): number | null {
  const shifted = power === 0 ? canonicalDecimal(exact) : shiftDecimal(canonicalDecimal(exact), power)
  const rounded = shifted === null ? null : roundDecimal(shifted, digits)
  return rounded === null ? null : Number(rounded) + 0
}

/**
 * An amount for a figure band, on the same scale as `exactCompact` and
 * rounded on its digits: the number only carries the rounded digits to the
 * band's formatter. Null for a value that isn't a decimal.
 */
export function exactFigure(exact: string): { readonly value: number; readonly digits: 0 | 1; readonly scale: DecimalScale | null } | null {
  const parts = parseDecimal(canonicalDecimal(exact))
  if (!parts) return null
  const length = parts.integer.replace(/^0+/u, '').length
  const [power, scale]: readonly [number, DecimalScale | null] = length >= 10 ? [9, 'billion'] : length >= 7 ? [6, 'million'] : [0, null]
  const value = exactRounded(exact, power, power === 0 ? 0 : 1)
  return value === null ? null : { value, digits: power === 0 ? 0 : 1, scale }
}

/** The amount without its sign: a deficit's size. */
export const absDecimal = (exact: string): string => canonicalDecimal(exact).replace(/^-/u, '')

/** Below zero, on the digits: a deficit, not a surplus. */
export const isNegative = (exact: string): boolean => decimalSign(canonicalDecimal(exact)) === -1

/**
 * A part of a whole as a percentage, rounded half away from zero to `digits`
 * decimals on the exact decimals: `exactPercent("1", "3", 1)` is 33.3. The
 * number returned only carries those rounded digits to a formatter. Null for
 * a zero whole or a value that isn't a decimal.
 */
export function exactPercent(part: string, whole: string, digits = 1): number | null {
  const percent = percentOf(canonicalDecimal(part), canonicalDecimal(whole), digits)
  return percent === null ? null : Number(percent) + 0
}

/** The change from `before` to `now` as a percentage of `before`, rounded the same way; null unless `before` is a positive amount. */
export function exactChange(now: string, before: string, digits = 1): number | null {
  const base = canonicalDecimal(before)
  if (decimalSign(base) !== 1) return null
  const difference = sumDecimals([canonicalDecimal(now), negated(base)])
  return difference === null ? null : exactPercent(difference, base, digits)
}

const negated = (exact: string): string => (exact.startsWith('-') ? exact.slice(1) : `-${exact}`)
