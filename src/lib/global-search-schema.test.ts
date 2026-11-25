import { describe, expect, it } from 'vitest'
import { globalSearchSchema } from './global-search-schema'

describe('globalSearchSchema', () => {
  it('reads the values it knows', () => {
    expect(globalSearchSchema.parse({ currency: 'EUR', inflation_adjusted: 'true' })).toEqual({ currency: 'EUR', inflation_adjusted: true })
    expect(globalSearchSchema.parse({ inflation_adjusted: false })).toEqual({ inflation_adjusted: false })
  })

  it('drops a value it does not know instead of failing the page (ERR-001)', () => {
    expect(globalSearchSchema.parse({ currency: 'XYZ' })).toEqual({ currency: undefined })
    expect(globalSearchSchema.parse({ inflation_adjusted: 'maybe' })).toEqual({ inflation_adjusted: undefined })
  })

  it('keeps the child routes’ own keys', () => {
    expect(globalSearchSchema.parse({ an: 2025, currency: 'GBP' })).toEqual({ an: 2025, currency: undefined })
  })
})
