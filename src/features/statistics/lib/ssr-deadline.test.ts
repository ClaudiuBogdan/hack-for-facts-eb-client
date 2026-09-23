import { describe, expect, it } from 'vitest'
import { isTimeoutReason } from '@/lib/ssr/deadline-signal'
import { DEFAULT_INS_SSR_DEADLINE_MS, insLoaderSignal, resolveInsSsrDeadlineMs } from './ssr-deadline'

describe('resolveInsSsrDeadlineMs', () => {
  it('defaults when the variable is unset or blank', () => {
    expect(resolveInsSsrDeadlineMs({})).toBe(DEFAULT_INS_SSR_DEADLINE_MS)
    expect(resolveInsSsrDeadlineMs({ INS_SSR_DEADLINE_MS: '  ' })).toBe(DEFAULT_INS_SSR_DEADLINE_MS)
  })

  it('reads a number of milliseconds, and disables on zero or garbage', () => {
    expect(resolveInsSsrDeadlineMs({ INS_SSR_DEADLINE_MS: '8000' })).toBe(8000)
    expect(resolveInsSsrDeadlineMs({ INS_SSR_DEADLINE_MS: '0' })).toBeUndefined()
    expect(resolveInsSsrDeadlineMs({ INS_SSR_DEADLINE_MS: 'soon' })).toBeUndefined()
    // Past Node's timer range the delay would clamp to 1 ms and fail every render.
    expect(resolveInsSsrDeadlineMs({ INS_SSR_DEADLINE_MS: '2147483648' })).toBeUndefined()
    expect(resolveInsSsrDeadlineMs({ INS_SSR_DEADLINE_MS: '2147483647' })).toBe(2147483647)
  })
})

describe('insLoaderSignal', () => {
  it('passes the signal through in the browser and wraps it on the server', () => {
    const controller = new AbortController()
    expect(insLoaderSignal(controller.signal, false)).toBe(controller.signal)
    const wrapped = insLoaderSignal(controller.signal, true)
    expect(wrapped).not.toBe(controller.signal)
    controller.abort()
    expect(wrapped.aborted).toBe(true)
    expect(isTimeoutReason(wrapped.reason)).toBe(false)
  })
})
