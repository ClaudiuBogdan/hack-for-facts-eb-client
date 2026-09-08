import { describe, expect, it } from 'vitest'

import {
  resolveBudgetNormalization,
  toBudgetNormalization,
} from './entities-redesign'

// Native money options preserve requested settings; GDP and euro aliases retain precedence.
describe('resolveBudgetNormalization', () => {
  it('maps supported requests with no caveats', () => {
    expect(resolveBudgetNormalization({ normalization: 'total' })).toEqual({
      normalization: 'TOTAL',
      caveats: null,
    })
    expect(
      resolveBudgetNormalization({ normalization: 'per_capita', currency: 'EUR' }),
    ).toEqual({ normalization: 'PER_CAPITA_EURO', caveats: null })
    expect(resolveBudgetNormalization({ normalization: 'percent_gdp' })).toEqual({
      normalization: 'PERCENT_GDP',
      caveats: null,
    })
  })

  it('retains CPI requests without a nominal fallback', () => {
    expect(
      resolveBudgetNormalization({
        normalization: 'total',
        currency: 'EUR',
        inflation_adjusted: true,
      }),
    ).toEqual({
      normalization: 'TOTAL_EURO',
      caveats: null,
    })
  })

  it('retains USD requests without a currency fallback', () => {
    expect(
      resolveBudgetNormalization({ normalization: 'per_capita', currency: 'USD' }),
    ).toEqual({
      normalization: 'PER_CAPITA',
      caveats: null,
    })
  })

  it('supports combined USD and inflation settings', () => {
    expect(() =>
      toBudgetNormalization({ currency: 'USD', inflation_adjusted: true }),
    ).not.toThrow()
    expect(toBudgetNormalization({ currency: 'USD', inflation_adjusted: true })).toBe(
      'TOTAL',
    )
  })
})
