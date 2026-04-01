import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationQuickMenu } from './NotificationQuickMenu'

const createNotificationMock = vi.fn()
const updateNotificationMock = vi.fn()
const mutateMock = vi.fn()
const toastErrorMock = vi.fn()

let allNotificationsData: unknown[] | undefined = []
let isPending = false
const refetchAllNotificationsMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: {
    readonly children: ReactNode
    readonly [key: string]: unknown
  }) => <a {...props}>{children}</a>,
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

vi.mock('../api/notifications', () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
  updateNotification: (...args: unknown[]) => updateNotificationMock(...args),
}))

vi.mock('../hooks/useToggleNotification', () => ({
  useToggleNotification: () => ({
    isPending,
    mutate: (...args: unknown[]) => mutateMock(...args),
  }),
}))

vi.mock('../hooks/useAllNotifications', () => ({
  useAllNotifications: () => ({
    data: allNotificationsData,
    refetch: refetchAllNotificationsMock,
  }),
}))

describe('NotificationQuickMenu', () => {
  beforeEach(() => {
    createNotificationMock.mockReset()
    updateNotificationMock.mockReset()
    mutateMock.mockReset()
    toastErrorMock.mockReset()
    refetchAllNotificationsMock.mockReset()
    allNotificationsData = []
    isPending = false
    refetchAllNotificationsMock.mockResolvedValue({ data: allNotificationsData })
  })

  it('shows a toast and aborts when enabling campaign notifications preflight fails', async () => {
    createNotificationMock.mockRejectedValueOnce(new Error('Network error'))

    render(
      <NotificationQuickMenu
        cui="12345678"
        entityName="Primaria Test"
        notificationTypes={['campaign_public_debate_entity_updates']}
        notifications={[]}
      />,
    )

    fireEvent.click(screen.getByText('Public Debate Updates'))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Failed to update notification')
    })

    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('passes the existing notification id when toggling an active notification off', async () => {
    render(
      <NotificationQuickMenu
        cui="12345678"
        entityName="Primaria Test"
        notificationTypes={['newsletter_entity_monthly']}
        notifications={[
          {
            id: 'notif-1',
            userId: 'user-1',
            entityCui: '12345678',
            notificationType: 'newsletter_entity_monthly',
            campaignKey: null,
            isActive: true,
            config: null,
            hash: 'hash',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('switch'))

    expect(mutateMock).toHaveBeenCalledWith({
      entityCui: '12345678',
      notificationType: 'newsletter_entity_monthly',
      isActive: false,
      notificationId: 'notif-1',
    })
  })

  it('refetches global preferences before creating the campaign master toggle', async () => {
    allNotificationsData = undefined
    refetchAllNotificationsMock.mockResolvedValueOnce({
      data: [
        {
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
      ],
    })

    render(
      <NotificationQuickMenu
        cui="12345678"
        entityName="Primaria Test"
        notificationTypes={['campaign_public_debate_entity_updates']}
        notifications={[]}
      />,
    )

    fireEvent.click(screen.getByText('Public Debate Updates'))

    await waitFor(() => {
      expect(refetchAllNotificationsMock).toHaveBeenCalledTimes(1)
      expect(createNotificationMock).not.toHaveBeenCalled()
      expect(mutateMock).toHaveBeenCalledWith({
        entityCui: '12345678',
        notificationType: 'campaign_public_debate_entity_updates',
        isActive: true,
        notificationId: undefined,
      })
    })
  })
})
