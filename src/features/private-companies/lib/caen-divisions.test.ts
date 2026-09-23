import { describe, expect, it } from 'vitest'
import { CAEN_DIVISIONS, caenDivision, divisionLabel } from './caen-divisions'

describe('CAEN divisions', () => {
  it('keys every Rev.2 division by a two-digit code, once', () => {
    const codes = CAEN_DIVISIONS.map((division) => division.code)
    expect(codes.every((code) => /^\d{2}$/.test(code))).toBe(true)
    expect(new Set(codes).size).toBe(codes.length)
    // Rev.2 has 88 divisions, 01 to 99 with gaps.
    expect(codes).toHaveLength(88)
  })

  it('names a division in the page language', () => {
    expect(caenDivision('47')).toBeDefined()
    expect(divisionLabel('47')).toBe('Comerț cu amănuntul')
    expect(divisionLabel('62')).toBe('Software și servicii IT')
  })

  it('shows a code with no division as itself rather than guessing a name', () => {
    expect(divisionLabel('00')).toBe('CAEN 00')
  })
})
