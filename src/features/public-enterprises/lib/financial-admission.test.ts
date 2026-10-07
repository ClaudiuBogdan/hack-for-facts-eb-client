import { describe, expect, it } from 'vitest'
import { FINANCIAL_METRICS, privateCompanyMetricStatusSchema } from '@/schemas/private-company'
import { METRIC_STATUSES, QUALIFIED_METRICS, admittedNet, admittedValue, type FinancialStatementRead } from './financial-admission'

const reported = (metric: string) => ({ metric, status: 'REPORTED' })
/** Every metric the qualification lists, reported unless named otherwise. */
const allMetrics = (overrides: Readonly<Record<string, string>> = {}) => QUALIFIED_METRICS.map((metric) => ({ metric, status: overrides[metric] ?? 'REPORTED' }))

/** A 2024 statement as the API returns it, every metric reported, its net a loss. */
function statement(overrides: Partial<FinancialStatementRead> = {}): FinancialStatementRead {
  return {
    year: 2024,
    sourceSystem: 'anaf',
    turnover: '9659879145',
    employees: '3537',
    qualification: {
      assessment: 'ASSESSED',
      evaluatorVersion: 'sql-v1',
      metrics: allMetrics(),
      netResultStatus: 'REPORTED',
      netResult: '-354232258',
    },
    ...overrides,
  }
}

describe('the financial admission rule', () => {
  it('admits a value the evaluator reported, as exact text, and its own net result', () => {
    expect(admittedValue(statement(), 'turnover')).toBe('9659879145')
    expect(admittedValue(statement(), 'employees')).toBe('3537')
    expect(admittedNet(statement())).toBe('-354232258')
  })

  it('keeps out a held or missing metric, though the statement has a value for it', () => {
    const held = statement({
      employees: '92149177',
      qualification: { ...statement().qualification, metrics: allMetrics({ employees: 'HELD_OBSERVATION' }) },
    })
    expect(admittedValue(held, 'employees')).toBeNull()
    expect(admittedValue(held, 'turnover')).toBe('9659879145')
  })

  it('keeps out a whole statement that was not assessed, or by another evaluator', () => {
    const unassessed = statement({ qualification: { ...statement().qualification, assessment: 'NOT_ASSESSED' } })
    const otherEvaluator = statement({ qualification: { ...statement().qualification, evaluatorVersion: 'sql-v2' } })
    const none = statement({ qualification: null })
    for (const read of [unassessed, otherEvaluator, none]) {
      expect(admittedValue(read, 'turnover')).toBeNull()
      expect(admittedNet(read)).toBeNull()
    }
  })

  it('reads profit and loss only from the evaluator’s net result, never from the profit and loss fields', () => {
    const heldNet = statement({ qualification: { ...statement().qualification, metrics: allMetrics({ net_result: 'HELD_PROFILE' }), netResultStatus: 'HELD_PROFILE', netResult: null } })
    expect(admittedNet(heldNet)).toBeNull()
    expect(admittedValue(heldNet, 'turnover')).toBe('9659879145')
  })

  it('keeps out a whole statement whose qualification does not hold together, as the company pages do', () => {
    const base = statement().qualification!
    const malformed = [
      // The net's two statuses disagree.
      { ...base, metrics: allMetrics({ net_result: 'HELD_PROFILE' }) },
      // Reported with no value, or a value without being reported.
      { ...base, netResult: null },
      { ...base, metrics: allMetrics({ net_result: 'MISSING' }), netResultStatus: 'MISSING' },
      // A metric missing, listed twice, or with a status no policy has.
      { ...base, metrics: allMetrics().filter((entry) => entry.metric !== 'debts') },
      { ...base, metrics: [...allMetrics(), reported('turnover')] },
      { ...base, metrics: allMetrics({ debts: 'DOUBTFUL' }) },
    ]
    for (const qualification of malformed) {
      const read = statement({ qualification })
      expect(admittedValue(read, 'turnover')).toBeNull()
      expect(admittedNet(read)).toBeNull()
    }
  })

  it('lists the same metrics and statuses as the companies schema', () => {
    expect([...QUALIFIED_METRICS]).toEqual([...FINANCIAL_METRICS])
    expect([...METRIC_STATUSES]).toEqual([...privateCompanyMetricStatusSchema.options])
  })

  it('refuses a value that is not plain decimal text', () => {
    expect(admittedValue(statement({ turnover: '9.659.879.145' }), 'turnover')).toBeNull()
    expect(admittedNet(statement({ qualification: { ...statement().qualification, netResult: '1e9' } }))).toBeNull()
  })
})
