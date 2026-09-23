import { render, screen } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { territoryHubFixture } from '@/features/statistics/test/territory-hub-fixtures'

const territoryHubPagePropsMock = vi.fn()

let mockedParams = { siruta: '54975' }
let mockedSearch: Record<string, unknown> = { period: '2023' }
let mockedLoaderData: Record<string, unknown> = { failed: false }

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
    useLoaderData: () => mockedLoaderData,
    options,
  }),
}))

vi.mock('@/features/statistics/pages/statistics-territory-hub-page', () => ({
  StatisticsTerritoryHubPage: (props: {
    readonly siruta: string
    readonly search: Record<string, unknown>
    readonly initialHub?: unknown
  }) => {
    territoryHubPagePropsMock(props)
    return <div data-testid="statistics-territory-hub-page" />
  },
}))

describe('StatisticsTerritoryRoutePage', () => {
  beforeEach(() => {
    mockedParams = { siruta: '54975' }
    mockedSearch = { period: '2023' }
    mockedLoaderData = { failed: false }
    territoryHubPagePropsMock.mockReset()
  })

  it('passes route params and search into StatisticsTerritoryHubPage, with no seed on a client navigation', async () => {
    const { Route } = await import('./$siruta.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('statistics-territory-hub-page')).toBeInTheDocument()
    expect(territoryHubPagePropsMock).toHaveBeenCalledWith({
      siruta: '54975',
      search: { period: '2023' },
    })
  })

  it('seeds the page with the hub the server loader read', async () => {
    const hub = territoryHubFixture('54975')
    mockedLoaderData = { hub, failed: false }
    const { Route } = await import('./$siruta.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(territoryHubPagePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ siruta: '54975', initialHub: hub }),
    )
  })

  it('answers not-found in the page’s own frame', async () => {
    const { Route } = await import('./$siruta.lazy')
    const Missing = Route.options.notFoundComponent as ComponentType

    render(<Missing />)

    expect(screen.getByText('Teritoriu negăsit')).toBeInTheDocument()
  })
})
