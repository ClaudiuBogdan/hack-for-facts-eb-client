import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => ({}),
    useLoaderData: () => ({ hub: { nativeContract: 'hub-v1', indicators: null, counties: null, failures: [] } }),
  }),
}))

vi.mock('@/features/statistics/pages/statistics-hub-page', () => ({
  StatisticsHubPage: () => <div data-testid="statistics-hub-page" />,
}))

describe('StatisticsHubRoutePage', () => {
  it('renders the statistics hub page component for /ins', async () => {
    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('statistics-hub-page')).toBeInTheDocument()
  })
})
