import { render, screen } from '@/test/test-utils'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_NOTIFICATIONS_PATH,
  CAMPAIGN_TERMS_PATH,
} from '@/features/campaigns/buget/constants'
import {
  FUNKY_CAMPAIGN_KEY,
  FUNKY_NOTIFICATION_ENTITY_UPDATES,
  FUNKY_NOTIFICATION_GLOBAL,
} from '@/features/notifications/campaign-notification-keys'

const notificationListMock = vi.fn((props?: unknown) => {
  void props
  return <div>Notification list</div>
})

const refetchMock = vi.fn()

let authState = {
  isLoaded: true,
  isSignedIn: true,
}

let notificationsData: unknown[] = []

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
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

vi.mock('@/features/notifications/components/NotificationList', () => ({
  NotificationList: (props: unknown) => notificationListMock(props),
}))

vi.mock('@/components/entities/FloatingEntitySearch', () => ({
  FloatingEntitySearch: () => <div>Entity search</div>,
}))

vi.mock('@/features/notifications/hooks/useAllNotifications', () => ({
  useAllNotifications: () => ({
    data: notificationsData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchMock,
  }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/config/env', () => ({
  getSiteUrl: () => 'https://example.com',
}))

vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div>Loading spinner</div>,
}))

describe('Notifications settings route', () => {
  beforeEach(() => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
    }
    notificationsData = []
    notificationListMock.mockClear()
    refetchMock.mockReset()
  })

  it('includes entity campaign notifications while excluding the campaign-wide master preference', async () => {
    notificationsData = [
      {
        id: 'monthly-1',
        userId: 'user-1',
        entityCui: '12345678',
        notificationType: 'newsletter_entity_monthly',
        campaignKey: null,
        isActive: true,
        config: null,
        hash: 'hash-monthly',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'campaign-entity-1',
        userId: 'user-1',
        entityCui: '12345678',
        notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
        campaignKey: FUNKY_CAMPAIGN_KEY,
        isActive: true,
        config: null,
        hash: 'hash-campaign-entity',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'campaign-global-1',
        userId: 'user-1',
        entityCui: null,
        notificationType: FUNKY_NOTIFICATION_GLOBAL,
        campaignKey: FUNKY_CAMPAIGN_KEY,
        isActive: true,
        config: null,
        hash: 'hash-campaign-global',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const { Route } = await import('./notifications')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    const lastCall =
      notificationListMock.mock.calls[notificationListMock.mock.calls.length - 1]
    const props = lastCall?.[0] as
      | { notifications: Array<{ notificationType: string; id: string }> }
      | undefined

    expect(props?.notifications).toEqual([
      expect.objectContaining({ id: 'monthly-1' }),
      expect.objectContaining({
        id: 'campaign-entity-1',
        notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
      }),
    ])
    expect(
      screen.getByRole('link', { name: 'campaign terms and conditions' }),
    ).toHaveAttribute('href', CAMPAIGN_TERMS_PATH)
    expect(
      screen.getByRole('link', { name: 'Transparenta.eu Terms of Use' }),
    ).toHaveAttribute('href', '/terms')
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' }),
    ).toHaveAttribute('href', '/privacy')
    expect(
      screen.getByRole('link', { name: 'campaign notifications page' }),
    ).toHaveAttribute('href', CAMPAIGN_NOTIFICATIONS_PATH)
  })
})
