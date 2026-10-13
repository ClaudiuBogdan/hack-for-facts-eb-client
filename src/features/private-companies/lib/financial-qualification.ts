import {
  FINANCIAL_SOURCE_METRICS,
  type FinancialMetric,
  type FinancialSourceMetric,
  type PrivateCompanyFinancialSummary,
  type PrivateCompanyFinancialYear,
  type PrivateCompanyMetricStatus,
  type PrivateCompanyStatementQualification,
} from '@/schemas/private-company'

/**
 * The one door from a statement to a figure. The API sends every statement's
 * exact source values and its qualification under the published admission
 * policy (evaluator sql-v1); a figure, a chart, a sentence or a comparison
 * reads a value only through here, and only when the evaluator REPORTED it.
 * A held, missing, unassessed or unqualified value stays a source observation:
 * shown apart with its status, never summed, charted or compared. A response
 * without a qualification is `not_assessed`, never reported.
 */

/** The evaluator this page understands; any other is not assessed. */
export const QUALIFICATION_EVALUATOR = 'sql-v1'

export function notAssessed(reason: string): PrivateCompanyStatementQualification {
  return {
    assessment: 'not_assessed',
    reason,
    releaseId: null,
    policyVersion: null,
    policySha256: null,
    policyApprovedOn: null,
    evaluatorVersion: null,
    statuses: null,
    netResult: null,
    holdReason: null,
    holdDrift: [],
  }
}

/** The metric's status, or null when the statement was not assessed. */
export function metricStatus(year: PrivateCompanyFinancialYear, metric: FinancialMetric): PrivateCompanyMetricStatus | null {
  const { qualification } = year
  return qualification.assessment === 'assessed' ? (qualification.statuses?.[metric] ?? null) : null
}

const PLAIN_DECIMAL = /^-?\d+(?:\.\d+)?$/u

/** A number for display arithmetic (ratios, scales), from exact text only. */
function decimalNumber(text: string | null | undefined): number | null {
  if (text === null || text === undefined || !PLAIN_DECIMAL.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

/** A source value a figure may use: only when the evaluator reported it. */
export function reportedNumber(year: PrivateCompanyFinancialYear, metric: FinancialSourceMetric): number | null {
  return metricStatus(year, metric) === 'reported' ? decimalNumber(year.originals[metric]) : null
}

/**
 * The net result a figure may use: the evaluator's own (profit − loss, an
 * absent side as zero only where the policy admits it), never a local
 * subtraction: a layout whose loss is never typed has its profit reported and
 * its net held.
 */
export function qualifiedNet(year: PrivateCompanyFinancialYear): number | null {
  return metricStatus(year, 'net_result') === 'reported' ? decimalNumber(year.qualification.netResult) : null
}

/**
 * A statement's bottom line as a figure may show it, with its identity.
 * `result`: the evaluator's net result. `profit`: no admitted result, but a
 * positive net profit the evaluator admitted beside no typed net loss at all —
 * the layout ANAF serves the largest companies on (464d…) types no net loss,
 * so their result is held while their profit is not. The two are different
 * metrics: a profit is never called the net result, never added into one and
 * never compared with one. A zero profit beside an unknown loss says nothing
 * (a company with a loss files a zero profit), so it is no figure, nor is any
 * other held, missing or unassessed year.
 */
export type AdmittedNetKind = 'result' | 'profit'

export function admittedNet(year: PrivateCompanyFinancialYear): { readonly value: number; readonly kind: AdmittedNetKind } | null {
  const result = qualifiedNet(year)
  if (result !== null) return { value: result, kind: 'result' }
  const profit = reportedNumber(year, 'net_profit')
  // `missing`: no typed loss value — not a loss held, refused or unassessed. It does not prove the filing has no loss line.
  if (profit !== null && profit > 0 && metricStatus(year, 'net_loss') === 'missing') return { value: profit, kind: 'profit' }
  return null
}

/** Two statements may be compared only under one policy, evaluator and release. */
export function comparable(a: PrivateCompanyFinancialYear, b: PrivateCompanyFinancialYear): boolean {
  const left = a.qualification
  const right = b.qualification
  return (
    left.assessment === 'assessed' &&
    right.assessment === 'assessed' &&
    left.policySha256 !== null &&
    left.policySha256 === right.policySha256 &&
    left.evaluatorVersion === right.evaluatorVersion &&
    left.releaseId === right.releaseId
  )
}

/** The balance-sheet keys of `summary` and the source metric each one is. */
export const SUMMARY_METRICS = {
  totalRevenue: 'total_revenue',
  totalExpenses: 'total_expenses',
  grossProfit: 'gross_profit',
  grossLoss: 'gross_loss',
  receivables: 'receivables',
  currentAssets: 'current_assets',
  fixedAssets: 'fixed_assets',
  cashAndBank: 'cash_and_bank',
  prepaidExpenses: 'prepaid_expenses',
  deferredIncome: 'deferred_income',
  subscribedCapital: 'subscribed_capital',
  inventories: 'inventories',
  debts: 'debts',
  provisions: 'provisions',
  totalEquity: 'total_equity',
  patrimonyRegie: 'patrimony_regie',
} as const satisfies Record<keyof PrivateCompanyFinancialSummary, FinancialSourceMetric>

/** A balance-sheet value a figure may use. */
export function reportedSummary(year: PrivateCompanyFinancialYear, key: keyof PrivateCompanyFinancialSummary): number | null {
  return reportedNumber(year, SUMMARY_METRICS[key])
}

/** One value as the statement published it, beside what the evaluator made of it. */
export interface SourceValue {
  readonly metric: FinancialSourceMetric
  /** The exact source text, as published. */
  readonly original: string
  /** Null when the statement was not assessed at all. */
  readonly status: PrivateCompanyMetricStatus | null
}

/**
 * Every value a statement published, reported or not, in the statements'
 * metric order: a reported component (a 464d-like profit) stays as readable as
 * a held value. Inspection only: never summed, charted or compared.
 */
export function sourceValues(year: PrivateCompanyFinancialYear): SourceValue[] {
  return FINANCIAL_SOURCE_METRICS.flatMap((metric) => {
    const original = year.originals[metric]
    return original === null ? [] : [{ metric, original, status: metricStatus(year, metric) }]
  })
}

/**
 * Exact decimal text with digit groups, never through a JavaScript number
 * (which loses cents above ~9×10^13): „300000000000000" → „300.000.000.000.000".
 */
export function exactDecimalText(text: string, locale: 'ro' | 'en'): string {
  if (!PLAIN_DECIMAL.test(text)) return text
  const negative = text.startsWith('-')
  const [whole = '', fraction] = (negative ? text.slice(1) : text).split('.')
  const group = locale === 'ro' ? '.' : ','
  const point = locale === 'ro' ? ',' : '.'
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, group)
  return `${negative ? '−' : ''}${grouped}${fraction === undefined ? '' : `${point}${fraction}`}`
}
