import { describe, expect, it } from 'vitest'
import { groupWireValue } from './format'

describe('groupWireValue', () => {
  it('groups the integer part without touching a digit', () => {
    expect(groupWireValue('22516004', 'ro-RO')).toBe('22.516.004')
    expect(groupWireValue('22516004', 'en-GB')).toBe('22,516,004')
    expect(groupWireValue('411998', 'ro-RO')).toBe('411.998')
    expect(groupWireValue('7', 'ro-RO')).toBe('7')
  })

  it('keeps every published decimal, in the locale mark', () => {
    expect(groupWireValue('2.1', 'ro-RO')).toBe('2,1')
    expect(groupWireValue('2.1', 'en-GB')).toBe('2.1')
    // Parsing to a float would round this away; the contract is verbatim.
    expect(groupWireValue('1234.123456789012345678', 'ro-RO')).toBe(
      '1.234,123456789012345678',
    )
  })

  it('carries a sign and leaves anything unparseable alone', () => {
    expect(groupWireValue('-4200', 'ro-RO')).toBe('-4.200')
    expect(groupWireValue('..', 'ro-RO')).toBe('..')
    expect(groupWireValue(':', 'ro-RO')).toBe(':')
    expect(groupWireValue('  1000  ', 'ro-RO')).toBe('1.000')
  })
})
