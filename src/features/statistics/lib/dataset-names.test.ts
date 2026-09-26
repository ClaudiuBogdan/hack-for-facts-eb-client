import { describe, expect, it } from 'vitest'
import { contextDisplayName, datasetDisplayName, sentenceCaseShouting } from './dataset-names'

const dataset = {
  code: 'SOM101B',
  nameRo: 'Șomerii înregistrați pe sexe',
  nameEn: 'Registered unemployed by sex',
  contextNameRo: '4. SOMERI INREGISTRATI',
  contextNameEn: '4. REGISTERED UNEMPLOYED',
}

describe('datasetDisplayName', () => {
  it('names the dataset in the reader\'s language', () => {
    expect(datasetDisplayName(dataset, 'ro')).toBe('Șomerii înregistrați pe sexe')
    expect(datasetDisplayName(dataset, 'en')).toBe('Registered unemployed by sex')
    expect(datasetDisplayName(dataset, 'en-GB')).toBe('Registered unemployed by sex')
  })

  it('falls back to the other language, then to the code', () => {
    expect(datasetDisplayName({ ...dataset, nameEn: null }, 'en')).toBe('Șomerii înregistrați pe sexe')
    expect(datasetDisplayName({ ...dataset, nameRo: ' ' }, 'ro')).toBe('Registered unemployed by sex')
    expect(datasetDisplayName({ code: 'X', nameRo: null, nameEn: null }, 'ro')).toBe('X')
  })

  it('sets a shouted opening in sentence case and keeps the breakdowns, in either language', () => {
    const shouted = {
      code: 'POP107D',
      nameRo: 'POPULATIA DUPA DOMICILIU la 1 ianuarie pe grupe de varsta si varste, sexe, judete si localitati',
      nameEn: 'LEGALLY RESIDENT POPULATION, by age group and ages, sex, counties and localities at January 1st.',
    }
    expect(datasetDisplayName(shouted, 'ro')).toBe(
      'Populatia dupa domiciliu la 1 ianuarie pe grupe de varsta si varste, sexe, judete si localitati',
    )
    expect(datasetDisplayName(shouted, 'en')).toBe(
      'Legally resident population, by age group and ages, sex, counties and localities at January 1st.',
    )
  })
})

describe('sentenceCaseShouting', () => {
  it('lowers a run of two or more capitalised words and leaves the rest', () => {
    expect(sentenceCaseShouting('SOMERI INREGISTRATI la sfarsitul lunii')).toBe('Someri inregistrati la sfarsitul lunii')
    expect(sentenceCaseShouting('ȘOMERI ÎNREGISTRAȚI')).toBe('Șomeri înregistrați')
  })

  it('leaves a single capitalised word, an acronym more often than a shout', () => {
    expect(sentenceCaseShouting('UAT pe judete si localitati')).toBe('UAT pe judete si localitati')
    expect(sentenceCaseShouting('Cifra de afaceri CAEN Rev.2')).toBe('Cifra de afaceri CAEN Rev.2')
  })
})

describe('contextDisplayName', () => {
  it('names the context in the reader\'s language, with a fallback, or not at all', () => {
    expect(contextDisplayName(dataset, 'ro')).toBe('4. SOMERI INREGISTRATI')
    expect(contextDisplayName(dataset, 'en')).toBe('4. REGISTERED UNEMPLOYED')
    expect(contextDisplayName({ ...dataset, contextNameEn: null }, 'en')).toBe('4. SOMERI INREGISTRATI')
    expect(contextDisplayName({ contextNameRo: null, contextNameEn: null }, 'ro')).toBeNull()
  })
})
