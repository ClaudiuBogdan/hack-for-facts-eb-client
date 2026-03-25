import { describe, expect, it } from 'vitest'
import { CampaignRouteSearchSchema, resolveCampaignLocale } from './campaign-route-search-schema'

describe('campaign-route-search-schema', () => {
  it('accepts ro and en values', () => {
    expect(CampaignRouteSearchSchema.parse({ lang: 'ro' }).lang).toBe('ro')
    expect(CampaignRouteSearchSchema.parse({ lang: 'en' }).lang).toBe('en')
    expect(
      CampaignRouteSearchSchema.parse({
        redirectUri: '/primarie/$cui/buget/provocari/test-module?lang=en',
      }).redirectUri,
    ).toBe('/primarie/$cui/buget/provocari/test-module?lang=en')
  })

  it('rejects unsupported locale values', () => {
    expect(() => CampaignRouteSearchSchema.parse({ lang: 'de' })).toThrow()
  })

  it('resolves locale with ro fallback', () => {
    expect(resolveCampaignLocale(undefined)).toBe('ro')
    expect(resolveCampaignLocale({})).toBe('ro')
    expect(resolveCampaignLocale({ lang: 'en' })).toBe('en')
  })
})
