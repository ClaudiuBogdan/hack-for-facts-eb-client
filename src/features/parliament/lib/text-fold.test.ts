import { describe, expect, it } from 'vitest'
import { foldSlug, foldText } from './text-fold'

/**
 * Romanian public data mixes two incompatible spellings of the same two
 * letters, and always has:
 *
 *   - the CORRECT comma-below forms  ș U+0219  ț U+021B  (Ș U+0218  Ț U+021A)
 *   - the legacy CEDILLA forms       ş U+015F  ţ U+0163  (Ş U+015E  Ţ U+0162)
 *
 * They are different code points that do NOT normalise to each other under any
 * Unicode form, so "Iaşi" and "Iași" are unequal strings. Both folds have to
 * flatten both to plain ASCII or half the chamber's own rows stop matching.
 */
const COMMA_BELOW = {
  s: 'ș',
  t: 'ț',
  S: 'Ș',
  T: 'Ț',
} as const
const CEDILLA = {
  s: 'ş',
  t: 'ţ',
  S: 'Ş',
  T: 'Ţ',
} as const

describe('foldText', () => {
  it('strips Romanian diacritics and lowercases', () => {
    expect(foldText('Băișanu')).toBe('baisanu')
    expect(foldText('Adomnicăi')).toBe('adomnicai')
    expect(foldText('Ședință comună')).toBe('sedinta comuna')
    expect(foldText('CÂMPULUNG')).toBe('campulung')
    expect(foldText('Întrebări')).toBe('intrebari')
  })

  it('folds comma-below and cedilla spellings to the SAME string', () => {
    for (const key of ['s', 't', 'S', 'T'] as const) {
      expect(foldText(COMMA_BELOW[key])).toBe(foldText(CEDILLA[key]))
    }
    // The real-world case: the two spellings of the same county name.
    expect(foldText('IAŞI')).toBe('iasi')
    expect(foldText('IAȘI')).toBe('iasi')
    expect(foldText('Mureş')).toBe(foldText('Mureș'))
    expect(foldText('Neafiliaţi')).toBe(foldText('Neafiliați'))
  })

  it('is idempotent and leaves plain ASCII alone', () => {
    expect(foldText(foldText('Ștefan Țurcanu'))).toBe('stefan turcanu')
    expect(foldText('psd-camera_deputatilor')).toBe('psd-camera_deputatilor')
    expect(foldText('')).toBe('')
  })

  it('keeps non-diacritic punctuation, so it can be searched for', () => {
    // It folds diacritics — it is not a slugifier.
    expect(foldText('Comisia juridică, de disciplină și imunități')).toBe(
      'comisia juridica, de disciplina si imunitati',
    )
    expect(foldText('L. 129/2019')).toBe('l. 129/2019')
  })
})

describe('foldSlug', () => {
  it('folds diacritics, lowercases and slugifies', () => {
    expect(foldSlug('IAŞI')).toBe('iasi')
    expect(foldSlug('MUREŞ')).toBe('mures')
    expect(foldSlug('SATU-MARE')).toBe('satu-mare')
    expect(foldSlug('București')).toBe('bucuresti')
    expect(foldSlug('Bistrița-Năsăud')).toBe('bistrita-nasaud')
  })

  it('folds comma-below and cedilla spellings to the SAME slug', () => {
    for (const key of ['s', 't', 'S', 'T'] as const) {
      expect(foldSlug(`a${COMMA_BELOW[key]}a`)).toBe(
        foldSlug(`a${CEDILLA[key]}a`),
      )
    }
    expect(foldSlug('IAŞI')).toBe(foldSlug('IAȘI'))
    expect(foldSlug('Neafiliaţi')).toBe(foldSlug('Neafiliați'))
  })

  it('collapses runs of separators and trims them from both ends', () => {
    expect(foldSlug('  Satu   Mare  ')).toBe('satu-mare')
    expect(foldSlug('--PSD--')).toBe('psd')
    expect(foldSlug('S.O.S. România')).toBe('s-o-s-romania')
    expect(foldSlug('')).toBe('')
    expect(foldSlug('---')).toBe('')
  })

  it('reproduces the server group-slug contract', () => {
    // `parliamentGroups.groupId` is exactly `foldSlug(name)-<chamber>`.
    expect(foldSlug('PSD')).toBe('psd')
    expect(foldSlug('UDMR')).toBe('udmr')
    expect(foldSlug('Neafiliaţi')).toBe('neafiliati')
    expect(foldSlug('Minorităţi naţionale')).toBe('minoritati-nationale')
  })

  it('is NOT the diacritic-keeping slugify in @/lib/utils', () => {
    // Two slug contracts coexist deliberately; see text-fold.ts.
    expect(foldSlug('Bucureşti')).toBe('bucuresti')
  })
})

describe('the two folds are deliberately different', () => {
  it('agrees on every Romanian letter', () => {
    const romanian = 'ăâîșțĂÂÎȘȚşţŞŢ'
    for (const ch of romanian) {
      expect(foldSlug(ch)).toBe(foldText(ch))
    }
  })

  it('disagrees on spacing diacritic marks — which is why they stay separate', () => {
    // `foldSlug` uses \p{Diacritic}, which covers these; `foldText`'s
    // [U+0300–U+036F] does not. Merging the two would silently delete `^`
    // from a search needle.
    expect(foldText('a^b')).toBe('a^b')
    expect(foldSlug('a^b')).toBe('ab')
  })
})
