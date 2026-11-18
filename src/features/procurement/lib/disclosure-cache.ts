/**
 * The shared-cache policy of a procurement page that shows direct-purchase
 * money or suppliers. Decision D6 (owner via root): a supplier withheld by a
 * publish disappears within it, so a CDN keeps the page ten minutes at most
 * and never serves it stale past that — no stale-while-revalidate, which
 * would carry a page across a publish. Purging on publish is not the client's
 * to do; this bounds what a purge would.
 */
export const DA_DISCLOSURE_CACHE = { sharedMaxAgeSeconds: 600, staleWhileRevalidateSeconds: 0 } as const

/** How long a browser keeps a direct-purchase read before reading it again: no longer than the shared cache. */
export const DA_DISCLOSURE_STALE_MS = 10 * 60 * 1000
