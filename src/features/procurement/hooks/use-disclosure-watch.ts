import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient, type Query, type QueryClient } from '@tanstack/react-query'
import { readDisclosureNow } from '../api/procurement-da-release-status'

/**
 * D6 in an open tab (owner via root): a supplier withheld by a nightly
 * publish disappears within one publish, also from a tab left open on a page
 * read before it. While the cache holds procurement answers, the release's
 * publication is read once a minute (backing off on failures, so an idle tab
 * never loads the API); when it changes, every procurement answer is reset —
 * dropped at once, and the ones on screen read afresh.
 */

/** The cache roots whose answers can carry a direct-purchase supplier or its money. */
const WATCHED_ROOTS: readonly unknown[] = ['procurement', 'public-enterprise']
const WATCH_KEY = ['da-disclosure'] as const
/** Never more often than this (root: ≥ 60 s). */
export const WATCH_INTERVAL_MS = 60_000
/** The longest a failing watcher waits between reads. */
export const WATCH_MAX_BACKOFF_MS = 15 * 60_000

export function isWatchedQuery(query: Pick<Query, 'queryKey'>): boolean {
  return WATCHED_ROOTS.includes(query.queryKey[0])
}

/** The wait before the next read: a minute, doubling per failure in a row, to a quarter of an hour. */
export function watchIntervalOf(failures: number): number {
  return Math.min(WATCH_INTERVAL_MS * 2 ** Math.max(0, failures), WATCH_MAX_BACKOFF_MS)
}

/** Whether the cache holds anything to watch for. */
function useHoldsWatched(client: QueryClient): boolean {
  return useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notify),
    () => client.getQueryCache().getAll().some(isWatchedQuery),
    () => false,
  )
}

export function useDisclosureWatch(): void {
  const client = useQueryClient()
  const holds = useHoldsWatched(client)
  const watch = useQuery({
    queryKey: WATCH_KEY,
    queryFn: readDisclosureNow,
    enabled: holds,
    retry: false,
    staleTime: WATCH_INTERVAL_MS,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => watchIntervalOf(query.state.status === 'error' ? query.state.fetchFailureCount : 0),
    refetchIntervalInBackground: true,
  })
  const seen = useRef<string | null>(null)
  const version = watch.data ?? null
  useEffect(() => {
    if (version === null) return
    const before = seen.current
    seen.current = version
    // A new publication: no answer of the old one stays, on screen or in the cache.
    if (before !== null && before !== version) void client.resetQueries({ predicate: isWatchedQuery })
  }, [client, version])
}

/** Mounted once in the app shell: renders nothing. */
export function DisclosureWatch(): null {
  useDisclosureWatch()
  return null
}
