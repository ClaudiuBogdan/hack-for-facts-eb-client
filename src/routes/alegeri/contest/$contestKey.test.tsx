import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONTEST_SEARCH } from '@/schemas/elections'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: () => ({}),
}))

describe('alegeri contest explorer route', () => {
  it('validates search through parseContestSearch without throwing', async () => {
    const { Route } = await import('./$contestKey')
    const validateSearch = Route.options.validateSearch as (value: unknown) => unknown

    expect(validateSearch(undefined)).toEqual(DEFAULT_CONTEST_SEARCH)
    expect(
      validateSearch({
        view: 'bogus',
        tab: 'bogus',
        expert: '9',
      }),
    ).toEqual(DEFAULT_CONTEST_SEARCH)
  })
})
