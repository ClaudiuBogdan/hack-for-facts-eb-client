import { describe, expect, it } from 'vitest'
import {
  MONEY_FLOW_TYPES,
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
