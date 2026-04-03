import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { EntityNotificationBell } from './EntityNotificationBell'
import { CAMPAIGN_NOTIFICATIONS_PATH } from '@/features/campaigns/buget/constants'
import { FUNKY_NOTIFICATION_ENTITY_UPDATES } from '../campaign-notification-keys'

let mockLocation = {
  pathname: '/primarie/12345678/buget/provocari',
  searchStr: '?lang=en&view=section',
}
let authState = {
  isLoaded: true,
  isSignedIn: true,
}

const notificationQuickMenuMock = vi.fn((props?: unknown) => {
  void props
  return <div data-testid="notification-quick-menu" />
})

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockLocation,
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
    mockLocation = {
      pathname: '/primarie/12345678/buget/provocari',
      searchStr: '?lang=en&view=section',
    }
    authState = {
      isLoaded: true,
      isSignedIn: true,
    }
    notificationQuickMenuMock.mockClear()
  })

  it('passes campaign notification navigation as path plus search state', () => {
    render(
      <EntityNotificationBell
        cui="12345678"
        entityName="Primaria Test"
        notificationTypes={[FUNKY_NOTIFICATION_ENTITY_UPDATES]}
      />,
    )

    expect(notificationQuickMenuMock).toHaveBeenCalledWith(
      expect.objectContaining({
        managePath: CAMPAIGN_NOTIFICATIONS_PATH,
        manageSearch: {
          from: '/primarie/12345678/buget/provocari?lang=en&view=section',
          lang: 'en',
        },
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
        manageSearch: undefined,
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
    expect(container.querySelector('.mt-64')).toBeNull()
  })
})
