type PublicPageCachePolicy = {
  browserMaxAgeSeconds?: number;
  sharedMaxAgeSeconds: number;
  staleWhileRevalidateSeconds: number;
  vary?: readonly string[];
};

const DEFAULT_BROWSER_MAX_AGE_SECONDS = 0;
const DEFAULT_CACHE_VARY_HEADER = "Accept-Encoding";

function buildSharedCacheControl(policy: PublicPageCachePolicy): string {
  return [
    `s-maxage=${policy.sharedMaxAgeSeconds}`,
    `stale-while-revalidate=${policy.staleWhileRevalidateSeconds}`,
  ].join(", ");
}

export function createPublicPageCacheHeaders(
  policy: PublicPageCachePolicy,
): Record<string, string> {
  if (import.meta.env.DEV) {
    // Avoid stale SSR HTML during local development/HMR, which can trigger hydration mismatches.
    return createNoStoreHeaders();
  }

  // IMPORTANT: Use only for fully public SSR responses.
  // If SSR includes auth/session/personalized/sensitive data, do not use this.
  // Use `createNoStoreHeaders()` and disable Nitro route cache for that route.
  const browserMaxAgeSeconds =
    policy.browserMaxAgeSeconds ?? DEFAULT_BROWSER_MAX_AGE_SECONDS;
  const sharedCacheControl = buildSharedCacheControl(policy);

  return {
    "Cache-Control": `public, max-age=${browserMaxAgeSeconds}, ${sharedCacheControl}`,
    "CDN-Cache-Control": sharedCacheControl,
    Vary: (policy.vary ?? [DEFAULT_CACHE_VARY_HEADER]).join(", "),
  };
}

export function createNoStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
  };
}
