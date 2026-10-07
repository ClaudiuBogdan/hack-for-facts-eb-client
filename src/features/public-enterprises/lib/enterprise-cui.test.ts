import { describe, expect, it } from 'vitest'
import { canonicalCuiOf, parsePublicEnterpriseCuiParam } from './enterprise-cui'

describe('an enterprise’s CUI in an address', () => {
  it('takes 2–10 digits with no leading zero, as the API does', () => {
    expect(parsePublicEnterpriseCuiParam('789401')).toBe('789401')
    for (const value of ['1', '0789401', '12345678901', 'RO789401', '']) expect(parsePublicEnterpriseCuiParam(value)).toBeNull()
  })

  it('drops a leading zero a source wrote, and makes no address a 404 would answer', () => {
    expect(canonicalCuiOf('0010020943')).toBe('10020943')
    expect(canonicalCuiOf('05')).toBeNull()
    expect(canonicalCuiOf('12345678901')).toBeNull()
  })
})
