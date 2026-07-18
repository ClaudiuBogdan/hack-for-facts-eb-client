import { t } from '@lingui/core/macro'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { MoneyFields } from '@/schemas/procurement'

/**
 * Procurement money formatting helpers. Money arrives as a `MoneyFields` slice:
 * `valueRon` is the row's OWN parsed RON evidence (decimal string or null), and
 * `value` is the data-layer resolution (rules v2) — or null for unresolved
 * slices (an estimated value, a modification delta, an aggregate sum).
 *
 * The honest display keys on the RESOLUTION, never the raw own value: an
 * `invalid_source_value` row carries a garbage `valueRon`, so only
 * `value.valueRonComparable` (present iff accepted, or a BNR-derived comparable)
 * is ever shown as money. Non-RON / framework / conflicting rows show a state,
 * never an invented amount.
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
 * The display verdict for a money slice, derived from the value resolution:
 * - `ron`      — a comparable RON amount is available (`basis` = 'official' or
 *                'derived_bnr'); also the plain path for unresolved slices.
 * - `foreign`  — foreign-currency-only; `comparable` is a BNR-derived RON hint
 *                when present (contracts), else null.
 * - `suspect`  — `invalid_source_value` (a corrupted/out-of-bounds source token).
 * - `framework`— `ambiguous_grain` (a framework/acord-cadru ceiling, not a spend).
 * - `conflict` — `conflicting_sources` (own/cross evidence disagree).
 * - `missing`  — `source_missing` / `not_applicable` / unresolved-and-empty.
 */
export type MoneyDisplay =
  | { readonly kind: 'ron'; readonly ron: number; readonly basis: string | null }
  | {
      readonly kind: 'foreign'
      readonly currency: string
      readonly comparable: number | null
    }
  | { readonly kind: 'suspect' }
  | { readonly kind: 'framework' }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'missing' }

export function describeMoney(money: MoneyFields): MoneyDisplay {
  const { value } = money
  // Unresolved slice (estimated value, modification delta, aggregate sum): a
  // plain RON figure with no state — shown as-is when present.
  if (value === null) {
    const n = parseRon(money.valueRon)
    return n !== null ? { kind: 'ron', ron: n, basis: null } : { kind: 'missing' }
  }

  const comparable = parseRon(value.valueRonComparable)
  if (value.valueAccepted && comparable !== null) {
    return { kind: 'ron', ron: comparable, basis: value.valueComparableBasis }
  }

  switch (value.valueState) {
    case 'foreign_currency_only':
      return { kind: 'foreign', currency: money.currency ?? '—', comparable }
    case 'invalid_source_value':
      return { kind: 'suspect' }
    case 'ambiguous_grain':
      return { kind: 'framework' }
    case 'conflicting_sources':
      return { kind: 'conflict' }
    default:
      // source_missing, not_applicable, null, or (defensively) an accepted state
      // whose comparable is unexpectedly absent.
      return { kind: 'missing' }
  }
}

/**
 * Honest money string for a primary value. Returns a RON amount only when the
 * resolution yields a comparable one; otherwise `indisponibil` — the caller
 * (`ValueWithCurrency`) surfaces the state (currency, suspect, framework…).
 */
export function formatMoneyValue(
  money: MoneyFields,
  notation: 'standard' | 'compact' = 'standard',
): string {
  const display = describeMoney(money)
  return display.kind === 'ron'
    ? formatCurrency(display.ron, notation, 'RON')
    : t`indisponibil`
}

export function moneyValueCurrency(
  money: Pick<MoneyFields, 'currency'>,
): string {
  return money.currency ?? 'RON'
}

/** True when the slice has no comparable RON amount to show. */
export function isMoneyMissing(money: MoneyFields): boolean {
  return describeMoney(money).kind !== 'ron'
}

/**
 * Sum comparable RON amounts across rows. Sums only rows whose resolution yields
 * a comparable RON value; foreign rows are reported via `nonRonCount` and
 * `invalid_source_value` rows via `suspectCount` so the caller can warn.
 * `ronTotal` is null when no row has a comparable amount. Framework / conflicting
 * / missing rows are excluded from the total and never folded in.
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
    const display = describeMoney(v)
    switch (display.kind) {
      case 'ron':
        ronTotal += display.ron
        ronRows += 1
        break
      case 'foreign':
        nonRonCount += 1
        break
      case 'suspect':
        suspectCount += 1
        break
      case 'framework':
      case 'conflict':
      case 'missing':
        break
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
 * Build a money slice for an aggregate RON sum (`amountRonSum`). The sum is a
 * plain RON figure (or null when not summable) with no per-value resolution.
 */
export function ronAmountSlice(valueRon: string | null): MoneyFields {
  return { valueRon, currency: 'RON', value: null }
}
