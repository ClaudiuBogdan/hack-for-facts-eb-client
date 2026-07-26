import { formatCurrency, formatNumber } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'

/**
 * PNRR project values are source-native RON values. This compatibility helper
 * deliberately performs no exchange-rate conversion.
 */
export function convertPnrrValue(listedFundingRon: number, _currency: Currency): number {
  return listedFundingRon
}

/**
 * Format source-native MIPE project values. The requested currency is retained
 * in the signature for existing callers, but the source value is always RON.
 */
export function formatPnrrCurrency(
  listedFundingRon: number,
  _currency: Currency,
  notation: 'standard' | 'compact' = 'compact',
): string {
  return formatCurrency(listedFundingRon, notation, 'RON')
}

export function formatPnrrPercentage(value: number): string {
  return `${formatNumber(value)}%`
}
