# PNRR — `/pnrr`

Subagent report, 2026-10-27 main-page audit. Code at dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/pnrr/{deployed,local}/pnrr-{desktop,mobile}/`; extra run and its script in `evidence/pnrr/extra/`.
Not a people page.

**Read this first: the harness under-reports this page.** The data is loaded by a dedicated Web Worker, and the
harness's page-level CDP session neither sees the worker's requests nor throttles the worker's CPU:

- `requests`/`transferBytes` miss the worker bundle (245 KB) and `/api/pnrr/raw/*` (3.40 MB). They are in
  `run1.har` (Playwright records context-wide) and are quoted from there below.
- The worker script never "finishes" on the page session, so in-flight never reaches 0 and **every PNRR run ran
  to the cap** (`hitCap: true`, 45 s desktop / 120 s mobile). Harmless for the medians; it means the runs saw the
  whole page life.
- The network throttle *does* reach the worker (HAR: 3.40 MB in 19.7 s on mobile), but the 4× CPU throttle does
  not: worker-thread busy time is 2,595 ms on mobile and 2,554 ms on desktop (`trace-cold.trace.json`, thread
  "DedicatedWorker thread"), and Chrome 156 refuses it outright on a worker target („Operation is only supported
  for pages, not workers", `extra/probe-worker-cdp.mjs`). Mobile worker CPU below is therefore desktop speed; at
  4× it would add ≈4.5 s (estimate: the 1.3 s processing task, the parse and the module evaluation ×4).
- LCP is SSR text, so LCP/FCP do not show the page's real wait. The metric that matters here is **"full
  overview"**: the React commit that replaces the „Loading the full PNRR dataset…" status with the rankings,
  previews and charts (last entry of `reactCommitTimes`, checked against the HAR and the worker trace).

## 1. Entry point

- The landing page links `/pnrr` (`<a href="/pnrr">`, card „PNRR", `src/features/landing/lib/landing-groups.ts:81-86`;
  present in the SSR HTML of `/`). **Not in the sidebar** (`src/components/sidebar/*` has no PNRR entry).
- Routes: `src/routes/pnrr.tsx` (eager: `validateSearch`, `loaderDeps`, `head`, `headers`, `loader`) +
  `src/routes/pnrr.lazy.tsx` → `src/features/pnrr/components/PnrrDashboard.tsx`.
- Other spellings: `/pnrr/` → **307 → `/pnrr`**; `/PNRR` → 200, the same page, canonical `/pnrr` (the router
  matches case-insensitively). No Romanian alias. `/pnrr/proiecte|organizatii|judete|surse|verificare` are a
  different GraphQL-backed explorer (`components/live/PnrrLivePages.tsx`, `ssr: false`), not measured.

## 2. Numbers

Medians of 3 (`summary.json`). Harness TTFB (excludes the emulated 562 ms latency on mobile; the document's
`wait` is 565–568 ms there). **Full overview** = see above. *Transfer and JS exclude the worker*: add
**≈3,566 KB** deployed (worker 239 KB zstd + projects 3,321 KB gzip + 6 KB) / **≈3,231 KB** local (projects
2,986 KB zstd via the front proxy, see pnrr-5) to every cold row (KB = KiB, as in the harness).

| target · profile · view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | **full overview** | req | transfer KB | JS KB xfer / dec | API | HTML KB xfer / dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed · desktop · cold | 235 | 588 | 588 | 0 | 224 | 1,105 / 1,143 | **2,976** | 246 | 3,073 (+3,566) | 2,233 / 6,552 | 0 | 20 / 101 |
| deployed · desktop · warm | 130 | 300 | 300 | 0 | 110 | 563 / 583 | **2,210** | 245 | 26 | 0 / 6,552 | 0 | 20 / 101 |
| deployed · mobile · cold | 129 | 7,288 | 7,288 | 0.001 | 1,393 | 18,342 / 18,556 | **43,207** | 246 | 3,073 (+3,566) | 2,234 / 6,552 | 0 | 20 / 101 |
| deployed · mobile · warm | 146 | 836 | 836 | 0 | 563 | 1,784 / 1,892 | **3,739** | 245 | 25 | 0 / 6,552 | 0 | 20 / 101 |
| local · desktop · cold | 28 | 292 | 292 | 0 | 226 | 719 / 758 | **2,689** | 244 | 2,945 (+3,231) | 2,109 / 6,521 | 0 | 20 / 100 |
| local · desktop · warm | 28 | 192 | 192 | 0 | 0 | 406 / 425 | **2,112** | 243 | 24 | 0 / 6,521 | 0 | 20 / 100 |
| local · mobile · cold | 23 | 8,520 | 8,520 | 0.001 | 1,453 | 18,540 / 18,733 | **41,514** | 244 | 2,945 (+3,231) | 2,109 / 6,521 | 0 | 20 / 100 |
| local · mobile · warm | 25 | 888 | 888 | 0 | 610 | 1,830 / 1,925 | **3,640** | 243 | 24 | 0 / 6,521 | 0 | 20 / 100 |

- **LCP element:** SSR text in `PnrrHeader`: desktop `span.block` (the h1's second line „și Reziliență"),
  mobile `p.mt-4.max-w-[720px]…` (the subtitle „Explorează proiectele publicate…"). Both come from the SSR
  snapshot and wait only for the CSS (shared: home-S4).
- SSR renders the header and four metric cards from the server's in-memory snapshot
  (`seoSnapshot` in the HTML; `cache-control: public, max-age=0, s-maxage=300, stale-while-revalidate=3600`,
  `vary: Accept-Encoding, Cookie`, `cf-cache-status: DYNAMIC`). Below them sits a skeleton until the full overview.
- Warm views: the raw files come from the browser cache (max-age 60 + SWR 600; the cold load ended within that
  window), so the warm "full overview" (2.1–3.7 s) is hydration + worker CPU only.
- Deployed vs local: local mobile reaches the full overview 1.7 s earlier only because the local front proxy
  re-compresses the projects file with zstd-3 (3.06 MB vs 3.40 MB gzip, pnrr-5). Local FCP is 1.2 s later on
  mobile (CSS 8.4 s vs 7.1 s; shared: home-S4, the front proxy's h2 vs Cloudflare's h3).

## 3. Waterfall (deployed, mobile, cold, run 1: `run1-cold.json`, `run1.har`, `trace-cold.trace.json`)

1. 0 → 734 ms document (20 KB zstd; snapshot in it). 651 ms: 136 modulepreloads incl. PNRR's own
   `data-transform-*.js` (108 KB, 671 → 8,580 ms, pnrr-2), CSS 651 → 7,236 → **FCP/LCP 7,448 ms** (home-S4).
2. Entry 651 → 10,789; catalogs 10,772 → 15,008 (home-S2); evaluation task 1.22 s at 15,098 (home-S1).
3. `pnrr.lazy` 16,485 → 18,314 (68 KB, not preloaded: **entry end → lazy start 5.70 s**, home-S3) → hydration
   18,568 / 18,760. Clerk 18.2 → 24.5 s in parallel (≈300 KB, home-S6).
4. `useQuery` → `import(pnrr-worker-client)` 18,774 → 19,344 → `new Worker` → worker bundle 19,348 → 21,479
   (245 KB zstd / 722 KB).
5. `/api/pnrr/raw/projects` **21,546 → 41,294** (3.40 MB gzip = 28.2 MB JSON; 571 ms wait + 19.2 s receive).
6. JSON.parse in the worker, then payments + indicators 41,433 → 42,032 (serial, one more RTT).
7. Worker processing, one 1.3 s task at 41.5 s (unthrottled CPU) → postMessage → **full overview commit
   43,294 ms**, 24.7 s after hydration. CLS 0.001 (the swap happens below the cards).

Desktop deployed (run 1): hydration 1,120 → worker 1,203 → projects 1,364 → 1,627 → payments/indicators
1,748 → 1,813 → worker task 1.5 s → full overview 3,064 ms.

## 4. API calls

No GraphQL: `apiCalls` 0 and `ssrApiCalls` 0 on all 24 loads, no preflights. The page's data goes through
the app's own proxy, fetched by the worker with plain `fetch()` (`workers/pnrr-data.worker.ts:108-123`), so
the harness lists none of it. From `run1.har`:

| request | where | start (mobile / desktop) | duration (mobile / desktop) | size | chained after |
|---|---|---|---|---|---|
| `/assets/pnrr-worker-client-*.js` | browser | 18,774 / 1,176 | 570 / 25 | 1 KB | hydration → `useQuery` (`hooks/usePnrrData.ts:24-45`) |
| `/assets/pnrr-data.worker-*.js` | browser | 19,348 / 1,203 | 2,131 / 92 | 239 KB zstd (722 KB) | the client chunk (`new Worker`, `workers/pnrr-worker-client.ts:22`) |
| `/api/pnrr/raw/projects` | browser (worker) | 21,546 / 1,364 | **19,748** / 263 | **3,400,854 B gzip** (28,170,600 B) | worker start |
| `/api/pnrr/raw/payments` | browser (worker) | 41,433 / 1,748 | 599 / 43 | 4.9 KB (42 KB) | projects download **and** its `JSON.parse` |
| `/api/pnrr/raw/indicators` | browser (worker) | 41,433 / 1,748 | 576 / 65 | 0.9 KB | same |

- Responses: `cache-control: public, max-age=60, s-maxage=3600, stale-while-revalidate=600`
  (`server/handlers/pnrr-data-proxy.ts:567-569`), `content-encoding: gzip`, **no ETag / Last-Modified**,
  `cf-cache-status: DYNAMIC`, `x-data-source: cache` (projects) — on the deployed desktop run 1, payments and
  indicators said `upstream`: that pod refetched them from S3 during the load.
- **SSR never waits for them.** The loader reads only the in-process cache (`seo/pnrr-seo-loader.ts:130-142`):
  warm → snapshot (cached per search key, 1 h); cold pod → `seoSnapshot: null` + background warm-up, and the
  route answers `no-store` (`routes/pnrr.tsx:24-29`). All measured renders had the snapshot.
- **Clerk (home-S6):** no read on `/pnrr` waits for Clerk — the worker's `fetch` carries no auth. Clerk's
  ≈300 KB (18.2–24.5 s) still shares the Slow-4G link with the worker bundle and the start of the projects
  download (≈1.6 s of link time). The `/pnrr/*` sub-pages use `api/pnrr-api.live.ts` (22 `graphqlQuery` calls,
  default `auth: 'optional'`) and would wait; not measured.
- Server caches (home-S10): raw files and processed projects in module scope, 1 h fresh / 7 days stale
  (`pnrr-data-proxy.ts:48-49,109-130`); SEO snapshots per search key, 1 h, ≤ 50 keys (`pnrr-seo-loader.ts:28-48`).
  The deployed pod behaves the same (TTFB 92–367 ms desktop, `cfOrigin` 32–280 ms; see pnrr-6 for the spikes).

## 5. Candidate issues

### pnrr-1 — The overview waits for the whole 28 MB dataset: full overview at 43 s on mobile, 3 s on desktop

- **Numbers.** Full overview: mobile cold **43.2 s** deployed / 41.5 s local, i.e. **24.7 s after hydration**;
  desktop 2.98 / 2.69 s (1.8 s after hydration). Of the mobile 24.7 s: projects download 19.7 s, worker bundle
  2.1 s, client chunk 0.6 s, the serial payments fetch 0.6 s, worker CPU 1.3 s (unthrottled; ≈+4.5 s on a 4×
  slower CPU, estimate). The extra run reproduced 43.2 s (`extra/deployed-mobile-throttled-worker.json`). Each cold visit
  moves **3.40 MB** (decoded 28.2 MB of pretty-printed JSON, 24,966 rows) to show four cards that SSR already
  rendered plus rankings that are aggregates. Evidence: `deployed/pnrr-mobile/run1.har`, `run{1,2,3}-cold.json`
  `reactCommitTimes`, `trace-cold.trace.json`.
- **What the overview needs.** Running the built worker (`pnrr-data.worker-*.js`) on the same files in Node:
  the overview model without the UAT map series is **64 KB JSON / 15 KB gzip**; the UAT-level map preview
  646 KB / 111 KB; the whole query result (all tabs + facets) 1.1 MB / 190 KB gzip — vs 3.4 MB for the raw rows.
  The server already holds the processed projects (`fetchPnrrProjects`, `pnrr-data-proxy.ts:632-691`) and builds
  the 2 KB SEO snapshot from them (`pnrr-seo.ts:255-320`).
- **Cause.** Design (`docs/PNRR-DASHBOARD-IMPLEMENTATION.md`): the browser worker downloads and processes all raw
  files for every view (`workers/pnrr-data.worker.ts:116-123`, `query()` at `:1429`); the SSR snapshot covers only
  the header and the four cards (`PnrrDashboard.tsx:116-121`, `PnrrOverview.tsx:228-233`).
- **Fix.** Build the overview model on the server (same code, `buildOverview` in the worker module, cached per
  search key like the snapshot) and dehydrate it in SSR or serve it from a small `/api/pnrr/overview`; render the
  map preview at county granularity or fetch its UAT series separately. Load the raw dataset only when the visitor
  opens projects / map / beneficiaries / anomalies, filters, or exports (or on idle on desktop).
- **Gain (estimate).** Mobile: full overview at hydration (≈18.6 s, or SSR-complete) instead of 43.2 s
  (**−24 s**); desktop −1.8 s; −3.4 MB per default-view visit. LCP/FCP unchanged (SSR text).
- Owner client · **P1** (blocks the page's main content by >20 s on mobile; LCP does not show it) · shared? no ·
  new (the architecture is documented, its cost was not measured).

### pnrr-2 — PNRR's CSV data ships to every page through `pnrr.tsx` → `pnrr-seo.ts` (part of home-S1)

- **Numbers.** `data-transform-*.js` is a root modulepreload: **345,342 B raw / 108 KB zstd**, of which
  **324 KB are two CSV files** (94 %) inlined by `?raw`. On `/pnrr` mobile it loads 650 → 8,563 ms inside the FCP
  window (`deployed/pnrr-mobile/run2-cold.json`); `/` loads it identically (`evidence/home`). At evaluation it
  parses both CSVs at module scope: loading the built chunk in Node on Zeus takes 26–34 ms vs 9.5–11.5 ms with
  the two parse calls removed (≈16–22 ms of parsing; ≈65–90 ms at 4× CPU, estimate) on **every page**.
- **Cause (confirmed chain).** `src/routes/pnrr.tsx:8-12` (eager, in the entry graph for `head`/`loaderDeps`)
  imports `features/pnrr/seo/pnrr-seo.ts`, which imports `computeAggregates`, `filterProjectsBySearch`,
  `processPnrrData` from `lib/data-transform.ts` (`pnrr-seo.ts:11-15`) — used only by the server-side snapshot
  builders (`pnrr-seo.ts:242-262`). `data-transform.ts:22-26` imports `lib/pnrr-uat-assignment.ts`, which inlines
  `@/assets/data/pnrr-beneficiary-entity-directory.csv?raw` (276 KB) and `public-companies-2023.csv?raw` (50 KB)
  (`pnrr-uat-assignment.ts:1,4`) and parses them at load (`:131`, `:148`). `src/schemas/pnrr.ts` (raw-row zod
  schemas + `parsePnrrSearch`, 22 KB source) shares the chunk. Nothing else in the entry graph imports
  `data-transform` (the other importers are `pnrr.lazy` components, the worker and the server handler).
- **Fix.** Split `pnrr-seo.ts`: keep `normalizePnrrSeoSnapshotSearch`, `buildPnrrSeoSnapshotSearchKey`,
  `buildPnrrRouteHead` in a light module; move `buildPnrrSeoSnapshotFrom*` to e.g. `pnrr-seo-snapshot.ts`, imported
  only by `pnrr-seo-loader.ts:175,216` (already dynamic) and `server/handlers/pnrr-share-image.ts:8-13`. Make the
  two CSV parses lazy (memoised on first lookup). Split the search schema from the raw-row schemas in
  `schemas/pnrr.ts`. Verify that `data-transform-*` leaves the root list in the manifest.
- **Gain.** −108 KB zstd / −345 KB on every first visit to any page (≈0.6 s of Slow-4G link time inside the
  FCP window, home-S4); ≈20 ms desktop / ≈70 ms mobile (estimate) less evaluation per page load.
- Owner client · **P1** (hits all pages) · shared: **yes, cross-reference home-S1** (home lists „PNRR CSV data
  318 KB"; it is this chunk, a root *preload* evaluated with the entry, not part of `index-*.js` itself) · new.

### pnrr-3 — The data fetch starts late and runs in series; the worker bundle carries 480 KB it barely needs

- **Numbers (mobile cold deployed, HAR).** Hydration 18,568 → projects request 21,546 (**+3.0 s**: client chunk
  570 ms + worker bundle 2,131 ms + start); payments/indicators wait for projects *and* its parse (+0.6 s, one RTT).
  Desktop: +0.24 s and +0.12 s. Worker bundle `pnrr-data.worker-*.js`: 722,601 B raw / 239 KB zstd, of which the
  two CSVs again (324 KB of its text) and, by source-map proxy, zod 35 % of sources (272 KB), `uat-mapping` +
  `uat-populations` 220 KB, chart/company-analytics schemas 113 KB, papaparse 19 KB.
- **Cause.** The worker is created only in the first client render's `queryFn` (`hooks/usePnrrData.ts:30-44`,
  `staleTime: Infinity`), after the lazy chunk and hydration; `loadModel` awaits projects (including
  `response.json()`) before starting the two small files (`workers/pnrr-data.worker.ts:119-123`). The worker
  imports `@/schemas/pnrr`, whose `import { Currency } from './charts'` (`schemas/pnrr.ts:2`) pulls
  `schemas/charts.ts` → `company-analytics.ts`, colour utils etc.; every raw row is validated with zod
  (`lib/data-transform.ts:1353`, 180–220 ms of the 780 ms `processPnrrData` in Node).
- **Fix.** Start the worker (and its fetch) from the route's client `loader`/module load instead of the first
  render; `Promise.all` the three files; move `Currency` to a tiny module; drop or sample the per-row zod
  validation (the files are frozen, `PNRR_SNAPSHOT_PREFIX = '20260619'`); give the CSV lookups a compact
  precomputed form (or do the UAT assignment on the server, pnrr-1).
- **Gain (estimate).** Mobile ≈1.5–2 s earlier data (bundle −40–50 % + parallel fetch); desktop ≈0.3 s. Mostly
  moot for the default view if pnrr-1 lands; still applies to the other tabs.
- Owner client · **P2** · shared? no · new.

### pnrr-4 — Every worker query builds every tab: 0.6–1.7 s of worker CPU and a 1.1 MB message per filter change

- **Numbers.** Built worker in Node (Zeus, unthrottled): first query 1.7–1.8 s (parse 90 ms, `processPnrrData`
  ≈780 ms, models ≈600 ms); a repeat query with the model loaded **0.55–0.66 s**; result 1.05 MB (V8) /
  1.1 MB JSON posted to the main thread: UAT map preview 646 KB, filter facets 322 KB (3,085 UATs), overview
  64 KB, projects page 40 KB, anomalies 39 KB. In Chrome the worker is busy 2.55–2.60 s per cold load, longest task
  1.3–1.5 s (`trace-cold.trace.json`, both profiles; CPU throttling does not reach the worker, so a phone would take
  several times longer).
- **Hot spots** (`--cpu-prof`, `processPnrrData`): `formatLocalityDisplay` 195 ms self —
  `toLocaleLowerCase/UpperCase('ro-RO')` per regex match on ≈25 k rows with ≈3 k distinct localities
  (`lib/pnrr-uat-assignment.ts:267-277`); zod parse ≈160 ms; `normalizeRawProject` 132 ms; GC 161 ms.
- **Cause.** `query()` (`workers/pnrr-data.worker.ts:1429-1470`) returns overview, projectPage, beneficiaryPage,
  anomalyModel, mapModel and filterFacets on every call, and the overview always includes a UAT-level map
  (`:1317`, `buildMapModel(records, search, 'total-value', 'uat')`), whatever tab is open.
- **Fix.** Compute only the active view (+ facets once per model); county-level map preview, UAT on demand;
  memoise `formatLocalityDisplay` per distinct input; cut zod from the hot loop (pnrr-3).
- **Gain (estimate).** ≈0.4–0.5 s less worker CPU per filter/tab change on a desktop-class CPU (×3–5 on phones),
  ≈1 MB less structured clone per change; first load −0.3 s.
- Owner client · **P2** · shared? no · new.

### pnrr-5 — The 3.4 MB file is served uncached at the edge, pretty-printed, gzip-only, without validators

- **Numbers.** `cf-cache-status: DYNAMIC` on every `/api/pnrr/raw/*` response: each visit pulls 3.4 MB from the
  pod. No ETag/Last-Modified (the S3 object has both) and `max-age=60` + `stale-while-revalidate=600`
  (`pnrr-data-proxy.ts:567-569`): a visitor returning after 11 min re-downloads all of it; within the window the
  browser serves the copy and re-downloads in the background (second `projects` entry in the warm part of
  `run1.har`). Format: the JSON is indented (28.2 MB; 20.75 MB minified). Same data: gzip as served 3.40 MB ·
  minified gzip 3.04 MB · minified brotli-5 1.94 MB · zstd-19 1.61 MB. Local proof that the size matters: zstd-3
  via the front proxy (3.06 MB) made the mobile full overview 1.7 s earlier (41.5 vs 43.2 s).
- **Cause.** The proxy re-serves the upstream file as text (`fetchPnrrRawFile`, `pnrr-data-proxy.ts:333-392`)
  with fixed short-lived headers; Cloudflare caches nothing under `/api/` without a rule (home-S8 for HTML).
  The file set is frozen and versioned (`lib/snapshot.ts:2`, `PNRR_SNAPSHOT_PREFIX = '20260619'`).
- **Fix.** Version the URL with the file-set id and serve `public, max-age=31536000, immutable` + ETag; minify and
  precompress once per refresh (brotli/zstd, async), honour `Accept-Encoding`; add a Cloudflare cache rule for
  `/api/pnrr/raw/*`.
- **Gain (estimate).** Mobile projects download 19.7 s → ≈10–11 s with brotli/zstd-19 (**−8 to −9 s** of full
  overview on Slow 4G, desktop ≈−0.1 s); repeat visits after 11 min −3.4 MB / −19 s; pod egress. Becomes small if
  pnrr-1 lands (the file is then needed only for the explorer tabs).
- Owner client (headers, precompression) + infra (Cloudflare rule) · **P2** (P1 while pnrr-1 is open) ·
  shared? no (the Cloudflare part is home-S8's theme) · new.

### pnrr-6 — Hourly refresh blocks the server's event loop ≈0.7 s per pod (every page), and the raw cache has no SWR

- **Numbers (Node 24 on Zeus, same files).** On expiry (1 h, `pnrr-data-proxy.ts:48`): `gunzipSync` + decode
  ≈105 ms (`:256`), `gzipSync` of 28 MB ≈303 ms (`:300`), cloning the 28 MB string into the processing worker
  ≈27 ms (`:188-193`), deserialising the 21,785 processed projects back on the main thread ≈150 ms (38 MB V8,
  `:213`), then `buildPnrrSeoSnapshotFromProjects` **140–205 ms per search key**, synchronous
  (`pnrr-seo-loader.ts:174-185`, `:215-223`). ≈0.7–0.8 s of event-loop blocking per pod per hour, felt by any
  request in flight. Consistent with the batch: the first local `/pnrr` load after >1 h idle had TTFB 315 ms and
  the next 247 ms (later 17–28 ms; `local/pnrr-desktop.log`); deployed desktop `cfOrigin` 280 and 251 ms in 2 of 4
  loads vs 32–83 ms. Not isolated (one observation each).
- **Also.** `fetchPnrrRawFile` serves a stale entry only when the upstream fails (`:336-391`): the first
  `/api/pnrr/raw/*` request after expiry waits for S3 + the sync work. The upstream already serves the same gzip
  bytes (`s3.devostack.com`, 3,399,296 B, ETag) that the handler decompresses and re-compresses.
- **Fix.** Pass the upstream gzip through (or precompress in the worker thread, pnrr-5); use async zlib; do fetch +
  parse + process + snapshot in the worker thread and keep the main thread to a pointer swap; stale-while-revalidate
  for raw files; with a frozen file set, refresh daily or on a release signal instead of hourly.
- **Gain (estimate).** Removes ≈0.7 s/h/pod of stalls from every page's tail TTFB, ≈0.5–1 s for the first PNRR
  visitor each hour.
- Owner client · **P3** · shared? partly (stalls hit every page on the pod; home-S10 lists the caches) · new.

### pnrr-7 — The route chunk: 68 KB zstd, late (home-S3), with every tab and a 170 KB UAT table inside

- **Numbers.** `pnrr.lazy-*.js` 233 KB raw / 68 KB zstd; **entry end → lazy start 5.56 s** median on mobile
  cold deployed (5.52–5.70; local 5.81), then 1.83 s to arrive → hydration 18.34 s; desktop gap 0.51 s, download
  ≈50 ms (home-S3). The route adds 72 chunks / 707 KB zstd beyond the root preloads, ≈172 KB of it PNRR-specific
  (the rest are the catalogs of home-S2). Main thread attributed to `pnrr.lazy` on mobile: 458 ms (hydration task
  288 ms). By source (proxy): `uat-mapping.ts` 170 KB (a 52 KB literal in the chunk), beneficiaries view 34 KB,
  filter sheet 31 KB, overview 31 KB, map view 28 KB, project table 26 KB, info sheet 24 KB.
- **Cause.** `PnrrDashboard.tsx:15-25` imports all tab views and both sheets statically; `uat-mapping` comes in
  only for active-filter labels (`filters/PnrrActiveFilters.tsx:20` → `lib/pnrr-uat-labels.ts:1-4`, which also
  brings papaparse and the CSV), although the worker already returns UAT labels (`filterFacets.uats`).
- **Fix.** home-S3 (preload the route chunk); `lazy()` the non-overview tabs and the sheets; take UAT labels from
  the worker result.
- **Gain (estimate).** ≈1.8 s earlier hydration on mobile from the preload (home-S3's estimate is 1–1.5 s);
  ≈−30–40 KB zstd on the critical chunk (≈0.2 s Slow 4G).
- Owner client · **P3** (the preload part is home-S3, P1) · shared: home-S3 · new.

### Shared causes seen on `/pnrr` (numbers only; analysis in `domains/home.md`)

- **shared: home-S1** — 136 modulepreloads in the HTML; cold JS 2,233 KB transfer / 6,552 KB decoded,
  236 chunks; evaluation task 1.17 s mobile (886 ms in the trace) / 274 ms desktop. PNRR's own part: pnrr-2.
- **shared: home-S2** — all six catalogs incl. both `pnrr` catalogs (13 + 14 KB) at 10.77 → 15.0 s on mobile.
  `/pnrr` needs only `ro/messages` + `ro/pnrr`.
- **shared: home-S3** — entry end → `pnrr.lazy` start 5.56 s mobile / 0.51 s desktop (pnrr-7).
- **shared: home-S4** — CSS (70 KB) 627 → 7,148 ms on mobile → FCP/LCP 7.29 s deployed (local 8.52 s);
  desktop CSS 100–377 → 182–452 ms, FCP 588 ms.
- **shared: home-S5/S7** — logo PNG 197 KB at 626 → 10,048 ms and again `/logo.png` 197 KB; Inter 342 KB
  666 → 11,216 ms; Sentry 109 KB and PostHog 75 KB in the first wave.
- **shared: home-S6** — Clerk ≈300 KB, 18.2 → 24.5 s on mobile; no `/pnrr` read waits for it (§4).
- **shared: home-S8** — `/pnrr` is not in the Nitro route cache; its own headers say `s-maxage=300`, Cloudflare
  answers DYNAMIC (HTML and `/api/pnrr/raw/*`, pnrr-5).
- **shared: home-S9** — no preflights on `/pnrr` (no API calls).
- **shared: home-S11** — no effect here: the SSR loader never suspends on data (snapshot from memory).

## 6. Not checked / open questions

- **Worker CPU on a phone.** Not measurable with CDP: Chrome rejects `Emulation.setCPUThrottlingRate` on worker
  targets. One extra mobile run (`extra/deployed-mobile-throttled-worker.json`, worker network emulated over raw
  CDP) reproduced the batch exactly (projects 19.75 s, full overview 43.2 s). A real low-end phone needs a device
  run (≈+4.5 s estimated at 4×).
- Cold pod: a pod without the in-memory cache renders no snapshot (skeleton cards, `no-store`) — not observed;
  both servers were warm. Number of deployed pods unknown (payments `upstream` on one load suggests a pod with an
  expired cache, not necessarily several pods).
- Memory per pod: the raw text (28 MB, UTF-16 in V8 since the data has diacritics), its gzip and the processed
  projects (38 MB serialised) are held in module scope for up to 7 days; not measured.
- The map preview and histogram (`lazy()`, deferred until visible) were never loaded in these runs (no scroll),
  so their geojson/Leaflet cost is not in the numbers.
- The `/pnrr/*` GraphQL sub-pages (home-S6 applies to them) were not measured.
- Harness: `requests`, `transferBytes` and `jsChunks` miss dedicated-worker traffic and `hitCap` is always true
  for pages with a worker (in-flight count never returns to 0); other domains with workers would be affected the
  same way.
