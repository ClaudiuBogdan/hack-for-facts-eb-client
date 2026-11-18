import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const release = vi.hoisted(() => ({ versions: [] as (string | Error)[], reads: 0 }))
vi.mock('../api/procurement-da-release-status', () => ({
  readDisclosureNow: () => {
    release.reads += 1
    const next = release.versions.shift() ?? 'same'
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  },
}))

const { useDisclosureWatch, watchIntervalOf, WATCH_INTERVAL_MS, WATCH_MAX_BACKOFF_MS } = await import('./use-disclosure-watch')

/** D6 in an open tab: a new publication drops every procurement answer kept under the old one. */

const wrapperOf = (client: QueryClient) =>
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

beforeEach(() => {
  release.versions = []
  release.reads = 0
})

describe('useDisclosureWatch', () => {
  it('reads nothing while the cache holds no procurement answer', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    client.setQueryData(['budget', 'x'], 1)
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(release.reads).toBe(0)
  })

  it('a new publication resets every procurement and public-enterprise answer; the first reading resets nothing', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    client.setQueryData(['procurement', 'buyer', '4364446'], { supplier: 'FIRMA SRL' })
    client.setQueryData(['public-enterprise', 'x'], { supplier: 'FIRMA SRL' })
    client.setQueryData(['budget', 'x'], 1)
    release.versions = ['on:t1:d6:p1', 'on:t1:d6:p2']
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('on:t1:d6:p1'))
    expect(client.getQueryData(['procurement', 'buyer', '4364446'])).toEqual({ supplier: 'FIRMA SRL' })
    await act(() => client.refetchQueries({ queryKey: ['da-disclosure'] }))
    await waitFor(() => expect(client.getQueryData(['procurement', 'buyer', '4364446'])).toBeUndefined())
    expect(client.getQueryData(['public-enterprise', 'x'])).toBeUndefined()
    expect(client.getQueryData(['budget', 'x'])).toBe(1)
  })

  it('a failed read purges nothing', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
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
