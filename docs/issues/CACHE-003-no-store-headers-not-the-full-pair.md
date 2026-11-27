# CACHE-003: Some HTML answers say `no-store` without `private` or `CDN-Cache-Control`

**Status:** open. **Owner:** client-dev-polish. **Priority:** P3: nothing is cached today, since every answer below carries `no-store`.
**Related:** CACHE-002 (every HTML page sends `Cache-Control: private, no-store` and `CDN-Cache-Control: no-store`),
`src/lib/http-cache.ts` (`createNoStoreHeaders`), `src/lib/ssr/da-name-scope.ts`, `scripts/check-built-page-cache-headers.mjs`.
Found in the live check of the new error pages on dev-chronos (26 November 2026, pin 3d4b7804c), filed at root's request.

## What happens

CACHE-002 made `createPublicPageCacheHeaders` return the pair `Cache-Control: private, no-store` and `CDN-Cache-Control: no-store`.
The other helper, `createNoStoreHeaders`, still returns `Cache-Control: no-store` alone, and the answers that use it, or set their
own header, send less than the pair:

| Answer (dev-chronos, 26 November 2026) | `Cache-Control` | `CDN-Cache-Control` |
|---|---|---|
| `/` | `private, no-store` | `no-store` |
| an unknown address (`/no-such-page-xyz`, 404) | `no-store` | none |
| `/procurement` | `no-store` | `no-store` |

- The 404 gets the root route's `headers: () => createNoStoreHeaders()` (`src/routes/__root.tsx:40`); no child route adds its own.
- `createNoStoreHeaders` is used by 34 route files besides the root (admin, `/companies/analytics`, `/entities/$cui`, the INS pages,
  the justice pages, the national budget's analytics, `/ngos/registry`, …), most on their unseeded or failed-read branch.
- `/procurement`'s pair comes from the DA name scope (`da-name-scope.ts`), which sets `no-store` on both fields but without `private`.

No answer is cacheable: `no-store` in `Cache-Control` already keeps browsers and Cloudflare from storing it, and the built-server check
(`check-built-page-cache-headers.mjs`) passes because it asks for "not shared-cacheable", not for the exact pair.

## What to do

- Make `createNoStoreHeaders` return the same pair as `createPublicPageCacheHeaders`, so the root (and with it every not-found and
  root-level answer) and the 34 routes send it from one place.
- Give the DA name scope's `Cache-Control` the `private` directive, or leave it and say why (it rewrites a response another route
  already headed).
- Tighten the built-server check to expect the pair on every HTML path, the 404 included, so a route that sends less fails the build.
