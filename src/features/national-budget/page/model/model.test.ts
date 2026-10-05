import { describe, expect, it } from 'vitest'

import { nationalBudgetMockAdapter as adapter } from '../api/national-budget-page-api.mock'
import { approvedAmountToLei, executionAmountToLei } from './amounts'
import { compare, type ExecutionOperand, type PlanOperand } from './comparability'
import { EXECUTION_LINE_CATALOG, cutRows, executionRows, hasChildren, type ExecutionSection } from './execution-lines'

describe('units', () => {
  it('converts approved thousand lei to lei and leaves execution RON as is', () => {
    expect(approvedAmountToLei('499582980')).toBe(499_582_980_000)
    expect(executionAmountToLei('499435115870.93')).toBeCloseTo(499_435_115_870.93, 2)
  })
})

describe('execution line hierarchy', () => {
  it('each parent equals the sum of its children in both sample releases and both components', async () => {
    for (const month of ['2025-12', '2026-07']) {
      const release = await adapter.getExecutionRelease({ month })
      if (release.status !== 'ok') throw new Error(`no ${month}`)
      for (const component of ['state_budget', 'general_consolidated_budget']) {
        for (const section of ['revenue', 'expenditure'] as ExecutionSection[]) {
          const rows = executionRows(release.facts, { component, section })
          expect(rows.every((row) => row.placed), `${month} ${component} ${section}: unknown line`).toBe(true)
          const catalog: Record<string, { parent: string | null }> = EXECUTION_LINE_CATALOG[section]
          for (const parent of rows) {
            const children = rows.filter((row) => catalog[row.lineItem]?.parent === parent.lineItem)
            if (children.length === 0 || parent.amount === null) continue
            // A blank child (no fact) is not zero; it only adds nothing to this arithmetic check.
            const sum = children.reduce((acc, row) => acc + (row.amount ? Number(row.amount.value) : 0), 0)
            const tolerance = 1_000_000 // lei: the bulletin prints thousands with rounded decimals
            expect(Math.abs(sum - Number(parent.amount.value)), `${month} ${component} ${parent.lineItem}`).toBeLessThan(tolerance)
          }
        }
      }
    }
  })

  it('a cut at any depth adds up to its root, and a cut under a line to that line', async () => {
    for (const month of ['2025-12', '2026-07']) {
      const release = await adapter.getExecutionRelease({ month })
      if (release.status !== 'ok') throw new Error(`no ${month}`)
      for (const component of ['state_budget', 'general_consolidated_budget']) {
        for (const section of ['revenue', 'expenditure'] as ExecutionSection[]) {
          const rows = executionRows(release.facts, { component, section })
          const value = (lineItem: string) => Number(rows.find((row) => row.lineItem === lineItem)?.amount?.value ?? 0)
          const sum = (cut: ReturnType<typeof cutRows>) => cut.reduce((acc, row) => acc + (row.amount ? Number(row.amount.value) : 0), 0)
          const root = section === 'revenue' ? 'venituri totale' : 'cheltuieli totale'
          for (const depth of [1, 2, 3, 4]) {
            expect(Math.abs(sum(cutRows(release.facts, { component, section, depth })) - value(root)), `${month} ${component} ${section} depth ${depth}`).toBeLessThan(1_000_000)
          }
          for (const parent of rows.filter((row) => hasChildren(section, row.lineItem) && row.level > 0)) {
            const cut = cutRows(release.facts, { component, section, depth: 4, under: parent.lineItem })
            expect(Math.abs(sum(cut) - value(parent.lineItem)), `${month} ${component} under ${parent.lineItem}`).toBeLessThan(1_000_000)
          }
        }
      }
    }
  })

  it('balance equals revenue minus expenditure in the December 2025 BGC', async () => {
    const release = await adapter.getExecutionRelease({ month: '2025-12' })
    if (release.status !== 'ok') throw new Error('no release')
    const headline = (section: ExecutionSection) =>
      Number(executionRows(release.facts, { component: 'general_consolidated_budget', section }).find((row) => row.level === 0)?.amount?.value)
    expect(Math.abs(headline('revenue') - headline('expenditure') - headline('balance'))).toBeLessThan(1_000_000)
  })
})

const plan = (overrides: Partial<PlanOperand>): PlanOperand => ({
  kind: 'plan',
  edition: '2025',
  editionStatus: 'law_as_sent',
  measure: 'approved',
  scope: 'state_budget',
  basis: 'budget_credits',
  targetYear: 2025,
  valueLei: 499_582_980_000,
  ...overrides,
})

const execution = (overrides: Partial<ExecutionOperand>): ExecutionOperand => ({
  kind: 'execution',
  periodEnd: '2025-12-31',
  scope: 'state_budget',
  basis: 'payments',
  fiscalStart: '2025-01-01',
  fiscalEnd: '2025-12-31',
  executionStatus: 'actual',
  finality: 'unknown',
  valueLei: 499_435_115_870,
  ...overrides,
})

describe('comparability', () => {
  it('never computes a gap between the initial law and execution', () => {
    const result = compare(plan({}), execution({}))
    expect(result.kind).toBe('plan_vs_execution')
    expect(result.verdict).toBe('not_comparable')
    expect(result.difference).toBeNull()
    expect(result.checks.find((item) => item.dimension === 'version')?.outcome).toBe('different')
  })

  it('compares one target year across editions, noting forecast against approval', () => {
    const result = compare(plan({ edition: '2024', measure: 'forecast', valueLei: 415_000_000_000 }), plan({}))
    expect(result.kind).toBe('plan_evolution')
    expect(result.verdict).toBe('comparable')
    expect(result.checks).toContainEqual({ dimension: 'measure', outcome: 'noted' })
    expect(result.difference?.lei).toBe(499_582_980_000 - 415_000_000_000)
  })

  it('compares approved years year over year, but never a forecast against an approval', () => {
    expect(compare(plan({ edition: '2024', targetYear: 2024, valueLei: 404_000_000_000 }), plan({})).verdict).toBe('comparable')
    expect(compare(plan({ edition: '2025', targetYear: 2026, measure: 'forecast' }), plan({ edition: '2024', targetYear: 2024 })).verdict).toBe(
      'not_comparable',
    )
  })

  it('refuses execution periods of different length, and accepts the same months of two years', () => {
    const july = execution({ periodEnd: '2026-07-31', fiscalStart: '2026-01-01', fiscalEnd: '2026-07-31' })
    expect(compare(execution({}), july).verdict).toBe('not_comparable')
    const julyBefore = execution({ periodEnd: '2025-07-31', fiscalStart: '2025-01-01', fiscalEnd: '2025-07-31' })
    expect(compare(julyBefore, july).verdict).toBe('comparable')
  })

  it('refuses mixed scopes', () => {
    expect(compare(execution({ scope: 'general_consolidated_budget' }), execution({ periodEnd: '2024-12-31', fiscalStart: '2024-01-01', fiscalEnd: '2024-12-31' })).verdict).toBe(
      'not_comparable',
    )
  })
})
