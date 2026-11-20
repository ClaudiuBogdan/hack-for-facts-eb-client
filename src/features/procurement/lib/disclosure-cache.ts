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

/**
 * A browser's direct-purchase query (D6, root 19 November 2026): never fresh
 * past its read, so a page mounted again reads again; gone half a minute after
 * no page shows it. The API is the one enforcer; the only windows are the
 * CDN's and the open-tab bound.
 */
export const DA_QUERY_CACHE = { staleTime: 0, gcTime: 30 * 1000, refetchOnMount: seedStands } as const

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
