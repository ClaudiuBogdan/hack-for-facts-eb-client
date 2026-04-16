import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CAMPAIGN_TERMS_PATH } from '../constants'
import {
  FUNKY_CAMPAIGN_KEY,
  FUNKY_NOTIFICATION_ENTITY_UPDATES,
  FUNKY_NOTIFICATION_GLOBAL,
} from '@/features/notifications/campaign-notification-keys'
import { CampaignNotificationPreferencesPage } from './CampaignNotificationPreferencesPage'

const createNotificationMock = vi.fn()
const updateNotificationMock = vi.fn()

let authState = {
  isLoaded: true,
  isSignedIn: true,
}

let routeSearch: {
  readonly from?: string
  readonly lang?: 'ro' | 'en'
} = {}

const refetchMock = vi.fn()

let campaignNotificationsState: {
  readonly data?: Array<{
    readonly id: string
    readonly userId: string
    readonly entityCui: string | null
    readonly notificationType: typeof FUNKY_NOTIFICATION_ENTITY_UPDATES
    readonly campaignKey: typeof FUNKY_CAMPAIGN_KEY
    readonly isActive: boolean
    readonly config: null
    readonly hash: string
    readonly createdAt: string
    readonly updatedAt: string
  }>
  readonly isLoading: boolean
  readonly isError?: boolean
  readonly error?: Error | null
  readonly activeCount: number
  readonly totalCount: number
  readonly globalPreference: {
    readonly id: string
    readonly userId: string
    readonly entityCui: null
    readonly notificationType: typeof FUNKY_NOTIFICATION_GLOBAL
    readonly campaignKey: typeof FUNKY_CAMPAIGN_KEY
    readonly isActive: boolean
    readonly config: null
    readonly hash: string
    readonly createdAt: string
    readonly updatedAt: string
  } | null
  readonly refetch: typeof refetchMock
} = {
  data: [
    {
      id: 'notif-1',
      userId: 'user-1',
      entityCui: '12345678',
      notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
      campaignKey: FUNKY_CAMPAIGN_KEY,
      isActive: true,
      config: null,
      hash: 'hash',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  isLoading: false,
  isError: false,
  error: null,
  activeCount: 1,
  totalCount: 1,
  globalPreference: {
    id: 'global-1',
    userId: 'user-1',
    entityCui: null,
    notificationType: FUNKY_NOTIFICATION_GLOBAL,
    campaignKey: FUNKY_CAMPAIGN_KEY,
    isActive: true,
    config: null,
    hash: 'hash-global',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  refetch: refetchMock,
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to?: string
    readonly params?: Record<string, string>
    readonly search?: Record<string, string>
    readonly [key: string]: unknown
  }) => {
    const href = typeof to === 'string'
      ? Object.entries(params ?? {}).reduce(
          (currentValue, [key, value]) =>
            currentValue.replace(`$${key}`, encodeURIComponent(String(value))),
          to,
        )
      : ''
    const query = search ? new URLSearchParams(search).toString() : ''
    const nextHref = query ? `${href}?${query}` : href
    return <a href={nextHref} {...props}>{children}</a>
  },
  useSearch: () => routeSearch,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
  AuthSignInButton: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/notifications/hooks/useCampaignNotifications', () => ({
  useCampaignNotifications: () => campaignNotificationsState,
}))

vi.mock('@/features/notifications/hooks/useToggleNotification', () => ({
  useToggleNotification: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}))

vi.mock('@/features/notifications/api/notifications', () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
  updateNotification: (...args: unknown[]) => updateNotificationMock(...args),
}))

vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityLabel: () => ({
    map: () => 'Primaria Test',
  }),
}))

describe('CampaignNotificationPreferencesPage accessibility', () => {
  beforeEach(() => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
    }
    routeSearch = {}
    refetchMock.mockReset()
    createNotificationMock.mockReset()
    updateNotificationMock.mockReset()
    createNotificationMock.mockResolvedValue({
      id: 'global-created',
      userId: 'user-1',
      entityCui: null,
      notificationType: FUNKY_NOTIFICATION_GLOBAL,
      campaignKey: FUNKY_CAMPAIGN_KEY,
      isActive: true,
      config: null,
      hash: 'hash-created',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    updateNotificationMock.mockResolvedValue({
      id: 'global-1',
      userId: 'user-1',
      entityCui: null,
      notificationType: FUNKY_NOTIFICATION_GLOBAL,
      campaignKey: FUNKY_CAMPAIGN_KEY,
      isActive: false,
      config: null,
      hash: 'hash-global',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    campaignNotificationsState = {
      data: [
        {
          id: 'notif-1',
          userId: 'user-1',
          entityCui: '12345678',
          notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
          campaignKey: FUNKY_CAMPAIGN_KEY,
          isActive: true,
          config: null,
          hash: 'hash',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      activeCount: 1,
      totalCount: 1,
      globalPreference: {
        id: 'global-1',
        userId: 'user-1',
        entityCui: null,
        notificationType: FUNKY_NOTIFICATION_GLOBAL,
        campaignKey: FUNKY_CAMPAIGN_KEY,
        isActive: true,
        config: null,
        hash: 'hash-global',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      refetch: refetchMock,
    }
  })

  it('adds explicit accessible names to the campaign switches', () => {
    render(<CampaignNotificationPreferencesPage />)

    expect(
      screen.getByRole('switch', { name: 'Toggle campaign notifications' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: 'Toggle notifications for Primaria Test' }),
    ).toBeInTheDocument()
  })

  it('preserves lang=en when linking back to a subscribed entity', () => {
    routeSearch = { lang: 'en' }

    render(<CampaignNotificationPreferencesPage />)

    expect(
      screen.getByRole('link', { name: /Primaria Test/i }),
    ).toHaveAttribute('href', '/primarie/12345678/buget?lang=en')
  })

  it('shows the campaign terms link in the notification preferences page', () => {
    render(<CampaignNotificationPreferencesPage />)

    expect(
      screen.getByRole('link', { name: 'campaign terms and conditions' }),
    ).toHaveAttribute('href', CAMPAIGN_TERMS_PATH)
  })

  it('renders a retryable error state instead of the empty state on fetch failure', () => {
    routeSearch = { lang: 'en' }
    campaignNotificationsState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Request failed'),
      activeCount: 0,
      totalCount: 0,
      globalPreference: null,
      refetch: refetchMock,
    }

    render(<CampaignNotificationPreferencesPage />)

    expect(screen.getByText('Unable to load notifications')).toBeInTheDocument()
    expect(screen.queryByText('No entity subscriptions')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    expect(refetchMock).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('link', { name: 'Browse entities' }),
    ).toHaveAttribute('href', '/primarie?lang=en')
  })

  it('uses a single global update and refetch when disabling campaign notifications', async () => {
    campaignNotificationsState = {
      ...campaignNotificationsState,
      data: [
        {
          id: 'notif-1',
          userId: 'user-1',
          entityCui: '12345678',
          notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
          campaignKey: FUNKY_CAMPAIGN_KEY,
          isActive: true,
          config: null,
          hash: 'hash-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          entityCui: '87654321',
          notificationType: FUNKY_NOTIFICATION_ENTITY_UPDATES,
          campaignKey: FUNKY_CAMPAIGN_KEY,
          isActive: true,
          config: null,
          hash: 'hash-2',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activeCount: 2,
      totalCount: 2,
    }
    refetchMock.mockResolvedValue({ data: [] })

    render(<CampaignNotificationPreferencesPage />)

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle campaign notifications' }))

    await waitFor(() => {
      expect(updateNotificationMock).toHaveBeenCalledTimes(1)
      expect(updateNotificationMock).toHaveBeenCalledWith('global-1', { isActive: false })
      expect(createNotificationMock).not.toHaveBeenCalled()
      expect(refetchMock).toHaveBeenCalledTimes(1)
    })
  })
})
