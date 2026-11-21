import { describe, expect, it } from 'vitest'
import { readAddressQuery, searchTermFromAddress } from '@/features/landing/lib/address-search-term'
import { parseAppSearch, stringifyAppSearch } from './router-search-codec'

/**
 * The router's real codec, as the landing's `/?q=` reads it
 * (docs/design/landing-search-query-param.md, decision 2): a link's standard
 * query string in, the field's text out, and the validated search serialised
 * back to the address it came from — a difference would be a server redirect.
 */
const qOf = (search: string): unknown => (parseAppSearch(search) as Record<string, unknown>).q
const termOf = (search: string) => searchTermFromAddress(readAddressQuery(qOf(search)))
const validated = (search: string) => {
  const q = readAddressQuery(qOf(search))
  return stringifyAppSearch(q === undefined ? {} : { q })
}

describe('the app search codec, for the landing search', () => {
  it('reads a link’s spaces, plus signs and diacritics as the text that was searched', () => {
    expect(termOf('?q=Ia%C8%99i+Nord')).toBe('Iași Nord')
    expect(termOf('?q=Ia%C8%99i%20Nord')).toBe('Iași Nord')
    expect(termOf('?q=C%2B%2B')).toBe('C++')
    expect(termOf('?q=50%25')).toBe('50%')
  })

  it('reads a number-only search — a CUI — as its digits, leading zeros kept', () => {
    expect(qOf('?q=2816464')).toBe(2816464)
    expect(termOf('?q=2816464')).toBe('2816464')
    expect(termOf('?q=007')).toBe('007')
    expect(termOf('?q=true')).toBe('true')
  })

  it('reads the same text from a router-built link', () => {
    for (const text of ['2816464', '007', 'true', 'Primăria "Cluj"', '"citat"', 'C++ & co']) {
      expect(termOf(stringifyAppSearch({ q: text }))).toBe(text)
    }
  })

  it('serialises a validated search back to the address it came from', () => {
    for (const search of ['?q=2816464', '?q=007', '?q=primaria', '?q=Ia%C8%99i%20Nord', '?q=C%2B%2B', '?q=true']) {
      expect(validated(search)).toBe(search)
    }
  })

  it('reads a repeated q as no search', () => {
    expect(termOf('?q=a&q=b')).toBeUndefined()
  })

  it('reads a value wrapped in double quotes as a JSON string (the known limit)', () => {
    expect(termOf('?q=%22primaria%20cluj%22')).toBe('primaria cluj')
  })
})
