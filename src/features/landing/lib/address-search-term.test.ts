import { describe, expect, it } from 'vitest'
import { MAX_ADDRESS_QUERY_CHARS, readAddressQuery, searchTermFromAddress } from './address-search-term'

describe('readAddressQuery', () => {
  it('keeps a string, a boolean or a safe integer as the router read it', () => {
    expect(readAddressQuery('primaria')).toBe('primaria')
    expect(readAddressQuery('')).toBe('')
    expect(readAddressQuery(true)).toBe(true)
    expect(readAddressQuery(2816464)).toBe(2816464)
    expect(readAddressQuery(-5)).toBe(-5)
  })

  it('drops what is no search: arrays, objects, null, inexact numbers', () => {
    expect(readAddressQuery(['a', 'b'])).toBeUndefined()
    expect(readAddressQuery({ a: 1 })).toBeUndefined()
    expect(readAddressQuery(null)).toBeUndefined()
    expect(readAddressQuery(undefined)).toBeUndefined()
    expect(readAddressQuery(1.5)).toBeUndefined()
    expect(readAddressQuery(Number.MAX_SAFE_INTEGER + 1)).toBeUndefined()
    expect(readAddressQuery(Number.NaN)).toBeUndefined()
  })
})

describe('searchTermFromAddress', () => {
  it('trims the text and keeps its inner spaces and diacritics as written', () => {
    expect(searchTermFromAddress('  Primăria  Cluj-Napoca ')).toBe('Primăria  Cluj-Napoca')
  })

  it('makes the text one line: each run of control characters becomes a space', () => {
    expect(searchTermFromAddress('primaria\r\ncluj\tnord\u0000')).toBe('primaria cluj nord')
  })

  it('is no term when nothing is left', () => {
    expect(searchTermFromAddress(undefined)).toBeUndefined()
    expect(searchTermFromAddress('')).toBeUndefined()
    expect(searchTermFromAddress(' \n\t ')).toBeUndefined()
  })

  it('writes numbers and words the codec read as JSON back as their text', () => {
    expect(searchTermFromAddress(2816464)).toBe('2816464')
    expect(searchTermFromAddress(false)).toBe('false')
  })

  it('cuts at the cap in code points, never inside one', () => {
    const atCap = 'a'.repeat(MAX_ADDRESS_QUERY_CHARS - 1) + '😀'
    expect(searchTermFromAddress(atCap)).toBe(atCap)
    expect(Array.from(searchTermFromAddress(`${atCap}b`) ?? '')).toHaveLength(MAX_ADDRESS_QUERY_CHARS)
    expect(searchTermFromAddress(`${'a'.repeat(MAX_ADDRESS_QUERY_CHARS)}😀`)).toBe('a'.repeat(MAX_ADDRESS_QUERY_CHARS))
    // A cut that lands on a space leaves no trailing space.
    expect(searchTermFromAddress(`${'a'.repeat(MAX_ADDRESS_QUERY_CHARS - 1)} tail`)).toBe('a'.repeat(MAX_ADDRESS_QUERY_CHARS - 1))
  })
})
