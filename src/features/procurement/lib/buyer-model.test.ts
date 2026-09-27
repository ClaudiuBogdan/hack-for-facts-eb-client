import { describe, expect, it } from 'vitest'
import { buyerName, buyerYear, isEmptyYear, perResident, steadySellers, supplierName, tidyAddress } from './buyer-model'
import { buyerProfile } from './buyer.fixture'

describe('buyerName', () => {
  it('names a town hall by its territory, with its diacritics', () => {
    expect(buyerName('ORASUL OTOPENI', { kind: 'town', name: 'ORAȘ OTOPENI' }, true)).toBe('Orașul Otopeni')
    expect(buyerName('COMUNA SURDUC', { kind: 'commune', name: 'SURDUC' }, true)).toBe('Comuna Surduc')
    expect(buyerName('MUNICIPIUL ZALAU', { kind: 'municipality', name: 'MUNICIPIUL ZALĂU' }, true)).toBe('Municipiul Zalău')
  })

  it('keeps the registry name, tidied, for anyone else', () => {
    expect(buyerName('INSTITUTUL CLINIC FUNDENI', { kind: 'sector', name: 'SECTORUL 2' }, false)).toBe('Institutul Clinic Fundeni')
    expect(buyerName('REGIA NATIONALA A PADURILOR ROMSILVA RA', null, false)).toBe('Regia Nationala a Padurilor Romsilva RA')
    // A sector's town hall is its sector, as the territory names it.
    expect(buyerName('SECTORUL 3 AL MUNICIPIULUI BUCURESTI', { kind: 'sector', name: 'SECTORUL 3' }, true)).toBe('Sectorul 3')
  })
})

describe('tidyAddress', () => {
  it('drops the empty form fields and the county it opens with', () => {
    expect(tidyAddress('Ilfov, Orasul Otopeni, STRADA 23 August, Numar 10, Bloc/Scara , Sector , Cod postal 75100')).toBe(
      'Orasul Otopeni, Str. 23 August, nr. 10, 75100',
    )
    expect(tidyAddress('Bucuresti, Sectorul 1, BULEVARD DINICU GOLESCU, Numar 38, Bloc/Scara -, Sector 1, Cod postal 10873')).toBe(
      'Sectorul 1, Bd. Dinicu Golescu, nr. 38, sector 1, 10873',
    )
    expect(tidyAddress(null)).toBeNull()
    expect(tidyAddress('Salaj')).toBeNull()
  })
})

describe('buyerYear', () => {
  it('takes a year from 2019 through the last complete one, and the last complete one otherwise', () => {
    expect(buyerYear(2023, 2025)).toBe(2023)
    expect(buyerYear(2019, 2025)).toBe(2019)
    expect(buyerYear(2018, 2025)).toBe(2025)
    expect(buyerYear(2026, 2025)).toBe(2025)
    expect(buyerYear(undefined, 2025)).toBe(2025)
  })
})

describe('the profile helpers', () => {
  it('gives lei per resident for a town hall only', () => {
    expect(perResident(buyerProfile())).toBeCloseTo(1_606.56, 1)
    expect(perResident(buyerProfile({ identity: { ...buyerProfile().identity, isTownHall: false } }))).toBeNull()
    expect(perResident(buyerProfile({ direct: { count: 0, valued: 0, value: null, suppliers: 0 } }))).toBeNull()
  })

  it('calls a year empty only when it has no record of any kind', () => {
    const none = { count: 0, valued: 0, value: null, suppliers: 0 }
    expect(isEmptyYear(buyerProfile())).toBe(false)
    expect(isEmptyYear(buyerProfile({ direct: none, awards: none, frameworks: 0 }))).toBe(true)
    expect(isEmptyYear(buyerProfile({ direct: none, awards: none, frameworks: 2 }))).toBe(false)
  })

  it('finds the firms that sold in all years but one at most', () => {
    const profile = buyerProfile()
    expect(steadySellers(profile.supplierYears, 2025).map((row) => row.cui)).toEqual(['9813902'])
  })

  it('names a supplier, or shows its CUI when the spine cannot', () => {
    const profile = buyerProfile()
    expect(supplierName(profile, '30153499')).toBe('Upper Level SRL')
    expect(supplierName(profile, '00041200627')).toBe('00041200627')
  })
})
