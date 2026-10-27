# PERF-006: `/entity-analytics` fetches its table on the server but sends a skeleton, so LCP waits for hydration (19.9 s on mobile)

## Summary

The local-budgets entry page starts its ranking query on the server and waits for it before sending the HTML.
It then renders a skeleton anyway: the component reads the query with a plain `useQuery`, which is still
"loading" during SSR. The 25 rows travel only as a serialized script, and the LCP element (the table note)
exists only after hydration. On mobile, LCP is 19.9 s against an FCP of 7.2 s; on desktop it is 1.1 s against
0.4 s.

## Where

- **Domain:** local budgets. **URL:** `/entity-analytics`. `/entities` answers 307 to it, and it is in the
  sidebar and on the landing page.
- `src/routes/entity-analytics.tsx:35-40`: `void queryClient.prefetchQuery(...)` in `beforeLoad`, not awaited.
- `src/routes/entity-analytics.lazy.tsx:69-72`: `useQuery`, not `useSuspenseQuery`.
- `src/components/entity-analytics/EntityAnalyticsTable.tsx:243-252` renders the skeleton.
- `:256` renders `<PopulationMethodologyNote />`, whose `<p className="my-2 text-xs text-muted-foreground">`
  (`src/components/normalization/population-methodology-note.tsx:6`) is the LCP element.

## Evidence

| target · profile | FCP | LCP | hydration end |
|---|---:|---:|---:|
| deployed · mobile · cold | 7,244 | **19,880** | 19,914 |
| local · mobile · cold | 8,520 | **19,616** | 19,655 |
| deployed · desktop · cold | 412 | 1,124 | 1,134 |
| local · desktop · cold | 276 | 1,012 | 1,032 |
| deployed · mobile · repeat | 912 | 2,456 | 2,480 |

All times in ms.

- **SSR HTML:** the skeleton, a header bar and 10 rows (11 `animate-pulse` elements). The 25 rows appear only
  as a streamed seroval script (`evidence/local-budgets/local/entity-analytics-mobile/ssr.html`: 25 ×
  `entity_cui`).
- **LCP element:** `p.my-2.text-xs.text-muted-foreground`, the population-methodology note above the table
  (`run2-cold.json` `lcpCandidates`). It paints in the hydration commit.
- **Source:** local-budgets-1 in `domains/local-budgets.md`.
- **Reviewer:** reproduced every number from the run JSONs. A deployed re-run at 20:18 gave LCP 19.78 s against
  FCP 7.28 s (`evidence/lead/review/recheck-entity-analytics-mobile/`).

## Root cause

The route starts the read and does not wait for it; the component reads it without Suspense. During SSR the
query is pending, so the markup is the loading state. The Nitro route cache ([PERF-017](PERF-017-html-cache.md)) buffers the
whole body until the query resolves, so the server waits for the data without using it.

## Proposed fix

1. Await the data on the server for the table view: `loader: () => queryClient.ensureQueryData(...)`, or
   `useSuspenseQuery` under a Suspense boundary so it streams on uncached renders.
2. Render the rows in the HTML.
3. Keep column preferences (`useTablePreferences`, localStorage) from changing the server markup, to avoid a
   mismatch.

## Expected impact

- **LCP ≈ FCP:** ≈−12.6 s on mobile cold (19.9 → ≈7.3 s, then bounded by [PERF-002](PERF-002-css-first-paint.md)), ≈−0.7 s on
  desktop cold, ≈−1.5 s on mobile repeat views.
- **TTFB:** no cost on uncached renders, which already wait for the query.
  - On local desktop repeat views, TTFB is 664–733 ms against one SSR `EntityAnalytics` read of 625–680 ms,
    and the whole body arrives within 3 ms of the first byte.
  - The batch's cookie-less cold loads were route-cache hits, so they do not show the wait.

## How to verify

1. The SSR HTML contains 25 table rows and no `animate-pulse` rows.
2. In a mobile cold run, `lcp` is within ≈0.3 s of `fcp`.

## Owner

client

## Severity

**P1**: ≈12 s of mobile LCP.

New. `docs/reviews/ENTITY-PROGRESSIVE-SSR-2026-09-13.md` covers the entity page, not this list page.
