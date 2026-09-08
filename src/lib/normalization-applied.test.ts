import { describe, expect, it } from 'vitest'

import { resolveAppliedNormalization } from './normalization'

// Native money options preserve requested settings; GDP and euro aliases retain precedence.
describe('resolveAppliedNormalization', () => {
  it('applies supported settings without caveats', () => {
    expect(resolveAppliedNormalization({ normalization: 'total', currency: 'EUR' })).toMatchObject({
      normalization: 'total',
      currency: 'EUR',
      inflationAdjusted: false,
      caveats: null,
    })
  })

  it('preserves inflation adjustment for the native API', () => {
    expect(
      resolveAppliedNormalization({ normalization: 'per_capita', currency: 'RON', inflation_adjusted: true }),
    ).toMatchObject({
      normalization: 'per_capita',
      currency: 'RON',
      inflationAdjusted: true,
      caveats: null,
    })
  })

  it('preserves USD for the native API', () => {
    expect(resolveAppliedNormalization({ normalization: 'total', currency: 'USD' })).toMatchObject({
      currency: 'USD',
      caveats: null,
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
      inflationAdjusted: true,
      caveats: null,
    })
  })
})
