import { describe, expect, it } from 'vitest'
import { resolveEntityPagePublicSettings } from './entity-page-public-settings'

describe('resolveEntityPagePublicSettings', () => {
  it('uses URL defaults when currency and inflation params are absent', () => {
    expect(resolveEntityPagePublicSettings({
      normalizationRaw: 'total',
    })).toEqual({
      normalization: 'total',
      currency: 'RON',
      inflationAdjusted: false,
      showPeriodGrowth: false,
    })
  })

  it('normalizes legacy euro variants and forces the EUR currency override', () => {
    expect(resolveEntityPagePublicSettings({
      normalizationRaw: 'per_capita_euro',
      currencyParam: 'USD',
      inflationAdjustedParam: 'true',
      showPeriodGrowthParam: true,
    })).toEqual({
      normalization: 'per_capita',
      currency: 'EUR',
      inflationAdjusted: true,
      showPeriodGrowth: true,
    })
  })

  it('forces inflation off for percent_gdp while keeping the resolved currency', () => {
    expect(resolveEntityPagePublicSettings({
      normalizationRaw: 'percent_gdp',
      currencyParam: 'USD',
      inflationAdjustedParam: true,
      showPeriodGrowthParam: 'true',
    })).toEqual({
      normalization: 'percent_gdp',
      currency: 'USD',
      inflationAdjusted: false,
      showPeriodGrowth: true,
    })
  })
})
