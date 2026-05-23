import { describe, expect, it } from 'vitest'
import {
  formatEmployeesDisplay,
  formatRonAmountCompact,
  formatRonNetResultCompact,
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
})
