import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'

export const BUDGET_2026_FIXED_EXCHANGE_RATES: Record<Currency, number> = {
  RON: 1,
  EUR: 4.9746,
  USD: 4.5984,
}

const COMPACT_CURRENCY_PARTS_PATTERN = /^(.*?)(?:\s+)(RON|EUR|USD)$/

export function convertBudget2026Value(
  valueInThousandsRon: number,
  currency: Currency,
): number {
  const amountInRon = valueInThousandsRon * 1_000
  return amountInRon / BUDGET_2026_FIXED_EXCHANGE_RATES[currency]
}

export function formatBudget2026Currency(
  valueInThousandsRon: number,
  currency: Currency,
  notation: 'standard' | 'compact' = 'compact',
): string {
  return formatCurrency(
    convertBudget2026Value(valueInThousandsRon, currency),
    notation,
    currency,
  )
}

export function splitBudget2026CompactCurrency(
  valueInThousandsRon: number,
  currency: Currency,
): {
  amountLabel: string
  currencyLabel: Currency
} {
  const compactValue = formatBudget2026Currency(valueInThousandsRon, currency, 'compact')
  const compactMatch = compactValue.match(COMPACT_CURRENCY_PARTS_PATTERN)

  if (!compactMatch) {
    return {
      amountLabel: compactValue,
      currencyLabel: currency,
    }
  }

  return {
    amountLabel: compactMatch[1]!,
    currencyLabel: compactMatch[2]! as Currency,
  }
}

export function formatBudget2026CompactAmount(
  valueInThousandsRon: number,
  currency: Currency,
): string {
  return splitBudget2026CompactCurrency(valueInThousandsRon, currency).amountLabel
}

export function getBudget2026ExchangeRateLabel(currency: Currency): string | null {
  if (currency === 'RON') return null
  const rateToRon = BUDGET_2026_FIXED_EXCHANGE_RATES[currency]
  return `1 ${currency} = ${new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(rateToRon)} RON`
}
