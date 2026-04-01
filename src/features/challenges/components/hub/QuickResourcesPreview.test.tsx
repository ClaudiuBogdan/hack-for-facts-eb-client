import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { QuickResourcesPreview } from './QuickResourcesPreview'

let mockLocation = {
  pathname: '/primarie/12345678/buget/provocari',
  searchStr: '',
}
let notificationsState: {
  readonly data: Array<{ readonly notificationType: string; readonly isActive: boolean }>
  readonly isLoading: boolean
} = {
  data: [],
  isLoading: false,
}

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockLocation,
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

vi.mock('lucide-react', () => {
  const icon = (testId: string) => (props: Record<string, unknown>) => (
    <svg data-testid={testId} {...props} />
  )

  return {
    ArrowRight: icon('arrow-right-icon'),
    Bell: icon('bell-icon'),
    BellOff: icon('bell-off-icon'),
    Building2: icon('building2-icon'),
    Send: icon('send-icon'),
    Library: icon('library-icon'),
  }
})

vi.mock('@/features/notifications/hooks/useEntityNotifications', () => ({
  useEntityNotifications: () => notificationsState,
}))

describe('QuickResourcesPreview', () => {
  it('shows the inactive bell while notifications are loading', () => {
    notificationsState = {
      data: [],
      isLoading: true,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByTestId('bell-off-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('bell-icon')).not.toBeInTheDocument()
  })

  it('shows the My city hall shortcut when an entity is available', () => {
    notificationsState = {
      data: [],
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

  it('shows the guides & templates link pointing to the resources page', () => {
    notificationsState = {
      data: [],
      isLoading: false,
    }

    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    const link = screen.getByRole('link', { name: /Guides & templates/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/primarie/12345678/buget/resurse')
  })

  it('preserves locale and current return target for the notifications link', () => {
    mockLocation = {
      pathname: '/primarie/12345678/buget/provocari',
      searchStr: '?lang=en&view=section',
    }
    notificationsState = {
      data: [],
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
      isLoading: false,
    }

    const { container } = render(<QuickResourcesPreview locale="ro" />)

    expect(container.innerHTML).toBe('')
  })
})
