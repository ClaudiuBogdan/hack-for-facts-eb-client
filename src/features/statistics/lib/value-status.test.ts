import { describe, expect, it } from 'vitest'
import { parseWireDecimal, publishedNumber } from './value-status'

describe('parseWireDecimal', () => {
  it('reads a plain dot decimal, sign and zero included', () => {
    expect(parseWireDecimal('286598')).toBe(286598)
    expect(parseWireDecimal('1234.56')).toBe(1234.56)
    expect(parseWireDecimal(' -3 ')).toBe(-3)
    expect(parseWireDecimal('0')).toBe(0)
  })

  it.each([null, undefined, '', '   ', '..', ':', 'c'])('treats %s as no number, never zero', (value) => {
    expect(parseWireDecimal(value)).toBeNull()
  })

  it('refuses what a float parse would silently truncate', () => {
    expect(parseWireDecimal('1,5')).toBeNull()
    expect(parseWireDecimal('12abc')).toBeNull()
    expect(parseWireDecimal('1e3')).toBeNull()
    expect(parseWireDecimal('.5')).toBeNull()
  })
})

describe('publishedNumber', () => {
  it('reads a published decimal, a flagged-but-published one included', () => {
    expect(publishedNumber('12.340', null)).toBe(12.34)
    expect(publishedNumber('0', null)).toBe(0)
    expect(publishedNumber('7', 'p')).toBe(7)
  })

  it('has no number for an empty, non-numeric or confidential cell — never zero', () => {
    expect(publishedNumber(null, null)).toBeNull()
    expect(publishedNumber(' ', null)).toBeNull()
    expect(publishedNumber(':', null)).toBeNull()
    expect(publishedNumber('12', 'c')).toBeNull()
    expect(publishedNumber('12', ' X ')).toBeNull()
  })
})
