import { describe, expect, it } from 'vitest'
import {
  isCanonicalPublicEnterpriseCui,
  isNonCanonicalPublicEnterpriseCuiParam,
  isValidPublicEnterpriseCui,
  normalizePublicEnterpriseCui,
} from './normalize-public-enterprise-cui'

describe('normalizePublicEnterpriseCui', () => {
  it('strips non-digits and returns the canonical form', () => {
    expect(normalizePublicEnterpriseCui('10020943')).toBe('10020943')
    expect(normalizePublicEnterpriseCui('RO10020943')).toBe('10020943')
    expect(normalizePublicEnterpriseCui('ro-10020943')).toBe('10020943')
    expect(normalizePublicEnterpriseCui(' 10020943 ')).toBe('10020943')
    expect(normalizePublicEnterpriseCui('RO 10020943')).toBe('10020943')
  })

  it('accepts 1..13 digit values', () => {
    expect(normalizePublicEnterpriseCui('1')).toBe('1')
    expect(normalizePublicEnterpriseCui('1234567890123')).toBe('1234567890123')
  })

  it('rejects empty and non-digit-only inputs', () => {
    expect(normalizePublicEnterpriseCui('')).toBeNull()
    expect(normalizePublicEnterpriseCui('RO')).toBeNull()
    expect(normalizePublicEnterpriseCui('  ')).toBeNull()
    expect(normalizePublicEnterpriseCui('abcdef')).toBeNull()
  })

  it('rejects all-zero placeholders', () => {
    expect(normalizePublicEnterpriseCui('0')).toBeNull()
    expect(normalizePublicEnterpriseCui('000')).toBeNull()
    expect(normalizePublicEnterpriseCui('0000000000000')).toBeNull()
  })

  it('rejects values longer than 13 digits', () => {
    expect(normalizePublicEnterpriseCui('12345678901234')).toBeNull()
  })
})

describe('isValidPublicEnterpriseCui', () => {
  it('returns true for valid CUIs and false otherwise', () => {
    expect(isValidPublicEnterpriseCui('10020943')).toBe(true)
    expect(isValidPublicEnterpriseCui('RO-10020943')).toBe(true)
    expect(isValidPublicEnterpriseCui('')).toBe(false)
    expect(isValidPublicEnterpriseCui('0')).toBe(false)
  })
})

describe('isCanonicalPublicEnterpriseCui', () => {
  it('is true only for digit-only canonical forms in range', () => {
    expect(isCanonicalPublicEnterpriseCui('10020943')).toBe(true)
    expect(isCanonicalPublicEnterpriseCui('1')).toBe(true)
  })

  it('is false for valid but non-canonical inputs', () => {
    expect(isCanonicalPublicEnterpriseCui('RO10020943')).toBe(false)
    expect(isCanonicalPublicEnterpriseCui('10020943 ')).toBe(false)
    expect(isCanonicalPublicEnterpriseCui('ro-10020943')).toBe(false)
  })

  it('is false for invalid inputs', () => {
    expect(isCanonicalPublicEnterpriseCui('')).toBe(false)
    expect(isCanonicalPublicEnterpriseCui('0')).toBe(false)
    expect(isCanonicalPublicEnterpriseCui('12345678901234')).toBe(false)
  })
})

describe('isNonCanonicalPublicEnterpriseCuiParam', () => {
  it('flags valid-but-non-canonical route params that should redirect', () => {
    expect(isNonCanonicalPublicEnterpriseCuiParam('RO-10020943')).toBe(true)
    expect(isNonCanonicalPublicEnterpriseCuiParam('ro10020943')).toBe(true)
    expect(isNonCanonicalPublicEnterpriseCuiParam('10020943 ')).toBe(true)
  })

  it('does not flag already canonical params', () => {
    expect(isNonCanonicalPublicEnterpriseCuiParam('10020943')).toBe(false)
  })

  it('does not flag invalid params (those 404 instead of redirect)', () => {
    expect(isNonCanonicalPublicEnterpriseCuiParam('')).toBe(false)
    expect(isNonCanonicalPublicEnterpriseCuiParam('not-a-cui')).toBe(false)
    expect(isNonCanonicalPublicEnterpriseCuiParam('0')).toBe(false)
  })
})
