import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'

/** Fixed presentation estimates for converting source-native RON values. */
export const PNRR_ESTIMATED_RON_PER_UNIT: Readonly<Record<Currency, number>> = {
  RON: 1,
  EUR: 5,
  USD: 4.44,
}

export function convertPnrrValue(
  listedFundingRon: number,
  currency: Currency,
): number {
  return listedFundingRon / PNRR_ESTIMATED_RON_PER_UNIT[currency]
}

/**
 * Format source-native MIPE project values using the fixed display estimate.
 * These values are presentation conversions, not authoritative source facts.
 */
export function formatPnrrCurrency(
  listedFundingRon: number,
  currency: Currency,
  notation: 'standard' | 'compact' = 'compact',
): string {
  return formatCurrency(
    convertPnrrValue(listedFundingRon, currency),
    notation,
    currency,
  )
}

export function formatPnrrPercentage(value: number): string {
  return `${formatNumber(value)}%`
}
