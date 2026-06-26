import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  routeSearch: vi.fn(() => ({})),
  routeParams: vi.fn(() => ({})),
  landingPageProps: vi.fn(),
  searchPageProps: vi.fn(),
  objectivePageProps: vi.fn(),
  territoryPageProps: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: mocks.routeSearch,
    useParams: mocks.routeParams,
  }),
}))

vi.mock('@/features/public-investments/pages/PublicInvestmentsLandingPage', () => ({
  PublicInvestmentsLandingPage: (props: unknown) => {
    mocks.landingPageProps(props)
    return <div>Landing route page</div>
  },
}))

vi.mock('@/features/public-investments/pages/PublicInvestmentsSearchPage', () => ({
  PublicInvestmentsSearchPage: (props: unknown) => {
    mocks.searchPageProps(props)
    return <div>Search route page</div>
  },
}))

vi.mock('@/features/public-investments/pages/PublicInvestmentsObjectivePage', () => ({
  PublicInvestmentsObjectivePage: (props: unknown) => {
    mocks.objectivePageProps(props)
    return <div>Objective route page</div>
  },
}))

vi.mock('@/features/public-investments/pages/PublicInvestmentsTerritoryPage', () => ({
  PublicInvestmentsTerritoryPage: (props: unknown) => {
    mocks.territoryPageProps(props)
    return <div>Territory route page</div>
  },
}))

describe('public investments file routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.routeSearch.mockReturnValue({})
    mocks.routeParams.mockReturnValue({})
  })

  it('renders the landing page component on the index route', async () => {
    mocks.routeSearch.mockReturnValue({ program: 'PNDL', view: 'stage' })
    const { Route } = await import('./index')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByText('Landing route page')).toBeInTheDocument()
    expect(mocks.landingPageProps).toHaveBeenCalledWith({
      search: { program: 'PNDL', view: 'stage' },
    })
  })

  it('passes validated search state into the search page', async () => {
    mocks.routeSearch.mockReturnValue({ q: 'apă', counties: ['CJ'] })
    const { Route } = await import('./cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByText('Search route page')).toBeInTheDocument()
    expect(mocks.searchPageProps).toHaveBeenCalledWith({
      search: { q: 'apă', counties: ['CJ'] },
    })
  })

  it('passes objective params and tab search state into the detail page', async () => {
    mocks.routeParams.mockReturnValue({ id: 'pi-anghel-cj-apahida' })
    mocks.routeSearch.mockReturnValue({ tab: 'plati' })
    const { Route } = await import('./obiective.$id')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByText('Objective route page')).toBeInTheDocument()
    expect(mocks.objectivePageProps).toHaveBeenCalledWith({
      objectiveId: 'pi-anghel-cj-apahida',
      search: { tab: 'plati' },
    })
  })

  it('routes county and locality params into the shared territory page', async () => {
    mocks.routeParams.mockReturnValue({ countyCode: 'CJ' })
    mocks.routeSearch.mockReturnValue({ programs: ['ANGHEL_SALIGNY'] })
    const countyRoute = await import('./judete.$countyCode')
    const CountyRouteComponent = countyRoute.Route.options.component as ComponentType

    render(<CountyRouteComponent />)

    expect(mocks.territoryPageProps).toHaveBeenLastCalledWith({
      scope: 'county',
      code: 'CJ',
      search: { programs: ['ANGHEL_SALIGNY'] },
    })

    mocks.routeParams.mockReturnValue({ siruta: '58728' })
    mocks.routeSearch.mockReturnValue({})
    const localityRoute = await import('./localitati.$siruta')
    const LocalityRouteComponent = localityRoute.Route.options.component as ComponentType

    render(<LocalityRouteComponent />)

    expect(mocks.territoryPageProps).toHaveBeenLastCalledWith({
      scope: 'locality',
      code: '58728',
      search: {},
    })
  })
})
