import { BrowserClient, defaultStackParser, Scope } from '@sentry/browser'
import { serializeEnvelope, type Envelope, type Transport } from '@sentry/core'
import { describe, expect, it } from 'vitest'
import { scrubbingTransport, scrubEnvelope } from './sentry'

/**
 * TEL-001: every envelope the real SDK sends is scrubbed at the transport,
 * whatever the SDK merged after the event hooks (scope breadcrumbs and
 * contexts, its own internal errors, feedback). Against the installed client,
 * with an in-memory transport: no mocks of the SDK.
 */

const CODE = '14837428'

function clientSending() {
  const sent: string[] = []
  const memory: Transport = {
    send: (envelope: Envelope) => {
      const body = serializeEnvelope(envelope)
      sent.push(typeof body === 'string' ? body : new TextDecoder().decode(body))
      return Promise.resolve({})
    },
    flush: () => Promise.resolve(true),
  }
  const client = new BrowserClient({
    dsn: 'https://public@example.com/1',
    transport: () => scrubbingTransport(memory),
    integrations: [],
    stackParser: defaultStackParser,
    sendClientReports: false,
  })
  return { client, sent }
}

function rawScope(): Scope {
  const scope = new Scope()
  // Added straight to the scope: no `beforeBreadcrumb`, merged after `preprocessEvent`.
  scope.addBreadcrumb({ category: 'navigation', data: { from: '/budget', to: `/Procurement/Suppliers/${CODE}` } })
  scope.addBreadcrumb({ category: 'ui.click', message: `button[aria-label="Copiază CUI ${CODE}"]` })
  scope.setContext('global_error', { route: `/procurement/suppliers/${CODE}`, query: `?tip=directe&furnizor=${CODE}` })
  return scope
}

describe('the scrubbing transport, through the real Sentry client (TEL-001)', () => {
  it('an internal error (no beforeSend) carries no party code from the scope', async () => {
    const { client, sent } = clientSending()
    client.captureException(new Error(`failed at /companies/${CODE}`), { data: { __sentry__: true } }, rawScope())
    await client.flush(1000)
    expect(sent.length).toBeGreaterThan(0)
    expect(sent.join('\n')).not.toContain(CODE)
  })

  it('an error on the landing carries no search text from the scope (docs/design/landing-search-query-param.md)', async () => {
    const { client, sent } = clientSending()
    const scope = new Scope()
    scope.addBreadcrumb({ category: 'navigation', data: { from: '/?q=Cluj%20Napoca', to: '/entities/4305857' } })
    scope.setContext('global_error', { route: '/', query: '?q=Cluj%20Napoca' })
    client.captureException(new Error('failed'), { data: { __sentry__: true } }, scope)
    await client.flush(1000)
    expect(sent.length).toBeGreaterThan(0)
    expect(sent.join('\n')).not.toMatch(/Cluj|Napoca/u)
  })

  it('feedback (no beforeSend) carries no party code', async () => {
    const { client, sent } = clientSending()
    client.captureEvent({ type: 'feedback', contexts: { feedback: { message: 'hi', url: `https://transparenta.eu/procurement/suppliers/${CODE}` } } }, {}, rawScope())
    await client.flush(1000)
    expect(sent.length).toBeGreaterThan(0)
    expect(sent.join('\n')).not.toContain(CODE)
  })
})

describe('scrubEnvelope (TEL-001)', () => {
  const headers = { event_id: 'e', dsn: 'https://public@example.com/1' }

  it('masks a standalone span named from an element, and drops a span or transaction on a party page', () => {
    const inp = [{ type: 'span' }, { description: `button[aria-label="Copiază CUI ${CODE}"]`, data: { 'sentry.op': 'ui.interaction.click' } }] as const
    const party = [{ type: 'span' }, { description: '/procurement/suppliers/$cui', data: { 'url.path.parameter.cui': CODE } }] as const
    const transaction = [{ type: 'transaction' }, { transaction: '/companies/$cui', spans: [] }] as const
    const [, items] = scrubEnvelope([headers, [inp, party, transaction]])
    expect(items).toHaveLength(1)
    expect(JSON.stringify(items)).not.toContain(CODE)
  })

  it('reads an item as the serializer writes it (`toJSON`), keeps an image attachment and drops any other binary', () => {
    const withToJson = [{ type: 'event' }, { extra: { at: { toJSON: () => `/procurement/suppliers/${CODE}` } } }] as const
    const screenshot = [{ type: 'attachment', content_type: 'image/png' }, new Uint8Array([1])] as const
    const recording = [{ type: 'replay_recording' }, new Uint8Array([1])] as const
    const text = [{ type: 'attachment', content_type: 'text/plain' }, `see /procurement/suppliers/${CODE}`] as const
    const [, items] = scrubEnvelope([headers, [withToJson, screenshot, recording, text]])
    expect(items.map(([itemHeaders]) => itemHeaders.type)).toEqual(['event', 'attachment'])
    expect(JSON.stringify(items[0])).not.toContain(CODE)
  })

  it('drops an item it cannot read, never sending it unread', () => {
    const cyclic: Record<string, unknown> = { message: `/procurement/suppliers/${CODE}` }
    cyclic.self = cyclic
    const [, items] = scrubEnvelope([headers, [[{ type: 'event' }, cyclic]]])
    expect(items).toHaveLength(0)
  })

  it('keeps a transaction on another page, scrubbed, even after an earlier party page\'s breadcrumb', () => {
    const budget = [{ type: 'transaction' }, { transaction: '/budget', breadcrumbs: [{ data: { to: `/companies/${CODE}` } }] }] as const
    const companiesSearch = [{ type: 'transaction' }, { transaction: '/companies/search' }] as const
    const [, items] = scrubEnvelope([headers, [budget, companiesSearch]])
    expect(items).toHaveLength(2)
    expect(JSON.stringify(items)).not.toContain(CODE)
  })

  it('scrubs item headers, and leaves an unrelated title as it was (no justice title heuristic in Sentry)', () => {
    const item = [{ type: 'event', filename: `/procurement/suppliers/${CODE}` }, { contexts: { page: { title: 'Budget report 11/19/2026' } } }] as const
    const [, items] = scrubEnvelope([headers, [item]])
    expect(JSON.stringify(items)).not.toContain(CODE)
    expect(JSON.stringify(items)).toContain('Budget report 11/19/2026')
  })
})
