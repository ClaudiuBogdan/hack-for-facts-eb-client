# PERF-022: Several API reads that main pages wait for take 0.65–1.25 s at the server

## Summary

Where a main page's content or a visible figure waits for one read, the API's own response time sets the pace.
The proxy log of the local target shows server time per operation, because both SSR and browser calls pass
through it. Several reads used by main pages take 0.65–1.25 s for small answers. National budget's catalog also
has a cold-cache mode of ≈1.1 s that serialises the whole page behind it.

## Where

| page | operation | median (range) | answer | effect |
|---|---|---|---|---|
| `/entity-analytics` | `EntityAnalytics`, default ranking, 25 rows | ≈680 ms (625–900, n=14) | 1.5 KB | the whole TTFB on every Nitro miss, incl. every repeat visit ([PERF-017](PERF-017-html-cache.md)) |
| `/` | `EntityAnalytics` `limit: 1` (institution count) | ≈657 ms (589–715, n=21) | 313 B | below the fold |
| `/national-budget` | `BudgetNationalExecutionSeries` ×5 | 764 ms (680–898) | 0.5–1.3 KB | content streams after it ([PERF-013](PERF-013-national-budget-head.md)) |
| `/national-budget` | `BudgetApprovedRecords`, `BudgetApprovedTotals` | ≈1,090 ms (984–1,251) | 0.9–2.3 KB | stream end, law band ([PERF-023](PERF-023-national-budget-law-chain.md)) |
| `/national-budget` | `BudgetNationalCatalog`, cold API cache | 1.03–1.13 s (39–86 ms warm) | 7.5 KB | serial gate before every other read |
| `/legislation` | `LegislationDomainCounts` (`legalActCounts(groupBy: DOMAIN)`) | 926–1,191 ms, every load (curl 1,008–1,221) | small | the domain grid appears +1.1 s after hydration; the status chips then shift mobile layout (CLS 0.027) |
| `/legislation` | `LegislationOverview` `mostCited` part | 154–243 ms | 7 acts, never rendered on this page | TTFB ([PERF-021](PERF-021-blocking-ssr-loaders.md)) |
| `/procurement` | year's top contracts, national, categories (SSR, cold memo) | 1,500 / 850 / 959 ms | | TTFB of an expired memo ([PERF-010](PERF-010-server-memo.md)) |
| `/ins` | 8 reads per render: one 11-code national read (`insLatestDatasetValues`, 188–352 ms), one 4-code anchor read (83–211 ms), then six `InsObservations` (66–338 ms each) | API done at 360–525 ms | | TTFB ([PERF-021](PERF-021-blocking-ssr-loaders.md)) |
| `/parlament` | hub reads (browser) | 68–163 ms each | | not the bottleneck; the wait is Clerk ([PERF-014](PERF-014-parliament-browser-only.md)) |

**Server code** (named only; not analysed, per the brief):
- `hack-for-facts-eb-server/src/modules/budget/shell/repo/rankings.ts`, via
  `.../graphql/legacy/grouped-resolvers.ts`, for `EntityAnalytics`;
- the national-budget series and approved resolvers;
- `hack-for-facts-eb-server/src/modules/legal/shell/repo/acts-repo.ts:476-491` (`legalActCounts` unnests
  `summaries.domains` over the whole corpus on every call);
- `hack-for-facts-eb-server/src/modules/ins-native/core/usecases.ts:671-727`.

## Evidence

- **Proxy log:** `evidence/lead/api-proxy.log`, a copy of the local API proxy's log. Fields are `operation`,
  `ttfbMs` and `durMs`, for `source == "server"` and `"browser"`. The domain reports cite the per-operation
  medians.
- **Deployed:**
  - repeat-view TTFB on `/entity-analytics` is 661–705 ms;
  - `x-envoy-upstream-service-time` is 664–711 ms with a unique cookie;
  - national-budget content streams at ≈0.85–0.93 s, or 2.4 s with a cold catalog
    (`evidence/national-budget/extra/stream-timing-deployed*.txt`).

## Root cause

Server-side query cost, owner `server`. Each read is small, so the time is in the query or resolver, not the
transfer.

## Proposed fix

1. **Server:** profile these resolvers, add the missing indexes or pre-aggregates, and cache answers per data
   release. The data changes only when a load lands.
2. **Client, where cheap:** cache per data release on the server too, or move a read off the critical path.
   National budget's head fix ([PERF-013](PERF-013-national-budget-head.md)) already takes the series off the LCP path.

## Expected impact

- **`/entity-analytics`:** −0.5 s on every Nitro miss.
- **National budget:** −0.7 s for its bands, −1 s for its law band, and −1 s whenever the catalog cache is cold.
- **`/legislation`:** resolver work can remove ≈1 s of post-hydration waiting. Rendering cached counts during
  SSR would also remove the hydration wait: on deployed mobile the grid would arrive ≈13 s earlier (20.8 s →
  FCP ≈7.7 s), with no CLS.

## How to verify

Re-read the proxy log medians per operation after the server change, or curl the operation with the page's
variables.

## Owner

**server**

## Severity

**P2** per page (measurable, local). Several domains have one.
