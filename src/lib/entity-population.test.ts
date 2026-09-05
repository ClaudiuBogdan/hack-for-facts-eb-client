import { describe, expect, it } from 'vitest'
import { supportsEntityPopulation } from './entity-population'

describe('entity population eligibility', () => {
  it('keeps a county executive eligible after the UAT flag flips', () => {
    expect(supportsEntityPopulation({ is_uat: false, is_territorial_executive: true, uat: { population: 100 } })).toBe(true)
  })
  it('never treats explicit false or unknown executive as UAT fallback', () => {
    for (const flag of [false, null]) expect(supportsEntityPopulation({ is_uat: true, is_territorial_executive: flag, uat: { population: 100 } })).toBe(false)
    expect(supportsEntityPopulation({ is_uat: true, uat: { population: 100 } })).toBe(true)
  })
  it('requires a usable population and an eligible entity', () => {
    for (const population of [null, undefined, 0, -1, NaN, Infinity]) expect(supportsEntityPopulation({ is_territorial_executive: true, uat: { population } })).toBe(false)
    expect(supportsEntityPopulation(null)).toBe(false)
  })
})
