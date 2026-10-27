# PERF-021: SSR loaders hold the first byte for reads the first screen doesn't show, with no cache between requests

## Summary

TanStack Start sends no HTML until a route's `loader` resolves. Three main pages await API reads there that
their first screen does not need, and none caches them between requests:

- **`/ins`** awaits 8 INS calls in two rounds: two national reads, then six county layers that are below the
  fold.
- **`/legislation`** awaits an overview whose `mostCited` ranking only the analytics tab renders.
- **`/alegeri`** gives its read a 5 s deadline. Its read fails today ([PERF-001](PERF-001-elections-broken.md)), and a slow
  answer holds the whole page.

Every view, repeat views included, pays this in TTFB. The emulated mobile profile hides it behind its 562 ms
latency; a real network would not.

## Where

- **`/ins`:**
  - `src/routes/ins/index.tsx:47-57`: the loader awaits `fetchStatisticsHub`;
  - `:61-68`: `s-maxage=600`, which no cache honours;
  - `statistics-hub-fetchers.ts:259-297`: the national reads at `:261-266`, then the county layers at
    `:280-289`.
- **`/legislation`:**
  - `src/routes/legislation/index.tsx:12-15` → `fetchLegislationOverview()` → `legal-api.live.ts:27-58`, which
    also asks for `legalActs(sort: IN_DEGREE, first: 7)`;
  - only `/legislation/analytics` renders it (`legislation-analytics-page.tsx:57`).
- **`/alegeri`:** `elections-catalog-ssr.ts:24`, the 5 s deadline.
- **Domains:** statistics, legislation, elections.

## Evidence

| page | SSR reads per render | deployed origin time (`cfOrigin`) | pages without SSR reads |
|---|---|---|---|
| `/ins` | 8, in 2 rounds, on 12 of 12 local renders | 335–473 ms cold, 257–417 ms repeat; desktop TTFB 534 ms vs 89 ms on `/` | 24–199 ms |
| `/legislation` | 1 (`LegislationOverview`, 170–223 ms local; `mostCited` alone 154–243 ms) | 173–214 ms | ≈45 ms |
| `/alegeri` | 1, normally 31–114 ms | one local warm read took 1,722 ms, giving TTFB 1,753 ms and FCP 2,076 ms | |

- **Sources:** ins-1, legislation-3 and elections-2 in `domains/*.md`.
- **Files:**
  - `evidence/ins/local/ins-desktop/run*-*.json` and `evidence/legislation/local/*/run*-*.json` (`ssrApiCalls`);
  - deployed `document.headers.server-timing`.

## Root cause

- The loaders await everything the page might show.
- There is no server memo, unlike procurement, justice and public enterprises ([PERF-010](PERF-010-server-memo.md)).
- No HTML cache honours `s-maxage` ([PERF-017](PERF-017-html-cache.md)).
- The data behind all three changes monthly or less often.

## Proposed fix

1. **`/ins`:** wrap the hub read in `createServerMemo(600_000, { keep: (hub) => hub.failures.length === 0 })`,
   with stale-while-revalidate as in [PERF-010](PERF-010-server-memo.md). Optionally await only the national reads and stream
   the county layers.
2. **`/legislation`:** split the query, so the front door asks only for `moIssues`. Memoise the result (the
   corpus has been frozen since July). Move the loader to `queryClient.ensureQueryData`.
3. **`/alegeri`:** a ≈1 s deadline, or stream the list behind Suspense.
4. **Server:** speed up `insLatestDatasetValues` and the `IN_DEGREE` sort ([PERF-022](PERF-022-slow-resolvers.md)).

## Expected impact

- **`/ins`:** TTFB, FCP and LCP −300 to −450 ms on desktop, cold and repeat, and the same on a real mobile
  network. −8 API calls per view.
- **`/legislation`:** TTFB −100 to −150 ms, or ≈−180 ms with a cache.
- **`/alegeri`:** a bounded worst case.

## How to verify

1. Repeat-view `cfOrigin` on `/ins` and `/legislation` is under 100 ms.
2. The proxy log shows no SSR calls on a second render within the memo window.

## Owner

client; server for resolver latency

## Severity

**P2**: measurable, local to each page.

The ignored `s-maxage` is known in `docs/entity-page-ssr-loading.md:129-131`; the rest is new.
