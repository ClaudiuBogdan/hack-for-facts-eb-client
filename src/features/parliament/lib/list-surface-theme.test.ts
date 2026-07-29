import { describe, expect, it } from 'vitest'
import { countedNoun, formatParliamentTotal } from './list-surface-theme'

describe('formatParliamentTotal', () => {
  it('groups thousands the Romanian way', () => {
    expect(formatParliamentTotal(1284)).toBe('1.284')
  })

  it('says a capped total is a FLOOR, never the cap itself', () => {
    // The votes and sittings reads cap at 10.000 and flag the estimate. Printing
    // "10.000" would assert a number the source never reached.
    expect(formatParliamentTotal(10_000, true)).toBe('peste 10.000')
  })
})

describe('countedNoun', () => {
  it('uses the singular for one', () => {
    expect(countedNoun(1, 'vot', 'voturi')).toBe('vot')
  })

  it('uses the bare plural from 2 to 19', () => {
    expect(countedNoun(2, 'vot', 'voturi')).toBe('voturi')
    expect(countedNoun(19, 'comisie', 'comisii')).toBe('comisii')
  })

  it('adds `de` from 20 up', () => {
    expect(countedNoun(20, 'vot', 'voturi')).toBe('de voturi')
    expect(countedNoun(472, 'parlamentar', 'parlamentari')).toBe(
      'de parlamentari',
    )
  })

  it('follows the LAST TWO digits, not the magnitude', () => {
    // 101 ends in "unu" and takes the bare plural; 100 and 1.284 take `de`.
    expect(countedNoun(101, 'vot', 'voturi')).toBe('voturi')
    expect(countedNoun(100, 'vot', 'voturi')).toBe('de voturi')
    expect(countedNoun(1284, 'proiect', 'proiecte')).toBe('de proiecte')
  })

  it('counts nothing as a plural, not as a singular', () => {
    expect(countedNoun(0, 'vot', 'voturi')).toBe('de voturi')
  })
})
