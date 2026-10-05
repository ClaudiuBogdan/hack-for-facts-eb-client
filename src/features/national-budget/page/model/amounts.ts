/**
 * The page's two unit rules, in one place:
 * - approved-budget amounts are thousand lei (`×1000` → lei);
 * - execution facts are already RON (or a fraction for GDP shares).
 * The conversion for one lane is never applied to the other.
 */

/** Approved-budget amount (thousand lei, decimal text) → lei. Exact below 9·10¹² thousand. */
export function approvedAmountToLei(amountThousandLei: string): number {
  return Number(amountThousandLei) * 1000
}

/** Execution amount (RON, decimal text) → lei; RON and lei are the same unit. */
export function executionAmountToLei(valueRon: string): number {
  return Number(valueRon)
}

/** Execution GDP share (a fraction, decimal text) → percent. */
export function executionShareToPercent(fraction: string): number {
  return Number(fraction) * 100
}

export const LEI_PER_BILLION = 1_000_000_000
