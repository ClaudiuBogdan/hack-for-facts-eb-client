/**
 * The stuck-cursor guard has to hold at the boundary that DECIDES whether to
 * ask again — and that boundary is `useInfiniteQuery`, not the fetch function.
 *
 * `fetchParliamentCommitteesLive` keeps its `followed` set for exactly one call.
 * The hook outlives it: it stores the cursor the fetcher returns and re-supplies
 * it on the next "Încarcă mai multe". A guard that stops the loop but still
 * hands the stuck cursor back therefore fixes nothing — page params
 * `[undefined, 'stuck', 'stuck']` were reproduced against exactly that shape.
 *
 * `parliament-committees-paging.test.ts` asserts `hasNextPage && endCursor` is
 * falsy, which is a HAND-COPY of `getNextPageParam`. A predicate agreeing with
 * its own copy proves nothing about the composition: rewrite the real
 * `getNextPageParam` and those assertions still pass while the bug returns.
 * This file runs the REAL hook over the REAL fetcher and mocks only the
 * transport, so the verdict comes from the code that ships.
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

import { useParliamentCommitteesBrowse } from './use-parliament-data'

const node = (i: number) => ({
  committeeKey: `senate:${i}`,
  chamber: 'senat',
  name: `Comisia ${i}`,
  legislature: null,
  committeeType: 'permanent',
  sourceUrl: 'https://www.senat.ro/EnumComisii.aspx?Permanenta=1',
})

/** Every read comes back claiming more rows behind the SAME cursor. */
const serveStuckCursor = () => {
  graphqlQueryMock.mockResolvedValue({
    parliamentCommittees: {
      edges: [{ cursor: '1', node: node(0) }],
      pageInfo: { hasNextPage: true, endCursor: 'stuck' },
    },
  })
}

/** A well-behaved connection with more rows than the page cap can hold. */
const serveAdvancingCursor = (total: number, pageSize: number) => {
  graphqlQueryMock.mockImplementation((_q: unknown, vars: { after?: string }) => {
    const start = vars.after ? Number(vars.after) : 0
    const end = Math.min(start + pageSize, total)
    return Promise.resolve({
      parliamentCommittees: {
        edges: Array.from({ length: end - start }, (_, k) => ({
          cursor: String(start + k + 1),
          node: node(start + k),
        })),
        pageInfo: { hasNextPage: end < total, endCursor: end < total ? String(end) : null },
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

const rows = (data: { pages: { committees: unknown[] }[] } | undefined) =>
  (data?.pages ?? []).flatMap((p) => p.committees)

describe('useParliamentCommitteesBrowse — the guard at the hook boundary', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('leaves the hook with nothing more to offer when the cursor is stuck', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    serveStuckCursor()

    const { result } = renderHook(() => useParliamentCommitteesBrowse({}), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The verdict of the REAL `getNextPageParam`, reached only because the
    // fetcher withheld the cursor it knows is stuck.
    expect(result.current.hasNextPage).toBe(false)
    // Live path, not fixtures: mock mode would never touch the transport, and
    // this test would then be asserting `false` about a hook that never ran.
    expect(graphqlQueryMock).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('never re-appends the page, however many times "load more" is pressed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    serveStuckCursor()

    const { result } = renderHook(() => useParliamentCommitteesBrowse({}), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const settled = rows(result.current.data).length
    for (let press = 0; press < 3; press += 1) {
      await act(async () => {
        await result.current.fetchNextPage()
      })
    }

    // The guard cannot undo the ONE repeat it had to fetch to discover the
    // stall, so `settled` is 2 rows for 1 committee. What must not happen is
    // growth: the failure this replaces added that page again on every press.
    expect(result.current.data?.pages).toHaveLength(1)
    expect(rows(result.current.data)).toHaveLength(settled)
    // The reproduction was [undefined, 'stuck', 'stuck']. 'stuck' is followed
    // once, inside the single call that discovered it, and never again.
    expect(afterParams()).toEqual([undefined, 'stuck'])
    warn.mockRestore()
  })

  it('still offers more at the page cap, and a press really fetches it', async () => {
    // The positive control. Without it, `hasNextPage === false` above could be
    // an inert hook rather than a verdict — and a guard that made every stall
    // terminal by making ALL continuation terminal would look identical.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    serveAdvancingCursor(5000, 100)

    const { result } = renderHook(() => useParliamentCommitteesBrowse({}), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.hasNextPage).toBe(true)
    expect(rows(result.current.data)).toHaveLength(1200)

    await act(async () => {
      await result.current.fetchNextPage()
    })
    // `fetchNextPage` resolves with the new data before the observer has
    // re-rendered, so reading `result.current` synchronously here sees the
    // pre-press page count and would fail a working implementation.
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))

    expect(rows(result.current.data)).toHaveLength(2400)
    // The 13th request is the press, and it resumes from the cursor the cap
    // handed back rather than restarting the directory.
    expect(afterParams()[12]).toBe('1200')
    warn.mockRestore()
  })
})
