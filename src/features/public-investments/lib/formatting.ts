/**
 * Public Investments — money trust boundary helpers.
 *
 * The adapter excludes `suspect_x1000` amounts from every trusted aggregate
 * (landing KPIs, search totals, territory summaries, absorption %, map
 * heatmap metrics, range filters). `precision_warning` amounts keep their real
 * percentage in data; components may clamp the visual later. UI components
 * receive precomputed `MoneyValue` + `absorptionPct` and never divide raw
 * money themselves.
 */

import type {
  MoneyValue,
  ObjectiveSummary,
  PaymentFact,
} from './types'

/** A MoneyValue is trusted for aggregation only when it is not suspect_x1000. */
export function isMoneyTrusted(value: MoneyValue | null | undefined): boolean {
  if (!value) return false
  return value.confidence !== 'suspect_x1000'
}

/** A MoneyValue is suspect (×1000 inflation bug) and must not be aggregated. */
export function isMoneySuspect(value: MoneyValue | null | undefined): boolean {
  if (!value) return false
  return value.confidence === 'suspect_x1000'
}

/** A MoneyValue is a precision warning (decontat > contractat source anomaly). */
export function isMoneyPrecisionWarning(
  value: MoneyValue | null | undefined,
): boolean {
  if (!value) return false
  return value.confidence === 'precision_warning'
}

/**
 * Sum a set of MoneyValues excluding any suspect_x1000 entries. The returned
 * MoneyValue carries the worst confidence of the contributors: `ok` if all
 * trusted, `precision_warning` if any contributor was a warning (the total is
 * still real but one source row has the >100% anomaly), and `suspect_x1000`
 * only if every contributor was suspect (degenerate all-suspect case where the
 * total itself cannot be trusted).
 */
export function computeTrustedMoneyTotal(
  values: readonly (MoneyValue | null | undefined)[],
  evidenceRefHint?: MoneyValue | null,
): MoneyValue {
  const trusted: MoneyValue[] = []
  for (const value of values) {
    if (value && isMoneyTrusted(value) && value.amount != null) {
      trusted.push(value)
    }
  }

  if (trusted.length === 0) {
    return {
      amount: null,
      confidence: 'suspect_x1000',
      raw: evidenceRefHint?.raw ?? null,
    }
  }

  const total = trusted.reduce((sum, value) => sum + (value.amount ?? 0), 0)
  const hasWarning = trusted.some((value) => value.confidence === 'precision_warning')
  const allSuspect = values.every(
    (value) => value == null || isMoneySuspect(value),
  )

  return {
    amount: total,
    confidence: allSuspect ? 'suspect_x1000' : hasWarning ? 'precision_warning' : 'ok',
    raw: evidenceRefHint?.raw ?? null,
  }
}

/**
 * Compute absorption = reimbursed / contracted, clamped 0..100.
 * Returns `null` when contracted is 0/unknown or when either amount is
 * `suspect_x1000` (per design.md §6). For `precision_warning` rows the real
 * percentage is preserved (may exceed 100) so components can clamp later.
 */
export function computeAbsorptionPct(
  contracted: MoneyValue | null | undefined,
  reimbursed: MoneyValue | null | undefined,
): number | null {
  if (!isMoneyTrusted(contracted) || !isMoneyTrusted(reimbursed)) {
    return null
  }
  const contractedAmount = contracted?.amount
  const reimbursedAmount = reimbursed?.amount
  if (contractedAmount == null || reimbursedAmount == null) {
    return null
  }
  if (contractedAmount === 0) {
    return null
  }
  const ratio = reimbursedAmount / contractedAmount
  const pct = ratio * 100
  if (!Number.isFinite(pct)) {
    return null
  }

  // Precision-warning preserves the real (possibly >100) percentage; trusted
  // rows are clamped to 0..100. Round to one decimal to avoid float noise
  // (e.g. 3_450_000 / 3_000_000 * 100 = 114.9999...).
  if (isMoneyPrecisionWarning(contracted) || isMoneyPrecisionWarning(reimbursed)) {
    return Math.max(0, Math.round(pct * 10) / 10)
  }
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10))
}

/**
 * Whether an objective should be excluded from amount / absorption range
 * filters because its relevant amount is suspect_x1000.
 */
export function isExcludedFromAmountRange(
  objective: ObjectiveSummary,
  amountField: 'contracted' | 'reimbursed' | 'allocated',
): boolean {
  const value =
    amountField === 'contracted'
      ? objective.contracted
      : amountField === 'reimbursed'
        ? objective.reimbursed
        : objective.allocated
  return isMoneySuspect(value)
}

/** Count of suspect objectives excluded from range filters / totals. */
export function countExcludedSuspect(
  objectives: readonly ObjectiveSummary[],
  amountField: 'contracted' | 'reimbursed' | 'allocated' = 'contracted',
): number {
  return objectives.reduce(
    (count, objective) =>
      count + (isExcludedFromAmountRange(objective, amountField) ? 1 : 0),
    0,
  )
}

/** Sort comparator for objective rows used by the mock search/territory adapters. */
export function compareObjectives(
  a: ObjectiveSummary,
  b: ObjectiveSummary,
  sort: 'contracted' | 'reimbursed' | 'absorption' | 'title' | 'county' | 'stage',
  order: 'asc' | 'desc',
): number {
  const direction = order === 'asc' ? 1 : -1

  const compareSortableAmounts = (
    aValue: MoneyValue | null | undefined,
    bValue: MoneyValue | null | undefined,
  ): number => {
    const aSuspect = isMoneySuspect(aValue)
    const bSuspect = isMoneySuspect(bValue)
    if (aSuspect && bSuspect) return 0
    if (aSuspect) return 1
    if (bSuspect) return -1

    const aAmount = aValue?.amount ?? null
    const bAmount = bValue?.amount ?? null
    if (aAmount == null && bAmount == null) return 0
    if (aAmount == null) return 1
    if (bAmount == null) return -1
    return (aAmount - bAmount) * direction
  }

  switch (sort) {
    case 'contracted': {
      return compareSortableAmounts(a.contracted, b.contracted)
    }
    case 'reimbursed': {
      return compareSortableAmounts(a.reimbursed, b.reimbursed)
    }
    case 'absorption': {
      const aSuspect = isMoneySuspect(a.contracted) || isMoneySuspect(a.reimbursed)
      const bSuspect = isMoneySuspect(b.contracted) || isMoneySuspect(b.reimbursed)
      if (aSuspect && bSuspect) return 0
      if (aSuspect) return 1
      if (bSuspect) return -1
      // null absorption sorts last.
      if (a.absorptionPct == null && b.absorptionPct == null) return 0
      if (a.absorptionPct == null) return 1
      if (b.absorptionPct == null) return -1
      return (a.absorptionPct - b.absorptionPct) * direction
    }
    case 'title':
      return a.title.localeCompare(b.title, 'ro') * direction
    case 'county':
      return a.county.localeCompare(b.county, 'ro') * direction
    case 'stage':
      return a.stage.bucket.localeCompare(b.stage.bucket, 'ro') * direction
    default:
      return 0
  }
}

/** Sort comparator for payment facts used by the mock Plăți tab. */
export function comparePayments(
  a: PaymentFact,
  b: PaymentFact,
  sort: 'date' | 'amount' | 'cumulative',
  order: 'asc' | 'desc',
): number {
  const direction = order === 'asc' ? 1 : -1
  const compareSortableAmounts = (
    aValue: MoneyValue | null | undefined,
    bValue: MoneyValue | null | undefined,
  ): number => {
    const aSuspect = isMoneySuspect(aValue)
    const bSuspect = isMoneySuspect(bValue)
    if (aSuspect && bSuspect) return 0
    if (aSuspect) return 1
    if (bSuspect) return -1

    const aAmount = aValue?.amount ?? null
    const bAmount = bValue?.amount ?? null
    if (aAmount == null && bAmount == null) return 0
    if (aAmount == null) return 1
    if (bAmount == null) return -1
    return (aAmount - bAmount) * direction
  }

  switch (sort) {
    case 'date': {
      if (a.date == null && b.date == null) return 0
      if (a.date == null) return 1
      if (b.date == null) return -1
      return a.date.localeCompare(b.date) * direction
    }
    case 'amount': {
      return compareSortableAmounts(a.amount, b.amount)
    }
    case 'cumulative': {
      return compareSortableAmounts(a.cumulative, b.cumulative)
    }
    default:
      return 0
  }
}
