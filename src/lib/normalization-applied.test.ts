import { describe, expect, it } from 'vitest'

import { resolveAppliedNormalization } from './normalization'

// One rule for fetching AND labelling: what the budget API cannot apply today
// (CPI, USD) degrades with a caveat, and what does not matter for a mode
// (currency under percent_gdp, USD under the euro composites) gets no caveat.
describe('resolveAppliedNormalization', () => {
  it('applies supported settings without caveats', () => {
    expect(resolveAppliedNormalization({ normalization: 'total', currency: 'EUR' })).toMatchObject({
      normalization: 'total',
      currency: 'EUR',
      inflationAdjusted: false,
      caveats: null,
    })
  })

  it('degrades inflation adjustment to nominal with a caveat', () => {
    expect(
      resolveAppliedNormalization({ normalization: 'per_capita', currency: 'RON', inflation_adjusted: true }),
    ).toMatchObject({
      normalization: 'per_capita',
      currency: 'RON',
      inflationAdjusted: false,
      caveats: { inflationAdjustedUnavailable: true, currencyUnavailable: null },
    })
  })

  it('degrades USD to RON with a caveat', () => {
    expect(resolveAppliedNormalization({ normalization: 'total', currency: 'USD' })).toMatchObject({
      currency: 'RON',
      caveats: { inflationAdjustedUnavailable: false, currencyUnavailable: 'USD' },
    })
  })

  it('never caveats currency or inflation under percent_gdp', () => {
    expect(
      resolveAppliedNormalization({ normalization: 'percent_gdp', currency: 'USD', inflation_adjusted: true }),
    ).toMatchObject({ normalization: 'percent_gdp', inflationAdjusted: false, caveats: null })
  })

  it('pins EUR for the euro composites, so a USD request is moot there', () => {
    expect(resolveAppliedNormalization({ normalization: 'total_euro', currency: 'USD' })).toMatchObject({
      normalization: 'total',
      currency: 'EUR',
      caveats: null,
    })
    expect(
      resolveAppliedNormalization({ normalization: 'per_capita_euro', currency: 'USD', inflation_adjusted: true }),
    ).toMatchObject({
      normalization: 'per_capita',
      currency: 'EUR',
      inflationAdjusted: false,
      caveats: { inflationAdjustedUnavailable: true, currencyUnavailable: null },
    })
  })
})
