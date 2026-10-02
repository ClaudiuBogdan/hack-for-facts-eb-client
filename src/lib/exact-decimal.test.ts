import { describe, expect, it } from 'vitest'
import { compactDecimal, compareDecimal, decimalSign, decimalToPlot, formatDecimal, percentOf, roundDecimal, shiftDecimal, sumDecimals } from './exact-decimal'

/**
 * Money and counts as the API sends them: every digit kept past what a
 * float holds, a zero kept as a zero, nothing rounded but on request.
 */

const BEYOND_FLOAT = '9007199254741973.32' // 2^53 + 1981.32: a float would print …1974

describe('exact decimals', () => {
  it('formats a sum past 2^53 with every digit, in each language', () => {
    expect(formatDecimal(BEYOND_FLOAT, 'ro')).toBe('9.007.199.254.741.973,32')
    expect(formatDecimal(BEYOND_FLOAT, 'en')).toBe('9,007,199,254,741,973.32')
    expect(String(Number(BEYOND_FLOAT))).not.toContain('1973.32')
  })

  it('keeps an explicit zero a zero, and a negative zero unsigned', () => {
    expect(formatDecimal('0.00', 'ro')).toBe('0,00')
    expect(formatDecimal('-0.00', 'ro')).toBe('0,00')
    expect(decimalSign('0.00')).toBe(0)
    expect(decimalSign('-12.50')).toBe(-1)
  })

  it('rounds half away from zero, as the API rounds its means', () => {
    expect(roundDecimal('2.345', 2)).toBe('2.35')
    expect(roundDecimal('-2.345', 2)).toBe('-2.35')
    expect(roundDecimal('2.344', 2)).toBe('2.34')
    expect(roundDecimal('7', 2)).toBe('7.00')
    expect(formatDecimal('1234.5', 'ro', 0)).toBe('1.235')
  })

  it('scales without floats: billions and millions with one decimal, the rest whole', () => {
    expect(shiftDecimal('1234567890.12', 9)).toBe('1.23456789012')
    expect(compactDecimal(BEYOND_FLOAT, 'ro')).toEqual({ value: '9.007.199,3', scale: 'billion' })
    expect(compactDecimal('4560000.00', 'en')).toEqual({ value: '4.6', scale: 'million' })
    expect(compactDecimal('-1500000000.00', 'ro')).toEqual({ value: '−1,5', scale: 'billion' })
    expect(compactDecimal('999999.49', 'ro')).toEqual({ value: '999.999', scale: null })
  })

  it('compares and sums exactly', () => {
    expect(compareDecimal('9007199254741973.32', '9007199254741973.31')).toBe(1)
    expect(compareDecimal('10', '10.00')).toBe(0)
    expect(sumDecimals(['9007199254740993', '1', '0.5'])).toBe('9007199254740994.5')
  })

  it('gives no share of nothing: a zero whole is not 0%', () => {
    expect(percentOf('1', '3')).toBe('33.3')
    expect(percentOf('2', '3')).toBe('66.7')
    expect(percentOf('5', '0')).toBeNull()
  })

  it('turns a decimal into a float only for plotting, and never anything else into one', () => {
    expect(decimalToPlot('12.50')).toBe(12.5)
    expect(decimalToPlot(null)).toBeNull()
    expect(decimalToPlot('n/a')).toBeNull()
  })
})
