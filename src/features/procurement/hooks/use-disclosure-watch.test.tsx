import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noteKey, resetNewestKeyForTests } from '@/lib/disclosure-key'
import { DA_QUERY_CACHE } from '../lib/disclosure-cache'
import { forgetVerifiedPublicationForTests, isDisclosureUnreadable, isSeedCurrent, setDisclosureUnreadable } from '../lib/disclosure-seed'

const release = vi.hoisted(() => ({ versions: [] as (string | Error)[], reads: 0, failing: false, onRead: null as (() => void) | null }))
vi.mock('../api/procurement-da-release-status', () => ({
  readDisclosureNow: () => {
    release.reads += 1
    if (release.failing) return Promise.reject(new Error('status down'))
    const next = release.versions.shift() ?? 'same'
    // The status read notes the key when its answer arrives, before it resolves (as `readDaRelease` does).
    const onRead = release.onRead
    release.onRead = null
    if (!onRead) return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        onRead?.()
        if (next instanceof Error) reject(next)
        else resolve(next)
      }, 5),
    )
  },
}))
const router = vi.hoisted(() => ({
  matches: [] as { loaderData?: unknown }[],
  cachedMatches: [] as { loaderData?: unknown }[],
  invalidate: vi.fn(() => Promise.resolve()),
  clearCache: vi.fn(),
  resolved: [] as (() => void)[],
}))
// One router for the app's life, as TanStack's is.
const routerInstance = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => (routerInstance.current ??= {
    stores: { cachedMatches: { get: () => router.cachedMatches } },
    invalidate: router.invalidate,
    clearCache: router.clearCache,
    subscribe: (_event: string, listener: () => void) => {
      router.resolved.push(listener)
      return () => {
        router.resolved = router.resolved.filter((other) => other !== listener)
      }
    },
    get state() {
      return { matches: router.matches }
    },
  }),
}))

const { DisclosureWatch, gateWatchedRead, PublicationScope, UNREADABLE_AFTER_MS, useDisclosureWatch, watchIntervalOf, WATCH_INTERVAL_MS, WATCH_MAX_BACKOFF_MS } = await import('./use-disclosure-watch')

/** D6 in an open tab: a new publication drops every procurement answer of the old one — never back to a server seed. */

const wrapperOf = (client: QueryClient) =>
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } })

beforeEach(() => {
  release.versions = []
  release.reads = 0
  release.failing = false
  release.onRead = null
  router.matches = []
  router.cachedMatches = []
  router.invalidate.mockClear()
  router.clearCache.mockClear()
  router.resolved = []
  forgetVerifiedPublicationForTests()
  resetNewestKeyForTests()
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

  it('a page left before the first reading is still checked: its seed, and the router\'s cached loader data, are dropped', async () => {
    const client = newClient()
    router.matches = [{ loaderData: { disclosure: 'on:t1:d6:p1' } }]
    client.setQueryData(['procurement', 'supplier', 'x'], { supplier: 'FIRMA SRL' })
    release.versions = ['on:t1:d6:p2']
    const watch = renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    // The reader navigates away before the first reading: the active page seeds nothing, the one left is cached.
    router.matches = [{ loaderData: {} }]
    router.cachedMatches = [{ loaderData: { disclosure: 'on:t1:d6:p1' } }]
    watch.rerender()
    await waitFor(() => expect(client.getQueryData(['procurement', 'supplier', 'x'])).toBeUndefined())
    expect(router.clearCache).toHaveBeenCalled()
    expect(router.invalidate).toHaveBeenCalled()
  })

  it('a view still showing an old answer is mounted afresh: no old name stays on screen, no follow-up read goes out with an old code', async () => {
    const client = newClient()
    const purchase = vi.fn().mockResolvedValueOnce({ supplier: 'OLD NAME SRL', cui: '14837428' }).mockReturnValue(new Promise(() => {}))
    const followUp = vi.fn((cui: string) => Promise.resolve(`context of ${cui}`))
    function Context({ cui }: { readonly cui: string }) {
      const context = useQuery({ queryKey: ['procurement', 'context', cui], queryFn: () => followUp(cui), retry: 3, retryDelay: 1 })
      return <p>{context.data ?? 'no context'}</p>
    }
    function Page() {
      const query = useQuery({ queryKey: ['procurement', 'direct-purchase', 'z'], queryFn: purchase, staleTime: Infinity })
      return query.data ? (
        <>
          <p>{query.data.supplier}</p>
          <Context cui={query.data.cui} />
        </>
      ) : (
        <p>loading</p>
      )
    }
    render(
      <QueryClientProvider client={client}>
        <PublicationScope>
          <Page />
        </PublicationScope>
      </QueryClientProvider>,
    )
    await screen.findByText('OLD NAME SRL')
    await screen.findByText('context of 14837428')
    followUp.mockClear()
    release.versions = ['same', 'on:t1:d6:p2']
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('same'))
    await act(() => client.refetchQueries({ queryKey: ['da-disclosure'] }))
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled())
    // Without a render of the page's own: the remount alone takes the old answer off the screen.
    await screen.findByText('loading')
    expect(screen.queryByText('OLD NAME SRL')).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(followUp).not.toHaveBeenCalled()
  })

  it('remounts nothing when no view shows a watched answer', async () => {
    const client = newClient()
    client.setQueryData(['procurement', 'home'], 1)
    let mounts = 0
    function Probe() {
      useState(() => (mounts += 1))
      return null
    }
    render(
      <QueryClientProvider client={client}>
        <PublicationScope>
          <Probe />
        </PublicationScope>
      </QueryClientProvider>,
    )
    release.versions = ['same', 'on:t1:d6:p2']
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('same'))
    await act(() => client.refetchQueries({ queryKey: ['da-disclosure'] }))
    await waitFor(() => expect(router.invalidate).toHaveBeenCalled())
    expect(client.getQueryData(['procurement', 'home'])).toBeUndefined()
    expect(mounts).toBe(1)
  })

  it('whenever the router settles, a cached page seeded under another publication is dropped — also one cached after a purge', async () => {
    const client = newClient()
    client.setQueryData(['procurement', 'home'], 1)
    release.versions = ['on:t1:d6:p2']
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('on:t1:d6:p2'))
    expect(router.resolved).toHaveLength(1)
    router.clearCache.mockClear()
    // A navigation committed after the purge, caching the page it left.
    router.resolved[0]!()
    const { filter } = router.clearCache.mock.calls[0]![0] as { filter: (match: { loaderData?: unknown }) => boolean }
    expect(filter({ loaderData: { disclosure: 'on:t1:d6:p1' } })).toBe(true)
    expect(filter({ loaderData: { disclosure: null } })).toBe(true)
    expect(filter({ loaderData: { disclosure: 'on:t1:d6:p2' } })).toBe(false)
    expect(filter({ loaderData: { year: 2025 } })).toBe(false)
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

describe('privacy fails closed (root, 19 November 2026)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is the disclosure-change bound, 660 s', () => {
    expect(UNREADABLE_AFTER_MS).toBe(660_000)
  })

  it('no server seed is used while the publication cannot be read', () => {
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1' })).toBe(true)
    setDisclosureUnreadable(true)
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1' })).toBe(false)
    expect(isSeedCurrent({ year: 2025 })).toBe(true)
    setDisclosureUnreadable(false)
  })

  it('past the bound without a reading, drops what the tab shows and asks nothing; the first reading that succeeds restores it', async () => {
    vi.useFakeTimers()
    const client = newClient()
    const read = vi.fn(() => Promise.resolve({ supplier: 'FIRMA SRL' }))
    function Page() {
      const query = useQuery({ queryKey: ['procurement', 'direct-purchase', 'w'], queryFn: read, staleTime: Infinity, retry: false })
      return <p>{query.data?.supplier ?? (query.isError ? 'not shown' : 'loading')}</p>
    }
    render(
      <QueryClientProvider client={client}>
        <DisclosureWatch />
        <PublicationScope>
          <Page />
        </PublicationScope>
      </QueryClientProvider>,
    )
    const at = async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })
    }
    await at(0)
    expect(screen.getByText('FIRMA SRL')).toBeTruthy()
    expect(client.getQueryData(['da-disclosure'])).toBe('same')
    // The status stops answering: the readings back off.
    release.failing = true

    await at(659_000)
    expect(screen.getByText('FIRMA SRL')).toBeTruthy()
    expect(read).toHaveBeenCalledTimes(1)

    await at(2_000)
    expect(screen.queryByText('FIRMA SRL')).toBeNull()
    expect(screen.getByText('not shown')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('nu sunt afișate acum')
    // Nothing asked of the API: the read was refused before its request.
    expect(read).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data))).not.toContain('FIRMA SRL')

    // The readings go on with their backoff; the first that succeeds (at 900 s) restores the page.
    release.failing = false
    await at(240_000)
    expect(read).toHaveBeenCalledTimes(2)
    expect(screen.getByText('FIRMA SRL')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('privacy fails closed: what review 8 found', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  const at = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('a page left keeps its seed only in the router: the deadline still runs, and the seed is dropped and refused', async () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    const client = newClient()
    // Nothing watched in the query cache; the router still caches a server-rendered purchase page.
    router.cachedMatches = [{ loaderData: { disclosure: 'on:t1:d6:p1', purchase: { supplier: 'FIRMA SRL' } } }]
    render(
      <QueryClientProvider client={client}>
        <DisclosureWatch />
      </QueryClientProvider>,
    )
    await at(659_000)
    expect(isDisclosureUnreadable()).toBe(false)
    await at(2_000)
    expect(isDisclosureUnreadable()).toBe(true)
    expect(router.clearCache).toHaveBeenCalledWith()
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1' })).toBe(false)
  })

  it('a CDN copy\'s age counts: the clock starts from when its render read the publication, not from hydration', async () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    const client = newClient()
    // Rendered 590 s ago, served from the CDN now; the status cannot be read from this tab.
    release.failing = true
    router.matches = [{ loaderData: { disclosure: 'on:t1:d6:p1', disclosureReadAt: Date.now() - 590_000 } }]
    client.setQueryData(['procurement', 'home'], 1)
    render(
      <QueryClientProvider client={client}>
        <DisclosureWatch />
      </QueryClientProvider>,
    )
    await at(69_000)
    expect(isDisclosureUnreadable()).toBe(false)
    await at(2_000)
    expect(isDisclosureUnreadable()).toBe(true)
  })

  it('an accepted seed is not read again on mount; a 590 s-old CDN copy still goes unreadable at 660 s; an older key\'s seed is refused and read', async () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    const client = newClient()
    const read = vi.fn(() => Promise.resolve({ supplier: 'READ SRL' }))
    function Page({ seed, id }: { readonly seed: { readonly disclosure: string; readonly disclosureReadAt: number; readonly data: { readonly supplier: string } }; readonly id: string }) {
      // As a lazy route seeds: only what `isSeedCurrent` accepts.
      const query = useQuery({ queryKey: ['procurement', 'direct-purchase', id], queryFn: read, ...DA_QUERY_CACHE, initialData: isSeedCurrent(seed) ? seed.data : undefined })
      return <p>{query.data?.supplier ?? (query.isError ? 'not shown' : 'loading')}</p>
    }
    // A CDN copy rendered 590 s ago; the status cannot be read from this tab.
    release.failing = true
    const old = { disclosure: 'on:t1:d6:2026-11-18T03:10:00.123456Z', disclosureReadAt: Date.now() - 590_000, data: { supplier: 'SEED SRL' } }
    router.matches = [{ loaderData: old }]
    render(
      <QueryClientProvider client={client}>
        <DisclosureWatch />
        <PublicationScope>
          <Page seed={old} id="seeded" />
        </PublicationScope>
      </QueryClientProvider>,
    )
    await at(0)
    expect(screen.getByText('SEED SRL')).toBeTruthy()
    expect(read).not.toHaveBeenCalled()
    await at(71_000)
    expect(isDisclosureUnreadable()).toBe(true)
    expect(screen.queryByText('SEED SRL')).toBeNull()
    expect(read).not.toHaveBeenCalled()
  })

  it('a seed under an older publication than one seen is refused, and the page reads its own', async () => {
    forgetVerifiedPublicationForTests()
    const client = newClient()
    const read = vi.fn(() => Promise.resolve({ supplier: 'READ SRL' }))
    noteKey('2026-11-19T03:10:00.123456Z')
    const seed = { disclosure: 'on:t1:d6:2026-11-18T03:10:00.123456Z', disclosureReadAt: Date.now(), data: { supplier: 'SEED SRL' } }
    function Page() {
      const query = useQuery({ queryKey: ['procurement', 'direct-purchase', 'older'], queryFn: read, ...DA_QUERY_CACHE, initialData: isSeedCurrent(seed) ? seed.data : undefined })
      return <p>{query.data?.supplier ?? 'loading'}</p>
    }
    render(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>,
    )
    await screen.findByText('READ SRL')
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('a suspended tab past the bound uses nothing before its timer runs: seeds are refused and watched reads are not asked', async () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    const seed = { disclosure: 'on:t1:d6:p1', disclosureReadAt: Date.now() }
    expect(isSeedCurrent(seed)).toBe(true)
    // The machine sleeps: the clock moves 700 s, no timer has fired.
    vi.setSystemTime(Date.now() + 700_000)
    expect(isDisclosureUnreadable()).toBe(false)
    expect(isSeedCurrent(seed)).toBe(false)
    const queryFn = vi.fn(() => 'read')
    await expect(Promise.resolve(gateWatchedRead(queryFn as never, {} as never))).rejects.toThrow('unreadable')
    expect(queryFn).not.toHaveBeenCalled()
  })

  it('d6-unavailable is no reading: entering it drops what the tab holds, and its polls never keep the tab readable past the bound', async () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    const client = newClient()
    client.setQueryData(['procurement', 'home'], 1)
    release.versions = ['on:t1:d6:p1', ...Array.from({ length: 20 }, () => 'd6-unavailable')]
    render(
      <QueryClientProvider client={client}>
        <DisclosureWatch />
      </QueryClientProvider>,
    )
    await at(0)
    expect(client.getQueryData(['da-disclosure'])).toBe('on:t1:d6:p1')
    // The next minute's poll answers d6-unavailable: what the tab held goes.
    client.setQueryData(['procurement', 'home'], 2)
    await at(61_000)
    expect(client.getQueryData(['da-disclosure'])).toBe('d6-unavailable')
    expect(client.getQueryData(['procurement', 'home'])).toBeUndefined()
    // Polls keep answering d6-unavailable, successfully: the bound still runs from the last real reading.
    await at(599_000)
    expect(isDisclosureUnreadable()).toBe(false)
    await at(2_000)
    expect(isDisclosureUnreadable()).toBe(true)
  })

  it('a seed read longer ago than the bound is not used before any reading succeeds', () => {
    forgetVerifiedPublicationForTests()
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1', disclosureReadAt: Date.now() - 600_000 })).toBe(true)
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:p1', disclosureReadAt: Date.now() - 661_000 })).toBe(false)
  })

  it('a watch remounted before the deadline does not restart it from its cached reading', async () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    const client = newClient()
    client.setQueryData(['procurement', 'home'], 1)
    const tree = (watchKey: number) => (
      <QueryClientProvider client={client}>
        <DisclosureWatch key={watchKey} />
      </QueryClientProvider>
    )
    const view = render(tree(1))
    await at(0)
    release.failing = true
    await at(600_000)
    view.rerender(tree(2))
    await at(61_000)
    expect(isDisclosureUnreadable()).toBe(true)
  })

  it('a remounted watch does not take its cached, older reading for a new one', async () => {
    vi.useFakeTimers()
    forgetVerifiedPublicationForTests()
    const client = newClient()
    const read = vi.fn(() => Promise.resolve({ supplier: 'FIRMA SRL' }))
    function Page() {
      const query = useQuery({ queryKey: ['procurement', 'direct-purchase', 'v'], queryFn: read, staleTime: Infinity, retry: false })
      return <p>{query.data?.supplier ?? 'not shown'}</p>
    }
    const tree = (watchKey: number) => (
      <QueryClientProvider client={client}>
        <DisclosureWatch key={watchKey} />
        <PublicationScope>
          <Page />
        </PublicationScope>
      </QueryClientProvider>
    )
    const view = render(tree(1))
    await at(0)
    release.failing = true
    await at(661_000)
    expect(isDisclosureUnreadable()).toBe(true)
    // The app shell remounts (a root error recovered): the watch's last reading is still cached, and old.
    view.rerender(tree(2))
    await at(0)
    expect(isDisclosureUnreadable()).toBe(true)
    expect(screen.queryByText('FIRMA SRL')).toBeNull()
    expect(read).toHaveBeenCalledTimes(1)
  })
})

describe('the newest key (API doc 10)', () => {
  it('a seed read under an older publication than one any read has seen is refused, before the watch has polled', () => {
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:2026-11-18T03:10:00.123456Z' })).toBe(true)
    noteKey('2026-11-19T03:10:00.123456Z')
    expect(isSeedCurrent({ disclosure: 'on:t1:d6:2026-11-18T03:10:00.123456Z' })).toBe(false)
    expect(isSeedCurrent({ disclosure: 'on:t2:d6:2026-11-19T03:10:00.123456Z' })).toBe(true)
    expect(isSeedCurrent({ disclosure: 'off:-:nod6:-' })).toBe(true)
  })

  it('a newer publication learnt by any read purges at once and makes the watch read now; the first key a tab sees is no advance', async () => {
    const client = newClient()
    client.setQueryData(['procurement', 'home'], 1)
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('same'))
    const before = release.reads
    act(() => noteKey('2026-11-18T03:10:00.123456Z'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(release.reads).toBe(before)
    expect(client.getQueryData(['procurement', 'home'])).toBe(1)
    act(() => noteKey('2026-11-19T03:10:00.123456Z'))
    // Gone before any poll answers.
    await waitFor(() => expect(client.getQueryData(['procurement', 'home'])).toBeUndefined())
    await waitFor(() => expect(release.reads).toBe(before + 1))
  })

  it('never cancels the poll that learnt the newer key: its answer stands', async () => {
    const client = newClient()
    client.setQueryData(['procurement', 'home'], 1)
    noteKey('2026-11-18T03:10:00.123456Z')
    renderHook(() => useDisclosureWatch(), { wrapper: wrapperOf(client) })
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('same'))
    // The next poll learns the newer key while it is still in flight (the status read notes it before it resolves).
    release.versions = ['on:t1:d6:2026-11-19T03:10:00.123456Z']
    release.onRead = () => noteKey('2026-11-19T03:10:00.123456Z')
    await act(() => client.refetchQueries({ queryKey: ['da-disclosure'] }))
    await waitFor(() => expect(client.getQueryData(['da-disclosure'])).toBe('on:t1:d6:2026-11-19T03:10:00.123456Z'))
  })
})

describe('watchIntervalOf', () => {
  it('reads once a minute, doubling per failure in a row, to a quarter of an hour', () => {
    expect(watchIntervalOf(0)).toBe(WATCH_INTERVAL_MS)
    expect(watchIntervalOf(2)).toBe(4 * WATCH_INTERVAL_MS)
    expect(watchIntervalOf(10)).toBe(WATCH_MAX_BACKOFF_MS)
  })
})
