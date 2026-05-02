import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'

/**
 * Fixed exchange rates for PNRR data.
 * Source data is in EUR. Rates express "how many units of target currency = 1 EUR".
 *
 * 1 EUR = 5.14 RON
 * 1 USD = 4.44 RON  →  1 EUR = 5.14 / 4.44 USD
 */
const PNRR_RON_PER_EUR = 5.14
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

const CURRENCY_UNIT_PATTERN =
  /^(.+?)[\s\u00A0\u202F]+((?:(?:K|mii|mil\.|mld\.)[\s\u00A0\u202F]+)?(?:RON|EUR|USD))$/i

export function getPnrrCurrencyDisplayParts(value: string): {
  readonly amount: string
  readonly unit: string | null
} {
  const match = value.match(CURRENCY_UNIT_PATTERN)

  if (!match) {
    return { amount: value, unit: null }
  }

  return {
    amount: match[1],
    unit: match[2].replace(/[\s\u00A0\u202F]+/g, ' '),
  }
}

/**
 * Return a human-readable exchange-rate label for the info panel.
 * Returns null when currency is EUR (no conversion needed).
 */
export function getPnrrExchangeRateLabel(currency: Currency): string | null {
  if (currency === 'EUR') return null
  if (currency === 'RON') return '1 EUR = 5,14 RON'
  return `1 EUR = ${(PNRR_RON_PER_EUR / PNRR_RON_PER_USD).toFixed(2)} USD`
}
