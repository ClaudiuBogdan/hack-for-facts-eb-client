import { describe, expect, it } from 'vitest'
import { analyticsSearchOf, stateOf } from './company-analytics-url'
import { companyDirectoryRedirect, directoryCountyCode, hasDirectorySearch } from './company-directory-redirect'

/** What the analysis reads from the address a redirect writes. */
function analysisOf(search: Record<string, unknown>) {
  return stateOf(analyticsSearchOf(search))
}

describe('companyDirectoryRedirect', () => {
  it('opens the analysis on the directory’s filters, as the ONRC observations of one identifier', () => {
    const target = companyDirectoryRedirect({ county: 'CLUJ', status: '1048', vat: true, lang: 'en' })
    expect(target).toEqual({ to: '/companies/analytics', search: { lang: 'en', onrc_judet: 'CJ', onrc_stare: 1048, tva: 'da' } })
    const state = analysisOf(target.search)
    expect(state.scope).toEqual({ onrc: { county: ['CJ'], status: ['1048'] }, vatPayer: ['YES'] })
    expect(state.unread).toEqual([])
  })

  it('carries every filter the analysis has, each list in one key', () => {
    const target = companyDirectoryRedirect({
      county: ['B', 'Timiş'],
      status: '1070,1107',
      caen: '6201',
      onrcCaen: 'REV2:6201,rev3:6210',
      legalForm: '["SRL","SA"]',
      inactive: 'false',
    })
    expect(target.to).toBe('/companies/analytics')
    expect(analysisOf(target.search).scope).toEqual({
      legalForms: ['SA', 'SRL'],
      fiscallyInactive: ['NO'],
      onrc: { status: ['1070', '1107'], county: ['B', 'TM'], caenCode: ['6201'], onrcCaen: ['rev2:6201', 'rev3:6210'] },
    })
  })

  it('leaves a value the analysis cannot read for it to name, rather than widening the question in silence', () => {
    // The directory took a CAEN prefix; the analysis takes four digits.
    const target = companyDirectoryRedirect({ caen: '62', status: '1048' })
    expect(target.search).toMatchObject({ onrc_caen: 62, onrc_stare: 1048 })
    expect(analysisOf(target.search).unread).toEqual(['onrc_caen'])
  })

  it('opens a company’s page for a CUI alone, and filters the analysis by it beside other filters', () => {
    expect(companyDirectoryRedirect({ q: 14399840, lang: 'en' })).toEqual({ to: '/companies/$cui', params: { cui: '14399840' }, search: { lang: 'en' } })
    expect(companyDirectoryRedirect({ q: 'RO14399840' })).toEqual({ to: '/companies/$cui', params: { cui: '14399840' }, search: {} })
    expect(companyDirectoryRedirect({ q: '14399840', county: 'CJ' })).toEqual({ to: '/companies/analytics', search: { onrc_judet: 'CJ', cui: 14399840 } })
  })

  it('sends a name alone, or nothing the directory read, to the front door’s search', () => {
    expect(companyDirectoryRedirect({ q: 'dante', lang: 'en' })).toEqual({ to: '/companies', search: { lang: 'en' } })
    expect(companyDirectoryRedirect({ sort: 'name' })).toEqual({ to: '/companies', search: {} })
    expect(companyDirectoryRedirect({})).toEqual({ to: '/companies', search: {} })
  })

  it('carries what the analysis cannot filter under keys it names as not answered, so its wider answer is not taken for the question', () => {
    // A name beside filters, and a recorded-date range: the analysis has neither filter.
    const target = companyDirectoryRedirect({ q: 'ROMSTAL', county: 'CJ', regFrom: '2020-01-01', regTo: '2021-12-31', sort: 'name' })
    expect(target).toEqual({ to: '/companies/analytics', search: { onrc_judet: 'CJ', inregistrare: '2020-01-01~2021-12-31', nume: 'ROMSTAL' } })
    const state = analysisOf(target.search)
    expect(state.scope).toEqual({ onrc: { county: ['CJ'] } })
    expect(state.unread).toEqual(['nume', 'inregistrare'])
    // An open range keeps its open end.
    expect(companyDirectoryRedirect({ regTo: '2021-12-31' }).search).toEqual({ inregistrare: '~2021-12-31' })
  })
})

describe('companyDirectoryRedirect — the analysis’s population', () => {
  it('sends a form outside it over for the analysis to name, not to answer as zero', () => {
    const target = companyDirectoryRedirect({ legalForm: 'PFA', county: 'CJ' })
    expect(target.search).toEqual({ forma: 'PFA', onrc_judet: 'CJ' })
    const state = analysisOf(target.search)
    expect(state.scope).toEqual({ onrc: { county: ['CJ'] } })
    expect(state.unread).toEqual(['forma'])
  })
})

describe('directoryCountyCode', () => {
  it('reads a code, or the registry’s spellings of a name, as the county’s code', () => {
    expect(directoryCountyCode('cj')).toBe('CJ')
    expect(directoryCountyCode('IAŞI')).toBe('IS')
    expect(directoryCountyCode('MUNICIPIUL BUCUREŞTI')).toBe('B')
    expect(directoryCountyCode('Județul Timiș')).toBe('TM')
  })

  it('keeps a name no county folds to as written', () => {
    expect(directoryCountyCode('Atlantida')).toBe('Atlantida')
  })
})

describe('hasDirectorySearch', () => {
  it('is a key of the directory with a value it read', () => {
    expect(hasDirectorySearch({ county: 'CJ' })).toBe(true)
    expect(hasDirectorySearch({ q: ' ' })).toBe(false)
    expect(hasDirectorySearch({ sort: 'bogus', indicator: 'densitate', lang: 'en' })).toBe(false)
  })
})
