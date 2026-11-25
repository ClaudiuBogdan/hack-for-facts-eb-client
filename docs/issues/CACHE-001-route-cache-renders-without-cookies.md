# CACHE-001: The Nitro route cache rendered pages without the reader's cookies

**Status:** fixed on `dev` (25 November 2026) by f8137a055 (`/map`, `/entity-analytics`) and the commit that adds this file (`/`,
`/entities/**`, `/budget-explorer`); the pages' own cache headers are open (see *Follow-up*). **Priority:** P2, gate: before the public
switch. **Related:** `nitro.config.ts`, `scripts/check-built-cookie-render.mjs`. Reported by client-map (25 November 2026), traced and
measured by client-dev-polish, ruled by root (option A on every route).

## What happened

Pages with a Nitro route cache were rendered on the server without the reader's cookies. With `Cookie: user-locale=en` and no `?lang=en`,
a production build answered `<html lang="ro">` and the Romanian title on `/`, `/map` and `/entity-analytics`, while `/procurement` and
`/entities/<cui>` (not cached) answered `lang="en"`. Every cookie the server render reads fell back to its default the same way: the
language, the theme, the currency, the inflation setting and the dismissed page notices. The browser corrected the language after
hydration, so the server HTML and the title were wrong for a reader who chose English by the cookie only.

## Cause

Every cached rule had `varies: ["cookie"]`. ocache 0.1.5, which Nitro 3.0.260610-beta uses for route rules, hashes the varied headers into
the cache key but strips them from the request it renders: `defineCachedHandler` keeps the headers that are *not* in `varies`
(`ocache/dist/index.mjs`, the `filteredHeaders` line), the reverse of what Nitro's documentation says. The key did depend on the cookie;
the render never saw it.

## Effects (measured on a production build, 25 November 2026)

- **A copy per visitor.** The key hashes the whole `Cookie` header, so each distinct combination of cookies stored its own copy of the
  same page, kept for `maxAge + staleMaxAge` (about 7 days on `/`, 24 hours on `/entity-analytics`, 1 hour on `/map`). On `/` the page is
  712 KB; 50 visits with distinct cookies raised the server's resident memory from 285 to 398 MB.
- **Dismissed notices came back.** The page notice reads its dismissal cookie in the server render (`page-notice-cookie.ts`), so on a
  cached path with a notice (`/entity-analytics`) a dismissed notice was rendered again on every load. This follows from the same strip;
  it was not reproduced on its own.
- **The cache saved little.** On `/`, a cache hit took 9 ms (median of 10, p90 15) and a render per request 32 ms (p90 38).
- **Two rules did nothing.**
  - `"/entities/**/share-image.png": { cache: false }` compiles to `/entities/**`: the matcher ignores what follows `**`. It is merged
    after `"/entities/**"` and deleted that rule's cache, so entity pages were never cached (hit 377 ms against render 375 ms, median).
  - `/budget-explorer` answers a 301 to `/national-budget`, so its cache only stored the redirect (1.7 ms uncached, median).

## Fix

No page has a route cache now: `/map` and `/entity-analytics` are `cache: false`, and the rules for `/`, `/entities/**` and
`/budget-explorer` are gone with their shared options. The share-image rule stays as it was, with a comment saying what it matches.
`scripts/check-built-cookie-render.mjs` starts the built server and asks `/`, `/map` and `/entity-analytics` for their page with
`user-locale=en` (expects `lang="en"`) and without it (`lang="ro"`); CI runs it after the build. It failed on a build with the cache and
passes without it.

## Follow-up

A page that renders from cookies still sends `Cache-Control: public, max-age=…, s-maxage=…` (`createPublicPageCacheHeaders`), so a
browser may keep one reader's variant for up to an hour (`/` 3,600 s, `/map` 300 s). Root's ruling: each such page sends
`Cache-Control: private, no-store`, as `/procurement` does, changed by the page's owner (client-map for `/map`,
client-entity-analytics for `/entity-analytics` in its redesign).
