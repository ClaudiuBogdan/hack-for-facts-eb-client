import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ENTITY_PAGE_SSR_DEADLINE_MS,
  createEntityPageSsrDeadline,
  remainingDeadlineMs,
  resolveEntityPageSsrDeadlineMs,
  settleWithinDeadline,
} from './entity-page-ssr-deadline'

function createDeadline(deadlineMs: number, startedAt = 0, now = () => startedAt) {
  return { deadlineMs, startedAt, now }
}

describe('resolveEntityPageSsrDeadlineMs', () => {
  it('keeps the default when the variable is unset or blank', () => {
    expect(resolveEntityPageSsrDeadlineMs({})).toBe(DEFAULT_ENTITY_PAGE_SSR_DEADLINE_MS)
    expect(resolveEntityPageSsrDeadlineMs({ ENTITY_PAGE_SSR_DEADLINE_MS: '  ' })).toBe(
      DEFAULT_ENTITY_PAGE_SSR_DEADLINE_MS,
    )
  })

  it('reads a positive number of milliseconds', () => {
    expect(resolveEntityPageSsrDeadlineMs({ ENTITY_PAGE_SSR_DEADLINE_MS: '750' })).toBe(750)
    expect(resolveEntityPageSsrDeadlineMs({ ENTITY_PAGE_SSR_DEADLINE_MS: ' 1500 ' })).toBe(1500)
  })

  it.each(['0', '-1', 'off', 'NaN', '2000ms', '2_000', '2e3'])(
    'disables the deadline for %s',
    (value) => {
      expect(
        resolveEntityPageSsrDeadlineMs({ ENTITY_PAGE_SSR_DEADLINE_MS: value }),
      ).toBeUndefined()
    },
  )

  it('disables the deadline beyond the timer range instead of timing out at once', () => {
    // Node clamps longer delays to 1ms, which would fail every render.
    expect(
      resolveEntityPageSsrDeadlineMs({ ENTITY_PAGE_SSR_DEADLINE_MS: '2147483647' }),
    ).toBe(2_147_483_647)
    expect(
      resolveEntityPageSsrDeadlineMs({ ENTITY_PAGE_SSR_DEADLINE_MS: '2147483648' }),
    ).toBeUndefined()
    expect(
      resolveEntityPageSsrDeadlineMs({ ENTITY_PAGE_SSR_DEADLINE_MS: '3000000000' }),
    ).toBeUndefined()
  })
})

describe('createEntityPageSsrDeadline', () => {
  it('returns no deadline on the client', () => {
    expect(createEntityPageSsrDeadline({ isServer: false, deadlineMs: 100 })).toBeUndefined()
  })

  it('stamps the start time on the server', () => {
    const deadline = createEntityPageSsrDeadline({
      isServer: true,
      deadlineMs: 100,
      now: () => 5_000,
    })

    expect(deadline).toEqual({ deadlineMs: 100, startedAt: 5_000, now: expect.any(Function) })
  })

  it('returns no deadline when the environment disables it', () => {
    vi.stubEnv('ENTITY_PAGE_SSR_DEADLINE_MS', '0')

    expect(createEntityPageSsrDeadline({ isServer: true })).toBeUndefined()

    vi.unstubAllEnvs()
  })
})

describe('remainingDeadlineMs', () => {
  it('counts down from the start and never goes negative', () => {
    let current = 1_000
    const deadline = createDeadline(300, 1_000, () => current)

    expect(remainingDeadlineMs(deadline)).toBe(300)
    current = 1_200
    expect(remainingDeadlineMs(deadline)).toBe(100)
    current = 2_000
    expect(remainingDeadlineMs(deadline)).toBe(0)
  })
})

describe('settleWithinDeadline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('awaits the promise when there is no deadline', async () => {
    await expect(settleWithinDeadline(Promise.resolve('value'), undefined)).resolves.toEqual({
      status: 'resolved',
      value: 'value',
    })
  })

  it('resolves when the promise settles before the deadline', async () => {
    vi.useFakeTimers()
    const outcome = settleWithinDeadline(
      new Promise<string>((resolve) => setTimeout(() => resolve('value'), 50)),
      createDeadline(200),
    )

    await vi.advanceTimersByTimeAsync(50)

    await expect(outcome).resolves.toEqual({ status: 'resolved', value: 'value' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('times out when the deadline passes first', async () => {
    vi.useFakeTimers()
    const outcome = settleWithinDeadline(new Promise<never>(() => {}), createDeadline(200))

    await vi.advanceTimersByTimeAsync(200)

    await expect(outcome).resolves.toEqual({ status: 'timed-out' })
  })

  it('lets an already settled promise win even with no time left', async () => {
    let current = 0
    const deadline = createDeadline(100, 0, () => current)
    current = 500

    await expect(settleWithinDeadline(Promise.resolve('cached'), deadline)).resolves.toEqual({
      status: 'resolved',
      value: 'cached',
    })
  })

  it('swallows a late rejection after timing out', async () => {
    vi.useFakeTimers()
    let reject: (error: Error) => void = () => {}
    const promise = new Promise<never>((_resolve, rejectPromise) => {
      reject = rejectPromise
    })
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)

    const outcome = settleWithinDeadline(promise, createDeadline(10))
    await vi.advanceTimersByTimeAsync(10)
    await expect(outcome).resolves.toEqual({ status: 'timed-out' })

    reject(new Error('cancelled'))
    await vi.advanceTimersByTimeAsync(0)
    vi.useRealTimers()
    await new Promise((resolve) => setImmediate(resolve))

    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it('propagates a rejection that happens before the deadline', async () => {
    await expect(
      settleWithinDeadline(Promise.reject(new Error('boom')), createDeadline(1_000)),
    ).rejects.toThrow('boom')
  })
})
