import { describe, expect, it } from 'vitest'
import { countyMatches } from './uat-map-county-search'

describe('countyMatches', () => {
  it('matches word starts, diacritics and case aside', () => {
    expect(countyMatches('Brașov', 'BV', 'bras')).toBe(true)
    expect(countyMatches('Satu Mare', 'SM', 'satu m')).toBe(true)
    expect(countyMatches('București', 'B', 'BUCUR')).toBe(true)
  })

  it('matches a word’s start, not its middle', () => {
    expect(countyMatches('Mureș', 'MS', 'mures')).toBe(true)
    expect(countyMatches('Maramureș', 'MM', 'mures')).toBe(false)
  })

  it('matches a code typed whole, and everything when nothing is typed', () => {
    expect(countyMatches('Cluj', 'CJ', 'cj')).toBe(true)
    expect(countyMatches('Cluj', 'CJ', 'c j')).toBe(false)
    expect(countyMatches('Cluj', 'CJ', '  ')).toBe(true)
  })
})
