import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/test-utils'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'

const state = vi.hoisted(() => ({
  params: { electionKey: 'bec-local-2024' },
  search: {} as Record<string, unknown>,
  loaderData: {} as Record<string, unknown>,
  navigate: vi.fn(),
  page: vi.fn((_props: Record<string, unknown>) => null),
}))

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useParams: () => state.params,
    useSearch: () => state.search,
    useLoaderData: () => state.loaderData,
  }),
  useNavigate: () => state.navigate,
}))
vi.mock('@/features/elections/catalog/election-edition-page', () => ({ ElectionEditionPage: (props: Record<string, unknown>) => state.page(props) }))

const { Route } = await import('./$electionKey.lazy')
const RoutePage = (Route as unknown as { readonly options: { readonly component: ComponentType } }).options.component
const propsOfLastRender = () => state.page.mock.lastCall?.[0] as Record<string, unknown> & { readonly onSearchChange: (next: unknown) => void }

const EDITION = { electionKey: 'bec-local-2024' }
const PAGE = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }
const loaderDataFor = (electionKey: string, search: Record<string, unknown>) => ({
  electionKey,
  contestsSeedKey: seedKeyOf(electionsCatalogKeys.contests(electionKey, search)),
  edition: EDITION,
  contests: PAGE,
})

beforeEach(() => {
  state.page.mockClear()
  state.navigate.mockReset()
})

describe('the /alegeri/$electionKey route page', () => {
  it('seeds the edition and its contests from the server’s reads for this address', () => {
    state.params = { electionKey: 'bec-local-2024' }
    state.search = { functie: 'mayor' }
    state.loaderData = loaderDataFor('bec-local-2024', { functie: 'mayor' })
    render(<RoutePage />)
    expect(propsOfLastRender()).toMatchObject({ electionKey: 'bec-local-2024', search: { functie: 'mayor' }, initialEdition: EDITION, initialContests: PAGE })
  })

  it('keeps the edition’s seed but not the contests’ once the filters move', () => {
    state.search = { functie: 'local_council' }
    state.loaderData = loaderDataFor('bec-local-2024', { functie: 'mayor' })
    render(<RoutePage />)
    expect(propsOfLastRender()).toHaveProperty('initialEdition', EDITION)
    expect(propsOfLastRender()).not.toHaveProperty('initialContests')
  })

  it('never seeds another edition’s page', () => {
    state.params = { electionKey: 'bec-local-2020' }
    state.search = {}
    state.loaderData = loaderDataFor('bec-local-2024', {})
    render(<RoutePage />)
    expect(propsOfLastRender()).not.toHaveProperty('initialEdition')
    expect(propsOfLastRender()).not.toHaveProperty('initialContests')
  })

  it('moves the contests’ filters and page through the address, keeping the reader’s place', () => {
    state.params = { electionKey: 'bec-local-2024' }
    state.loaderData = loaderDataFor('bec-local-2024', {})
    render(<RoutePage />)
    propsOfLastRender().onSearchChange({ pagina: 2 })
    expect(state.navigate).toHaveBeenCalledWith({ search: { pagina: 2 }, resetScroll: false })
  })
})
