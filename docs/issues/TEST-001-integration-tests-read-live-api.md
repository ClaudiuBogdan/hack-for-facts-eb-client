# TEST-001: Integration tests read the live API

**Status:** open (filed 2026-11-25). Browser side: fixes by spec owner (table below), then the API guard (client-entity-analytics).
Server side: measured; the ssr-api fixture origin is client-dev-polish's. **Priority:** P2: a test that reaches the live dev API depends on its data, its speed and its rate limit,
and sends traffic to it from every CI run. **Related:** `tests/utils/integration-base.ts` (the `mockApi` fixture),
`tests/utils/api-guard.ts`, `tests/utils/map-mocks.ts`, `scripts/find-unmocked-graphql-reads.mjs`. Reported by root
(refactor-architecture), after a flaky-spec report on `entity-analytics.spec.ts`.

## What happens

The integration project is meant to run on mocks (`E2E_MODE=mock`), but the live API is read from two places.

**The browser.** The `mockApi` fixture answers the GraphQL operations a test registers with `mockGraphQL`. For any other operation
it prints `[mockApi] No mock found for operation: X` and calls `route.fallback()`, so the request goes out to `VITE_API_URL`: on CI,
`https://dev-chronos-api.transparenta.eu`. A test that never calls `mockGraphQL`, and every REST read (the map's grouped-series),
goes out without a warning.

**The server render.** Playwright routes only the browser. In CI's first integration step the app server runs with the dev API's
URL, so every server render reads the live API, whatever the browser mocks. (The statistics step already points the server at an
unreachable address, `127.0.0.1:65534`.)

Nothing fails when either happens: the test passes or fails on whatever the live API answers, its latency or a 429.

## Browser reads

First seen as 127 "No mock found" warnings in CI run 45595066962 (commit 5d93c166a). The API guard (below) then caught every
browser request to the API that no route answered, in a full run of both CI steps on 2026-11-25. That run found 221, in 11 spec
files, including the no-mock tests and the REST map read the warnings never showed.

| Spec | Reads (full run, 2026-11-25) | With | State |
|---|---|---|---|
| `entity-analytics.spec.ts` | AggregatedLineItems 4 (CI run) | client-entity-analytics | fixed, f4a35474d |
| `entity-analytics-comprehensive.spec.ts` | BudgetSectors 1 (CI run) | client-entity-analytics | fixed, 976d2ec14 |
| `entity-details.spec.ts` | GetExecutionLineItemsAnalytics, MapPopulation (CI run); map grouped-series 10 | client-entity-analytics | GraphQL fixed, 64ce7e11; map open |
| `landing-page.spec.ts` | ElectionEvents, GetEntityMetadata (CI run); map grouped-series 10 | client-entity-analytics | GraphQL fixed, 64ce7e11; map open |
| `parliament-bills-search.spec.ts`, `parliament-speeches.spec.ts` | ParliamentGroups, ParliamentDataFreshness (CI run) | client-entity-analytics | fixed, 64ce7e11 |
| `statistics-hub.spec.ts`, `statistics-dataset-explorer.spec.ts` | StatisticsDatasetTier0, StatisticsTerritoryHub (CI run) and the reads they lead to | client-entity-analytics | fixed, 64ce7e11 |
| `cookie-consent.spec.ts` | map grouped-series 18 | client-entity-analytics | open |
| `entity-exploration.spec.ts` | map grouped-series 4, MapPopulation 2 | client-entity-analytics | open |
| `development-surface.spec.ts` | map grouped-series 1 | client-entity-analytics | open |
| `companies-profile.spec.ts` | CompanyAnalysisRelease 7, ProcurementCutoff 7, ProcurementDaRelease 7 | client-companies | open |
| `procurement-analytics.spec.ts` | AnalyticsFigures 26, ProcurementDaRelease 16, AnalyticsSeries 13, AnalyticsConcentration 9, AnalyticsRanking 8, AnalyticsRecords 5, ProcurementHomeContracts 2 | procurement-da-client | open |
| `public-enterprise-page.spec.ts` | ProcurementBuyerDirectCategories 8, ProcurementDaRelease 4 | procurement-da-client | open |
| `national-budget-home.spec.ts` | BudgetApprovedRecords 40, BudgetExecutionObservations 3, BudgetNationalExecutionSeries 3, AggregatedLineItems 2, EntityAnalytics 2, BudgetApprovedTotals 1 | client-dev-polish | open |
| `national-budget-analytics.spec.ts` | BudgetApprovedTotals 5, BudgetApprovedRecords 4, BudgetExecutionObservations 3, BudgetApprovedSeries 1 | client-dev-polish | open |

How the fixtures are made: each is the dev API's own answer to the app's own query text, with the variables the test sends. Where
the answer is large it is cut by whole records (a population map to one UAT's cell, a locality hub to four of its datasets).
`tests/utils/map-mocks.ts` answers the map's grouped-series read from two such recordings (the landing's and the entity page's), by
the request's granularity and series ids.

## The API guard (browser side)

`tests/utils/api-guard.ts`, an auto fixture: `integration-base` builds on it, and the six specs that import Playwright directly import
it instead (`charts-page`, `cookie-consent`, `ins-native-entity`, `ins-native-saved-chart`, `statistics-comparisons`,
`statistics-ins-native-outcomes`).
- It is a browser-context route, registered first, matching `VITE_API_URL`'s origin and any `/graphql` path (the app's own
  `/api/v1/graphql` proxy included). Context routes run after every page route, so it sees only what no mock answered.
  `INTERNAL_API_URL` is the server's, not the browser's, so the guard does not watch it.
- Under `CI` in mock mode it aborts the request and fails the test, naming each request. Locally it prints
  `[api-guard] no mock: …` with the spec and test and lets the request through.

**A new spec imports `test` and `expect` from `../utils/integration-base`, or from `../utils/api-guard` if it must not have
`integration-base`'s stored consent.** It goes in last, after a CI-style run with zero catches.

## Server reads (measured 2026-11-25)

CI's first integration step was run with the server render's API (`INTERNAL_API_URL`, which the server prefers and the app's
`/api/v1/graphql` proxy also uses) pointed at `127.0.0.1:65534`, the browser's left on the dev API, two workers, no retries.
- 47 tests failed, in 10 specs; 273 passed, 10 were skipped and 11 did not run.
- The failing tests assert what the server rendered, or wait for a page whose server read failed.

| Spec | Failed |
|---|---:|
| `national-budget-analytics.spec.ts` | 11 |
| `national-budget-home.spec.ts` | 7 |
| `companies-profile.spec.ts` | 6 |
| `entity-details.spec.ts` | 6 |
| `justice.spec.ts` | 5 |
| `procurement-analytics.spec.ts` | 3 |
| `procurement-procedure.spec.ts` | 3 |
| `public-enterprise-page.spec.ts` | 3 |
| `entity-exploration.spec.ts` | 2 |
| `buget-routing.spec.ts` | 1 |

### Fix: the ssr-api fixture origin (client-dev-polish)

The one server-side harness for TEST-001 (root, 2026-11-25), designed and built by client-dev-polish:
- `tests/utils/ssr-api/server.mjs`, a local origin started as a second Playwright `webServer`. The app server's `INTERNAL_API_URL`
  points at it, unless the environment sets one (the statistics step keeps `127.0.0.1:65534`).
- It answers recorded operations, keyed by operation and a hash of the variables.
- Anything unrecorded passes through to `VITE_API_URL`, logged `[ssr-api] passthrough <op>`. It is strict (no passthrough) for the
  national budget's specs first, then for each spec as its recordings land.

Once it exists, client-entity-analytics runs it strict over the whole suite and lists every server read by spec, here.

Why a fixture origin, rather than marking the server-render tests as live-dependent:
- The 47 tests are the server-render tests of the pages readers reach first.
- The national budget's shared server cache makes the server's read the main one.
- Marking them would leave the hole exactly where it matters.

Limit: one server serves every test, so a server render's answer cannot vary per test (it cannot today either).

**Ownership:** ssr-api (server reads) is client-dev-polish's; the API guard (browser reads) is client-entity-analytics'.

## Closure criterion

1. A full integration run as CI does it (both steps, one worker, no retries) with zero browser requests caught by the guard, and
   the guard on `dev`, failing a test under `CI`.
2. The integration steps' server render reads only the ssr-api origin, strict for every spec (no passthrough), with a run listing zero
   passthrough reads, on `dev`.

## How to find them

```bash
gh api repos/{owner}/{repo}/actions/jobs/<job id>/logs > shard.log   # one per integration shard
node scripts/find-unmocked-graphql-reads.mjs shard-*.log              # the "No mock found" warnings, by spec
grep '\[api-guard\]' run.log                                          # with the guard: every unanswered request, by spec and test
```
