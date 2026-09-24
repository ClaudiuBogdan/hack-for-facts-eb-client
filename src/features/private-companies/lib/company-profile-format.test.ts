import { describe, expect, it, vi } from 'vitest'
import { count, dateText, moneyCell, moneyFigure, moneyText, moneyTick, percent, yearRanges } from './company-profile-format'

// The page's language, pinned: the test environment activates English.
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

/** A figure, its scale and its unit are held together by no-break spaces. */
const nb = (text: string) => text.replace(/ /gu, '\u00a0')

describe('company profile formatting', () => {
  it('writes money on one scale per magnitude, never past billions', () => {
    expect(moneyText(30_828_147_506)).toBe(nb('30,8 mld. lei'))
    expect(moneyText(-22_600_000)).toBe(nb('-22,6 mil. lei'))
    expect(moneyText(42_160)).toBe(nb('42.160 lei'))
    expect(moneyCell(1_000_000_000)).toBe(nb('1,0 mld.'))
  })

  it('labels an axis with the decimals it needs and no more', () => {
    expect(moneyTick(10_000_000_000)).toBe(nb('10 mld.'))
    expect(moneyTick(2_500_000)).toBe(nb('2,5 mil.'))
    expect(moneyTick(-50_000)).toBe(nb('-50 mii'))
    expect(moneyTick(800)).toBe('800')
  })

  it('splits a figure for the figures band into its value, its decimals and its unit', () => {
    expect(moneyFigure(30_828_147_506)).toEqual({ value: 30.8, digits: 1, unit: 'mld. lei' })
    expect(moneyFigure(517_850_000)).toEqual({ value: 517.9, digits: 1, unit: 'mil. lei' })
    expect(moneyFigure(168_068.4)).toEqual({ value: 168_068, digits: 0, unit: 'lei' })
  })

  it('writes percents with one decimal and counts whole, signed when asked', () => {
    expect(percent(0.0384, true)).toBe('+3,8%')
    expect(percent(0.286)).toBe('28,6%')
    expect(count(-506, true)).toBe('-506')
    expect(count(6_701)).toBe('6.701')
  })

  it('writes a registry date as a reader does, and the source text when it is not a date', () => {
    expect(dateText('2002-11-26')).toMatch(/^26 nov\.? 2002$/u)
    expect(dateText(null)).toBe('—')
    expect(dateText('necunoscută')).toBe('necunoscută')
  })

  it('groups consecutive years into ranges, whatever their order', () => {
    expect(yearRanges([2018, 2012, 2013, 2014, 2015, 2016, 2017, 2021])).toBe('2012–2018, 2021')
    expect(yearRanges([2020])).toBe('2020')
    expect(yearRanges([])).toBe('')
  })
})
