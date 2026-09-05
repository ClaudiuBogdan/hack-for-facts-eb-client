import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDataLabelBuilder, useFunctionalClassificationLabel } from './useFilterLabels'

vi.mock('@/lib/api/labels', () => ({
  getFunctionalClassificationLabels: vi.fn(),
  getEconomicClassificationLabels: vi.fn(),
  getEntityLabels: vi.fn(),
  getUatLabels: vi.fn(),
  getBudgetSectorLabels: vi.fn(),
  getFundingSourceLabels: vi.fn(),
}))
import { getFunctionalClassificationLabels } from '@/lib/api/labels'

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


describe('native dimension label migration', () => {
  it('does not let legacy storage suppress a native catalog correction', async () => {
    window.localStorage.clear()
    window.localStorage.setItem('functional-classification-labels', JSON.stringify({ '01': 'Old label' }))
    vi.mocked(getFunctionalClassificationLabels).mockResolvedValue([{ id: '01', label: 'Corrected label' }])
    const ids = ['01']
    const { result } = renderHook(() => useFunctionalClassificationLabel(ids), {
      wrapper: makeWrapper(makeQueryClient()),
    })
    await waitFor(() => expect(result.current.map('01')).toBe('Corrected label'))
    expect(getFunctionalClassificationLabels).toHaveBeenCalledWith(ids)
    expect(JSON.parse(window.localStorage.getItem('native-functional-classification-labels') ?? '{}')).toEqual({ '01': 'Corrected label' })
    expect(JSON.parse(window.localStorage.getItem('functional-classification-labels') ?? '{}')).toEqual({ '01': 'Old label' })
  })
})
