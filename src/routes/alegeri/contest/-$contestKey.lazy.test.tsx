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

const KEY = 'contest:bec-local-2024:mayor:source_constituency:8-19'
const CONTEST = { contestKey: KEY }

beforeEach(() => {
  state.page.mockClear()
})

describe('the /alegeri/contest/$contestKey route page', () => {
  it('seeds the page with the server’s read of this contest', () => {
    state.params = { contestKey: KEY }
    state.loaderData = { contestKey: KEY, contest: CONTEST }
    render(<RoutePage />)
    expect(propsOfLastRender()).toEqual({ contestKey: KEY, initialContest: CONTEST })
  })

  it('never seeds another contest’s page', () => {
    state.params = { contestKey: `${KEY}-2` }
    state.loaderData = { contestKey: KEY, contest: CONTEST }
    render(<RoutePage />)
    expect(propsOfLastRender()).toEqual({ contestKey: `${KEY}-2` })
  })
})
