import { describe, expect, it } from 'vitest'
import { compactValue, exactMeanText, exactValueText, meanValue } from './company-analytics-format'

/** The no-break space the figures put between a number and its unit. */
const NBSP = ' '

describe('a mean per company', () => {
  it('keeps a headcount mean’s fraction: 0.43 employees a company is not none', () => {
    expect(meanValue('0.43', 'HEADCOUNT', 'ro')).toEqual({ value: '0,43', unit: 'salariați' })
    expect(exactMeanText('0.43', 'HEADCOUNT', 'ro')).toBe(`0,43${NBSP}salariați`)
    expect(meanValue('1234.5', 'HEADCOUNT', 'en').value).toBe('1,234.5')
  })

  it('drops a headcount mean’s trailing zeros, never a whole number’s own', () => {
    expect(meanValue('12.30', 'HEADCOUNT', 'ro').value).toBe('12,3')
    expect(meanValue('10.00', 'HEADCOUNT', 'ro').value).toBe('10')
    expect(meanValue('10', 'HEADCOUNT', 'ro').value).toBe('10')
    expect(meanValue('0.00', 'HEADCOUNT', 'ro').value).toBe('0')
  })

  it('rounds a longer headcount mean to the API’s two decimals', () => {
    expect(meanValue('0.433', 'HEADCOUNT', 'ro').value).toBe('0,43')
  })

  it('says a lei mean as any amount, exact with its bani', () => {
    expect(meanValue('2784.5', 'RON', 'ro')).toEqual(compactValue('2784.5', 'RON', 'ro'))
    expect(exactMeanText('2784.5', 'RON', 'ro')).toBe(exactValueText('2784.5', 'RON', 'ro'))
  })

  it('leaves a headcount sum whole, as before', () => {
    expect(compactValue('299616', 'HEADCOUNT', 'ro').value).toBe('299.616')
  })
})
