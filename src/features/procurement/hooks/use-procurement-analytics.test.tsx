import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetProcurementCutoff } from '../api/procurement-cutoff'
import { queryOf } from '../lib/analytics-model'
import { homeYear } from '../lib/home-model'
import { resetRecoveredBuilds, useAnswer } from './use-procurement-analytics'

/**
 * The page's generation guard against a fake API that serves one build at a
 * time and refuses any read pinned to another: no read runs without a
 * cutoff's build; a publication between requests is recovered once, and the
 * whole answer moves to the new build; a recovery that lands on the same
 * build stops, with a retry that reads the cutoff again.
 */

const api = vi.hoisted(() => ({
  served: '13',
  cutoffBuild: '13',
  cutoffFailures: 0,
  calls: [] as { readonly op: string; readonly build: unknown }[],
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (_document: string, variables: Record<string, unknown> | undefined, options: { readonly operationName: string }) => {
      const op = options.operationName
      api.calls.push({ op, build: variables?.build })
      if (op === 'ProcurementCutoff') {
        if (api.cutoffFailures > 0) {
          api.cutoffFailures -= 1
          return Promise.reject(new Error('down'))
        }
        const meta = { buildId: api.cutoffBuild }
        return Promise.resolve({ nationalDirectMonths: [{ points: [], meta }], nationalAwardMonths: [{ points: [], meta }] })
      }
      if (variables?.build !== api.served) {
        return Promise.reject(new actual.GraphQLRequestError('stale', { graphQLErrors: [{ message: 'stale', extensions: { code: 'INVALID_INPUT', field: 'build' } }] }))
      }
      const block = { recordCount: api.served, withValueCount: '0', valueAwardedSum: null, avgValueAwarded: null, meta: null }
      if (op === 'AnalyticsFigures') return Promise.resolve({ now: { blocks: [block] }, before: { blocks: [block] } })
      if (op === 'AnalyticsRanking') return Promise.resolve({ r: [{ rankedBy: 'count', valueWithheldAssociationSum: null, buckets: [{ key: api.served, kind: 'top', recordCount: '1', withValueCount: '0', valueSum: null, shareOfScope: null }] }] })
      if (op === 'AnalyticsConcentration') return Promise.resolve({ c: [] })
      return Promise.resolve({ n: [{ points: [] }], v: [{ points: [] }] })
    },
  }
})

const QUERY = queryOf({ tip: 'directe', judet: 'SB', dupa: 'cumparator' })
const pinned = () => api.calls.filter((call) => call.op !== 'ProcurementCutoff')
const cutoffReads = () => api.calls.filter((call) => call.op === 'ProcurementCutoff').length

function render(topN = 25) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(({ n }: { readonly n: number }) => useAnswer(QUERY, { topN: n, years: false }), { wrapper, initialProps: { n: topN } })
}

beforeEach(() => {
  api.served = '13'
  api.cutoffBuild = '13'
  api.cutoffFailures = 0
  api.calls = []
  forgetProcurementCutoff(homeYear())
  resetRecoveredBuilds()
})

describe('the page’s generation guard', () => {
  it('reads nothing unpinned when the cutoff fails, and its retry starts from the cutoff', async () => {
    api.cutoffFailures = 1
    const { result } = render()
    await waitFor(() => expect(result.current.cutoffFailed).toBe(true))
    expect(result.current.figures.isError).toBe(true)
    expect(result.current.ranking.isError).toBe(true)
    expect(pinned()).toEqual([])
    act(() => result.current.figures.retry())
    await waitFor(() => expect(result.current.figures.data?.now?.records).toBe(13))
    expect(pinned().every((call) => call.build === '13')).toBe(true)
  })

  it('moves the whole answer to a build published between two requests', async () => {
    const { result, rerender } = render()
    await waitFor(() => expect(result.current.figures.data?.now?.records).toBe(13))
    expect(result.current.ranking.data?.buckets[0]?.key).toBe('13')
    // Build 14 is published; the next read the page makes is still pinned to 13.
    api.served = '14'
    api.cutoffBuild = '14'
    rerender({ n: 100 })
    await waitFor(() => expect(result.current.figures.data?.now?.records).toBe(14))
    await waitFor(() => expect(result.current.ranking.data?.buckets[0]?.key).toBe('14'))
    expect(result.current.cutoff?.build).toBe('14')
    // One recovery: one more cutoff read, then every read on 14 — no figure of 13 beside a ranking of 14.
    expect(cutoffReads()).toBe(2)
    const after = pinned().slice(pinned().findIndex((call) => call.build === '14'))
    expect(after.every((call) => call.build === '14')).toBe(true)
  })

  it('recovers once per refused build: the same build again stops, said, and a retry reads the cutoff again', async () => {
    // A cutoff from a node still on 13 while the reads land on 14.
    api.served = '14'
    const { result } = render()
    await waitFor(() => expect(cutoffReads()).toBe(2))
    await waitFor(() => expect(result.current.figures.isError).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(cutoffReads()).toBe(2)
    // The reader's retry starts from the cutoff, past the bound; the API now agrees on 14.
    api.cutoffBuild = '14'
    act(() => result.current.figures.retry())
    await waitFor(() => expect(result.current.figures.data?.now?.records).toBe(14))
    expect(cutoffReads()).toBe(3)
  })
})
