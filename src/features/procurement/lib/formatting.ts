import { t } from '@lingui/core/macro'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { MoneyFields } from '@/schemas/procurement'

/**
 * Procurement money formatting helpers. Money arrives as flat fields mirroring
 * the server DTO: `valueRon` is a RON **decimal string** (or null), `isRon`
 * says whether a RON amount is available, `valueSuspect` flags an outlier. There
 * is no native value — prod does not expose one, so non-RON rows show only the
 * currency code (handled by `ValueWithCurrency`), never an invented amount.
 */

/** Parse a RON decimal string ('1171228.00') to a number, or null. */
export function parseRon(valueRon: string | null | undefined): number | null {
  if (valueRon === null || valueRon === undefined) return null
  const n = Number(valueRon)
  return Number.isFinite(n) ? n : null
}

/** Format a RON decimal string. Returns `indisponibil` when null/unparseable. */
export function formatRon(
  valueRon: string | null | undefined,
  notation: 'standard' | 'compact' = 'standard',
): string {
  const n = parseRon(valueRon)
  if (n === null) return t`indisponibil`
  return formatCurrency(n, notation, 'RON')
}

/**
 * Honest money string for a primary value. RON when a RON amount is present;
 * otherwise `indisponibil` — the caller (`ValueWithCurrency`) shows the currency
 * code separately. Never folds non-RON into RON.
 */
export function formatMoneyValue(
  money: MoneyFields,
  notation: 'standard' | 'compact' = 'standard',
): string {
  if (money.isRon && money.valueRon !== null) {
    return formatRon(money.valueRon, notation)
  }
  return t`indisponibil`
}

export function moneyValueCurrency(
  money: Pick<MoneyFields, 'currency'>,
): string {
  return money.currency ?? 'RON'
}

export function isMoneyMissing(money: MoneyFields): boolean {
  return money.valueRon === null
}

/**
 * Sum RON amounts across rows. Sums only rows that carry a RON amount; non-RON
 * rows are reported separately and never folded into the total. `valueSuspect`
 * rows are counted so the caller can warn. `ronTotal` is null when no row has a
 * RON amount.
 */
export function sumRonValues(values: readonly MoneyFields[]): {
  ronTotal: number | null
  nonRonCount: number
  suspectCount: number
} {
  let ronTotal = 0
  let ronRows = 0
  let nonRonCount = 0
  let suspectCount = 0

  for (const v of values) {
    if (v.valueSuspect) suspectCount += 1
    const n = parseRon(v.valueRon)
    if (v.isRon && n !== null) {
      ronTotal += n
      ronRows += 1
    } else {
      nonRonCount += 1
    }
  }

  return {
    ronTotal: ronRows > 0 ? ronTotal : null,
    nonRonCount,
    suspectCount,
  }
}

/** Format an aggregate count (bigint decimal string) or a plain number. */
export function formatFlowCount(count: string | number): string {
  const n = typeof count === 'number' ? count : Number(count)
  return formatNumber(Number.isFinite(n) ? n : 0)
}

/** Format a server ratio (`0.5000`) as a locale-aware percentage (`50%`). */
export function formatScopeShare(share: string): string {
  return `${formatNumber(Number(share) * 100)}%`
}

/**
 * Build a money slice for an aggregate RON sum (`amountRonSum`). The sum is RON
 * or null (not summable); never suspect at the aggregate level.
 */
export function ronAmountSlice(valueRon: string | null): MoneyFields {
  return { valueRon, currency: 'RON', isRon: valueRon !== null, valueSuspect: false }
}
