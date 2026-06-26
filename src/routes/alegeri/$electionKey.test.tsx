import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_ELECTION_HUB_SEARCH } from '@/schemas/elections'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: () => ({}),
}))

describe('alegeri election hub route', () => {
  it('validates search through parseElectionHubSearch without throwing', async () => {
    const { Route } = await import('./$electionKey')
    const validateSearch = Route.options.validateSearch as (value: unknown) => unknown

    expect(validateSearch(undefined)).toEqual(DEFAULT_ELECTION_HUB_SEARCH)
    expect(
      validateSearch({
        tab: 'unknown',
        scope: 'invalid,county',
        q: 'consiliu',
      }),
    ).toEqual({
      tab: 'contests',
      office: [],
      scope: ['county'],
      q: 'consiliu',
    })
  })
})
