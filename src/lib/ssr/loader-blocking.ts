/**
 * When a route loader is allowed to block on the network.
 *
 * Several profile routes await their API calls in the loader so that the
 * server-rendered document carries real data — crawlers and scrapers must not
 * receive an empty shell. The cost of that `await` is invisible on the server
 * and brutal in the browser: on a client-side navigation TanStack Router keeps
 * the *previous* page on screen until the loader settles, so a ~1s query reads
 * as a dead click. Measured on `/procurement` → institution profile, that was
 * ~1.4s of frozen UI with no feedback at all.
 *
 * The split below is the whole fix: block while rendering HTML, never block a
 * client-side navigation. Components already own a loading state for the
 * client path, so the page frame paints immediately and the data streams in.
 */
export function shouldBlockLoaderForSsr(): boolean {
  return typeof globalThis.window === 'undefined'
}
