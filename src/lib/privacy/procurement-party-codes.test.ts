import { describe, expect, it } from 'vitest'
import { withoutProcurementPartyCodes as scrub } from './procurement-party-codes'

describe('withoutProcurementPartyCodes (D6, root; TEL-001)', () => {
  it('masks party codes in procurement and company addresses, paths and filters', () => {
    // After a party marker every number in the word is masked, a year included: the blunt rule no spelling gets past.
    expect(scrub('/procurement/analytics?tip=directe&perioada=2025&furnizor=14837428&cumparator=4267117')).toBe('/procurement/analytics?tip=directe&perioada=2025&furnizor=_&cumparator=_')
    expect(scrub('/procurement/analytics?tip=directe&furnizor=14837428&cumparator=4267117&perioada=2025')).toBe('/procurement/analytics?tip=directe&furnizor=_&cumparator=_&perioada=_')
    expect(scrub('https://transparenta.eu/procurement/suppliers/14837428?year=2025#top')).toBe('https://transparenta.eu/procurement/suppliers/_?year=_#top')
    expect(scrub('/procurement/institutions/4267117')).toBe('/procurement/institutions/_')
    // A contract-award winner's list (KB0Z): a code typed or linked there may be a person's.
    expect(scrub('https://transparenta.eu/procurement/contract-awards/winners/1850101123456?year=2024')).toBe('https://transparenta.eu/procurement/contract-awards/winners/_?year=_')
    expect(scrub('/procurement/contract-awards/winners/14837428')).toBe('/procurement/contract-awards/winners/_')
    // An escaped delimiter before the code: read, it would end the segment and leave the code after it.
    for (const escape of ['%23', '%3F', '%2F', '%2523']) {
      expect(scrub(`/procurement/contract-awards/winners/${escape}1850101123456?year=2024`)).not.toContain('1850101123456')
      expect(scrub(`https://transparenta.eu/procurement/suppliers/${escape}1850101123456`)).not.toContain('1850101123456')
      expect(scrub(`/companies/${escape}1850101123456`)).not.toContain('1850101123456')
    }
    // An award's own id is no party code.
    expect(scrub('/procurement/contract-awards/e_licitatie:ca:100234:550011')).toBe('/procurement/contract-awards/e_licitatie:ca:100234:550011')
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

/** Every counterexample of the confirmation run on 199be7c4 (Sol, 25 November 2026), and their kin: none may keep the code. */
describe('no spelling of a party address keeps its code (TEL-001)', () => {
  const CODE = '1850101123456'
  const leaks = (out: string) => out.includes(CODE) || /\d{6,}/u.test(out.replace(/[^0-9]/gu, ''))

  it.each([
    // An escaped path word, delimiter or slash, at any depth.
    '/procurement/supplier%73/%231850101123456',
    '/companie%73/%3F1850101123456',
    '/cookies?redirect=%2Fprocurement%2Fsuppliers%2F%252f1850101123456',
    '/cookies?redirect=%252Fprocurement%252Fcontract-awards%252Fwinners%252F%252523%252531%252538%252535%252530%252531%252530%252531%252531%252532%252533%252534%252535%252536',
    '/cookies?redirect=%2Fprocurement%2Fsuppliers%2F18%253F50101123456',
    '/cookies?redirect=%2525252Fprocurement%2525252Fsuppliers%2525252F1850101123456',
    '/procurement/suppliers/%2f1850101123456',
    '/procurement/suppliers/%2F1850101123456',
    // Path variants a browser resolves to the same page.
    '/procurement/suppliers;x=1/1850101123456',
    '/procurement/suppliers/1850101123456;v=1',
    'https://example.test\\procurement\\suppliers\\1850101123456',
    '/procurement/suppliers%5C1850101123456',
    '/procurement//suppliers/1850101123456',
    '/procurement/suppliers//1850101123456',
    '/procurement/suppliers/./1850101123456',
    '/procurement/suppliers/other/../1850101123456',
    '/procurement/suppliers/%2e/1850101123456',
    '/procurement/suppliers/1850101123456.',
    // The company page wherever it stands.
    '/other/../companies/1850101123456',
    '//example.test/companies/1850101123456',
    'Navigation failed [/companies/1850101123456].',
    '/companies/analytics/../1850101123456',
    '/companies/analytics%3F/../1850101123456',
    '/companies/search#/../1850101123456',
    // Quotes, split digits, other digits.
    "https://example.test/procurement/suppliers/'1850101123456'",
    '/procurement/suppliers/185-0101-123456',
    '/procurement/suppliers/１８５０１０１１２３４５６',
    '/procurement/analytics?furnizor%20=%201850101123456',
    'https://user:pw@example.test:8443/PROCUREMENT/Winners/1850101123456',
  ])('masks %s', (input) => {
    const out = scrub(input)
    expect(out).not.toContain(CODE)
    expect(leaks(out)).toBe(false)
  })

  it('masks a chain of escapes longer than any reader stacks, whole', () => {
    let deep = '/procurement/suppliers/1850101123456'
    for (let layer = 0; layer < 14; layer += 1) deep = encodeURIComponent(deep)
    expect(scrub(deep)).not.toMatch(/\d{3,}/u)
  })
})
