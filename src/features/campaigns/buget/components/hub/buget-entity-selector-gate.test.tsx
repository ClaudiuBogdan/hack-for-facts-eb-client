import { render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BugetEntitySelectorGate } from './buget-entity-selector-gate'

const entitySearchInputMock = vi.fn((_: Record<string, unknown>) => <div>Entity search</div>)
const useIsMobileMock = vi.fn(() => false)

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const query = search ? new URLSearchParams(search).toString() : ''
    const href = typeof to === 'string'
      ? `${to}${query ? `?${query}` : ''}`
      : '#'

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    EVENTS: {
      CampaignEntitySelectorOpened: 'CampaignEntitySelectorOpened',
      CampaignEntitySelectedFromSearch: 'CampaignEntitySelectedFromSearch',
    },
    capture: vi.fn(),
  },
}))

vi.mock('@/hooks/useRecentEntities', () => ({
  useRecentEntities: () => ({
    addRecentEntity: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => useIsMobileMock(),
}))

vi.mock('@/components/entities/EntitySearch', () => ({
  EntitySearchInput: (props: Record<string, unknown>) => entitySearchInputMock(props),
}))

vi.mock('./recent-uat-badges', () => ({
  RecentUatBadges: () => <div>Recent entities</div>,
}))

describe('BugetEntitySelectorGate', () => {
  beforeEach(() => {
    entitySearchInputMock.mockClear()
    useIsMobileMock.mockReset()
    useIsMobileMock.mockReturnValue(false)
  })

  it('renders the inline map section for picking from the map', () => {
    render(
      <BugetEntitySelectorGate
        locale="ro"
        onEntitySelected={vi.fn()}
      />,
    )

    expect(screen.getByText(/sau alege de pe hartă/i)).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /Se încarcă harta/i })).toBeInTheDocument()
  })

  it('defers search autofocus until after mount on desktop', async () => {
    render(
      <BugetEntitySelectorGate
        locale="ro"
        onEntitySelected={vi.fn()}
      />,
    )

    expect(entitySearchInputMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        autoFocus: false,
      }),
    )

    await waitFor(() => {
      expect(entitySearchInputMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          autoFocus: true,
        }),
      )
    })
  })

  it('does not autofocus the search input on mobile', async () => {
    useIsMobileMock.mockReturnValue(true)

    render(
      <BugetEntitySelectorGate
        locale="ro"
        onEntitySelected={vi.fn()}
      />,
    )

    expect(entitySearchInputMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        autoFocus: false,
      }),
    )

    await waitFor(() => {
      expect(entitySearchInputMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          autoFocus: false,
        }),
      )
    })
  })
})
