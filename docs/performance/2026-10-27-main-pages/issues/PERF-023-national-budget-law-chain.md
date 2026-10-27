# PERF-023: `/national-budget`'s law band reads 2 × 5 pages of records in a chain in the browser (≈1.1 s per page)

## Summary

The law band needs about 20 chapter rows per budget law. To get them, it pages through the state-budget
synthesis 100 records at a time, in the browser, for two laws: 5 rounds of about 1.1 s each at the API. The band
completes 5.5–6 s after hydration, which is 23.8 s on mobile cold. On desktop the server's deficit read is
repeated in the browser as well.

## Where

- **Domain:** national budget. **URL:** `/national-budget`.
- **Client:**
  - `src/features/national-budget/home/hooks/use-home-data.ts:107-124,216-223,261-264`: `lawChaptersOptions`,
    browser-only by design;
  - `analytics/api/national-budget-api.ts:52-54,288-310`: cursor paging at `MAX_PAGE_SIZE = 100`;
  - `lib/home-law.ts:54-66`: keeps the ≈20 chapter rows.
- **Server:** the `budgetApprovedRecords` resolver.

## Evidence

- **10 browser `BudgetApprovedRecords` calls in 5 rounds**, each 0.96–1.32 s on deployed, ≈6 KB each. The band
  completes at:
  - 6.0–8.2 s on desktop;
  - 7.6–8.3 s on mobile repeat views;
  - **23.6–23.9 s on mobile cold** (`run*-cold.json` `apiCalls`, `reactCommitTimes`).
- **Desktop:** the SSR deficit read is issued again in the browser, as an 11th call in 11 of 12 desktop loads.
- **Source:** national-budget-3 in `domains/national-budget.md`.

## Root cause

The API offers no chapter-level aggregate or filter, so the client reconstructs one from paged raw rows, and
each page is slow at the server ([PERF-022](PERF-022-slow-resolvers.md)).

## Proposed fix

1. **Server:** add a chapter-level aggregate, or a `budgetApprovedRecords` filter for chapter rows (all lower
   codes blank), so that one request returns the ≈20 rows.
2. **Client:** then read it on the server with the other law reads.

## Expected impact

- The band completes with the rest of the page (≈1.2 s server side): about −5 s on desktop and −6 s on mobile
  in settle time.
- −10 browser calls, ≈−55 KB.
- Below the fold, so LCP does not change.

## How to verify

1. `apiCalls` on a cold load lists no `BudgetApprovedRecords`, or one call.
2. `lastReactCommit` is within ≈1 s of hydration end.

## Owner

**server**; client follow-up

## Severity

**P2**: a measurable cost, local to the page, below the fold.
