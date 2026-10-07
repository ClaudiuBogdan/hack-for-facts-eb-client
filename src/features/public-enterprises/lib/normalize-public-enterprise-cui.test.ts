import { describe, expect, it } from 'vitest'
import { normalizePublicEnterpriseCui } from './normalize-public-enterprise-cui'

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
