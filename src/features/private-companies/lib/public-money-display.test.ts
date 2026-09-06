import { describe, expect, it } from 'vitest'
import {
  MONEY_FLOW_TYPES,
  getMoneyFlowCoverage,
  getMoneyFlowLabel,
  isReceiptFlow,
  sortMoneyFlows,
} from './public-money-display'

describe('public money flow display', () => {
  it('names every flow type the server can send, without leaking a raw key', () => {
    for (const flowType of MONEY_FLOW_TYPES) {
      const label = getMoneyFlowLabel(flowType)
      expect(label).not.toContain('_')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('does not treat a PNRR commitment as money received', () => {
    // The PNRR spec forbids summing an obligation with payments.
    expect(isReceiptFlow('pnrr_commitment')).toBe(false)
    expect(isReceiptFlow('pnrr_payment')).toBe(true)
    expect(isReceiptFlow('direct_acquisition')).toBe(true)
  })

  it('treats an unrecognised flow type as a non-receipt rather than assuming', () => {
    expect(isReceiptFlow('some_future_flow')).toBe(false)
  })

  it('sorts by value descending and puts unknown amounts last, not at zero', () => {
    const sorted = sortMoneyFlows([
      { flowType: 'pnrr_subcontract', totalRon: null, count: 35 },
      { flowType: 'procurement_contract', totalRon: 8_766_606, count: 172 },
      { flowType: 'direct_acquisition', totalRon: 415_603_318, count: 405_912 },
    ])
    expect(sorted.map((flow) => flow.flowType)).toEqual([
      'direct_acquisition',
      'procurement_contract',
      'pnrr_subcontract',
    ])
  })

  it('does not mutate the input array', () => {
    const input = [
      { flowType: 'procurement_contract', totalRon: 1, count: 1 },
      { flowType: 'direct_acquisition', totalRon: 2, count: 1 },
    ]
    sortMoneyFlows(input)
    expect(input[0]!.flowType).toBe('procurement_contract')
  })
})

describe('getMoneyFlowCoverage', () => {
  const byYear = [
    { year: 2007, flowType: 'procurement_contract', totalRon: 5, count: 1 },
    { year: 2019, flowType: 'procurement_contract', totalRon: 5, count: 1 },
    { year: 2022, flowType: 'procurement_contract', totalRon: 5, count: 1 },
    { year: 2008, flowType: 'direct_acquisition', totalRon: 100, count: 10 },
    { year: null, flowType: 'direct_acquisition', totalRon: 25, count: 3 },
  ]

  it('reports the years with no records inside the interval', () => {
    // "2007–2022" on its own would claim records exist throughout.
    const coverage = getMoneyFlowCoverage(byYear, 'procurement_contract')
    expect(coverage.firstYear).toBe(2007)
    expect(coverage.lastYear).toBe(2022)
    // 2007–2022 is 16 years; 2007, 2019 and 2022 have records, so 13 do not.
    expect(coverage.missingYears).toHaveLength(13)
    expect(coverage.missingYears).toContain(2020)
    expect(coverage.missingYears).not.toContain(2019)
  })

  it('separates money the source never dated from the interval', () => {
    // An undated amount belongs to no year, so an interval cannot cover it.
    const coverage = getMoneyFlowCoverage(byYear, 'direct_acquisition')
    expect(coverage.firstYear).toBe(2008)
    expect(coverage.lastYear).toBe(2008)
    expect(coverage.missingYears).toEqual([])
    expect(coverage.undatedRon).toBe(25)
    expect(coverage.undatedCount).toBe(3)
  })

  it('returns a null interval for a flow with no dated rows at all', () => {
    const coverage = getMoneyFlowCoverage(
      [{ year: null, flowType: 'pnrr_payment', totalRon: 9, count: 1 }],
      'pnrr_payment',
    )
    expect(coverage.firstYear).toBeNull()
    expect(coverage.lastYear).toBeNull()
    expect(coverage.undatedRon).toBe(9)
  })

  it('ignores other flow types entirely', () => {
    expect(getMoneyFlowCoverage(byYear, 'pnrr_subcontract').firstYear).toBeNull()
  })

  it('treats an unreadable amount as zero for the undated sum, not NaN', () => {
    const coverage = getMoneyFlowCoverage(
      [{ year: null, flowType: 'pnrr_subcontract', totalRon: null, count: 2 }],
      'pnrr_subcontract',
    )
    expect(coverage.undatedRon).toBe(0)
    expect(coverage.undatedCount).toBe(2)
  })
})
