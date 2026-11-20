import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalRenderData } from '../lib/tldf/schemas'

vi.mock('../api/legal-render-api', () => ({
  fetchLegalRender: vi.fn(async (documentId: string) => ({ documentId }) as unknown as LegalRenderData),
}))

import { fetchLegalRender } from '../api/legal-render-api'
import { isLegalV2DocumentId, useLegalRender } from './use-legal-render'

/**
 * Reopening a text must not reuse a legal_v2 render the server may have
 * withdrawn since (server confirm review #5): a v2 read revalidates on every
 * mount; a legacy generation, immutable, stays fresh for 30 minutes.
 */
describe('useLegalRender freshness per source', () => {
  // One client across mounts: the cache survives a close and a reopen.
  let client: QueryClient
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    vi.mocked(fetchLegalRender).mockClear()
  })

  const openAndClose = async (documentId: string, options?: { legalV2?: boolean }) => {
    const { result, unmount } = renderHook(() => useLegalRender(documentId, options), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    unmount()
  }

  it('refetches a legal_v2 form on reopen', async () => {
    await openAndClose('f900012')
    await openAndClose('f900012')
    expect(vi.mocked(fetchLegalRender)).toHaveBeenCalledTimes(2)
  })

  it("refetches on reopen whenever the act's source is legal_v2, whatever the id", async () => {
    await openAndClose('900012', { legalV2: true })
    await openAndClose('900012', { legalV2: true })
    expect(vi.mocked(fetchLegalRender)).toHaveBeenCalledTimes(2)
  })

  it('serves a legacy generation from the cache on reopen', async () => {
    await openAndClose('171282')
    await openAndClose('171282')
    expect(vi.mocked(fetchLegalRender)).toHaveBeenCalledTimes(1)
  })

  it('tells a legal_v2 form id from a legacy page id', () => {
    expect(isLegalV2DocumentId('f900012')).toBe(true)
    expect(isLegalV2DocumentId('171282')).toBe(false)
    expect(isLegalV2DocumentId('f')).toBe(false)
  })
})
