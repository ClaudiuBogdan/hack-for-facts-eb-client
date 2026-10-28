import { hashKey, type QueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { createServerMemo } from '@/lib/ssr/server-memo'
import { parliamentHubScreenQueries } from '../hooks/parliament-hub-queries'

/**
 * The parliament hub's first screen, read by the route loader.
 *
 * On the server every read the hub tab makes is fetched before the render and
 * put in the request's query cache under the key its hook uses; the router's
 * query integration sends the cache with the HTML, so the page renders with
 * its votes, bills, agenda and groups, and the browser makes none of these
 * reads after hydration. Each read is kept in the server process for as long
 * as a shared cache may keep the page (`s-maxage=600`, ten minutes): the data
 * is loaded once a day.
 *
 * TanStack Start sends no HTML until the loader resolves, so each read runs
 * under a deadline. A read that fails or runs past it is left out of the
 * cache: its section renders its loading state, the browser reads it after
 * hydration as it always did, and the render goes out uncached.
 *
 * In the browser (a client-side navigation, or a hover's preload) the loader
 * only starts the same reads and returns at once.
 */

const SSR_DEADLINE_MS = 5_000
const KEEP_MS = 10 * 60 * 1000

const logger = createLogger('parliament-hub-ssr')
const reads = createServerMemo<unknown>(KEEP_MS, { maxEntries: 32 })

export interface ParliamentHubSeed {
  /** False when a read failed or missed the deadline: that render is not worth a shared cache. */
  readonly complete: boolean
}

/**
 * The read, failing once `ms` have passed. The deadline belongs to the read
 * itself, not to one render's wait: the memo drops a read that failed, so a
 * stalled flight is let go and the next render asks again, instead of every
 * render for ten minutes waiting out the same stalled promise.
 */
function within<T>(read: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Parliament hub read: deadline of ${String(ms)} ms passed`)),
      ms,
    )
    // A timer must not keep the server process alive for a response already sent.
    if (typeof timer === 'object' && 'unref' in timer) timer.unref()
    read.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

export async function seedParliamentHubForSsr(
  queryClient: QueryClient,
  today: Date = new Date(),
): Promise<ParliamentHubSeed> {
  const outcomes = await Promise.all(
    parliamentHubScreenQueries(today).map(async (query) => {
      const key = hashKey(query.queryKey)
      try {
        const data = await reads(key, () => within(query.queryFn(), SSR_DEADLINE_MS))
        queryClient.setQueryData(query.queryKey, data)
        return true
      } catch (error) {
        logger.warn('Parliament hub server read failed', {
          key,
          message: error instanceof Error ? error.message : String(error),
        })
        return false
      }
    }),
  )
  return { complete: outcomes.every(Boolean) }
}

/** A client-side navigation: start the reads the page will make, and return. */
export function prefetchParliamentHub(
  queryClient: QueryClient,
  today: Date = new Date(),
): void {
  for (const query of parliamentHubScreenQueries(today)) {
    void queryClient.prefetchQuery(query)
  }
}
