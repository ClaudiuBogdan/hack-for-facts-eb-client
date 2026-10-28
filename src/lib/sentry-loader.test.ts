import { beforeEach, describe, expect, it, vi } from 'vitest'

// The SDK chunk `@/lib/sentry` loads on demand.
const sdk = vi.hoisted(() => ({
  Sentry: { captureException: vi.fn() },
  initSentry: vi.fn(),
  cleanupSentry: vi.fn(),
  openSentryFeedback: null as (() => void) | null,
  openSentryBugReport: null as (() => void) | null,
}))

vi.mock('./sentry-sdk', () => sdk)

const consent = vi.hoisted(() => ({ sentry: false }))

vi.mock('@/lib/consent', () => ({
  hasSentryConsent: () => consent.sentry,
}))

vi.mock('@/config/env', () => ({
  env: {
    VITE_SENTRY_ENABLED: true,
    VITE_SENTRY_DSN: 'https://public@example.com/1',
  },
}))

const loadSentry = () => import('./sentry')

describe('the Sentry loader', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    sdk.openSentryFeedback = null
    sdk.initSentry.mockImplementation(() => {})
    consent.sentry = false
  })

  it('drops a report made before initSentry, as the SDK did without a client', async () => {
    const { withSentry } = await loadSentry()
    const report = vi.fn()
    withSentry(report)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(report).not.toHaveBeenCalled()
    expect(sdk.initSentry).not.toHaveBeenCalled()
  })

  it('runs what came in while the SDK loaded once it is initialised, in order', async () => {
    const { initSentry, withSentry, getReactRootErrorHandlers } = await loadSentry()
    const order: string[] = []
    const openFeedback = () => {}
    sdk.initSentry.mockImplementation(() => {
      order.push('init')
      sdk.openSentryFeedback = openFeedback
    })

    initSentry('router')
    withSentry(() => order.push('report'))
    getReactRootErrorHandlers().onCaughtError(new Error('render'), { componentStack: '' })

    await vi.waitFor(() => expect(order).toEqual(['init', 'report']))
    expect(sdk.initSentry).toHaveBeenCalledWith('router')
    const sentry = await loadSentry()
    expect(sentry.openSentryFeedback).toBe(openFeedback)
  })

  it('keeps an uncaught error raised while the SDK loads', async () => {
    const { initSentry } = await loadSentry()
    initSentry(undefined)
    const error = new Error('while loading')
    window.dispatchEvent(new ErrorEvent('error', { error, message: error.message }))

    await vi.waitFor(() =>
      expect(sdk.Sentry.captureException).toHaveBeenCalledWith(error, {
        mechanism: { type: 'auto.browser.global_handlers.onerror', handled: false },
      }),
    )
  })

  it('applies a cleanup that came in while the SDK loaded, after the init', async () => {
    const { cleanupSentry, initSentry } = await loadSentry()
    initSentry(undefined)
    cleanupSentry()
    await vi.waitFor(() => expect(sdk.cleanupSentry).toHaveBeenCalled())
    expect(sdk.initSentry.mock.invocationCallOrder[0]).toBeLessThan(sdk.cleanupSentry.mock.invocationCallOrder[0])
  })

  it('never drops the cleanup a consent change asks for, however many reports wait', async () => {
    const { cleanupSentry, initSentry, withSentry } = await loadSentry()
    const report = vi.fn()
    initSentry(undefined)
    for (let i = 0; i < 150; i += 1) withSentry(report)
    cleanupSentry()

    await vi.waitFor(() => expect(sdk.cleanupSentry).toHaveBeenCalled())
    expect(report).toHaveBeenCalledTimes(100)
  })

  it('opens Feedback clicked while the SDK loads, once it is up', async () => {
    consent.sentry = true
    const openFeedback = vi.fn()
    sdk.initSentry.mockImplementation(() => {
      sdk.openSentryFeedback = openFeedback
    })
    const sentry = await loadSentry()
    sentry.initSentry(undefined)
    expect(sentry.openSentryFeedback).toBeTypeOf('function')
    sentry.openSentryFeedback?.()

    await vi.waitFor(() => expect(openFeedback).toHaveBeenCalledTimes(1))
    expect(sentry.openSentryFeedback).toBe(openFeedback)
  })
})
