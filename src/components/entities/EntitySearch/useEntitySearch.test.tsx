import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { useEntitySearch } from './useEntitySearch'

const navigateMock = vi.fn()
const searchEntitiesMock = vi.fn()
let currentSearchState: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useSearch: () => currentSearchState,
}))

vi.mock('@/lib/api/entities', () => ({
  searchEntities: (...args: unknown[]) => searchEntitiesMock(...args),
}))

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    EVENTS: {
      EntitySearchPerformed: 'entity_search_performed',
      EntitySearchSelected: 'entity_search_selected',
    },
    capture: vi.fn(),
  },
}))

vi.mock('@/lib/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}))

function createWrapper() {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return { Wrapper, queryClient }
}

describe('useEntitySearch', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    searchEntitiesMock.mockReset()
    currentSearchState = {}
    searchEntitiesMock.mockResolvedValue([
      { cui: '4305857', name: 'Cluj-Napoca' },
    ])
  })

  it('reuses cached results for the same normalized search term', async () => {
    const { Wrapper } = createWrapper()
    const firstHook = renderHook(() => useEntitySearch(), { wrapper: Wrapper })

    act(() => {
      firstHook.result.current.setSearchTerm('  Cluj  ')
    })

    await waitFor(() => {
      expect(firstHook.result.current.results).toEqual([
        { cui: '4305857', name: 'Cluj-Napoca' },
      ])
    })

    expect(searchEntitiesMock).toHaveBeenCalledTimes(1)
    expect(searchEntitiesMock).toHaveBeenLastCalledWith('Cluj', 8, undefined)

    firstHook.unmount()

    const secondHook = renderHook(() => useEntitySearch(), { wrapper: Wrapper })

    act(() => {
      secondHook.result.current.setSearchTerm('Cluj')
    })

    await waitFor(() => {
      expect(secondHook.result.current.results).toEqual([
        { cui: '4305857', name: 'Cluj-Napoca' },
      ])
    })

    expect(searchEntitiesMock).toHaveBeenCalledTimes(1)
  })

  it('does not create separate cache entries for whitespace-only query changes', async () => {
    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useEntitySearch(), { wrapper: Wrapper })

    act(() => {
      result.current.setSearchTerm('  Cluj  ')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })

    act(() => {
      result.current.setSearchTerm('Cluj')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })

    const entitySearchQueries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['entitySearch'] })
      .filter((query) => query.queryKey[1] === 'Cluj')

    expect(entitySearchQueries).toHaveLength(1)
    expect(entitySearchQueries[0]?.queryKey).toEqual([
      'entitySearch',
      'Cluj',
      undefined,
      undefined,
    ])
    expect(searchEntitiesMock).toHaveBeenCalledTimes(1)
  })

  it('routes preferred-entity searches to primarie for non-county UATs', async () => {
    searchEntitiesMock.mockResolvedValue([
      {
        cui: '4305857',
        name: 'Cluj-Napoca',
        entity_type: 'admin_municipality',
        is_uat: true,
      },
    ])

    const { Wrapper } = createWrapper()
    const { result } = renderHook(
      () => useEntitySearch({ selectionBehavior: 'navigate-to-preferred-entity' }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.setSearchTerm('Cluj')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })

    act(() => {
      result.current.handleSelection(0)
    })

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/primarie/4305857',
      search: {},
    })
  })

  it('preserves route search state when switching entities', async () => {
    currentSearchState = {
      view: 'map',
      lang: 'en',
      currency: 'EUR',
      inflation_adjusted: true,
    }
    searchEntitiesMock.mockResolvedValue([
      {
        cui: '4305857',
        name: 'Cluj-Napoca',
        entity_type: 'admin_municipality',
        is_uat: false,
      },
    ])

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useEntitySearch(), { wrapper: Wrapper })

    act(() => {
      result.current.setSearchTerm('Cluj')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })

    act(() => {
      result.current.handleSelection(0)
    })

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/entities/4305857',
      search: {
        view: 'map',
        lang: 'en',
        currency: 'EUR',
        inflation_adjusted: true,
      },
    })
  })
})
