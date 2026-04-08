import { render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SubscriptionCounter } from './subscription-counter'

const getUserLocaleMock = vi.fn<() => 'ro' | 'en'>(() => 'ro')

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils')

  return {
    ...actual,
    getUserLocale: () => getUserLocaleMock(),
  }
})

describe('SubscriptionCounter', () => {
  beforeEach(() => {
    getUserLocaleMock.mockReset()
    getUserLocaleMock.mockReturnValue('ro')
  })

  it('shows a skeleton while loading', () => {
    render(
      <SubscriptionCounter
        count={0}
        label="campaign subscribers"
        isLoading={true}
      />,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the animated count and accessible label', async () => {
    getUserLocaleMock.mockReturnValue('en')

    render(
      <SubscriptionCounter
        count={1234}
        label="campaign subscribers"
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/campaign subscribers/i)).toBeInTheDocument()
    })

    expect(screen.getByText('campaign subscribers')).toBeInTheDocument()
    expect(screen.getByLabelText('1,234 campaign subscribers')).toBeInTheDocument()
  })
})
