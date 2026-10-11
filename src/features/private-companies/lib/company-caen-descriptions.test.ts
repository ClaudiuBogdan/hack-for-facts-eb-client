import { describe, expect, it } from 'vitest'
import { caenText } from './company-analytics-text'

describe('CAEN descriptions without cross-revision borrowing', () => {
  it('shows identical catalog text while keeping the source revision unknown', () => {
    const caen = { code: '4941', revision: null, label: 'Transporturi rutiere de mărfuri', descriptionStatus: 'CONSENSUS' as const, descriptions: [{ revision: 'rev2' as const, label: 'Transporturi rutiere de mărfuri' }, { revision: 'rev3' as const, label: 'Transporturi rutiere de mărfuri' }] }
    expect(caenText(caen)).toBe('4941 · Transporturi rutiere de mărfuri (revizie nepublicată)')
    expect(caen.revision).toBeNull()
  })

  it('shows water and building descriptions as separate alternatives rather than selecting one', () => {
    expect(caenText({ code: '4100', revision: null, label: null, descriptionStatus: 'CONFLICT', descriptions: [{ revision: 'rev1', label: 'Captarea, tratarea și distribuția apei' }, { revision: 'rev3', label: 'Lucrări de construcții ale clădirilor rezidențiale și nerezidențiale' }] })).toBe('4100 (revizie nepublicată; denumiri diferite) · Rev.1: Captarea, tratarea și distribuția apei / Rev.3: Lucrări de construcții ale clădirilor rezidențiale și nerezidențiale')
  })

  it('combines only identical description text and retains all of its revision qualifiers', () => {
    expect(caenText({ code: '2932', revision: null, label: null, descriptionStatus: 'CONFLICT', descriptions: [{ revision: 'rev0', label: 'Mașini agricole' }, { revision: 'rev1', label: 'Mașini agricole' }, { revision: 'rev2', label: 'Piese pentru autovehicule' }] })).toBe('2932 (revizie nepublicată; denumiri diferite) · Rev.0, Rev.1: Mașini agricole / Rev.2: Piese pentru autovehicule')
  })

  it('ignores a legacy borrowed scalar label for an unknown revision', () => {
    expect(caenText({ code: '6210', revision: null, label: 'Transport aerian' })).toBe('6210 (revizie necunoscută)')
  })

  it('refuses a claimed consensus whose candidate descriptions differ or are missing', () => {
    expect(caenText({ code: '4100', revision: null, label: 'Apă', descriptionStatus: 'CONSENSUS', descriptions: [{ revision: 'rev1', label: 'Apă' }, { revision: 'rev3', label: 'Clădiri' }] })).toBe('4100 (revizie necunoscută)')
    expect(caenText({ code: '4100', revision: null, label: 'Apă', descriptionStatus: 'CONSENSUS', descriptions: [] })).toBe('4100 (revizie necunoscută)')
  })

  it('keeps a known revision exact and an absent description explicit', () => {
    expect(caenText({ code: '4100', revision: 'rev3', label: 'Clădiri' })).toBe('4100 · Clădiri')
    expect(caenText({ code: '0000', revision: 'rev0', label: null })).toBe('0000 (rev0)')
  })
})
