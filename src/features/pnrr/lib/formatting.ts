import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'

/**
 * Presentation-only exchange rates used by the PNRR UI.
 *
 * MIPE publishes project values in RON and national indicators in EUR. The
 * normalized client model currently uses EUR-shaped values, so these rates
 * provide a consistent display toggle. They are not source values or a daily
 * official exchange rate.
 */
const PNRR_DISPLAY_RON_PER_EUR = 5
const PNRR_RON_PER_USD = 4.44

export const PNRR_EXCHANGE_RATES: Readonly<Record<Currency, number>> = {
  RON: PNRR_DISPLAY_RON_PER_EUR,
  EUR: 1,
  USD: PNRR_DISPLAY_RON_PER_EUR / PNRR_RON_PER_USD,
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
  return formatCurrency(
    convertPnrrValue(valueEur, currency),
    notation,
    currency,
  )
}

export function formatPnrrPercentage(value: number): string {
  return `${formatNumber(value)}%`
}
