# Statistics (INS): `/ins`

Evidence: `evidence/ins/{deployed,local}/ins-{desktop,mobile}/` (batch, 3 cold + 3 repeat views each, plus a
traced cold load), `evidence/ins/extra/uat-map-*.json` (the localities-map experiment, below). Code at `9db3bce0`.

## 1. Entry point

- The sidebar's "Statistici" (`src/components/sidebar/nav-main.tsx:100-101`) and the landing page's "Statistici INS"
  card (`src/features/landing/lib/landing-groups.ts:173-177`) both link to **`/ins`**.
- `/ins/` → 307 to `/ins`. `/statistici` and `/statistics` → 404 (no other spelling exists). The retired
  `?loc=<siruta>` → 307 to `/ins/teritorii/<siruta>` (`src/routes/ins/index.tsx:29-44`). No duplicate page.
- Search params: `?indicator=` (county map), `?harta=` / `?judet=` (localities map). They change no server read: every
  render reads the same hub, and the localities map is a static snapshot.

## 2. Numbers (medians of 3)

| target · profile · view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB transfer / decoded | API calls (browser) | HTML KB transfer / decoded |
|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed · desktop · cold | 534 | 800 | 800 | 0 | 269 | 1346 / 1447 | 259 | 3237 | 2273 / 6572 | 0 | 32 / 167 |
| deployed · desktop · warm | 414 | 664 | 664 | 0 | 6 | 860 / 975 | 258 | 37 | 0 / 6572 | 0 | 32 / 167 |
| deployed · mobile · cold | 458¹ | 7348 | 7348 | 0.04 | 1623 | 17883 / 18218 | 259 | 3239 | 2274 / 6572 | 0 | 32 / 167 |
| deployed · mobile · warm | 348¹ | 940 | 940 | 0 | 747 | 1805 / 2332 | 258 | 37 | 0 / 6572 | 0 | 32 / 167 |
| local · desktop · cold | 525 | 820 | 820 | 0 | 21² | 1184 / 1348 | 257 | 3101 | 2141 / 6541 | 0 (8 SSR) | 32 / 167 |
| local · desktop · warm | 516 | 740 | 740 | 0 | 20 | 967 / 1091 | 256 | 35 | 0 / 6541 | 0 (8 SSR) | 31 / 167 |
| local · mobile · cold | 466¹ | 8616 | 8616 | 0.04 | 1712 | 17956 / 18290 | 257 | 3101 | 2141 / 6541 | 0 (8 SSR) | 32 / 167 |
| local · mobile · warm | 489¹ | 928 | 928 | 0 | 826 | 2004 / 2421 | 256 | 35 | 0 / 6541 | 0 (8 SSR) | 31 / 167 |

- **LCP element:** the hero `h1` „Statistica oficială, pe înțelesul tuturor" on every run, both profiles (text, no
  image). On mobile the first viewport is the hero only; the four headline figures are below it.
- **Repeat views re-render the HTML:** `/ins` sends `public, max-age=0, s-maxage=600, stale-while-revalidate=3600`
  (`src/routes/ins/index.tsx:61-68`), Cloudflare answers `DYNAMIC` (home-S8), so a repeat view pays the full server
  render again (warm TTFB 414 desktop; 32 KB of the 37 KB repeat-view transfer is the HTML).
- ¹ **Mobile TTFB hides the server time.** DevTools' 562.5 ms emulated latency overlaps the server's work: the
  document's wait is 566–570 ms on both `/` (origin 26–33 ms) and `/ins` (origin 335–395 ms). On a real link the two
  add up, so read the desktop row for the server cost.
- ² Desktop TBT is bimodal on both targets (21 or 250–335 ms): it depends on whether the entry's ≈275 ms evaluation task
  (home-S1) starts before or after FCP. The INS-specific part is the 62–99 ms county-map frame (ins-2).
- Local mobile FCP is 1.3 s later than deployed (CSS ends 8.4 s vs 7.1 s): the local front proxy vs Cloudflare, shared,
  not INS.

## 3. Waterfall (deployed, mobile, cold, run 1: `evidence/ins/deployed/ins-mobile/run1-cold.json`)

1. 0 → 583 ms document (origin 335 ms, `cfOrigin`; 8 API calls happen inside it, section 4), 748 ms HTML done (33 KB).
2. 625 ms CSS + 136 root modulepreloads + font start together (home-S1/S4/S5); CSS done 7123 → **FCP = LCP 7348 ms** (hero `h1`).
3. Entry `index-*.js` 10,754 ms → Lingui catalogs (home-S2) 15,013 ms → 1.11 s module-evaluation task 15,080–16,194 ms.
4. 16,339 ms the route's code is requested only now (home-S3): 20 files, 106 KB zstd (`index.lazy` 9.6 KB,
   `landing-search` 45 KB, `entity-tags` 9 KB, `hub-county-band` 7 KB, `uat-map-viewport` 7 KB, `hub-figures` 4.6 KB,
   …), done 17,796 ms → hydration shell 18,002, end 18,343 ms (hydration task 339 ms).
5. 18,243 ms county GeoJSON `judete-2026-03-09.json` (115 KB zstd) → 20,394 ms → **296 ms long task** projecting it (ins-2).
   18,373 ms `_cod.lazy` (18.7 KB) code warm-up for the dataset page (`useWarmRouteCode`, idle; fine).
6. 17,905 → 24,534 ms Clerk (`clerk.browser.js`, FAPI `dev_browser`/`environment`/`client`, 4 UI chunks; home-S6).
   No INS API call is made in the browser.

Desktop cold (deployed, run 2): document 437 ms (origin 352) → CSS/entry 538/592 → FCP 784 → catalogs 796 → route code
1223–1296 → hydration 1346/1447 → GeoJSON 1427–1514 → 77 ms task at 1529.

## 4. API calls

Browser: **none** on all 12 measured loads (0 API calls, 0 preflights). The hub read is done on the server and
seeds the page's query (`src/features/statistics/hooks/use-statistics-hub.ts:25-36`, `initialData` with the client's
clock), so nothing is re-read on hydration. Should a section fail on the server, the browser re-reads the whole hub
(same 8 calls, same chain).

SSR (local, from `ssrApiCalls`; the same 8 calls on **every** render, cold and repeat, desktop and mobile; start is
relative to the document request):

| operation | where | start (ms) | duration (ms) | response | chained after |
|---|---|---|---|---|---|
| `InsNationalLatest` (11 matrices, `insLatestDatasetValues`) | SSR | 5–8 | 188–352 (median ≈280) | 23.0 KB | — |
| `InsCountyAnchors` (4 matrices, same resolver) | SSR | 5–8 | 83–211 (median ≈150) | 11.4 KB | — (parallel) |
| `InsObservations` × 6 (one county layer each, `limit: 1000`) | SSR | 218–371 | 66–338 (each), slowest of 6: 141–176 | 3.4–3.5 KB each | **both** national reads |

API done at ≈360–525 ms → local desktop TTFB 438–543 ms (render ≈20–40 ms on top). The chain is two levels by
design: a county layer needs its national cell's year and classification members
(`src/features/statistics/api/graphql/statistics-hub-fetchers.ts:150-176`). All INS reads pass `auth: 'none'`
(`statistics-hub-fetchers.ts:176`, `national-latest.ts:39`, and every other INS call site), so none waits for Clerk
(home-S6 does not apply here; the hero search's own read, `entity-search-api.live.ts:79-81`, is `auth: 'none'` too).

The headline figures, the "România, an de an" rows and the births/deaths chart all come from `InsNationalLatest` plus
annual histories bundled in the client (`src/features/statistics/lib/hub-national-series.ts`, 11 KB of source in the
`statistics-api` chunk); the chart is hand-written SVG (`components/hub/hub-charts.tsx`), no recharts. The county map's
values come from the six `InsObservations`; its shapes from the GeoJSON (ins-2). The localities map reads no API at all
(static snapshot chunks, ins-5).

## 5. Candidate issues

### ins-1 — Every `/ins` render waits for 8 INS API calls in two rounds; nothing is kept between requests

- **Numbers.** Deployed origin time (`cfOrigin`) on all 12 loads: **335–473 ms cold, 257–417 ms repeat** (median
  390 desktop / 336 mobile); the 13 other pages measured so far have medians of 24–199 ms (`/` 24–27, `/procurement`
  48–71, `/legislation` 199). Desktop TTFB 534 ms vs
  89 ms on `/`; FCP/LCP 800 vs 468 ms. Earlier probe: `x-envoy-upstream-service-time` 305–518 ms for `/ins` vs 27 ms
  `/procurement`, 4 ms `/`. Local: 8 SSR calls on every one of the 12 renders (no warm-server effect, unlike
  `/procurement`), API done at 360–525 ms, TTFB 438–543 ms desktop (`evidence/ins/local/ins-desktop/run*-*.json`
  `ssrApiCalls`; warm-up render in the proxy log at 16:50: 250 / 141 ms, then 6 × 96–167 ms, API window 437 ms).
  Repeat views pay it again (max-age=0, Cloudflare DYNAMIC). On mobile the first viewport shows none of the data the
  render waits for (hero only).
- **Cause.** `src/routes/ins/index.tsx:47-57`: the loader awaits `fetchStatisticsHub` on every server render;
  TanStack Start sends no HTML before the loader resolves. `statistics-hub-fetchers.ts:259-297`: two national reads
  in parallel (`Promise.all`, :261-266), then the six county layers (:280-289). The route asks a shared cache to keep
  the page 10 min (`s-maxage=600`, :61-68), but no cache honours it (Cloudflare DYNAMIC, home-S8; no Nitro rule for
  `/ins` in `nitro.config.ts`), and unlike procurement/justice/public-enterprises the hub has no
  `createServerMemo` (`src/lib/ssr/server-memo.ts:19`). Server side (owner `server`, not analysed further): one
  `insLatestDatasetValues` of 11 codes takes 188–352 ms from Zeus; `listLatestValues` runs resolve-entity →
  get-datasets → default selections → read series one after another in one snapshot
  (`hack-for-facts-eb-server/src/modules/ins-native/core/usecases.ts:671-727`).
- **Fix.** Wrap the server-side hub read in `createServerMemo(600_000, { keep: (hub) => hub.failures.length === 0 })`
  (one key; the read under its own 5 s deadline, not the request's signal, as `server-memo.ts:15-17` says). INS
  publishes monthly; 10 min matches the route's own `s-maxage`. Optional second step: await only the national reads
  and stream the county layers (below the fold on every profile), which takes the second round off the TTFB of the
  one render per pod per 10 min that misses. Decoupling each layer from the other national read
  (`Promise.all` at :261) gains ≈0–60 ms only (the national read is the slower one in 11 of 12 renders and anchors 2
  of the 6 layers), so it is not worth doing alone.
- **Gain (estimate).** Deployed desktop TTFB, FCP and LCP −300 to −450 ms (origin 335–473 → ≈30–70 ms, like the
  memoised pages), on cold and repeat views; on a real mobile network the same ≈0.3–0.45 s comes off TTFB and FCP
  (the emulated profile hides it, see ¹). −8 API calls per page view on dev-chronos's API.
- Owner **client** (memo) + **server** (resolver latency) · **P2** · shared? no (the memo pattern exists, INS lacks it;
  home-S10) · new (the ignored `s-maxage` is known, `docs/entity-page-ssr-loading.md:129-131`).

### ins-2 — The county band downloads 400 KB of GeoJSON and projects it on the main thread on every load (6 hubs)

- **Numbers.** `/geojson/judete-2026-03-09.json`: 400 KB raw / **115 KB zstd**, fetched at hydration although the band
  is the third below the fold (mobile 18.2–20.4 s, desktop 1.29–1.69 s). 16–161 ms after it lands, one frame from
  TanStack Query's notify `setTimeout` renders the band: **269–323 ms on mobile cold** (4× CPU), 177–253 ms on mobile
  repeat views (the file comes from disk cache, the projection is redone), **62–99 ms on desktop** — on all 24 `/ins`
  loads (`longAnimationFrames`; e.g. `deployed/ins-mobile/run1-cold.json` GeoJSON ends 20,394 → frame 20,450 + 299 ms).
  That is ≈220–270 ms of the mobile TBT of 1623 ms. The same file and the same post-hydration frame appear on
  **/companies, /justice, /ngos, /procurement, /public-enterprises**: 239–422 ms on every mobile cold load of the
  batch, 68–121 ms on most desktop loads, all through the statistics `HubCountyBand`. The file has
  **no `Cache-Control`** on either target (only `last-modified`, so heuristic browser caching; Cloudflare DYNAMIC).
- **Cause.** `src/features/statistics/components/hub/hub-county-band.tsx:100` `useGeoJsonData('County')` (enabled in
  every browser on mount, `src/hooks/useGeoJson.ts:53-64`) → `countyShapes` → `projectCounties`
  (`src/features/statistics/lib/county-map.ts:192-223, 294-302`): bounds over every coordinate, projection, a path
  string per ring with `toFixed(1)`, and a pole-of-inaccessibility search per county, on every page load (its cache,
  :295-300, is keyed on the parsed features, which are new each load). Measured in Node on Zeus: 45 ms first call. The shared users import the band from statistics:
  `private-companies/components/hub/hub-county-band.tsx`, `ngos/hub/ngo-county-band.tsx`,
  `procurement/components/home/home-context-bands.tsx`, `public-enterprises/components/hub/hub-bands.tsx`,
  `justice/components/hub/justice-hub-bands.tsx`. `public/geojson/*` gets no headers rule in `nitro.config.ts`.
- **Fix.** Precompute the projected shapes at build time, as the UAT map already does (`yarn ins:uat-map` →
  `features/statistics/data/uat-map-*.json`): 42 paths + label poles at the band's width are **122 KB raw / 43 KB zstd**
  (measured by running `projectCounties` on the same file), less with simplification; ship them as a hashed chunk
  loaded when the band comes near (the `useInView` pattern of `uat-map-section.tsx:22-27`), or inline them in the SSR
  HTML so the map renders without JavaScript. Independently: `"/geojson/**": { headers: { "cache-control": "public,
  max-age=31536000, immutable" } }` (the file names are dated) for the pages that still need raw GeoJSON (`/map`).
- **Gain (estimate).** Mobile: −270–320 ms long task and ≈−220–270 ms TBT per cold load (≈−130–200 ms on repeat
  views), −72 KB zstd (−115 KB from the first view if deferred); desktop −60–100 ms main thread. On 6 of the 16 main
  pages (mobile 239–422 ms each).
- Owner **client** · **P2** · shared? **yes** (companies, justice, ngos, procurement, public enterprises, ins) · new.

### ins-3 — INS code ships on every page: the INS route files' loaders pull their fetchers into the entry graph

- **Numbers.** 9 INS chunks are root modulepreloads (home-S1): `statistics-api` (with the hub fetcher and the bundled
  histories), `ins-queries`, `ins-bootstrap-fetchers`, `statistics-fetchers`, `ins-english`, `query-config`,
  `dataset-explorer-api`, `statistics-theme`, `period`: **72 KB raw / 26 KB zstd** (build). On `/` these and a few
  small shared helpers are 13 requests, 30–37 KB transfer, 79 KB decoded (`evidence/home/*/home-*/run1-cold.json`). Inside the entry itself: 23 INS modules,
  ≈115 KB of source (`schemas/statistics.ts` 22 KB, `use-dataset-detail.ts` 13 KB, …), 5.2 % of the entry's sources
  (source-map `sourcesContent` lengths, a proxy).
- **Cause (why the lead saw them on the landing page).** Eager route files are bundled with the route tree into the
  entry, so their static imports become the entry's: `src/routes/ins/index.tsx:3-4` (`fetchStatisticsHub`,
  `statisticsHubQueryOptions`), `src/routes/ins/seturi/index.tsx:3-5`, `src/routes/ins/seturi/$cod.tsx:3-26` (detail
  fetchers, skeleton components, selection logic), `src/routes/ins/teritorii/$siruta.tsx:3-4`. The chunk files are
  statically imported by `index-*.js` (checked in the build), hence in the root's manifest preloads.
- **Fix.** Import the fetchers inside the loaders (`const { fetchStatisticsHub } = await import(…)`), keep only
  `validateSearch` schemas and `head` in the eager files; move `DetailPagePending` and the detail helpers behind the
  lazy route. Same pattern for every domain (home-S1 owns the mechanism).
- **Gain (estimate).** −26 KB zstd off every non-INS page's preload set (≈0.15 s of Slow 4G bandwidth), plus part of
  the entry's evaluation. Small alone; it is INS's share of home-S1.
- Owner **client** · **P3** · shared? yes (home-S1) · new.

### ins-4 — The hub's route code waits for the entry, and below-the-fold bands are on the hydration path

- **Numbers.** home-S3 on `/ins`, mobile cold: **lazy chunk start − entry end = 5,479 ms deployed** (5,465–5,585),
  **5,653 ms local** (5,650–5,705). Of that, 4.3 s is the catalogs (home-S2, done 15.01 s) and 1.1 s the evaluation;
  the S3 step itself is the fetch: 16.23 → 17.70 s (**1.46 s**, 20 files, 106 KB zstd) → hydration shell 17.88 s.
  Desktop: 1122–1437 → 1172–1489 ms (50–73 ms). The hydration-path burst carries `landing-search` 45 KB zstd
  (home-2, the same chunk as `/`) and code for bands below the fold: `hub-county-band` 7.1 KB + `uat-map-viewport`
  7.2 KB (pulled by the county band's `useRenderedWidth`) + `period-chart-parts` 3.3 KB.
- **Cause.** `src/routes/ins/index.lazy.tsx` (no modulepreload, home-S3); `statistics-hub-page.tsx:13-24` imports
  every band statically, and `hub-dataset-search.tsx:3` the landing combobox (home-2).
- **Fix.** home-S3 and home-2 first; then `lazy()` the county band (it already renders a sized placeholder while
  pending, `statistics-hub-page.tsx:276-295`).
- **Gain (estimate).** home-S3: ≈1–1.5 s earlier hydration on mobile; the band split ≈−18 KB zstd off the hydration
  path (≈0.1 s Slow 4G).
- Owner **client** · **P3** for the INS part · shared? yes (home-S3, home-2) · new.

### ins-5 — The localities map costs 290 KB when the reader reaches it (fine for a reader, slow for a jump)

- **Numbers.** Extra runs (deployed, `?harta=spor-natural`, `evidence/ins/extra/uat-map-*.json`, 2 runs each, after
  the page went quiet): nothing of the map loads on first view (section top at 3165 px mobile = 3.8 screens, 2236 px
  desktop). Approaching it fetches 13 files, **290 KB**: `uat-map-geometry` 175 KB, `uat-map-values` 62 KB,
  `uat-map-band` 9 KB, `command` 6 KB, …; then the `/ins/teritorii/$siruta` code warm-up (19 + 9 KB). Map drawn
  **2.5 s after a jump** on mobile (2539, 2505 ms), **0.45 s** on desktop; a reader scrolling one screen a second
  reaches it after 3.0 s and waits **0.28–0.30 s**. Long tasks: 127 + 65 ms (mobile).
- **Cause.** `uat-map-section.tsx:22-27` loads code and snapshot one screen ahead (`rootMargin: '100% 0px'`), by
  design; the snapshot is two JS modules (`hooks/use-uat-map-snapshot.ts:14-23`, 437 KB + 160 KB raw). A `?harta=`
  link opens at the top of the page and the map loads only when scrolled to.
- **Fix (optional).** Quantised/TopoJSON geometry would shrink the 175 KB; start the prefetch at idle after hydration
  when `?harta=`/`?judet=` is in the address (the link was about the map).
- **Gain (estimate).** For jumps only: ≈1 s of the 2.5 s on mobile with a 2× smaller geometry.
- Owner **client** · **P3** · shared? no · new.

### ins-6 — The SSR payload carries all six county layers for the one shown

- **Numbers.** HTML 167 KB decoded / 32 KB zstd. Its inline router payload is 31 KB: root manifest 5.3 KB (shared),
  indicators 11.5 KB, **county layers 14 KB (6 layers, 1 drawn)**.
- **Cause.** `statistics-hub-fetchers.ts:280-289` reads and returns every layer; the toggle switches client-side.
- **Fix.** Fold into ins-1's streaming step (read the shown layer first) or leave as is: ≈3–4 KB zstd.
- Owner client · **P3** · shared? no · new.

### Shared causes seen on `/ins` (numbers from this page; analysis in `domains/home.md`)

- **shared: home-S1** — 136 root modulepreloads; entry `index-*.js` 265 KB zstd ends at 10.75 s on mobile; 1.1 s
  module-evaluation task (15.04–16.19 s mobile, 272–358 ms desktop). It is why INS chunks are on every page (ins-3).
- **shared: home-S2** — catalogs `messages-*` (243 + 235 KB) and `admin-*` end at 15.01–15.07 s on mobile, 4.3 s after
  the entry.
- **shared: home-S3** — lazy route code requested 5.48 s (deployed) / 5.65 s (local) after the entry's end; the fetch
  step 1.46 s; desktop 50–73 ms (ins-4).
- **shared: home-S4** — CSS (72 KB) 625 → 7123 ms on mobile, sharing the pipe with the preloads; FCP 7348 ms.
- **shared: home-S5** — font 350 KB ends 11.2 s on mobile; its swap is the page's only layout shift, **CLS 0.04** at
  11.3 s (hero lede, shortcuts and domains panel move); desktop 0 (the font is in before FCP). Logo preload 202 KB.
- **shared: home-S6** — Clerk on every load (mobile 17.9 → 24.5 s, desktop 1.3 → 2.5 s). **No INS read waits for it**:
  0 browser API calls, and every INS call site passes `auth: 'none'`.
- **shared: home-S7** — `sentry` 112 KB, `posthog` 77 KB zstd in the preloads.
- **shared: home-S8** — `/ins` asks for `s-maxage=600`; Cloudflare `DYNAMIC` on all 12 loads; no Nitro rule for `/ins`
  (which spares it the S8 cookie bug), so every view is a fresh render (ins-1).
- **shared: home-S9** — no preflight on `/ins` (no browser API call).
- **shared: home-S10** — `/ins` has no server-side cache at all (ins-1); same behaviour on the deployed pod (origin
  257–473 ms on every load).
- **shared: home-S11** — the harness used a browser UA; for `/ins` the difference is small, as its loader blocks the
  shell for everyone.
- Cloudflare beacon (deployed only): 32 ms main thread on mobile.

## 6. Not checked / open questions

- In-cluster API latency is not observable from here; the deployed origin time (335–473 ms) suggests the in-cluster
  chain is about as slow as from Zeus. Real-device mobile TTFB (with the server time added to a real RTT) not measured.
- The `/ins` render with a failed section (`no-store`, browser re-read of all 8 calls through preflights) was not
  provoked.
- Not measured: the hydration task's split (339 ms mobile) between the hub page and the shell; home-3 covers the
  shell's share. The `tanstack-*.js` task attribution for the county band is from `longAnimationFrames` (script
  `TimerHandler:setTimeout` in the chunk that holds TanStack Query) plus its timing (16–161 ms after the GeoJSON ends
  on every `/ins` load); a trace-level call tree would confirm `projectCounties` as the bulk (45 ms of it in Node).
- The localities-map experiment runs its own quiet detection, which never went quiet within its 120 s cap (it counts
  every request, including ones the batch harness filters); the map timings are measured from the scroll, so they
  are unaffected, but "page quiet" in those files means "120 s".
