import { describe, expect, it } from 'vitest'
import { enterpriseHitHref, enterpriseHref } from './hub-links'

describe('the hub’s links', () => {
  it('opens an enterprise on its own page', () => {
    expect(enterpriseHref('10020943')).toBe('/public-enterprises/10020943')
  })

  it('sends a search hit to the enterprise page, whichever address the hit carries', () => {
    expect(enterpriseHitHref({ href: '/public-enterprises/36210321' })).toBe('/public-enterprises/36210321')
    expect(enterpriseHitHref({ href: '/intreprinderi-publice/36210321' })).toBe('/public-enterprises/36210321')
    expect(enterpriseHitHref({ href: '/companies/13267213?lang=en' })).toBe('/public-enterprises/13267213')
  })

  it('keeps a hit with no enterprise address on its own link', () => {
    expect(enterpriseHitHref({ href: '/entities/4305857' })).toBeNull()
    expect(enterpriseHitHref({ href: 'https://example.test/public-enterprise' })).toBeNull()
    expect(enterpriseHitHref({ href: '/public-enterprises/' })).toBeNull()
    // A CUI the page cannot take gets no link rather than one to a 404; a leading zero is dropped.
    expect(enterpriseHitHref({ href: '/intreprinderi-publice/5' })).toBeNull()
    expect(enterpriseHitHref({ href: '/intreprinderi-publice/0010020943' })).toBe('/public-enterprises/10020943')
  })
})
