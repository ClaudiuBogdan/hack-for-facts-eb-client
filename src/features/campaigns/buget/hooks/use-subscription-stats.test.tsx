import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { useSubscriptionStats } from './use-subscription-stats'

const getSubscriptionStatsMock = vi.fn()

vi.mock('../api/subscription-stats', () => ({
  getSubscriptionStats: (...args: unknown[]) => getSubscriptionStatsMock(...args),
}))

function createWrapper() {
  const queryClient = createTestQueryClient()

  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSubscriptionStats', () => {
  beforeEach(() => {
    getSubscriptionStatsMock.mockReset()
  })

  it('returns normalized subscription stats data from the public API', async () => {
    getSubscriptionStatsMock.mockResolvedValue({
      total: 42,
      perUat: [
        { sirutaCode: '179132', uatName: 'Cluj-Napoca', count: 30 },
        { sirutaCode: '55274', uatName: 'Florești', count: 12 },
      ],
    })

    const { result } = renderHook(() => useSubscriptionStats('funky'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.total).toBe(42)
    expect(result.current.perUat).toEqual([
      { sirutaCode: '179132', uatName: 'Cluj-Napoca', count: 30 },
      { sirutaCode: '55274', uatName: 'Florești', count: 12 },
    ])
    expect(getSubscriptionStatsMock).toHaveBeenCalledWith('funky')
  })
})
