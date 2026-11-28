import { describe, expect, it } from 'vitest'

import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { compareDecimal, sumDecimals } from '@/lib/exact-decimal'
import { SAFE_SPENDING_ITEM, SPENDING_PARTS } from '../lib/home-data'
import { budgetsFrom, changeText, hundredOf } from './use-person-data'

describe('changes', () => {
  it('are rounded once from the exact amounts, one decimal under ten', () => {
    expect(changeText('110', '100')).toBe('+10%')
    expect(changeText('104.2', '100')).toMatch(/^\+4[,.]2%$/u)
    expect(changeText('95', '100')).toMatch(/^−5[,.]0%$/u)
    expect(changeText('100.01', '100')).toBe('0%')
  })

  it('are said only against a positive amount', () => {
    expect(changeText('5', '0')).toBeNull()
    expect(changeText('5', null)).toBeNull()
    expect(changeText(null, '5')).toBeNull()
  })
})

describe('lei out of 100', () => {
  const REST = { label: 'Alte cheltuieli', hint: '' }
  const line = (key: string, exact: string) => ({ key, label: key, hint: null, exact, change: null, before: null })

  it('are none for a total printed without its lines (2008, 2011, 2013), never a whole that is all „the rest"', () => {
    expect(hundredOf('189100000000', [], REST)).toEqual([])
  })

  it('shows October SAFE separately and deducts its exact value from other spending', () => {
    expect(SPENDING_PARTS.filter((item) => item === SAFE_SPENDING_ITEM)).toHaveLength(1)
    const whole = '678197841261.93903'
    const otherNamed = line('other named spending', '643274055105.4166316')
    const safe = line(SAFE_SPENDING_ITEM, '6358483536.8999993')
    const withSafe = hundredOf(whole, [otherNamed, safe], REST)
    expect(withSafe.find((item) => item.key === SAFE_SPENDING_ITEM)).toMatchObject({ exact: safe.exact, lei: 1, change: null })
    expect(withSafe.find((item) => item.rest)?.exact).toBe('28565302619.6223991')
    expect(compareDecimal(sumDecimals(withSafe.map((item) => item.exact)) ?? '0', whole)).toBe(0)
    expect(withSafe.reduce((sum, item) => sum + item.lei, 0)).toBe(100)
    const withoutSafe = hundredOf(whole, [otherNamed], REST)
    expect(withoutSafe.find((item) => item.rest)?.exact).toBe('34923786156.5223984')
  })

  it('make 100 with the rest, largest first, and leave a rest under half a percent out', () => {
    const lines = hundredOf('1000', [line('b', '300'), line('a', '600')], REST)
    expect(lines.map((entry) => [entry.key, entry.lei])).toEqual([
      ['a', 60],
      ['b', 30],
      ['rest', 10],
    ])
    expect(lines[2]).toMatchObject({ exact: '100', rest: true })
    expect(hundredOf('1000', [line('a', '996'), line('b', '1')], REST).map((entry) => entry.key)).toEqual(['a', 'b'])
  })
})

/** The 2025 columns' shape, in round mld. lei. */
const LINES = {
  revenue: 'REVENUE|venituri totale',
  others: 'REVENUE|subventii',
  eu: 'REVENUE|sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari',
  euBefore: 'REVENUE|sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari aferente cadrului financiar 2014-2020',
  euOther: 'REVENUE|alte sume primite de la ue',
  pnrr: 'REVENUE|sume aferente asistentei financiare nerambursabile alocate pentru pnrr',
  spending: 'EXPENDITURE|cheltuieli totale',
  balance: 'BALANCE|excedent(+) / deficit(-)',
} as const
const bn = (value: number) => String(Math.round(value * 1e9))

function cellsOf(columns: Record<string, Partial<Record<keyof typeof LINES, number>>>): Map<string, string> {
  const cells = new Map<string, string>()
  for (const [component, lines] of Object.entries(columns)) {
    for (const [line, value] of Object.entries(lines)) cells.set(`${component}|${LINES[line as keyof typeof LINES]}`, bn(value))
  }
  return cells
}

const YEAR_2025 = cellsOf({
  state_budget: { spending: 499.4, others: 0.1, eu: 33.9, euBefore: 9.4, euOther: 2.6, pnrr: 22.8, balance: -149.5 },
  territorial_units_budget: { spending: 168.9, others: 50.2, eu: 4.4, euBefore: 0.4, balance: -7.4 },
  state_social_insurance_budget: { spending: 158.1, others: 39.2, balance: 0.1649 },
  national_health_insurance_fund: { spending: 84.4, others: 8.7, balance: 0 },
  budget_total_before_transfers: { spending: 1003.1, others: 157.8, eu: 40, euBefore: 9.7, euOther: 3.7, pnrr: 22.9, balance: -153.3 },
  signed_interbudget_transfers: { spending: -185.1 },
  signed_financial_operations: { spending: -9.3 },
  general_consolidated_budget: { spending: 808.7, balance: -146 },
})

/** The 2025 cells with one changed (a value) or gone (null). */
function changed(component: string, line: keyof typeof LINES, value: number | null): Map<string, string> {
  const cells = new Map(YEAR_2025)
  const key = `${component}|${LINES[line]}`
  if (value === null) cells.delete(key)
  else cells.set(key, bn(value))
  return cells
}

describe('the budgets, compared', () => {
  const budgets = budgetsFrom(YEAR_2025)!

  it('name the four large budgets and leave the rest as the printed total minus them', () => {
    expect(budgets.rows.map((row) => row.key)).toEqual(['state_budget', 'territorial_units_budget', 'state_social_insurance_budget', 'national_health_insurance_fund', 'rest'])
    const rest = budgets.rows[4]!
    expect(plotOf(rest.spending)).toBe(92.3e9)
    expect(plotOf(rest.parts.others)).toBe(59.6e9)
  })

  it('split each budget’s spending into sources that add up to it, a surplus kept apart', () => {
    for (const row of budgets.rows) {
      expect(plotOf(sumDecimals(Object.values(row.parts)))).toBe(plotOf(row.spending))
    }
    const state = budgets.rows[0]!
    expect(plotOf(state.parts.borrowed)).toBe(149.5e9)
    // Both frameworks, the other EU sums and the PNRR grants: 33,9 + 9,4 + 2,6 + 22,8.
    expect(plotOf(state.parts.eu)).toBe(68.7e9)
    const pensions = budgets.rows[2]!
    expect(plotOf(pensions.parts.borrowed)).toBe(0)
    expect(plotOf(pensions.surplus)).toBe(164.9e6)
  })

  it('read the bulletin’s bridge as printed', () => {
    expect(plotOf(budgets.bridge.before)).toBe(1003.1e9)
    expect(plotOf(budgets.bridge.passed)).toBe(185.1e9)
    expect(plotOf(budgets.bridge.received)).toBe(157.8e9)
    expect(plotOf(budgets.bridge.consolidated)).toBe(808.7e9)
    expect(plotOf(budgets.bridge.deficit)).toBe(146e9)
  })

  it('name the financial operations only when every printed step adds up to the consolidated budget (NB-001)', () => {
    // 1.003,1 − 185,1 − 9,3 = 808,7.
    expect(plotOf(budgets.bridge.operations)).toBe(-9.3e9)
    expect(budgetsFrom(changed('signed_financial_operations', 'spending', null))!.bridge.operations).toBeNull()
    expect(budgetsFrom(changed('general_consolidated_budget', 'spending', 808.6))!.bridge.operations).toBeNull()
  })

  it('draw the flows only when every budget’s sources are positive', () => {
    expect(budgets.flows).toBe(true)
    // Health receives more from the other budgets than it spends: its own revenue would be negative.
    expect(budgetsFrom(changed('national_health_insurance_fund', 'others', 90))!.flows).toBe(false)
  })

  it('are none for a release without budget columns, with one of the four missing, or without public spending', () => {
    expect(budgetsFrom(new Map())).toBeNull()
    expect(budgetsFrom(changed('national_health_insurance_fund', 'spending', null))).toBeNull()
    expect(budgetsFrom(changed('general_consolidated_budget', 'spending', null))).toBeNull()
  })
})
