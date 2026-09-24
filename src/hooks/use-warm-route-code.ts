import { useEffect } from 'react'
import { useRouter, type AnyRoute } from '@tanstack/react-router'
import { reloadIfCodeFailed, routesToFetch, warmRouteCode } from '@/lib/route-code-warmup'
import type { FileRouteTypes } from '@/routeTree.gen'

/**
 * Code-only warm-ups, reading no data, for what the router's own intent
 * preload (`defaultPreload: 'intent'`, on `<Link>`s) does not reach: a plain
 * `<a>`, and a tap, which gives intent no head start. Chunks are immutable
 * and cached for a year, so one fetched for nothing costs its bytes once.
 * Skipped when the reader asked to save data. The mechanics, and what a
 * failed fetch leads to, are in `src/lib/route-code-warmup.ts`.
 */

/** The longest the idle warm-up waits for an idle moment before it runs anyway. */
const IDLE_TIMEOUT_MS = 4000
/** A pointer resting this long on a link counts as intent — the router's own `preloadDelay`. */
const HOVER_INTENT_MS = 50

function prefersSavingData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData === true
}

/**
 * Fetch one route's code once the browser is idle, for the route a page
 * mostly leads to: a tap on a touch screen gives intent no head start at all.
 */
export function useWarmRouteCode(routeId: FileRouteTypes['id']): void {
  const router = useRouter()

  useEffect(() => {
    const route: AnyRoute | undefined = router.routesById[routeId]
    if (!route || prefersSavingData()) return undefined
    // Not a route on screen: its code is in (see `routesToFetch`).
    const run = () => {
      const mounted = router.state.matches.some((match) => match.routeId === route.id)
      if (!mounted) void warmRouteCode(router, [route])
    }
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
      return () => window.cancelIdleCallback(handle)
    }
    const timer = window.setTimeout(run, IDLE_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [router, routeId])
}

/**
 * The in-app path a link leads to, or null for one that leaves the app, opens
 * elsewhere or downloads. Read from the attribute, not `.href`: an SVG `<a>`
 * (a map's region) carries an `SVGAnimatedString` there.
 */
function internalPath(anchor: Element): string | null {
  const href = anchor.getAttribute('href')
  const opensElsewhere = (anchor.getAttribute('target') || '_self') !== '_self'
  if (!href || opensElsewhere || anchor.hasAttribute('download')) return null
  let url: URL
  try {
    url = new URL(href, window.location.href)
  } catch {
    return null
  }
  return url.origin === window.location.origin ? url.pathname : null
}

function anchorOf(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest('a[href]') : null
}

function within(anchor: Element, node: EventTarget | null): boolean {
  return node instanceof Node && anchor.contains(node)
}

/**
 * For every in-app link, app-wide: fetch its route's code when the reader
 * shows intent — a pointer resting on it, the keyboard focus, a touch
 * beginning. One listener on the document, so every link is covered without
 * opting in. Mounted once, in the app shell, which is also where a
 * navigation to a page whose code failed to arrive becomes a page load, at
 * the router's `onBeforeLoad`.
 */
export function useWarmRouteCodeOnIntent(): void {
  const router = useRouter()

  useEffect(() => {
    const stopRecovery = router.subscribe('onBeforeLoad', ({ toLocation }) => {
      reloadIfCodeFailed(router, toLocation.pathname)
    })
    if (prefersSavingData()) return stopRecovery

    let hoverTimer: number | undefined
    const warmLink = (anchor: Element) => {
      const path = internalPath(anchor)
      if (path !== null) void warmRouteCode(router, routesToFetch(router, path))
    }
    const onPointerOver = (event: MouseEvent) => {
      const anchor = anchorOf(event.target)
      // Moving between a link's own icon and label is not a new intent.
      if (!anchor || within(anchor, event.relatedTarget)) return
      window.clearTimeout(hoverTimer)
      hoverTimer = window.setTimeout(() => warmLink(anchor), HOVER_INTENT_MS)
    }
    const onPointerOut = (event: MouseEvent) => {
      const anchor = anchorOf(event.target)
      if (anchor && !within(anchor, event.relatedTarget)) window.clearTimeout(hoverTimer)
    }
    const onIntentNow = (event: Event) => {
      const anchor = anchorOf(event.target)
      if (anchor) warmLink(anchor)
    }

    document.addEventListener('mouseover', onPointerOver, { passive: true })
    document.addEventListener('mouseout', onPointerOut, { passive: true })
    document.addEventListener('focusin', onIntentNow)
    document.addEventListener('touchstart', onIntentNow, { passive: true })
    return () => {
      stopRecovery()
      window.clearTimeout(hoverTimer)
      document.removeEventListener('mouseover', onPointerOver)
      document.removeEventListener('mouseout', onPointerOut)
      document.removeEventListener('focusin', onIntentNow)
      document.removeEventListener('touchstart', onIntentNow)
    }
  }, [router])
}
