# CACHE-002: A page whose render fails after a successful loader can still go out publicly cached

**Status:** fixed on `dev` (25 November 2026, client-dev-polish; see *The fix*). **Owner:** client-dev-polish, assigned by root when this file lands. **Priority:** P2, gate: before the public
switch. **Related:** `src/lib/http-cache.ts` (`createPublicPageCacheHeaders`), every route that sets `headers` from its loader data
(90 route files use the public helper), CACHE-001. Found by the independent review of the legislation pages (`astra-client-3`, finding
B4, 25 November 2026), filed by client-legislation at the legislation coordinator's request.

## What happens

A route's `headers` callback runs when its match has resolved, before the page renders. Most routes decide from their loader data
alone: `loaderData?.seeded === false ? no-store : public`. If the loader succeeds and the component then fails during the server render
(a thrown error in a lazy component, a failed chunk import, a render-time exception), the response can carry the public header the
callback already returned, and a shared cache (`s-maxage`) may keep the error page for the page's window.

The legislation section's seven pages are out of it, and the sweep below skips them: since 25 November 2026 `/legislation`,
`/legislation/analytics`, `/legislation/search`, `/legislation/acts`, `/legislation/changes`, `/legislation/gazette` and
`/legislation/guide` send `Cache-Control: private, no-store` and `CDN-Cache-Control: no-store` on every path (root's decision below;
`src/routes/legislation/-headers.test.ts`). The act pages are not among them: `/legislation/acts/$actId` still sends the public
helper's headers and `/legislation/acts/$actId/text` sets none of its own, so both stay in the sweep.

## What to decide

- Whether TanStack Start lets a render error replace headers already set (an error boundary or a server middleware that downgrades
  `Cache-Control` to `no-store` on a 5xx or on an error-boundary render), in one place for every route.
- Or whether each public page proves its render in another way (a server-side check of the rendered stream before the headers are
  sent is not available while the response streams).
- Responses that end before route headers (a root search-validation error, a router redirect) carry no route `Cache-Control`; the
  sweep should set a site-wide default (`no-store` for HTML) at the server entry. Examples (review `astra-client-5`, 25 November
  2026): `/legislation/guide?currency=GBP` ends with only the root's `Cache-Control: no-store`; `/legislation/search?historical=false`
  redirects to the default filter before any route header is set. Neither serves page content publicly (the error is `no-store`,
  the redirect has no body), and the order is the framework's, on every route.

## Related: cookies and public headers (root's decision, 25 November 2026)

CACHE-001's follow-up records root's ruling that a page which renders from the reader's cookies sends `Cache-Control: private,
no-store`. Several hubs instead send public headers with `Vary: Accept-Encoding, Cookie` (`/companies`, `/ngos/registry`, `/ins`,
`/entity-analytics`). Root confirmed the CACHE-001 rule when the legislation pages asked: Cloudflare answers `cf-cache-status:
DYNAMIC` for HTML on dev-chronos, so public headers gain no speed today, and Cloudflare does not key on `Vary: Cookie`, so the day HTML
caching is enabled a public page would serve one reader's language to another. `/legislation` and `/legislation/analytics` follow it;
per root, `/public-institutions` and `/map` already do on their own work.

## Who fixes it

client-dev-polish, assigned by root when this file lands: the cross-hub change from public + `Vary: Cookie` to `private, no-store` on
the pages that render from cookies, and the render error that can keep public headers already set. This file changes no other hub.

## What the built server sent (25 November 2026)

A build of `dev` at ed499aec4, every page route of `src/routeTree.gen.ts` with sample parameters (165 paths). 51 sent a public
`Cache-Control`:
- `/`: `public, max-age=3600, s-maxage=3600, stale-while-revalidate=604800`, `Vary: Accept-Encoding`;
- 32 pages at `s-maxage=600, stale-while-revalidate=3600`, `Vary: Accept-Encoding`: `/parlament` and its pages, `/primarie` and its
  pages, `/provocare`, `/legislation/acts/$actId`;
- the `ins` and justice hubs, `/ngos`, `/ngos/registry`, `/companies`, `/public-enterprises` and its authority pages,
  `/procurement/analytics`, `/entities/$cui`, most with `Vary: Accept-Encoding, Cookie`.

Every 404 sent `no-store`. One 500 went out public: `/parlament/voturi/cdep/1` (`s-maxage=600, stale-while-revalidate=3600`), a
render that failed after its loader, the case this file describes.

## The fix (root's decision, 25 November 2026)

- **One helper.** `createPublicPageCacheHeaders` (`src/lib/http-cache.ts`), which the 67 page routes call, now returns
  `Cache-Control: private, no-store` and `CDN-Cache-Control: no-store`, with no `Vary`, whatever policy it is given. Every page renders
  from the reader's cookies through the root route, and a page that is never public can't keep a public header past a failed render
  either. Nothing caches HTML at the edge today, so this costs nothing now; edge caching would need its own design (a cookie-free
  variant of the page). The name is historical: renaming 67 call sites in every hub would collide with every hub session.
- **What stays public:** the four share images (their own headers; they render from the address alone) and the public
  enterprises' versioned `portfolio.json` (now its own header, unchanged).
- **Tests:** `src/lib/http-cache.test.ts`; 15 route tests in `justice`, `procurement` and `public-enterprises` now expect
  `private, no-store` for a whole render.
- **The check:** `scripts/check-built-page-cache-headers.mjs` starts the built server twice, reading the API and with the API
  unreachable, walks every page route (161 paths and a path that is no page), and fails on any `public` or `s-maxage`, whatever the
  status. It also fetches the four share images with and without cookies: public, the same bytes, no `Vary` on cookies, no cookie set.
  On the fix: API read 112×200, 21×404, 3×500; API down 112×200, 15×404, 9×500; none shared-cacheable. CI runs it in the build job.
