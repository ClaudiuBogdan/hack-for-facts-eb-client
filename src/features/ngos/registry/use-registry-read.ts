import { useEffect } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { quietImport } from '@/lib/chunk-recovery'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import type { NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'
import { fetchRegistryRecords, type RegistryPage, type RegistrySnapshot } from './api'
import { tallyFromData, tallyOfCounts, tallyOfRows, type RegistryCounts, type Tally, type TallyData } from './counts'
import { distinctRows, filterOf, PAGE_SIZE, READ_CAP_PAGES, selectionKey, TABLE_PAGE, type CountsGap, type RegistryQuery, type RegistryRead } from './model'

/**
 * The registry page's reads. The records come page by page from
 * `ngoRegistryRecords` (100 a page, a cursor each); the count and the
 * breakdowns from the registry counted whole (`data/registry-counts.json`,
 * a chunk of its own, fetched in the browser only), while the API serves
 * the export it was counted on. A name or a registry number, which the
 * counts do not keep, is read on until it ends or the cap is reached —
 * counted exactly under the cap, said to be wider past it.
 *
 * The server's render reads the first page and counts the selection
 * (`registry-ssr.ts`); the page starts from that seed, so the HTML carries
 * the figures and the first rows, and the browser reads on from there.
 */

/** What the server read for the page's first selection. */
export interface RegistrySeed {
  /** The selection read: its `selectionKey`. */
  readonly key: string
  /** Its first page; `null` when the read failed or ran out of time. */
  readonly page: RegistryPage | null
  /** Its tally from the whole registry's counts; `null` where they cannot say. */
  readonly tally: TallyData | null
  /** When the server read it (ms since the epoch): the first page is as fresh as that, not as the page's load. */
  readonly readAt: number
}

const RECORDS_KEY = 'ngo-registry-records'

/**
 * The registry counted whole: ~134 KB gzipped, read once per visit and only
 * by this page; a failure leaves the page to count from its reads.
 */
function useRegistryCounts(): { readonly counts: RegistryCounts | null; readonly failed: boolean; readonly settled: boolean } {
  const result = useQuery({
    queryKey: ['ngo-registry-counts'],
    queryFn: () => quietImport(() => import('./data/registry-counts.json')).then((module) => module.default as unknown as RegistryCounts),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
  return { counts: result.data ?? null, failed: result.isError, settled: !result.isPending }
}

export interface RegistryReadState {
  readonly read: RegistryRead
  /** The hub's summary, while the live export is the one it counted; `null` when the two differ, `undefined` before the first page. */
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
export function useRegistryRead(query: RegistryQuery, tablePage: number, seed: RegistrySeed | null): RegistryReadState {
  const key = selectionKey(query)
  const seeded = seed !== null && seed.key === key ? seed : null
  const result = useInfiniteQuery({
    queryKey: [RECORDS_KEY, key],
    queryFn: ({ pageParam, signal }) => fetchRegistryRecords(filterOf(query), { first: PAGE_SIZE, after: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => (page.pageInfo.hasNextPage ? page.pageInfo.endCursor : undefined),
    // Dated by the server's read: back on this selection after its query was dropped, an old seed is read again, not taken as fresh.
    ...(seeded?.page ? { initialData: { pages: [seeded.page], pageParams: [null] }, initialDataUpdatedAt: seeded.readAt } : {}),
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
  const countable = query.q === null && query.registryNumber === null
  const matching = counts !== null && snapshot !== null && counts.snapshotId === snapshot.id
  // Until the counts' chunk arrives (or if it fails), the server's tally of this very selection stands in — the same counts, counted
  // there — while the records read are of the export it counted; a newer export read since is counted from its rows.
  const seededTally = counts === null && seeded?.tally && seeded.page && snapshot !== null && seeded.page.snapshot.id === snapshot.id ? seeded.tally : null
  const counted = !countable ? null : matching ? tallyOfCounts(counts, query) : seededTally ? tallyFromData(seededTally) : null
  // Until the counts arrive and the export is known, a selection they can answer waits for them rather than reading on.
  const waiting = countable && counted === null && (!loaded.settled || (counts !== null && snapshot === null))
  // No gap to report while the server's tally answers: it is the counts, counted on the server.
  const countsGap: CountsGap =
    !countable || seededTally ? null : loaded.failed ? 'failed' : counts !== null && snapshot !== null && !matching ? 'otherExport' : null
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

/** The hub's summary, only while the live export is the one it counted: `null` says the two differ, `undefined` that the page does not know yet. */
function summaryFor(snapshot: RegistrySnapshot | null): NgoRegistrySummary | null | undefined {
  if (snapshot === null) return undefined
  return snapshot.id === NGO_REGISTRY_SUMMARY.snapshotId ? NGO_REGISTRY_SUMMARY : null
}
