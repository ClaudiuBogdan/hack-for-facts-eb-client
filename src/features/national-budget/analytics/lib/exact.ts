/**
 * Exact decimal strings, kept exact: a float only to draw (`plotOf`), the
 * printed digits for what a reader is told (`exactText`). Local to the
 * national budget until this branch carries `src/lib/exact-decimal.ts`
 * (client dev, 2026-10-03), which these two then defer to.
 */

/** Sign, whole digits, fraction digits; at least one digit somewhere. */
const DECIMAL = /^([+-]?)(?=\.?\d)(\d*)(?:\.(\d*))?$/u

/** A plotting coordinate only: never state, never arithmetic on amounts. Null for anything not a finite number. */
export function plotOf(exact: string | null | undefined): number | null {
  if (exact === null || exact === undefined || !DECIMAL.test(exact.trim())) return null
  const value = Number(exact)
  return Number.isFinite(value) ? value : null
}

/** Native thousand lei to lei, exactly: the decimal point moves three places („41160812.5" → „41160812500"). */
export function thousandToLei(exact: string): string {
  const match = DECIMAL.exec(exact.trim())
  if (!match) return exact
  const [, sign = '', whole = '', fraction = ''] = match
  const padded = fraction.padEnd(3, '0')
  const integer = `${whole}${padded.slice(0, 3)}`.replace(/^0+(?=\d)/u, '')
  const rest = padded.slice(3).replace(/0+$/u, '')
  return `${sign === '-' ? '-' : ''}${integer}${rest ? `.${rest}` : ''}`
}

/** A decimal as an integer and its scale: „12.34" → 1234n at scale 2. */
function scaled(exact: string): { readonly units: bigint; readonly scale: number } | null {
  const match = DECIMAL.exec(exact.trim())
  if (!match) return null
  const [, sign = '', whole = '', fraction = ''] = match
  const units = BigInt(`${whole || '0'}${fraction}`)
  return { units: sign === '-' ? -units : units, scale: fraction.length }
}

/** `numerator / denominator` × 100, rounded half away from zero to `digits` decimals, on integers. */
function percentOfUnits(numerator: bigint, denominator: bigint, digits: number): number | null {
  if (denominator === 0n) return null
  const scaledNumerator = numerator * 10n ** BigInt(digits + 2)
  const negative = scaledNumerator < 0n !== denominator < 0n
  const top = scaledNumerator < 0n ? -scaledNumerator : scaledNumerator
  const bottom = denominator < 0n ? -denominator : denominator
  const rounded = (2n * top + bottom) / (2n * bottom)
  if (rounded === 0n) return 0
  return Number(negative ? -rounded : rounded) / 10 ** digits
}

/** Two decimals brought to one scale, so their integers compare and subtract exactly. */
function aligned(a: string, b: string): readonly [bigint, bigint] | null {
  const left = scaled(a)
  const right = scaled(b)
  if (!left || !right) return null
  const scale = Math.max(left.scale, right.scale)
  return [left.units * 10n ** BigInt(scale - left.scale), right.units * 10n ** BigInt(scale - right.scale)]
}

/**
 * A part of a whole as a percentage, rounded half away from zero to `digits`
 * decimals on the exact decimals: `exactPercent("1", "3", 1)` is 33.3. The
 * number returned only carries those rounded digits to a formatter; no float
 * takes part in the division. Null for a zero whole or a value that isn't a
 * decimal.
 */
export function exactPercent(part: string, whole: string, digits = 1): number | null {
  const pair = aligned(part, whole)
  return pair ? percentOfUnits(pair[0], pair[1], digits) : null
}

/** The change from `before` to `now` as a percentage of `before`, rounded the same way; null unless `before` is a positive amount. */
export function exactChange(now: string, before: string, digits = 1): number | null {
  const pair = aligned(now, before)
  if (!pair || pair[1] <= 0n) return null
  return percentOfUnits(pair[0] - pair[1], pair[1], digits)
}

/**
 * The exact amount in Romanian notation, rounded half up on the digits
 * themselves: „310.520.639.938,73". A real minus sign; no float in between.
 */
export function exactText(exact: string, digits = 2): string {
  const match = DECIMAL.exec(exact.trim())
  if (!match) return exact
  const [, sign = '', whole = '', fraction = ''] = match
  let integer = whole.replace(/^0+(?=\d)/u, '') || '0'
  let decimals = fraction.padEnd(digits + 1, '0')
  const roundUp = Number(decimals.charAt(digits)) >= 5
  decimals = decimals.slice(0, digits)
  if (roundUp) {
    const joined = `${integer}${decimals}`
    let carried = ''
    let carry = 1
    for (let index = joined.length - 1; index >= 0; index -= 1) {
      const digit = Number(joined.charAt(index)) + carry
      carry = digit === 10 ? 1 : 0
      carried = String(digit % 10) + carried
    }
    if (carry) carried = `1${carried}`
    integer = carried.slice(0, carried.length - digits) || '0'
    decimals = carried.slice(carried.length - digits)
  }
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/gu, '.')
  const zero = /^0*$/u.test(integer + decimals)
  const minus = sign === '-' && !zero ? '−' : ''
  return digits > 0 ? `${minus}${grouped},${decimals}` : `${minus}${grouped}`
}
