import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/test-utils'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'

const state = vi.hoisted(() => ({
  search: {} as Record<string, unknown>,
  loaderData: {} as Record<string, unknown>,
  navigate: vi.fn(),
  page: vi.fn((_props: Record<string, unknown>) => null),
}))

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({ options, useSearch: () => state.search, useLoaderData: () => state.loaderData }),
  useNavigate: () => state.navigate,
}))
vi.mock('@/features/elections/catalog/elections-catalog-page', () => ({ ElectionsCatalogPage: (props: Record<string, unknown>) => state.page(props) }))

const { Route } = await import('./index.lazy')
const RoutePage = (Route as unknown as { readonly options: { readonly component: ComponentType } }).options.component
const propsOfLastRender = () => state.page.mock.lastCall?.[0] as Record<string, unknown> & { readonly onSearchChange: (next: unknown) => void }

const PAGE = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }

beforeEach(() => {
  state.page.mockClear()
  state.navigate.mockReset()
})

describe('the /alegeri route page', () => {
  it('seeds the page with the server’s read when it was for this address', () => {
    state.search = { an: 2024 }
    state.loaderData = { seedKey: seedKeyOf(electionsCatalogKeys.catalog({ an: 2024 })), page: PAGE }
    render(<RoutePage />)
    expect(propsOfLastRender()).toMatchObject({ search: { an: 2024 }, initialPage: PAGE })
  })

  it('never seeds another address’s page', () => {
    state.search = { an: 2020 }
    state.loaderData = { seedKey: seedKeyOf(electionsCatalogKeys.catalog({ an: 2024 })), page: PAGE }
    render(<RoutePage />)
    expect(propsOfLastRender()).not.toHaveProperty('initialPage')
  })

  it('moves the filters and the page through the address, keeping the reader’s place', () => {
    state.search = {}
    state.loaderData = { seedKey: seedKeyOf(electionsCatalogKeys.catalog({})) }
    render(<RoutePage />)
    propsOfLastRender().onSearchChange({ tip: 'local' })
    expect(state.navigate).toHaveBeenCalledWith({ search: { tip: 'local' }, resetScroll: false })
  })
})
