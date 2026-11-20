import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * TEL-001 (root, 19 November 2026): no session replay anywhere. rrweb records
 * link addresses and the page URL with no hook to scrub them, and a session
 * refresh can restart it after a stop, so the only sound option is not
 * recording. Every event Sentry prepares is scrubbed, and so is every breadcrumb
 * as it is recorded.
 */

const sentryMock = vi.hoisted(() => ({
  on: vi.fn(),
  browserTracingIntegration: vi.fn(),
  captureConsoleIntegration: vi.fn(() => ({ name: 'console' })),
  extraErrorDataIntegration: vi.fn(() => ({ name: 'extra' })),
  feedbackIntegration: vi.fn(() => ({ name: 'Feedback' })),
  getClient: vi.fn(),
  getFeedback: vi.fn(() => undefined),
  init: vi.fn(),
  reactErrorHandler: vi.fn(() => vi.fn()),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  setUser: vi.fn(),
}))

vi.mock('@sentry/react', () => sentryMock)
vi.mock('@/config/env', () => ({
  env: {
    VITE_SENTRY_ENABLED: true,
    VITE_SENTRY_DSN: 'https://public@example.com/1',
    VITE_APP_ENVIRONMENT: 'test',
    VITE_APP_VERSION: 'test',
    VITE_SENTRY_TRACES_SAMPLE_RATE: '0',
    VITE_SENTRY_FEEDBACK_ENABLED: true,
  },
}))
// Every consent given: the most telemetry the app would ever turn on.
vi.mock('@/lib/consent', () => ({ hasAnalyticsConsent: () => true, hasSentryConsent: () => true }))

const { initSentry } = await import('./sentry-sdk')

type InitOptions = {
  readonly integrations: readonly { readonly name?: string }[]
  readonly replaysSessionSampleRate: number
  readonly replaysOnErrorSampleRate: number
  readonly beforeBreadcrumb: (breadcrumb: Record<string, unknown>) => Record<string, unknown> | null
  readonly transport?: unknown
}

function start(path: string): InitOptions {
  window.history.replaceState(null, '', path)
  sentryMock.getClient.mockReturnValueOnce(undefined).mockReturnValue({ on: sentryMock.on })
  initSentry(null)
  const calls = sentryMock.init.mock.calls
  return calls[calls.length - 1]?.[0] as InitOptions
}

afterEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('Sentry without session replay (TEL-001)', () => {
  it.each(['/', '/budget', '/procurement/suppliers/14837428', '/companies/14837428', '/justice'])('registers no replay integration and samples none, from %s', (path) => {
    const options = start(path)
    expect(sentryMock.replayIntegration).not.toHaveBeenCalled()
    expect(options.integrations.some((integration) => integration.name === 'Replay')).toBe(false)
    expect(options.replaysSessionSampleRate).toBe(0)
    expect(options.replaysOnErrorSampleRate).toBe(0)
  })

  it('scrubs every breadcrumb as it is recorded, so an event that merges them later carries none raw', () => {
    const options = start('/budget')
    const navigation = options.beforeBreadcrumb({ category: 'navigation', data: { from: '/budget', to: '/Procurement/Suppliers/14837428' } })
    const fetchCrumb = options.beforeBreadcrumb({ category: 'fetch', data: { url: 'https://api.example/graphql?furnizor=14837428' } })
    expect(JSON.stringify([navigation, fetchCrumb])).not.toContain('14837428')
  })

  it('sends through the scrubbing transport, set from the client\'s creation', () => {
    expect(typeof start('/budget').transport).toBe('function')
  })

  it('scrubs every prepared event through the client hook', () => {
    start('/budget')
    const hook = sentryMock.on.mock.calls.find(([name]) => name === 'preprocessEvent')?.[1] as (event: Record<string, unknown>) => void
    const event: Record<string, unknown> = { type: 'feedback', contexts: { feedback: { url: 'https://transparenta.eu/procurement/suppliers/14837428' } } }
    hook(event)
    expect(JSON.stringify(event)).not.toContain('14837428')
  })
})
