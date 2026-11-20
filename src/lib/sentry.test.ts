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

  it('drops a transaction that touches a procurement or company page, its cui params with it (TEL-001)', () => {
    const supplierLoad = { type: 'transaction', transaction: '/procurement/suppliers/$cui', spans: [{ data: { 'url.path.parameter.cui': '14837428' } }] }
    expect(sanitizeSentryTransaction(supplierLoad)).toBeNull()
    expect(sanitizeSentryTransaction({ type: 'transaction', transaction: '/Companies/$cui' })).toBeNull()
    expect(sanitizeSentryTransaction({ type: 'transaction', transaction: '/budget', request: { url: 'https://transparenta.eu/procurement?x=1' } })).toBeNull()
  })

  it('never throws on circular SDK metadata: a cyclic transaction is still checked and dropped or kept', () => {
    const cyclic: Record<string, unknown> = { type: 'transaction', transaction: '/budget' }
    cyclic.self = cyclic
    cyclic.sdkProcessingMetadata = { owner: cyclic }
    expect(() => sanitizeSentryTransaction(cyclic)).not.toThrow()
    const cyclicParty: Record<string, unknown> = { type: 'transaction', transaction: '/budget', spans: [{ data: { 'url.path': '/procurement/suppliers/14837428' } }] }
    cyclicParty.self = cyclicParty
    expect(sanitizeSentryTransaction(cyclicParty)).toBeNull()
  })

  it('keeps every other transaction, scrubbed', () => {
    const budget = { type: 'transaction', transaction: '/budget', request: { url: 'https://transparenta.eu/budget?x=1' } }
    expect(sanitizeSentryTransaction(budget)).toEqual(budget)
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
          referer: 'https://transparenta.eu/companies/_?tab=summary',
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
        nestedUrl: 'https://transparenta.eu/companies/_?tab=summary',
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

describe('procurement party codes in Sentry telemetry (D6, root)', () => {
  it('scrubs them from an error event: request URL, breadcrumbs, any case', async () => {
    const { sanitizeSentryEventPayload } = await import('./sentry')
    const event = sanitizeSentryEventPayload({
      request: { url: 'https://transparenta.eu/Procurement/Suppliers/14837428?year=2025' },
      breadcrumbs: [{ category: 'navigation', data: { from: '/procurement/institutions/4267117', to: '/procurement/analytics?tip=directe&furnizor=14837428' } }],
      tags: { transaction: '/companies/14837428' },
    })
    expect(JSON.stringify(event)).not.toMatch(/14837428|4267117/u)
  })

  it('scrubs every event type in place before any hook: replay urls and request, feedback, internal errors', async () => {
    const { scrubSentryEventInPlace } = await import('./sentry')
    const replay: Record<string, unknown> = {
      type: 'replay_event',
      urls: ['https://transparenta.eu/procurement/suppliers/14837428', '/procurement/analytics?furnizor=14837428'],
      request: { url: 'https://transparenta.eu/companies/14837428', headers: { Referer: 'https://transparenta.eu/procurement/institutions/4267117' } },
    }
    const feedback: Record<string, unknown> = { type: 'feedback', contexts: { feedback: { message: 'x', url: 'https://transparenta.eu/procurement/suppliers/14837428' } } }
    const minimal: Record<string, unknown> = { message: 'Failed at /procurement/suppliers/14837428', exception: { values: [{ value: 'GET /companies/14837428 failed' }] } }
    const globalPage: Record<string, unknown> = { contexts: { page: { query: '?tip=directe&furnizor=14837428' } } }
    for (const event of [replay, feedback, minimal, globalPage]) {
      scrubSentryEventInPlace(event)
      expect(JSON.stringify(event)).not.toMatch(/14837428|4267117/u)
    }
  })

  it('a cyclic event is scrubbed without throwing, and nothing it carries is sent raw', async () => {
    const { scrubSentryEventInPlace } = await import('./sentry')
    const event: Record<string, unknown> = { message: '/procurement/suppliers/14837428', extra: {} }
    ;(event.extra as Record<string, unknown>).loop = event
    expect(() => scrubSentryEventInPlace(event)).not.toThrow()
    expect(event.message).not.toContain('14837428')
  })
})

describe('the telemetry scrub\'s edges (TEL-001)', () => {
  it('reads a URL object as its address, in the transaction check and the scrub', async () => {
    const { sanitizeSentryTransaction, scrubSentryEventInPlace } = await import('./sentry')
    const justice = { type: 'transaction', transaction: '/budget', request: { data: new URL('https://example.com/justice/cases/Court/1234/3/2024') } }
    expect(sanitizeSentryTransaction(justice)).toBeNull()
    const event: Record<string, unknown> = { extra: { at: new URL('https://transparenta.eu/procurement/suppliers/14837428') } }
    scrubSentryEventInPlace(event)
    expect(JSON.stringify(event)).not.toContain('14837428')
  })

  it('sends nothing unread past the depth it reads', async () => {
    const { scrubSentryEventInPlace } = await import('./sentry')
    let deep: Record<string, unknown> = { leaf: { url: '/procurement/suppliers/14837428' } }
    for (let level = 0; level < 12; level += 1) deep = { next: deep }
    const event: Record<string, unknown> = { extra: deep }
    scrubSentryEventInPlace(event)
    expect(JSON.stringify(event)).not.toContain('14837428')
  })

  it('a page title\'s code is masked in Sentry too', async () => {
    const { scrubSentryEventInPlace } = await import('./sentry')
    const event: Record<string, unknown> = { contexts: { page: { title: 'Example SRL (CUI 123456789012)' } } }
    scrubSentryEventInPlace(event)
    expect(JSON.stringify(event)).not.toContain('123456789012')
  })

  it('never throws on a frozen event', async () => {
    const { scrubSentryEventInPlace } = await import('./sentry')
    const event = Object.freeze({ message: '/procurement/suppliers/14837428' }) as Record<string, unknown>
    expect(() => scrubSentryEventInPlace(event)).not.toThrow()
  })
})

