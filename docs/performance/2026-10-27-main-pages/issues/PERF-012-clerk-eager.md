# PERF-012: Clerk's development instance loads for every anonymous visitor, and its arrival makes React throw away streamed server HTML

## Summary

`ClerkProvider` mounts on every page and loads clerk-js from Clerk's **development** instance (`pk_test`,
`*.clerk.accounts.dev`). Each first visit pays for it:

- **Bytes and time:** ≈300 KB zstd from a third-party host; three FAPI requests in two sequential round trips
  (`dev_browser`, then `environment` and `client` in parallel); and ≈270 ms of mobile main thread.
- **Cookies:** the `__clerk_db_jwt*` and `__client_uat*` cookies it sets on every visitor feed
  [PERF-017](PERF-017-html-cache.md).

There are two further costs:

1. Browser reads that use the default auth mode wait for Clerk to be ready ([PERF-015](PERF-015-reads-wait-for-clerk.md)).
2. When Clerk becomes ready while a server Suspense boundary is still streaming, the context change makes React
   abandon hydration of that boundary. React renders it on the client, issues every read again, and drops the
   server HTML when it arrives. On `/national-budget` desktop repeat views this re-ran all 15 SSR reads in the
   browser: 14 additional browser calls, 25 instead of 11.

## Where

- **Domains:** all 16 pages load Clerk. The re-render was proven on `/national-budget` and is likely on any page
  whose main content streams after the shell. Most other hubs render from snapshots or awaited loaders, so they
  have no pending boundary.
- **Code:**
  - `src/lib/auth/index.tsx:189-207` (client-only `ClerkProvider`);
  - `:152` (the auth context value changes when Clerk loads);
  - `:353-395` (`waitForClerk`);
  - providers wrap `<Outlet/>` in `src/components/app/app-shell.tsx:101-145`.
- **Instance:** a development instance under `*.clerk.accounts.dev`, clerk-js 5.128.0. Its publishable key is in
  the public runtime config.

## Evidence

- **Deployed mobile cold `/`** (`evidence/home/deployed/home-mobile/run2-cold.json`):
  - clerk-js is requested at 19,346 ms, right after hydration;
  - FAPI calls run 21.2–22.4 s;
  - 4 UI chunks arrive by 24.8 s;
  - in total 308 KB zstd / 1.04 MB decoded.
  Clerk is ready ≈2.9 s after the hydration shell (≈2.4 s after hydration end) on mobile, and ≈0.5 s after it on
  desktop.
- **Every page measured:** Clerk ready at 20.2–25.4 s on mobile cold, all 16 pages, and 1.5–2.0 s on desktop
  (`evidence/lead/phases-*.md`). Its 300–338 KB shares the link with each page's post-hydration reads (the
  domain reports).
- **The re-render** (national-budget-2, `evidence/national-budget/extra/hydration-race-deployed-desktop.{json,log}`):
  - When Clerk was ready **before** the document ended (repeat views at 680–748 ms, one slow cold load), the
    final `h1` was a client-rendered node and the page made 25 calls. This happened in 4 of 4 such loads.
  - With clerk-js blocked, the server `h1` was kept and the page made 11 calls in 6 of 6 loads.
  - Batch, desktop: in 7 of 12 loads the catalog was read again in the browser, and in 4 of 12 all 15 SSR reads
    were repeated (25 calls instead of 11) (189 KB API transfer against 59 KB). LCP was 1.23–1.42 s against ≈1.0 s without the repeat.
  - Not seen on mobile, where hydration ends long after the document.
  - **The trigger window is narrower than "Clerk before the document ends".** In the batch, Clerk's
    `/v1/client` (the proxy for ready) ended before the document in 8 of 12 desktop loads. The 4 full re-runs
    are among them; the other 4 made 11–12 calls. So the re-render needs the context change to reach a
    boundary that is still dehydrated. The experiment, with its own `clerkLoadedAt`, separates the two cases
    cleanly (reviewer, `evidence/lead/review/REVIEW.md` §9).
- **`/map` desktop:** the one data read waits for Clerk's `/v1/client` (+0.65 s, on the critical path), see
  [PERF-015](PERF-015-reads-wait-for-clerk.md).

## Root cause

1. The auth provider is part of the app shell for every visitor, whether or not they ever sign in. It loads a
   development Clerk instance on the dev deployment.
2. When Clerk is ready, it changes a context value above `<Outlet/>`. If that change reaches a dehydrated
   Suspense boundary that is still pending, react-dom (`updateDehydratedSuspenseComponent` →
   `retrySuspenseComponentWithoutHydrating`) stops trying to hydrate it and renders it on the client.

## Proposed fix

1. Load Clerk lazily: on auth routes, when a signed-in cookie is present, or on the first interaction that
   needs it. Render the anonymous state without Clerk.
2. Until then, keep the auth context value stable through hydration. For example, publish the "loaded" state
   only after the router's stream has ended (`$_TSR.streamEnded`) or after `load`.
3. Infra: if dev-chronos is meant to mirror production, use a production Clerk instance. A development
   instance adds the `dev_browser` handshake and the `__clerk_db_jwt` cookie.

## Expected impact

- **Anonymous first visit:** −300 KB third-party JS, −3 FAPI requests and ≈−270 ms of mobile main thread.
- **Streamed pages:** no client re-render. On `/national-budget` desktop repeat views that is −14 duplicate
  calls (≈130 KB) and −0.2 to −0.4 s LCP.
- **Caching:** removes one of the two cookie sources behind [PERF-017](PERF-017-html-cache.md).

## How to verify

1. Run a fresh profile on `/` with no Clerk requests (`requests` filtered on `clerk.accounts.dev`).
2. Re-run `evidence/national-budget/extra/hydration-race.mjs` on deployed desktop. The server `h1` should be kept
   in every load and the page should make 11 API calls.

## Owner

client; infra for the Clerk instance

## Severity

**P1** under the brief's scale, because it hits every domain. The re-render is P2 on its own. Ranked by the
measured gain.

Not in the prior docs; new.
