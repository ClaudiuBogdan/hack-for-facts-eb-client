import { describe, expect, it } from 'vitest'
import { normalizeCompanyCui } from './normalize-company-cui'

describe('normalizeCompanyCui', () => {
  it('accepts digit-only CUI values', () => {
    expect(normalizeCompanyCui('14399840')).toBe('14399840')
  })

  it('accepts an optional RO prefix', () => {
    expect(normalizeCompanyCui('RO14399840')).toBe('14399840')
    expect(normalizeCompanyCui('ro14399840')).toBe('14399840')
  })

  it('rejects malformed values instead of extracting embedded digits', () => {
    expect(normalizeCompanyCui('company-14399840')).toBeNull()
    expect(normalizeCompanyCui('14399840-extra')).toBeNull()
    expect(normalizeCompanyCui('RO')).toBeNull()
  })

  it('rejects legacy ONRC zero CUI placeholders', () => {
    expect(normalizeCompanyCui('0')).toBeNull()
    expect(normalizeCompanyCui('RO0')).toBeNull()
    expect(normalizeCompanyCui('000')).toBeNull()
  })
})
