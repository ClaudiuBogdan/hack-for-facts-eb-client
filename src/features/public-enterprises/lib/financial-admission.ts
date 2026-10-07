/**
 * The companies module's admission policy, as the hub's generator applies it
 * to the raw `companyFinancials` reads, the same rule the company pages read
 * through (`src/features/private-companies/lib/financial-qualification.ts`,
 * whose mapper `company-mappers.ts` `mapQualification` rejects the same
 * malformed qualifications):
 * a statement's value enters a figure only when the `sql-v1` evaluator
 * assessed the statement and reported that metric; profit and loss are the
 * evaluator's own net result, never a local subtraction. Held, missing,
 * unassessed or otherwise-evaluated values stay out of every count and
 * ranking.
 *
 * Plain functions with no imports: `scripts/generate-public-enterprise-hub-fixture.mjs`
 * imports this file directly (Node strips the types).
 */

export const QUALIFICATION_EVALUATOR = 'sql-v1'

/** Every metric a qualification lists, once each: the companies schema's `FINANCIAL_METRICS` (a test holds the two equal). */
export const QUALIFIED_METRICS = [
  'turnover',
  'net_profit',
  'net_loss',
  'employees',
  'total_revenue',
  'total_expenses',
  'gross_profit',
  'gross_loss',
  'receivables',
  'current_assets',
  'fixed_assets',
  'cash_and_bank',
  'prepaid_expenses',
  'deferred_income',
  'subscribed_capital',
  'inventories',
  'debts',
  'provisions',
  'total_equity',
  'patrimony_regie',
  'net_result',
] as const

/** The statuses a metric may have: the companies schema's `privateCompanyMetricStatusSchema` (a test holds the two equal). */
export const METRIC_STATUSES = ['reported', 'missing', 'not_admitted', 'held_profile', 'held_observation', 'held_quality', 'held_component'] as const

/** One statement as `companyFinancials { years { … qualification { … } } }` returns it. */
export type FinancialStatementRead = {
  readonly year: number
  readonly sourceSystem?: string | null
  readonly turnover?: string | null
  readonly employees?: string | null
  readonly qualification?: {
    readonly assessment?: string | null
    readonly evaluatorVersion?: string | null
    readonly metrics?: readonly { readonly metric: string; readonly status?: string | null }[] | null
    readonly netResultStatus?: string | null
    readonly netResult?: string | null
  } | null
}

const PLAIN_DECIMAL = /^-?\d+(?:\.\d+)?$/u

const knownStatus = (raw: string | null | undefined): string | null => {
  const status = raw?.toLowerCase() ?? null
  return status !== null && (METRIC_STATUSES as readonly string[]).includes(status) ? status : null
}

/**
 * The statement was assessed, by the evaluator this rule understands, and its
 * qualification holds together as the company pages require (fail closed):
 * every metric listed once with a known status, the net result's status the
 * same in both places, its value present exactly when it is reported.
 */
export function assessed(statement: FinancialStatementRead): boolean {
  const qualification = statement.qualification
  if (qualification?.assessment?.toLowerCase() !== 'assessed' || qualification.evaluatorVersion !== QUALIFICATION_EVALUATOR) return false
  const statuses = new Map<string, string>()
  for (const entry of qualification.metrics ?? []) {
    const status = knownStatus(entry.status)
    if (status === null || !(QUALIFIED_METRICS as readonly string[]).includes(entry.metric) || statuses.has(entry.metric)) return false
    statuses.set(entry.metric, status)
  }
  if (statuses.size !== QUALIFIED_METRICS.length) return false
  const netStatus = knownStatus(qualification.netResultStatus)
  if (netStatus === null || netStatus !== statuses.get('net_result')) return false
  const net = qualification.netResult ?? null
  return (netStatus === 'reported') === (net !== null) && (net === null || PLAIN_DECIMAL.test(net))
}

/** The evaluator reported this metric. */
export function metricReported(statement: FinancialStatementRead, metric: string): boolean {
  return assessed(statement) && (statement.qualification?.metrics ?? []).some((entry) => entry.metric === metric && entry.status?.toLowerCase() === 'reported')
}

/** A reported source value (`turnover`, `employees`) as exact decimal text; null when not admitted. */
export function admittedValue(statement: FinancialStatementRead, metric: 'turnover' | 'employees'): string | null {
  const value = statement[metric]
  return metricReported(statement, metric) && typeof value === 'string' && PLAIN_DECIMAL.test(value) ? value : null
}

/** The evaluator's own net result, exact text, when reported; null otherwise. */
export function admittedNet(statement: FinancialStatementRead): string | null {
  const qualification = statement.qualification
  const net = qualification?.netResult
  return assessed(statement) && qualification?.netResultStatus?.toLowerCase() === 'reported' && typeof net === 'string' && PLAIN_DECIMAL.test(net) ? net : null
}
