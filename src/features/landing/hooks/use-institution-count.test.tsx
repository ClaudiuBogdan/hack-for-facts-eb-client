import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { DEFAULT_SELECTED_YEAR } from '@/schemas/charts'

const fetchEntityAnalytics = vi.fn()
vi.mock('@/lib/api/entity-analytics', () => ({
  fetchEntityAnalytics: (...args: readonly unknown[]) => fetchEntityAnalytics(...args),
  entityRankingFilter: (filter: unknown) => ({ ...(filter as object), ranked: true }),
}))

const page = (totalCount: number) => ({
  nodes: [],
  pageInfo: { totalCount, hasNextPage: false, hasPreviousPage: false },
})

function wrapper({ children }: { readonly children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useInstitutionCount', () => {
  beforeEach(() => {
    fetchEntityAnalytics.mockReset()
  })

  it('asks for one row through the ranking filter and reads the total', async () => {
    fetchEntityAnalytics.mockResolvedValue(page(3295))
    const { useInstitutionCount } = await import('./use-institution-count')
    const { result } = renderHook(() => useInstitutionCount(), { wrapper })

    expect(result.current.count).toBeUndefined()
    await waitFor(() => expect(result.current.count).toBe(3295))
    expect(result.current.year).toBe(DEFAULT_SELECTED_YEAR)

    const [call] = fetchEntityAnalytics.mock.calls[0] as [{ limit: number; filter: { ranked: boolean } }]
    expect(call.limit).toBe(1)
    expect(call.filter.ranked).toBe(true)
  })

  it('reports nothing for an empty year rather than a zero', async () => {
    fetchEntityAnalytics.mockResolvedValue(page(0))
    const { useInstitutionCount } = await import('./use-institution-count')
    const { result } = renderHook(() => useInstitutionCount(), { wrapper })
    await waitFor(() => expect(fetchEntityAnalytics).toHaveBeenCalled())
    await waitFor(() => expect(result.current.isError).toBe(false))
    expect(result.current.count).toBeUndefined()
  })

  it('stays silent on error', async () => {
    fetchEntityAnalytics.mockRejectedValue(new Error('down'))
    const { useInstitutionCount } = await import('./use-institution-count')
    const { result } = renderHook(() => useInstitutionCount(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.count).toBeUndefined()
  })
})
