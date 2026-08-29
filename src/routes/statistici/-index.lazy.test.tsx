import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => ({}),
    useLoaderData: () => ({ landingData: null, landingCatalog: null }),
  }),
}))

vi.mock('@/features/statistics/pages/statistics-landing-page', () => ({
  StatisticsLandingPage: () => <div data-testid="statistics-landing-page" />,
}))

describe('StatisticsLandingRoutePage', () => {
  it('renders the statistics landing page component for /statistici', async () => {
    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('statistics-landing-page')).toBeInTheDocument()
  })
})
