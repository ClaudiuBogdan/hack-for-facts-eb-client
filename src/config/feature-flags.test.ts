import { describe, expect, it } from 'vitest'
import { FEATURE_FLAGS, assertFeatureEnabled, isFeatureEnabled } from './feature-flags'

describe('the areas switched off in this build', () => {
  it('keeps public investments off until it is implemented, and offers the elections catalog', () => {
    expect(FEATURE_FLAGS).toEqual({ publicInvestments: false, elections: true })
    expect(isFeatureEnabled('publicInvestments')).toBe(false)
    expect(isFeatureEnabled('elections')).toBe(true)
  })

  it('answers an off area’s route with a not-found, and lets an on area’s through', () => {
    expect(() => assertFeatureEnabled('publicInvestments')).toThrow(expect.objectContaining({ isNotFound: true }))
    expect(() => assertFeatureEnabled('elections')).not.toThrow()
  })
})
