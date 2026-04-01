import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CampaignNotificationPreferencesPage } from './CampaignNotificationPreferencesPage'

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
    readonly notificationType: 'campaign_public_debate_entity_updates'
    readonly campaignKey: 'public_debate'
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
    readonly notificationType: 'campaign_public_debate_global'
    readonly campaignKey: 'public_debate'
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
      notificationType: 'campaign_public_debate_entity_updates',
      campaignKey: 'public_debate',
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
    notificationType: 'campaign_public_debate_global',
    campaignKey: 'public_debate',
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
    campaignNotificationsState = {
      data: [
        {
          id: 'notif-1',
          userId: 'user-1',
          entityCui: '12345678',
          notificationType: 'campaign_public_debate_entity_updates',
          campaignKey: 'public_debate',
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
        notificationType: 'campaign_public_debate_global',
        campaignKey: 'public_debate',
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
})
