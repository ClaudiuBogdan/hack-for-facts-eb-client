# PERF-017: HTML caching works against itself: Nitro's route cache rewrites headers, keys on cookies the app sets on every visit, and renders without them

## Summary

Four separate behaviours make the HTML cache unhelpful, and on some pages harmful.

1. **Nitro's route cache** (`/`, `/entity-analytics`, `/map`, `/budget-explorer`):
   - it overwrites the routes' `Cache-Control` with `max-age=<cache maxAge>`;
   - it keys entries on the whole `Cookie` header;
   - it strips that header from the request it renders, so it always renders Romanian and light, even for a
     visitor whose cookies say `en` or `dark`.
2. **Cookies on every visit:** the app writes default preference cookies on every mount, and Clerk's development
   instance sets per-browser cookies. So a second visit never matches the first visit's entries.
   - On `/entity-analytics`, which also sends `Vary: Cookie`, every repeat visit misses both the browser cache
     and Nitro. It then waits for a ≈680 ms ranking query again, for a repeat TTFB of 661–705 ms against 95–111 ms.
3. **Most other routes** send `max-age=0` or `no-store` without a validator, so a repeat view downloads the HTML
   again. On `/companies` that makes the mobile repeat FCP 0.92 s against 0.26 s on `/`.
4. **Cloudflare** caches no HTML (`cf-cache-status: DYNAMIC` everywhere).

## Where

- **Nitro rule:** `nitro.config.ts:3-8,24-45`. It covers `/`, `/entities/**` (dead by accident; the page moved),
  `/entity-analytics`, `/map` and `/budget-explorer`, all with `varies: ["cookie"]` and `swr`. `maxAge` /
  `staleMaxAge` in seconds: `/` 3600 / 604800; `/entities/**` and `/entity-analytics` 300 / 86400; `/map`
  300 / 3600; `/budget-explorer` 3600 / 86400.
- **ocache and h3 behaviour:**
  - `node_modules/ocache/dist/index.mjs:271-277` strips the varied headers from the rendered request;
  - `:283` buffers the whole body;
  - `:333` → `node_modules/h3/dist/h3.mjs:1854` (`handleCacheHeaders`) sets `Cache-Control`.
- **Route headers:**
  - `src/routes/index.tsx:12-17` (`max-age=3600`);
  - `src/routes/__root.tsx:61` (`no-store`);
  - `src/lib/http-cache.ts:8` (`max-age=0`);
  - `src/routes/entity-analytics.tsx:24` (`Vary: Accept-Encoding, Cookie`);
  - `src/routes/companies.index.tsx:48-54` (`max-age=0`, no ETag or Last-Modified).
- **Cookie writers:**
  - `src/lib/hooks/useUserCurrency.ts:33-35` and `src/lib/hooks/useUserInflationAdjusted.ts:39` write on every
    mount, even at the default value;
  - Clerk's development cookies ([PERF-012](PERF-012-clerk-eager.md)).
- **Domains:** `/`, `/entity-analytics`, `/map` (Nitro); every page for Cloudflare and the repeat-view HTML.

## Evidence

- **`/entity-analytics` repeat-view TTFB:**

  | | desktop | mobile |
  |---|---:|---:|
  | deployed, repeat | 705 ms | 661 ms |
  | local, repeat | 698 ms | 723 ms |
  | cold (no cookies yet) | 111 ms | 95 ms |

  Each repeat view makes one SSR `EntityAnalytics` call (747 ms, `local/entity-analytics-mobile/run1-warm.json`).
- **The cookie miss on deployed** (curl): with no cookie, 112 ms (`x-envoy-upstream-service-time: 6`); with a
  unique cookie, 758–799 ms (upstream 664–711 ms). Source: local-budgets-3.
- **Header rewrite:** `/map` and `/entity-analytics` reach browsers with `max-age=300` although their routes ask
  for `max-age=0`. This is seen on both targets.
- **Locale and theme ignored:** `/`, `/map` and `/entity-analytics` render `lang="ro" class="light"` with
  `user-locale=en; ui-theme=dark` cookies (curl, both targets). Non-cached routes honour those cookies.
  - In a browser with `user-locale=en`, the server `h1` of `/` is replaced on the client, which is a hydration
    mismatch and a client render (home-1, agent-browser probe).
- **Repeat views without a validator:** the mobile repeat-view FCP is 0.84–1.12 s on the hubs that send
  `max-age=0` or `no-store`, against 0.26 s on `/`, which is served from the browser cache.
  - `/companies` 916 ms, `/ngos` 944 ms, `/alegeri` 876 ms (`no-store`, the document waits 567–573 ms),
    `/parlament` 0.84–1.12 s, `/legislation` (215 ms document wait);
  - `/justice`, `/procurement`, `/public-enterprises` and `/ins` (`max-age=0`) re-download the HTML too;
  - sources: companies-3, ngos-4, elections-4, pe-4 and the parliament, justice and legislation shared
    sections.
- **Several pods:** deployed runs more than one pod. Alternating requests returned `/entity-analytics` entries
  with different `last-modified` times, one of them 1 h 43 min stale and served under SWR.

## Root cause

- The Nitro route cache was configured to vary on cookies. ocache implements `varies` by hashing those headers
  into the key and removing them from the request it renders, and h3 then writes its own `Cache-Control`.
- The app sets cookies on every first visit, even for default preferences.
- No CDN rule caches HTML.

## Proposed fix

1. **Render cookie-free HTML for the cached routes**, and apply theme and locale on the client before paint.
   The inline theme script already exists for theme. Then use `varies: []`, or drop the Nitro rule for `/`, where
   it saves ≈30 ms.
2. **Do not write preference cookies at their defaults.** Remove `Cookie` from `/entity-analytics`'s `Vary`.
3. **Set `Cache-Control` explicitly after the cached handler**, or move HTML caching to Cloudflare with a cache
   rule that bypasses on the locale and theme cookies. Shorten `/`'s browser `max-age=3600`: after a deploy, a
   returning visitor keeps the old build's HTML for up to an hour.
4. **For non-cached hubs**, send an `ETag` or `Last-Modified` so repeat views revalidate with a 304, or a short
   `max-age` with `stale-while-revalidate`.
5. **Server:** speed up or cache the default ranking query
   (`hack-for-facts-eb-server/src/modules/budget/shell/repo/rankings.ts`).

## Expected impact

- **`/entity-analytics`:** −0.6 s TTFB and LCP on every repeat visit.
- **EN/dark visitors on `/`, `/map` and `/entity-analytics`:** no client re-render.
- **Hub repeat views:** ≈−0.65 s FCP on mobile.
- **Pod memory:** fewer duplicate cache entries.

## How to verify

1. `curl -s -H 'Cookie: user-locale=en' https://dev-chronos.transparenta.eu/ | grep -o '<html[^>]*>'` should show
   `lang="en"`, or the page should apply the locale client-side with no mismatch.
2. Repeat-view TTFB on `/entity-analytics` should be ≤ 120 ms.
3. `/companies` repeat views should show a 304 or a cache hit.

## Owner

client and infra; server for the ranking query

## Severity

**P2**: the costs are measurable and local: correctness for EN/dark visitors, 0.6 s per repeat visit on
`/entity-analytics`, and ≈0.65 s per repeat view on the hubs.

The Cloudflare part is known in `docs/entity-page-ssr-loading.md:129-131`; the rest is new.
