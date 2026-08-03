import { describe, expect, it } from 'vitest'
import {
  advanceScanningLockProgress,
  getScanningLockFrame,
  hasReachedScanningLockEndpoint,
  startOrReverseScanningLock,
} from './legislation-header-glitch'

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

  it('finishes cleanly with the futuristic image fully revealed', () => {
    expect(getScanningLockFrame(1.01)).toEqual({
      strength: 0,
      sweepCenter: -0.08,
      sweepWidth: 0.16,
      sweepMix: 0,
    })
  })

  it('reverses from the current progress instead of restarting', () => {
    const progressBeforeClick = advanceScanningLockProgress({
      progress: 0.35,
      direction: 1,
      deltaSeconds: 0.1,
    })
    const reversedPlayback = startOrReverseScanningLock({
      progress: progressBeforeClick,
      direction: 1,
      isAnimating: true,
    })
    const progressAfterReverse = advanceScanningLockProgress({
      progress: progressBeforeClick,
      direction: reversedPlayback.direction,
      deltaSeconds: 0.1,
    })

    expect(progressBeforeClick).toBeCloseTo(0.45)
    expect(reversedPlayback).toEqual({ direction: -1, isAnimating: true })
    expect(progressAfterReverse).toBeCloseTo(0.35)
  })

  it('starts again after either endpoint has been reached', () => {
    const fromTarget = startOrReverseScanningLock({
      progress: 1,
      direction: 1,
      isAnimating: false,
    })
    const fromSource = startOrReverseScanningLock({
      progress: 0,
      direction: -1,
      isAnimating: false,
    })

    expect(fromTarget).toEqual({ direction: -1, isAnimating: true })
    expect(fromSource).toEqual({ direction: 1, isAnimating: true })
    expect(
      advanceScanningLockProgress({
        progress: 1,
        direction: fromTarget.direction,
        deltaSeconds: 0.1,
      }),
    ).toBeCloseTo(0.9)
    expect(
      advanceScanningLockProgress({
        progress: 0,
        direction: fromSource.direction,
        deltaSeconds: 0.1,
      }),
    ).toBeCloseTo(0.1)
  })

  it('only stops at the endpoint in the active scan direction', () => {
    expect(
      hasReachedScanningLockEndpoint({ progress: 0, direction: 1 }),
    ).toBe(false)
    expect(
      hasReachedScanningLockEndpoint({ progress: 1, direction: -1 }),
    ).toBe(false)
    expect(
      hasReachedScanningLockEndpoint({ progress: 1, direction: 1 }),
    ).toBe(true)
    expect(
      hasReachedScanningLockEndpoint({ progress: 0, direction: -1 }),
    ).toBe(true)
  })
})
