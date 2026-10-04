import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createTestQueryClient, renderHook, waitFor } from '@/test/test-utils'
import type { EntitySearchInput } from '@/schemas/entity-search'

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/config/env', () => ({
  env: { VITE_API_URL: 'http://api.test' },
  getApiBaseUrl: () => 'http://api.test',
  getSiteUrl: () => 'http://localhost:3000',
}))

import { entitySearchQueryKey, useEntitySearch } from './use-entity-search'
import {
  answerBody,
  CURRENT_EMPTY_LAST_PAGE,
  CURRENT_EMPTY_PAGE_WITH_MORE,
  CURRENT_NO_MATCH,
  CURRENT_PAGE,
  WITHHELD_EMPTY_PAGE_WITH_MORE,
  WITHHELD_NEXT_PAGE,
} from '../api/graphql/entity-search.fixtures'

type Variables = { readonly q: string; readonly offset?: number }

const respond = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()

const variablesOf = (init: RequestInit): Variables =>
  (JSON.parse(String(init.body)) as { variables: Variables }).variables

/** Answers each `q@offset` with its page; anything else is a test bug. */
function serve(pages: Record<string, unknown>) {
  fetchMock.mockImplementation(async (_url, init) => {
    const { q, offset } = variablesOf(init)
    const page = pages[`${q}@${offset ?? 0}`]
    if (page === undefined) throw new Error(`unexpected request ${q}@${offset ?? 0}`)
    return respond(answerBody(page))
  })
}

const sentOffsets = () => fetchMock.mock.calls.map(([, init]) => variablesOf(init).offset ?? 0)

function renderSearch(initial: EntitySearchInput, queryClient = createTestQueryClient()) {
  function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const hook = renderHook((input: EntitySearchInput) => useEntitySearch(input), {
    wrapper: Wrapper,
    initialProps: initial,
  })
  return { ...hook, queryClient }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useEntitySearch paging', () => {
  it('pages with the exact next offset, through a page that shows nothing, and stops on null', async () => {
    serve({
      'dedeman@0': CURRENT_PAGE,
      'dedeman@20': CURRENT_EMPTY_PAGE_WITH_MORE,
      'dedeman@40': CURRENT_EMPTY_LAST_PAGE,
    })
    const { result } = renderSearch({ q: 'dedeman', limit: 20 })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1))
    // Four visible hits of twenty candidates: still a next page, at 20.
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    // Zero visible hits on page 2 is not exhaustion: the next page is at 40.
    expect(result.current.data?.pages[1]?.hits).toEqual([])
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3))
    expect(result.current.hasNextPage).toBe(false)
    // Never hits.length arithmetic (that would have asked for 4, then 4 again).
    expect(sentOffsets()).toEqual([0, 20, 40])
  })

  it('pages past a withheld empty first page with its own next offset', async () => {
    serve({
      'dedeman@0': WITHHELD_EMPTY_PAGE_WITH_MORE,
      'dedeman@20': WITHHELD_NEXT_PAGE,
    })
    const { result } = renderSearch({ q: 'dedeman', limit: 20 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0]?.hits).toEqual([])
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(result.current.data?.pages[1]?.hits.map((hit) => hit.docType)).toEqual(['legal_act'])
    expect(result.current.hasNextPage).toBe(false)
    expect(sentOffsets()).toEqual([0, 20])
  })

  it('runs no request for an empty query', () => {
    const { result } = renderSearch({ q: '  ' })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('useEntitySearch cancellation', () => {
  it('cancels the superseded request, and its late completion never lands', async () => {
    let releaseSlow: (() => void) | undefined
    let slowSignal: AbortSignal | undefined
    fetchMock.mockImplementation((_url, init) => {
      const { q } = variablesOf(init)
      if (q === 'slow') {
        slowSignal = init.signal ?? undefined
        return new Promise<Response>((resolve) => {
          // A late answer: the server finishes whatever the client did.
          releaseSlow = () => resolve(respond(answerBody({ ...CURRENT_PAGE, query: 'slow' })))
        })
      }
      return Promise.resolve(respond(answerBody(CURRENT_NO_MATCH)))
    })

    // A cache that keeps the abandoned query, so a late answer would be visible in it.
    const keepingClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 0 } },
    })
    const { result, rerender, queryClient } = renderSearch({ q: 'slow', limit: 20 }, keepingClient)
    await waitFor(() => expect(slowSignal).toBeDefined())

    rerender({ q: 'zzzqqq', limit: 20 })
    await waitFor(() => expect(result.current.data?.pages[0]?.query).toBe('zzzqqq'))
    expect(slowSignal?.aborted).toBe(true)

    await act(async () => {
      releaseSlow?.()
      await Promise.resolve()
    })

    expect(result.current.data?.pages[0]?.query).toBe('zzzqqq')
    const slowKey = entitySearchQueryKey({ q: 'slow', limit: 20 })
    expect(queryClient.getQueryState(slowKey)).toMatchObject({ dataUpdateCount: 0 })
    expect(queryClient.getQueryData(slowKey)).toBeUndefined()
  })
})
