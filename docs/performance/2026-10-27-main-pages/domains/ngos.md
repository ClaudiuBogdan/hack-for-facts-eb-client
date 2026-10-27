# NGOs — `/ngos`

Subagent report, 2026-10-27 main-page audit. Code at dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/ngos/{deployed,local}/ngos-{desktop,mobile}/`; chunk analysis, an untimed copy of the
deployed HTML, the county-GeoJSON probe and the CPU-profile cuts in `evidence/ngos/extra/`. Shared causes
are cited from `domains/home.md` (home-S1…S11) and not re-analysed.

**In one line:** `/ngos` reads no API at all, server-side or in the browser. Its first visit costs the same
as every other page's (home-S1/S2/S3/S4). What is its own comes after hydration: the county map pulls a
114 KB GeoJSON and runs a 300 ms task on mobile, and the hub search's combobox is about half of the route's code.

## 1. Entry point

- Sidebar „ONG-uri" → `/ngos` (`src/components/sidebar/nav-main.tsx:62-64`). The landing page's group card
  links there too (`src/features/landing/lib/landing-groups.ts:112-115`). No Romanian spelling exists:
  `/ong`, `/ong-uri` and `/ongs` return 404. `/ngos/` answers **307** → `/ngos`.
- Routes: `src/routes/ngos.tsx` (layout, `component: Outlet`), `src/routes/ngos/index.tsx` (validateSearch,
  `pendingComponent: NgoHubPending`, a loader that only dynamic-imports the two summaries for the head's SEO
  figures, public cache headers) + `src/routes/ngos/index.lazy.tsx` (the page,
  `src/features/ngos/hub/ngo-hub-page.tsx`).
- Data: two summaries compiled into the client. `registry-summary.ts` (MJ registry, captured 2026-09-20)
  and `finance-summary.ts` (MF statements 2016–2025), 4.5 + 4.1 KB chunks. **No SSR or browser API call**
  (by design, `src/routes/ngos/index.tsx:7-18`). The hero search calls the API only on typing
  (`SearchEntities`, `auth: 'none'`, `src/features/entity-search/api/entity-search-api.live.ts:79-81`).

## 2. Numbers (medians of 3; harness TTFB)

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB (transfer / decoded) | API (preflights) | HTML KB (transfer / decoded) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 151 | 564 | 564 | 0 | 256 | 991 / 1067 | 226 | 3159 | 2200 / 6446 | 0 (0) | 27 / 154 |
| deployed | desktop | warm | 104 | 320 | 320 | 0 | 13 | 491 / 613 | 225 | 31 | 0 / 6446 | 0 (0) | 27 / 154 |
| deployed | mobile | cold | 144 | 7436 | 7436 | 0 | 1734 | 18019 / 18342 | 226 | 3161 | 2202 / 6446 | 0 (0) | 27 / 154 |
| deployed | mobile | warm | 89 | 944 | 944 | 0 | 908 | 1950 / 2503 | 225 | 32 | 0 / 6446 | 0 (0) | 27 / 154 |
| local | desktop | cold | 40 | 388 | 388 | 0 | 285 | 793 / 1003 | 224 | 3039 | 2085 / 6415 | 0 (0) | 26 / 153 |
| local | desktop | warm | 51 | 232 | 232 | 0 | 46 | 446 / 571 | 223 | 30 | 0 / 6415 | 0 (0) | 26 / 153 |
| local | mobile | cold | 30 | 8656 | 8656 | 0 | 1948 | 18157 / 18503 | 224 | 3040 | 2085 / 6415 | 0 (0) | 26 / 153 |
| local | mobile | warm | 41 | 916 | 916 | 0 | 907 | 1862 / 2360 | 223 | 30 | 0 / 6415 | 0 (0) | 26 / 153 |

- **LCP element:** desktop is the hero `h1` „ONG-urile din România". Mobile is the lede
  `p.mt-5.max-w-[37.5rem].text-lg…` („Asociațiile și fundațiile din registrul Ministerului Justiției…"). In
  every run LCP = FCP: plain text, painted as soon as the CSS arrives (home-S4).
- 214–215 JS files and 2.2 MB of JS per cold load. The NGO route's own share is 21 files and 111 KB
  (§3, step 6); the rest is the shared root.
- **Warm views refetch the HTML.** The route sends `max-age=0` (`src/routes/ngos/index.tsx:26-32`), so every
  repeat view downloads 27 KB again. Mobile warm FCP is 944 ms here, against 256 ms on `/` (which sends
  `max-age=3600`). See ngos-4.
- **TTFB / server render.** There are no SSR API calls on any render, cold or warm: the proxy log has no NGO
  operation, including the 16:50 warm-up, and `ssrApiCalls` is `[]` in all 12 local runs. No Nitro route
  rule covers `/ngos` (`nitro.config.ts:18-46`), so every request renders the page fresh. Local server wait
  is 31–50 ms, cold and warm alike. Deployed `cfOrigin` is 48–100 ms (n=12) with `cf-cache-status: DYNAMIC`.
  The pod therefore behaves like the local server: there is no server cache to warm.
- Deployed vs local: local mobile FCP is 1.2 s later (8.66 s against 7.44 s). `/` shows the same gap, which
  comes from the front proxy (h2) against Cloudflare (h3). Nothing about it is specific to `/ngos`.

## 3. Waterfall (deployed, mobile, cold, run 2: `evidence/ngos/deployed/ngos-mobile/run2-cold.json`)

1. **0–727 ms** document: 27 KB zstd / 154 KB, `cfOrigin` 48 ms.
2. **693–748 ms** the head starts everything at once: CSS 70 KB, 137 `modulepreload`s (136 root + the
   460 B `ngos-*.js`; 1,144 KB), the Inter preload 342 KB and the logo PNG 197 KB.
3. **7,244 ms** CSS done → **FCP = LCP 7,472 ms** (lede `p`). Inter arrives at 11,296 ms (swap, CLS 0).
4. **10,827 ms** the early wave ends (entry 259 KB). 10,863 → 15,088 ms: the second wave of 51 files and
   645 KB (6 Lingui catalogs + 45 deps, home-S2).
5. **15,116 ms** 1,164 ms module-evaluation task (home-S1).
6. **16,384 ms** the router asks for the hub's own code: 21 files, 111 KB (`index.lazy` 10 KB,
   `landing-search` 44 KB, `entity-tags` 9 KB, `hub-county-band` 7 KB, …), none of them preloaded → 17,877 ms.
7. **18,070 ms** hydration task, 332 ms: shell at 18,086 ms, end at 18,415 ms.
8. After hydration: **18,309 → 19,815 ms GeoJSON** (114 KB). **19,836 ms: 302 ms task** (projection + map
   render), map commit at ≈20.14 s. Clerk: clerk-js at 17,982 ms, FAPI calls 20.26–21.47 s, UI chunks until
   23.88 s, last React commit 23,920 ms. No API calls, no preflights. `/logo.png` favicon (197 KB) loads
   16.34–18.66 s.

Desktop (deployed run 2): CSS 229–323 ms, entry 229–428 ms, catalogs 498–568 ms, route code 883–941 ms,
hydration 991 / 1,067 ms, GeoJSON 1,052–1,119 ms, then a 109 ms map task at 1,125 ms; Clerk 967–1,794 ms.

## 4. API calls

| operation | where | start | duration | size | chained after |
|---|---|---|---|---|---|
| — | SSR | none (cold or warm; local `ssrApiCalls: []`, no NGO operation in the proxy log) | — | — | — |
| — | browser | none on load | — | — | — |
| `SearchEntities` (hero search) | browser, only on typing | not measured | — | — | `auth: 'none'`, so it does not wait for Clerk |
| *(not API)* `/geojson/judete-2026-03-09.json` | browser, at mount, after hydration | 18,309 ms mobile / 1,052 ms desktop | 1,506 / 67 ms | 114 KB zstd / 400 KB | hydration (react-query, enabled only in the browser) |

---

## Shared causes (cite home-Sn; `/ngos` numbers only)

- **home-S3 applies to `/ngos`:** only its layout chunk is preloaded (home.md first called `/ngos` an
  exception; it has been corrected). The only `/ngos` preload is `ngos-*.js`, 460 B: the auto-split
  `component: Outlet` of the layout `src/routes/ngos.tsx:4`. The hub itself lives in
  `src/routes/ngos/index.lazy.tsx` → `index.lazy-*.js`. That file is absent from the manifest (no `/ngos/` entry)
  and from the HTML (137 modulepreloads, none of them `index.lazy`: `evidence/ngos/extra/deployed-modulepreloads.txt`,
  `local/ngos-mobile/ssr.html`). So the count is **16 of 16 pages**.
  - **Delay (lazy chunk start − entry end), mobile cold:** 5,557 ms deployed (runs: 5,537 / 5,557 / 5,560)
    and 5,852 ms local. Most of it is home-S2 + home-S1 (catalogs until 15,088 ms, evaluation until ≈16.28 s).
    The route-code step itself is **16,384 → 17,877 ms = 1,493 ms** (21 files, 111 KB), followed by hydration
    at 18,086 ms. Desktop: 455 ms (883 − 428), route step 883 → 941 ms.
  - **Fix for `/ngos`:** move `NgoHubRoutePage` from `index.lazy.tsx` into `index.tsx`, so auto
    code-splitting creates a `?tsr-split=component` chunk the manifest preloads. Then check that its static
    deps (landing-search, hub-county-band, …) are listed as well. **Gain:** ≈1.0–1.5 s earlier hydration on
    mobile (the 111 KB join the first wave) and ≈60 ms on desktop.
- **home-S6 (Clerk wait):** no browser API call happens on load, so nothing waits for Clerk. The search uses
  `auth: 'none'`. Clerk itself loads 17.98–23.88 s on mobile, after hydration end (18.42 s).
- **home-S1:** 137 modulepreloads (136 root + `ngos-*.js`), early wave 1,144 KB zstd, done at 10.83 s
  (mobile); evaluation task 1,164 ms (deployed) / 801 ms (local trace). NGO code in the entry: 26.9 KB
  minified (2.9 % of 930 KB, source-map attribution, `extra/ngos-chunk-sources.txt`). See ngos-6.
- **home-S2:** catalogs 10,864 → 15,088 ms on mobile (second wave of 51 files, 645 KB); desktop 498 → 568 ms.
- **home-S4:** CSS 695 → 7,244 ms on mobile → FCP/LCP 7.44 s deployed, 8.66 s local; desktop 564 / 388 ms.
- **home-S5:** logo PNG 197 KB (693 → 10,151 ms), favicon `/logo.png` 197 KB again, Inter 342 KB
  (748 → 11,296 ms, after FCP).
- **home-S7:** Sentry 109 KB + PostHog 75 KB zstd in the early wave.
- **home-S8:** HTML `cf-cache-status: DYNAMIC` despite `s-maxage=3600`; no Nitro rule for `/ngos`, so it
  renders every time. Browser `max-age=0` is the route's own choice (ngos-4).
- **home-S9:** no preflights (no API calls). **home-S11:** the page has no async data, so a bot's `allReady`
  render costs the same as a browser's.

---

## Candidate issues (NGO-specific)

### ngos-1 — The county map fetches a 400 KB GeoJSON after hydration and projects it on the main thread (300 ms on mobile)

- **Numbers.** `/geojson/judete-2026-03-09.json`: 400 KB raw, **114 KB zstd** on the wire, 9,939 points at
  15–17 digits, 15 properties per county of which the map reads 2. Deployed it has **no `Cache-Control`**
  (heuristic caching only) and `cf-cache-status: DYNAMIC` (`extra/county-geojson.txt`). Mobile cold: fetched
  18,309 → 19,815 ms, then a **302 ms task** (deployed run 2; 274–302 ms over 3 runs; local 291 ms), so the
  map shows at ≈20.1 s, 1.7 s after hydration end. Desktop: 67 ms fetch + a 109–119 ms task.
  - The local trace's CPU profile of that task (`extra/mobile-map-task-by-source.txt`, `extra/mobile-trace-cuts.txt`) puts **196 ms of
    304 ms in `county-map.ts`**, of which ≈150 ms is the pole-of-inaccessibility label search
    (`segmentDistanceSq`/`signedDistance`, `src/features/statistics/lib/county-map.ts:57,76`, called from
    `:219`), plus path-string building. React and the SVG take the rest.
  - In node on this machine's CPU (no throttling), `projectCounties` takes 39–47 ms and emits 117 KB of path
    strings.
- **Cause.** `HubCountyBand` calls `useGeoJsonData('County')` (enabled only in the browser,
  `src/hooks/useGeoJson.ts:53-65`). `countyShapes()` projects and label-searches during render
  (`src/features/statistics/components/hub/hub-county-band.tsx:100-102`, `county-map.ts:192-224,294-300`).
  The file is served from `public/geojson/` without cache headers (dated name, no hash).
- **Fix.** Generate the projected shapes once at build time, the way the summaries are generated: per
  county `d` at 1 decimal, the label point and room. That is **26 KB brotli instead of 114 KB zstd**
  (measured, `extra/county-geojson.txt`). Ship it as a lazily imported module or a hashed asset; the band
  then only colours paths. For a static-data page like `/ngos` the SVG could even render on the server
  (≈25 KB more compressed HTML; the map would paint with FCP). At minimum, give `/geojson/*-YYYY-MM-DD.json`
  `Cache-Control: public, max-age=31536000, immutable` (the dated-name contract in `useGeoJson.ts:13-16` already
  allows it), strip the unused `pop*` properties and round coordinates.
- **Gain (estimate).** −88 KB per first visit; **≈−250 ms TBT on mobile** (the task's blocking part) and
  ≈−60 ms on desktop; map visible ≈1.5 s earlier on mobile. Repeat visits stop re-validating the file.
- Owner client (+ infra for the asset headers) · **P2** · shared? **yes**: `HubCountyBand` is also used by
  the companies, procurement, public-enterprises, INS and justice hubs, and by `/ngos/registry`
  (`registry-county-map.tsx`) · new.

### ngos-2 — Half of the hub's route code is the search combobox and a tag vocabulary it does not use until typing

- **Numbers.** Of the 21 route files (111 KB zstd), `landing-search-*.js` is 44 KB zstd / 125 KB raw. About
  102 KB of the raw is `@base-ui/react` combobox + floating-ui; the app's own search code is 20 KB
  (`extra/ngos-chunk-sources.txt`). `entity-tags-*.js` adds 9 KB zstd / 39 KB raw. Both sit in the 1,493 ms
  route step before hydration on mobile. `landing-search` self time in the mobile hydration task: 29 ms.
  The search is scoped to `source::rnong` (`src/features/ngos/hub/ngo-hub-search.tsx:8,28-35`). The tag
  vocabulary is not needed for that scope until results come back.
- **Cause.** `NgoHubPage` renders `LandingSearch` eagerly (`ngo-hub-page.tsx:27,89`). `search-filters.ts:5`
  imports `@/assets/entity-tags.json` statically; `useFilterLabels.tsx:228` already imports it dynamically.
- **Fix.** As home-2: SSR a plain `<input>` (the server already renders one) and load the combobox on
  focus or idle. On desktop the hub auto-focuses (`ngo-hub-search.tsx:33`), so start the import right after
  hydration there. Import the vocabulary lazily in `search-filters.ts`.
- **Gain (estimate).** ≈53 KB zstd out of the pre-hydration route step → ≈0.3 s earlier hydration on mobile
  Slow 4G and ≈30 ms less hydration work. Negligible on desktop.
- Owner client · **P2** · shared? **yes**: the same component sits on the home, companies, procurement,
  public-enterprises, public-investments, elections and INS hubs (home-2) · new.

### ngos-3 — `HubCountyBand` forces a synchronous layout on every commit

- **Numbers.** The local mobile trace's hydration task is 467 ms. **43 ms** of it is sampled in
  `frameSize()` (`clientWidth`/`clientHeight`, `src/features/statistics/components/uat-map/uat-map-tooltip-anchor.ts:16`),
  i.e. a forced layout of the whole page during hydration. It repeats on every band commit (map arrival,
  layer toggle, hover).
- **Cause.** `useLayoutEffect` with no dependency list calls `tooltip.frameSize()` before checking whether a
  county is active (`hub-county-band.tsx:147-151`).
- **Fix.** Return early (`tooltip.place(null)`) when `active` is null; read the frame size only when a tooltip
  is shown.
- **Gain (estimate).** ≈40 ms off the mobile hydration task; less on later commits.
- Owner client · **P3** · shared? yes (every `HubCountyBand` hub) · new.

### ngos-4 — A static page that browsers may not keep: every repeat view re-downloads and re-renders the HTML

- **Numbers.** `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` with no
  ETag. Every warm view re-downloads 27 KB (`docTransferBytes` warm = cold), and the pod renders it again
  (`cfOrigin` 48–85 ms on warm runs). Mobile warm FCP is **944 ms deployed / 916 ms local**, against 256 ms
  on `/` (`max-age=3600`, which paints from the browser cache). Desktop warm FCP is 320 ms against 204 ms.
- **Cause.** `browserMaxAgeSeconds: 0` (`src/routes/ngos/index.tsx:26-32`), plus Cloudflare ignoring
  `s-maxage` (home-S8). The page's content changes only with a deploy, since the summaries are compiled in.
- **Fix.** A short browser max-age (e.g. 300–600 s) for this route, weighed against home-S8's stale-HTML-after-deploy
  caveat. Or let Cloudflare cache it under a cache rule that bypasses on the locale/theme cookies (home-S8).
- **Gain (estimate).** ≈−0.7 s FCP on mobile repeat views (≈−0.1 s desktop); one origin render saved per view.
- Owner client (+ infra) · **P3** · shared? partly (home-S8; every route on the `max-age=0` default) · new.

### ngos-5 — NGO code in the entry, and a 460 B chunk for an `Outlet`

- **Numbers.** 26.9 KB minified of the 930 KB entry is NGO code (`extra/ngos-chunk-sources.txt`):
  - the hub's pending state (`ngo-hub-hero.tsx` 4.2 KB, `ngo-hub-pending.tsx` 3.1 KB, sections), which is
    `pendingComponent`, not auto-split;
  - the head builder (2.1 KB) and `ngo-format` (1.0 KB);
  - the `$cui`/registry route loaders' imports: `organization/api`, `model`, `words`, `head` and
    `registry/api`, 13.5 KB.

  Separately, `src/routes/ngos.tsx:4` sets `component: Outlet`. Auto code-splitting turns that into its own
  460 B chunk, which is one of the 137 preloads.
- **Fix.** Part of home-S1 cause 2: keep route files thin (move the `$cui`/registry loaders' work behind
  dynamic imports). Let `pendingComponent` be split, or keep it minimal. Drop `component: Outlet` from the
  layout route (an `Outlet` is the default).
- **Gain.** ≈27 KB raw (≈8 KB zstd) off every page's entry; one request less on `/ngos`. Polish.
- Owner client · **P3** · shared? yes (home-S1) · new.

## Not measured / open questions

- The client-side navigation to `/ngos` (the `NgoHubPending` path and the loader's dynamic imports) was not
  measured. The audit covers direct loads only.
- Real-device / priority-honouring throttling: mobile FCP is bounded by home-S4's DevTools caveat.
- The search's own latency on typing (`SearchEntities`) was not measured: no timed runs were added under
  the lock.
- The EN-locale render (`?lang=en` / `user-locale` cookie) and the API-off variant
  (`VITE_NGO_REGISTRY_ENABLED=false`, which drops the search) were not run.
- The pre-projected shape size (26 KB brotli) keeps every vertex at 1 decimal. A simplified outline would be
  smaller, but would need a visual check.
- `/ngos/` → 307 (temporary) to `/ngos`: a 301/308 would be the usual choice for a canonical slash redirect
  (SEO, not speed).
