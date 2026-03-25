import { describe, expect, it } from 'vitest'
import {
  buildEntitySwitchRedirectUri,
  resolveEntitySelectionNavigationTarget,
} from './entity-selector-navigation'

describe('entity-selector-navigation', () => {
  it('preserves the raw encoded search string when building entity switch redirect URIs', () => {
    const encodedAnalytics = encodeURIComponent(
      JSON.stringify({
        target: {
          path: [{ type: 'fn', code: 'A.01' }],
        },
      }),
    )

    expect(
      buildEntitySwitchRedirectUri({
        pathname: '/primarie/4305857/buget/provocari/test-module/test-challenge/test-step',
        searchStr: `?lang=en&analytics=${encodedAnalytics}&view=section`,
      }),
    ).toBe(
      `/primarie/$cui/buget/provocari/test-module/test-challenge/test-step?lang=en&analytics=${encodedAnalytics}&view=section`,
    )
  })

  it('strips hashes when resolving redirect targets', () => {
    expect(
      resolveEntitySelectionNavigationTarget({
        entityCui: '4305857',
        redirectUri:
          '/primarie/$cui/buget/provocari/test-module/test-challenge/test-step?lang=en#sidebar',
      }),
    ).toEqual({
      to: '/primarie/4305857/buget/provocari/test-module/test-challenge/test-step',
      search: { lang: 'en' },
    })
  })

  it('accepts the supported primarie redirect path families', () => {
    const supportedRedirectUris = [
      '/primarie/$cui',
      '/primarie/$cui/',
      '/primarie/$cui/buget',
      '/primarie/$cui/buget/',
      '/primarie/$cui/buget/calendar',
      '/primarie/$cui/buget/provocari',
      '/primarie/$cui/buget/provocari/test-module',
      '/primarie/$cui/buget/provocari/test-module/test-challenge/test-step',
    ] as const

    for (const redirectUri of supportedRedirectUris) {
      const navigationTarget = resolveEntitySelectionNavigationTarget({
        entityCui: '4305857',
        redirectUri,
      })

      expect(navigationTarget).toEqual({
        to: redirectUri.split('$cui').join('4305857'),
        search: {},
      })
    }
  })

  it('falls back for unsupported primarie redirect paths', () => {
    const unsupportedRedirectUris = [
      '/primarie/$cui/not-a-route',
      '/primarie/$cui/buget/unknown',
      '/primarie/$cui/buget/provocari/test-module/test-challenge',
      '/primarie/$cui/buget/provocari/test-module/test-challenge/test-step/extra',
    ] as const

    for (const redirectUri of unsupportedRedirectUris) {
      expect(
        resolveEntitySelectionNavigationTarget({
          entityCui: '4305857',
          languageQuery: 'en',
          redirectUri,
        }),
      ).toEqual({
        to: '/primarie/4305857/buget/provocari',
        search: { lang: 'en' },
      })
    }
  })
})
