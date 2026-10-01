import { useEffect } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { quietImport } from '@/lib/chunk-recovery'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { REGISTRY_LIST_QUERY, registryPageSchema, type RegistryPage, type RegistrySnapshot } from '@/features/ngos/registry/api'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import type { NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'
import { tallyOfCounts, tallyOfRows, type RegistryCounts, type Tally } from './registry.counts'
import {
  distinctRows,
  filterOf,
  PAGE_SIZE,
  queryOf,
  READ_CAP_PAGES,
  searchOf,
  TABLE_PAGE,
  type CountsGap,
  type RegistryQuery,
  type RegistryRead,
  type UnreadParam,
} from './registry.model'

/**
 * The registry page's reads, live on the dev API. The records come page by
 * page (100 a page, a cursor each); the count and the breakdowns come from
 * the registry counted whole (`features/ngos/registry/data/registry-counts.json`, a chunk of its own)
 * while the API serves the export it was counted on. A name or a registry
 * number, which the counts do not keep, is read on until it ends or the cap
 * is reached — counted exactly under the cap, said to be wider past it.
 *
 * `?simuleaza=eroare|oprire|gol|lent` stands in for the API's failure, a
 * failure after the first page, an empty answer and a slow one: the only
 * fixtures here, and only for those states.
 */

// ───────────────────────────────────────────────────────── the address ──

export type Simulated = 'eroare' | 'oprire' | 'gol' | 'lent' | null

/** The harness's own keys and the simulation, kept on every move. */
const KEPT = ['v', 'layout', 'simuleaza'] as const

export function useRegistryQuery(): readonly [RegistryQuery, (next: RegistryQuery) => void, readonly UnreadParam[], Simulated] {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const { query, unread } = queryOf(search, NGO_REGISTRY_SUMMARY.counties)
  const navigate = useNavigate()
  const simulated =
    search.simuleaza === 'eroare' || search.simuleaza === 'oprire' || search.simuleaza === 'gol' || search.simuleaza === 'lent' ? search.simuleaza : null
  // A change of question stays where the reader is: the page answers in place.
  const move = (next: RegistryQuery) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...Object.fromEntries(KEPT.filter((key) => previous[key] !== undefined).map((key) => [key, previous[key]])),
        ...searchOf(next),
      }),
      resetScroll: false,
    })
  return [query, move, unread, simulated] as const
}

// ───────────────────────────────────────────────────────── the pages ──

/** The snapshot as the API described it on 2026-09-30, for the simulated empty answer only. */
const FIXTURE_SNAPSHOT: RegistrySnapshot = {
  id: 'ngos:mj_rnong:registry_export:955ec3c867a0507797c73c9f',
  sourceDeclaredDate: null,
  importedAt: '2026-09-22T14:02:09.302Z',
  capturedAt: '2026-09-20T06:11:58.733Z',
  refreshOverdue: true,
  acceptedAt: '2026-09-22T14:02:09.302Z',
  recordCount: 141330,
  isCurrent: true,
  sourceUrl: 'https://rnong.just.ro/registru-ong',
  coverageBasis: 'provided_artifact',
  nationalCompleteness: 'unverified',
}

const EMPTY_PAGE: RegistryPage = { edges: [], pageInfo: { hasNextPage: false, endCursor: null }, snapshot: FIXTURE_SNAPSHOT }

async function readPage(query: RegistryQuery, after: string | null, simulated: Simulated, signal: AbortSignal): Promise<RegistryPage> {
  if (simulated === 'eroare') throw new Error('simulated registry failure')
  // The first page answers, every later one fails: a read that stops part way, with its retry.
  if (simulated === 'oprire' && after !== null) throw new Error('simulated registry failure after the first page')
  if (simulated === 'gol') return EMPTY_PAGE
  if (simulated === 'lent') await new Promise((resolve) => setTimeout(resolve, 2500))
  const data = await graphqlQuery<unknown>(
    REGISTRY_LIST_QUERY,
    { filter: filterOf(query), first: PAGE_SIZE, after },
    { operationName: 'NgoRegistryRecords', auth: 'none', signal },
  )
  return registryPageSchema.parse(data).ngoRegistryRecords
}

/**
 * The registry counted whole: ~134 KB gzipped, fetched once per visit and
 * only by this page; a failure leaves the page to count from its reads.
 */
function useRegistryCounts(): { readonly counts: RegistryCounts | null; readonly failed: boolean; readonly settled: boolean } {
  const result = useQuery({
    queryKey: ['proto-ngo-registry-counts'],
    queryFn: () =>
      quietImport(() => import('@/features/ngos/registry/data/registry-counts.json')).then((module) => module.default as unknown as RegistryCounts),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
  return { counts: result.data ?? null, failed: result.isError, settled: !result.isPending }
}

export interface RegistryReadState {
  readonly read: RegistryRead
  /** The client summary, while the live export is the one it counted; `null` when the two differ, `undefined` before the first page. */
  readonly summary: NgoRegistrySummary | null | undefined
  /** The selection counted — by the whole registry's counts, or by its own complete read; `null` until one of them can say. */
  readonly tally: Tally | null
  readonly countsGap: CountsGap
  /** The last request failed: before any row (the read failed) or after some (the read stopped). */
  readonly error: boolean
  readonly fetching: boolean
  /** The selection has rows past what is read. */
  readonly more: boolean
  /** Reads again what failed: the first page, or the next one. */
  readonly retry: () => void
}

/**
 * The selection's records, one request at a time (each cursor is the next
 * one's start): as far as the table's page needs when the counts answer
 * the selection, and on to the cap when they cannot — a name, a registry
 * number, or counts that did not load or belong to another export. The
 * table's need is in distinct rows: a page of repeats does not fill it.
 */
export function useRegistryRead(query: RegistryQuery, simulated: Simulated, tablePage: number): RegistryReadState {
  const result = useInfiniteQuery({
    queryKey: ['proto-ngo-registry', searchOf(query), simulated],
    queryFn: ({ pageParam, signal }) => readPage(query, pageParam, simulated, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => (page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined),
    staleTime: 5 * 60_000,
    retry: false,
  })
  const loaded = useRegistryCounts()
  const pages = result.data?.pages ?? []
  const hasNext = result.hasNextPage
  const fetching = result.isFetching
  const failed = result.isError
  const snapshot = pages[0]?.snapshot ?? null
  const summary = summaryFor(snapshot)
  const { counts } = loaded
  // The simulated states stand for the API alone; the counts would contradict them.
  const countable = query.q === null && query.registryNumber === null && simulated === null
  const matching = counts !== null && snapshot !== null && counts.snapshotId === snapshot.id
  const counted = countable && matching ? tallyOfCounts(counts, query) : null
  // Until the counts arrive and the export is known, a selection they can answer waits for them rather than reading on.
  const waiting = countable && (!loaded.settled || (counts !== null && snapshot === null))
  const countsGap: CountsGap = !countable ? null : loaded.failed ? 'failed' : counts !== null && snapshot !== null && !matching ? 'otherExport' : null
  const distinct = distinctRows(pages.flatMap((page) => page.edges.map((edge) => edge.node)))
  // One row past the table's page, so the page knows whether another follows.
  const tableShort = distinct.rows.length <= tablePage * TABLE_PAGE
  const counting = !counted && !waiting && pages.length < READ_CAP_PAGES
  const fetchNext = result.fetchNextPage
  useEffect(() => {
    if (hasNext && !fetching && !failed && pages.length > 0 && (tableShort || counting)) void fetchNext()
  }, [hasNext, fetching, failed, pages.length, tableShort, counting, fetchNext])
  const complete = pages.length > 0 && !hasNext
  const read: RegistryRead = {
    rows: distinct.rows,
    repeated: distinct.repeated,
    complete,
    capped: !counted && !complete && pages.length >= READ_CAP_PAGES,
    pending: pages.length === 0,
    snapshot,
  }
  const lastYear = Number((snapshot?.capturedAt ?? NGO_REGISTRY_SUMMARY.capturedAt).slice(0, 4))
  const tally = counted ?? (complete ? tallyOfRows(read.rows, lastYear) : null)
  return {
    read,
    summary,
    tally,
    countsGap,
    error: failed,
    fetching,
    more: hasNext,
    retry: () => void (pages.length === 0 ? result.refetch() : result.fetchNextPage()),
  }
}

/** The client summary, only while the live export is the one it counted: `null` says the two differ, `undefined` that the page does not know yet. */
function summaryFor(snapshot: RegistrySnapshot | null): NgoRegistrySummary | null | undefined {
  if (snapshot === null) return undefined
  return snapshot.id === NGO_REGISTRY_SUMMARY.snapshotId ? NGO_REGISTRY_SUMMARY : null
}

export { NGO_REGISTRY_SUMMARY as SUMMARY }
