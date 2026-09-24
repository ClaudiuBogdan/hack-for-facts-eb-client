import { i18n } from '@lingui/core'
import type { AnyRoute, AnyRouter, ParsedLocation } from '@tanstack/react-router'
import { quietChunkLoad, reloadForFreshCode } from '@/lib/chunk-recovery'
import { browserLocaleFor, normalizeLocale } from '@/lib/i18n'

/**
 * Having a route's code before the click. A client-side navigation changes
 * the address at once but keeps the previous page on screen until the next
 * one's code has arrived — a round trip and the chunk's bytes, 1–4s on a slow
 * mobile link, measured — so the only way to make that wait disappear is to
 * fetch the code before the reader asks for it: the router's own preload on
 * intent (`defaultPreload: 'intent'`, which also reads the page's data), and
 * the code-only warm-ups in `src/hooks/use-warm-route-code.ts`.
 *
 * Warm-ups import a route's code themselves, not through
 * `router.loadRouteChunk`: the router keeps the promise `loadRouteChunk` makes
 * and never clears a rejected one (router-core 1.171). At the click the
 * router imports the same module again and finds it loaded.
 *
 * Any fetch the reader did not ask for fails quietly — it must not reload the
 * page they are on — but it cannot be retried in this document: Chromium
 * keeps a failed import failed, and Vite keeps a stylesheet it tried as seen,
 * so the page would come up without its CSS or not at all. The route is
 * remembered instead, and the router loading it — a link, a search result,
 * the back button — becomes a page load, which fetches everything afresh; a
 * fetch that fails after the reader has already set off for the page reloads
 * it the same way.
 */

/** Each route's code fetch, once per document: whether the code arrived. */
const fetches = new WeakMap<AnyRoute, Promise<boolean>>()
/** Routes whose code failed to arrive: this document cannot load them cleanly any more. */
const failed = new WeakSet<AnyRoute>()

type Preloadable = { readonly preload?: () => Promise<unknown> }

/** The routes a path renders, or none for a path no page answers. */
export function routesAt(router: AnyRouter, pathname: string): readonly AnyRoute[] {
  const { foundRoute, matchedRoutes } = router.getMatchedRoutes(pathname)
  return foundRoute ? matchedRoutes : []
}

/**
 * Load the page the router is going to as a new document. The router's
 * history writes a navigation to the browser's address a moment after it
 * tells the router, so it is flushed first — or the reload would load the
 * page the reader is leaving.
 */
function loadAfresh(router: AnyRouter): void {
  router.history.flush()
  reloadForFreshCode()
}

function recordFailure(router: AnyRouter, routes: readonly AnyRoute[]): void {
  for (const route of routes) failed.add(route)
  // The reader set off before the fetch failed: the router found the import
  // in flight (or the stylesheet already seen) and went ahead.
  const going = routesAt(router, router.latestLocation.pathname)
  if (routes.some((route) => going.includes(route))) loadAfresh(router)
}

/**
 * At the start of every router load: a page whose code failed to arrive is
 * loaded as a new document instead. After the link's own handlers and any
 * navigation blocker have had their say, and for navigations no link started.
 */
export function reloadIfCodeFailed(router: AnyRouter, pathname: string): void {
  if (routesAt(router, pathname).some((route) => failed.has(route))) loadAfresh(router)
}

/**
 * What loading a route's page takes: its lazy file (`*.lazy.tsx`), or the
 * component the bundler split out of the route file. Not its error or
 * not-found components, which most visits never need — the router's own
 * preload fetches those, and whatever its loaders import, under the same
 * quiet guard (`quietRoutePreloads`).
 *
 * A split component's wrapper (`lazyRouteComponent`) remembers a failed
 * import itself and, for a missing module, reloads the page when it renders
 * — TanStack's recovery from a stale deploy, with its own once-per-session
 * budget, offline too. That is what the navigation would have met had it
 * fetched the code at the click, so warming it changes when the failure is
 * found, not what follows; online, its reload and `loadAfresh`'s go to the
 * same address.
 */
function codeLoads(route: AnyRoute): ReadonlyArray<() => Promise<unknown>> {
  const loads: Array<() => Promise<unknown>> = []
  if (route.lazyFn) loads.push(route.lazyFn)
  const preload = (route.options.component as Preloadable | undefined)?.preload
  if (preload) loads.push(preload)
  return loads
}

function fetchCode(router: AnyRouter, route: AnyRoute): Promise<boolean> {
  const known = fetches.get(route)
  if (known) return known
  const loads = codeLoads(route)
  const fetch =
    loads.length === 0
      ? Promise.resolve(true)
      : quietChunkLoad(() => Promise.all(loads.map((load) => load()))).then((clean) => {
          if (!clean) recordFailure(router, [route])
          return clean
        })
  fetches.set(route, fetch)
  return fetch
}

/**
 * Fetch the code of the routes a page would render, once per route per
 * document, reading no data. Resolves to whether all of it arrived.
 */
export function warmRouteCode(router: AnyRouter, routes: readonly AnyRoute[]): Promise<boolean> {
  return Promise.all(routes.map((route) => fetchCode(router, route))).then((arrived) =>
    arrived.every(Boolean),
  )
}

/**
 * The routes whose code going to this path has to fetch: those the page on
 * screen does not already render. Never the root or a mounted layout: their
 * code is in, so a failure put down to them could only be a false alarm, and
 * it would turn every navigation beneath them into a page load.
 */
export function routesToFetch(router: AnyRouter, pathname: string): readonly AnyRoute[] {
  const mounted = new Set(router.state.matches.map((match) => match.routeId))
  return routesAt(router, pathname).filter((route) => !mounted.has(route.id))
}

/**
 * Whether loading this address would switch the page's language. A preload
 * runs every `beforeLoad` of its address, the root's included, and the root
 * activates the language it resolves for the address (`browserLocaleFor`:
 * `?lang=`, `/en/…`, then the saved preference); hovering a link must not
 * translate the page under the pointer.
 */
function switchesLanguage(location: Pick<ParsedLocation, 'pathname' | 'searchStr'>): boolean {
  const active = normalizeLocale(i18n.locale)
  return active !== null && browserLocaleFor(location) !== active
}

/**
 * The router's own preloads (`defaultPreload: 'intent'`, a `<Link preload>`)
 * made safe to run speculatively. None for an address in another language.
 * The page's code is fetched first, through the route's own imports, and
 * the router's preload runs only once it has arrived — a page whose code did
 * not arrive is not preloaded at all: the navigation to it will be a page
 * load (`reloadIfCodeFailed`), and the router's own chunk loading would keep
 * the failure (a rejected promise it never clears) and reject one more that
 * nobody handles, which the app's chunk recovery answers by reloading the
 * page being read. The router's preload is quiet too: it fetches the error
 * and not-found components, and its loaders import modules of their own; a
 * failure there is put down to the page, like one of its own code's. Browser
 * only.
 */
export function quietRoutePreloads(router: AnyRouter): void {
  const preloadRoute = router.preloadRoute
  router.preloadRoute = (async (options: Parameters<typeof preloadRoute>[0]) => {
    // A `<Link>` hands over the location it has already built.
    const next =
      (options as { readonly _builtLocation?: ParsedLocation })._builtLocation ??
      router.buildLocation(options as Parameters<typeof router.buildLocation>[0])
    if (switchesLanguage(next)) return undefined
    const routes = routesToFetch(router, next.pathname)
    if (!(await warmRouteCode(router, routes))) return undefined
    // The fetch may have outlasted a change of language.
    if (switchesLanguage(next)) return undefined
    let matches: Awaited<ReturnType<typeof preloadRoute>> | undefined
    const clean = await quietChunkLoad(async () => {
      matches = await preloadRoute(options)
    })
    if (!clean) recordFailure(router, routes)
    return matches
  }) as typeof preloadRoute
}
