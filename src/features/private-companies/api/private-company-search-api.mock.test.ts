import { describe, expect, it } from 'vitest'
import { MOCK_REGISTRY_ENVELOPE } from '../mocks/fixtures/registry'
import { CompanyRegistryScopeMovedError } from './company-registry-errors'
import { fetchPrivateCompanySearchMock } from './private-company-search-api.mock'

const base = { pageSize: 25, scopeKey: MOCK_REGISTRY_ENVELOPE.scopeKey } as const

async function names(query: Parameters<typeof fetchPrivateCompanySearchMock>[0]) {
  const page = await fetchPrivateCompanySearchMock(query)
  return page.items.map((item) => item.name)
}

describe('fetchPrivateCompanySearchMock (labelled mock edition)', () => {
  it('answers every fixture under the mock scope, and says it is a mock', async () => {
    const page = await fetchPrivateCompanySearchMock(base)
    expect(page.items).toHaveLength(7)
    expect(page.registry).toMatchObject({ mode: 'mock', state: 'published', scopeKey: MOCK_REGISTRY_ENVELOPE.scopeKey })
    expect(page.totalEstimated).toBe(false)
  })

  it('refuses a read bound to another scope instead of answering for it', async () => {
    await expect(fetchPrivateCompanySearchMock({ ...base, scopeKey: 'onrc:published:8:4:12' })).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
  })

  it('matches a status on ANY observation: 1048 beside a conflicting 1070 is active', async () => {
    // Unsorted results follow fixture order, which is ascending numeric CUI.
    expect(await names({ ...base, status: ['1048'] })).toEqual(['ANTIBIOTICE SA', 'TRANSPORT OLTENIA SNC', 'DANTE INTERNATIONAL SA', 'POPA IOANA PFA'])
    expect(await names({ ...base, status: ['1070'] })).toEqual(['TRANSPORT OLTENIA SNC'])
  })

  it('keeps the conflict visible on the row instead of picking a status', async () => {
    const page = await fetchPrivateCompanySearchMock({ ...base, status: ['1070'] })
    expect(page.items[0]).toMatchObject({ status: null, statusBasis: 'multiple_values', hasActiveObservation: true })
  })

  it('ORs within a facet and ANDs across facets; a county by code or name', async () => {
    expect(await names({ ...base, county: ['CJ'] })).toEqual(['POPA IOANA PFA'])
    expect(await names({ ...base, county: ['Cluj'] })).toEqual(['POPA IOANA PFA'])
    expect(await names({ ...base, county: ['CJ', 'DJ'], status: ['1070'] })).toEqual(['TRANSPORT OLTENIA SNC'])
    // A part of a name is not a county.
    expect(await names({ ...base, county: ['Clu'] })).toEqual([])
  })

  it('never answers a registry filter for a CUI the edition holds no profile for', async () => {
    const page = await fetchPrivateCompanySearchMock(base)
    const outside = page.items.find((item) => item.cui === '9718383')
    expect(outside).toMatchObject({ registryCuiState: 'not_in_edition', nameSource: 'core_organization', status: null, registrationDate: null })
    expect(await names({ ...base, status: ['1048', '1084', '1107', '1070'] })).not.toContain('EXEMPLU REGISTRU CULTURAL')
  })

  it('matches the broad CAEN code in any revision, by prefix below four digits', async () => {
    expect(await names({ ...base, caen: '47' })).toEqual(['MAGAZINUL VECHI SRL', 'DANTE INTERNATIONAL SA'])
    expect(await names({ ...base, caen: '4711' })).toEqual(['MAGAZINUL VECHI SRL'])
  })

  it('matches an exact selector only in its own revision, Rev.0 included', async () => {
    expect(await names({ ...base, onrcCaen: ['rev0:5211'] })).toEqual(['MAGAZINUL VECHI SRL'])
    expect(await names({ ...base, onrcCaen: ['rev2:5211'] })).toEqual([])
    expect(await names({ ...base, onrcCaen: ['rev1:2442'] })).toEqual(['ANTIBIOTICE SA'])
  })

  it('applies the inclusive recorded-date range; a CUI without a recorded date never matches one', async () => {
    expect(await names({ ...base, regFrom: '2021-01-01' })).toEqual(['POPA IOANA PFA'])
    expect(await names({ ...base, regTo: '1995-01-01' })).toEqual(['MAGAZINUL VECHI SRL'])
  })

  it('applies the fiscal switches as ANAF answers them', async () => {
    expect(await names({ ...base, inactive: true })).toEqual(['MAGAZINUL VECHI SRL', 'TRANSPORT OLTENIA SNC'])
    expect(await names({ ...base, vat: false, inactive: false })).toEqual(['POPA IOANA PFA'])
  })

  it('matches q against the name and the exact CUI', async () => {
    expect(await names({ ...base, q: 'dante' })).toEqual(['DANTE INTERNATIONAL SA'])
    expect(await names({ ...base, q: '14399840' })).toEqual(['DANTE INTERNATIONAL SA'])
  })

  it('sorts by name, CUI and recorded date (newest first)', async () => {
    expect(await names({ ...base, status: ['1048'], sort: 'name' })).toEqual(['ANTIBIOTICE SA', 'DANTE INTERNATIONAL SA', 'POPA IOANA PFA', 'TRANSPORT OLTENIA SNC'])
    expect((await names({ ...base, sort: 'registration-date' }))[0]).toBe('POPA IOANA PFA')
    expect((await names({ ...base, sort: 'cui' }))[0]).toBe('ANTIBIOTICE SA')
  })
})
