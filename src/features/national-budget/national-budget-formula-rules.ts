import type { NationalBudgetFormulaRule } from './national-budget-types'

export const BASE_SPENDING_ECONOMIC_PREFIXES: string[] = ['51.01', '51.02']

export const LOCAL_EXTRA_SPENDING_FUNCTIONAL_PREFIXES: string[] = [
  '43.09',
  '43.19',
  '43.10',
  '43.14',
  '43.39.02',
  '43.08',
  '43.39.01',
  '43.01',
  '43.07',
  '43.23',
  '43.30',
  '43.24',
]

export const BASE_INCOME_FUNCTIONAL_PREFIXES: string[] = [
  '04',
  '11',
  '36.02.05',
  '37.02.03',
  '37.02.04',
  '47.02.04',
  '40',
  '41',
]

export const SE_SCAD_INCOME_PREFIXES: string[] = ['01.03', '02.49', '03.19', '10.02', '10.04']
export const STATE_BUDGET_INCOME_FUNCTIONAL_PREFIXES: string[] = [
  '36.02.05',
  '37.02.03',
  '37.02.04',
  '47.02.04',
]

const formulaRules: NationalBudgetFormulaRule[] = [
  {
    id: 'spending-base-transfers',
    label: 'Transferuri economice interne (ec:51.01 + ec:51.02)',
    accountCategory: 'ch',
    classification: 'ec',
    prefixes: BASE_SPENDING_ECONOMIC_PREFIXES,
  },
  {
    id: 'spending-local-transfer-overlaps',
    label: 'Subvenții locale interne (fn:43.xx)',
    accountCategory: 'ch',
    classification: 'fn',
    prefixes: LOCAL_EXTRA_SPENDING_FUNCTIONAL_PREFIXES,
    applicableSectorIds: ['2'],
  },
  {
    id: 'income-base-flows',
    label: 'Fluxuri inter-bugete și operațiuni financiare',
    accountCategory: 'vn',
    classification: 'fn',
    prefixes: BASE_INCOME_FUNCTIONAL_PREFIXES,
  },
  {
    id: 'income-se-scad-adjustments',
    label: 'Ajustări "se scad"',
    accountCategory: 'vn',
    classification: 'fn',
    prefixes: SE_SCAD_INCOME_PREFIXES,
  },
]

const sectorRuleOverrides: Record<string, NationalBudgetFormulaRule[]> = {
  'vn:1': [
    {
      id: 'income-state-budget-specific-functional',
      label: 'Buget de stat venituri: deduceri funcționale specifice',
      accountCategory: 'vn',
      classification: 'fn',
      prefixes: STATE_BUDGET_INCOME_FUNCTIONAL_PREFIXES,
      applicableSectorIds: ['1'],
    },
    {
      id: 'income-state-budget-specific-economic',
      label: 'Buget de stat venituri: eliminare transferuri economice (51.01, 51.02)',
      accountCategory: 'vn',
      classification: 'ec',
      prefixes: BASE_SPENDING_ECONOMIC_PREFIXES,
      applicableSectorIds: ['1'],
    },
  ],
}

export function getFormulaRulesForSector(
  sectorId: string,
  accountCategory: 'ch' | 'vn',
): NationalBudgetFormulaRule[] {
  const overrideKey = `${accountCategory}:${sectorId}`
  const overrideRules = sectorRuleOverrides[overrideKey]
  if (overrideRules) {
    return overrideRules
  }

  return formulaRules.filter((rule) => {
    if (rule.accountCategory !== accountCategory) return false
    if (!rule.applicableSectorIds || rule.applicableSectorIds.length === 0) return true
    return rule.applicableSectorIds.includes(sectorId)
  })
}
