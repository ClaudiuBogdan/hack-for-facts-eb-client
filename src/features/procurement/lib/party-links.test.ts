import { describe, expect, it } from 'vitest'
import {
  partyLabel,
  partyProcurementLink,
  partyProcurementRoute,
  partyProfileLink,
  partyRoute,
} from './party-links'

describe('party links', () => {
  it('labels fall back displayName → name → cui → unknown', () => {
    expect(
      partyLabel({ cui: '1', name: 'Name', displayName: 'Display' }),
    ).toBe('Display')
    expect(partyLabel({ cui: '1', name: 'Name', displayName: null })).toBe(
      'Name',
    )
    expect(partyLabel({ cui: '1', name: null, displayName: null })).toBe('1')
    expect(
      partyLabel({ cui: null, name: null, displayName: null }),
    ).not.toHaveLength(0)
  })

  it('routes authorities to entities and suppliers to companies', () => {
    expect(partyRoute('authority')).toBe('/entities/$cui')
    expect(partyRoute('supplier')).toBe('/companies/$cui')
  })

  it('routes procurement spine to institutions and suppliers pages', () => {
    expect(partyProcurementRoute('authority')).toBe(
      '/procurement/institutions/$cui',
    )
    expect(partyProcurementRoute('supplier')).toBe(
      '/procurement/suppliers/$cui',
    )
  })

  it('profile link is null without a CUI', () => {
    expect(
      partyProfileLink({ cui: null, name: 'X', displayName: null }, 'supplier'),
    ).toBeNull()
    expect(
      partyProfileLink({ cui: ' 12 ', name: null, displayName: null }, 'supplier'),
    ).toEqual({ to: '/companies/$cui', params: { cui: '12' } })
  })

  it('procurement link is null without a CUI', () => {
    expect(
      partyProcurementLink(
        { cui: null, name: 'X', displayName: null },
        'authority',
      ),
    ).toBeNull()
    expect(
      partyProcurementLink(
        { cui: ' 4267117 ', name: null, displayName: null },
        'authority',
      ),
    ).toEqual({
      to: '/procurement/institutions/$cui',
      params: { cui: '4267117' },
    })
  })
})
