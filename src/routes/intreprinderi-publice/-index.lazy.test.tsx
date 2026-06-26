import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockedSearch: Record<string, unknown> = {}

const landingRouteSpy = vi.fn()
const listingRouteSpy = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => mockedSearch,
  }),
}))

vi.mock('@/features/public-enterprises/components/public-enterprises-pages', () => ({
  PublicEnterprisesLandingRoute: () => {
    landingRouteSpy()
    return <div data-testid="public-enterprises-landing" />
  },
  PublicEnterprisesListingRoute: ({
    search,
  }: {
    readonly search: Record<string, unknown>
  }) => {
    listingRouteSpy(search)
    return (
      <div
        data-testid="public-enterprises-listing"
        data-search={JSON.stringify(search)}
      />
    )
  },
}))

describe('PublicEnterprisesIndexRoute', () => {
  beforeEach(() => {
    mockedSearch = {}
    landingRouteSpy.mockReset()
    listingRouteSpy.mockReset()
  })

  async function renderRoute() {
    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType
    render(<RouteComponent />)
  }

  it('renders the landing route when search is empty', async () => {
    mockedSearch = {}

    await renderRoute()

    expect(screen.getByTestId('public-enterprises-landing')).toBeInTheDocument()
    expect(screen.queryByTestId('public-enterprises-listing')).not.toBeInTheDocument()
    expect(landingRouteSpy).toHaveBeenCalledTimes(1)
    expect(listingRouteSpy).not.toHaveBeenCalled()
  })

  it('renders the listing route when q is present', async () => {
    mockedSearch = { q: 'hidro' }

    await renderRoute()

    expect(screen.getByTestId('public-enterprises-listing')).toBeInTheDocument()
    expect(screen.queryByTestId('public-enterprises-landing')).not.toBeInTheDocument()
    expect(listingRouteSpy).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'hidro' }),
    )
  })

  it('renders the listing route when filters, pagination, or sort are active', async () => {
    mockedSearch = { status: ['functiune'] }
    await renderRoute()
    expect(screen.getByTestId('public-enterprises-listing')).toBeInTheDocument()

    mockedSearch = { page: 2 }
    await renderRoute()
    expect(listingRouteSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    )

    mockedSearch = { sort: 'cui' }
    await renderRoute()
    expect(listingRouteSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'cui' }),
    )
  })
})
