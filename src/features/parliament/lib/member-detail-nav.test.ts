import { describe, expect, it } from 'vitest'
import { resolveMemberDetailActiveTab } from './member-detail-nav'

describe('resolveMemberDetailActiveTab', () => {
  // Mandate keys contain colons, and the router pathname keeps them
  // percent-encoded — the resolver must not depend on the memberId text.
  it('resolves tabs when the memberId is percent-encoded in the pathname', () => {
    expect(
      resolveMemberDetailActiveTab('/parlament/membri/1%3A2024%3A1/voturi'),
    ).toBe('voturi')
    expect(
      resolveMemberDetailActiveTab('/parlament/membri/1%3A2024%3A1/contact'),
    ).toBe('contact')
    expect(resolveMemberDetailActiveTab('/parlament/membri/1%3A2024%3A1')).toBe(
      'overview',
    )
  })

  it('resolves tabs on decoded pathnames too', () => {
    expect(resolveMemberDetailActiveTab('/parlament/membri/1:2024:1/voturi')).toBe(
      'voturi',
    )
    expect(resolveMemberDetailActiveTab('/parlament/membri/1:2024:1/')).toBe(
      'overview',
    )
  })

  it('falls back to overview for unknown suffixes and malformed escapes', () => {
    expect(
      resolveMemberDetailActiveTab('/parlament/membri/1%3A2024%3A1/unknown'),
    ).toBe('overview')
    expect(resolveMemberDetailActiveTab('/parlament/membri/1%ZZ')).toBe('overview')
  })
})
