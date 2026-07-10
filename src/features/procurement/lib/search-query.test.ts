import { describe, expect, it } from 'vitest'
import {
  PROCUREMENT_Q_MAX_LENGTH,
  PROCUREMENT_Q_MIN_LENGTH,
  isProcurementQTooShort,
  procurementQOrUndefined,
} from './search-query'

describe('procurementQOrUndefined', () => {
  it('drops terms the server would reject as too short', () => {
    expect(procurementQOrUndefined(undefined)).toBeUndefined()
    expect(procurementQOrUndefined('')).toBeUndefined()
    expect(procurementQOrUndefined('s')).toBeUndefined()
    expect(procurementQOrUndefined('sp')).toBeUndefined()
  })

  it('keeps a term once it reaches the minimum length', () => {
    expect(procurementQOrUndefined('spi')).toBe('spi')
    expect(procurementQOrUndefined('spital')).toBe('spital')
  })

  it('measures length after trimming, and returns the trimmed term', () => {
    expect(procurementQOrUndefined('  ab  ')).toBeUndefined()
    expect(procurementQOrUndefined('  spital  ')).toBe('spital')
  })

  it('truncates rather than sending a term the server would reject as too long', () => {
    const long = 'a'.repeat(PROCUREMENT_Q_MAX_LENGTH + 25)
    expect(procurementQOrUndefined(long)).toHaveLength(PROCUREMENT_Q_MAX_LENGTH)
  })
})

describe('isProcurementQTooShort', () => {
  it('is false for an empty box — nothing typed is not an error', () => {
    expect(isProcurementQTooShort(undefined)).toBe(false)
    expect(isProcurementQTooShort('')).toBe(false)
    expect(isProcurementQTooShort('   ')).toBe(false)
  })

  it('is true only while the term is non-empty and below the minimum', () => {
    expect(isProcurementQTooShort('s')).toBe(true)
    expect(isProcurementQTooShort('sp')).toBe(true)
    expect(isProcurementQTooShort('spi')).toBe(false)
  })

  it('agrees with the builder guard at the boundary', () => {
    const atMin = 'x'.repeat(PROCUREMENT_Q_MIN_LENGTH)
    const belowMin = 'x'.repeat(PROCUREMENT_Q_MIN_LENGTH - 1)
    expect(procurementQOrUndefined(atMin)).toBe(atMin)
    expect(isProcurementQTooShort(atMin)).toBe(false)
    expect(procurementQOrUndefined(belowMin)).toBeUndefined()
    expect(isProcurementQTooShort(belowMin)).toBe(true)
  })
})
