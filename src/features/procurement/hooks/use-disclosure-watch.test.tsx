import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetVerifiedPublicationForTests, isSeedCurrent } from '../lib/disclosure-seed'

const release = vi.hoisted(() => ({ versions: [] as (string | Error)[], reads: 0 }))
vi.mock('../api/procurement-da-release-status', () => ({
  readDisclosureNow: () => {
    release.reads += 1
    const next = release.versions.shift() ?? 'same'
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  },
}))
const router = vi.hoisted(() => ({ matches: [] as { loaderData?: unknown }[], invalidate: vi.fn(() => Promise.resolve()) }))
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ state: { matches: router.matches }, invalidate: router.invalidate }) }))

const { useDisclosureWatch, watchIntervalOf, WATCH_INTERVAL_MS, WATCH_MAX_BACKOFF_MS } = await import('./use-disclosure-watch')

/** D6 in an open tab: a new publication drops every procurement answer of the old one — never back to a server seed. */

const wrapperOf = (client: QueryClient) =>
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } })

beforeEach(() => {
  release.versions = []
  release.reads = 0
  router.matches = []
  router.invalidate.mockClear()
  forgetVerifiedPublicationForTests()
})

describe('useDisclosureWatch', () => {
  it('reads nothing while the cache holds no procurement answer', async () => {
    const client = newClient()
    client.setQueryData(['budget', 'x'], 1)
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(release.reads).toBe(0)
  })

  it('a new publication removes every procurement and public-enterprise answer, and runs the loaders again; the first reading of the served publication removes nothing', async () => {
    const client = newClient()
    router.matches = [{ loaderData: { disclosure: 'on:t1:d6:p1' } }]
    client.setQueryData(['procurement', 'buyer', '4364446'], { supplier: 'FIRMA SRL' })
    client.setQueryData(['public-enterprise', 'x'], { supplier: 'FIRMA SRL' })
    client.setQueryData(['budget', 'x'], 1)
    release.versions = ['on:t1:d6:p1', 'on:t1:d6:p2']
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('on:t1:d6:p1'))
    expect(client.getQueryData(['procurement', 'buyer', '4364446'])).toEqual({ supplier: 'FIRMA SRL' })
    expect(router.invalidate).not.toHaveBeenCalled()
    await act(() => client.refetchQueries({ queryKey: ['da-disclosure'] }))
    await waitFor(() => expect(client.getQueryData(['procurement', 'buyer', '4364446'])).toBeUndefined())
    expect(client.getQueryData(['public-enterprise', 'x'])).toBeUndefined()
    expect(client.getQueryData(['budget', 'x'])).toBe(1)
    await waitFor(() => expect(router.invalidate).toHaveBeenCalledTimes(1))
    // The page's server seed, of the old publication, is never used again.
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1' })).toBe(false)
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p2' })).toBe(true)
  })

  it('a page served from another publication (a CDN copy) is dropped on the first reading', async () => {
    const client = newClient()
    router.matches = [{ loaderData: { disclosure: 'on:t1:d6:p1' } }]
    client.setQueryData(['procurement', 'direct-purchase', 'x'], { supplier: 'FIRMA SRL' })
    release.versions = ['on:t1:d6:p2']
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['procurement', 'direct-purchase', 'x'])).toBeUndefined())
    expect(router.invalidate).toHaveBeenCalled()
  })

  it('never brings an answer back to its server seed: a removed query is read afresh, and a failed read shows no old name', async () => {
    const client = newClient()
    const read = vi.fn(() => Promise.reject(new Error('down')))
    const seeded = { supplier: 'OLD NAME SRL' }
    const page = renderHook(() => useQuery({ queryKey: ['procurement', 'direct-purchase', 'y'], queryFn: read, initialData: isSeedCurrent({ disclosure: 'on:t1:d6:p1' }) ? seeded : undefined, staleTime: Infinity }), {
      wrapper: wrapperOf(client),
    })
    expect(page.result.current.data).toEqual(seeded)
    release.versions = ['on:t1:d6:p1', 'on:t1:d6:p2']
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('on:t1:d6:p1'))
    await act(() => client.refetchQueries({ queryKey: ['da-disclosure'] }))
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled())
    page.rerender()
    await waitFor(() => expect(page.result.current.data).toBeUndefined())
    expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data))).not.toContain('OLD NAME')
  })

  it('a failed read purges nothing', async () => {
    const client = newClient()
    client.setQueryData(['procurement', 'home'], 1)
    release.versions = ['on:t1:d6:p1', new Error('down')]
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('on:t1:d6:p1'))
    await act(() => client.refetchQueries({ queryKey: ['da-disclosure'] }))
    expect(client.getQueryData(['procurement', 'home'])).toBe(1)
  })
})

describe('watchIntervalOf', () => {
  it('reads once a minute, doubling per failure in a row, to a quarter of an hour', () => {
    expect(watchIntervalOf(0)).toBe(WATCH_INTERVAL_MS)
    expect(watchIntervalOf(2)).toBe(4 * WATCH_INTERVAL_MS)
    expect(watchIntervalOf(10)).toBe(WATCH_MAX_BACKOFF_MS)
  })
})
