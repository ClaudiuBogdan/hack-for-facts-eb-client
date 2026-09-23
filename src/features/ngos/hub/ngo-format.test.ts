import { describe, expect, it, vi } from 'vitest'
import { formatNgoDate, formatNgoNumber, formatNgoShare, formatNgoSigned } from './ngo-format'

const { locale } = vi.hoisted(() => ({ locale: { current: 'ro-RO' } }))
vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => locale.current }))

describe('ngo-format', () => {
  it('writes figures in the reader’s locale with fixed decimals', () => {
    locale.current = 'ro-RO'
    expect(formatNgoNumber(130_258)).toBe('130.258')
    expect(formatNgoNumber(68.4, 1)).toBe('68,4')
    locale.current = 'en-GB'
    expect(formatNgoNumber(130_258)).toBe('130,258')
  })

  it('signs a difference either way', () => {
    locale.current = 'ro-RO'
    expect(formatNgoSigned(45.6)).toBe('+45,6')
    expect(formatNgoSigned(-43.2)).toMatch(/^[-−]43,2$/)
  })

  it('writes a share against its sign, with a decimal only below 10%, and never a false zero', () => {
    locale.current = 'ro-RO'
    expect(formatNgoShare(0.86)).toBe('86%')
    expect(formatNgoShare(0.061)).toBe('6,1%')
    expect(formatNgoShare(42 / 130_258)).toBe('<0,1%')
    expect(formatNgoShare(0)).toBe('0,0%')
  })

  it('says a date as the reader does', () => {
    locale.current = 'ro-RO'
    expect(formatNgoDate('2026-09-20')).toBe('20 septembrie 2026')
    locale.current = 'en-GB'
    expect(formatNgoDate('2026-09-20')).toBe('20 September 2026')
  })
})
