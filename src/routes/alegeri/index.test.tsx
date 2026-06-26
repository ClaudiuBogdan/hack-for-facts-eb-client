import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_ELECTIONS_LANDING_SEARCH } from '@/schemas/elections'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: () => ({}),
}))

describe('alegeri landing route', () => {
  it('validates search through parseElectionsLandingSearch without throwing', async () => {
    const { Route } = await import('./index')
    const validateSearch = Route.options.validateSearch as (value: unknown) => unknown

    expect(validateSearch(undefined)).toEqual(DEFAULT_ELECTIONS_LANDING_SEARCH)
    expect(
      validateSearch({
        family: 'bogus,local',
        arhiva: '2',
        sort: 'bogus',
      }),
    ).toEqual({
      ...DEFAULT_ELECTIONS_LANDING_SEARCH,
      family: ['local'],
    })
  })
})
