import { describe, expect, it } from 'vitest'
import {
  buildFinancialChartPoints,
  getNetResultValue,
} from './financial-chart-data'

describe('financial-chart-data', () => {
  it('maps profit and loss to signed net result', () => {
    expect(
      getNetResultValue({ netProfit: 100, netLoss: null }),
    ).toBe(100)
    expect(
      getNetResultValue({ netProfit: null, netLoss: 40 }),
    ).toBe(-40)
    expect(
      getNetResultValue({ netProfit: null, netLoss: null }),
    ).toBeNull()
  })

  it('sorts chart points by fiscal year ascending', () => {
    const points = buildFinancialChartPoints([
      {
        fiscalYear: 2024,
        turnover: 10,
        netProfit: 1,
        netLoss: null,
        employees: 5,
        currency: 'RON',
      },
      {
        fiscalYear: 2022,
        turnover: 8,
        netProfit: 2,
        netLoss: null,
        employees: 4,
        currency: 'RON',
      },
    ])

    expect(points.map((point) => point.fiscalYear)).toEqual([2022, 2024])
  })
})
