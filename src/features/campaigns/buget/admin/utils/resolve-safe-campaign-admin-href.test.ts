import { describe, expect, it } from 'vitest'
import { resolveSafeCampaignAdminHref } from './resolve-safe-campaign-admin-href'

describe('resolveSafeCampaignAdminHref', () => {
  it('resolves root-relative paths against the current origin', () => {
    expect(
      resolveSafeCampaignAdminHref({
        value: '/primarie/12345678',
        baseUrl: 'https://example.test/admin',
      })
    ).toBe('https://example.test/primarie/12345678')
  })

  it('accepts same-origin absolute http urls', () => {
    expect(
      resolveSafeCampaignAdminHref({
        value: 'https://example.test/primarie/12345678',
        baseUrl: 'https://example.test/admin',
      })
    ).toBe('https://example.test/primarie/12345678')
  })

  it('rejects external, malformed, and unsafe protocols', () => {
    expect(
      resolveSafeCampaignAdminHref({
        value: 'https://evil.test/primarie/12345678',
        baseUrl: 'https://example.test/admin',
      })
    ).toBeNull()

    expect(
      resolveSafeCampaignAdminHref({
        value: 'javascript:alert(1)',
        baseUrl: 'https://example.test/admin',
      })
    ).toBeNull()

    expect(
      resolveSafeCampaignAdminHref({
        value: 'data:text/html,<script>alert(1)</script>',
        baseUrl: 'https://example.test/admin',
      })
    ).toBeNull()

    expect(
      resolveSafeCampaignAdminHref({
        value: 'not a valid url',
        baseUrl: 'https://example.test/admin',
      })
    ).toBeNull()
  })
})
