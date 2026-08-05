/**
 * The committee browse must hold the WHOLE directory, not one page of it.
 *
 * `selectCommittees` runs the search box, the type filter, the grouping and the
 * counts over the rows in hand — so a bounded first page silently bounded all
 * four. On live data (2026-08-05) the Senate has 191 committees behind a 60-row
 * page, and searching "comunica" returned a committee's 2016 instance (#54)
 * while its CURRENT one (#172) stayed unreachable — which reads as missing data.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const graphqlQueryMock = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql/graphql-client')>(
    '@/lib/graphql/graphql-client',
  )
  return { ...actual, graphqlQuery: (...args: unknown[]) => graphqlQueryMock(...args) }
})

import { fetchParliamentCommitteesLive } from './parliament-api.live'

const node = (i: number) => ({
  committeeKey: `senate:${i}`,
  chamber: 'senat',
  name: `Comisia ${i}`,
  legislature: null,
  committeeType: 'permanent',
  sourceUrl: 'https://www.senat.ro/EnumComisii.aspx?Permanenta=1',
})

/** A cursor connection served in `pageSize` chunks out of `total` rows. */
const servePages = (total: number, pageSize: number) => {
  const calls: { after?: string; first?: number }[] = []
  graphqlQueryMock.mockImplementation((_q: unknown, vars: { after?: string; first?: number }) => {
    calls.push({ ...vars })
    const start = vars.after ? Number(vars.after) : 0
    const end = Math.min(start + pageSize, total)
    const edges = Array.from({ length: end - start }, (_, k) => ({
      cursor: String(start + k + 1),
      node: node(start + k),
    }))
    return Promise.resolve({
      parliamentCommittees: {
        edges,
        pageInfo: { hasNextPage: end < total, endCursor: end < total ? String(end) : null },
      },
    })
  })
  return calls
}

describe('fetchParliamentCommitteesLive — reads the directory to completion', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('follows the cursor to the end instead of returning the first page', async () => {
    const calls = servePages(191, 100)

    const res = await fetchParliamentCommitteesLive({ chamber: 'senat' })

    expect(res.committees).toHaveLength(191)
    expect(res.hasNextPage).toBe(false)
    expect(calls).toHaveLength(2)
    // The page beyond the first is what the old code dropped: without it the
    // committee at index 172 is simply absent from every filter and count.
    expect(res.committees.some((c) => c.committeeKey === 'senate:172')).toBe(true)
  })

  it('asks for the server cap (100) a page, on every page', async () => {
    const calls = servePages(191, 100)
    await fetchParliamentCommitteesLive({ chamber: 'senat' })
    expect(calls.map((c) => c.first)).toEqual([100, 100])
  })

  it('carries the filters onto EVERY page, not just the first', async () => {
    // Dropping the `{ ...params }` spread on the follow-up read would mix both
    // chambers into a result the caller asked to be Senate-only — and every
    // other test here would still pass.
    const calls = servePages(191, 100)
    await fetchParliamentCommitteesLive({ chamber: 'senat', legislature: '2024' })
    expect(calls[1]).toEqual({
      chamber: 'senat',
      legislature: '2024',
      first: 100,
      after: '100',
    })
  })

  it('a single page is a single request (no speculative second read)', async () => {
    const calls = servePages(42, 100)
    const res = await fetchParliamentCommitteesLive({})
    expect(res.committees).toHaveLength(42)
    expect(calls).toHaveLength(1)
  })

  it('stops at the page cap and says so — the partial set keeps hasNextPage', async () => {
    // 5,000 rows would run forever; the cap must bound it AND surface the cursor
    // so the page can offer "load more" rather than present a prefix as the whole.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const calls = servePages(5000, 100)

    const res = await fetchParliamentCommitteesLive({})

    expect(calls).toHaveLength(12)
    expect(res.committees).toHaveLength(1200)
    expect(res.hasNextPage).toBe(true)
    expect(res.endCursor).toBeDefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('stopped at 12 pages'))
    warn.mockRestore()
  })

  it('cannot spin forever when the server claims more but hands back no cursor', async () => {
    // A cursor-less `hasNextPage: true` is the shape that turns a follow-the-
    // cursor loop into an infinite one. The loop must stop and hand the caller
    // an honest "there is more, but I cannot ask for it".
    graphqlQueryMock.mockResolvedValue({
      parliamentCommittees: {
        edges: [{ cursor: '1', node: node(0) }],
        pageInfo: { hasNextPage: true, endCursor: null },
      },
    })

    const res = await fetchParliamentCommitteesLive({})

    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
    expect(res.committees).toHaveLength(1)
    expect(res.hasNextPage).toBe(true)
    expect(res.endCursor).toBeUndefined()
  })

  it('follows any one cursor at most once, so a stuck cursor costs one page, not twelve', async () => {
    // A server that keeps returning the SAME endCursor would otherwise be
    // followed to the 12-page cap, appending the same rows 12 times and
    // presenting a directory that is mostly duplicates. The guard cannot undo
    // the one repeat already fetched — it bounds the damage and says so.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    graphqlQueryMock.mockResolvedValue({
      parliamentCommittees: {
        edges: [{ cursor: '1', node: node(0) }],
        pageInfo: { hasNextPage: true, endCursor: 'stuck' },
      },
    })

    const res = await fetchParliamentCommitteesLive({})

    // One initial read plus exactly ONE follow of 'stuck', then it stops.
    expect(graphqlQueryMock).toHaveBeenCalledTimes(2)
    expect(res.committees).toHaveLength(2)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('did not advance'))
    warn.mockRestore()
  })

  it('makes a stuck cursor TERMINAL — it is never handed back for a retry', async () => {
    // The `followed` set only lives for one call. This function sits under a
    // `useInfiniteQuery`, which REMEMBERS the cursor we return and re-supplies
    // it on the next "load more" press: returning a known-stuck cursor makes
    // every press append the same page again. Withholding the cursor makes
    // `getNextPageParam` return undefined, so the hook stops offering more.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    graphqlQueryMock.mockResolvedValue({
      parliamentCommittees: {
        edges: [{ cursor: '1', node: node(0) }],
        pageInfo: { hasNextPage: true, endCursor: 'stuck' },
      },
    })

    const res = await fetchParliamentCommitteesLive({})

    expect(res.endCursor).toBeUndefined()
    // The same predicate the hook applies (`hasNextPage && endCursor`).
    expect(res.hasNextPage && res.endCursor).toBeFalsy()
    warn.mockRestore()
  })

  it('KEEPS the cursor when it stops at the cap — there, continuing is right', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    servePages(5000, 100)

    const res = await fetchParliamentCommitteesLive({})

    expect(res.hasNextPage).toBe(true)
    expect(res.endCursor).toBe('1200')
    warn.mockRestore()
  })

  it('lets a mid-directory failure surface instead of serving a silent prefix', async () => {
    let call = 0
    graphqlQueryMock.mockImplementation(() => {
      call += 1
      if (call === 2) return Promise.reject(new Error('connection reset'))
      return Promise.resolve({
        parliamentCommittees: {
          edges: [{ cursor: '1', node: node(0) }],
          pageInfo: { hasNextPage: true, endCursor: '100' },
        },
      })
    })

    await expect(fetchParliamentCommitteesLive({})).rejects.toThrow('connection reset')
  })

  it('propagates a null root as a failure, never as an empty directory', async () => {
    graphqlQueryMock.mockResolvedValue({ parliamentCommittees: null })
    await expect(fetchParliamentCommitteesLive({})).rejects.toThrow(
      'parliamentCommittees returned null',
    )
  })
})
