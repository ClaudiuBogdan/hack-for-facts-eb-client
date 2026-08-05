import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDataLabelBuilder } from './useFilterLabels'

const STORAGE_KEY = 'entity-labels'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('useDataLabelBuilder', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  /**
   * `initialData` must be a thunk. Passed as a value, the `localStorage` read
   * runs during render even when the query cache is already populated — which
   * is exactly the SSR path: the server dehydrates `{}` into this query key,
   * the client hydrates it, and then a render-time storage read would still
   * hand React a different label map than the server rendered.
   */
  it('does not read localStorage during render when the cache is already seeded', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ '42': 'Primaria Cluj-Napoca' }),
    )
    const queryClient = makeQueryClient()
    // Stands in for the SSR-dehydrated cache entry.
    queryClient.setQueryData([STORAGE_KEY], {})

    const getItem = vi.spyOn(window.localStorage, 'getItem')
    const noIds: string[] = []

    renderHook(() => useDataLabelBuilder(STORAGE_KEY, async () => [], noIds), {
      wrapper: makeWrapper(queryClient),
    })

    expect(getItem).not.toHaveBeenCalled()
  })

  it('still seeds the label map from localStorage when the cache is empty', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ '7': 'Consiliul Judetean Iasi' }),
    )
    const noIds: string[] = []

    const { result } = renderHook(
      () => useDataLabelBuilder(STORAGE_KEY, async () => [], noIds),
      { wrapper: makeWrapper(makeQueryClient()) },
    )

    expect(result.current.map('7')).toBe('Consiliul Judetean Iasi')
    expect(result.current.map('999')).toBe('id::999')
  })
})
