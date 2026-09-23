import { describe, expect, it, vi } from 'vitest'
import {
  describeAgainstNational,
  formatHubChange,
  formatHubMonth,
  formatHubNumber,
  formatHubShare,
  formatHubValue,
  formatHubValueText,
  isAdditiveUnit,
  sharedDecimals,
} from './hub-format'

// The page's language, pinned: the test environment activates English.
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

describe('hub formatting', () => {
  it('writes whole counts with Romanian separators and fixed decimals', () => {
    expect(formatHubNumber(1_749_479)).toBe('1.749.479')
    expect(formatHubNumber(91.94, { digits: 1 })).toBe('91,9')
    expect(formatHubNumber(3.8, { digits: 1, signed: true })).toBe('+3,8')
  })

  it('writes money in millions or billions, and never switches to trillions', () => {
    expect(formatHubValue(30_828_147_506, 'lei')).toEqual({ value: '30,8\u00a0mld.', unit: 'lei' })
    // Bucure\u0219ti's turnover and the national total stay on the same scale as the other counties.
    expect(formatHubValue(1_081_300_000_000, 'lei').value).toBe('1.081,3\u00a0mld.')
    expect(formatHubValue(2_841_237_823_768, 'lei').value).toBe('2.841,2\u00a0mld.')
    expect(formatHubValue(4_500_000, 'lei').value).toBe('4,5\u00a0mil.')
    expect(formatHubValue(950_000, 'lei')).toEqual({ value: '950.000', unit: 'lei' })
  })

  it('keeps counts whole and a rate at its decimals', () => {
    expect(formatHubValue(153_618, 'firms')).toEqual({ value: '153.618', unit: 'firme' })
    expect(formatHubValueText(91.94, 'per-thousand', 1)).toBe('91,9 la 1.000 de locuitori')
  })

  it('writes percents with the sign against the figure, as the INS hub does', () => {
    expect(formatHubShare(1_155, 2_841)).toBe('40,7%')
    expect(formatHubShare(1, 0)).toBe('—')
    expect(formatHubChange(29_692, 30_828)).toBe('+3,8%')
    expect(formatHubChange(24_494, 24_296)).toBe('-0,8%')
  })

  it('leaves out a change with no base rather than inventing one', () => {
    expect(formatHubChange(null, 10)).toBeNull()
    expect(formatHubChange(0, 10)).toBeNull()
  })

  it('compares a count by its share and a rate by its difference', () => {
    expect(isAdditiveUnit('firms')).toBe(true)
    expect(isAdditiveUnit('per-thousand')).toBe(false)
    expect(describeAgainstNational(34_169, 153_618, 'firms', 0)).toBe('22,2% din total')
    expect(describeAgainstNational(135.9, 91.9, 'per-thousand', 1)).toBe('+44,0 față de România')
    expect(describeAgainstNational(45.5, 91.9, 'per-thousand', 1)).toBe('-46,4 față de România')
  })

  it('shares one decimal across a set only when one of them needs it', () => {
    expect(sharedDecimals([12, 40])).toBe(0)
    expect(sharedDecimals([12, 40.5])).toBe(1)
  })

  it('names a month in the page language and leaves anything else alone', () => {
    expect(formatHubMonth('2026-07')).toBe('iulie 2026')
    expect(formatHubMonth('2025')).toBe('2025')
  })
})
