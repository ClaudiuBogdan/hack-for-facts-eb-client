import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Lingui modules before importing anything that uses them
vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray) => strings[0],
  t: (strings: TemplateStringsArray) => strings[0],
}))

// Mock Lingui i18n
vi.mock('@lingui/core', () => ({
  i18n: {
    _: (message: { id: string } | string) =>
      typeof message === 'string' ? message : message.id,
  },
}))

import {
  cn,
  formatCurrency,
  formatNumber,
  generateHash,
  capitalize,
  convertDaysToMs,
  slugify,
  getUserLocale,
  setUserLocale,
  getNormalizationUnit,
  formatValueWithUnit,
  formatNormalizedValue,
  getSignClass,
} from './utils'

describe('utils', () => {
  // ============================================================================
  // cn (className merge utility)
  // ============================================================================
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      // eslint-disable-next-line no-constant-binary-expression -- intentionally testing falsy value handling
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
    })

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar')
    })

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })
  })

  // ============================================================================
  // formatCurrency
  // ============================================================================
  describe('formatCurrency', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => 'ro'),
        setItem: vi.fn(),
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should format RON currency with default notation', () => {
      const result = formatCurrency(1234567.89)
      expect(result).toContain('RON')
    })

    it('should format EUR currency', () => {
      const result = formatCurrency(1234567.89, 'standard', 'EUR')
      expect(result).toContain('EUR')
    })

    it('should format USD currency', () => {
      const result = formatCurrency(1234567.89, 'standard', 'USD')
      expect(result).toContain('USD')
    })

    it('should use compact notation', () => {
      const result = formatCurrency(1234567, 'compact')
      // Compact notation should use abbreviated format (M, mil., K, etc.)
      // The exact format depends on locale, so we check that it contains
      // a compact indicator or is not the full number representation
      const hasCompactIndicator = /[MKmil]/i.test(result) || !result.includes('1,234,567') && !result.includes('1.234.567')
      expect(hasCompactIndicator).toBe(true)
    })

    it('should handle zero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
    })

    it('should handle negative numbers', () => {
      const result = formatCurrency(-1000)
      expect(result).toContain('-')
    })

    it('should handle very large numbers', () => {
      const result = formatCurrency(999999999999)
      expect(result).toBeTruthy()
    })

    it('should handle decimal precision', () => {
      const result = formatCurrency(100.123456)
      // Should have at most 2 decimal places
      const decimalPart = result.split(',').pop() || result.split('.').pop()
      if (decimalPart && /\d+/.test(decimalPart)) {
        expect(decimalPart.replace(/[^\d]/g, '').length).toBeLessThanOrEqual(2)
      }
    })
  })

  // ============================================================================
  // formatNumber
  // ============================================================================
  describe('formatNumber', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => 'ro'),
        setItem: vi.fn(),
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should format numbers with locale separators', () => {
      const result = formatNumber(1234567.89)
      expect(result).toBeTruthy()
      expect(result).not.toBe('N/A')
    })

    it('should return N/A for null', () => {
      expect(formatNumber(null)).toBe('N/A')
    })

    it('should return N/A for undefined', () => {
      expect(formatNumber(undefined)).toBe('N/A')
    })

    it('should return N/A for NaN', () => {
      expect(formatNumber(NaN)).toBe('N/A')
    })

    it('should use compact notation when specified', () => {
      const standard = formatNumber(1000000, 'standard')
      const compact = formatNumber(1000000, 'compact')
      expect(compact.length).toBeLessThan(standard.length)
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0')
    })

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234)
      expect(result).toContain('-')
    })

    it('should handle very small decimals', () => {
      const result = formatNumber(0.001)
      expect(result).toBeTruthy()
    })
  })

  // ============================================================================
  // generateHash
  // ============================================================================
  describe('generateHash', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = generateHash('test message')
      const hash2 = generateHash('test message')
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different inputs', () => {
      const hash1 = generateHash('message1')
      const hash2 = generateHash('message2')
      expect(hash1).not.toBe(hash2)
    })

    it('should return 8 character hex string', () => {
      const hash = generateHash('any input')
      expect(hash).toMatch(/^[0-9a-f]{8}$/)
    })

    it('should handle empty string', () => {
      const hash = generateHash('')
      expect(hash).toMatch(/^[0-9a-f]{8}$/)
    })

    it('should handle unicode characters', () => {
      const hash = generateHash('țară română 日本語')
      expect(hash).toMatch(/^[0-9a-f]{8}$/)
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)
      const hash = generateHash(longString)
      expect(hash).toMatch(/^[0-9a-f]{8}$/)
    })

    it('should handle special characters', () => {
      const hash = generateHash('!@#$%^&*()_+-=[]{}|;:,.<>?')
      expect(hash).toMatch(/^[0-9a-f]{8}$/)
    })
  })

  // ============================================================================
  // capitalize
  // ============================================================================
  describe('capitalize', () => {
    it('should capitalize first letter of each word', () => {
      expect(capitalize('hello world')).toBe('Hello World')
    })

    it('should handle uppercase input', () => {
      expect(capitalize('HELLO WORLD')).toBe('Hello World')
    })

    it('should handle mixed case input', () => {
      expect(capitalize('hElLo WoRlD')).toBe('Hello World')
    })

    it('should handle single word', () => {
      expect(capitalize('hello')).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A')
    })

    it('should handle multiple spaces', () => {
      expect(capitalize('hello   world')).toBe('Hello   World')
    })
  })

  // ============================================================================
  // convertDaysToMs
  // ============================================================================
  describe('convertDaysToMs', () => {
    it('should convert 1 day to milliseconds', () => {
      expect(convertDaysToMs(1)).toBe(86400000)
    })

    it('should convert 7 days to milliseconds', () => {
      expect(convertDaysToMs(7)).toBe(604800000)
    })

    it('should handle 0 days', () => {
      expect(convertDaysToMs(0)).toBe(0)
    })

    it('should handle fractional days', () => {
      expect(convertDaysToMs(0.5)).toBe(43200000)
    })

    it('should handle negative days', () => {
      expect(convertDaysToMs(-1)).toBe(-86400000)
    })
  })

  // ============================================================================
  // slugify
  // ============================================================================
  describe('slugify', () => {
    it('should convert string to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('should handle special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world')
    })

    it('should handle multiple spaces', () => {
      expect(slugify('hello   world')).toBe('hello-world')
    })

    it('should trim leading and trailing dashes', () => {
      expect(slugify('  hello world  ')).toBe('hello-world')
    })

    it('should handle empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('should handle numbers', () => {
      expect(slugify('hello 123 world')).toBe('hello-123-world')
    })

    it('should collapse multiple dashes', () => {
      expect(slugify('hello---world')).toBe('hello-world')
    })

    it('should handle unicode characters', () => {
      expect(slugify('café résumé')).toBe('caf-r-sum')
    })

    it('should convert to lowercase', () => {
      expect(slugify('HELLO WORLD')).toBe('hello-world')
    })
  })

  // ============================================================================
  // getUserLocale / setUserLocale
  // ============================================================================
  describe('getUserLocale', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(),
        setItem: vi.fn(),
      })
      vi.stubGlobal('location', {
        search: '',
      })
      document.cookie = 'user-locale=; Max-Age=0; path=/';
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should return ro as default when no locale is set', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
      expect(getUserLocale()).toBe('ro')
    })

    it('should return locale from localStorage', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('en')
      expect(getUserLocale()).toBe('en')
    })

    it('should return locale from cookie when present', () => {
      document.cookie = 'user-locale=en; path=/';
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
      expect(getUserLocale()).toBe('en')
    })

    it('should prioritize URL parameter over localStorage', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('ro')
      vi.stubGlobal('location', { search: '?lang=en' })
      expect(getUserLocale()).toBe('en')
    })

    it('should ignore invalid URL parameter', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('ro')
      vi.stubGlobal('location', { search: '?lang=invalid' })
      expect(getUserLocale()).toBe('ro')
    })

    it('should accept ro from URL', () => {
      vi.stubGlobal('location', { search: '?lang=ro' })
      expect(getUserLocale()).toBe('ro')
    })

    it('should accept en from URL', () => {
      vi.stubGlobal('location', { search: '?lang=en' })
      expect(getUserLocale()).toBe('en')
    })
  })

  describe('setUserLocale', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(),
        setItem: vi.fn(),
      })
      document.cookie = 'user-locale=; Max-Age=0; path=/';
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should save locale to localStorage', () => {
      setUserLocale('en')
      expect(localStorage.setItem).toHaveBeenCalledWith('user-locale', 'en')
      expect(document.cookie).toContain('user-locale=en')
    })

    it('should save ro locale', () => {
      setUserLocale('ro')
      expect(localStorage.setItem).toHaveBeenCalledWith('user-locale', 'ro')
      expect(document.cookie).toContain('user-locale=ro')
    })
  })

  // ============================================================================
  // getNormalizationUnit
  // ============================================================================
  describe('getNormalizationUnit', () => {
    it('should return RON for total normalization', () => {
      expect(getNormalizationUnit('total')).toBe('RON')
    })

    it('should return EUR for total_euro normalization', () => {
      expect(getNormalizationUnit('total_euro')).toBe('EUR')
    })

    it('should return RON/capita for per_capita normalization', () => {
      const result = getNormalizationUnit('per_capita')
      expect(result).toContain('RON')
      expect(result).toContain('/capita')
    })

    it('should return EUR/capita for per_capita_euro normalization', () => {
      const result = getNormalizationUnit('per_capita_euro')
      expect(result).toContain('EUR')
      expect(result).toContain('/capita')
    })

    it('should return % of GDP for percent_gdp normalization', () => {
      const result = getNormalizationUnit('percent_gdp')
      expect(result).toContain('%')
      expect(result).toContain('GDP')
    })

    it('should handle object input format', () => {
      expect(getNormalizationUnit({ normalization: 'total', currency: 'EUR' })).toBe('EUR')
    })

    it('should return % when show_period_growth is true', () => {
      expect(getNormalizationUnit({ show_period_growth: true })).toBe('%')
    })

    it('should return RON for undefined normalization', () => {
      expect(getNormalizationUnit(undefined)).toBe('RON')
    })

    it('should respect currency parameter', () => {
      expect(getNormalizationUnit('total', 'EUR')).toBe('EUR')
      expect(getNormalizationUnit('total', 'USD')).toBe('USD')
    })
  })

  // ============================================================================
  // formatValueWithUnit
  // ============================================================================
  describe('formatValueWithUnit', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => 'ro'),
        setItem: vi.fn(),
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should return N/A for null value', () => {
      expect(formatValueWithUnit(null as unknown as number, 'RON')).toBe('N/A')
    })

    it('should return N/A for NaN value', () => {
      expect(formatValueWithUnit(NaN, 'RON')).toBe('N/A')
    })

    it('should format percentage values', () => {
      const result = formatValueWithUnit(50.5, '%')
      expect(result).toContain('50')
      expect(result).toContain('%')
    })

    it('should format RON currency', () => {
      const result = formatValueWithUnit(1000, 'RON')
      expect(result).toContain('RON')
    })

    it('should format EUR currency', () => {
      const result = formatValueWithUnit(1000, 'EUR')
      expect(result).toContain('EUR')
    })

    it('should format USD currency', () => {
      const result = formatValueWithUnit(1000, 'USD')
      expect(result).toContain('USD')
    })

    it('should format per capita values', () => {
      const result = formatValueWithUnit(500, 'RON/capita')
      expect(result).toContain('RON')
      expect(result).toContain('/capita')
    })

    it('should use compact notation by default', () => {
      const compact = formatValueWithUnit(1000000, 'RON', 'compact')
      const standard = formatValueWithUnit(1000000, 'RON', 'standard')
      expect(compact.length).toBeLessThanOrEqual(standard.length)
    })

    it('should handle zero', () => {
      const result = formatValueWithUnit(0, 'RON')
      expect(result).toBeTruthy()
    })

    it('should handle negative values', () => {
      const result = formatValueWithUnit(-1000, 'RON')
      expect(result).toContain('-')
    })
  })

  // ============================================================================
  // formatNormalizedValue
  // ============================================================================
  describe('formatNormalizedValue', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => 'ro'),
        setItem: vi.fn(),
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should format value with normalization options', () => {
      const result = formatNormalizedValue(1000, { normalization: 'total', currency: 'RON' })
      expect(result).toContain('RON')
    })

    it('should handle per_capita normalization', () => {
      const result = formatNormalizedValue(500, { normalization: 'per_capita' })
      expect(result).toContain('/capita')
    })

    it('should handle percent_gdp normalization', () => {
      const result = formatNormalizedValue(5.5, { normalization: 'percent_gdp' })
      expect(result).toContain('%')
    })

    it('should handle undefined options', () => {
      const result = formatNormalizedValue(1000, undefined)
      expect(result).toBeTruthy()
    })

    it('should respect notation parameter', () => {
      const compact = formatNormalizedValue(1000000, { normalization: 'total' }, 'compact')
      const standard = formatNormalizedValue(1000000, { normalization: 'total' }, 'standard')
      expect(compact.length).toBeLessThanOrEqual(standard.length)
    })
  })

  // ============================================================================
  // getSignClass
  // ============================================================================
  describe('getSignClass', () => {
    it('should return green class for positive values', () => {
      expect(getSignClass(100)).toBe('text-green-600')
    })

    it('should return red class for negative values', () => {
      expect(getSignClass(-100)).toBe('text-red-600')
    })

    it('should return muted class for zero', () => {
      expect(getSignClass(0)).toBe('text-muted-foreground')
    })

    it('should return muted class for null', () => {
      expect(getSignClass(null)).toBe('text-muted-foreground')
    })

    it('should return muted class for undefined', () => {
      expect(getSignClass(undefined)).toBe('text-muted-foreground')
    })

    it('should return muted class for NaN', () => {
      expect(getSignClass(NaN)).toBe('text-muted-foreground')
    })

    it('should handle very small positive numbers', () => {
      expect(getSignClass(0.0001)).toBe('text-green-600')
    })

    it('should handle very small negative numbers', () => {
      expect(getSignClass(-0.0001)).toBe('text-red-600')
    })
  })
})
