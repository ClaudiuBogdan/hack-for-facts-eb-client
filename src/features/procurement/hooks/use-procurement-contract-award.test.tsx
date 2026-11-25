import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { mapBuyerContractAwards } from '../lib/contract-award-model'
import { rawAwards } from '../lib/contract-award.fixture'

const read = vi.hoisted(() => vi.fn())
vi.mock('../api/procurement-contract-award-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/procurement-contract-award-api')>()),
  fetchBuyerContractAwards: (...args: unknown[]) => read(...args),
}))

const { CaRecordsOffError } = await import('../api/procurement-contract-award-api')
const { useBuyerContractAwards } = await import('./use-procurement-contract-award')

const REQUEST = { cui: '4364446', from: '2025-01-01', to: '2025-12-31', sort: 'awardDayDesc', page: 1 } as const

/** A buyer's awards keep the rows shown across another order or page, never rows a failed read hid. */
describe('useBuyerContractAwards', () => {
  it('shows no placeholder from a read that failed after it had answered', async () => {
    const client = createTestQueryClient()
    const wrapper = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    read.mockResolvedValueOnce(mapBuyerContractAwards(rawAwards()))
    const { result, rerender } = renderHook(({ request }) => useBuyerContractAwards(request), { wrapper, initialProps: { request: REQUEST as typeof REQUEST | { readonly sort: 'amountDesc' } & Omit<typeof REQUEST, 'sort'> } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    read.mockRejectedValueOnce(new CaRecordsOffError())
    await act(async () => {
      await result.current.refetch()
    })
    await waitFor(() => expect(result.current.error).toBeInstanceOf(CaRecordsOffError))
    read.mockImplementation(() => new Promise(() => undefined))
    rerender({ request: { ...REQUEST, sort: 'amountDesc' } })
    expect(result.current.isPlaceholderData).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('keeps a standing read’s rows while another order of the same buyer and period is on its way', async () => {
    const client = createTestQueryClient()
    const wrapper = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    read.mockReset()
    read.mockResolvedValueOnce(mapBuyerContractAwards(rawAwards()))
    const { result, rerender } = renderHook(({ request }) => useBuyerContractAwards(request), { wrapper, initialProps: { request: REQUEST as typeof REQUEST | { readonly sort: 'amountDesc' } & Omit<typeof REQUEST, 'sort'> } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    read.mockImplementation(() => new Promise(() => undefined))
    rerender({ request: { ...REQUEST, sort: 'amountDesc' } })
    expect(result.current.isPlaceholderData).toBe(true)
  })
})
