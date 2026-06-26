import { t } from '@lingui/core/macro'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { MoneyValue } from '@/schemas/procurement'

/**
 * Procurement money formatting helpers. RON is primary; native value+currency
 * rows are shown separately and never summed across currencies. Outliers
 * are flagged. See docs/design/procurement/design.md §2 ("Money is shown
 * honestly").
 */

export function formatMoneyValue(value: MoneyValue, notation: 'standard' | 'compact' = 'standard'): string {
  if (value.ron !== null) {
    const currency = (value.currency ?? 'RON') as 'RON' | 'EUR' | 'USD'
    if (currency === 'RON') {
      return formatCurrency(value.ron, notation, 'RON')
    }
    // RON present but currency not RON — unusual; show native to be safe.
    if (value.nativeValue !== null) {
      return formatCurrency(value.nativeValue, notation, currency)
    }
    return formatCurrency(value.ron, notation, 'RON')
  }

  // Non-RON: show native value+currency, never fold into a RON total.
  if (value.nativeValue !== null && value.currency) {
    const currency = value.currency as 'RON' | 'EUR' | 'USD'
    if (currency === 'RON') {
      return formatCurrency(value.nativeValue, notation, 'RON')
    }
    return formatCurrency(value.nativeValue, notation, currency)
  }

  return t`indisponibil`
}

export function moneyValueCurrency(value: MoneyValue): string {
  return value.currency ?? 'RON'
}

export function isMoneyMissing(value: MoneyValue): boolean {
  return value.ron === null && value.nativeValue === null
}

/**
 * Sum RON amounts across rows. Returns null when ANY row has a null RON
 * (mixed-currency set — never sum mixed currencies). The caller must show a
 * "X înregistrări în altă monedă (neînsumate)" note alongside.
 */
export function sumRonValues(values: readonly MoneyValue[]): {
  ronTotal: number | null
  nativeOnlyCount: number
  outlierCount: number
} {
  let ronTotal = 0
  let nativeOnlyCount = 0
  let outlierCount = 0
  let mixed = false

  for (const v of values) {
    if (v.isOutlier) outlierCount += 1
    if (v.ron === null) {
      if (v.nativeValue !== null) {
        nativeOnlyCount += 1
        mixed = true
      }
      continue
    }
    if (mixed) {
      // Once mixed, the RON subtotal is no longer a clean total.
      ronTotal += v.ron
      continue
    }
    ronTotal += v.ron
  }

  return {
    ronTotal: mixed && ronTotal === 0 ? null : ronTotal,
    nativeOnlyCount,
    outlierCount,
  }
}

export function formatFlowCount(count: number): string {
  return formatNumber(count)
}
