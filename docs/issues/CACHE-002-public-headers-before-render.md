# CACHE-002: A page whose render fails after a successful loader can still go out publicly cached

**Status:** open. **Owner:** client-dev-polish, assigned by root when this file lands. **Priority:** P2, gate: before the public
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
