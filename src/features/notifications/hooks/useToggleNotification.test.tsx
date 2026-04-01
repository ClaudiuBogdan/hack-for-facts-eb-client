import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { useToggleNotification } from './useToggleNotification'

const createNotificationMock = vi.fn()
const getEntityNotificationsMock = vi.fn()
const getUserNotificationsMock = vi.fn()
const unsubscribeNotificationMock = vi.fn()
const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()

vi.mock('../api/notifications', () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
  getEntityNotifications: (...args: unknown[]) => getEntityNotificationsMock(...args),
  getUserNotifications: (...args: unknown[]) => getUserNotificationsMock(...args),
  unsubscribeNotification: (...args: unknown[]) => unsubscribeNotificationMock(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

function createNotificationRecord(overrides: Partial<{
  id: string
  entityCui: string | null
  notificationType: string
  isActive: boolean
}> = {}) {
  return {
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
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = createTestQueryClient()

  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useToggleNotification', () => {
  beforeEach(() => {
    createNotificationMock.mockReset()
    getEntityNotificationsMock.mockReset()
    getUserNotificationsMock.mockReset()
    unsubscribeNotificationMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('deactivates directly when notificationId is provided', async () => {
    unsubscribeNotificationMock.mockResolvedValue(createNotificationRecord())

    const { result } = renderHook(() => useToggleNotification(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        entityCui: '12345678',
        notificationType: 'newsletter_entity_monthly',
        isActive: false,
        notificationId: 'notif-direct',
      })
    })

    expect(unsubscribeNotificationMock).toHaveBeenCalledWith('notif-direct')
    expect(getEntityNotificationsMock).not.toHaveBeenCalled()
    expect(getUserNotificationsMock).not.toHaveBeenCalled()
  })

  it('falls back to loading notifications when notificationId is missing', async () => {
    getEntityNotificationsMock.mockResolvedValue([
      createNotificationRecord({ id: 'notif-from-list' }),
    ])
    unsubscribeNotificationMock.mockResolvedValue(createNotificationRecord())

    const { result } = renderHook(() => useToggleNotification(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.mutateAsync({
        entityCui: '12345678',
        notificationType: 'newsletter_entity_monthly',
        isActive: false,
      })
    })

    expect(getEntityNotificationsMock).toHaveBeenCalledWith('12345678')
    expect(unsubscribeNotificationMock).toHaveBeenCalledWith('notif-from-list')
  })
})
