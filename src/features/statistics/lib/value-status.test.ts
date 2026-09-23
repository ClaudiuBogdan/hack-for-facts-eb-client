import { describe, expect, it } from 'vitest'
import { publishedNumber } from './value-status'

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
