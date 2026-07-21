import { describe, expect, it } from 'vitest'
import {
  analysisGrainToSearchGrain,
  partyLabel,
  partyPairSearchLink,
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

  it('maps analysis grain to search grain', () => {
    expect(analysisGrainToSearchGrain('contract')).toBe('contracts')
    expect(analysisGrainToSearchGrain('direct_acquisition')).toBe(
      'direct_acquisitions',
    )
  })

  it('builds pair search links sorted by value', () => {
    expect(
      partyPairSearchLink({
        pairScope: { kind: 'authority', cui: ' 111 ' },
        counterpart: { cui: ' 222 ', name: null, displayName: 'Supplier' },
        counterpartKind: 'supplier',
        grain: 'direct_acquisition',
      }),
    ).toEqual({
      to: '/procurement',
      search: {
        view: 'list',
        authority_cui: '111',
        supplier_cui: '222',
        grain: 'direct_acquisitions',
        sort: 'value_desc',
      },
    })

    expect(
      partyPairSearchLink({
        pairScope: { kind: 'supplier', cui: '222' },
        counterpart: { cui: '111', name: null, displayName: 'Buyer' },
        counterpartKind: 'authority',
        grain: 'contract',
      }),
    ).toEqual({
      to: '/procurement',
      search: {
        view: 'list',
        authority_cui: '111',
        supplier_cui: '222',
        grain: 'contracts',
        sort: 'value_desc',
      },
    })
  })

  it('rejects invalid pair scopes', () => {
    expect(
      partyPairSearchLink({
        pairScope: { kind: 'authority', cui: '111' },
        counterpart: { cui: null, name: 'X', displayName: null },
        counterpartKind: 'supplier',
        grain: 'contract',
      }),
    ).toBeNull()
    expect(
      partyPairSearchLink({
        pairScope: { kind: 'authority', cui: '111' },
        counterpart: { cui: '222', name: null, displayName: null },
        counterpartKind: 'authority',
        grain: 'contract',
      }),
    ).toBeNull()
  })
})
