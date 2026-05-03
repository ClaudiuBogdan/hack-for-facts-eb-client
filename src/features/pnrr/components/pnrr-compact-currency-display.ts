import { getUserLocale } from '@/lib/utils'
import type { Currency } from '@/schemas/charts'
import { convertPnrrValue } from '../lib/formatting'

export type PnrrCompactCurrencyDisplayParts = {
  readonly amount: string
  readonly unit: string | null
}

export function formatPnrrCompactCurrencyDisplayParts(
  valueEur: number,
  currency: Currency,
): PnrrCompactCurrencyDisplayParts {
  const locale = getUserLocale() === 'ro' ? 'ro-RO' : 'en-US'
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).formatToParts(convertPnrrValue(valueEur, currency))
  const amount = parts
    .filter((part) =>
      ['minusSign', 'plusSign', 'integer', 'group', 'decimal', 'fraction'].includes(part.type),
    )
    .map((part) => part.value)
    .join('')
  const compact = parts.find((part) => part.type === 'compact')?.value.replace(/^K$/i, 'mii')
  const currencyPart = parts.find((part) => part.type === 'currency')?.value
  const unit = [compact, currencyPart].filter(Boolean).join(' ')

  return { amount, unit: unit || null }
}
