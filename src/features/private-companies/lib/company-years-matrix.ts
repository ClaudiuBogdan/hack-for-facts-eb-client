import { t } from '@lingui/core/macro'
import type { FinancialSourceMetric, PrivateCompanyMetricStatus } from '@/schemas/private-company'
import type { StatementValues } from './company-profile-model'

/**
 * The statements year by year as one matrix: every published value of every
 * statement, a row per indicator and a column per statement, newest first.
 * Years with no statement between two that have one are a single gap column,
 * not a column each. A cell says what the source published and whether the
 * page's figures use it; it never says more than the statement does.
 */

export type MatrixRowKey = FinancialSourceMetric | 'net_result'
export type MatrixGroup = 'results' | 'balance' | 'staff'

export interface MatrixRowSpec {
  readonly key: MatrixRowKey
  readonly group: MatrixGroup
  /** The rows a reader compares first: turnover, the net and the equity. */
  readonly strong?: boolean
  /** A part of the row above it (stocks, receivables and cash of the current assets). */
  readonly indent?: boolean
}

/** The statement's lines as a reader reads them: the results, the balance sheet, the people. */
export const MATRIX_ROWS: readonly MatrixRowSpec[] = [
  { key: 'turnover', group: 'results', strong: true },
  { key: 'total_revenue', group: 'results' },
  { key: 'total_expenses', group: 'results' },
  { key: 'gross_profit', group: 'results' },
  { key: 'gross_loss', group: 'results' },
  { key: 'net_profit', group: 'results', strong: true },
  { key: 'net_loss', group: 'results', strong: true },
  { key: 'net_result', group: 'results' },
  { key: 'fixed_assets', group: 'balance' },
  { key: 'current_assets', group: 'balance' },
  { key: 'inventories', group: 'balance', indent: true },
  { key: 'receivables', group: 'balance', indent: true },
  { key: 'cash_and_bank', group: 'balance', indent: true },
  { key: 'prepaid_expenses', group: 'balance' },
  { key: 'debts', group: 'balance' },
  { key: 'deferred_income', group: 'balance' },
  { key: 'provisions', group: 'balance' },
  { key: 'total_equity', group: 'balance', strong: true },
  { key: 'subscribed_capital', group: 'balance' },
  { key: 'patrimony_regie', group: 'balance' },
  { key: 'employees', group: 'staff' },
]

/** Held after a review or a quality signal: a statement a reader should look at, not a shape the policy leaves out. */
const REVIEW_HOLDS: ReadonlySet<PrivateCompanyMetricStatus> = new Set(['held_observation', 'held_quality'])

export type MatrixCell =
  /** The statement has no such value: not a zero. */
  | { readonly kind: 'absent' }
  /**
   * A value as the source published it: its exact text, a number for its
   * scale only, its status (null when the statement was not assessed), and
   * whether the page's figures use it.
   */
  | { readonly kind: 'value'; readonly original: string; readonly number: number | null; readonly status: PrivateCompanyMetricStatus | null; readonly counted: boolean }
  /** The net result the evaluator derives, held: no value at all, only why. */
  | { readonly kind: 'held'; readonly status: PrivateCompanyMetricStatus }

export type MatrixColumn =
  | {
      readonly kind: 'statement'
      readonly statement: StatementValues
      /** Something in it a reader should look at: not assessed, on another basis, held after a review or a quality signal. */
      readonly flagged: boolean
    }
  /** Years with no published statement, between two that have one: unknown, never zero. */
  | { readonly kind: 'gap'; readonly from: number; readonly to: number }

export interface MatrixRow {
  readonly spec: MatrixRowSpec
  /** One per column, gap columns included (always absent there). */
  readonly cells: readonly MatrixCell[]
}

export interface YearsMatrix {
  readonly columns: readonly MatrixColumn[]
  /** Only the rows some statement published; a regie's patrimony only when one is not zero. */
  readonly rows: readonly MatrixRow[]
}

function displayNumber(text: string): number | null {
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

function cellOf(statement: StatementValues, key: MatrixRowKey): MatrixCell {
  const counted = statement.notAssessed === null && !statement.otherBasis
  if (key === 'net_result') {
    const net = statement.netResult
    if (net === null || net.status === 'missing') return { kind: 'absent' }
    if (net.status === 'reported' && net.value !== null) {
      return { kind: 'value', original: net.value, number: displayNumber(net.value), status: 'reported', counted }
    }
    return { kind: 'held', status: net.status }
  }
  const value = statement.values.find((entry) => entry.metric === key)
  if (!value) return { kind: 'absent' }
  return { kind: 'value', original: value.original, number: displayNumber(value.original), status: value.status, counted: counted && value.status === 'reported' }
}

function flagged(statement: StatementValues): boolean {
  if (statement.notAssessed !== null || statement.otherBasis || statement.holdReason !== null) return true
  const net = statement.netResult?.status ?? null
  return statement.values.some((value) => value.status !== null && REVIEW_HOLDS.has(value.status)) || (net !== null && REVIEW_HOLDS.has(net))
}

/** The matrix of `statements` (newest first, as the model lists them). */
export function yearsMatrix(statements: readonly StatementValues[]): YearsMatrix {
  const columns: MatrixColumn[] = []
  statements.forEach((statement, index) => {
    const newer = statements[index - 1]
    if (newer && newer.year - statement.year > 1) columns.push({ kind: 'gap', from: statement.year + 1, to: newer.year - 1 })
    columns.push({ kind: 'statement', statement, flagged: flagged(statement) })
  })
  const rows = MATRIX_ROWS.map((spec) => ({
    spec,
    cells: columns.map((column): MatrixCell => (column.kind === 'gap' ? { kind: 'absent' } : cellOf(column.statement, spec.key))),
  })).filter((row) => {
    const present = row.cells.filter((cell) => cell.kind !== 'absent')
    if (present.length === 0) return false
    // A company that is no regie publishes the regie's line as zero: a row of zeros says nothing.
    if (row.spec.key === 'patrimony_regie') return present.some((cell) => cell.kind === 'value' && cell.number !== 0)
    return true
  })
  return { columns, rows }
}

/**
 * A reviewer's reason for holding a statement, in the reader's words; the
 * reason as recorded stays beside it as provenance. A reason this page does
 * not know is said generally, never printed as the reader's explanation.
 */
export function holdReasonText(reason: string): string {
  switch (reason) {
    case 'reviewed_suspect_statement':
      return t`La verificare, bilanțul a fost reținut ca suspect: valorile publicate nu sunt plauzibile.`
    case 'reviewed_invalid_or_repeated_digit_employee_count':
      return t`La verificare, numărul de salariați a fost reținut: e negativ sau format din cifre repetate.`
    default:
      return t`Reținut după o verificare.`
  }
}
