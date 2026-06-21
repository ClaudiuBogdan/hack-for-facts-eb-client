import { describe, it, expect } from 'vitest'
import { entityHref, type EntityRoutingInput } from './entity-search-routing'

function input(overrides: Partial<EntityRoutingInput>): EntityRoutingInput {
  return {
    docType: 'company',
    cuis: [],
    docId: null,
    docKey: null,
    url: null,
    ...overrides,
  }
}

describe('entityHref', () => {
  describe('CUI-spine doc types', () => {
    it('routes company to /companies/$cui via cuis[0]', () => {
      const result = entityHref(input({ docType: 'company', cuis: ['2816464'] }))
      expect(result).toEqual({ href: '/companies/2816464', isExternal: false })
    })

    it('routes organization to /entities/$cui via cuis[0]', () => {
      const result = entityHref(
        input({ docType: 'organization', cuis: ['4305857'] }),
      )
      expect(result).toEqual({ href: '/entities/4305857', isExternal: false })
    })

    it('routes public_enterprise to /entities/$cui', () => {
      const result = entityHref(
        input({ docType: 'public_enterprise', cuis: ['12345'] }),
      )
      expect(result).toEqual({ href: '/entities/12345', isExternal: false })
    })

    it('routes ngo to /entities/$cui', () => {
      const result = entityHref(input({ docType: 'ngo', cuis: ['99999'] }))
      expect(result).toEqual({ href: '/entities/99999', isExternal: false })
    })

    it('uses the first CUI when several are present', () => {
      const result = entityHref(
        input({ docType: 'company', cuis: ['111', '222'] }),
      )
      expect(result?.href).toBe('/companies/111')
    })

    it('skips blank CUIs and uses the first non-empty one', () => {
      const result = entityHref(
        input({ docType: 'company', cuis: ['', '  ', '333'] }),
      )
      expect(result?.href).toBe('/companies/333')
    })

    it('falls back to the external url when no CUI is present', () => {
      const result = entityHref(
        input({ docType: 'company', cuis: [], url: 'https://example.test/x' }),
      )
      expect(result).toEqual({
        href: 'https://example.test/x',
        isExternal: true,
      })
    })

    it('returns null when no CUI and no url', () => {
      expect(entityHref(input({ docType: 'company', cuis: [] }))).toBeNull()
    })
  })

  describe('parliament doc types', () => {
    it('routes member to /parlament/membri/$docId', () => {
      const result = entityHref(input({ docType: 'member', docId: '4205' }))
      expect(result).toEqual({
        href: '/parlament/membri/4205',
        isExternal: false,
      })
    })

    it('routes bill to /parlament/proiecte/$docId', () => {
      const result = entityHref(input({ docType: 'bill', docId: '29892' }))
      expect(result).toEqual({
        href: '/parlament/proiecte/29892',
        isExternal: false,
      })
    })

    it('falls back to url when member has no docId', () => {
      const result = entityHref(
        input({ docType: 'member', docId: null, url: 'https://cdep.test/m' }),
      )
      expect(result).toEqual({ href: 'https://cdep.test/m', isExternal: true })
    })

    it('returns null when bill has neither docId nor url', () => {
      expect(entityHref(input({ docType: 'bill', docId: null }))).toBeNull()
    })
  })

  describe('interim doc types open the external url', () => {
    const interim = [
      'legal_act',
      'mo_act',
      'pnrr_project',
      'pnrr_entity',
      'procurement_contract',
      'procurement_procedure',
    ]
    for (const docType of interim) {
      it(`routes ${docType} to its url (external)`, () => {
        const result = entityHref(
          input({ docType, url: 'https://gov.test/doc' }),
        )
        expect(result).toEqual({ href: 'https://gov.test/doc', isExternal: true })
      })

      it(`returns null for ${docType} with no url`, () => {
        expect(entityHref(input({ docType, url: null }))).toBeNull()
      })
    }
  })

  describe('unknown doc types', () => {
    it('opens the url externally for an unknown doc type', () => {
      const result = entityHref(
        input({ docType: 'something_new', url: 'https://x.test/y' }),
      )
      expect(result).toEqual({ href: 'https://x.test/y', isExternal: true })
    })

    it('returns null for an unknown doc type with no url', () => {
      expect(entityHref(input({ docType: 'something_new' }))).toBeNull()
    })

    it('trims a url before treating it as a target', () => {
      const result = entityHref(
        input({ docType: 'legal_act', url: '   https://x.test/z   ' }),
      )
      expect(result).toEqual({ href: 'https://x.test/z', isExternal: true })
    })

    it('treats a whitespace-only url as no target', () => {
      expect(entityHref(input({ docType: 'legal_act', url: '   ' }))).toBeNull()
    })
  })
})
