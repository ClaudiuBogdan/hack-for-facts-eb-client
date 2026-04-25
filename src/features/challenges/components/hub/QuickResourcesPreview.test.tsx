import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { FUNKY_NOTIFICATION_ENTITY_UPDATES } from '@/features/notifications/campaign-notification-keys'
import type { UseDebateRequestAvailabilityResult } from '@/features/campaigns/buget/hooks/use-debate-request-availability'
import { QuickResourcesPreview } from './QuickResourcesPreview'

let mockLocation = {
  pathname: '/primarie/12345678/buget/provocari',
  searchStr: '',
}
let notificationsState: {
  readonly data: Array<{
    readonly notificationType: string
    readonly isActive: boolean
    readonly entityCui?: string | null
  }>
  readonly globalPreference: { readonly isActive: boolean } | null
  readonly isLoading: boolean
} = {
  data: [],
  globalPreference: null,
  isLoading: false,
}
let debateRequestAvailabilityState: UseDebateRequestAvailabilityResult

function createDebateRequestAvailabilityState(
  status: 'open' | 'closed_debate_took_place' | 'closed_deadline_expired' | 'closed_global_period_expired' = 'open',
): UseDebateRequestAvailabilityResult {
  return {
    state: 'ready',
    isSubmittable: status === 'open',
    error: null,
    availability: {
      status,
      publicationDate: null,
      requestDeadlineDate: null,
      globalDeadlineDate: '2026-04-26',
      publicDebate: null,
    },
  }
}

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly children?: ReactNode
  readonly to?: string
  readonly search?: Record<string, string>
}

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockLocation,
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

vi.mock('lucide-react', () => {
  const icon = (testId: string) => (props: Record<string, unknown>) => (
    <svg data-testid={testId} {...props} />
  )

  return {
    ArrowRight: icon('arrow-right-icon'),
    Bell: icon('bell-icon'),
    BellOff: icon('bell-off-icon'),
    Building2: icon('building2-icon'),
    Lock: icon('lock-icon'),
    MessageSquare: icon('message-square-icon'),
    Send: icon('send-icon'),
    Library: icon('library-icon'),
  }
})

vi.mock('@/features/campaigns/buget/hooks/use-campaign-content', () => ({
  getCampaignDefinition: () => ({
    forumUrl: 'https://forum.transparenta.eu/c/cu-ochii-pe-bugetele-locale/7',
  }),
}))

vi.mock('@/features/notifications/hooks/useCampaignNotifications', () => ({
  useCampaignNotifications: () => notificationsState,
}))

vi.mock('@/features/campaigns/buget/hooks/use-debate-request-availability', () => ({
  useDebateRequestAvailability: () => debateRequestAvailabilityState,
}))

describe('QuickResourcesPreview', () => {
  beforeEach(() => {
    mockLocation = {
      pathname: '/primarie/12345678/buget/provocari',
      searchStr: '',
    }
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }
    debateRequestAvailabilityState = createDebateRequestAvailabilityState('open')
  })

  it('shows the normal bell while notifications are loading', () => {
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: true,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByTestId('bell-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('bell-off-icon')).not.toBeInTheDocument()
  })

  it('shows the normal bell when no entity notification exists yet', () => {
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByTestId('bell-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('bell-off-icon')).not.toBeInTheDocument()
  })

  it('shows the inactive bell only when the entity notification exists and is disabled', () => {
    notificationsState = {
      data: [
        {
          notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
          isActive: false,
          entityCui: '12345678',
        },
      ],
      globalPreference: null,
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByTestId('bell-off-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('bell-icon')).not.toBeInTheDocument()
  })

  it('shows the inactive bell when the general campaign preference is disabled', () => {
    notificationsState = {
      data: [
        {
          notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
          isActive: true,
          entityCui: '12345678',
        },
      ],
      globalPreference: { isActive: false },
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByTestId('bell-off-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('bell-icon')).not.toBeInTheDocument()
  })

  it('shows the My city hall shortcut when an entity is available', () => {
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByText('My city hall')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /My city hall/i }),
    ).toHaveAttribute('href', '/primarie/12345678')
    expect(
      screen.getByRole('link', { name: /My city hall/i }),
    ).toHaveAttribute('preload', 'intent')
  })

  it('shows the send debate request link with correct path', () => {
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    const link = screen.getByRole('link', { name: /Send debate request/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/primarie/12345678/buget/provocari/civic-campaign/civic-monitor-and-request/04-debate-request'),
    )
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('section=trimite-cererea'),
    )
  })

  it('shows a locked info row instead of the debate request link when requests are closed', () => {
    debateRequestAvailabilityState = createDebateRequestAvailabilityState('closed_debate_took_place')

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.queryByRole('link', { name: /Send debate request/i })).not.toBeInTheDocument()
    expect(screen.getByText('Debate request unavailable')).toBeInTheDocument()
    expect(screen.getByText('The local budget debate has already taken place.')).toBeInTheDocument()
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
  })

  it('shows a locked checking row while request availability is loading', () => {
    debateRequestAvailabilityState = {
      state: 'loading',
      isSubmittable: false,
      availability: null,
      error: null,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.queryByRole('link', { name: /Send debate request/i })).not.toBeInTheDocument()
    expect(screen.getByText('Debate request unavailable')).toBeInTheDocument()
    expect(screen.getByText('Checking request availability.')).toBeInTheDocument()
  })

  it('shows the guides & templates link pointing to the resources page', () => {
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    const link = screen.getByRole('link', { name: /Guides & templates/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/primarie/12345678/buget/resurse')
  })

  it('shows the forum discussion external link', () => {
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    const link = screen.getByRole('link', { name: /Forum discussion/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://forum.transparenta.eu/c/cu-ochii-pe-bugetele-locale/7')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('preserves locale and current return target for the notifications link', () => {
    mockLocation = {
      pathname: '/primarie/12345678/buget/provocari',
      searchStr: '?lang=en&view=section',
    }
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="en" entityCui="12345678" />)

    const link = screen.getByRole('link', { name: /Notification preferences/i })
    const url = new URL(link.getAttribute('href') ?? '', 'https://example.com')

    expect(url.pathname).toBe('/provocare/notificari')
    expect(url.searchParams.get('lang')).toBe('en')
    expect(url.searchParams.get('from')).toBe('/primarie/12345678/buget/provocari?lang=en&view=section')
  })

  it('renders nothing when no entity is available', () => {
    mockLocation = {
      pathname: '/primarie/12345678/buget/provocari',
      searchStr: '',
    }
    notificationsState = {
      data: [],
      globalPreference: null,
      isLoading: false,
    }

    const { container } = render(<QuickResourcesPreview locale="ro" />)

    expect(container.innerHTML).toBe('')
  })
})
