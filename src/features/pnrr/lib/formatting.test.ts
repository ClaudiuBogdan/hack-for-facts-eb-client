import { describe, expect, it } from 'vitest'
import {
  convertPnrrValue,
  PNRR_ESTIMATED_RON_PER_UNIT,
} from './formatting'

describe('PNRR estimated currency conversion', () => {
  it('preserves source RON values', () => {
    expect(convertPnrrValue(500, 'RON')).toBe(500)
  })

  it('converts source RON to EUR using the fixed estimate', () => {
    expect(PNRR_ESTIMATED_RON_PER_UNIT.EUR).toBe(5)
    expect(convertPnrrValue(500, 'EUR')).toBe(100)
  })

  it('converts source RON to USD using the fixed estimate', () => {
    expect(PNRR_ESTIMATED_RON_PER_UNIT.USD).toBe(4.44)
    expect(convertPnrrValue(444, 'USD')).toBeCloseTo(100)
  })
})
