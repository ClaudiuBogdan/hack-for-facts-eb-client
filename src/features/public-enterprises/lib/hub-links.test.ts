import { describe, expect, it } from 'vitest'
import { companyHref, enterpriseHitHref } from './hub-links'

describe('the hub’s links', () => {
  it('opens an enterprise on its company page', () => {
    expect(companyHref('10020943')).toBe('/companies/10020943')
  })

  it('sends a search hit straight to the company page, not through the retired address', () => {
    expect(enterpriseHitHref({ href: '/intreprinderi-publice/36210321' })).toBe('/companies/36210321')
    expect(enterpriseHitHref({ href: '/companies/13267213?lang=en' })).toBe('/companies/13267213')
  })

  it('keeps a hit with no enterprise address on its own link', () => {
    expect(enterpriseHitHref({ href: '/entities/4305857' })).toBeNull()
    expect(enterpriseHitHref({ href: 'https://example.test/public-enterprise' })).toBeNull()
    expect(enterpriseHitHref({ href: '/intreprinderi-publice/' })).toBeNull()
  })
})
