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
let subscriptionStatsState = {
  total: 12,
  perUat: [] as Array<{ sirutaCode: string; uatName: string; count: number }>,
  isLoading: false,
  isError: false,
}
let uatCuiMapState = {
  data: {
    natcodeToCuiMap: new Map<string, string>(),
    cuiToNatcodeMap: new Map<string, string>(),
    validRows: 0,
    invalidRows: 0,
    duplicateNatcodeRows: 0,
  },
  isLoading: false,
  isError: false,
}

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
  useSubscriptionStats: () => subscriptionStatsState,
}))

vi.mock('../../hooks/use-uat-cui-map', () => ({
  useUatCuiMap: () => uatCuiMapState,
}))

describe('BugetEntitySelectorGate', () => {
  beforeEach(() => {
    entitySearchInputMock.mockClear()
    useIsMobileMock.mockReset()
    useIsMobileMock.mockReturnValue(false)
    subscriptionStatsState = {
      total: 12,
      perUat: [],
      isLoading: false,
      isError: false,
    }
    uatCuiMapState = {
      data: {
        natcodeToCuiMap: new Map(),
        cuiToNatcodeMap: new Map(),
        validRows: 0,
        invalidRows: 0,
        duplicateNatcodeRows: 0,
      },
      isLoading: false,
      isError: false,
    }
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

  it('maps search-result participant counts via the CSV cui-to-siruta lookup', () => {
    subscriptionStatsState = {
      total: 12,
      perUat: [
        { sirutaCode: '154972', uatName: 'Orașul Cisnădie', count: 3 },
      ],
      isLoading: false,
      isError: false,
    }
    uatCuiMapState = {
      data: {
        natcodeToCuiMap: new Map([['154972', '4406002']]),
        cuiToNatcodeMap: new Map([['4406002', '154972']]),
        validRows: 1,
        invalidRows: 0,
        duplicateNatcodeRows: 0,
      },
      isLoading: false,
      isError: false,
    }

    render(
      <BugetEntitySelectorGate
        locale="ro"
        onEntitySelected={vi.fn()}
      />,
    )

    const props = entitySearchInputMock.mock.calls[
      entitySearchInputMock.mock.calls.length - 1
    ]?.[0] as {
      renderResultTrailing?: (entity: {
        cui: string
        name: string
        entity_type?: string | null
        uat?: {
          county_name?: string | null
        } | null
      }) => ReactNode
    }

    expect(props.renderResultTrailing).toBeDefined()

    render(
      <>{props.renderResultTrailing?.({
        cui: '4406002',
        name: 'Orașul Cisnădie',
        entity_type: 'admin_town_hall',
        uat: {
          county_name: 'Sibiu',
        },
      })}</>,
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
