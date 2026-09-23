import { activeNumberLocale } from './format'

/**
 * Hub number formatting: locale-aware, tabular. `digits` fixes the decimals,
 * so a column of figures lines up („1,0%" under „1,5%").
 */
export function formatHubNumber(
  value: number,
  options?: { readonly compact?: boolean; readonly digits?: number },
): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: options?.digits ?? (options?.compact ? 1 : 2),
    ...(options?.digits !== undefined ? { minimumFractionDigits: options.digits } : {}),
    ...(options?.compact ? { notation: 'compact' as const } : {}),
  }).format(value)
}

/** A signed number („+2,1", „-18"), `fixed` keeping trailing zeros to `digits`. */
export function formatSignedNumber(value: number, digits: number, fixed = false): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    maximumFractionDigits: digits,
    ...(fixed ? { minimumFractionDigits: digits } : {}),
    signDisplay: 'exceptZero',
  }).format(value)
}

/** The decimals the figures of one set carry, at most two: a set published to one decimal shows every figure with one. */
export function sharedDecimals(values: readonly number[]): number {
  let decimals = 0
  for (const value of values) {
    while (decimals < 2 && Math.abs(Math.round(value * 10 ** decimals) - value * 10 ** decimals) > 1e-6) decimals += 1
  }
  return decimals
}

/** Decimal places the source published a value with („110.85" → 2), so a figure derived from it keeps that precision. */
export function sourceDecimals(raw: string | null): number {
  const match = raw ? /\.(\d+)$/.exec(raw) : null
  return match ? match[1].length : 0
}
