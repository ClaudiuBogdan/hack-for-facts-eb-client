import { describe, expect, it } from 'vitest'
import {
  CampaignPrincipalRouteSearchSchema,
  resolveCampaignPrincipalLocale,
} from './campaign-principal-search-schema'

describe('campaign-principal-search-schema', () => {
  it('accepts lang and entityCui', () => {
    const parsed = CampaignPrincipalRouteSearchSchema.parse({
      lang: 'en',
      entityCui: '12345678',
    })

    expect(parsed.lang).toBe('en')
    expect(parsed.entityCui).toBe('12345678')
  })

  it('rejects empty entityCui values', () => {
    expect(() =>
      CampaignPrincipalRouteSearchSchema.parse({
        entityCui: '   ',
      }),
    ).toThrow()
  })

  it('falls back to ro locale', () => {
    expect(resolveCampaignPrincipalLocale(undefined)).toBe('ro')
    expect(resolveCampaignPrincipalLocale({})).toBe('ro')
    expect(resolveCampaignPrincipalLocale({ lang: 'en' })).toBe('en')
  })
})
