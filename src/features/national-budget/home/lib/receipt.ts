import { absDecimal, isNegative, plotOf } from '@/features/national-budget/analytics/lib/exact'
import { changeText, type HundredLine } from '../hooks/use-person-data'
import { restOf } from './home-format'
import { outOfHundred, perResident } from './per-resident'

export type ReceiptLine = Pick<HundredLine, 'key' | 'label' | 'hint' | 'rest'> & {
  /** Whole lei per resident: the lines make the receipt's total exactly. */
  readonly perResident: number
  /** The change per resident on a year earlier, each year over its own population; null without the earlier amount. */
  readonly change: string | null
}

export type ResidentLines = {
  readonly lines: readonly ReceiptLine[]
  /** The year's spending per resident, in whole lei. */
  readonly total: number
  /** The same, unrounded. */
  readonly each: number
}

export type Receipt = ResidentLines & {
  /** What covered the total, in the same whole lei: only when the bulletin prints both revenue and the balance. */
  readonly split: { readonly receipts: number; readonly deficit: number } | null
  /** Lei per resident in an average month of the window. */
  readonly monthly: number
}

/**
 * The spending lines at one resident's scale: each line's official amount over the resident population,
 * apportioned to whole lei (largest remainders) so the lines make the rounded total, never rounded one by one.
 * The 100-lei lists leave out a rest under half a lei of 100; it is kept here as its own line, so it is never
 * spread over the named ones. The receipt and the flow's spending rows both print these figures, so one line reads
 * the same in both. Null without a population or without the lines (a total alone is not a receipt).
 */
export function residentLinesOf({
  lines,
  whole,
  year,
  rest,
}: {
  readonly lines: readonly HundredLine[]
  readonly whole: string | null
  readonly year: number
  /** „The rest"'s words, for a rest the 100-lei lists left out. */
  readonly rest: { readonly label: string; readonly hint: string }
}): ResidentLines | null {
  const each = perResident(whole, year)
  if (whole === null || each === null || !lines.length) return null
  const total = Math.round(each)
  const left = lines.some((line) => line.rest) ? null : restOf(whole, lines.map((line) => line.exact))
  const all = left !== null && (plotOf(left) ?? 0) > 0 ? [...lines, { key: 'rest', ...rest, exact: left, before: null, rest: true }] : lines
  const shares = outOfHundred(all.map((line) => plotOf(line.exact) ?? 0), total)
  const changeOf = (line: Pick<HundredLine, 'exact' | 'before'>) => {
    const now = perResident(line.exact, year)
    const before = perResident(line.before, year - 1)
    return now === null || before === null ? null : changeText(String(now), String(before))
  }
  return {
    lines: all
      .map((line, index) => ({ key: line.key, label: line.label, hint: line.hint, rest: line.rest, perResident: shares[index] ?? 0, change: changeOf(line) }))
      .filter((line) => !line.rest || line.perResident > 0),
    total,
    each,
  }
}

/**
 * The year's spending at one resident's scale, as the receipt prints it: the lines (`residentLinesOf`), and what
 * covered the total. The cash deficit per resident is rounded on its own, as every other section prints it, and
 * the receipts are the rest of the total; both only when the bulletin prints revenue and the balance (a missing
 * one is never taken for nothing).
 */
export function receiptOf(input: Parameters<typeof residentLinesOf>[0] & { readonly revenue: string | null; readonly balance: string | null; readonly months: number }): Receipt | null {
  const base = residentLinesOf(input)
  if (!base) return null
  const { balance, revenue } = input
  const deficit = balance !== null && isNegative(balance) ? Math.round(perResident(absDecimal(balance), input.year) ?? 0) : 0
  return {
    ...base,
    split: revenue !== null && balance !== null ? { receipts: base.total - deficit, deficit } : null,
    monthly: base.each / input.months,
  }
}
