/**
 * Decimal strings as the API sends money and counts — `"1234567890123.45"`,
 * `"-0.50"`, `"13702812"` — formatted, rounded, compared and divided without
 * ever passing through a float. A JavaScript number holds 15–16 significant
 * digits: a national turnover sum in bani already needs more, and a figure
 * that loses its last digits is a different figure.
 *
 * Only a chart's plotting coordinate may become a number (`decimalToPlot`);
 * what a reader sees, copies or exports stays the API's own digits.
 */

const DECIMAL_RE = /^-?\d+(?:\.\d+)?$/u

export type DecimalLocale = 'ro' | 'en'

export interface DecimalParts {
  readonly negative: boolean
  /** The integer digits, without leading zeros („0" for none). */
  readonly integer: string
  /** The fraction digits as written („" for none). */
  readonly fraction: string
}

export function isDecimalString(text: unknown): text is string {
  return typeof text === 'string' && DECIMAL_RE.test(text)
}

export function parseDecimal(text: string): DecimalParts | null {
  if (!DECIMAL_RE.test(text)) return null
  const negative = text.startsWith('-')
  const unsigned = negative ? text.slice(1) : text
  const [rawInteger = '0', fraction = ''] = unsigned.split('.')
  const integer = rawInteger.replace(/^0+(?=\d)/u, '')
  // „-0.00" is zero: no sign to show.
  const zero = /^0*$/u.test(integer) && /^0*$/u.test(fraction)
  return { negative: negative && !zero, integer, fraction }
}

/** The value as an integer count of 10^-scale units (the fraction cut or padded to `scale`). */
function unitsOf(parts: DecimalParts, scale: number): bigint {
  const fraction = parts.fraction.padEnd(scale, '0').slice(0, scale)
  const units = BigInt(`${parts.integer}${fraction}`)
  return parts.negative ? -units : units
}

function textOf(units: bigint, scale: number): string {
  const negative = units < 0n
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0')
  const integer = scale === 0 ? digits : digits.slice(0, -scale)
  const fraction = scale === 0 ? '' : digits.slice(-scale)
  const zero = units === 0n
  return `${negative && !zero ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`
}

/** Divide with rounding half away from zero, as the API rounds its means. */
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n
  const n = numerator < 0n ? -numerator : numerator
  const d = denominator < 0n ? -denominator : denominator
  let quotient = n / d
  if ((n % d) * 2n >= d) quotient += 1n
  return negative ? -quotient : quotient
}

/** -1, 0 or 1; null for text that is not a decimal. */
export function decimalSign(text: string): -1 | 0 | 1 | null {
  const parts = parseDecimal(text)
  if (!parts) return null
  if (/^0*$/u.test(parts.integer) && /^0*$/u.test(parts.fraction)) return 0
  return parts.negative ? -1 : 1
}

export function compareDecimal(left: string, right: string): number {
  const a = parseDecimal(left)
  const b = parseDecimal(right)
  if (!a || !b) return 0
  const scale = Math.max(a.fraction.length, b.fraction.length)
  const difference = unitsOf(a, scale) - unitsOf(b, scale)
  return difference === 0n ? 0 : difference < 0n ? -1 : 1
}

/** The value rounded to `digits` decimals (half away from zero), as decimal text; null for text that is not a decimal. */
export function roundDecimal(text: string, digits: number): string | null {
  const parts = parseDecimal(text)
  if (!parts) return null
  if (parts.fraction.length <= digits) return textOf(unitsOf(parts, digits), digits)
  const exact = unitsOf(parts, parts.fraction.length)
  return textOf(divideRounded(exact, 10n ** BigInt(parts.fraction.length - digits)), digits)
}

/** The value divided by 10^power, exactly (a shift of the decimal point). */
export function shiftDecimal(text: string, power: number): string | null {
  const parts = parseDecimal(text)
  if (!parts) return null
  const scale = parts.fraction.length + power
  return textOf(unitsOf(parts, parts.fraction.length), scale)
}

function separatorsOf(locale: DecimalLocale): { readonly group: string; readonly decimal: string } {
  return locale === 'ro' ? { group: '.', decimal: ',' } : { group: ',', decimal: '.' }
}

function grouped(integer: string, separator: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/gu, separator)
}

/**
 * A decimal in a reader's language: its digits grouped („1.234.567,89" in
 * Romanian, „1,234,567.89" in English). `fractionDigits` fixes the decimals
 * shown (rounded half away from zero); without it the API's own are kept.
 * Text that is not a decimal is returned as it came.
 */
export function formatDecimal(text: string, locale: DecimalLocale, fractionDigits?: number): string {
  const rounded = fractionDigits === undefined ? text : roundDecimal(text, fractionDigits)
  const parts = rounded === null ? null : parseDecimal(rounded)
  if (!parts) return text
  const { group, decimal } = separatorsOf(locale)
  return `${parts.negative ? '−' : ''}${grouped(parts.integer, group)}${parts.fraction ? `${decimal}${parts.fraction}` : ''}`
}

export type DecimalScale = 'billion' | 'million' | 'thousand'

/**
 * A large figure on one scale, for a band or a column: billions and millions
 * with one decimal, smaller values whole. The exact figure stays the caller's
 * to show beside it.
 */
export function compactDecimal(text: string, locale: DecimalLocale): { readonly value: string; readonly scale: DecimalScale | null } {
  const parts = parseDecimal(text)
  if (!parts) return { value: text, scale: null }
  const digits = parts.integer.replace(/^0+/u, '').length
  const scaled = (power: number, scale: DecimalScale) => ({ value: formatDecimal(shiftDecimal(text, power) ?? text, locale, 1), scale })
  if (digits >= 10) return scaled(9, 'billion')
  if (digits >= 7) return scaled(6, 'million')
  return { value: formatDecimal(text, locale, 0), scale: null }
}

/**
 * `numerator / denominator × 100`, rounded to `digits` decimals, as decimal
 * text; null for a zero or missing denominator (a share of nothing is not 0%).
 */
export function percentOf(numerator: string, denominator: string, digits = 1): string | null {
  const a = parseDecimal(numerator)
  const b = parseDecimal(denominator)
  if (!a || !b) return null
  const scale = Math.max(a.fraction.length, b.fraction.length)
  const divisor = unitsOf(b, scale)
  if (divisor === 0n) return null
  const units = divideRounded(unitsOf(a, scale) * 100n * 10n ** BigInt(digits), divisor)
  return textOf(units, digits)
}

/** Sum of decimal strings, exactly. */
export function sumDecimals(values: readonly string[]): string | null {
  const parsed = values.map(parseDecimal)
  if (parsed.some((part) => part === null)) return null
  const scale = Math.max(0, ...parsed.map((part) => part!.fraction.length))
  return textOf(
    parsed.reduce((total, part) => total + unitsOf(part!, scale), 0n),
    scale,
  )
}

/**
 * The only place a decimal becomes a float: a chart's coordinate. The value
 * a tooltip or an export shows stays the string.
 */
export function decimalToPlot(text: string | null | undefined): number | null {
  if (typeof text !== 'string' || !DECIMAL_RE.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}
