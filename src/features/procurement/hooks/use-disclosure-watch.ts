import { markVerifiedPublication } from '../lib/disclosure-seed'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient, type Query, type QueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { readDisclosureNow } from '../api/procurement-da-release-status'

/**
 * D6 in an open tab (owner via root): a supplier withheld by a nightly
 * publish disappears within one publish, also from a tab left open on a page
 * read before it. While the cache holds procurement answers, the release's
 * publication is read once a minute (backing off on failures, so an idle tab
 * never loads the API); when it changes, or the page was served from another
 * publication than the one read, every procurement answer is dropped — never
 * reset to a server seed — and the page's loaders run again.
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

/** The publications the current page's server render was read under (`disclosure` on its loaders' data). */
export function seedVersionsOf(matches: readonly { readonly loaderData?: unknown }[]): readonly (string | null)[] {
  return matches.flatMap((match) => {
    const data = match.loaderData
    return data && typeof data === 'object' && 'disclosure' in data ? [(data as { readonly disclosure?: string | null }).disclosure ?? null] : []
  })
}

/**
 * Drop every answer of the old publication: stop their reads (a follow-up
 * would carry an old supplier's code), remove them — a reset would bring back
 * a server seed — and run the page's loaders again, which in the browser seed
 * nothing, so every read starts from the new publication.
 */
export async function purgePublication(client: QueryClient, invalidate: () => Promise<unknown>): Promise<void> {
  await client.cancelQueries({ predicate: isWatchedQuery })
  client.removeQueries({ predicate: isWatchedQuery })
  await invalidate()
}

export function useDisclosureWatch(): void {
  const client = useQueryClient()
  const router = useRouter()
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
    // First: no render from here on uses a seed of another publication, whatever loader data it still holds.
    markVerifiedPublication(version)
    // A new publication since the last reading, or a page served (a CDN copy) from another one than the one read now.
    const changed = before !== null ? before !== version : seedVersionsOf(router.state.matches).some((seed) => seed !== version)
    if (changed) void purgePublication(client, () => router.invalidate())
  }, [client, router, version])
}

/** Mounted once in the app shell: renders nothing. */
export function DisclosureWatch(): null {
  useDisclosureWatch()
  return null
}
