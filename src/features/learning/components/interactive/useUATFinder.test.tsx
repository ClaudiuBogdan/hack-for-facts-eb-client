import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, renderHook, waitFor } from '@/test/test-utils'

const searchEntitiesMock = vi.fn()

vi.mock('@/lib/api/entities', () => ({
  searchEntities: (...args: unknown[]) => searchEntitiesMock(...args),
}))

vi.mock('@/lib/api/entity-analytics', () => ({
  fetchEntityAnalytics: vi.fn(),
}))

vi.mock('@/lib/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}))

import { fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import { useUATFinder } from './useUATFinder'

function renderFinder() {
  const queryClient = createTestQueryClient()
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...renderHook(() => useUATFinder({ storageKey: 'test' }), { wrapper: Wrapper }), queryClient }
}

const SIBIU = { cui: '4270740', name: 'Municipiul Sibiu', uat: { county_name: 'Sibiu', name: 'Sibiu' } }

describe('useUATFinder search state', () => {
  beforeEach(() => {
    searchEntitiesMock.mockReset()
    window.localStorage.clear()
  })

  it('reports a read that succeeded with nothing as an empty result, not an error', async () => {
    searchEntitiesMock.mockResolvedValue([])
    const { result } = renderFinder()

    act(() => {
      result.current.setSearchTerm('Zzzz')
    })

    await waitFor(() => expect(searchEntitiesMock).toHaveBeenCalledWith('Zzzz', 15))
    await waitFor(() => expect(result.current.isSearching).toBe(false))
    expect(result.current.isSearchError).toBe(false)
    expect(result.current.searchResults).toEqual([])
  })

  it('reports a failed read as an error, so its empty list is not a "no results"', async () => {
    searchEntitiesMock.mockRejectedValue(new Error('Entity search returned no result list'))
    const { result } = renderFinder()

    act(() => {
      result.current.setSearchTerm('Sibiu')
    })

    await waitFor(() => expect(result.current.isSearchError).toBe(true))
    expect(result.current.searchResults).toEqual([])
  })

  it('drops the cached rows when a re-read of the same term fails, so nothing old stays selectable', async () => {
    searchEntitiesMock.mockResolvedValue([SIBIU])
    const { result, queryClient } = renderFinder()
    act(() => result.current.setSearchTerm('Sibiu'))
    await waitFor(() => expect(result.current.searchResults).toHaveLength(1))

    // The same term is read again and the read fails: the query keeps its old data.
    searchEntitiesMock.mockRejectedValue(new Error('Entity search returned no result list'))
    await act(async () => {
      await queryClient.refetchQueries()
    })

    await waitFor(() => expect(result.current.isSearchError).toBe(true))
    expect(result.current.searchResults).toEqual([])
    // Enter on the open list cannot pick the old row either.
    act(() => result.current.openDropdown())
    act(() => result.current.handleKeyDown({ key: 'Enter', preventDefault: () => undefined } as React.KeyboardEvent))
    expect(fetchEntityAnalytics).not.toHaveBeenCalled()
  })

  it('maps a successful read onto UAT results', async () => {
    searchEntitiesMock.mockResolvedValue([SIBIU])
    const { result } = renderFinder()

    act(() => {
      result.current.setSearchTerm('Sibiu')
    })

    await waitFor(() => expect(result.current.searchResults).toHaveLength(1))
    expect(result.current.searchResults[0]).toMatchObject({
      cui: '4270740',
      name: 'Municipiul Sibiu',
      countyName: 'Sibiu',
    })
    expect(result.current.isSearchError).toBe(false)
  })
})
