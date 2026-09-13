# Progressive entity SSR — 2026-09-13

## Scope and behavior

The `/entities/$cui` loader now waits only for the entity overview. Header, summary
cards and period trends can render before all execution line-item pages arrive.
The treemap, its grouped table/export and category evolution show local loading or
retry states until complete current-query rows are available. An empty successful
result remains different from an unfinished request. A row-fetch failure no longer
replaces the overview with a page error.

Settings changes hide previous-query placeholders. Matching cached results remain
visible during background fetching. Each rendered dataset therefore uses its own
requested period, report type, creditor, normalization, currency and inflation
settings; it does not wait for unrelated sections to settle. Ranking also drops
previous-query placeholders. A local React hydration boundary preserves SSR values
until hydration for persisted preferences, while explicit URL/forced values and
ordinary client navigation apply immediately. The shared settings hook is unchanged.

The `/primarie` loader policy is unchanged. Native entity INS and commitments retain
their independent query gates. No API, database, migration, index or financial-data
change is required. This slice is committed locally only; it has not been pushed or
deployed. Phoenix production remains untouched.

## Uncached local measurements

Baseline: client dev `5c002b9e`, including the first performance slice. Candidate:
this commit. Both use server dev `c08c628f` and production-built local clients.
Public Sibiu entity `4270740`, year 2023, YEAR, RON, English:

| Measurement | Before | After |
|---|---:|---:|
| Median HTTP SSR time to first byte, 5 alternating runs each | 1157.2 ms | 586.5 ms |
| SQL statements executed per isolated SSR request | 18 | 10 |
| HTML response bytes | 438438 | 101336 |
| Median browser navigation TTFB, 3 fresh contexts each | 1154.6 ms | 598.2 ms |
| Median browser DOMContentLoaded | 1197.8 ms | 633.4 ms |
| Median browser first contentful paint | 1288 ms | 708 ms |

SSR TTFB fell 49.3% in this sample. This is not a production SLA or p95 estimate.
The eight line-item SQL calls move after SSR; they are not removed from the full
page lifecycle. Lower sections can start their deferred queries sooner, so total
browser SQL counts also contain variable asynchronous ranking/report/chart work.
Use isolated HTTP counters to assess the SSR change.

API response-cache TTL was zero, responses used `Cache-Control: no-store`, local
SSR connected directly with no CDN, and each SSR request created its own QueryClient.
Browser contexts were fresh, service workers blocked and HTTP caching disabled by
Playwright routing. A local pg wrapper counted real database executions without
recording SQL parameters, environment values or credentials. The database probe
confirmed `transparenta_prod_agent_readonly`, read-only transactions, no budget fact
write privileges and a Chronos endpoint. PostgreSQL buffers and OS caches were not
flushed; these are real DB-hit measurements, not cold-storage benchmarks. Nominal
RON avoids the immutable normalization-factor cache path. There were no database writes.

## Validation and review

- 119 tests across five route, bootstrap, hook and analysis/evolution files pass.
  They include progressive loading,
  error/retry isolation, empty/cached results, both overview/row completion orders,
  setting changes and reversal, native views, and real `useGlobalSettings` SSR
  `renderToString`/`hydrateRoot` tests for saved preferences and explicit URL overrides.
- Real browser delayed-response and injected-503 checks retained the Sibiu overview;
  recovery returned exactly **87 income + 689 expense rows**, without runtime errors.
- Actual INS browser hydration with saved EUR/inflation preferences passed both
  omitted and explicit URL settings, before and after. All measured navigations
  returned HTTP 200 with zero page runtime errors.
- `yarn run check` (types and ESLint), production build and focused regressions pass.
- Astra xhigh approved after the local hydration correction and independently checked
  GLM's adjacent concerns. GLM 5.3 max was security-only, lower-trust, with tools denied;
  full and hydration-delta reviews found no introduced security blocker.

## Tradeoffs and deferred issues

- The detailed treemap/table leaves the first HTML response and requires client
  hydration and its data read. Category evolution remains deferred as before and
  now also waits for complete current rows. This makes the overview available
  sooner; there is no financial aggregation change.
- Changing an overview query key uses the page loading shell until its data arrives;
  pending line-item data uses section fallbacks. Neither shows old numbers with a
  new label. This avoids introducing a complex per-dataset settings ledger.
- Entity details still use an existing FNV-1a 32-bit hash (with `Math.abs`) as their
  query key. This is a real pre-existing collision risk, with no observed collision
  in this task. A separate small change should key by complete normalized parameters,
  preserve equivalent query inputs and rerun cache/hydration tests. Do not change the
  shared hash helper globally as part of this optimization.
- GLM questioned default-report cache reuse outside native mode. Independent inspection
  resolved this: current `getEntityDetails` always delegates to the native adapter,
  which returns the effective queried report type. Checked legacy main also resolves
  omitted types from the parent entity default. No speculative guard was added.
- Local error messages use the pre-existing escaped React error renderer. Upstream
  error sanitization and route-parameter validation remain separate hardening topics;
  this change introduces neither raw HTML nor a new query construction path.
- The global completeness scan and repeated normalized metric reads remain. Removing
  completeness needs an explicit availability/default-selection decision; normalization
  consolidation should be another measured, reviewed slice, not a broader rewrite.

## Evidence

[HTTP, browser and boundary observations](entity-progressive-ssr-2026-09-13.json).
Builds, screenshots, per-request counters and reviewer logs are local temporary
artifacts under `/private/tmp/entity-progressive-ssr-20260913`.
Temporary task sessions: `entity-progressive-api`, `entity-progressive-before`,
`entity-progressive-after`, `entity-progressive-security`, and
`entity-progressive-security-delta`; only these are stopped after validation.

Cleanup verified: all five task-owned sessions are absent; no listeners remain on
4319, 60513 or 60514. Existing user development processes were left running.
