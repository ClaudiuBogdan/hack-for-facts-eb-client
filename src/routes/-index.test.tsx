import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const entitySearchInputMock = vi.fn((_props: unknown) => <div>Search input</div>)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
}))

vi.mock('@/components/entities/EntitySearch', () => ({
  EntitySearchInput: (props: Record<string, unknown>) => entitySearchInputMock(props),
}))

vi.mock('@/components/entities/QuickEntityAccess', () => ({
  QuickEntityAccess: () => <div>Quick access</div>,
}))

vi.mock('@/components/landing/PageCard', () => ({
  PageCard: () => <div>Page card</div>,
}))

vi.mock('@/features/campaigns/buget/components/CampaignAccessShareCard', () => ({
  CampaignLandingShareCard: () => <div>Campaign banner</div>,
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

describe('Index route', () => {
  beforeEach(() => {
    entitySearchInputMock.mockClear()
  })

  it('uses preferred-entity navigation for the landing search', async () => {
    const { Route } = await import('./index')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(entitySearchInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectionBehavior: 'navigate-to-preferred-entity',
      }),
    )
  })

  it('renders the campaign banner before the homepage cards', async () => {
    const { Route } = await import('./index')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    const banner = screen.getByText('Campaign banner')
    const firstCard = screen.getAllByText('Page card')[0]

    expect(
      banner.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
