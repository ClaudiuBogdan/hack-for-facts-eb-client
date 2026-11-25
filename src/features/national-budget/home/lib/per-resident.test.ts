import { describe, expect, it } from 'vitest'

import { gdpLeiOf, outOfHundred, perResident, populationOf } from './per-resident'

describe('the per-resident tables', () => {
  it('divide a year by its own 1 January population', () => {
    expect(populationOf(2025)).toBe(19_043_151)
    expect(populationOf(2005)).toBeNull()
    // 808,7 mld. lei over 2025's population (the printed amount, a little more, gives the page's 42.468).
    expect(Math.round(perResident('808700000000', 2025) ?? 0)).toBe(42_467)
    expect(perResident(null, 2025)).toBeNull()
    expect(perResident('1000', 1999)).toBeNull()
  })

  it('hold the annual GDP in lei for the years the bulletins print no share', () => {
    expect(gdpLeiOf(2006)).toBe(342_762.6 * 1e6)
    expect(gdpLeiOf(2026)).toBeNull()
  })
})

describe('lei out of 100', () => {
  it('always make the whole, the units left going to the largest remainders', () => {
    expect(outOfHundred([1, 1, 1])).toEqual([34, 33, 33])
    expect(outOfHundred([499.4, 168.9, 158.1, 84.4, 92.3]).reduce((sum, lei) => sum + lei, 0)).toBe(100)
    expect(outOfHundred([3, 1], 82)).toEqual([62, 20])
  })

  it('give nothing to a negative or an empty whole', () => {
    expect(outOfHundred([0, 0])).toEqual([0, 0])
    expect(outOfHundred([-5, 10])).toEqual([0, 100])
  })
})
