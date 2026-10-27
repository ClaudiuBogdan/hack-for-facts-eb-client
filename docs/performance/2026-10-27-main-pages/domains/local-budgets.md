# Local budgets — `/entity-analytics`, `/map`, `/charts`

Audit of 2026-10-27 (deployed image `4a6d672a`, local build of dev `9db3bce0`). Evidence:
`evidence/local-budgets/{deployed,local}/<slug>-{desktop,mobile}/` (slugs `entity-analytics`, `map`, `charts`).
Medians of 3 cold + 3 repeat loads. Times in ms from navigation start unless marked s.

## Entry point

- **The domain's entry point is `/entity-analytics`.** It is the target of `/entities` (the brief's candidate),
  which answers **307 → `/entity-analytics`** (`src/routes/entities/index.tsx:4-9`, `replace: true`). It is in the
  sidebar ("Entity Analytics", `src/components/sidebar/nav-main.tsx:67-70`), on the landing page ("Analiza
  entităților" in "Instituții și organizații", `src/features/landing/lib/landing-groups.ts:93-98`, plus the
  start-here panel's zoom link, `start-here-panel.tsx:225-227`), and it is the only one of the three pages that
  serves public budget data from the server.
- `/map` is sidebar item 2 and the landing tile "Hartă" (group "Instrumente", `landing-groups.ts:162-166`). It is a
  heavy secondary tool on the same data. Measured as a main page because the sidebar puts it second.
- `/charts` is the browser-local list of saved charts (localStorage, `src/routes/charts/index.lazy.tsx:40-46`); a new
  visitor sees "No charts yet". Sidebar item 3 and landing tile "Grafice". No public data, not an entry point.
  `/charts/` answers 307 → `/charts`.
- `/budget-explorer` (named in the brief) answers **301 → `/national-budget`** and is in neither the sidebar nor
  the landing page: dropped from this domain.
- No page in this domain shows people.

## Shared causes seen here (cite the home report)

| Shared | Numbers on these pages (mobile cold, deployed unless noted) |
|---|---|
| home-S1 root preloads | first wave 137 scripts / 1,143 KB, done 10.8 s (entity-analytics); entry 259 KB zstd ends 10.8 s; recharts (125 KB) is in it |
| home-S2 catalogs | `messages` en+ro 467 KB zstd requested 10.8 s → 15.0 s on all three pages; module evaluation task 1.18–1.24 s at ~15.0 s |
| home-S3 lazy route chunk not preloaded | lazy chunk start − entry end: **5.6 s** on all three pages (mostly S2 + evaluation). Route wave after that: `/charts` 45 files / 113 KB, 1.5 s · `/entity-analytics` 69 files / 289 KB, **2.6 s** · `/map` 107 files / 535 KB, **4.7 s**; hydration 0.2–0.5 s after. Desktop: gap 0.44–0.65 s, wave 0.04–0.4 s |
| home-S4 CSS | `index-*.css` 70 KB ends 7.1 s → FCP 7.2–7.4 s (8.5 s local) on all three |
| home-S5 logo/font | `logo-*.png` 197 KB + `/logo.png` 197 KB (in the route wave, 16.4 → 19.8 s) + Inter 342 KB |
| home-S6 Clerk | 338 KB from the Clerk FAPI host per cold load; clerk-js starts ~0.1 s before the hydration commit; `/v1/client` ends +2.9 s (entity-analytics) / +3.9 s (map, link busy with GeoJSON) after hydration on mobile; +0.6–1.0 s desktop. Per-call effect: see API sections |
| home-S7 Sentry/PostHog | 109 + 75 KB zstd in the first wave |
| home-S8 Nitro route cache | confirmed on `/map` and `/entity-analytics` (both targets): `max-age=300` reaches browsers; `lang="ro" class="light"` despite `user-locale=en; ui-theme=dark` cookies (`/charts`, not cached, honours them). Sized under local-budgets-3 |
| home-S9 preflights | `/map`: 1 per load (77–142 ms deployed mobile, 53–103 ms desktop); others: no browser API call |
| home-S11 bots | curl sees the same buffered body as browsers on these cached routes |

---

## `/entity-analytics` (entry point)

### Numbers

| target · profile · view | TTFB | FCP | LCP | CLS | TBT | hydr. shell / end | req | transfer KB | JS KB (transfer / decoded) | API calls | HTML KB (transfer / decoded) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| deployed · desktop · cold | 111 | 412 | 1124 | 0 | 227 | 916 / 1134 | 277 | 3509 | 2387 / 6991 | 0 | 23 / 143 |
| deployed · desktop · warm | **705** | 848 | 1272 | 0 | 85 | 1160 / 1270 | 276 | 27 | 0 / 6991 | 0 | 23 / 143 |
| deployed · mobile · cold | 95 | 7244 | **19880** | 0 | 1839 | 19351 / 19914 | 273 | 3229 | 2387 / 6991 | 0 | 23 / 143 |
| deployed · mobile · warm | **661** | 912 | 2456 | 0 | 953 | 2101 / 2480 | 272 | 27 | 0 / 6991 | 0 | 23 / 143 |
| local · desktop · cold | 6 | 276 | 1012 | 0 | 232 | 745 / 1032 | 275 | 3363 | 2247 / 6960 | 0 | 22 / 142 |
| local · desktop · warm | **698** | 828 | 1196 | 0 | 0 | 1079 / 1203 | 274 | 26 | 0 / 6960 | 0 | 22 / 142 |
| local · mobile · cold | 8 | 8520 | **19616** | 0 | 1752 | 19069 / 19655 | 271 | 3086 | 2247 / 6960 | 0 | 22 / 142 |
| local · mobile · warm | **723** | 1020 | 2684 | 0 | 1064 | 2313 / 2691 | 270 | 26 | 0 / 6960 | 0 | 22 / 142 |

LCP element: `p.my-2.text-xs.text-muted-foreground` = the population-methodology note at the top of the table,
which exists only once the table has rows (`EntityAnalyticsTable.tsx:256`). FCP candidate is the page subtitle.
DOM 1,612–1,745 nodes; the filter panel makes the HTML 143 KB decoded (map/charts: 90 KB). No console errors.

### Waterfall (deployed, mobile cold, run 2)

1. Document 0 → 722 (TTFB 586 incl. 562 ms throttled latency; Nitro cache hit, `cfOrigin` 30 ms).
2. CSS 629 → 7,134 → FCP 7,240 (subtitle). Font 663 → 11,242; logo PNG → 10,089.
3. Entry + 136 preloads → 10,773; catalogs 10,804 → 15,032; evaluation task 15.0–16.2 s (1.24 s).
4. Route wave (not preloaded, home-S3): `entity-analytics.lazy` 16,406 → 69 files / 289 KB zstd → 19,015.
5. Hydration 19,293 (807 ms hydration task in the trace) → table rows replace the SSR skeleton → **LCP 19,844**.
6. Clerk 19,180 → FAPI 21.0–22.2 s → UI chunks to 24.6 s (last React commit 24,655). No browser API call.

### API calls

| operation | where | start | duration | size | chained after |
|---|---|---:|---:|---:|---|
| `EntityAnalytics` (default ranking, 25 rows) | SSR, only on a Nitro cache miss | +28 ms after the document request | **625–900 ms, median ≈680** (14 renders, proxy log) | 1.5 KB gzip | nothing; it is the page's whole TTFB on a miss |
| — | browser | — | — | — | data arrives in the HTML stream (seroval script, 6.8 KB) |

Cold server render (warm-up 16:50:44): one `EntityAnalytics`, 677 ms. Batch cold loads were Nitro hits (TTFB
6–8 ms local, 95–111 ms deployed, no SSR call); every repeat view was a miss with one SSR call (747 ms in
`local/entity-analytics-mobile/run1-warm.json`). Other `EntityAnalytics` shapes on other pages take 93–339 ms; this
default query is the slow one (server: `hack-for-facts-eb-server/src/modules/budget/shell/repo/rankings.ts`, via
`.../graphql/legacy/grouped-resolvers.ts`). home-S6: the page makes no browser API read; its query uses
`auth: "none"` (`src/lib/api/entity-analytics.ts:85`) and would not wait for Clerk.

---

## `/map`

### Numbers

| target · profile · view | TTFB | FCP | LCP | CLS | TBT | hydr. shell / end | req | transfer KB | JS KB (transfer / decoded) | API calls | HTML KB (transfer / decoded) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| deployed · desktop · cold | 120 | 440 | 440 | 0.003 | 932 | 1183 / 1239 | 326 | 5053 | 2936 / 8772 | 1 | 18 / 90 |
| deployed · desktop · warm | 2 | 136 | 136 | 0.003 | 782 | 459 / 592 | 325 | 32 | 0 / 8772 | 1 | 0 / 90 |
| deployed · mobile · cold | 118 | 7376 | 7376 | 0 | 3507 | 21496 / 21778 | 322 | 4778 | 2936 / 8772 | 1 | 18 / 90 |
| deployed · mobile · warm | 2 | 312 | 312 | 0 | 2144 | 1519 / 2012 | 321 | 32 | 0 / 8772 | 1 | 0 / 90 |
| local · desktop · cold | 8 | 232 | 232 | 0.003 | 994 | 740 / 801 | 324 | 4888 | 2776 / 8741 | 1 | 18 / 89 |
| local · desktop · warm | 2 | 128 | 128 | 0.003 | 704 | 393 / 515 | 323 | 31 | 0 / 8741 | 1 | 0 / 89 |
| local · mobile · cold | 8 | 8552 | 8552 | 0 | 3406 | 21502 / 21768 | 320 | 4610 | 2776 / 8741 | 1 | 18 / 89 |
| local · mobile · warm | 2 | 324 | 324 | 0 | 2111 | 1521 / 2040 | 319 | 31 | 0 / 8741 | 1 | 0 / 89 |

**LCP does not see the map.** The LCP element is the population note above the map (`p.my-2.text-xs`); the
MapLibre canvas is WebGL and is never an LCP candidate. Proxy used below for "map drawn": end of the last long
task after the glyphs arrive (labels placed). Medians: **mobile cold 35.9 s** (deployed) / 35.8 s (local),
**desktop cold 3.9 s** / 3.6 s, mobile repeat 6.1–6.2 s, desktop repeat 3.0 s. Main thread busy 7.2 s on mobile
(entity-analytics 3.7 s); `maps-*.js` (MapLibre) 518 ms self time, "Commit" 1.28 s; TBT 3.5 s.
All map runs are flagged HIT-CAP: the MapLibre worker request never gets a `loadingFinished` event, so the
harness's "quiet" never comes; milestones are unaffected. No console errors.

What the server sends: the page shell plus, in the map area, **"Geometria hărții nu este disponibilă."**
(`ssr.html`), because the GeoJSON query is disabled on the server and not loading
(`map-analytics-workspace.tsx:3776-3789`; see local-budgets-6).

### Waterfall (deployed, mobile cold, run 2) — the map's chain

1. Document → 713; CSS → FCP 7,276 (population note = LCP). Entry → 10,750; catalogs → 15,017; evaluation.
2. Route wave (home-S3): `map.lazy` 16,331 → 107 files / 535 KB zstd (incl. `map-analytics-workspace` 164 KB, of
   which **SheetJS ≈112 KB**) → 21,018. Hydration 21,496.
3. After hydration, in parallel: GeoJSON UAT 21,704 → **28,535** (699 KB zstd / 3.1 MB) and County 21,707 → 23,981
   (113 KB); clerk-js 21,378 → 24,012, FAPI `/v1/client` → 25,356.
4. `grouped-series` POST 25,420 → 26,834 — **started 30–70 ms after Clerk's `/v1/client`**, 3.9 s after hydration.
5. `InteractiveMap` + `maps-*.js` (MapLibre + Leaflet, 297 KB zstd) requested only when both GeoJSON and series
   data are in: 28,968 → 31,316. MapLibre CSS 29,799.
6. Worker `maplibre-gl-worker` (132 KB zstd) 31,776; GeoJSON tiled in the worker; glyphs from
   **`demotiles.maplibre.org`** 33,956 → 35,338 (3 × PBF, 148 KB); label/paint long tasks to **35,821**.

Desktop (deployed cold, run 2): hydration 1,183 → GeoJSON 1,231–1,343 → Clerk client 1,845 → series 1,884–2,025 →
MapLibre 2,119–2,164 → worker 2,459 → glyphs 3,235–3,294 → last long task 3,856. Here the **Clerk wait is the
critical path** (the GeoJSON was already in at 1,343).

### API and data calls

| call | where | start (mob / desk) | duration (mob / desk) | size | chained after |
|---|---|---:|---:|---:|---|
| `POST /api/v1/advanced-map-analytics/grouped-series` (REST) | browser | 25,420 / 1,884 | 1,414 / 141 (server 74–482 ms, median 226 via proxy) | 27 KB zstd / 61 KB | **Clerk ready** (`/v1/client` end + 30–70 ms), home-S6; preflight 77–142 / 53–103 ms |
| `GET /geojson/uat-2026-03-09.json` | browser, static | 21,704 / 1,231 | 6,831 / 112 | 699 KB zstd / 3.1 MB | hydration (query mounts in the workspace) |
| `GET /geojson/judete-2026-03-09.json` | browser, static | 21,707 / 1,231 | 2,274 / 106 | 113 KB / 390 KB | hydration (county outlines on by default, `schemas/advanced-map-analytics.ts:777`) |
| `GET demotiles.maplibre.org/font/Noto Sans Regular/{0,256,512}.pbf` | browser, third party | 33,956 / 3,235 | 1,382 / 59 | 148 KB | worker tiling; `max-age=600` |
| SSR | — | — | — | — | none (cold warm-up render and batch alike) |

home-S6 answer for `/map`: **yes**, the one API read waits for Clerk — not through `graphqlQuery` but explicitly:
`fetchGroupedSeriesData` awaits `getAuthToken()` (`src/lib/api/map-series.ts:101-104`) → `waitForClerk()`
(`src/lib/auth/index.tsx:353-395`). Cost: +0.65–0.70 s after the hydration shell on desktop cold (Clerk `/v1/client` ends +0.61–0.66 s; critical
path), +1.18–1.61 s after the shell (+0.68–0.77 s after hydration end) on mobile repeat views, +3.9 s on mobile cold (hidden there behind the 6.8 s GeoJSON download, but Clerk's 338 KB
competes with it for the link).

---

## `/charts`

### Numbers

| target · profile · view | TTFB | FCP | LCP | CLS | TBT | hydr. shell / end | req | transfer KB | JS KB (transfer / decoded) | API calls | HTML KB (transfer / decoded) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| deployed · desktop · cold | 110 | 420 | 420 | 0 | 233 | 882 / 914 | 252 | 3319 | 2203 / 6413 | 0 | 18 / 90 |
| deployed · desktop · warm | 60 | 196 | 196 | 0 | 89 | 420 / 436 | 251 | 22 | 0 / 6413 | 0 | 18 / 90 |
| deployed · mobile · cold | 108 | 7268 | 7268 | 0 | 1289 | 17987 / 18130 | 248 | 3040 | 2203 / 6413 | 0 | 18 / 90 |
| deployed · mobile · warm | 55 | 868 | 868 | 0 | 682 | 1861 / 1936 | 247 | 22 | 0 / 6413 | 0 | 18 / 90 |
| local · desktop · cold | 23 | 308 | 308 | 0 | 231 | 715 / 742 | 250 | 3186 | 2075 / 6382 | 0 | 17 / 90 |
| local · desktop · warm | 18 | 168 | 168 | 0 | 0 | 384 / 400 | 249 | 21 | 0 / 6382 | 0 | 17 / 90 |
| local · mobile · cold | 18 | 8544 | 8544 | 0 | 1294 | 18001 / 18147 | 246 | 2909 | 2075 / 6382 | 0 | 17 / 90 |
| local · mobile · warm | 19 | 868 | 868 | 0 | 645 | 1802 / 1877 | 245 | 21 | 0 / 6382 | 0 | 17 / 90 |

LCP element: the empty-state paragraph (`p.text-muted-foreground.mb-6`, mobile) / a footer paragraph (desktop),
painted at FCP. `Cache-Control: no-store` (no route headers, no Nitro rule), so repeat views revalidate (55–60 ms).
No API calls, no SSR calls. Waterfall = the shared one: CSS → FCP 7.3 s, entry → 10.7 s, catalogs → 15.0 s,
route wave 16.3 → 17.8 s (45 files, 113 KB), hydration 18.0 s. Nothing here is page-specific beyond
local-budgets-7.

---

## Candidate issues

### local-budgets-1 — `/entity-analytics` fetches the table on the server but renders a skeleton, so LCP waits for hydration

- **Numbers.** SSR HTML has 11 `animate-pulse` skeleton rows and the 25 rows only as a streamed script
  (`ssr.html`: 25 × `entity_cui`). LCP = the table note at hydration: **mobile 19.6–19.9 s vs FCP 7.2–8.5 s**;
  desktop 1.01–1.12 s vs FCP 0.28–0.41 s; repeat mobile 2.46–2.68 s vs FCP 0.91–1.02 s. Evidence:
  `{deployed,local}/entity-analytics-*/summary.md`, `run2-cold.json` (`lcpCandidates`).
- **Cause.** `src/routes/entity-analytics.tsx:36-41` starts the query with `void queryClient.prefetchQuery(...)` in
  `beforeLoad` and does not await it; the page reads it with plain `useQuery`
  (`src/routes/entity-analytics.lazy.tsx:69-72`), so SSR renders `isLoading` (`EntityAnalyticsTable.tsx:243-252`).
  The server still waits for the query before sending anything (Nitro buffers the body, home-S8.4), so the wait
  buys nothing visible.
- **Fix.** Await the data on the server for the table view (`loader: () => queryClient.ensureQueryData(...)`, or
  `useSuspenseQuery` under a Suspense boundary so it streams when the route is not cached) and render the rows in
  the HTML. Keep the column-preference state (`useTablePreferences`, localStorage) from changing the SSR markup.
- **Gain.** LCP ≈ FCP: **≈ −12 s on mobile cold** (19.9 → ≈7.3 s, then bounded by home-S4), ≈ −0.7 s desktop
  cold, ≈ −1.5 s mobile repeat. No TTFB cost on Nitro hits; none on misses either (already buffered).
- Owner client · **P1** · shared? no · new (the entity page's progressive SSR is in
  `docs/reviews/ENTITY-PROGRESSIVE-SSR-2026-09-13.md`; this list page was not covered).

### local-budgets-2 — `/map` draws after a serial chain of ~6 network steps; the 3.1 MB GeoJSON starts only after hydration

- **Numbers (map drawn).** Mobile cold **35.9 s** (hydration 21.5 s, so 14.4 s after hydration); desktop cold 3.9 s
  (2.7 s after hydration); repeat 6.1 s mobile / 3.0 s desktop. Chain on mobile: GeoJSON 21.7 → 28.5 s (699 KB zstd)
  → MapLibre chunk 29.0 → 31.3 s (297 KB) → worker 31.8 s (132 KB) → glyphs 34.0 → 35.3 s → paint 35.8 s.
  `evidence/local-budgets/*/map-*/run*-cold.json`, `trace-summary.txt`.
- **Causes.**
  1. GeoJSON is fetched only when the workspace mounts after hydration (`src/hooks/useGeoJson.ts:53-65`,
     `map-analytics-workspace.tsx:2008-2021`). The route's prefetch is in `beforeLoad` and client-only
     (`src/routes/map.tsx:15-23`); TanStack does not run `beforeLoad` on hydration (it reuses the server context,
     `node_modules/@tanstack/router-core/dist/esm/ssr/ssr-client.js:8`), so it fires only on client navigation.
  2. The file is unrounded: 56,112 points at 14.4 decimals on average, 737 KB of properties. Rounded to 5 decimals
     (≈1 m): **3.10 → 2.06 MB raw, 697 → 393 KB zstd, 484 → 265 KB brotli** (measured on
     `public/geojson/uat-2026-03-09.json`). It has no `Cache-Control` and Cloudflare does not cache `.json`
     (`cf-cache-status: DYNAMIC`); repeat views rely on heuristic freshness from `Last-Modified`.
  3. `InteractiveMap` (MapLibre, `maps-*.js` 297 KB zstd) is imported only once both data sets are in
     (`map-analytics-workspace.tsx:178-181`, `:3140` `isMapLoading`). The editor and public-map routes already
     warm it with `warmAdvancedAnalyticsMapResources` (`analytics-map-warmup.ts:14-36`); `/map` does not.
  4. The MapLibre chunk carries **Leaflet, 148 KB raw / 46 KB zstd**, because `InteractiveMap.tsx:50-53` imports two
     zoom constants from `components/maps/polygonLabels.ts`, which imports `leaflet` at the top (`:2`).
  5. Glyphs come from MapLibre's demo server (`InteractiveMap.tsx:121`), third party, `max-age=600`, and are
     requested only after the worker has tiled the GeoJSON (worker → glyphs 0.8 s desktop / 1.3 s mobile even warm).
- **Fix.** Start GeoJSON and the `InteractiveMap` import when the route chunk loads (call
  `warmAdvancedAnalyticsMapResources({ includeCountyGeoJson: true })` from the `/map` component, or a client
  `loader`); round the published GeoJSON to 5 decimals and drop unused properties (new dated file, per
  `useGeoJson.ts:13-16`); serve `/geojson/*` with `Cache-Control: public, max-age=31536000, immutable` and let
  Cloudflare cache/compress it (brotli); move the zoom constants out of `polygonLabels.ts`; self-host the three glyph
  ranges on the same origin (immutable) and preload them with the worker. Longer term: pre-tiled boundaries
  (PMTiles is already a dependency) instead of a 3 MB GeoJSON tiled in the browser.
- **Gain (estimate).** Mobile cold: −304 KB zstd GeoJSON (≈ −1.7 s on Slow 4G) − 46 KB Leaflet (≈ −0.25 s);
  overlapping MapLibre/worker/glyphs with the GeoJSON removes ≈3 serial request steps (≈ −2 to −3 s); together
  ≈ −4 to −5 s on "map drawn" (35.9 → ≈31 s; the rest is home-S1/S2/S6). Desktop ≈ −0.2 to −0.3 s (its critical path is the Clerk wait, home-S6).
  Real Slow 4G gains more on the glyph step: DevTools throttling does not delay the new `demotiles` connection.
- Owner client (+ infra for `/geojson` caching) · **P1** (> 1 s on mobile) · shared? no · partly known (map
  workspace 525 KB in `docs/entity-page-ssr-loading.md:138`); the chain and the GeoJSON size are new.

### local-budgets-3 — Every repeat visit to `/entity-analytics` misses both caches and waits ~0.7 s for a slow ranking query

- **Numbers.** Repeat-view TTFB **705 ms desktop / 661 ms mobile (deployed)**, 698 / 723 local, vs 111 / 95 on the
  cold (cookie-less) load; one SSR `EntityAnalytics` (747 ms) per repeat view (`local/*/run1-warm.json`
  `ssrApiCalls`). Curl on deployed: no cookie 112 ms (`x-envoy-upstream-service-time: 6`); unique cookie
  758–799 ms (upstream 664–711 ms). `/map`, same Nitro cache but no `Vary: Cookie`, repeats from the browser cache
  (TTFB 2 ms). The default query alone: 625–900 ms (median ≈680, n = 14) while other `EntityAnalytics` shapes take
  93–339 ms.
- **Cause.** (a) The route answers `Vary: Accept-Encoding, Cookie` (`src/routes/entity-analytics.tsx:24`), so the
  browser's `max-age=300` copy from the first visit does not match once cookies exist. (b) Nitro keys the cache on
  the whole Cookie header (`nitro.config.ts:3-8,36`, home-S8.3). (c) Every first visit sets cookies:
  `user-currency` and `user-inflation-adjusted` on every mount even at their defaults
  (`src/lib/hooks/useUserCurrency.ts:33-35`, `useUserInflationAdjusted.ts:39`) and Clerk's development-instance
  `__clerk_db_jwt*` / `__client_uat*` (unique per browser). (d) On a miss the cached handler buffers the body until
  the query resolves (home-S8.4). (e) The query is slow on the server.
- **Fix.** As home-S8 (no cookie in the key; render cookie-free and apply preferences on the client), drop `Cookie`
  from the route's `Vary`, stop writing default preference cookies on mount; server: speed up the default ranking
  (`hack-for-facts-eb-server/src/modules/budget/shell/repo/rankings.ts`) or cache it per data release.
- **Gain.** −0.6 s TTFB and LCP on every repeat visit after the first (desktop and mobile); with the server fix,
  −0.5 s on every cache miss (new filters, new pod).
- Owner client (cache key, cookies) + server (query) · **P2** · shared? yes, home-S8 (this is its costliest
  instance) · Cloudflare part known in `docs/entity-page-ssr-loading.md:129-131`; the cookie miss is new.

### local-budgets-4 — SheetJS ships in the `/map` route chunk, before hydration

- **Numbers.** `map-analytics-workspace-*.js` 525 KB raw / 164 KB zstd, of which **`xlsx` 324 KB raw / 112 KB
  zstd (64 %)** (source-map attribution of generated bytes). It is a static import of `map.lazy`, so it is in the
  pre-hydration route wave: 535 KB / **4.7 s** on mobile vs 289 KB / 2.6 s on `/entity-analytics`; map hydrates
  21.5 s vs 19.3 s. The public, read-only map never parses a spreadsheet.
- **Cause.** `uploaded-map-dataset-browser.tsx:29` imports `formatAdvancedMapDatasetJsonValue` from
  `src/features/advanced-map-datasets/utils/draft.ts`, which imports `xlsx` and `papaparse` at the top (`:1-2`) for
  the upload parser (`:342`, `:368`).
- **Fix.** Move the formatter to its own module, or `await import('xlsx')` / `import('papaparse')` inside the
  parse functions. Check that no other static path keeps it (`dataset-editor-page.tsx` may keep it statically; fine).
- **Gain (estimate).** −112 KB zstd before hydration on `/map`: ≈ −0.6 s hydration on mobile cold (plus compile of
  324 KB at 4× CPU); ≈ −30 ms desktop. Also the map-editor and dataset routes that load the workspace.
- Owner client · **P2** · shared? no · known in part: `docs/entity-page-ssr-loading.md:138` lists the "map
  workspace 525KB" chunk; its contents (SheetJS) are new.

### local-budgets-5 — `/entity-analytics` loads the line-items/treemap view, all four classification JSONs and a Markdown renderer for the table view

- **Numbers.** Route wave 69 files / 289 KB zstd / 786 KB decoded, 2.6 s on mobile before hydration. Reachable only
  through the line-items view (`useFinancialData`, `motion`, treemap hooks, chart links): **216 KB raw / 70 KB gzip**.
  `economic-classifications-general-en-*.js` holds functional + economic trees in **both** languages: 166 KB / 35 KB
  zstd. `lib-*.js` (unified/micromark/react-markdown) 113 KB / 37 KB, pulled by the filter's classification info
  link (`chart-filter-utils` → `classification-info-link` → `ClassificationDescription`).
- **Cause.** Static imports in `src/routes/entity-analytics.lazy.tsx:18-19` (`EntityAnalyticsLineItems`,
  `EntityAnalyticsTreemap`) though the default view is `table` (`entity-analytics.tsx:7,11`);
  `src/lib/economic-classifications.ts:1-2` imports both locales' JSON.
- **Fix.** `lazy()` the line-items/treemap view; load the classification JSON for the active locale only (or
  on demand for labels); load the Markdown renderer when a description is opened.
- **Gain (estimate).** ≈ −120 KB zstd before hydration (70 line-items + ≈17 other-locale JSON + 37 Markdown) ≈ −0.7 s hydration on mobile cold; ≈ −20 ms desktop. Also the
  same `motion` + classification chunks ride on `/map` (`map.lazy` closure).
- Owner client · **P2** · shared? partly (classification JSON + Markdown also on `/map`) · new.

### local-budgets-6 — `/map` serves "Map geometry is unavailable" until the GeoJSON request starts

- **Numbers.** The server HTML (both targets) shows **"Geometria hărții nu este disponibilă."** in the map area;
  on mobile cold it is on screen from FCP 7.3 s to hydration 21.5 s (14 s), then a spinner until ≈29 s.
- **Cause.** On the server the GeoJSON query is disabled (`useGeoJson.ts:64`), so it is neither loading nor
  errored; `map-analytics-workspace.tsx:3778-3789` (and the preview branch `:3526-3537`) falls through to the
  "unavailable" message.
- **Fix.** Treat "no GeoJSON and not in the browser yet / query pending" as loading (or render the map frame with a
  neutral placeholder). Data-trust rule in `DESIGN.md` (never state missing data that is merely not loaded yet).
- **Gain.** No timing gain; removes a false statement shown for ≈14 s on mobile.
- Owner client · **P2** (correctness of what the page says) · shared? no · new.

### local-budgets-7 — `/charts`: localStorage read during the hydration render; chart renderer loaded for an empty list

- **Numbers.** Route wave 45 files / 113 KB (1.5 s mobile); `ChartRenderer` 90 KB raw / 29 KB gzip in it although a
  new visitor has no charts. No measured hydration error (fresh contexts have no saved charts).
- **Cause.** `src/routes/charts/index.lazy.tsx:40-46` initialises state from localStorage (`getChartsStore`
  returns `[]` on the server, `chartsStore.ts:104`), so a returning user with charts gets server "No charts yet"
  markup and different client markup → hydration mismatch and a client re-render (not measured). `ChartCard` →
  `ChartPreview` → `ChartRenderer` are static imports.
- **Fix.** Read the store in an effect (or render the list client-only with a neutral placeholder); lazy-load
  `ChartList`'s preview renderer.
- **Gain.** ≈ −29 KB gzip before hydration (≈ −0.15 s mobile); avoids a mismatch for returning users.
- Owner client · **P3** · shared? no · new.

## Combined candidate list (priority order)

| id | page | title | key number | gain (est.) | owner | sev. | shared |
|---|---|---|---|---|---|---|---|
| local-budgets-1 | /entity-analytics | Rows fetched on the server but rendered only after hydration | LCP 19.9 s vs FCP 7.2 s (mobile) | ≈ −12 s LCP mobile, −0.7 s desktop | client | P1 | no |
| local-budgets-2 | /map | Serial chain to the first map frame; 3.1 MB GeoJSON after hydration | map drawn 35.9 s mobile / 3.9 s desktop | ≈ −4 to −5 s mobile, −0.3 s desktop | client + infra | P1 | no |
| local-budgets-3 | /entity-analytics | Repeat visits miss browser + Nitro cache; slow default ranking query | repeat TTFB 661–705 ms vs 95–111 | −0.6 s TTFB/LCP per repeat visit | client + server | P2 | home-S8 |
| local-budgets-4 | /map | SheetJS (112 KB zstd) in the pre-hydration route chunk | route wave 535 KB / 4.7 s | ≈ −0.6 s hydration mobile | client | P2 | no |
| local-budgets-5 | /entity-analytics | Line-items view, both-locale classifications, Markdown on the table view | route wave 289 KB / 2.6 s | ≈ −0.7 s hydration mobile | client | P2 | partly |
| (home-S6) | /map | Series request waits for Clerk | after the hydration shell: +0.65–0.70 s desktop cold, +1.18–1.61 s mobile repeat | as stated | client | P2 here | yes |
| local-budgets-6 | /map | "Map geometry is unavailable" in the server HTML | shown 14 s on mobile | correctness | client | P2 | no |
| local-budgets-7 | /charts | localStorage in the hydration render; renderer for an empty list | 29 KB gzip | ≈ −0.15 s | client | P3 | no |

## Not checked / open questions

- "Map drawn" is a proxy (last long task after the glyphs); a canvas-paint mark (`map.on('idle')`) would be exact.
  Gains for local-budgets-2/4/5 are byte-based estimates on DevTools Slow 4G, not re-measured.
- Connection setup for `demotiles.maplibre.org` and the API preflight is not throttled by DevTools (21 ms connect
  here); on a real Slow 4G link each adds ≥ 1 RTT (≈0.56 s).
- The hydration mismatch on `/charts` with saved charts, and the extra browser `EntityAnalytics` read for a
  visitor whose currency preference is EUR (the server always renders RON, home-S8.2, so the query keys differ),
  were reasoned from code, not measured.
- Deployed runs more than one pod: alternating requests returned `/entity-analytics` entries last-modified 15:17:56
  and 17:00:42 (one entry 1 h 43 min stale, served under SWR). Each pod keeps its own cache.
- Not perf, seen in passing: all three pages export `head()` from `.lazy.tsx` files, which TanStack ignores; the
  served title is "Transparenta.eu" on each (`run*-cold.json` `title`), and no canonical/description is set.
- The `entityAnalytics` resolver time (≈680 ms for 25 rows) was not analysed beyond naming the module (server).
