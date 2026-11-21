import { afterEach, describe, expect, it, vi } from 'vitest'
import { PostHog } from 'posthog-js'
import { guardPostHogRequests } from './analytics'

/**
 * TEL-001: every request PostHog sends is scrubbed at its request layer, not
 * only what meets `before_send` (its logs and conversations widget carry the
 * page URL past it). Against the installed posthog-js, with no `before_send`:
 * the request layer alone must hold.
 */

const CODE = '14837428'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('the PostHog request guard (TEL-001)', () => {
  it('scrubs what PostHog sends with no before_send at all, through the real SDK', async () => {
    window.history.replaceState(null, '', `/procurement/suppliers/${CODE}?tip=directe&furnizor=${CODE}`)
    const posthog = new PostHog()
    // What would go to the network, as the SDK's own request layer receives it: below the guard, no network.
    const sent: unknown[] = []
    ;(posthog as unknown as { _send_request: (options: unknown) => void })._send_request = (options) => sent.push(options)
    guardPostHogRequests(posthog)
    posthog.init('phc_test', {
      api_host: 'https://ph.example',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      advanced_disable_flags: true,
      request_batching: false,
      disable_surveys: true,
      persistence: 'memory',
    })
    posthog.capture('page_viewed', { at: `https://transparenta.eu/Companies/${CODE}`, title: `Example SRL (CUI ${CODE})` })
    await vi.waitFor(() => expect(JSON.stringify(sent)).toContain('page_viewed'))
    // The SDK's own properties ($current_url, $pathname) and the event's: none carries the code.
    expect(JSON.stringify(sent)).toContain('$current_url')
    expect(JSON.stringify(sent)).not.toContain(CODE)
  })

  it('sends no search term from a search link or a search engine’s referrer, through the real SDK (docs/design/landing-search-query-param.md)', async () => {
    window.history.replaceState(null, '', '/?q=Consiliul%0APopescu')
    const referrer = Object.getOwnPropertyDescriptor(Document.prototype, 'referrer')
    Object.defineProperty(document, 'referrer', { configurable: true, get: () => 'https://www.bing.com/search?q=Cluj+Nord' })
    try {
      const posthog = new PostHog()
      const sent: unknown[] = []
      ;(posthog as unknown as { _send_request: (options: unknown) => void })._send_request = (options) => sent.push(options)
      guardPostHogRequests(posthog)
      posthog.init('phc_test', {
        api_host: 'https://ph.example',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        advanced_disable_flags: true,
        request_batching: false,
        disable_surveys: true,
        persistence: 'memory',
      })
      posthog.capture('$pageview')
      await vi.waitFor(() => expect(JSON.stringify(sent)).toContain('$pageview'))
      // The SDK copied the engine's keyword under three names; none of it, nor the link's term, leaves.
      expect(JSON.stringify(sent)).toContain('ph_keyword')
      expect(JSON.stringify(sent)).not.toMatch(/Cluj|Nord|Consiliul|Popescu/u)
    } finally {
      delete (document as { referrer?: string }).referrer
      if (referrer) Object.defineProperty(Document.prototype, 'referrer', referrer)
    }
  })

  it('sends no search from a campaign parameter PostHog stores decoded, through the real SDK', async () => {
    window.history.replaceState(null, '', '/?utm_content=%2F%3Fq%3D%2BPopescu&gad_source=%2F%3Fq%3DPrimaria%2BCluj&utm_source=newsletter')
    const posthog = new PostHog()
    const sent: unknown[] = []
    ;(posthog as unknown as { _send_request: (options: unknown) => void })._send_request = (options) => sent.push(options)
    guardPostHogRequests(posthog)
    posthog.init('phc_test', {
      api_host: 'https://ph.example',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      advanced_disable_flags: true,
      request_batching: false,
      disable_surveys: true,
      persistence: 'memory',
    })
    posthog.capture('$pageview')
    await vi.waitFor(() => expect(JSON.stringify(sent)).toContain('$pageview'))
    expect(JSON.stringify(sent)).toContain('utm_content')
    expect(JSON.stringify(sent)).toContain('newsletter')
    expect(JSON.stringify(sent)).not.toMatch(/Primaria|Popescu|Cluj/u)
  })

  it('scrubs a request\'s URL and body, and drops one it cannot read', () => {
    const send = vi.fn()
    const posthog = { _send_request: send } as never
    guardPostHogRequests(posthog)
    const guarded = (posthog as { _send_request: (options: unknown) => void })._send_request
    guarded({ url: `https://ph.example/i/v1/logs?u=%2Fprocurement%2Fsuppliers%2F${CODE}`, data: { context: { currentUrl: `https://transparenta.eu/procurement/suppliers/${CODE}` } } })
    guarded({ url: 'https://ph.example/api/conversations/v1/widget/message', data: { current_url: `https://transparenta.eu/companies/${CODE}`, big: 10n } })
    expect(send).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(send.mock.calls)).not.toContain(CODE)
    // The page's address never goes as `Referer`: origin only.
    expect(send.mock.calls.every(([options]) => (options as { fetchOptions?: { referrerPolicy?: string } }).fetchOptions?.referrerPolicy === 'strict-origin')).toBe(true)
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    const callback = vi.fn()
    guarded({ url: 'https://ph.example/e/', data: cyclic, fireCallbackOnDrop: true, callback })
    expect(send).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith({ statusCode: 0 })
  })

  it('sends no landing search text, whatever shape the address takes (docs/design/landing-search-query-param.md)', () => {
    const send = vi.fn()
    const posthog = { _send_request: send } as never
    guardPostHogRequests(posthog)
    const guarded = (posthog as { _send_request: (options: unknown) => void })._send_request
    guarded({
      url: 'https://ph.example/e/',
      data: {
        properties: {
          $current_url: 'https://transparenta.eu/?%71=Cluj',
          $referrer: 'https://transparenta.eu/?q=first&q=second',
          $initial_current_url: 'https://transparenta.eu/?redirect=%2F%3Fq%3DIasi&q=Napoca',
          link: '//transparenta.eu/?q=Brasov',
          html: '<a href="/?harta=venituri&amp;q=Arad">',
          filtered: 'https://transparenta.eu/?furnizor=14837428&q=River%20Town',
          parenthesised: 'https://transparenta.eu/?q=(CJ)%20Popescu',
          entity: '<a href="/?q=O&#x27;Brien">',
          ph_keyword: 'Cluj Nord',
        },
        $set_once: { $initial_ph_keyword: 'Cluj Nord' },
      },
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(send.mock.calls)).not.toMatch(/Cluj|first|second|Iasi|Napoca|Brasov|Arad|River|Town|Popescu|Brien/u)
  })

  it('without the SDK\'s request layer, PostHog is not started at all', () => {
    expect(() => guardPostHogRequests({} as never)).toThrow('analytics stays off')
  })
})
