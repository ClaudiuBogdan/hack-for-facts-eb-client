import { describe, expect, it, vi } from 'vitest'
import { formatNgoChange, formatNgoDate, formatNgoMoney, formatNgoMoneyText, formatNgoMoneyTick, formatNgoNumber, formatNgoShare } from './ngo-format'

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

  it('writes money on one scale per magnitude, the scale kept with its figure', () => {
    locale.current = 'ro-RO'
    expect(formatNgoMoney(33_520_967_976)).toEqual({ value: '33,5\u00a0mld.', unit: 'lei' })
    expect(formatNgoMoney(449_691_812)).toEqual({ value: '449,7\u00a0mil.', unit: 'lei' })
    expect(formatNgoMoney(8_948)).toEqual({ value: '8.948', unit: 'lei' })
    expect(formatNgoMoneyText(1_500_000_000)).toBe('1,5\u00a0mld. lei')
    locale.current = 'en-GB'
    expect(formatNgoMoney(1_500_000_000).value).toBe('1.5\u00a0mld.')
  })

  it('writes an axis tick without a needless decimal', () => {
    locale.current = 'ro-RO'
    expect(formatNgoMoneyTick(0)).toBe('0')
    expect(formatNgoMoneyTick(10_000_000_000)).toBe('10\u00a0mld.')
    expect(formatNgoMoneyTick(2_500_000_000)).toBe('2,5\u00a0mld.')
    expect(formatNgoMoneyTick(250_000_000)).toBe('250\u00a0mil.')
  })

  it('signs a change in percent either way, and has none without a base', () => {
    locale.current = 'ro-RO'
    expect(formatNgoChange(148_792_803, 161_620_437)).toBe('+8,6%')
    expect(formatNgoChange(106_177_062, 85_394_431)).toMatch(/^[-−]19,6%$/)
    expect(formatNgoChange(100, 100)).toBe('0,0%')
    expect(formatNgoChange(null, 100)).toBeNull()
    expect(formatNgoChange(0, 100)).toBeNull()
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
