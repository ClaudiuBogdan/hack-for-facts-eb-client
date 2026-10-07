import { describe, expect, it, vi } from 'vitest'
import { sanitizeSentryEventPayload, sanitizeSentryTransaction } from './sentry'

const sentryMock = vi.hoisted(() => ({
  browserTracingIntegration: vi.fn(),
  captureConsoleIntegration: vi.fn(),
  extraErrorDataIntegration: vi.fn(),
  feedbackIntegration: vi.fn(),
  getClient: vi.fn(),
  getFeedback: vi.fn(),
  init: vi.fn(),
  reactErrorHandler: vi.fn(() => vi.fn()),
  replayIntegration: vi.fn(),
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
    VITE_SENTRY_FEEDBACK_ENABLED: false,
  },
}))

vi.mock('@/lib/consent', () => ({
  hasAnalyticsConsent: () => false,
  hasSentryConsent: () => true,
}))

describe('sanitizeSentryTransaction', () => {
  it('drops a transaction that touches a justice page, the route params with it', () => {
    const caseLoad = {
      type: 'transaction',
      transaction: '/justice/cases/$code/$',
      spans: [{ data: { 'url.path.params._splat': '5180/118/2021/a3', 'url.path': '/justice/cases/CurteadeApelCONSTANTA/5180/118/2021/a3' } }],
    }
    expect(sanitizeSentryTransaction(caseLoad)).toBeNull()
    expect(sanitizeSentryTransaction({ type: 'transaction', transaction: '/justice' })).toBeNull()
    expect(sanitizeSentryTransaction({ type: 'transaction', transaction: '/justitie/$' })).toBeNull()
  })

  it('keeps every other transaction, scrubbed', () => {
    const procurement = { type: 'transaction', transaction: '/procurement', request: { url: 'https://transparenta.eu/procurement?x=1' } }
    expect(sanitizeSentryTransaction(procurement)).toEqual(procurement)
    expect(sanitizeSentryTransaction({ type: 'transaction', transaction: '/justice-league' })).not.toBeNull()
  })
})

describe('sanitizeSentryEventPayload', () => {
  it('scrubs justice URLs, breadcrumbs, extra, contexts, messages, and exception strings', () => {
    const event = {
      message:
        'Failed on /justitie/dosare/portal-just-bucuresti-2024-001?caseNumber=1234/3/2024',
      request: {
        url: 'https://transparenta.eu/justitie/dosare/portal-just-bucuresti-2024-001?partyKey=sc-secret&court=TB-BUCURESTI',
        headers: {
          referer:
            'https://transparenta.eu/companies/14399840?tab=summary&partyKey=sc-secret',
        },
      },
      breadcrumbs: [
        {
          category: 'navigation',
          data: {
            from: '/justitie/cautare?partyKey=sc-secret&court=TB-BUCURESTI',
            to: '/justitie/dosare/portal-just-bucuresti-2024-001?caseNumber=1234/3/2024',
          },
        },
      ],
      extra: {
        caseNumber: '1234/3/2024',
        nestedUrl:
          'https://transparenta.eu/companies/14399840?tab=summary&partyKey=sc-secret',
      },
      contexts: {
        justice: {
          partyKey: 'sc-secret',
          from: 'cautare',
        },
      },
      exception: {
        values: [
          {
            value: 'caseNumber=1234/3/2024',
          },
        ],
      },
    }

    expect(sanitizeSentryEventPayload(event)).toEqual({
      message: 'Failed on /justitie/dosare/:caseId',
      request: {
        url: 'https://transparenta.eu/justitie/dosare/:caseId?court=TB-BUCURESTI',
        headers: {
          referer: 'https://transparenta.eu/companies/14399840?tab=summary',
        },
      },
      breadcrumbs: [
        {
          category: 'navigation',
          data: {
            from: '/justitie/cautare?court=TB-BUCURESTI',
            to: '/justitie/dosare/:caseId',
          },
        },
      ],
      extra: {
        caseNumber: '[scrubbed]',
        nestedUrl: 'https://transparenta.eu/companies/14399840?tab=summary',
      },
      contexts: {
        justice: {
          partyKey: '[scrubbed]',
          from: '[scrubbed]',
        },
      },
      exception: {
        values: [
          {
            value: 'caseNumber=[scrubbed]',
          },
        ],
      },
    })
  })
})
