import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const territoryHubPagePropsMock = vi.fn()

let mockedParams = { siruta: '54975' }
let mockedSearch: Record<string, unknown> = { period: '2023' }

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
    options,
  }),
}))

vi.mock('@/features/statistics/pages/statistics-territory-hub-page', () => ({
  StatisticsTerritoryHubPage: (props: {
    readonly siruta: string
    readonly search: Record<string, unknown>
  }) => {
    territoryHubPagePropsMock(props)
    return <div data-testid="statistics-territory-hub-page" />
  },
}))

describe('StatisticsTerritoryRoutePage', () => {
  beforeEach(() => {
    mockedParams = { siruta: '54975' }
    mockedSearch = { period: '2023' }
    territoryHubPagePropsMock.mockReset()
  })

  it('passes route params and search into StatisticsTerritoryHubPage', async () => {
    const { Route } = await import('./$siruta.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('statistics-territory-hub-page')).toBeInTheDocument()
    expect(territoryHubPagePropsMock).toHaveBeenCalledWith({
      siruta: '54975',
      search: { period: '2023' },
    })
  })
})
