import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BugetEntitySelectorGate } from './buget-entity-selector-gate'

type MockLinkProps = {
  readonly children: ReactNode
  readonly to: string
  readonly search?: Record<string, string>
  readonly [key: string]: unknown
}

const entitySearchInputMock = vi.fn((props: Record<string, unknown>) => <div>{String(props.placeholder ?? 'Entity search')}</div>)
const useIsMobileMock = vi.fn(() => false)

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: MockLinkProps) => {
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

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: vi.fn(),
    inView: true,
  }),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => useIsMobileMock(),
}))

vi.mock('@/components/entities/EntitySearch', () => ({
  EntitySearchInput: (props: Record<string, unknown>) => entitySearchInputMock(props),
}))

vi.mock('./campaign-participants-map', () => ({
  CampaignParticipantsMap: () => <div>Participant map</div>,
}))

vi.mock('./recent-uat-badges', () => ({
  RecentUatBadges: () => <div>Recent entities</div>,
}))

vi.mock('../../hooks/use-subscription-stats', () => ({
  useSubscriptionStats: () => ({
    total: 12,
    perUat: [],
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('../../hooks/use-campaign-uat-directory', () => ({
  useCampaignUatDirectory: () => ({
    data: {
      byCui: new Map(),
      byNatcode: new Map(),
      byUatId: new Map(),
    },
    isLoading: false,
    isError: false,
  }),
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
    expect(screen.getByText('Participant map')).toBeInTheDocument()
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
