import { describe, expect, it } from 'vitest'
import { PROCUREMENT_Q_MAX_LENGTH, procurementQOrUndefined } from './search-query'

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
