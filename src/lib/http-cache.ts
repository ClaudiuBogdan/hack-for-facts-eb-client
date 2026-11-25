/**
 * The cache policy a page route asks for. Kept for the call sites; since
 * CACHE-002 the answer no longer depends on it (see below).
 */
type PublicPageCachePolicy = {
  browserMaxAgeSeconds?: number;
  sharedMaxAgeSeconds: number;
  staleWhileRevalidateSeconds: number;
  vary?: readonly string[];
};

/**
 * The headers of an HTML page: `private, no-store`, never a shared cache.
 *
 * The name is historical (CACHE-002, 25 November 2026). Every page renders from
 * the reader's cookies through the root route (the language, the theme, the
 * currency and inflation preferences, dismissed notices), so a shared copy
 * would serve one reader's page to another; `Vary: Cookie` wouldn't help, as
 * Cloudflare does not key on it. A render that fails after its loader also
 * kept the public header it had already been given (a 500 cached for its
 * window). Nothing caches HTML at the edge today, so this costs nothing now;
 * edge caching would need its own design (a cookie-free variant of the page).
 * Not renamed, to keep the 67 call sites in every hub untouched; images and
 * data that don't read cookies (the share images) set their own headers.
 */
export function createPublicPageCacheHeaders(
  _policy: PublicPageCachePolicy,
): Record<string, string> {
  return {
    "Cache-Control": "private, no-store",
    "CDN-Cache-Control": "no-store",
  };
}

export function createNoStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
  };
}
