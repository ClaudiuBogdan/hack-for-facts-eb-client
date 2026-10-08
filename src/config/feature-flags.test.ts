import { describe, expect, it } from 'vitest'
import { FEATURE_FLAGS, assertFeatureEnabled, isFeatureEnabled } from './feature-flags'

describe('the areas switched off in this build', () => {
  it('keeps public investments and elections off until they are implemented', () => {
    expect(FEATURE_FLAGS).toEqual({ publicInvestments: false, elections: false })
    expect(isFeatureEnabled('elections')).toBe(false)
  })

  it('answers an off area’s route with a not-found', () => {
    expect(() => assertFeatureEnabled('publicInvestments')).toThrow(expect.objectContaining({ isNotFound: true }))
  })
})
