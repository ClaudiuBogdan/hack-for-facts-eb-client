# Town hall — `/primarie`

Subagent report, 2026-10-27 main-page audit. Code at dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/primarie/{deployed,local}/primarie-{desktop,mobile}/`, extra run in `evidence/primarie/extra/`.

**Verdict: not a domain entry point.** `/primarie` is step 2 of the Funky Citizens civic campaign
„Cu ochii pe bugetele locale" (`CAMPAIGN_ENTITY_SELECTOR_PATH`, `src/features/campaigns/buget/constants.ts:6-7`).
It is a "pick your city hall" screen: a search box, five suggestion badges and a Leaflet map of all 3,186 UATs.
It has no data of its own, is `noindex,follow`, and visitors reach it only through the campaign. The town-hall
*data* lives on `/entities/$cui` (local budgets) and its campaign twin `/primarie/$cui`. I suggest the lead
drops `/primarie` from the domain table and keeps the findings below as campaign-funnel issues. If the campaign
matters, its real front door is `/provocare`, which was not measured.

## 1. Entry point

- **Route.** `src/routes/primarie/index.tsx` has no loader and no `beforeLoad`; it only sets `validateSearch`,
  `head` and `s-maxage=600` headers. `index.lazy.tsx` renders `BugetEntitySelectorGate`
  (`src/features/campaigns/buget/components/hub/buget-entity-selector-gate.tsx`) inside `CampaignPageFrame`.
  Its parent is the root route (`src/routeTree.gen.ts:622-627`), not `/primarie/$cui`.
- **How a visitor gets there.**
  - The main path starts on the landing page `/`. The last band has the card „Provocări · Cu ochii pe bugetele
    locale / Deschide provocarea" (`src/features/landing/components/landing-page.tsx:366`,
    `src/features/campaigns/buget/components/CampaignAccessShareCard.tsx:83-88`). It leads to `/provocare`, the
    campaign landing, whose CTA „Începe provocarea" leads to `/primarie`
    (`src/features/campaigns/buget/components/landing/buget-landing-page.tsx:51`).
  - The in-campaign "change city hall" links also lead here (`UatSwitchBadge.tsx:42`, `BudgetTimelineStrip.tsx:30`,
    `ChallengesLayout.tsx:128,282`, `CampaignNotificationPreferencesPage.tsx:457,496`), as does the back link of
    `/primarie/harta`.
  - Picking a city hall navigates to `/primarie/$cui/buget/provocari`.
- **Navigation.** The page is not in the sidebar (`src/components/sidebar/nav-main.tsx:38-101`) and the landing
  page does not link to it directly.
- **Other spellings** (on deployed):
  - `/primarie/` → 307 `/primarie`.
  - `/bugete-locale-2026` → 307 `/provocare` (`src/routes/bugete-locale-2026.tsx:7-12`).
  - There is no duplicate page. `/primarie/harta` is the map-only variant (not measured).
- **Prior work.** The note in `docs/entity-page-ssr-loading.md:116` (`/primarie/$cui` awaits entity details and line
  items with no deadline) does **not** affect this page.
  - `/primarie` is a sibling of `/primarie/$cui`, has no loader and makes no SSR API call (local `ssrApiCalls` is
    `[]` in all 6 cold runs).
  - The next step is not affected either. `/primarie/$cui/route.tsx`, `buget/route.tsx` and
    `buget/provocari/{route,index}.tsx` have no loaders. Only `/primarie/$cui/index.tsx:141` (the entity page)
    has one.

## 2. Numbers

Medians of 3 runs. Times in ms; KB = transfer / decoded.

| Target | Profile | View | TTFB | FCP | LCP | CLS | TBT | Hydration shell / end | Req | Transfer KB | JS KB | API calls | HTML KB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 111 | 420 | 420 | 0 | 363 | 1,051 / 1,118 | 234 | 4,446 | 2,494 / 7,516 | 2 (404) | 18 / 87 |
| deployed | desktop | warm | 55 | 228 | 228 | 0 | 103 | 434 / 540 | 233 | 24 | 0 / 7,516 | 2 (404) | 18 / 87 |
| deployed | mobile | cold | 108 | 7,288 | 7,288 | 0.001 | 2,042 | 17,809 / 18,072 | 230 | 4,165 | 2,494 / 7,516 | 2 (404) | 18 / 87 |
| deployed | mobile | warm | 56 | 924 | 924 | 0 | 1,330 | 1,773 / 2,238 | 229 | 23 | 0 / 7,516 | 2 (404) | 18 / 87 |
| local | desktop | cold | 16 | 256 | 256 | 0 | 313 | 615 / 798 | 232 | 4,318 | 2,377 / 7,485 | 2 (404) | 17 / 86 |
| local | desktop | warm | 16 | 160 | 160 | 0 | 147 | 343 / 445 | 231 | 22 | 0 / 7,485 | 2 (404) | 17 / 86 |
| local | mobile | cold | 24 | 8,556 | 8,556 | 0.001 | 2,063 | 18,002 / 18,233 | 228 | 4,040 | 2,377 / 7,485 | 2 (404) | 17 / 86 |
| local | mobile | warm | 20 | 880 | 880 | 0 | 1,419 | 1,767 / 2,460 | 227 | 22 | 0 / 7,485 | 2 (404) | 17 / 86 |

- **LCP element (all runs):** the SSR `<h1>` „Alege mai întâi primăria ta"
  (`h1.text-balance.text-4xl.font-extrabold…`), so LCP = FCP everywhere.
- **What only this page loads:** 1.24 MB of the 4.17 MB cold transfer (deployed mobile run 3). That is the map at
  1,136 KB (GeoJSON 817 KB + maps JS 297 KB + maps CSS 17 KB + map component 5 KB), the route closure at 76 KB
  and the UAT→CUI CSV chunk at 22 KB. Home is 3,291 KB.
- **The map is ready at about 28.1 s** on mobile cold, against hydration at 17.8 s. On desktop it is ready at
  about 1.55 s. On mobile the map sits below the fold (`deployed/primarie-mobile/run1-cold.png`); on desktop it is
  in the first viewport.
- **Deployed vs local.** TTFB is lower locally (no CDN). Local mobile FCP is about 1.3 s later because the CSS
  finishes at 8,435 ms instead of 7,158 ms; that comes from the front-proxy's h2 scheduling, the same on other
  pages (shared?). The warm HTML is refetched (`max-age=0`, `src/routes/primarie/index.tsx:13-18`), unlike `/`.

## 3. Waterfall (deployed mobile cold, run 3 = median)

1. **0 → 715: document.** 18 KB zstd / 87 KB, TTFB 113. `cf-cache-status: DYNAMIC`.
2. **639 → 7,158: CSS.** It downloads alongside the 136 root modulepreloads. The font loads 676 → 11,218
   (342 KB). **FCP = LCP 7,288** (h1).
3. **639 → 10,742: entry** (259 KB). The root preload wave finishes at ≈10.74 s. The module-evaluation task starts at
   15,030 and runs 1.21 s.
4. **16,322 → 17,615: route closure.** 16 files, 76 KB; never preloaded (home-S3). Motion (46 KB) is the long
   pole, while the other 15 files finish by 17,187. The 197 KB `logo.png` (home-S5) shares the pipe from 16,284.
   **Hydration shell 17,809, end 18,072.**
5. **17,936 onward: browser data reads, all issued after hydration.**
   - `subscription-stats` returns 404, then 404 again on retry.
   - UAT GeoJSON 17,940 → 24,768 (703 KB, 6.8 s); counties 17,943 → 20,366 (114 KB).
   - UAT→CUI CSV chunk 18,004 → 18,967.
   - Clerk 17,713 → 23,258 (shared, home-S6).
6. **24,790 onward: map build.**
   - A 162 ms task with no script attribution at 24,790 is most likely `response.json()` parsing the 3.1 MB file.
   - Only then are the map component, maps chunk (297 KB) and maps CSS requested: 24,996 → 27,327.
   - Long tasks at 27,357 (170 ms, map/maps chunk evaluation), 27,528 (344 ms, React + Leaflet `_redraw`) and
     27,841 (223 ms). **The map is drawn at about 28.1 s.**

## 4. API calls

| Operation | Where | Start (mobile / desktop) | Duration | Size | Chained after |
|---|---|---|---|---|---|
| (none) | SSR | — | — | — | — |
| `GET /api/v1/campaigns/funky/subscription-stats` → **404** | browser | 17,936 / 867 | 602 / 138 | 1 KB | hydration (first client render) |
| same, retry → **404** | browser | 19,565 / 2,020 | 594 / 48 | 1 KB | first 404 (React Query `retry: 1`) |
| `EntitySearch` (GraphQL, only when the visitor types; extra run, mobile) | browser | 21,838 (debounce fired ≈19,490) | 640 | — | **Clerk ready (21.2 s)**, see primarie-1 |

Static data the page fetches (not API, but on the critical path to the map):

| File | Start (mobile / desktop) | Duration | Size |
|---|---|---|---|
| `/geojson/uat-2026-03-09.json` | 17,940 / 867 | 6,829 / 191 | 703 KB / 3,103 KB |
| `/geojson/judete-2026-03-09.json` | 17,943 / 868 | 2,422 / 68 | 114 KB / 390 KB |
| `uat-cui-map-*.js` (`?raw` CSV) | 18,004 / 872 | 963 / 34 | 22 KB / 52 KB |
| map chunk + `maps-*.js` + `maps-*.css` | 24,996 / 1,131 | 2,329 / 45 | 297 + 17 + 5 KB — **chained after the UAT GeoJSON** |

There are no SSR calls, so the BRIEF's warm-vs-cold server render question does not arise. The route has no
loader, and every query on the page is a client `useQuery`; `useGeoJsonData` is even disabled on the server
(`src/hooks/useGeoJson.ts:64`). The deployed TTFB of 108–111 ms against 16–24 ms locally is CDN and network
time, not data.

## 5. Candidate issues

### primarie-1 — The page's one action, search, waits for Clerk

- **Numbers.** One extra cold run with the mobile profile on deployed
  (`evidence/primarie/extra/search-at-hydration-deployed-mobile.json`, ad-hoc script, not kept). It typed
  „Sibiu" (120 ms per key) the moment the input hydrated.
  - The input hydrated at 17.5 s (page clock), seen at 18.1 s on the Node clock. Typing ended at 19.0 s, so the
    500 ms debounce would fire the query at about 19.5 s.
  - Clerk `loaded` came at 21.2 s on the page clock, about 21.8 s on the Node clock.
  - **The `EntitySearch` POST left at 21.84 s, 2.35 s after the debounce**, right after Clerk was ready. The first
    results arrived at 22.48 s, 3.5 s after the last keystroke instead of about 1.1 s.
  - A second `EntitySearch` POST followed at 23.48 s; not investigated.
- **Cause.** `EntitySearchInput` → `useEntitySearch` → `searchEntities` (`src/lib/api/entities.ts:401-404`) calls
  the legacy `graphqlRequest` without `skipAuth`. That awaits `getAuthToken()` → `waitForClerk()`
  (`src/lib/api/graphql.ts:122`, `src/lib/auth/index.tsx:352-395`). Clerk mounts only after hydration; in the batch
  its FAPI and UI chunks load from 17.7 to 23.3 s on mobile.
- **Fix.** Pass `{ skipAuth: true }` in `searchEntities`; the search is public. The general fix is in home-S6.
- **Gain.** The first search result comes **about 2.4 s sooner on mobile** for a visitor who types right after
  hydration (measured, 1 run). Typing and request times are on the Node clock, which reads about 0.6 s later than the page
  clock; the 2.35 s is measured within the Node clock. On desktop the gain is about 0.5 s (home-S6 estimate, not measured here). Clerk was ready 3.7 s after the
  input hydrated, in line with home-S6's mobile figure.
- Owner **client** · **P2** (P1 on the scale only if it hits most domains, which home-S6 covers) ·
  shared? yes: **home-S6** (this page is one more legacy-transport caller) · new.

### primarie-2 — The participants map loads for every visitor, below the fold on mobile, and its 297 KB chunk waits for the 817 KB GeoJSON

- **Numbers.** Deployed mobile cold run 3 (`evidence/primarie/deployed/primarie-mobile/run3-cold.json`, trace in
  `trace-summary.txt`):
  - The map costs 1,136 KB of the 4,165 KB cold transfer (27%).
  - GeoJSON 17,940 → 24,768. Only after it do the map chunk and `maps-*.js` load: 24,996 → 27,327 (+2.3 s
    serial).
  - Map main-thread work after hydration is about 0.9 s: JSON parse 162 ms, evaluation 170, build 344 + 223.
    That is about 650 of the 2,042 ms TBT.
  - Warm mobile repeats about 1 s of that work even from cache (TBT 1,330).
  - The search box stays unresponsive while the map builds.
  - Desktop: the map is in view and ready at about 1.55 s, so there is little to gain there.
- **Cause.**
  - `buget-entity-selector-gate.tsx:292-299` renders `CampaignParticipantsMap` without `shouldLoad`. The gate
    already has `isMapSectionInView` (`:85-88`) but only uses it for `shouldHighlightSubscriptions`.
  - `campaign-participants-map.tsx:32,44-53` therefore fetches both GeoJSONs on mount.
  - `campaign-participants-map.tsx:108-131` mounts the `lazy()` map, which starts the chunk import, only once both
    GeoJSONs are in.
- **Fix.**
  1. Pass `shouldLoad={isMapSectionInView}` with a `rootMargin` (about 300–500 px) so the load starts just before
     the map scrolls in.
  2. When `shouldLoad` turns true, start `import('./buget-entity-map-selector-map')` alongside the GeoJSON fetch
     instead of after it.
  3. Optionally, load `useUatCuiMap` (22 KB CSV + papaparse, `buget-entity-selector-gate.tsx:98-102`) at the same
     time, since it is only needed for map clicks and result counts.
- **Gain (estimate).**
  - Mobile visitors who don't scroll save 1.16 MB, about 0.9 s of main thread and about 650 ms of TBT.
  - Those who do scroll get the map about 2.3 s sooner on Slow 4G, because the chunk downloads in parallel.
  - Desktop gains about 0.1 s.
- Owner **client** · **P2** · shared? no (the campaign map; `/primarie/harta` also renders it) · new.

### primarie-3 — The UAT GeoJSON is 3.1 MB of 16-digit coordinates and is cached neither by Cloudflare nor by the browser

- **Numbers.**
  - UAT: 703 KB zstd / 3,103 KB, 6.8 s on Slow 4G. Counties: 114 / 390 KB.
  - Measured offline on `public/geojson/uat-2026-03-09.json` (3,186 polygons, 56,112 points, 13 properties,
    zstd level 3):
    - original: 713 KB;
    - coordinates rounded to 5 decimals (about 1 m): **402 KB (−44%)**;
    - also keeping only `natcode, name, county`: 354 KB (−50%).
  - Headers (curl and HAR): no `Cache-Control`, `cf-cache-status: DYNAMIC` in cold and warm runs. Every first
    view pulls from the origin pod. Repeat views depend on heuristic freshness (10% of the `Last-Modified` age);
    the batch's warm views were served from disk only through that heuristic.
- **Cause.**
  - The asset itself, wired in `src/hooks/useGeoJson.ts:17-21`.
  - `nitro.config.ts:18-59` has no rule for `/geojson/**`. Only `/assets/**` gets `public, max-age=31536000, immutable`
    (`.output/server/index.mjs`, route rules).
  - Cloudflare does not cache `.json` by default.
- **Fix.**
  1. Publish a new dated file with rounded coordinates. `useGeoJson.ts:13-16` already prescribes new dated files;
     add a trimmed-properties variant if consumers differ.
  2. Add `'/geojson/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }`.
  3. Add a Cloudflare cache rule for `/geojson/*` (infra).
- **Gain.** About −300 KB on every load that draws the UAT map (about −1.7 s on Slow 4G), edge hits instead of
  origin, and reliable repeat views.
- Owner **client + infra** · **P2** · shared? **yes**. The same file feeds `/map` (`map-analytics-*`), `/pnrr`
  (`PnrrMapPreview.tsx:170`), the employees map and the challenge lessons · new.

### primarie-4 — framer-motion (46 KB) holds hydration back, only to fade in five badges that are SSR'd invisible

- **Numbers.**
  - In the route closure (deployed mobile run 3), motion is the last file: 16,335 → 17,615. The other 15 files
    finish by 17,187, and hydration follows at 17,809, so motion costs about 0.43 s of hydration.
  - `ssr.html` carries 5× `style="opacity:0;transform:translateY(-8px)"`. The suggestions therefore stay invisible
    from FCP (7.3 s) until after hydration (17.8 s) on mobile cold.
  - Motion's main-thread time is 35 ms (trace).
- **Cause.** `src/features/campaigns/buget/components/hub/recent-uat-badges.tsx:2,61-66` (`motion.div` with
  `initial={{ opacity: 0, y: -8 }}`). Nothing else on the page uses motion.
- **Fix.** Use a CSS entrance (`tailwindcss-animate` is a dependency: `animate-in fade-in slide-in-from-top-2`,
  `motion-reduce:animate-none`), or no animation at all.
- **Gain.** On mobile cold, hydration and an interactive search box come about 0.4 s sooner, the transfer shrinks
  by 46 KB, and the suggestions show at FCP.
- Owner **client** · **P2** · shared? no · new.

### primarie-5 — The `maps` chunk group puts MapLibre (≈233 KB) into every Leaflet page, and Leaflet into every MapLibre page

- **Numbers.**
  - `maps-*.js` is 297 KB zstd / 1,087 KB. It downloaded 24,996 → 27,327 (2.3 s on Slow 4G), and its evaluation
    sits in a 170 ms task.
  - Source-map attribution of generated bytes (`maps-DWMPKfF1.js.map`; gzip of each package's share is a proxy):
    maplibre-gl 875 KB raw (≈233 KB gz, 79%), leaflet 149 KB (≈43 KB), pmtiles 14 KB, fflate 5 KB,
    react-leaflet 3 KB.
  - `maps-*.css` (83 KB) is mostly `maplibre-gl.css`.
  - The campaign map uses only Leaflet (`buget-entity-map-selector-map.tsx:1-5`).
- **Cause.** `vite.config.ts:99-106` groups `leaflet`, `react-leaflet`, `maplibre-gl` and `pmtiles` into one
  `maps` chunk.
- **Fix.** Use two groups, `leaflet` (leaflet, react-leaflet, @react-leaflet/core) and `maplibre` (maplibre-gl,
  pmtiles), and re-check the chunk graph. Group dependency capture is described in home-S1 cause 1.
- **Gain.** Leaflet pages (this map, `/primarie/harta`, `EmployeesMap`) lose about 240 KB zstd, about 1.3 s of Slow
  4G download and most of the 170 ms evaluation. MapLibre pages (`/map`, `/pnrr`) lose about 44 KB.
- Owner **client** · **P2** · shared? **yes** (local budgets `/map`, pnrr) · new.

### primarie-6 — The campaign's subscription-stats endpoint returns 404 on dev-chronos: 2 failed requests per load, polling every 60 s, participant counts silently off

- **Numbers.**
  - 404 at 17,936 and again at 19,565 (mobile); 2 console errors per load in every run.
  - `curl`: `{"message":"Route GET:/api/v1/campaigns/funky/subscription-stats not found"…}`.
  - No preflight: it is a simple GET with only `Accept`.
  - In the UI, result counts show "--" and the map's participant shading is off
    (`buget-entity-selector-gate.tsx:210-216`, `campaign-participants-map.tsx:116-120`).
- **Cause.**
  - Client: `src/features/campaigns/buget/api/subscription-stats.ts:84-99` and `hooks/use-subscription-stats.ts:12-20`
    (`retry: 1`, `refetchInterval: 60_000`, which keeps polling while in error).
  - Server: the route is registered only in the legacy `hack-for-facts-eb-server/src/app/build-app.ts:1092-1096`
    (inside `if (deps.userDb !== undefined)`, `:923`). `build-redesign-app.ts`, which serves dev-chronos
    (home-S9), has no such route.
- **Fix.**
  - Server: port the route to the redesign app.
  - Client: no retry on 404, and stop `refetchInterval` while the query is in error.
- **Gain.** 2 requests per load plus 2 per minute (about 0.6 s each on Slow 4G, after hydration). Mostly this is a
  **functional** fix.
- Owner **server** (client for the polling) · **P3** for performance (a functional bug for the campaign) ·
  shared? no · new.

## Shared causes, this page's numbers (shared?)

| Shared cause | Numbers on this page (deployed mobile cold run 3 unless said otherwise) |
|---|---|
| home-S1 | 136 modulepreloads; JS 215 chunks, 2,494 / 7,516 KB; module-evaluation task 1.21 s (mobile), 281 ms longest task (desktop). |
| home-S2 | Not re-measured. |
| home-S3 | Lazy chunk start − entry end = 16,322 − 10,742 = **5.58 s** (local 5.72 s). The route closure is 16 files / 76 KB, 16,322 → 17,615 (1.29 s), then hydration at 17,809. Desktop: 740 − 300 = 440 ms, closure to 780, hydration 831. |
| home-S4 | CSS 639 → 7,158 (FCP 7,288). |
| home-S5 / S7 | Font 342 KB (676 → 11,218); `logo.png` 197 KB at 16,284, competing with the route closure; Sentry and PostHog in the preloads. |
| home-S6 | The only load-time API read (`subscription-stats`, plain `fetch`) did **not** wait for Clerk: it started 127 ms after hydration. The search does wait: **+2.35 s** on mobile (primarie-1). Clerk itself: 17,713 → 23,258. |
| home-S8 | `cache-control: public, max-age=0, s-maxage=600, stale-while-revalidate=3600` is ignored by Cloudflare (`DYNAMIC`). `/primarie` has no Nitro route rule, so no Nitro cache applies. |
| home-S9 | 0 preflights. |
| home-S11 | n/a (no SSR data). |

## 6. Not checked / open questions

- `/provocare` (the campaign's real front door) and `/primarie/harta` (the map-only selector) were not measured.
- The signed-in path was not measured. `CampaignProgressProvider` bootstraps remote progress and polls for signed-in
  users (`use-campaign-progress.tsx:515-545,603-630`).
- The 170 ms evaluation task of the map chunks was not split between MapLibre and Leaflet; that would need a build
  with the split groups.
- The share of the 162 ms task at 24,790 that is the GeoJSON `response.json()` parse is inferred from timing (no
  script attribution); a worker parse was not tried.
- **For the lead:** `/investitii-publice` answers **404** on dev-chronos (curl). The compile-time flag
  `publicInvestments: false` (`src/config/feature-flags.ts:12`) makes `src/routes/investitii-publice/route.tsx:15`
  (`assertFeatureEnabled`) throw `notFound()`. The route still sits in the manifest with 3 preloads.
