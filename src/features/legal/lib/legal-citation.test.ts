import { describe, expect, it } from 'vitest'
import { parseLegalCitationShape } from './legal-citation'

/**
 * The shape decides which empty-state message the Caută tab shows, so both
 * directions are pinned: every citation spelling the server's grammar accepts
 * must parse, and names/phrases must NOT — a phrase misread as a citation
 * would swap the load-bearing honesty message for "check the number".
 */
describe('parseLegalCitationShape', () => {
  it('parses the common citation spellings', () => {
    expect(parseLegalCitationShape('Legea 53/2003')).toEqual({
      actType: 'lege',
      actNumber: '53',
      actYear: 2003,
    })
    expect(parseLegalCitationShape('legea nr. 53/2003')).toEqual({
      actType: 'lege',
      actNumber: '53',
      actYear: 2003,
    })
    expect(parseLegalCitationShape('OUG 57 / 2019')).toEqual({
      actType: 'oug',
      actNumber: '57',
      actYear: 2019,
    })
    expect(parseLegalCitationShape('hg 1/2016')?.actType).toBe('hotarare')
    expect(parseLegalCitationShape('L 227/2015')?.actType).toBe('lege')
  })

  it('returns null for names and phrases — they take the honesty path', () => {
    expect(parseLegalCitationShape('codul muncii')).toBeNull()
    expect(parseLegalCitationShape('concediu de odihnă')).toBeNull()
    expect(parseLegalCitationShape('contract individual de munca')).toBeNull()
    // A number without a type word is not a citation the server shortcuts.
    expect(parseLegalCitationShape('227/2015')).toBeNull()
    // A type word without a number is a name.
    expect(parseLegalCitationShape('legea muncii')).toBeNull()
  })

  it('rejects out-of-range years like the server does', () => {
    expect(parseLegalCitationShape('legea 1/1700')).toBeNull()
    expect(parseLegalCitationShape('legea 1/2200')).toBeNull()
  })
})
