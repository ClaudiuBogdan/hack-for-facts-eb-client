import { describe, expect, it } from 'vitest'
import { withoutProcurementPartyCodes as scrub } from './procurement-party-codes'

describe('withoutProcurementPartyCodes (D6, root; TEL-001)', () => {
  it('masks party codes in procurement and company addresses, paths and filters', () => {
    expect(scrub('/procurement/analytics?tip=directe&furnizor=14837428&cumparator=4267117&perioada=2025')).toBe('/procurement/analytics?tip=directe&furnizor=_&cumparator=_&perioada=2025')
    expect(scrub('https://transparenta.eu/procurement/suppliers/14837428?year=2025#top')).toBe('https://transparenta.eu/procurement/suppliers/_?year=2025#top')
    expect(scrub('/procurement/institutions/4267117')).toBe('/procurement/institutions/_')
    expect(scrub('/procurement/procedures/companies/14837428')).toBe('/procurement/procedures/companies/_')
    expect(scrub('/companies/14837428?tab=bani')).toBe('/companies/_?tab=bani')
    expect(scrub('https://transparenta.eu/companies/RO14837428')).toBe('https://transparenta.eu/companies/_')
  })

  it('without regard to case, through encoding, and inside longer text', () => {
    expect(scrub('/Procurement/Analytics?tip=directe&Furnizor=14837428')).toBe('/Procurement/Analytics?tip=directe&Furnizor=_')
    expect(scrub('/PROCUREMENT/SUPPLIERS/14837428')).toBe('/PROCUREMENT/SUPPLIERS/_')
    expect(scrub('/cookies?redirect=%2Fprocurement%2Fsuppliers%2F14837428%3Fyear%3D2025')).not.toContain('14837428')
    expect(scrub('/cookies?redirect=%252Fprocurement%252Fanalytics%253Ffurnizor%253D14837428')).not.toContain('14837428')
    expect(scrub('/companies/%314837428')).toBe('/companies/_')
    expect(scrub('/procurement/analytics?%66urnizor=14837428')).not.toContain('14837428')
    expect(scrub('/procurement/suppliers/148%33%37428')).toBe('/procurement/suppliers/_')
    expect(scrub('Navigation to /procurement/suppliers/14837428 failed')).toBe('Navigation to /procurement/suppliers/_ failed')
    expect(scrub('(see /procurement/suppliers/14837428).')).toBe('(see /procurement/suppliers/_).')
  })

  it('masks the party filters in a query string stored without its path', () => {
    expect(scrub('?tip=directe&furnizor=14837428')).toBe('?tip=directe&furnizor=_')
    expect(scrub('tip=directe&cumparator=4267117')).toBe('tip=directe&cumparator=_')
    expect(scrub('furnizor=14837428&tip=directe')).toBe('furnizor=_&tip=directe')
  })

  it('leaves other addresses alone', () => {
    expect(scrub('/procurement/direct-acquisitions/16957145')).toBe('/procurement/direct-acquisitions/16957145')
    expect(scrub('/companies/analytics?x=1')).toBe('/companies/analytics?x=1')
    expect(scrub('/companies/search')).toBe('/companies/search')
    expect(scrub('/entities/4267117')).toBe('/entities/4267117')
    expect(scrub('/justice/cases/companies/:caseNumber')).toBe('/justice/cases/companies/:caseNumber')
    expect(scrub('/budget?furnizorx=1')).toBe('/budget?furnizorx=1')
    expect(scrub('/cookies?redirect=%2Fbudget%2F1')).toBe('/cookies?redirect=%2Fbudget%2F1')
  })
})

describe('withoutCodesInTitle (TEL-001)', () => {
  it('masks the fiscal codes a page title names, in both languages', async () => {
    const { withoutCodesInTitle } = await import('./procurement-party-codes')
    expect(withoutCodesInTitle('Example SRL (CUI 14837428) — Transparenta.eu')).toBe('Example SRL (CUI _) — Transparenta.eu')
    expect(withoutCodesInTitle('Furnizor CUI RO14837428 — Achiziții publice')).toBe('Furnizor CUI _ — Achiziții publice')
    expect(withoutCodesInTitle('Firma cu CUI 14837428')).toBe('Firma cu CUI _')
    expect(withoutCodesInTitle('The institution with tax ID 4267117')).toBe('The institution with tax ID _')
    expect(withoutCodesInTitle('Firma cu CUI 123456789012')).toBe('Firma cu CUI _')
    expect(withoutCodesInTitle('Furnizor CUI 7')).toBe('Furnizor CUI _')
    expect(withoutCodesInTitle('Buget 2025 — Transparenta.eu')).toBe('Buget 2025 — Transparenta.eu')
  })
})


describe('the scrub\'s further forms (TEL-001)', () => {
  it('a code named in any text, legacy filter names, a malformed byte beside an escape, codes of any length', async () => {
    const { withoutNamedCodes, withoutProcurementPartyCodes: scrub } = await import('./procurement-party-codes')
    expect(withoutNamedCodes('button[aria-label="Copiază CUI 14837428"]')).toBe('button[aria-label="Copiază CUI _"]')
    expect(withoutNamedCodes('Copy CUI 1234567890123456')).toBe('Copy CUI _')
    expect(scrub('/procurement/analytics?supplier_cui=14837428&authority_cui=4267117')).toBe('/procurement/analytics?supplier_cui=_&authority_cui=_')
    expect(scrub('/x?r=%FF%2Fcompanies%2F14837428')).not.toContain('14837428')
  })
})

describe('foreign and quoted codes (TEL-001)', () => {
  it('masks a code with a country prefix or in quotes, and a quoted filter value', async () => {
    const { withoutNamedCodes, withoutProcurementPartyCodes: scrub } = await import('./procurement-party-codes')
    expect(withoutNamedCodes('tax ID BG131128432')).toBe('tax ID _')
    expect(withoutNamedCodes('button[title="CUI 4267117"]')).toBe('button[title="CUI _"]')
    expect(withoutNamedCodes('CUI "4267117"')).toBe('CUI "_"')
    expect(scrub('/procurement/analytics?furnizor="4267117"&tip=directe')).toBe('/procurement/analytics?furnizor="_"&tip=directe')
  })
})
