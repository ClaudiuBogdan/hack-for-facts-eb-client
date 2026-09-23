import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTimeoutReason, throwIfCancelled, withDeadline } from './deadline-signal'

describe('withDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('aborts with a TimeoutError once the deadline passes', () => {
    const signal = withDeadline(undefined, 100)
    expect(signal?.aborted).toBe(false)
    vi.advanceTimersByTime(100)
    expect(signal?.aborted).toBe(true)
    expect(isTimeoutReason(signal?.reason)).toBe(true)
  })

  it('forwards the parent abort, with the parent reason, and drops the timer', () => {
    const parent = new AbortController()
    const signal = withDeadline(parent.signal, 100)
    parent.abort()
    expect(signal?.aborted).toBe(true)
    expect(isTimeoutReason(signal?.reason)).toBe(false)
    expect((signal?.reason as Error).name).toBe('AbortError')
    // The deadline firing later changes nothing.
    vi.advanceTimersByTime(200)
    expect((signal?.reason as Error).name).toBe('AbortError')
  })

  it('returns the parent as is without a deadline, and when it already fired', () => {
    const parent = new AbortController()
    expect(withDeadline(parent.signal, undefined)).toBe(parent.signal)
    expect(withDeadline(parent.signal, 0)).toBe(parent.signal)
    parent.abort()
    expect(withDeadline(parent.signal, 100)).toBe(parent.signal)
    expect(withDeadline(undefined, undefined)).toBeUndefined()
  })
})

describe('throwIfCancelled', () => {
  it('throws for a caller abort and stays quiet past a deadline', () => {
    const parent = new AbortController()
    parent.abort()
    expect(() => throwIfCancelled(parent.signal)).toThrow()
    expect(() => throwIfCancelled(undefined)).not.toThrow()

    vi.useFakeTimers()
    try {
      const deadline = withDeadline(undefined, 10)
      vi.advanceTimersByTime(10)
      expect(deadline?.aborted).toBe(true)
      expect(() => throwIfCancelled(deadline)).not.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })
})
