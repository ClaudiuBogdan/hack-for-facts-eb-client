/**
 * The documents stuck-cursor guard, proven at the boundary that DECIDES whether
 * to ask again — `useInfiniteQuery`, not the fetch function.
 *
 * `fetchParliamentCommitteeDocumentsLive` draws ONE page and forgets it. The
 * hook outlives it: it stores the cursor the fetcher returned and re-supplies it
 * on the next "Încarcă mai multe". So a server answering `hasNextPage: true`
 * with the cursor it was just handed re-appends the same page on every press —
 * page params `[undefined, 'stuck', 'stuck']`, the shape reproduced against the
 * committees browse. Only `getNextPageParam` can make that terminal, so only a
 * test that runs the REAL hook can prove it: a mocked-hook test asserts about a
 * hook that never ran, and a hand-copied `hasNextPage && endCursor` predicate
 * agrees with its own copy while the bug returns.
 *
 * Only the transport is mocked here. Everything from the facade down is real.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQueryMock = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql/graphql-client')>(
    '@/lib/graphql/graphql-client',
  )
  return { ...actual, graphqlQuery: (...args: unknown[]) => graphqlQueryMock(...args) }
})

import { useParliamentCommitteeDocuments } from './use-parliament-data'

const COMMITTEE = 'senate:a3ba8a6b-8b59-47b1-8932-0d30b5f7add1'

const node = (i: number) => ({
  committeeDocumentKey: `doc-${String(i)}`,
  title: `Document ${String(i)}`,
  docType: null,
  docDate: null,
  documentUrl: null,
  sourceUrl: 'https://www.senat.ro/ComisiiDetaliu.aspx',
  billKey: null,
})

/** Every read comes back claiming more rows behind the SAME cursor. */
const serveStuckCursor = () => {
  graphqlQueryMock.mockResolvedValue({
    parliamentCommittee: {
      committeeKey: COMMITTEE,
      documents: {
        total: 188,
        edges: [{ node: node(0) }],
        pageInfo: { hasNextPage: true, endCursor: 'stuck' },
      },
    },
  })
}

/** A well-behaved connection: the cursor is the next offset. */
const serveAdvancingCursor = (total: number, pageSize: number) => {
  graphqlQueryMock.mockImplementation((_q: unknown, vars: { after?: string }) => {
    const start = vars.after ? Number(vars.after) : 0
    const end = Math.min(start + pageSize, total)
    return Promise.resolve({
      parliamentCommittee: {
        committeeKey: COMMITTEE,
        documents: {
          total,
          edges: Array.from({ length: end - start }, (_, k) => ({ node: node(start + k) })),
          pageInfo: { hasNextPage: end < total, endCursor: end < total ? String(end) : null },
        },
      },
    })
  })
}

/** The `after` value on each transport call, in order — page params as observed. */
const afterParams = () =>
  graphqlQueryMock.mock.calls.map((call) => (call[1] as { after?: string } | undefined)?.after)

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const rows = (data: { pages: { documents: unknown[] }[] } | undefined) =>
  (data?.pages ?? []).flatMap((p) => p.documents)

/**
 * Advance real timers inside `act` until `ready()` holds.
 *
 * Deliberately not RTL's `waitFor`: this hook renders no DOM, and `waitFor`'s
 * observer-driven polling did not observe the hook's re-render here — it timed
 * out while a plain timer loop saw the appended page immediately. Polling the
 * hook result directly is what makes the wait mean "the state landed".
 */
const until = async (ready: () => boolean, label: string) => {
  for (let tick = 0; tick < 200; tick += 1) {
    if (ready()) return
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  }
  throw new Error(`timed out waiting for ${label}`)
}

/**
 * Press "Încarcă mai multe" once, and report whether it actually paged.
 *
 * The readiness signal is the TRANSPORT call count, not `isFetchingNextPage` —
 * that flag is equally false before a fetch starts and after it ends, so waiting
 * on it returns immediately and the assertion reads the pre-press state. A press
 * the hook refuses (no next page param) makes no call at all, which is exactly
 * the "the button does nothing" the guard is supposed to produce.
 */
const loadMore = async (result: {
  current: { fetchNextPage: () => Promise<unknown>; data?: { pages: unknown[] } }
}): Promise<boolean> => {
  const callsBefore = graphqlQueryMock.mock.calls.length
  const pagesBefore = result.current.data?.pages.length ?? 0
  await act(async () => {
    await result.current.fetchNextPage()
  })
  if (graphqlQueryMock.mock.calls.length === callsBefore) return false
  await until(
    () => (result.current.data?.pages.length ?? 0) > pagesBefore,
    'the fetched page to land',
  )
  return true
}

describe('useParliamentCommitteeDocuments — the stuck-cursor guard', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('follows a repeated cursor ONCE, then treats it as terminal', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    serveStuckCursor()

    const { result } = renderHook(() => useParliamentCommitteeDocuments(COMMITTEE), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Live path, not fixtures: in mock mode the transport is never touched and
    // this would be asserting about a hook that never ran.
    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
    // The first page CANNOT know the cursor is stuck — it has seen it once, and
    // the fetcher draws a single page, so a stall is only observable when the
    // same cursor comes back a second time. Offering it here is correct.
    expect(result.current.hasNextPage).toBe(true)

    expect(await loadMore(result)).toBe(true)

    // …and now it is terminal, because the server answered with the cursor it
    // was just given.
    expect(result.current.hasNextPage).toBe(false)
    expect(afterParams()).toEqual([undefined, 'stuck'])
    warn.mockRestore()
  })

  it('never re-appends the page, however many times "load more" is pressed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    serveStuckCursor()

    const { result } = renderHook(() => useParliamentCommitteeDocuments(COMMITTEE), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
    expect(await loadMore(result)).toBe(true)

    const settled = rows(result.current.data).length
    expect(settled).toBe(2)
    for (let press = 0; press < 3; press += 1) {
      await loadMore(result)
    }

    expect(result.current.hasNextPage).toBe(false)
    expect(rows(result.current.data)).toHaveLength(settled)
    // The reproduction was [undefined, 'stuck', 'stuck', …]. 'stuck' is followed
    // once, inside the call that discovered it, and never again.
    expect(afterParams()).toEqual([undefined, 'stuck'])
    warn.mockRestore()
  })

  it('stops on a cursor that CYCLES rather than repeating immediately', async () => {
    // A → B → A. Comparing against the cursor just SENT would not catch this:
    // each answer differs from its own request, and the loop runs forever.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const cycle = ['b', 'a', 'b', 'a']
    let call = 0
    graphqlQueryMock.mockImplementation(() => {
      const endCursor = cycle[call] ?? 'a'
      call += 1
      return Promise.resolve({
        parliamentCommittee: {
          committeeKey: COMMITTEE,
          documents: {
            total: 9,
            edges: [{ node: node(call) }],
            pageInfo: { hasNextPage: true, endCursor },
          },
        },
      })
    })

    const { result } = renderHook(() => useParliamentCommitteeDocuments(COMMITTEE), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
    for (let press = 0; press < 4; press += 1) {
      await loadMore(result)
    }

    expect(result.current.hasNextPage).toBe(false)
    // undefined → 'b' → 'a', and then 'b' returns a second time: terminal.
    expect(afterParams()).toEqual([undefined, 'b', 'a'])
    warn.mockRestore()
  })

  it('still pages forward while the cursor ADVANCES (the positive control)', async () => {
    // Without this, the guard could return undefined unconditionally and every
    // assertion above would still pass while paging was dead.
    serveAdvancingCursor(6, 2)

    const { result } = renderHook(() => useParliamentCommitteeDocuments(COMMITTEE), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)

    expect(await loadMore(result)).toBe(true)
    expect(result.current.hasNextPage).toBe(true)

    expect(await loadMore(result)).toBe(true)

    expect(result.current.data?.pages).toHaveLength(3)
    expect(rows(result.current.data)).toHaveLength(6)
    expect(result.current.hasNextPage).toBe(false)
    expect(afterParams()).toEqual([undefined, '2', '4'])
  })
})
