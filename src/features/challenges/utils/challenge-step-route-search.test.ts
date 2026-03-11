import { describe, expect, it } from 'vitest'
import {
  buildChallengeStepRouteLoaderData,
  resolveChallengeStepRouteSearch,
} from './challenge-step-route-search'

describe('challenge-step-route-search', () => {
  it('builds loader data from validated section/view search state', () => {
    expect(
      buildChallengeStepRouteLoaderData({
        section: 'details',
        view: 'article',
      }),
    ).toEqual({
      section: 'details',
      view: 'article',
    })
  })

  it('falls back to loader data when live search is temporarily missing', () => {
    expect(
      resolveChallengeStepRouteSearch({
        search: {
          section: undefined,
          view: undefined,
        },
        loaderData: {
          section: 'details',
          view: 'article',
        },
      }),
    ).toEqual({
      section: 'details',
      view: 'article',
    })
  })

  it('prefers live search once hydration catches up', () => {
    expect(
      resolveChallengeStepRouteSearch({
        search: {
          section: 'quiz',
          view: 'section',
        },
        loaderData: {
          section: 'details',
          view: 'article',
        },
      }),
    ).toEqual({
      section: 'quiz',
      view: 'section',
    })
  })
})
