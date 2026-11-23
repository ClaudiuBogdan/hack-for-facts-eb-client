import type { Query, QueryCache } from '@tanstack/react-query'
/**
 * The shared-cache policy of a procurement page that shows direct-purchase
 * money or suppliers. Decision D6 (owner via root): a supplier withheld by a
 * publish disappears within it, so a CDN keeps the page ten minutes at most
 * and never serves it stale past that — no stale-while-revalidate, which
 * would carry a page across a publish. Purging on publish is not the client's
 * to do; this bounds what a purge would.
 */
export const DA_DISCLOSURE_CACHE = { sharedMaxAgeSeconds: 600, staleWhileRevalidateSeconds: 0 } as const

/**
 * Whether a mount reads again: not while the query holds only the server's
 * seed (root, 19 November 2026). A seed reaches a query only through
 * `isSeedCurrent` (the newest publication, read by the server within the
 * bound), so it is already inside the ruled window, and reading it again on
 * mount would buy no privacy for six to ten more requests a view. Once the
 * query has read for itself, a mount reads again (it is never fresh).
 */
function seedStands(query: { readonly state: { readonly dataUpdateCount: number } }): boolean {
  return query.state.dataUpdateCount > 0
}

/** Marks a query that can carry a direct-purchase supplier's name (`removeDaQueriesWhenUnshown`). */
export const DA_NAMES_META = 'daSupplierNames'

/**
 * A browser's direct-purchase query (D6, root 19 November 2026): never fresh
 * past its read, so a page mounted again reads again. Once a page has shown
 * it, it goes as soon as no page shows it (root ruling 2026-11-22 under API
 * 22a47bb2: supplier names are not covered by any key, so none is kept past
 * the page that read it). One read ahead of its page and never shown (a
 * prefetch) goes half a minute later. The API is the one enforcer; the only
 * windows are the open page and the CDN's for renders that name no DA
 * supplier.
 */
export const DA_QUERY_CACHE = { staleTime: 0, gcTime: 30 * 1000, refetchOnMount: seedStands, meta: { [DA_NAMES_META]: true } } as const

/**
 * Removes a direct-purchase query once no page shows it (root ruling
 * 2026-11-22 under 22a47bb2), in flight or not: a removed query's fetch is
 * cancelled.
 *
 * - A query is name-bearing once any observer or its own options carried the
 *   marker; an unmarked observer of the same key later doesn't clear it.
 * - The removal waits for the current commit: a page that takes over the same
 *   key (a navigation between two pages sharing it) subscribes to the same
 *   query first, and keeps it (it reads again as any mount does: the seed
 *   rule). Only a query still unobserved and still the cache's own is removed.
 * - A hydrated seed no page has shown yet is untouched: it has no observer to
 *   lose. One read ahead and never shown goes when its 30 s run out.
 *
 * Returns the unsubscribe.
 */
export function removeDaQueriesWhenUnshown(cache: QueryCache): () => void {
  const named = new WeakSet<Query>()
  const pending = new Set<ReturnType<typeof setTimeout>>()
  const marked = (meta: Readonly<Record<string, unknown>> | undefined) => meta?.[DA_NAMES_META] === true
  const stop = cache.subscribe((event) => {
    // Marked by any observer, or by its own options when it was made (a prefetch): later options don't clear it.
    if (event.type === 'added' && marked(event.query.meta)) named.add(event.query)
    if (event.type === 'observerAdded' && marked(event.observer.options.meta)) named.add(event.query)
    if (event.type !== 'observerRemoved') return
    const query = event.query
    if (!(named.has(query) || marked(query.meta)) || query.getObserversCount() > 0) return
    const timer = setTimeout(() => {
      pending.delete(timer)
      if (query.getObserversCount() === 0 && cache.get(query.queryHash) === query) cache.remove(query)
    }, 0)
    pending.add(timer)
  })
  return () => {
    stop()
    for (const timer of pending) clearTimeout(timer)
    pending.clear()
  }
}

/** How long one answer about the release (its switches and publications) holds on the server: a minute. */
export const DA_RELEASE_STATUS_TTL_MS = 60 * 1000

/**
 * The longest a supplier withheld by a publish can still be shown after it:
 * a server render keys its memos by a release status up to a minute old, and
 * a CDN keeps the page it rendered for ten minutes more (root, 19 November
 * 2026). Open tabs are held to it too: they drop the name at their next
 * successful status poll, and past this bound without one they drop what they
 * show and ask nothing until a poll succeeds (`use-disclosure-watch`,
 * `UNREADABLE_AFTER_MS`). Withdrawing a single name sooner takes a CDN purge,
 * which is the owner's account action, never the client's.
 */
export const DA_DISCLOSURE_CHANGE_BOUND_SECONDS = DA_RELEASE_STATUS_TTL_MS / 1000 + DA_DISCLOSURE_CACHE.sharedMaxAgeSeconds

/** A direct-purchase route's loader data, once its page is left or a preload unused: kept nowhere (root, 19 November 2026). */
export const DA_ROUTE_CACHE = { gcTime: 0, preloadGcTime: 0 } as const
