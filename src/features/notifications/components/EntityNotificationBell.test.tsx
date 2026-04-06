import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { EntityNotificationBell } from './EntityNotificationBell'
import { CAMPAIGN_TERMS_PATH } from '@/features/campaigns/buget/constants'
import { FUNKY_NOTIFICATION_ENTITY_UPDATES } from '../campaign-notification-keys'
let authState = {
  isLoaded: true,
  isSignedIn: true,
}

const notificationQuickMenuMock = vi.fn((props?: unknown) => {
  void props
  return <div data-testid="notification-quick-menu" />
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to?: string
    readonly search?: Record<string, string>
    readonly [key: string]: unknown
  }) => {
    const href = typeof to === 'string' ? to : ''
    const query = search ? new URLSearchParams(search).toString() : ''
    const nextHref = query ? `${href}?${query}` : href
    return <a href={nextHref} {...props}>{children}</a>
  },
}))

vi.mock('@/components/ui/ResponsivePopover', () => ({
  ResponsivePopover: ({ content }: { readonly content: ReactNode }) => (
    <div>{content}</div>
  ),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('../hooks/useEntityNotifications', () => ({
  useEntityNotifications: () => ({
    data: [],
    isLoading: false,
  }),
}))

vi.mock('../hooks/useNotificationModal', () => ({
  useNotificationModal: () => ({
    isOpen: true,
    setOpen: vi.fn(),
  }),
}))

vi.mock('./NotificationQuickMenu', () => ({
  NotificationQuickMenu: (props: unknown) => notificationQuickMenuMock(props),
}))

describe('EntityNotificationBell', () => {
  beforeEach(() => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
    }
    notificationQuickMenuMock.mockClear()
  })

  it('expands campaign entity notifications to include the report subscriptions', () => {
    render(
      <EntityNotificationBell
        cui="12345678"
        entityName="Primaria Test"
        notificationTypes={[FUNKY_NOTIFICATION_ENTITY_UPDATES]}
      />,
    )

    expect(notificationQuickMenuMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationTypes: [
          FUNKY_NOTIFICATION_ENTITY_UPDATES,
          'newsletter_entity_monthly',
          'newsletter_entity_quarterly',
          'newsletter_entity_yearly',
        ],
        managePath: '/settings/notifications',
      }),
    )
  })

  it('keeps the general notification link unchanged outside the campaign flow', () => {
    render(
      <EntityNotificationBell
        cui="12345678"
        entityName="Primaria Test"
      />,
    )

    expect(notificationQuickMenuMock).toHaveBeenCalledWith(
      expect.objectContaining({
        managePath: '/settings/notifications',
        notificationTypes: [
          'newsletter_entity_monthly',
          'newsletter_entity_quarterly',
          'newsletter_entity_yearly',
        ],
      }),
    )
  })

  it('renders the sign-in state without the fixed mobile spacer class', () => {
    authState = {
      isLoaded: true,
      isSignedIn: false,
    }

    const { container } = render(
      <EntityNotificationBell
        cui="12345678"
        entityName="Primaria Test"
      />,
    )

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Transparenta.eu Terms of Use' }),
    ).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
    expect(container.querySelector('.mt-64')).toBeNull()
  })

  it('shows the campaign terms link in the sign-in state when campaign updates are available', () => {
    authState = {
      isLoaded: true,
      isSignedIn: false,
    }

    render(
      <EntityNotificationBell
        cui="12345678"
        entityName="Primaria Test"
        notificationTypes={[FUNKY_NOTIFICATION_ENTITY_UPDATES]}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'campaign terms and conditions' }),
    ).toHaveAttribute('href', CAMPAIGN_TERMS_PATH)
  })
})
