import type { ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/lib/queryClient'
import { createTestQueryClient } from '@/test/test-utils'
import type { CompanyRegistryCapabilities } from '@/schemas/private-company-registry'
import { MOCK_REGISTRY_CAPABILITIES } from '../mocks/fixtures/registry'
import { COMPANY_REGISTRY_QUERY_KEY, boundScopeKey, useCompanyRegistryScopeState } from './use-company-registry-scope'

/**
 * The page's pin: taken only from the page's own successful registry read (a
 * cached capabilities answer authorizes nothing, and neither does a failed
 * read), dropped the moment a read reports a refusal until a read answers,
 * held while the registry moves (the move is reported, the facts are
 * unbound), and switched only when the reader asks.
 */

const caps = (scopeKey: string, state: CompanyRegistryCapabilities['registry']['state'] = 'published'): CompanyRegistryCapabilities => ({
  ...MOCK_REGISTRY_CAPABILITIES,
  registry: { ...MOCK_REGISTRY_CAPABILITIES.registry, mode: 'live', state, editionId: state === 'published' ? scopeKey : null, scopeKey },
})

const registry = vi.hoisted(() => ({ next: null as unknown, fail: false }))

vi.mock('../api/company-registry-api', () => ({
  fetchCompanyRegistry: vi.fn(async () => {
    if (registry.fail) throw new Error('registry read failed')
    return registry.next
  }),
}))

let client: QueryClient
const wrapper = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

describe('useCompanyRegistryScopeState', () => {
  beforeEach(() => {
    client = createTestQueryClient()
    registry.next = caps('S1')
    registry.fail = false
  })

  it('never pins a cached capabilities answer: it waits for a read made after mount', async () => {
    client.setQueryData(COMPANY_REGISTRY_QUERY_KEY, caps('S0'))
    registry.next = caps('S1')
    const { result } = renderHook(() => useCompanyRegistryScopeState(), { wrapper })
    expect(result.current.status).toBe('pending')
    expect(boundScopeKey(result.current)).toBeNull()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(boundScopeKey(result.current)).toBe('S1')
  })

  it('reports a moved registry, unbinds the page, and switches only on accept', async () => {
    const { result } = renderHook(() => useCompanyRegistryScopeState(), { wrapper })
    await waitFor(() => expect(boundScopeKey(result.current)).toBe('S1'))

    registry.next = caps('S2')
    act(() => {
      if (result.current.status === 'ready') result.current.reportMoved()
    })
    await waitFor(() => expect(result.current.status === 'ready' && result.current.moved?.registry.scopeKey).toBe('S2'))
    // The pin holds and nothing is bound until the reader asks.
    expect(result.current.status === 'ready' && result.current.pinned.registry.scopeKey).toBe('S1')
    expect(boundScopeKey(result.current)).toBeNull()

    act(() => {
      if (result.current.status === 'ready') result.current.accept()
    })
    expect(boundScopeKey(result.current)).toBe('S2')
  })

  it('treats a withdrawal like any move: the old facts unbind, and a later recovery does not rebind them by itself', async () => {
    const { result } = renderHook(() => useCompanyRegistryScopeState(), { wrapper })
    await waitFor(() => expect(boundScopeKey(result.current)).toBe('S1'))
    registry.next = caps('W1', 'withdrawn')
    await act(async () => {
      await client.invalidateQueries({ queryKey: COMPANY_REGISTRY_QUERY_KEY })
    })
    await waitFor(() => expect(result.current.status === 'ready' && result.current.moved?.registry.scopeKey).toBe('W1'))
    expect(boundScopeKey(result.current)).toBeNull()
    registry.next = caps('S3')
    await act(async () => {
      await client.invalidateQueries({ queryKey: COMPANY_REGISTRY_QUERY_KEY })
    })
    await waitFor(() => expect(result.current.status === 'ready' && result.current.moved?.registry.scopeKey).toBe('S3'))
    expect(result.current.status === 'ready' && result.current.pinned.registry.scopeKey).toBe('S1')
    expect(boundScopeKey(result.current)).toBeNull()
  })

  it('pins nothing when its own first read fails, whatever the cache holds: a failed read is no fresh answer (C20-R1)', async () => {
    // The app's own client, as the page has it: an earlier page left S0 in the cache, and the read fails.
    client = createQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    client.setQueryData(COMPANY_REGISTRY_QUERY_KEY, caps('S0'))
    registry.fail = true
    const bound: (string | null)[] = []
    const { result } = renderHook(
      () => {
        const scope = useCompanyRegistryScopeState()
        bound.push(boundScopeKey(scope))
        return scope
      },
      { wrapper },
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    await act(async () => {})
    // Not for one render: nothing bound, no S0 dependent read could start.
    expect(bound.every((key) => key === null)).toBe(true)
  })

  it('unbinds the page the moment a read reports a refusal — while the re-read is pending and after it fails — until a read answers (C20-R1)', async () => {
    const { result } = renderHook(() => useCompanyRegistryScopeState(), { wrapper })
    await waitFor(() => expect(boundScopeKey(result.current)).toBe('S1'))

    let failReread: (error: Error) => void = () => undefined
    registry.next = new Promise((_resolve, reject) => {
      failReread = reject
    })
    act(() => {
      if (result.current.status === 'ready') result.current.reportMoved()
    })
    // At once, before any answer: nothing bound, and no stand-in for a first read.
    expect(result.current).toMatchObject({ status: 'pending', firstRead: false })
    expect(boundScopeKey(result.current)).toBeNull()

    await act(async () => failReread(new Error('registry read failed')))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(boundScopeKey(result.current)).toBeNull()

    // A read that answers the pinned scope binds the page again; another scope would wait for the reader.
    registry.next = caps('S1')
    act(() => {
      if (result.current.status === 'error') result.current.retry()
    })
    await waitFor(() => expect(boundScopeKey(result.current)).toBe('S1'))
  })

  it('says a failed registry read as an error with a retry, binding nothing', async () => {
    registry.fail = true
    const { result } = renderHook(() => useCompanyRegistryScopeState(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(boundScopeKey(result.current)).toBeNull()
    registry.fail = false
    act(() => {
      if (result.current.status === 'error') result.current.retry()
    })
    await waitFor(() => expect(boundScopeKey(result.current)).toBe('S1'))
  })
})
