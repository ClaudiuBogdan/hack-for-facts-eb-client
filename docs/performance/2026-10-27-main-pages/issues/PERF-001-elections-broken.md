# PERF-001: `/alegeri` fails on every visit: the client queries `electionCatalog`, which the API removed on 2026-10-21

## Summary

The elections main page never shows its list. Its catalog query uses the type `ElectionCatalogFilter` and the
field `electionCatalog`. The API removed both on 2026-10-21 (server commit `9c438870`), and the deployed API runs
a later commit. Every read now returns HTTP 200 with `data: null` and two validation errors, which happens:

- once during SSR, so the HTML ships a skeleton (inferred from `src/routes/alegeri/index.tsx:36-37`; the page shows
  people, so no HTML was saved);
- twice in the browser, because of `retry: 1`.

After that the page swaps to „Lista edițiilor nu s-a încărcat. / Încearcă din nou", at 19.8 s on mobile and
2.2 s on desktop. The same contract is used by the edition and contest pages, judged from the schema; they were
not loaded.

## Where

- **Domain:** elections. **URL:** `/alegeri` (sidebar „Alegeri", landing page; flag `elections` on in
  `src/config/feature-flags.ts:13`).
- **Client:**
  - `src/features/elections/api/elections-catalog-api.ts:39-67`: the catalog, edition, contests and contest
    queries; `ELECTION_CATALOG_QUERY` is at `:39-46`;
  - called from `src/routes/alegeri/index.tsx:35-36` (SSR loader) and
    `src/features/elections/hooks/use-elections-catalog.ts:21-34`.
- **Server (current schema):** `electionEvents`, `electionEvent` and `electionResult`; `electionContests` now
  takes `occurrenceKey` (server `origin/dev` `src/modules/elections/shell/graphql/schema.ts:271-300`).
- **Docs:** `docs/design/elections/design.md:537` still describes `electionCatalog`.

## Evidence

- **API probe** (untimed, the page's exact query). The reviewer repeated it at 19:20:59Z with the same result
  (`evidence/lead/review/elections-probe-*.json`):
  `{"data":null,"errors":[{"message":"Unknown type \"ElectionCatalogFilter\". …"},{"message":"Cannot query field \"electionCatalog\" on type \"Query\". Did you mean … \"electionEvents\"?"}]}`.
  Files: `evidence/elections/analysis/election-catalog-probe-{request,response}.json`.
- **All 24 batch loads** (both targets, both profiles) fail the same way:
  - SSR: 1 failed read per render (12 of 12 local renders);
  - browser: 2 failed `ElectionCatalog` calls, for example deployed desktop run 2 at 932 ms and 2,065 ms,
    783–784 B each (`evidence/elections/deployed/alegeri-desktop/run2-cold.json`);
  - the local server logs 2 error lines per render.
- **Error state:** shown at 19.8 s on mobile and 2.2 s on desktop. That swap is the page's whole CLS
  (0.009–0.01).
- **Source:** elections-1 in `domains/elections.md`.

## Root cause

The server changed its public contract by design. The client was not updated, and nothing checks the client's
query documents against the deployed schema.

## Proposed fix

1. Port `src/features/elections/api/` to `electionEvents` / `electionEvent` /
   `electionContests(occurrenceKey)`.
2. Until then, switch the `elections` flag off. The sidebar and landing hide the page when it is off.
3. Do not retry a GraphQL validation failure (the default `retry: 1` is `src/lib/queryClient.ts:12`). It is deterministic, and `retry: 1` adds a call and ≈1.6 s on
   mobile before the error shows.
4. **Process:** in CI, validate the client's GraphQL documents against the deployed (or `origin/dev`) server
   schema, for example with `graphql-inspector validate` or codegen against an introspection dump. That check
   would have flagged this on 2026-10-21.

## Expected impact

- **The page works.** The rows ship in the SSR HTML and are visible at FCP: 7.3 s on mobile today, bounded by
  [PERF-002](PERF-002-css-first-paint.md), and 0.38 s on desktop.
- **Fewer calls:** −2 failed browser calls and a preflight per visit.

## How to verify

1. Curl the page's catalog query against `https://dev-chronos-api.transparenta.eu/api/v1/graphql`: `data` is
   non-null.
2. The SSR HTML of `/alegeri` lists editions.
3. `apiCalls` in a cold run is empty, or the calls return without `errors`.

## Owner

client. The server changed by design; the contract check is a process item for both repos.

## Severity

**P0**: it breaks a main page, on both targets, for every visitor.

Not in the prior docs; new. A separate elections area session works on this domain. Whether its branch already
ports the API was not checked.
