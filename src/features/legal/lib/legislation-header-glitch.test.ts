import { describe, expect, it } from 'vitest'
import { getScanningLockFrame } from './legislation-header-glitch'

describe('legislation header scanning lock', () => {
  it('starts clean before smoothly introducing the effect', () => {
    expect(getScanningLockFrame(0).strength).toBe(0)
    expect(getScanningLockFrame(0.08).strength).toBeGreaterThan(0)
  })

  it('moves the corruption band from the top to the bottom', () => {
    const nearTop = getScanningLockFrame(0.1)
    const nearBottom = getScanningLockFrame(0.8)

    expect(nearTop.strength).toBeGreaterThan(0)
    expect(nearBottom.strength).toBeGreaterThan(0)
    expect(nearTop.sweepCenter).toBeGreaterThan(nearBottom.sweepCenter)
    expect(nearTop.sweepMix).toBe(1)
    expect(nearBottom.sweepMix).toBe(1)
  })

  it('keeps the reveal edge locked to the corruption band', () => {
    const firstFrame = getScanningLockFrame(0.2)
    const secondFrame = getScanningLockFrame(0.6)

    expect(firstFrame.sweepCenter).toBeGreaterThan(secondFrame.sweepCenter)
    expect(firstFrame.sweepWidth).toBe(secondFrame.sweepWidth)
  })

  it('returns directly to the untouched image without a final lock', () => {
    expect(getScanningLockFrame(1.01)).toEqual({
      strength: 0,
      sweepCenter: 0.5,
      sweepWidth: 1,
      sweepMix: 0,
    })
  })
})
