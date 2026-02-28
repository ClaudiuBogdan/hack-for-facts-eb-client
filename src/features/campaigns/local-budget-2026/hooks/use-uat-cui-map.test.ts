import { describe, expect, it } from 'vitest'
import { parseUatCuiMapCsv } from './use-uat-cui-map'

describe('use-uat-cui-map', () => {
  it('parses valid rows into a natcode->cui map', () => {
    const result = parseUatCuiMapCsv(
      ['cui,natcode', '111,1001', '222,1002', '333,1003'].join('\n'),
    )

    expect(result.validRows).toBe(3)
    expect(result.invalidRows).toBe(0)
    expect(result.duplicateNatcodeRows).toBe(0)
    expect(result.natcodeToCuiMap.get('1001')).toBe('111')
    expect(result.natcodeToCuiMap.get('1003')).toBe('333')
  })

  it('skips invalid rows and conflicting duplicate natcodes', () => {
    const result = parseUatCuiMapCsv(
      ['cui,natcode', '111,1001', ' ,1002', '222,1001', '333,1003'].join('\n'),
    )

    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(1)
    expect(result.duplicateNatcodeRows).toBe(1)
    expect(result.natcodeToCuiMap.get('1001')).toBe('111')
    expect(result.natcodeToCuiMap.get('1003')).toBe('333')
  })
})
