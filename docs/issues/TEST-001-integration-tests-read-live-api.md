# TEST-001: Integration tests read the live API

**Status:** open (filed 2026-11-25). Fixes in progress on `feat/entity-analytics-20261125`, by client-entity-analytics; one spec with
client-companies. **Priority:** P2: a test that reaches the live dev API depends on its data, its speed and its rate limit, and sends
traffic to it from every CI run. **Related:** `tests/utils/integration-base.ts` (the `mockApi` fixture),
`scripts/find-unmocked-graphql-reads.mjs`. Reported by root (refactor-architecture), after a flaky-spec report on
`entity-analytics.spec.ts`.

## What happens

The integration project is meant to run on mocks (`E2E_MODE=mock`). The `mockApi` fixture answers the GraphQL operations a test
registers with `mockGraphQL`. For any other operation it prints `[mockApi] No mock found for operation: X` and calls
`route.fallback()`, so the browser's request goes out to `VITE_API_URL`: on CI, `https://dev-chronos-api.transparenta.eu`. A test that
never calls `mockGraphQL` registers no route at all, and its reads go out without a warning. The server render's own reads are not
routed by Playwright in any case. This issue is about the browser's reads.

Nothing fails when it happens. The test passes or fails on whatever the live API answers, its latency or a 429. A wait on network idle,
such as `waitForHydration`, waits for it.

## Where (CI run 45595066962, commit 5d93c166a, all four integration shards)

Each shard runs one worker, so each warning belongs to the next test result printed after it; all 127 warnings were placed.

| Spec | Operation | Reads | Tests | With |
|---|---|---:|---:|---|
| `companies-profile.spec.ts` | CompanyAnalysisRelease | 7 | 6 | client-companies |
| | ProcurementDaRelease | 7 | 6 | |
| | ProcurementCutoff | 7 | 5 | |
| `entity-analytics-comprehensive.spec.ts` | BudgetSectors | 1 | 1 | fixed, 976d2ec14 |
| `entity-analytics.spec.ts` | AggregatedLineItems | 4 | 2 | fixed, f4a35474d |
| `entity-details.spec.ts` | GetExecutionLineItemsAnalytics | 12 | 6 | client-entity-analytics |
| | MapPopulation | 12 | 6 | |
| `landing-page.spec.ts` | ElectionEvents | 2 | 1 | client-entity-analytics, after client-legislation |
| | GetEntityMetadata | 1 | 1 | |
| `parliament-bills-search.spec.ts` | ParliamentGroups | 20 | 3 | client-entity-analytics |
| | ParliamentDataFreshness | 3 | 3 | |
| `parliament-speeches.spec.ts` | ParliamentGroups | 40 | 7 | client-entity-analytics |
| | ParliamentDataFreshness | 7 | 7 | |
| `statistics-dataset-explorer.spec.ts` | StatisticsDatasetTier0 | 1 | 1 | client-entity-analytics |
| `statistics-hub.spec.ts` | StatisticsDatasetTier0 | 2 | 2 | client-entity-analytics |
| | StatisticsTerritoryHub | 1 | 1 | |

The statistics specs run in CI's second step, against `VITE_API_URL=http://127.0.0.1:65534`, so their unmocked reads fail at once
instead of reaching the API; they are listed because they are unmocked all the same.

**This is a lower bound.** A test with no `mockGraphQL` call has no GraphQL route, logs nothing, and is not in the table.

## How to find them

```bash
gh api repos/{owner}/{repo}/actions/jobs/<job id>/logs > shard.log   # one per integration shard
node scripts/find-unmocked-graphql-reads.mjs shard-*.log
```

The same works on a local run's `--reporter=list` output with `--workers=1`.

## Fix

1. Each spec mocks every read its tests make in the browser, with spec and fixture changes only (owners in the table).
2. Then a guard in `tests/utils/integration-base.ts`, as the last commit: under `CI=true`, an unmocked GraphQL operation fails its test
   (the request is aborted and the test reports the operation), and a default route catches any request to the API from a test that
   never calls `mockGraphQL`, with the same result. Locally the fixture keeps warning, so a spec can still be written against the live
   API on purpose.

## Closure criterion

A full integration run as CI does it (both steps, every shard's specs, one worker, no retries) with zero unmocked reads, and the
guard on `dev`: under `CI=true`, a test whose browser reads the API without a mock fails.
