import { rootRouteId, type Manifest, type RouterManagedTag } from '@tanstack/react-router'

/**
 * The root route's chunk preloads the head leaves out: every one but the
 * client entry's own.
 *
 * The build lists the entry and every chunk it imports statically (about
 * 135) as root preloads, and TanStack writes them all into every page's head.
 * They start together with the stylesheet, the only render-blocking request,
 * and on a slow link they leave it a small share: first paint waited ≈7 s on
 * the mobile profile. The entry imports those chunks itself, so the browser
 * still fetches them as soon as the entry arrives; without the preloads, the
 * stylesheet goes first (2026-10-27 audit, PERF-002).
 */
export function getDeferredRootPreloads(manifest: Manifest | undefined): ReadonlySet<string> {
  const root = manifest?.routes[rootRouteId]
  if (!root?.preloads?.length) return new Set()
  const entrySources = new Set<unknown>((root.scripts ?? []).map((script) => script.attrs?.src))
  const deferred = new Set<string>()
  for (const preload of root.preloads) {
    const href = typeof preload === 'string' ? preload : preload.href
    if (!entrySources.has(href)) deferred.add(href)
  }
  return deferred
}

function isScriptPreload(tag: RouterManagedTag): boolean {
  if (tag.tag !== 'link') return false
  const rel = tag.attrs?.rel
  return rel === 'modulepreload' || (rel === 'preload' && tag.attrs?.as === 'script')
}

/** The head's tags without the preloads `getDeferredRootPreloads` names. */
export function withoutDeferredPreloads({
  tags,
  deferred,
}: {
  readonly tags: readonly RouterManagedTag[]
  readonly deferred: ReadonlySet<string>
}): RouterManagedTag[] {
  if (deferred.size === 0) return [...tags]
  return tags.filter((tag) => !(isScriptPreload(tag) && deferred.has(String(tag.attrs?.href))))
}
