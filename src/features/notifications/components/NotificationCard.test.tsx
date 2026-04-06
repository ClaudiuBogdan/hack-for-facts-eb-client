import type { ReactNode } from 'react'
import { render } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { NotificationCard } from './NotificationCard'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: {
    readonly children: ReactNode
    readonly [key: string]: unknown
  }) => <a {...props}>{children}</a>,
}))

vi.mock('../hooks/useToggleNotification', () => ({
  useToggleNotification: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}))

describe('NotificationCard', () => {
  it('does not crash when a notification type is not configured', () => {
    const { container } = render(
      <NotificationCard
        notifications={[
          {
            id: 'legacy-1',
            userId: 'user-1',
            entityCui: '12345678',
            notificationType: 'legacy_notification_type' as never,
            campaignKey: null,
            isActive: true,
            config: null,
            hash: 'hash-legacy',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ]}
        onRemove={vi.fn()}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
