# PERF-015: Public browser reads wait for Clerk to load before they are sent (+0.5–0.9 s desktop, +2.8–3.6 s mobile)

## Summary

`graphqlQuery` defaults to `auth: 'optional'`. Before every call it awaits `getAuthToken()`, which polls every
50 ms until Clerk has loaded (10 s cap). Clerk loads only after hydration and makes three requests, in two sequential round trips, to
its development FAPI ([PERF-012](PERF-012-clerk-eager.md)). So any public read issued at hydration without `auth: 'none'` sits idle
until Clerk is ready, even for an anonymous visitor who will never have a token. The `/map` series call and the
legacy `graphqlRequest` transport wait the same way.

## Where

- **Code:**
  - `src/lib/graphql/graphql-client.ts:150-157` (the default);
  - `src/lib/auth/index.tsx:353-395` (`waitForClerk`, 50 ms poll, 10 s cap);
  - `src/lib/api/graphql.ts:122` (legacy transport, unless `skipAuth`);
  - `src/lib/api/map-series.ts:101-104` (explicit `getAuthToken()`).
- **Callers without `auth: 'none'`** (home-S6 inventory):
  - all 11 procurement API files;
  - justice (4 files);
  - PNRR (`pnrr-api.live.ts`, 22 call sites);
  - parliament agenda, speeches and stenograms, and 25 of the 27 `graphqlQuery` call sites in
    `parliament-api.live.ts`;
  - private-companies registry and profile;
  - the legacy transport: entities, charts, datasets, commitments, data discovery, and the entity search used
    by the town-hall campaign (`src/lib/api/entities.ts:401-404`).
- **Main pages measured with a waiting read:** `/procurement`, `/map`, and `/parlament` (all 15 of its browser
  reads); also the search on `/primarie`.
- **Main pages measured without one:**
  - `/`, `/legislation` and `/primarie`'s load-time reads start before Clerk is ready;
  - `/national-budget` and `/alegeri` use `auth: 'none'`;
  - `/entity-analytics`, `/charts`, `/companies`, `/ngos`, `/justice`, `/public-enterprises`, `/ins` and
    `/pnrr` make no browser read. `/pnrr`'s worker `fetch` sends no auth.

## Evidence

| page | read | starts after Clerk `/v1/client` returns | start after hydration end (mobile cold / desktop cold) |
|---|---|---|---|
| `/procurement` | „Cele mai noi" month read (labelled `ProcurementHomeContracts`) | 11–124 ms, in **all 24 runs** | **+3.58–3.64 s** / +0.51–0.89 s |
| `/map` | `POST /api/v1/advanced-map-analytics/grouped-series` | 18–80 ms, all 24 runs | +3.6 s on mobile cold, but hidden behind the GeoJSON; **+0.59–0.65 s** desktop (critical path); +0.68–0.77 s mobile repeat |
| `/primarie` (campaign step) | `EntitySearch`, the page's search box, typed right after hydration (one extra run) | ≈0 ms after Clerk ready | the request left **2.35 s** after the debounce; first results 3.5 s after the last keystroke instead of ≈1.1 s |
| `/parlament` | all 15 hub calls | 31–65 ms, all 12 cold runs | **+2.75–2.80 s** / +0.60–0.65 s; content at 25.2–26.0 s on mobile ([PERF-014](PERF-014-parliament-browser-only.md)) |

Sources: parlament-1, primarie-1 (`evidence/primarie/extra/search-at-hydration-deployed-mobile.json`), procurement-2 and local-budgets (`/map` API section) in `domains/*.md`. Evidence:
`evidence/{procurement,local-budgets}/*/*/run*-{cold,warm}.json`, `apiCalls[].start` against the `/v1/client`
request's end.

## Root cause

- The safe-looking default (`optional`) makes every public read wait for an auth system that loads late.
- `waitForClerk` resolves only once Clerk `isLoaded`, even when there is no session cookie to wait for.

## Proposed fix

1. Default public reads to `auth: 'none'`, and attach a token only where the server needs one: user-specific
   and admin reads.
2. Make `getAuthToken()` return `null` at once when no Clerk session cookie exists (`__session` /
   `__client_uat=0`).
3. Lazy-load Clerk ([PERF-012](PERF-012-clerk-eager.md)).

## Expected impact

- **First browser read on the affected pages:** −3.6 s (`/procurement`) and −2.8 s (`/parlament`) on mobile cold;
  −0.5 to −0.9 s on desktop.
- **`/map` desktop:** −0.65 s on the first frame.
- Possibly more on real mobile networks, where Clerk's third-party connection costs a real handshake (not
  measured).

## How to verify

In a mobile cold run of `/procurement`, the „Cele mai noi" read's `start` is within ≈200 ms of the hydration
shell, before any `clerk.accounts.dev` request ends.

## Owner

client

## Severity

**P2**: a measurable, local cost. It hits 3 of 16 main pages and moves LCP on none of them: LCP = FCP at 7.4,
7.6 and 7.4 s. The content delays are real: 3.6 s for procurement's „Cele mai noi" band and 2.8 s for the
parliament hub's data on mobile cold. Its fix is also the cheapest step of the P1 [PERF-014](PERF-014-parliament-browser-only.md).
The reviewer's call, accepted.
