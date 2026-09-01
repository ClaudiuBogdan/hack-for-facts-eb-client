import { describe, expect, it } from 'vitest'

import {
  resolveBudgetNormalization,
  toBudgetNormalization,
} from './entities-redesign'

// The Chronos budget API has no CPI mode and no USD rate yet (program D2).
// A request for either must degrade to the nearest supported normalization
// and SAY so — it used to throw and take the whole entity page down for any
// user who had flipped the global "real prices" toggle.
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

  it('degrades inflation adjustment to nominal values and reports it', () => {
    expect(
      resolveBudgetNormalization({
        normalization: 'total',
        currency: 'EUR',
        inflation_adjusted: true,
      }),
    ).toEqual({
      normalization: 'TOTAL_EURO',
      caveats: { inflationAdjustedUnavailable: true, currencyUnavailable: null },
    })
  })

  it('degrades USD to RON and reports it', () => {
    expect(
      resolveBudgetNormalization({ normalization: 'per_capita', currency: 'USD' }),
    ).toEqual({
      normalization: 'PER_CAPITA',
      caveats: { inflationAdjustedUnavailable: false, currencyUnavailable: 'USD' },
    })
  })

  it('never throws, even for both unsupported settings at once', () => {
    expect(() =>
      toBudgetNormalization({ currency: 'USD', inflation_adjusted: true }),
    ).not.toThrow()
    expect(toBudgetNormalization({ currency: 'USD', inflation_adjusted: true })).toBe(
      'TOTAL',
    )
  })
})
