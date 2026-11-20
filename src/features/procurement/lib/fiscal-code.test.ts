import { describe, expect, it } from 'vitest'
import { withoutLeadingZeros } from './fiscal-code'

describe('withoutLeadingZeros (the API rule, a51e6790)', () => {
  it('drops zeros only from an all-digit code of at most ten', () => {
    expect(withoutLeadingZeros('0014399840')).toBe('14399840')
    expect(withoutLeadingZeros('14399840')).toBe('14399840')
    expect(withoutLeadingZeros('000')).toBe('0')
  })

  it('keeps a longer code, an RO prefix or any other character as written', () => {
    expect(withoutLeadingZeros('0000014399840')).toBe('0000014399840')
    expect(withoutLeadingZeros('RO14399840')).toBe('RO14399840')
    expect(withoutLeadingZeros(' 14399840')).toBe(' 14399840')
  })
})
