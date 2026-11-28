import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'

const fetchProcurementHomeRecentDirect = vi.fn(async () => [])
vi.mock('../api/procurement-home-api', () => ({
  fetchProcurementHomeNational: vi.fn(),
  fetchProcurementHomeCategories: vi.fn(),
  fetchProcurementHomeRecentDirect: (...args: unknown[]) => fetchProcurementHomeRecentDirect(...(args as [])),
}))

const { useProcurementHomeRecent } = await import('./use-procurement-home')

const wrapper = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>

describe('useProcurementHomeRecent', () => {
  it('has no fetch for the contracts, or without a month: a refetch reads nothing (PROC-KB0Z)', async () => {
    for (const [grain, month] of [['contract', '2026-05'], ['direct', null]] as const) {
      fetchProcurementHomeRecentDirect.mockClear()
      const { result, unmount } = renderHook(() => useProcurementHomeRecent(grain, month), { wrapper })
      await act(async () => {
        await result.current.refetch().catch(() => undefined)
      })
      expect(fetchProcurementHomeRecentDirect).not.toHaveBeenCalled()
      unmount()
    }
  })

  it('reads the direct purchases of the month', async () => {
    fetchProcurementHomeRecentDirect.mockClear()
    const { result } = renderHook(() => useProcurementHomeRecent('direct', '2026-05'), { wrapper })
    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchProcurementHomeRecentDirect).toHaveBeenCalledWith('2026-05', 8, expect.anything())
  })
})
