import { describe, expect, it } from 'vitest'

import { evaluateBudgetSegment } from './budget-segment'
import { getFormulaRulesForSector } from './national-budget-formula-rules'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'

describe('evaluateBudgetSegment', () => {
  it('matches prefixes and filters excluded nodes for spending rules', () => {
    const nodes: AggregatedNode[] = [
      { fn_c: '65', fn_n: 'Education', ec_c: '51.01.01', ec_n: 'Transfer', amount: 100, count: 1 },
      { fn_c: '65', fn_n: 'Education', ec_c: '10.01.01', ec_n: 'Personnel', amount: 300, count: 1 },
    ]

    const rules = getFormulaRulesForSector('1', 'ch')
    const result = evaluateBudgetSegment(nodes, rules)

    expect(result.rawTotal).toBe(400)
    expect(result.totalAdjustments).toBe(100)
    expect(result.netTotal).toBe(300)
    expect(result.filteredNodes).toHaveLength(1)
    expect(result.filteredNodes[0]?.ec_c).toBe('10.01.01')
  })

  it('applies extra local spending deductions for sector 2', () => {
    const nodes: AggregatedNode[] = [
      { fn_c: '43.09.00', fn_n: 'Subventii locale', ec_c: '10.01.01', ec_n: 'Personnel', amount: 200, count: 1 },
      { fn_c: '65', fn_n: 'Education', ec_c: '51.02.01', ec_n: 'Transfer capital', amount: 50, count: 1 },
      { fn_c: '65', fn_n: 'Education', ec_c: '10.01.01', ec_n: 'Personnel', amount: 300, count: 1 },
    ]

    const rules = getFormulaRulesForSector('2', 'ch')
    const result = evaluateBudgetSegment(nodes, rules)

    expect(rules).toHaveLength(2)
    expect(result.rawTotal).toBe(550)
    expect(result.totalAdjustments).toBe(250)
    expect(result.netTotal).toBe(300)
    expect(result.filteredNodes).toHaveLength(1)
    expect(result.filteredNodes[0]?.amount).toBe(300)
  })

  it('keeps net formula consistent with mixed positive and negative deductions', () => {
    const nodes: AggregatedNode[] = [
      { fn_c: '04.02', fn_n: 'Shares from income tax', ec_c: '00', ec_n: '', amount: 100, count: 1 },
      { fn_c: '01.03', fn_n: 'Se scad adjustment', ec_c: '00', ec_n: '', amount: -20, count: 1 },
      { fn_c: '30', fn_n: 'Non-fiscal', ec_c: '00', ec_n: '', amount: 50, count: 1 },
    ]

    const rules = getFormulaRulesForSector('2', 'vn')
    const result = evaluateBudgetSegment(nodes, rules)

    expect(result.rawTotal).toBe(130)
    expect(result.totalAdjustments).toBe(80)
    expect(result.netTotal).toBe(50)
  })

  it('uses state-budget income override rules for sector 1', () => {
    const nodes: AggregatedNode[] = [
      { fn_c: '36.02.05', fn_n: 'Specific adjustment', ec_c: '00', ec_n: '', amount: 75, count: 1 },
      { fn_c: '65', fn_n: 'Education', ec_c: '51.01.01', ec_n: 'Transfer', amount: 25, count: 1 },
      { fn_c: '04.02', fn_n: 'Other income', ec_c: '00', ec_n: '', amount: 100, count: 1 },
    ]

    const rules = getFormulaRulesForSector('1', 'vn')
    const result = evaluateBudgetSegment(nodes, rules)

    expect(result.totalAdjustments).toBe(100)
    expect(result.netTotal).toBe(100)
    expect(result.filteredNodes).toHaveLength(1)
    expect(result.filteredNodes[0]?.fn_c).toBe('04.02')
  })
})
