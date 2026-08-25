import { describe, expect, it } from 'vitest'
import {
  formatEmployeesDisplay,
  formatRonAmountCompact,
  formatRonNetResultCompact,
  formatSignedInteger,
  formatSignedRonCompact,
} from './formatting'

describe('private company formatting', () => {
  it('formats RON amounts in compact notation', () => {
    const formatted = formatRonAmountCompact(12_450_000_000)
    expect(formatted).toMatch(/12/)
    expect(formatted.length).toBeLessThan(20)
  })

  it('formats large employee counts in compact notation', () => {
    expect(formatEmployeesDisplay(15_000)).not.toBe('15.000')
    expect(formatEmployeesDisplay(4_200)).toBe('4.200')
  })

  it('formats net loss with a leading minus', () => {
    expect(formatRonNetResultCompact(null, 50_000_000)).toMatch(/^−/)
  })

  it('signs a positive delta and leaves zero unsigned', () => {
    expect(formatSignedRonCompact(863_792_940)).toMatch(/^\+/)
    expect(formatSignedInteger(389)).toMatch(/^\+/)
    // A zero delta is "no movement", never "+0".
    expect(formatSignedRonCompact(0)).not.toMatch(/^[+−-]/)
    expect(formatSignedInteger(0)).not.toMatch(/^[+−-]/)
  })

  it('uses a true minus for negative deltas, matching the net-result formatter', () => {
    expect(formatSignedRonCompact(-1_477_503)).toMatch(/^−/)
    expect(formatSignedInteger(-42)).toMatch(/^−/)
    expect(formatSignedRonCompact(-1_477_503)).not.toMatch(/^-/)
  })

  it('renders an em dash for absent and non-finite deltas, never a zero', () => {
    for (const absent of [null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatSignedRonCompact(absent as number | null)).toBe('—')
      expect(formatSignedInteger(absent as number | null)).toBe('—')
    }
  })
})
