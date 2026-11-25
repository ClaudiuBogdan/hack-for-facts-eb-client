import { describe, expect, it } from 'vitest'
import { pct, pctOf } from './analytics-format'

describe('pct', () => {
  it('says a share that rounds to 0% or 100% without being it', () => {
    expect(pct(0.0001)).toBe('<0,1%')
    expect(pct(9_999 / 10_000)).toBe('>99,9%')
    expect(pct(0)).toBe('0,0%')
    expect(pct(1)).toBe('100,0%')
    expect(pct(72_995 / 227_202)).toBe('32,1%')
  })

  it('gives a dash for a share of nothing', () => {
    expect(pct(Number.NaN)).toBe('—')
    expect(pctOf(5, 0)).toBe('—')
    expect(pctOf(0, 0)).toBe('—')
    expect(pctOf(18_661, 227_202)).toBe('8,2%')
  })
})
