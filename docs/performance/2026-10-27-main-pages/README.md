# Main-page performance audit: 2026-10-27

Every domain's main page was measured in a real Chrome against two targets: dev-chronos and a local production
build. Each target was loaded cold and as a repeat view, on desktop and on an emulated slow phone. The causes
are traced to code. Analysis only: no code was changed. The owner's request is in [`BRIEF.md`](BRIEF.md).

> **Raw evidence is not in git.** Paths of the form `evidence/…` in this folder refer to the raw runs (HAR files,
> traces, run JSONs, screenshots, the lead's what-ifs and review; 2.9 GB). They stay on Zeus, in this folder's
> `evidence/` in the client's main checkout.
> The tools below regenerate the batch and what-if runs; ad-hoc analysis and review outputs remain local.
>
> **Units.** Sizes from the harness (tables, `KB` columns) are KiB (1,024 bytes); `MB` in prose is decimal unless
> written MiB. The mobile profile's link is DevTools' "1,474.56 kbit/s" (binary kilobits), which is 184 KiB/s or
> 1.51 Mbit/s. Domain reports quote sizes as their tools printed them; the differences are within 2.4 %.

**Three findings matter most.**

1. **On a phone, every main page waits for the same 2.8–3.3 MB before it works.** On deployed, all 16 pages
   behave alike on the mobile profile (Slow 4G, 4× CPU):
   - first paint at **7.2–7.7 s**, held back by a 72 KB stylesheet that shares the link with 136 JS preloads;
   - hydration at **17.5–21.8 s**.

   Desktop is fine: first paint 0.4–0.8 s, hydration 0.9–1.5 s. The weight is the same on every page:
   - 1.16 MB of root JS preloads, much of it unrelated to the page (recharts, PNRR CSV data, challenge MDX,
     other domains' code);
   - 552 KB of language catalogs in both languages, found only after the entry is parsed;
   - ≈0.75 MB of logo PNGs and an unsubsetted font;
   - the page's own code, never preloaded.

   A lab re-measurement on `/` shows the cheapest first move. Removing the 135 non-entry head preloads took first
   paint from **8.9 s to 3.2 s with no change to hydration**. Cutting bytes is what moves hydration.
   See [PERF-002](issues/PERF-002-css-first-paint.md), [PERF-003](issues/PERF-003-root-preloads.md), [PERF-004](issues/PERF-004-catalogs.md) and [PERF-005](issues/PERF-005-lazy-route-code.md).
2. **`/alegeri` is broken on both targets (P0).** The client still queries `electionCatalog`, which the API
   removed on 2026-10-21. Every visit ends on „Lista edițiilor nu s-a încărcat.", at 19.8 s on mobile and 2.2 s
   on desktop. See [PERF-001](issues/PERF-001-elections-broken.md).
3. **On four pages the main content arrives long after first paint, and LCP hides most of it:**
   - **`/entity-analytics`:** the server fetches the table and then sends a skeleton. LCP is 19.9 s against an
     FCP of 7.2 s, and the fix saves ≈12.6 s. See [PERF-006](issues/PERF-006-entity-analytics-skeleton.md).
   - **`/pnrr`:** the overview waits for a 3.4 MB dataset. It is complete only at **43 s** on mobile, while what
     it shows is 15 KB. See [PERF-007](issues/PERF-007-pnrr-dataset.md).
   - **`/parlament`** and **`/procurement`:** public reads wait for Clerk to load. On mobile this adds +2.8 s and
     +3.6 s after hydration. See [PERF-015](issues/PERF-015-reads-wait-for-clerk.md) and [PERF-014](issues/PERF-014-parliament-browser-only.md).

## Environment

| | deployed | local |
|---|---|---|
| URL | `https://dev-chronos.transparenta.eu` | `https://127.0.0.1:3013` |
| code | image of `4a6d672a` (`VITE_APP_VERSION` in the page; dev `9db3bce0` only pins that image) | production build of dev `9db3bce0`, built as CI builds it: Docker ignore list, `SENTRY_SOURCEMAPS=true`, same `VITE_APP_VERSION`. Same CSS and entry size as deployed; JS file names differ only by Sentry debug IDs |
| serving | Cloudflare: HTTP/3, zstd; HTML `cf-cache-status: DYNAMIC`, assets HIT/immutable | `tools/front-proxy.mjs`: HTTPS + HTTP/2 + zstd level 3 (assets precompressed, HTML streamed) in front of Nitro on `:3015`; certificate trusted by SPKI, so repeat views use the HTTP cache |
| browser → API | `dev-chronos-api.transparenta.eu`, with real CORS preflights | `tools/api-proxy.mjs` on `:3014` → the same API. It answers preflights locally and logs every call |
| SSR → API | in-cluster `INTERNAL_API_URL` (not observable) | the same proxy on `:3016`, over the public internet; every SSR call is logged (`evidence/lead/api-proxy.log`) |
| runtime config | — | the deployed page's public `__APP_RUNTIME_CONFIG__`, plus local API/site URLs (`tools/start-local.mjs`). No env file was read or printed |

- **Date and machine:** 2026-10-27, on Zeus (20 cores).
- **Browser:** Google Chrome **156.0.8078.47**, headless, driven by Playwright over CDP (`tools/perf-run.mjs`).
- **Desktop profile:** 1350×940, no throttling, plain Chrome 156 user agent. Headless Chrome's own UA
  ("HeadlessChrome") counts as a bot, which gets the full-data crawler render (see Method).
- **Mobile profile:** 412×823 at DPR 1.75, touch. DevTools "Slow 4G": 562.5 ms latency, 1,474.56 kbit/s down
  (184 KiB/s, 1.51 Mbit/s) and 675 kbit/s up (84 KiB/s, 691 kbit/s), with 4× CPU slowdown.

## Results per domain

Medians of 3 cold loads (fresh profile) and 3 repeat views. Times in seconds; hydrated = the end of React
hydration (no dehydrated Suspense boundary left). The full set is in `evidence/<domain>/<target>/<page>-<profile>/summary.md`;
all rows are in `evidence/lead/results-table.md`.

| domain · page | target | **mobile** TTFB | FCP | LCP | CLS | TBT | hydrated | repeat LCP | **desktop** TTFB | FCP | LCP | CLS | hydrated | repeat LCP |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| home · `/` | deployed | 0.10 | 7.67 | 7.67 | 0.001 | 1.64 | 19.8 | 0.26 | 0.09 | 0.47 | 0.47 | 0.000 | 1.10 | 0.20 |
|  | local | 0.01 | 8.94 | 8.94 | 0.001 | 1.54 | 19.7 | 0.26 | 0.01 | 0.31 | 0.31 | 0.000 | 0.88 | 0.16 |
| national-budget · `/national-budget` | deployed | 0.09 | 7.28 | 7.80 | 0.001 | 1.92 | 18.4 | 1.93 | 0.13 | 0.41 | 1.05 | 0.436 | 1.31 | 1.00 |
|  | local | 0.03 | 8.52 | 9.01 | 0.001 | 1.62 | 18.0 | 1.95 | 0.03 | 0.24 | 1.02 | 0.436 | 1.28 | 1.39 |
| local-budgets · `/entity-analytics` | deployed | 0.10 | 7.24 | 19.9 | 0.000 | 1.84 | 19.9 | 2.46 | 0.11 | 0.41 | 1.12 | 0.000 | 1.13 | 1.27 |
|  | local | 0.01 | 8.52 | 19.6 | 0.000 | 1.75 | 19.7 | 2.68 | 0.01 | 0.28 | 1.01 | 0.000 | 1.03 | 1.20 |
| local-budgets · `/map` | deployed | 0.12 | 7.38 | 7.38 | 0.000 | 3.51 | 21.8 | 0.31 | 0.12 | 0.44 | 0.44 | 0.003 | 1.24 | 0.14 |
|  | local | 0.01 | 8.55 | 8.55 | 0.000 | 3.41 | 21.8 | 0.32 | 0.01 | 0.23 | 0.23 | 0.003 | 0.80 | 0.13 |
| local-budgets · `/charts` | deployed | 0.11 | 7.27 | 7.27 | 0.000 | 1.29 | 18.1 | 0.87 | 0.11 | 0.42 | 0.42 | 0.000 | 0.91 | 0.20 |
|  | local | 0.02 | 8.54 | 8.54 | 0.000 | 1.29 | 18.1 | 0.87 | 0.02 | 0.31 | 0.31 | 0.000 | 0.74 | 0.17 |
| companies · `/companies` | deployed | 0.15 | 7.34 | 7.34 | 0.000 | 1.75 | 18.4 | 0.92 | 0.15 | 0.52 | 0.52 | 0.000 | 1.02 | 0.30 |
|  | local | 0.03 | 8.78 | 8.78 | 0.000 | 1.85 | 18.6 | 0.85 | 0.04 | 0.36 | 0.36 | 0.000 | 0.88 | 0.26 |
| ngos · `/ngos` | deployed | 0.14 | 7.44 | 7.44 | 0.000 | 1.73 | 18.3 | 0.94 | 0.15 | 0.56 | 0.56 | 0.000 | 1.07 | 0.32 |
|  | local | 0.03 | 8.66 | 8.66 | 0.000 | 1.95 | 18.5 | 0.92 | 0.04 | 0.39 | 0.39 | 0.000 | 1.00 | 0.23 |
| procurement · `/procurement` | deployed | 0.12 | 7.41 | 7.41 | 0.001 | 1.92 | 18.7 | 0.98 | 0.15 | 0.52 | 0.52 | 0.000 | 1.12 | 0.34 |
|  | local | 0.04 | 8.63 | 8.63 | 0.001 | 1.88 | 18.7 | 0.99 | 0.04 | 0.34 | 0.34 | 0.000 | 0.98 | 0.25 |
| justice · `/justice` | deployed | 0.25 | 7.37 | 7.37 | 0.001 | 1.70 | 18.5 | 0.96 | 0.19 | 0.60 | 0.60 | 0.000 | 1.11 | 0.30 |
|  | local | 0.04 | 8.62 | 8.62 | 0.001 | 1.76 | 18.4 | 1.01 | 0.05 | 0.40 | 0.40 | 0.000 | 0.84 | 0.24 |
| public-enterprises · `/public-enterprises` | deployed | 0.12 | 7.38 | 7.38 | 0.001 | 1.78 | 18.4 | 0.84 | 0.25 | 0.68 | 0.68 | 0.000 | 1.43 | 0.35 |
|  | local | 0.05 | 8.66 | 8.66 | 0.001 | 1.68 | 18.6 | 0.94 | 0.05 | 0.35 | 0.35 | 0.000 | 0.90 | 0.23 |
| elections · `/alegeri` | deployed | 0.11 | 7.27 | 7.27 | 0.009 | 1.30 | 17.5 | 0.88 | 0.11 | 0.38 | 0.38 | 0.010 | 0.93 | 0.20 |
|  | local | 0.09 | 8.57 | 8.57 | 0.009 | 1.39 | 17.3 | 0.97 | 0.11 | 0.39 | 0.39 | 0.010 | 0.79 | 0.20 |
| parliament · `/parlament` | deployed | 0.11 | 7.64 | 7.64 | 0.083 | 2.31 | 20.0 | 0.89 | 0.15 | 0.44 | 0.44 | 0.000 | 0.95 | 0.20 |
|  | local | 0.02 | 9.20 | 9.20 | 0.083 | 2.13 | 19.9 | 0.91 | 0.02 | 0.26 | 0.26 | 0.004 | 0.76 | 0.17 |
| ins · `/ins` | deployed | 0.46 | 7.35 | 7.35 | 0.040 | 1.62 | 18.2 | 0.94 | 0.53 | 0.80 | 0.80 | 0.000 | 1.45 | 0.66 |
|  | local | 0.47 | 8.62 | 8.62 | 0.040 | 1.71 | 18.3 | 0.93 | 0.53 | 0.82 | 0.82 | 0.000 | 1.35 | 0.74 |
| legislation · `/legislation` | deployed | 0.24 | 7.66 | 7.66 | 0.027 | 1.41 | 19.8 | 0.86 | 0.27 | 0.59 | 0.61 | 0.001 | 1.09 | 0.38 |
|  | local | 0.23 | 9.11 | 9.11 | 0.027 | 1.54 | 19.9 | 0.85 | 0.22 | 0.48 | 0.48 | 0.000 | 0.91 | 0.38 |
| pnrr · `/pnrr` | deployed | 0.13 | 7.29 | 7.29 | 0.001 | 1.39 | 18.6 | 0.84 | 0.23 | 0.59 | 0.59 | 0.000 | 1.14 | 0.30 |
|  | local | 0.02 | 8.52 | 8.52 | 0.001 | 1.45 | 18.7 | 0.89 | 0.03 | 0.29 | 0.29 | 0.000 | 0.76 | 0.19 |
| primarie · `/primarie` | deployed | 0.11 | 7.29 | 7.29 | 0.001 | 2.04 | 18.1 | 0.92 | 0.11 | 0.42 | 0.42 | 0.000 | 1.12 | 0.23 |
|  | local | 0.02 | 8.56 | 8.56 | 0.001 | 2.06 | 18.2 | 0.88 | 0.02 | 0.26 | 0.26 | 0.000 | 0.80 | 0.16 |

Notes:

- **LCP misses the main content on some pages**, so the table's LCP flatters them. On these pages the real
  content time (mobile cold, deployed) is:

  | page | what the visitor waits for | when |
  |---|---|---|
  | `/entity-analytics` | the table rows | 19.9 s (= LCP) |
  | `/map` | the map drawn | **35.9 s** (desktop 3.9 s) |
  | `/pnrr` | the full overview | **43.2 s** (desktop 3.0 s) |
  | `/parlament` | the hub's content | 25.2–26.0 s |
  | `/national-budget` | the law band | 23.8 s |
  | `/alegeri` | the error state, after a skeleton | 19.8 s |

  Other sections also arrive after hydration; their timings are in the domain reports: procurement's
  newest-contracts band, legislation's counts, and the hubs' county maps, among others.
- **CLS:** the table is the harness median.
  - `/national-budget` shifts its footer by 0.436 on desktop in every load, and by 0.29 on mobile. Chrome flags
    the mobile shift `hadRecentInput` on cold loads, so the median shows 0.001; the repeat views count it
    ([PERF-013](issues/PERF-013-national-budget-head.md)).
  - `/parlament` 0.083, `/ins` 0.04 (the font swap) and `/legislation` 0.027 are real and are covered by their
    issues.
- **`/pnrr` transfer is under-reported by 3.6 MB:** its data is fetched by a Web Worker, which the page-level
  session does not see. The 4× CPU throttle does not reach the worker either. Its runs, and those of `/map`
  (MapLibre worker), wait out the harness cap (⚑ in `evidence/lead/results-table.md`); the milestones are
  unaffected.
- **Local is ≈1.2–1.5 s slower to first paint on mobile** than deployed: HTTP/2 through the proxy against
  Cloudflare's HTTP/3, same bytes. **Local TTFB is lower**, because the server is next door. Otherwise the two
  targets agree within run-to-run spread. Every finding holds on the latest code.
- **Server-side caches:** `/`, `/map` and `/entity-analytics` are served from Nitro's route cache, and
  `/procurement` from a 10-minute memo. The medians therefore show warm servers; the cold-server costs are in
  [PERF-010](issues/PERF-010-server-memo.md) and [PERF-017](issues/PERF-017-html-cache.md).

## Ranked issues

Ranked by severity, then by expected gain × reach. Severity uses the brief's scale:

- **P0** breaks or blocks a main page;
- **P1** costs > 1 s of LCP/TTFB on mobile, or hits most domains;
- **P2** a measurable, local cost;
- **P3** polish.

Two notes on applying the scale:

- The "hits most domains" clause puts the shared bundle items at P1, even where their own gain is moderate.
- Where LCP cannot see the page's main content, the 1 s test is applied to the time that content appears. That
  covers a WebGL map, worker-built panels and client-fetched hubs (`/map`, `/pnrr`, `/parlament`). A delay to a
  secondary band is P2.

The gains are estimates unless marked *measured*.

| id | title | domains | severity | expected gain | owner |
|---|---|---|---|---|---|
| [PERF-001](issues/PERF-001-elections-broken.md) | `/alegeri` fails on every visit: the client queries `electionCatalog`, removed from the API on 2026-10-21 | elections | **P0** | the page works; editions in the SSR HTML at FCP | client |
| [PERF-002](issues/PERF-002-css-first-paint.md) | First paint waits ≈7 s on mobile for a 72 KB stylesheet that shares the link with 136 preloads | all 16 pages | **P1** | **FCP −5.7 s** on mobile at equal hydration (*measured*, lab, `/`) | client |
| [PERF-003](issues/PERF-003-root-preloads.md) | Every page preloads 136 chunks (1.16 MB) of mostly unrelated code; chunk groups capture `react`, `jsx-runtime` | all 16 pages | **P1** | ≈−280 KB zstd and ≈−0.5 s main thread on mobile per first visit | client |
| [PERF-004](issues/PERF-004-catalogs.md) | Both languages' Lingui catalogs (552 KB) load on every page | all 16 pages | **P1** | −309 kB (≈−295 kB on `/pnrr`), ≈−1.7 s of mobile transfer per first visit | client |
| [PERF-005](issues/PERF-005-lazy-route-code.md) | The page's own route code is never preloaded; it starts 5.5–5.8 s after the entry on mobile | all 16 pages | **P1** | hydration **−1.4 to −2.4 s** on mobile (*measured*, lab), if it does not delay the CSS | client |
| [PERF-006](issues/PERF-006-entity-analytics-skeleton.md) | `/entity-analytics` fetches its table on the server but sends a skeleton: LCP 19.9 s on mobile | local budgets | **P1** | LCP **−12.6 s** mobile, −0.7 s desktop | client |
| [PERF-007](issues/PERF-007-pnrr-dataset.md) | `/pnrr`'s overview waits for the whole 3.4 MB dataset in a worker: complete at 43 s on mobile | PNRR | **P1** | full overview **≈−24 s** mobile, −1.8 s desktop; −3.4 MB | client, infra |
| [PERF-008](issues/PERF-008-images-font.md) | ≈400 KB of logo PNGs and a 350 KB unsubsetted font on every first visit | all 16 pages | **P1** | ≈−600 KB per first visit (≈3 s of mobile transfer) | client |
| [PERF-009](issues/PERF-009-map-first-frame.md) | `/map` draws its first frame at 35.9 s on mobile after a serial chain that starts at hydration | local budgets | **P1** | map drawn ≈−4 to −5 s mobile, −0.3 to −0.9 s desktop | client, infra |
| [PERF-010](issues/PERF-010-server-memo.md) | Server data memos expire every 10 min with no stale-while-revalidate: next visitor waits 1.5–3.2 s | procurement (+ justice, public-enterprise sub-pages) | **P1** | TTFB −1.5 to −3 s for visits after expiry | client |
| [PERF-011](issues/PERF-011-sentry-posthog.md) | Sentry (with Replay and Feedback) and PostHog ship to every visitor, consent or not | all 16 pages | **P1** | ≈−190 KB (≈1 s of mobile transfer) | client |
| [PERF-012](issues/PERF-012-clerk-eager.md) | Clerk's development instance loads for every visitor; its arrival can discard streamed HTML | all 16 pages | **P1** | −300 KB third-party JS, ≈−270 ms mobile main thread; no re-render (−14 calls on `/national-budget`) | client, infra |
| [PERF-013](issues/PERF-013-national-budget-head.md) | `/national-budget` hides its static `h1` behind one page-wide Suspense: CLS 0.29–0.44 on every load | national budget | **P1** | CLS → 0; LCP −0.5 to −1.06 s mobile, −0.64 s desktop | client |
| [PERF-014](issues/PERF-014-parliament-browser-only.md) | `/parlament` fetches all content in the browser after Clerk: content at 25–26 s on mobile | parliament (hidden surface) | **P1** | content at FCP (≈−18 s mobile) with a loader; −2.75 s with `auth: 'none'` alone | client |
| [PERF-015](issues/PERF-015-reads-wait-for-clerk.md) | Public browser reads wait for Clerk before they are sent | procurement, local budgets (`/map`), parliament, town hall (search) | **P2** | first read −2.8 to −3.6 s mobile, −0.5 to −0.9 s desktop | client |
| [PERF-016](issues/PERF-016-header-art-preloads.md) | Legislation and parliament preload header PNGs that phones never show | legislation, parliament | **P2** | hydration **−1.35 to −1.5 s** mobile (*measured*, parliament); −0.4 to −0.8 MB desktop | client |
| [PERF-017](issues/PERF-017-html-cache.md) | HTML caching: Nitro's route cache rewrites headers, keys on cookies set on every visit, renders without them | `/`, `/map`, `/entity-analytics`; repeat views on all hubs | **P2** | repeat TTFB −0.6 s on `/entity-analytics`; repeat FCP ≈−0.65 s on hubs; EN/dark visitors not re-rendered | client, infra |
| [PERF-018](issues/PERF-018-route-dead-weight.md) | Route code carries modules the first view never runs (SheetJS, other views, both locales, dialog barrels) | local budgets, justice, legislation, parliament, NGOs, town hall | **P2** | −9 to −120 KB before hydration per page; −0.4 to −0.7 s mobile hydration on the larger ones | client |
| [PERF-019](issues/PERF-019-map-assets.md) | Map pages ship MapLibre and Leaflet together, and a 3.1 MB unrounded, uncached UAT GeoJSON | local budgets, PNRR, town hall | **P2** | ≈−240 KB on Leaflet pages; ≈−300 KB per UAT map load | client, infra |
| [PERF-020](issues/PERF-020-county-map.md) | The hubs' county map downloads 400 KB of GeoJSON after hydration and projects it on the main thread | 6 hubs: companies, NGOs, procurement, justice, public enterprises, INS | **P2** | −88 KB and ≈−250 ms mobile TBT per hub visit | client, infra |
| [PERF-021](issues/PERF-021-blocking-ssr-loaders.md) | SSR loaders hold the first byte for reads the first screen doesn't show, with no cache | INS, legislation, elections | **P2** | TTFB −300 to −450 ms (`/ins`), −100 to −150 ms (`/legislation`) | client, server |
| [PERF-022](issues/PERF-022-slow-resolvers.md) | Several API reads that main pages wait for take 0.65–1.25 s at the server | local budgets, national budget, legislation, procurement, INS, home | **P2** | −0.5 to −1 s per affected read | server |
| [PERF-023](issues/PERF-023-national-budget-law-chain.md) | `/national-budget`'s law band reads 2 × 5 pages in a chain in the browser | national budget | **P2** | law band −5 to −6 s; −10 calls | server, client |
| [PERF-024](issues/PERF-024-preflight-max-age.md) | CORS preflights carry no `Access-Control-Max-Age`, so browsers repeat them every 5 s | the 7 pages that make preflighted JSON POSTs on load (12 per load on `/parlament`) | **P2** | ≈1 RTT per later burst (≈0.5 s on a real mobile link) | server |
| [PERF-025](issues/PERF-025-parliament-heatmaps.md) | `/parlament`'s activity heatmaps cost ≈1.2 s of mobile main thread | parliament | **P2** | −0.7 to −0.9 s mobile main thread; TBT −0.6 s | client |
| [PERF-026](issues/PERF-026-hub-search.md) | Every hub's pre-hydration code carries the search's own combobox library (`@base-ui/react`) | 6 hubs and `/` | **P2** | ≈−45 KB, ≈−0.25 s mobile per hub | client |

Smaller items (P3) stay in the domain reports and are not repeated here. Examples:

- `/` landing effects in the hydration task (home-3) and its 245 KB HTML (home-6);
- national budget's 148 KB of dehydrated query data (national-budget-5);
- justice's per-call `Intl` formatters;
- unlabelled procurement reads on the wire (procurement-7);
- `/charts` reading localStorage during hydration;
- PNRR's hourly refresh blocking the event loop ≈0.7 s per pod (pnrr-6);
- INS chunks in the root set (ins-3).

## Cross-cutting themes

- **On a slow link, bytes before hydration are the whole story, and their order only moves the wait between
  milestones.** Every page ships the same 2.8–3.3 MB before hydration, and the mobile profile moves it at
  184 KiB/s. Two natural experiments confirm the arithmetic: legislation's and parliament's hidden header PNGs,
  ≈0.32 MB, delay hydration by 1.35–1.5 s. The lead's what-ifs confirm the trade-off: more preloads made
  hydration earlier and first paint later; fewer preloads did the opposite.
- **The route-file and chunk-group setup leaks code across domains.** Eager route files pull feature, schema
  and data modules into every page's entry graph. Named vendor groups swallow shared dependencies: `react` lives
  in the Clerk chunk, and `jsx-runtime` in the English challenge content. Lazy route code is invisible to the
  preload manifest. All three are build-level, so one fix pattern applies to every domain.
- **Auth and analytics load for everyone.** Clerk's development instance, Sentry and PostHog load for anonymous
  visitors. Public reads default to waiting for Clerk, and Clerk's arrival can discard streamed server HTML.
- **Servers re-do work the data doesn't need.** No CDN caches HTML. Nitro's route cache keys on cookies the app
  writes on every visit and renders without them. Memos expire with no stale-while-revalidate. Several loaders
  block the first byte on reads the first screen doesn't show. Several API reads take ≈0.7–1.2 s for small,
  rarely-changing answers.
- **Static data is processed in the browser on every visit:** county shapes projected per hub (≈250–300 ms per
  mobile load on six hubs), a 3.1 MB unrounded UAT file, and PNRR's 28 MB dataset processed for a 15 KB
  overview.

## Method

1. **Entry points:** each one was confirmed from the deployed sidebar and landing page.
   - Redirects: `/entities` 307 → `/entity-analytics`, `/budget-explorer` 301 → `/national-budget`,
     `/achizitii` 301 → `/procurement`, `/justitie` 301 → `/justice`, `/intreprinderi-publice` 301 →
     `/public-enterprises`.
   - `/investitii-publice` answers 404 (`publicInvestments: false`), so it was dropped.
   - `/map` and `/charts` were added, as sidebar items 2 and 3.
   - `/parlament` is not reachable from the navigation, and `/primarie` is a campaign step, not a domain front
     door. Both were measured and are reported, but they weigh less in the ranking.
   - `/provocare`, the campaign's front door, was not measured.
2. **Timed runs** (`tools/run-batch.sh`, `tools/pages.txt`): one load at a time under
   `flock /tmp/perf-audit-2026-10-27.lock`. For each page, each profile and each target:
   - 3 cold loads in a fresh browser context, each followed by a repeat view in the same context;
   - 1 extra traced cold load, kept out of the medians.

   A load ends after 2 s with no request in flight, at least 3 s after `load`. The cap is 45 s on desktop and
   120 s on mobile. TBT sums `max(task duration − 50 ms, 0)` over long tasks that start after FCP, up to the
   end of the recording (settle or cap).
3. **What each load records** (`tools/perf-run.mjs`):
   - Web Vitals from `PerformanceObserver`: LCP with its element, layout shifts, long tasks, long animation
     frames;
   - hydration and React commit times from the React DevTools hook;
   - every request from CDP, with its category, priority, initiator, timing, encoded and decoded bytes, and
     headers;
   - every API call, with its operation, preflight, and whether it chained after another call;
   - SSR API calls from the local proxy log;
   - the HAR, the trace, the screenshot and the SSR HTML. Screenshots and HTML were skipped for pages that show
     people.
4. **Shared phases per page:** `tools/shared-metrics.py` gives CSS end, the preload wave, the catalog step, the
   route-code step, hydration and Clerk; output in `evidence/lead/phases-*.md`.
5. **Causes:** traced in the code at `9db3bce0` and in the build's chunks, using the CI build's source maps,
   with source-map byte attribution as a proxy. Server code is only named, never analysed, and marked `server`.
6. **Domain analysis:** one subagent per domain (14), each writing `domains/<domain>.md`. The lead merged their
   candidates into the issues above.
7. **Lead re-measurement** (`tools/whatif.sh`, `tools/front-proxy-variant.mjs`): the same local build behind a
   proxy that rewrites the HTML head (more preloads / no preloads). Mobile, 3 cold loads per variant. Results in
   `evidence/lead/whatif/RESULTS.md`.
8. **Fresh-eyes review:** a reviewer subagent re-checked the top issues' code references and numbers against
   the raw evidence, and re-ran two deployed mobile pages (`evidence/lead/review/REVIEW.md`).
   - All 12 drafts held. Nine got corrections, which are applied: line ranges, two wrong paths or mechanisms,
     and the catalogs' gain, which is bytes, not discovery. One severity went down: waiting for Clerk is P2.
   - The re-runs of `/` and `/entity-analytics` on deployed mobile (20:18–20:21) reproduced every phase median
     of the batch (16:5x–17:5x) within 0.12 s.
   - The P0's API error was reproduced independently.
9. **Limits:**
   - DevTools throttling does not apply HTTP/2 or HTTP/3 priorities, does not delay preflights or the setup of
     new connections, and does not throttle workers.
   - Desktop numbers are from a fast LAN.
   - Real-device numbers will differ; see Open questions.

**Crawler path:** `isbot()` user agents (curl, `HeadlessChrome`) get `renderRouterToStream`'s `allReady` render,
so their TTFB is the full data time. On `/national-budget` that is 2.2 s, against 0.1 s for a browser.

## Open questions

1. **Real devices.** How much of the 7 s mobile first paint survives on a real phone behind Cloudflare, which
   applies priorities? One WebPageTest (Moto G, 4G) or real-device run on `/` before the fixes would size
   [PERF-002](issues/PERF-002-css-first-paint.md) properly.
2. **Production.** Production (`transparenta.eu`) was out of scope. Its Clerk instance, cache rules and replica
   count decide how much of [PERF-012](issues/PERF-012-clerk-eager.md), [PERF-017](issues/PERF-017-html-cache.md) and [PERF-010](issues/PERF-010-server-memo.md) applies there.
3. **Elections branch.** The elections area session may already be porting the client to the new elections
   API; that was not checked ([PERF-001](issues/PERF-001-elections-broken.md)).
4. **Clerk re-render.** Which context change reaches the pending Suspense boundary is not pinned down. Other
   streamed pages' desktop repeat views should be checked for duplicate reads ([PERF-012](issues/PERF-012-clerk-eager.md)).
5. **Old chunks after a deploy.** `/` is cached by browsers for an hour. Do old hashed chunks stay fetchable
   that long (asset retention in the image or CDN)?
6. **Server-side resolvers** behind [PERF-022](issues/PERF-022-slow-resolvers.md): their profiles are the server team's to take.
7. **Nitro cache memory** on the pods is not observable from outside.

## Other findings, not performance

- **Campaign participant counts:** `/api/v1/campaigns/funky/subscription-stats` answers 404 on dev-chronos. The
  redesigned server app does not register it. The town-hall campaign polls it every 60 s, and its participant
  counts are silently missing (primarie-6, owner `server`).
- **Page titles:** `/entity-analytics`, `/map` and `/charts` export `head()` from `.lazy.tsx` files, which
  TanStack ignores. Their title is the generic "Transparenta.eu", with no description or canonical
  (local-budgets).
- **Elections docs:** `docs/design/elections/design.md:537` still documents `electionCatalog`.
- **Map page wording:** `/map` states „Geometria hărții nu este disponibilă." while the geometry is merely not
  loaded yet ([PERF-009](issues/PERF-009-map-first-frame.md)).

## Reproduce

Everything runs on the local target. Ports 3013–3016 are used for the batch, plus 3017–3019 for the what-ifs.
Every timed run takes the shared lock. Step 1 runs from the repository root. For steps 3–5, run
`cd docs/performance/2026-10-27-main-pages` first, and use absolute paths for the build, the certificate and the
logs.

1. **Build** as the Dockerfile does, from a copy of the checkout without the `.dockerignore` paths:
   - `SENTRY_SOURCEMAPS=true VITE_APP_VERSION=<deployed sha> yarn build:app && yarn build:validate`;
   - `yarn sentry:prepare-artifacts` keeps the source maps that the chunk attribution uses.
2. **Certificate:** make a self-signed certificate for `127.0.0.1`, and put its SPKI hash in `PERF_SPKI`. That
   is the base64 SHA-256 of the public key, which Chrome takes for `--ignore-certificate-errors-spki-list`.
3. **Start the local target**, each command in its own terminal:
   - `TLS_KEY=… TLS_CERT=… LOG_FILE=<api log> node tools/api-proxy.mjs` (`:3014` for the browser, `:3016` for SSR);
   - `node tools/start-local.mjs <build dir>` (Nitro on `:3015`);
   - `TLS_KEY=… TLS_CERT=… node tools/front-proxy.mjs` (`:3013`).

   Warm the server with one request per page before timing.
4. **Batch:** `PERF_SPKI=… PROXY_LOG=<api log> bash tools/run-batch.sh tools/pages.txt`. Then run
   `node tools/aggregate.mjs`, and `python3 tools/shared-metrics.py <deployed|local> <mobile|desktop>` for the
   phase tables. `node tools/trace-summary.mjs <trace>` summarises one trace.
5. **What-ifs:** start `tools/front-proxy-variant.mjs` three times, with `TLS_KEY`/`TLS_CERT` set each time:
   - `PORT=3017` (control);
   - `PORT=3018 EXTRA_PRELOADS=tools/whatif-extra-preloads.json`;
   - `PORT=3019 STRIP_PRELOADS=1`.

   Then `PERF_SPKI=… PROXY_LOG=… bash tools/whatif.sh <build dir>`. The extra-preload list names chunks of the
   `9db3bce0` build; regenerate it for another build.

## Files

- `domains/<domain>.md`: the 14 domain reports. Local budgets covers `/entity-analytics`, `/map` and `/charts`.
- `issues/PERF-NNN-*.md`: one doc per issue.
- `tools/`: the harness, the local target's proxies, the batch, the aggregation and the what-if scripts.
- `evidence/`: on Zeus only (see the note at the top).

The local server and proxies were stopped at the end of the audit.
