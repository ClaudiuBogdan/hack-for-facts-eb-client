import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/test/test-utils'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'

const state = vi.hoisted(() => ({
  params: { electionKey: 'ro:local:2024' },
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

const EVENT = { eventKey: 'ro:local:2024' }
const DAY = 'ro:local:2024:2024-06-09'
const PAGE = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }
const loaderDataFor = (electionKey: string, search: Record<string, unknown>) => ({
  electionKey,
  event: EVENT,
  contests: { occurrenceKey: DAY, seedKey: seedKeyOf(electionsCatalogKeys.contests(DAY, search)), page: PAGE },
})

beforeEach(() => {
  state.page.mockClear()
  state.navigate.mockReset()
})

describe('the /alegeri/$electionKey route page', () => {
  it('seeds the event and its day’s contests from the server’s reads for this address', () => {
    state.params = { electionKey: 'ro:local:2024' }
    state.search = { functie: 'mayor' }
    state.loaderData = loaderDataFor('ro:local:2024', { functie: 'mayor' })
    render(<RoutePage />)
    expect(propsOfLastRender()).toMatchObject({
      electionKey: 'ro:local:2024',
      search: { functie: 'mayor' },
      initialEvent: EVENT,
      initialContests: { occurrenceKey: DAY, page: PAGE },
    })
  })

  it('keeps the event’s seed but not the contests’ once the filters move', () => {
    state.search = { functie: 'local_council' }
    state.loaderData = loaderDataFor('ro:local:2024', { functie: 'mayor' })
    render(<RoutePage />)
    expect(propsOfLastRender()).toHaveProperty('initialEvent', EVENT)
    expect(propsOfLastRender()).not.toHaveProperty('initialContests')
  })

  it('never seeds another event’s page', () => {
    state.params = { electionKey: 'ro:local:2020' }
    state.search = {}
    state.loaderData = loaderDataFor('ro:local:2024', {})
    render(<RoutePage />)
    expect(propsOfLastRender()).not.toHaveProperty('initialEvent')
    expect(propsOfLastRender()).not.toHaveProperty('initialContests')
  })

  it('moves the day, the filters and the page through the address, keeping the reader’s place', () => {
    state.params = { electionKey: 'ro:local:2024' }
    state.loaderData = loaderDataFor('ro:local:2024', {})
    render(<RoutePage />)
    propsOfLastRender().onSearchChange({ data: '2024-06-23', pagina: 2 })
    expect(state.navigate).toHaveBeenCalledWith({ search: { data: '2024-06-23', pagina: 2 }, resetScroll: false })
  })
})
