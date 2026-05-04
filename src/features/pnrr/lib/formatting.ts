import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'

/**
 * Fixed exchange rates for PNRR data.
 * Source data is in EUR. Rates express "how many units of target currency = 1 EUR".
 *
 * Official project values use 1 EUR = 5 RON.
 * USD display uses the app's existing RON/USD bridge rate.
 */
const PNRR_RON_PER_EUR = 5
const PNRR_RON_PER_USD = 4.44

export const PNRR_EXCHANGE_RATES: Readonly<Record<Currency, number>> = {
  RON: PNRR_RON_PER_EUR,
  EUR: 1,
  USD: PNRR_RON_PER_EUR / PNRR_RON_PER_USD,
}

/**
 * Convert a PNRR value from EUR to the target currency.
 */
export function convertPnrrValue(valueEur: number, currency: Currency): number {
  return valueEur * PNRR_EXCHANGE_RATES[currency]
}

/**
 * Convert a PNRR EUR value to target currency and format as localized currency string.
 */
export function formatPnrrCurrency(
  valueEur: number,
  currency: Currency,
  notation: 'standard' | 'compact' = 'compact',
): string {
  return formatCurrency(convertPnrrValue(valueEur, currency), notation, currency)
}

export function formatPnrrPercentage(value: number): string {
  return `${formatNumber(value)}%`
}

/**
 * Return a human-readable exchange-rate label for the info panel.
 * Returns null when currency is EUR (no conversion needed).
 */
export function getPnrrExchangeRateLabel(currency: Currency): string | null {
  if (currency === 'EUR') return null
  if (currency === 'RON') return '1 EUR = 5,00 RON'
  return `1 EUR = ${(PNRR_RON_PER_EUR / PNRR_RON_PER_USD).toFixed(2)} USD`
}
