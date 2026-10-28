import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/test-utils'

const state = vi.hoisted(() => ({
  params: { contestKey: '' },
  loaderData: {} as Record<string, unknown>,
  page: vi.fn((_props: Record<string, unknown>) => null),
}))

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({ options, useParams: () => state.params, useLoaderData: () => state.loaderData }),
}))
vi.mock('@/features/elections/catalog/election-contest-page', () => ({ ElectionContestPage: (props: Record<string, unknown>) => state.page(props) }))

const { Route } = await import('./$contestKey.lazy')
const RoutePage = (Route as unknown as { readonly options: { readonly component: ComponentType } }).options.component
const propsOfLastRender = () => state.page.mock.lastCall?.[0] as Record<string, unknown>

const KEY = 'ro:local:2024:2024-06-09:mayor:uat:100004'
const CONTEST = { contestKey: KEY }
const RESULT = { tallies: [] }
const EVENT = { eventKey: 'ro:local:2024' }

beforeEach(() => {
  state.page.mockClear()
})

describe('the /alegeri/contest/$contestKey route page', () => {
  it('seeds the page with the server’s reads of this contest', () => {
    state.params = { contestKey: KEY }
    state.loaderData = { contestKey: KEY, contest: CONTEST, result: RESULT, event: EVENT }
    render(<RoutePage />)
    expect(propsOfLastRender()).toEqual({ contestKey: KEY, initialContest: CONTEST, initialResult: RESULT, initialEvent: EVENT })
  })

  it('seeds a place without figures as null', () => {
    state.params = { contestKey: KEY }
    state.loaderData = { contestKey: KEY, contest: CONTEST, result: null }
    render(<RoutePage />)
    expect(propsOfLastRender()).toEqual({ contestKey: KEY, initialContest: CONTEST, initialResult: null })
  })

  it('never seeds another contest’s page', () => {
    state.params = { contestKey: `${KEY}-2` }
    state.loaderData = { contestKey: KEY, contest: CONTEST, result: RESULT, event: EVENT }
    render(<RoutePage />)
    expect(propsOfLastRender()).toEqual({ contestKey: `${KEY}-2` })
  })
})
