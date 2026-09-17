import { describe, expect, it } from 'vitest'
import { foldCountyName } from './county-names'

/**
 * The fold is what lets a county from the registry find its polygon. The two
 * sources spell the same county differently and neither is wrong, so the fold
 * is the only thing standing between "Timiş" and a hatched county.
 */
describe('foldCountyName', () => {
  it('folds both spellings of the Romanian diacritics to one key', () => {
    // The registry writes the cedilla forms; the boundary data the comma-below.
    expect(foldCountyName('Timiş')).toBe(foldCountyName('Timiș'))
    expect(foldCountyName('Bucureşti')).toBe(foldCountyName('București'))
    expect(foldCountyName('Constanţa')).toBe(foldCountyName('Constanța'))
    expect(foldCountyName('Iaşi')).toBe(foldCountyName('Iași'))
  })

  it('folds case, accents and surrounding space', () => {
    expect(foldCountyName('  BRAȘOV ')).toBe('brasov')
    expect(foldCountyName('Bistrița-Năsăud')).toBe('bistrita-nasaud')
    expect(foldCountyName('Satu Mare')).toBe('satu mare')
    expect(foldCountyName('Argeș')).toBe('arges')
  })

  it('keeps distinct counties distinct', () => {
    expect(foldCountyName('Galați')).not.toBe(foldCountyName('Giurgiu'))
    expect(foldCountyName('Ialomița')).not.toBe(foldCountyName('Ilfov'))
  })
})
