import { describe, expect, it, vi } from 'vitest'
import type { PrLot } from './procedure-model'
import { gapFigure, gapText, noticeDelay, priceWeight, sameCriteria } from './procedure-text'

vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const lot = (criteria: PrLot['criteria']): PrLot => ({ no: '1', title: null, estimate: null, status: 'awarded', criterion: null, criteria, months: null, offers: null, contracts: [], value: null })

describe('the value against the estimate', () => {
  it('says the gap, and the estimate met within half a percent', () => {
    expect(gapText(7_579_615_950.64, 6_142_792_901.06)).toMatch(/19%/u)
    expect(gapText(63_310_356.36, 63_233_506.18)).not.toMatch(/%/u)
    expect(gapText(null, 1)).toBeNull()
    expect(gapText(0, 1)).toBeNull()
    expect(gapFigure(20_680_615, 18_540_561.24)).toMatch(/^−10/u)
    expect(gapFigure(39_336_700.36, 41_458_797.87)).toMatch(/^\+5/u)
    expect(gapFigure(2496, 2486.4)).toBe('±0%')
  })
})

describe('how late the award notice came', () => {
  const span = { from: '2022-12-09', to: '2023-01-04' }
  it('counts the days after the last contract, and years past two', () => {
    expect(noticeDelay({ contractsSpan: span, awardNotice: { first: '2023-01-22', last: '2026-03-11', republished: 5 } })).toBeTruthy()
    expect(noticeDelay({ contractsSpan: span, awardNotice: { first: '2023-01-04', last: '2023-01-04', republished: 0 } })).toBeTruthy()
    expect(noticeDelay({ contractsSpan: span, awardNotice: { first: '2022-12-01', last: '2022-12-01', republished: 0 } })).toBeNull()
    expect(noticeDelay({ contractsSpan: null, awardNotice: { first: '2023-01-22', last: '2023-01-22', republished: 0 } })).toBeNull()
  })
})

describe('how the offers were scored', () => {
  it('weighs the price, and reads lots alike when only their criteria’s names differ', () => {
    const technical = lot([
      { name: 'Pretul ofertei', weight: 60, price: true },
      { name: 'Componenta tehnica', weight: 40, price: false },
    ])
    const graph = lot([
      { name: 'Pretul ofertei', weight: 60, price: true },
      { name: 'Componenta tehnica - Grafic', weight: 40, price: false },
    ])
    expect(priceWeight(technical)).toBe(60)
    expect(priceWeight(lot([{ name: 'Pretul cel mai scazut', weight: 100, price: true }]))).toBeNull()
    expect(sameCriteria([technical, graph])).toBe(true)
    expect(sameCriteria([technical, lot([{ name: 'Pretul ofertei', weight: 40, price: true }, { name: 'Tehnic', weight: 60, price: false }])])).toBe(false)
  })
})
