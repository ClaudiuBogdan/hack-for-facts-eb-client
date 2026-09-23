import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatisticsDatasetTier0 } from '@/schemas/statistics'
import { detailTier0 } from '../test/detail-fixtures'
import { fetchDatasetTier0 } from '../api/dataset-detail-api'
import { useDatasetTier0 } from './use-dataset-detail'

vi.mock('../api/dataset-detail-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/dataset-detail-api')>()),
  fetchDatasetTier0: vi.fn(),
}))

const fetchTier0 = vi.mocked(fetchDatasetTier0)

function tier0(code: string): StatisticsDatasetTier0 {
  const base = detailTier0()
  return { ...base, dataset: base.dataset ? { ...base.dataset, code } : null }
}

describe('useDatasetTier0', () => {
  let client: QueryClient
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    fetchTier0.mockReset()
    fetchTier0.mockImplementation(({ code }) => new Promise((resolve) => setTimeout(() => resolve(tier0(code)), 5)))
  })

  it('keeps the matrix as a placeholder while the same matrix re-reads for another entity', async () => {
    const { result, rerender } = renderHook((props: Parameters<typeof useDatasetTier0>[0]) => useDatasetTier0(props), {
      wrapper,
      initialProps: { code: 'POP107D', entity: { territoryLevel: 'NATIONAL' } },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The first pin: the same matrix, no entity — a new key, the same dataset.
    rerender({ code: 'POP107D', entity: null })
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.dataset?.code).toBe('POP107D')
  })

  it('shows nothing of the previous matrix when the address moves to another one', async () => {
    const { result, rerender } = renderHook((props: Parameters<typeof useDatasetTier0>[0]) => useDatasetTier0(props), {
      wrapper,
      initialProps: { code: 'POP107D', entity: { territoryLevel: 'NATIONAL' } },
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // A related set opened from the accordion: another page, not a placeholder
    // whose header, definition and title would name the matrix just left.
    rerender({ code: 'POP108C', entity: { territoryLevel: 'NATIONAL' } })
    expect(result.current.isPlaceholderData).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.data?.dataset?.code).toBe('POP108C'))
  })
})
