import { describe, expect, it } from 'vitest'
import { labelCarriesCitation, parseExactCitation, parseLegalCitationShape } from './legal-citation'

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

/**
 * The server's whole-query grammar (`parseExactCitation`, server `core/citation.ts`): the query IS one citation, and
 * nothing else. The finder's numbered card answers only such a query (review astra-client-12).
 */
describe('parseExactCitation', () => {
  it('reads a query that is one citation, in the server’s spellings', () => {
    expect(parseExactCitation('Legea 98/2016')).toEqual({ actType: 'lege', actNumber: '98', actYear: 2016 })
    expect(parseExactCitation('legea nr. 53/2003')).toEqual({ actType: 'lege', actNumber: '53', actYear: 2003 })
    expect(parseExactCitation('OUG 57 / 2019')).toEqual({ actType: 'oug', actNumber: '57', actYear: 2019 })
    expect(parseExactCitation('O.U.G. nr.57/2019')).toEqual({ actType: 'oug', actNumber: '57', actYear: 2019 })
    expect(parseExactCitation('H.G. 1/2016.')).toEqual({ actType: 'hotarare', actNumber: '1', actYear: 2016 })
    expect(parseExactCitation('Hotărârea nr. 206/1996')?.actType).toBe('hotarare')
  })

  it('refuses a query that says more than one citation: words around it, a second citation, issuer words', () => {
    expect(parseExactCitation('Legea de modificare a Legii 53/2003')).toBeNull()
    expect(parseExactCitation('legea 227/2015 și legea 95/2006')).toBeNull()
    expect(parseExactCitation('ordinul ministrului finanțelor nr. 1/2020')).toBeNull()
    expect(parseExactCitation('Legea 98/2016 art. 5')).toBeNull()
    expect(parseExactCitation('codul muncii')).toBeNull()
    expect(parseExactCitation('legea 1/1700')).toBeNull()
  })
})

describe('labelCarriesCitation', () => {
  const citation = (q: string) => {
    const shape = parseLegalCitationShape(q)
    if (shape === null) throw new Error(`not a citation: ${q}`)
    return shape
  }

  it('matches the resolver’s label by number and year, whatever the type word', () => {
    expect(labelCarriesCitation('Legea nr. 53/2003', citation('Legea 53/2003'))).toBe(true)
    expect(labelCarriesCitation('OUG nr. 57/2019', citation('ordonanta 57/2019'))).toBe(true)
    expect(labelCarriesCitation('Hotărârea nr. 1/2016', citation('hg 01/2016'))).toBe(true)
  })

  it('refuses another number, another year, or a label with no number', () => {
    expect(labelCarriesCitation('Legea nr. 530/2003', citation('Legea 53/2003'))).toBe(false)
    expect(labelCarriesCitation('Legea nr. 53/2004', citation('Legea 53/2003'))).toBe(false)
    expect(labelCarriesCitation('Codul fiscal din 2003', citation('Legea 53/2003'))).toBe(false)
  })

  it('reads the label’s whole number, never its tail (astra-client-12)', () => {
    expect(labelCarriesCitation('Legea nr. 123456/2020', citation('Legea 23456/2020'))).toBe(false)
    expect(labelCarriesCitation('Legea nr. 53/20030', citation('Legea 53/2003'))).toBe(false)
  })
})
