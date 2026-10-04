import {
  FINANCIAL_METRICS,
  FINANCIAL_SOURCE_METRICS,
  type FinancialMetric,
  type FinancialSourceMetric,
  type PrivateCompanyFinancialYear,
  type PrivateCompanyMetricStatus,
  type PrivateCompanyStatementQualification,
} from '@/schemas/private-company'
import { SUMMARY_METRICS } from '../../lib/financial-qualification'

/**
 * MOCK AND TEST DATA ONLY. A synthetic qualification consistent with a
 * statement's own values, as the evaluator states it for an admitted, unheld
 * statement: a present value reported, an absent one missing, the net as
 * profit − loss (missing when both are absent). Never used on live data,
 * where the qualification comes from the API.
 */

export type StatementValues = Omit<PrivateCompanyFinancialYear, 'originals' | 'source' | 'qualification'>

/** The synthetic policy every mock statement is qualified under. */
export const MOCK_POLICY = {
  releaseId: '2',
  policyVersion: 'companies-analytics-admission-2026-10-02-q1',
  policySha256: 'a1'.repeat(32),
  policyApprovedOn: '2026-10-02',
  evaluatorVersion: 'sql-v1',
} as const

export function originalsOf(year: StatementValues): Record<FinancialSourceMetric, string | null> {
  const text = (value: number | null | undefined) => (value === null || value === undefined ? null : String(value))
  const originals = Object.fromEntries(FINANCIAL_SOURCE_METRICS.map((metric) => [metric, null])) as Record<FinancialSourceMetric, string | null>
  originals.turnover = text(year.turnover)
  originals.net_profit = text(year.netProfit)
  originals.net_loss = text(year.netLoss)
  originals.employees = text(year.employees)
  for (const [key, metric] of Object.entries(SUMMARY_METRICS) as [keyof typeof SUMMARY_METRICS, FinancialSourceMetric][]) {
    originals[metric] = text(year.summary?.[key])
  }
  return originals
}

export function admittedQualification(
  year: StatementValues,
  overrides: Partial<Record<FinancialMetric, PrivateCompanyMetricStatus>> = {},
): PrivateCompanyStatementQualification {
  const originals = originalsOf(year)
  const statuses = Object.fromEntries(
    FINANCIAL_METRICS.map((metric) => {
      if (metric === 'net_result') return [metric, year.netProfit === null && year.netLoss === null ? 'missing' : 'reported']
      return [metric, originals[metric] === null ? 'missing' : 'reported']
    }),
  ) as Record<FinancialMetric, PrivateCompanyMetricStatus>
  Object.assign(statuses, overrides)
  const net = year.netProfit === null && year.netLoss === null ? null : (year.netProfit ?? 0) - (year.netLoss ?? 0)
  return {
    assessment: 'assessed',
    reason: null,
    ...MOCK_POLICY,
    statuses,
    netResult: statuses.net_result === 'reported' && net !== null ? String(net) : null,
    holdReason: null,
    holdDrift: [],
  }
}

/** A mock statement with its exact texts and a consistent qualification. */
export function qualifiedStatement(year: StatementValues): PrivateCompanyFinancialYear {
  return { ...year, originals: originalsOf(year), source: null, qualification: admittedQualification(year) }
}
