# LOG-001: The short-link client logs share codes and shared URLs

**Status:** fixed (2026-11-20, on `dev`; deployed with the next Chronos dev pin). **Priority:** P3. A share code grants no access; prod writes no stdout for these lines.

## Summary

`src/lib/api/shortLinks.ts` logs at `info` level:

- `:74` `logger.info("Resolving short link code", { code })`: each `/share/$code` visit, from the route loader
  (`src/routes/share.$code.tsx:14`);
- `:36` `logger.info("Creating short link", { originalUrl })`: each share action. The URL is the shared page's
  state. An alert preset (`src/lib/alert-links.ts:135-143`) carries the alert's title, description, filter and
  conditions.

It was found on 2026-11-19 while testing the Chronos dev noindex change (DEV-CRAWL-001). Its UA log redacts `/share/…`,
but this line printed the code next to it.

## Where it goes

`src/lib/logger/index.ts`:

- **stdout:** only a development runtime writes to the console (`VITE_APP_ENVIRONMENT === "development"`). Chronos
  dev and local dev print both lines; prod does not.
- **Sentry:** `info` becomes a breadcrumb attached to later Sentry events. During SSR, Sentry has no client, so
  nothing happens. In the browser, prod events can carry the code or the shared URL as breadcrumbs.

## Does a code grant access?

No. A code resolves through the API's public endpoint (`GET /api/v1/short-links/{code}`, "Public endpoint" at
`shortLinks.ts:68`) to the URL it shortens. The URL is a page state the user chose to share: chart, map or alert
preset. It opens no account, token or private record. Whoever holds the code can already resolve it.

What the logs add is a record of which shared views were opened. For alert presets, that includes user-written
titles and descriptions, kept in dev logs and in prod Sentry breadcrumbs.

## Fix

Both lines log without their values: no `code` and no `originalUrl`. Every failure inside `createShortLink` and
`resolveShortLinkCode`, endpoint setup included, is thrown and logged as a `ShortLinkFailure` that carries only the
operation and, for a response, its status number (or `not authenticated` when there is no token): never the API's message, error type or status text, the response
body, or what `fetch` or the JSON parser threw. A 2xx answer without a code or URL is a failure too, so the cache
helper (whose query key is the shared URL) never gets `undefined` back. The share page no longer prints a
destination it cannot remap (`src/routes/share.$code.tsx`). The API's not-found message
repeats the code, and its other messages are free text. Callers are unchanged: the share route treats any rejection
as not found, and the share actions fall back to the full URL. This is in its own commit, separate from the noindex
change (root's instruction). Test: `src/lib/api/short-links.test.ts` (a 404, 500 and 502, a 2xx body with
`ok: false`, an unreadable body, and a `fetch` rejection; no code or shared URL in any log line or thrown message).

Not in scope (P3): the code is in the page's own address (`/share/<code>`) and in the API request's URL, so
Sentry's page URL and its automatic fetch breadcrumb carry it, as they carry any address the reader opens. It grants
no access.
