import { describe, expect, it } from 'vitest'
import { correctInsEnglish, insText } from './ins-english'

describe('correctInsEnglish', () => {
  it.each([
    ['Thousands persons', 'Thousand persons'],
    ['Millions lei RON', 'Million lei RON'],
    ['MU: Billions lei, lei RON, thousands lei RON, millions lei RON (from 2005)', 'MU: Billion lei, lei RON, thousand lei RON, million lei RON (from 2005)'],
    ['Thousandss tonnes equivalent oil', 'Thousand tonnes equivalent oil'],
    ['MU: Thousands cubits metres', 'MU: Thousand cubic metres'],
    ['Cubics metres per day', 'Cubic metres per day'],
    ['Millions metres cubics/ year', 'Million cubic metres/ year'],
    ['Squares metres useful area', 'Square metres useful area'],
    ['Live births per 1000 inhabitans', 'Live births per 1000 inhabitants'],
    ['CANE Rev.2 (activity of national economy-sections)', 'NACE Rev.2 (activity of national economy-sections)'],
    ['MU: Thou hours', 'MU: Thousand hours'],
    ['Printed copies thou', 'Thousand printed copies'],
    ['MU: LEI million', 'MU: Million lei'],
    ['Promile', 'Per mille'],
    ['Number of spectacles', 'Number of performances'],
    ['MU: Thousands tones', 'MU: Thousand tonnes'],
  ])('%s → %s', (raw, corrected) => {
    expect(correctInsEnglish(raw)).toBe(corrected)
  })

  it('leaves correct English as it is: a multiplier off a unit, squares and tones that are not units', () => {
    for (const text of [
      'Number of persons',
      'Thousands',
      'Thousands of persons',
      'Thousands and hundreds of persons',
      'Millions (current prices)',
      'Thousands of squares',
      'Parks and squares',
      'Warm tones',
      'Percentage',
      'Lei RON',
      'NACE Rev.2 (economic activities)',
    ])
      expect(correctInsEnglish(text)).toBe(text)
  })
})

describe('insText', () => {
  it('reads the English, corrected, on an English page and the Romanian on a Romanian one', () => {
    expect(insText('Mii metri cubi', 'Thousands cubits metres', 'en')).toBe('Thousand cubic metres')
    expect(insText('Mii metri cubi', 'Thousands cubits metres', 'ro')).toBe('Mii metri cubi')
    expect(insText('Feminin ', 'Female ', 'en')).toBe('Female')
  })

  it('falls back to the other language where the one asked for is missing', () => {
    expect(insText('Sexe', null, 'en')).toBe('Sexe')
    expect(insText(null, 'Sex', 'ro')).toBe('Sex')
    expect(insText('  ', '', 'en')).toBeNull()
  })
})
