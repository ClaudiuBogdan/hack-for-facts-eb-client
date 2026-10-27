# PERF-014: `/parlament` fetches all its content in the browser after Clerk loads, so it lands at 25–26 s on mobile (FCP 7.6 s)

## Summary

The parliament hub has no loader and no SSR data. The server sends six skeletons. Every section reads with a
plain `useQuery`, which does not run on the server, through `graphqlQuery` with the default auth mode, which
waits for Clerk ([PERF-015](PERF-015-reads-wait-for-clerk.md)). The order on mobile cold is:

1. hydration;
2. Clerk loads and makes three FAPI requests in two sequential round trips;
3. the 15 API calls start, 2.75–2.80 s after hydration, with 12 preflights;
4. the content commits at 25.2–26.0 s.

FCP is at 7.6 s. Four of the 15 calls are not needed. The bills section waits for the hub aggregate. The
seat-count block appears with the data and shifts the page (mobile CLS 0.071–0.088).

The page is not reachable from the navigation. It is not in the sidebar, and its landing tile shows only in
mock mode (`landing-groups.ts:146`). Visitors arrive by direct URL or from member, bill and committee pages.

## Where

- **Domain:** parliament. **URL:** `/parlament`.
- **Route:** `src/routes/parlament/index.tsx:5-24` validates search, redirects the legacy `membri` tab to
  `grupuri`, and sets headers; it has no data loader.
- **Queries:**
  - `hooks/use-parliament-data.ts:57-62` (`useParliamentHub`), plus agendas, votes, activity, bills and
    freshness;
  - `api/parliament-api.live.ts`: 25 of 27 `graphqlQuery` call sites without `auth: 'none'`;
  - `:406-436`: the hub fan-out, including unused `recentVotes`, a second freshness read and two all-mandate
    group reads.
- **Bills section:** mounted only in the hub's success branch (`parliament-hub-page.tsx:26-44`).
- **Shift:** the seat-count block renders only with data (`parliament-shell.tsx:119-138`).

## Evidence

- **SSR:** `ssrApiCalls: []` on every local render; the HTML has 6 skeletons.
- **First API call after hydration end, mobile cold:**
  - deployed 2,803 / 2,758 / 2,753 ms; local 2,759 / 2,765 / 2,763 ms;
  - each 26–35 ms after Clerk's `environment`/`client` calls end.
- **First API call after hydration, desktop cold:** 598–649 ms.
- **Content (last commit):** 25.2–26.0 s on mobile.
- **CLS:** 0.071–0.088 on mobile. Desktop medians: 0 cold and 0.004 repeat on deployed, 0.004 cold and repeat
  on local.
- **Preflights:** 12 per cold load, 88–113 ms each, and 12 again on mobile repeat views ([PERF-024](PERF-024-preflight-max-age.md)).
- **Source:** parlament-1 and parlament-4 in `domains/parliament.md`. Files:
  `evidence/parliament/*/parlament-*/run*-cold.json` (`requests`, `apiCalls`, `metrics`, `layoutShifts`).

## Root cause

- The hub was built as a client-fetched page.
- Every read uses the auth mode that waits for Clerk.
- The hub aggregate over-fetches.
- The bills section mounts only in the hub's success branch, so its queries wait for the hub aggregate.

## Proposed fix

1. **`auth: 'none'`** on the parliament reads, or flip the default ([PERF-015](PERF-015-reads-wait-for-clerk.md)).
2. **A route loader** that prefetches the hub's queries on the server under the same keys (`ssr: true`, as
   `/alegeri` does in `src/routes/alegeri/index.tsx:24-38`). Give the module caches in
   `parliament-api.live.ts:156,446,851` a TTL first ([PERF-010](PERF-010-server-memo.md)).
3. **Drop the unused calls** (`recentVotes`, the second freshness read, the all-mandate groups), and mount the
   bills section independently of the hub aggregate's loading state.
4. **Reserve the seat-count block's height.**

## Expected impact

- **Fix 1 alone:** content −2.75 s on mobile and −0.6 s on desktop.
- **With the loader:** content at FCP, ≈7.6 s instead of 25–26 s on mobile. No browser API calls or preflights
  on first load, and CLS → 0. TTFB rises by one in-cluster round (≈0.1–0.2 s).
- **Fix 3:** −4 requests and −4 preflights; the bills appear ≈0.7–1.0 s earlier on mobile.

## How to verify

1. The SSR HTML of `/parlament` contains the hub's figures.
2. `apiCalls` on a cold load is 0.
3. `layoutShifts` is empty.

## Owner

client

## Severity

**P1**: more than 1 s of time to content on mobile. Ranked below the navigation-reachable pages, because
`/parlament` is a hidden surface today.
