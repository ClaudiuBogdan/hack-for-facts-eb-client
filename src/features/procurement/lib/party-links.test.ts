import { describe, expect, it } from 'vitest'
import { partyLabel, partyProfileLink, partyRoute } from './party-links'

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

  it('profile link is null without a CUI', () => {
    expect(
      partyProfileLink({ cui: null, name: 'X', displayName: null }, 'supplier'),
    ).toBeNull()
    expect(
      partyProfileLink({ cui: ' 12 ', name: null, displayName: null }, 'supplier'),
    ).toEqual({ to: '/companies/$cui', params: { cui: '12' } })
  })
})
