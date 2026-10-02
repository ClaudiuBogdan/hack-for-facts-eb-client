import { describe, expect, it } from 'vitest'
import { parseStatements } from '../../../../scripts/lib/ngo-statements.mjs'

/** A statements file as MFP publishes it: the header, then one row per CUI; only CUI, CAENO, I1 and the revenue indicators read. */
const file = (...rows: readonly string[]) =>
  ['CUI,CAEN,CAENO,I1,I14,I22,I30,I38,I39', ...rows].join('\r\n')

describe('parseStatements', () => {
  it('keeps a blank revenue unknown and a zero a zero', () => {
    const { statements, malformed } = parseStatements(file('100,,9312,500,,,,,0', '200,,9312,0,0,0,0,0,0', '0300,,9499,7,10,0,5,15,0'))
    expect(malformed).toBe(0)
    expect(statements.get('100')).toEqual({ activity: '9312', I14: null, I22: null, I30: null, I38: null, fixedAssets: 500 })
    expect(statements.get('200')?.I38).toBe(0)
    // Leading zeros dropped from the CUI.
    expect(statements.get('300')).toEqual({ activity: '9499', I14: 10, I22: 0, I30: 5, I38: 15, fixedAssets: 7 })
  })

  it('reads the fixed assets unvalidated: a bad I1 is unknown and drops nothing', () => {
    const { statements, malformed } = parseStatements(file('100,,9312,x,1,0,0,1,0'))
    expect(malformed).toBe(0)
    expect(statements.get('100')?.fixedAssets).toBeNull()
  })

  it('drops and counts a row cut short or with a revenue that is no integer', () => {
    const { statements, malformed } = parseStatements(file('100,,9312,0,1,0,0', '200,,9312,0,1.5,0,0,1.5,0', '300,,9312,0,1,0,0,1,0'))
    expect(malformed).toBe(2)
    expect([...statements.keys()]).toEqual(['300'])
  })

  it('takes a CUI filed twice as one statement when the copies agree, a blank reading as 0 and I1 aside', () => {
    const { statements } = parseStatements(file('100,,9312,5,,,,,0', '100,,9312,9,0,0,0,0,0'))
    // The copy with more cells filled is kept.
    expect(statements.get('100')).toEqual({ activity: '9312', I14: 0, I22: 0, I30: 0, I38: 0, fixedAssets: 9 })
    expect(() => parseStatements(file('100,,9312,0,1,0,0,1,0', '100,,9312,0,2,0,0,2,0'))).toThrow('CUI 100 has two different statements')
  })
})
