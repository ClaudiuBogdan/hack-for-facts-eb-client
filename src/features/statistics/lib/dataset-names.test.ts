import { describe, expect, it } from 'vitest'
import { contextDisplayName, datasetDisplayName } from './dataset-names'

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
})

describe('contextDisplayName', () => {
  it('names the context in the reader\'s language, with a fallback, or not at all', () => {
    expect(contextDisplayName(dataset, 'ro')).toBe('4. SOMERI INREGISTRATI')
    expect(contextDisplayName(dataset, 'en')).toBe('4. REGISTERED UNEMPLOYED')
    expect(contextDisplayName({ ...dataset, contextNameEn: null }, 'en')).toBe('4. SOMERI INREGISTRATI')
    expect(contextDisplayName({ contextNameRo: null, contextNameEn: null }, 'ro')).toBeNull()
  })
})
