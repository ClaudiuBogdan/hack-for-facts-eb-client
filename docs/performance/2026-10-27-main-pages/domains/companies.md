# Companies — `/companies`

Subagent report, 2026-10-27 main-page audit. Code at dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/companies/{deployed,local}/companies-{desktop,mobile}/`. Scripts and their outputs are in
`evidence/companies/analysis/`: `hub-route-chunks.txt` (the route's chunks beyond the root set),
`chunk-sources.txt` (source-map attribution; module `sourcesContent` length is used as a proxy for weight),
`county-map-projection.txt`, `waterfall.py`, `profile-window.py` (CPU samples by script in a trace window),
and `extract.py`.

**What this page does differently.** The hub asks the API for nothing. Every figure comes from a client
snapshot (`src/features/private-companies/lib/hub-snapshot.ts`, 21 KB source), so the page has **0 SSR API
calls and 0 browser API calls** on every run and target. The proxy log has no company operation at all, and
`ssrApiCalls` is `[]`. The `companyAnalysis*` queries run only on `/companies/analytics`, not on the hub. The
companies-specific cost is therefore not data. It is the route code arriving late, a county map built in the
browser after hydration, and an HTML response that every repeat view downloads again.

## 1. Entry point

- The sidebar item „Firme" links to `/companies` (`src/components/sidebar/nav-main.tsx:78-82`). The landing
  page links to it too (`src/features/landing/lib/landing-groups.ts:100-104`; the link is in the SSR HTML of `/`).
- Route files: `src/routes/companies.index.tsx` and `src/routes/companies.index.lazy.tsx`.
  - The eager file holds `validateSearch`, a `beforeLoad` that redirects old directory links, a `loader` that
    dynamic-imports the snapshot for four head figures, `headers`, and `pendingComponent`.
  - The lazy file renders `PrivateCompanyHubPage`
    (`src/features/private-companies/components/hub/private-company-hub-page.tsx`).
- Other spellings:
  - `/companies/` answers 307 to `/companies`.
  - `/firme` answers 404.
  - There is no Romanian duplicate.
  - Old directory deep links (`/companies?q=…`) answer 301 to their `/companies/search` target
    (`companies.index.tsx:33-43`).
  - A bare `/companies` does not redirect.

## 2. Numbers (medians of 3; TTFB as reported by the harness; LCP element named below the table)

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB (transfer / decoded) | API (preflights) | HTML KB (transfer / decoded) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 153 | 520 | 520 | 0 | 239 | 955 / 1022 | 225 | 3158 | 2198 / 6451 | 0 (0) | 29 / 170 |
| deployed | desktop | warm | 68 | 296 | 296 | 0 | 0 | 445 / 559 | 224 | 33 | 0 / 6451 | 0 (0) | **29** / 170 |
| deployed | mobile | cold | 154 | 7336 | 7336 | 0 | 1747 | 18036 / 18361 | 225 | 3159 | 2199 / 6451 | 0 (0) | 29 / 170 |
| deployed | mobile | warm | 81 | **916** | **916** | 0 | 839 | 1859 / 2402 | 224 | 34 | 0 / 6451 | 0 (0) | **29** / 170 |
| local | desktop | cold | 37 | 364 | 364 | 0 | 20 | 796 / 880 | 223 | 3039 | 2083 / 6420 | 0 (0) | 28 / 169 |
| local | desktop | warm | 38 | 264 | 264 | 0 | 5 | 401 / 523 | 222 | 32 | 0 / 6420 | 0 (0) | 28 / 169 |
| local | mobile | cold | 33 | 8776 | 8776 | 0 | 1848 | 18236 / 18577 | 223 | 3040 | 2083 / 6420 | 0 (0) | 28 / 169 |
| local | mobile | warm | 36 | 852 | 852 | 0 | 793 | 1842 / 2263 | 222 | 32 | 0 / 6420 | 0 (0) | 28 / 169 |

- **LCP element.**
  - Every cold run: the hero `h1` „Economia, firmă cu firmă" (`h1.mt-5.text-[clamp(…)]`).
  - Desktop warm runs: the same `h1`.
  - Mobile warm runs: the hero paragraph `p.mt-5.max-w-[46ch]` instead, because the font comes from cache.
  - LCP = FCP on every run, so the LCP is bounded by the CSS (shared: home-S4). No CLS on any run: the map's
    placeholder has the right aspect ratio (`aspect-[640/454]` against a projected 640 × 453.6).
- **Mobile document timing.** The response starts at ≈584 ms, which includes the emulated 562 ms RTT.
  - Deployed origin: Cloudflare `cfOrigin` 49–51 ms and `x-envoy-upstream-service-time` 36–58 ms.
  - Local: curl TTFB 38–43 ms.
  - The page is not in the Nitro route cache and has no data to wait for: each request renders it in ≈40 ms.
- **Repeat views download the HTML again** (29 KB, a full 200).
  - Mobile warm FCP: 916 ms, against 256 ms on `/`.
  - Desktop warm FCP: 296 ms, against 204 ms on `/`.
  - See companies-3.
- **Scale.** 1,402–1,536 DOM nodes. 214 JS files (213 local).

## 3. Waterfall (deployed, mobile, cold, run 2: `evidence/companies/deployed/companies-mobile/run2-cold.json`)

1. **0–734 ms: the document.** 29 KB zstd / 170 KB; the response starts at 584 ms.
2. **626–628 ms: the head starts everything at once.**
   - The CSS (70 KB).
   - The logo image preload (203 KB).
   - The font (342 KB).
   - **136 `modulepreload`s** (1.13 MB).
3. **7,117 ms: the CSS is done.** **FCP = LCP at 7,336 ms** (hero `h1`).
4. **10,757 ms: the entry (259 KB) and the first wave are done.**
   - 6 catalog files (≈552 kB / 539 KiB) download until 15,016 ms (shared: home-S2).
   - From 15,048 ms: a **1.21 s module-evaluation task** (shared: home-S1).
5. **16,347 ms: the router asks for the hub's route code.**
   - 21 files, 109 KB zstd, none of them preloaded (shared: home-S3).
   - They finish at 17,837 ms.
6. **18,018 ms: a 343 ms hydration task.** Hydration shell at 18,034 ms, end at 18,361 ms.
7. **18,276–19,799 ms: the county GeoJSON** (113 KB).
   - It is requested only after hydration.
   - Then a **263 ms task** projects the map (19,823 ms).
   - The map is drawn at ≈20.1 s. It is below the fold on both profiles, so it does not affect LCP.
8. **17,937–23,805 ms: Clerk.**
   - 302 KB of JS.
   - The Clerk FAPI calls (`dev_browser`, `environment`, `client`) run 20.2–21.4 s.
   - No API call follows.

Desktop (deployed, run 2), the same steps in order:

| step | ms |
|---|---|
| CSS | 166–296 |
| entry | 166–341 |
| catalogs | 180–489 |
| FCP | 500 |
| route code | 804–857 |
| hydration | 903 / 971 |
| GeoJSON | 964–1,034 |
| map task | ≈1,040 (67 ms) |
| Clerk | 881–1,657 |

## 4. API calls

| operation | SSR or browser | start | duration | size | chained after |
|---|---|---|---|---|---|
| none | — | — | — | — | — |

- **SSR.** None on any render, cold or warm. The proxy log (565 lines) has no company operation, and
  `ssrApiCalls` is `[]` on every local run.
  - The only "data" is the snapshot module, which the loader imports (`companies.index.tsx:44-47`).
  - The snapshot sits in the server bundle, so there is no request-time cache to describe. The cold render
    equals the warm render. The deployed pod behaves the same way (`cfOrigin` 49–51 ms on every load).
- **Browser.** None at load.
  - The hero search queries only once someone types (`src/features/landing/hooks/use-landing-search.ts:126-145`,
    `enabled: isQueryable`).
  - The search uses `auth: 'none'` (`src/features/entity-search/api/entity-search-api.live.ts:79-81`), so
    **the first search does not wait for Clerk** (home-S6 does not apply here).
- **Non-API fetches.**
  - `/geojson/judete-2026-03-09.json` (113 KB zstd / 400 KB): after hydration, see companies-2.
  - The three Clerk FAPI calls (home-S6).

## 5. Candidate issues

### companies-1 — The hub's route code (21 files, 109 KB) starts 5.6 s after the entry and adds a 1.5 s serial step before hydration on mobile

- **Numbers.**
  - **Lazy-chunk start minus entry end** (median of 3 cold runs, the figure home-S3 asked for):
    - Deployed mobile: **5,590 ms**. The three runs: 16,347 − 10,757; 16,436 − 10,800; 16,348 − 10,772.
    - Local mobile: 5,609 ms.
    - Deployed desktop: 559 ms.
    - Most of that gap is home-S2 (catalogs, 10.8 → 15.0 s) and the home-S1 evaluation (1.2 s).
  - **The route code's own fetch window:**
    - Mobile: 16,347 → 17,837 ms = **1.49 s**, then the hydration shell at 18,034 ms.
    - Desktop: 804 → 857 ms (53 ms).
    - The 21 files are fetched in parallel (Vite's preload helper requests the lazy chunk's dependencies with
      it), so the cost is one round trip plus 109 KB on a shared pipe, not one round trip per import level
      (the chain is 4 levels deep: `hub-route-chunks.txt`).
- **Content** (local build, raw / brotli; `evidence/companies/analysis/hub-route-chunks.txt`):

  | chunk | raw / brotli | what |
  |---|---|---|
  | `landing-search` | 125 / 38 KB | the Base UI combobox + floating-ui, as home-2 |
  | `companies.index.lazy` | 46 / 12 KB | the hub page 30 KB source, county map 18 KB, economy chart 16 KB, sectors 8 KB, activity rankings 8 KB |
  | `entity-tags` | 28 / 7 KB | `src/assets/entity-tags.json`, via the search |
  | `hub-snapshot` | 17 / 3 KB | the snapshot |
  | 17 small files | — | the rest |
  | **total** | **280 / 85 KB** | 109 KB as transferred on deployed |

- **Cause.** The page component lives in `src/routes/companies.index.lazy.tsx`. TanStack Start's manifest has
  no preload entry for `/companies/` (shared: home-S3). The eager file `companies.index.tsx` has no
  `component` key to split, so no `?tsr-split` chunk exists for it either.
- **Fix.** As home-S3. Either move the component into `companies.index.tsx` so it is auto-split and gets a
  manifest entry, or add the route chunk to the route's `head` links. Then check that the SSR HTML carries
  the page's generated `?tsr-split=component` chunk and its dependencies, or `companies.index.lazy-*.js` if the
  explicit lazy route stays. Optionally load the combobox on focus (home-2): it is 44 KB
  of the 109 KB.
- **Gain (estimate).**
  - Mobile: the 1.49 s step folds into the first wave, which grows by ≈0.6 s of bandwidth (109 KB at
    184 KiB/s). Net **≈0.9 s earlier hydration**, and more once home-S1/S2 shrink the first wave.
  - Desktop: ≈50 ms.
- **Owner** client · **Severity** P1 (through home-S3) · **shared?** yes (home-S3: all 16 pages) · new.

### companies-2 — The county map is fetched and projected in the browser after hydration: 113 KB plus a 250 ms task on every load

- **Numbers.**
  - **The fetch.** The GeoJSON is requested only after hydration:
    - Mobile cold: 18,276 → 19,799 ms, 113 KB zstd / 400 KB, competing with Clerk's 302 KB.
    - Desktop: 964 → 1,034 ms.
  - **The task.** It follows at once:
    - Mobile cold: **249–309 ms** (19,823 ms in run 2; 20,043 / 19,793 ms in runs 1 and 3).
    - Mobile warm: ≈224 ms. The projection cache is a `WeakMap` and does not survive a reload.
    - Desktop: 67–77 ms.
  - **CPU profile, self time in `county-map-*.js`** (`profile-window.py` on the traces): 206 ms (local mobile)
    and 210 ms (deployed mobile), 43–45 ms on desktop. Most of it is the label placement: 140 ms in
    `segmentDistanceSq` and 12 ms in `signedDistance`, both called by `poleOfInaccessibility`
    (`src/features/statistics/lib/county-map.ts:149-191`). The minified names were matched to the source by
    the chunk's code. The task is ≈210 ms of the 1,747 ms mobile TBT.
  - **When the map appears.** Mobile ≈20.1 s, ≈2 s after hydration. Until then the SSR HTML shows a pulsing
    placeholder. The map is below the fold at load (`run1-cold.png`, both profiles), so LCP is not affected.
- **Cause.**
  - `src/hooks/useGeoJson.ts:53-66` disables the query on the server (`enabled: isBrowser`).
  - `company-county-map.tsx:70` therefore has no shapes on the server, and SSR renders the placeholder
    (`company-county-map.tsx:266-268`).
  - On the client, `countyShapes(features)` (`src/features/statistics/lib/county-map.ts:294-302`) projects
    42 counties and places their labels from raw GeoJSON on every page load.
- **Fix.** The geometry and the snapshot are both static, so precompute the projection at build time (a script
  or Vite plugin that runs `projectCounties` once) and render the SVG on the server.
  - Measured: path strings at 0.1 px precision are 117 KB raw / 25 KB brotli; rounded to integers they are
    75 KB / 12.7 KB (`county-map-projection.txt`). That adds 13–25 KB of compressed HTML, or a hashed asset.
  - Minimum version: fetch the projected paths and label points (≈13–25 KB) instead of the 113 KB GeoJSON, and
    skip the client projection.
- **Gain (estimate).**
  - Bytes: −113 KB per cold load. The GeoJSON has no `cache-control` and is `cf-cache-status: DYNAMIC`, so
    repeat views rely on the browser's heuristic cache.
  - Main thread: −≈250 ms on mobile cold and warm (≈−200 ms TBT), −≈45 ms on desktop.
  - Display: the map appears at FCP instead of ≈2 s after hydration.
- **Owner** client · **Severity** P2 · **shared?** partly: the INS hub draws the same map
  (`src/features/statistics/components/hub/hub-county-band.tsx`, `src/features/statistics/components/county-map/county-map.tsx`)
  · new.

### companies-3 — Every repeat view downloads the HTML again: `max-age=0` and no validator

- **Numbers.**
  - Warm document: 200, 29 KB, no `ETag` and no `Last-Modified`. Response end at 720 ms on mobile, 98 ms on
    desktop (`run2-warm.json`, `document`).
  - Warm FCP:
    - Mobile: **916 ms** deployed, 852 ms local.
    - Desktop: 296 ms deployed.
    - Compare `/`, which the browser serves from cache: 256 ms mobile, 204 ms desktop.
- **Cause.**
  - `src/routes/companies.index.tsx:48-54` sets `browserMaxAgeSeconds: 0`.
  - `src/lib/http-cache.ts:18-38` adds no validator, and the server sends none.
  - The hub's figures are a client snapshot that changes only with a deploy.
- **Fix.** Give this route a short browser lifetime (e.g. `max-age=300`) so repeat views within a session are
  served from cache. Also add a validator (an ETag from the build id plus the locale/theme cookies) so later
  revalidations are 304s without a body.
  - Keep home-S8's caveat in mind: HTML cached across a deploy points at the old chunks, and
    `src/lib/chunk-recovery.ts` reloads. A few minutes keeps that window small.
- **Gain.**
  - Mobile repeat-view FCP: ≈−0.65 s (916 → ≈260 ms, as `/`).
  - Desktop: ≈−90 ms.
  - With the validator only (no max-age): ≈−0.16 s on Slow 4G, for the 29 KB body; the round trip remains.
- **Owner** client (+ infra for Cloudflare, home-S8) · **Severity** P2 · **shared?** yes: home-S8 (every route
  on the default `max-age=0`) · new.

### companies-4 — Companies code in every page's root preloads, including the mock fixtures

- **Numbers** (local build; `chunk-sources.txt`).
  - **Root-preload chunks that are mostly companies code.** Together: 99 KB raw / 33 KB zstd.

    | chunk | raw / zstd | what |
    |---|---|---|
    | `private-company-api` | 52 / 15 KB | **30 % of its source is mocks**: `mocks/fixtures/index.ts` 17 KB, `activity-selection.ts` 7 KB, `registry.ts` 6 KB, `qualification.ts` 3 KB, the search mock 4 KB |
    | `company-profile-model` | 17 / 6 KB | |
    | `financial-qualification` | 15 / 5 KB | the `private-company*` zod schemas: 22 + 19 + 10 KB source |
    | `company-analytics-url` | 11 / 4 KB | |
    | others | — | `private-company-search`, `hub-format`, `company-legal-forms` |

  - **Also in the entry:** ≈36 KB of companies source (hub hero 9 KB, hub pending state 6 KB, directory
    redirect 6 KB, hub SEO 5 KB, three route files).
  - **Evaluation cost.** The companies zod schemas are built at module evaluation on every page. home-S1 lists
    `private-company-api` among the callers of the 494 ms of zod time in the mobile evaluation task.
- **Cause.**
  - `src/routes/companies.$cui.tsx:2-3` imports `fetchPrivateCompanyProfile` and
    `privateCompanyProfileQueryOptions` statically into an eager route file.
  - `src/features/private-companies/api/private-company-api.ts:4-8` imports the mock implementations
    statically and chooses between them at run time (`isPrivateCompanyMockEnabled()`), so the bundler cannot
    drop them.
  - `src/features/ngos/organization/model.ts:1` pulls `company-profile-model` for `displayCompanyName`.
  - `company-hub-hero.tsx:11` (the eager pending state) pulls `company-analytics-url` for two links.
- **Fix.**
  - In `companies.$cui.tsx`, `await import()` the API and query options inside the loader, as
    `companies.index.tsx:45` already does for the snapshot.
  - Load the mocks through a dynamic import behind the mock-mode check.
  - Move `displayCompanyName` to a small module.
  - Give the hero's two links precomputed search objects.
- **Gain (estimate).** ≈−33 KB zstd on every page's first visit (≈0.2 s on Slow 4G), less zod work in the
  evaluation task, and no mock code in production.
- **Owner** client · **Severity** P2 · **shared?** yes: part of home-S1 (cause 2), every page · partly known
  (home-S1 names `companies.$cui.tsx:2`; the mock fixtures are new).

### companies-5 — The hub is rendered on every request, with no data to wait for (P3)

- **Numbers.**
  - Deployed TTFB 153 ms on desktop, against 89 ms on `/`.
  - `cfOrigin` 49–51 ms here against 24–27 ms on `/`, which is served from the Nitro cache.
  - Local render 33–38 ms.
- **Cause.** `/companies` is not in `nitro.config.ts` `routeRules`, and Cloudflare does not cache HTML (home-S8).
- **Fix.** None on its own. Take it with home-S8: a Cloudflare cache rule with a cookie bypass, rather than the
  Nitro cache with its cookie-stripping bug.
- **Gain.** ≈25–40 ms TTFB.
- **Owner** infra/client · **Severity** P3 · **shared?** yes (home-S8).

## Shared causes (this page's numbers; analysis in `domains/home.md`)

- **shared: home-S1** — 136 modulepreloads, all done at 10,757 ms on mobile (1,133 KB). Evaluation task
  1,206 ms on deployed mobile. In the local mobile trace it is 740 ms (590 ms `v8.evaluateModule`).
- **shared: home-S2** — 6 catalog files, ≈552 kB / 539 KiB, 10,802 → 15,010 ms on mobile; 421 → 490 ms on desktop.
- **shared: home-S3** — see companies-1. Lazy-chunk start minus entry end: **5,590 ms** on mobile (deployed),
  559 ms on desktop. The route code's own window is 1.49 s on mobile.
- **shared: home-S4** — the CSS (70 KB) is done at 7,117 ms → FCP 7,336 ms on mobile. The CSS shares the pipe
  with 1.13 MB of preloads, the 342 KB font and the 203 KB logo.
- **shared: home-S5 / home-S7** — images:
  - The logo image preload, 203 KB.
  - The favicon `/logo.png`, 197 KB ("other").
  - The font, 342 KB, done at 11,240 ms on mobile.
  - Sentry and PostHog are among the root preloads.
- **shared: home-S6** — Clerk: 302 KB zstd of JS, 17.9–23.8 s on mobile. 3 FAPI calls, 20.2–21.4 s.
  - **No browser API read on this page waits for Clerk.** There are none at load, and the search uses
    `auth: 'none'`.
  - Clerk still competes with the GeoJSON for bandwidth.
- **shared: home-S8** — `cf-cache-status: DYNAMIC`. The page is not in the Nitro route cache, so it is not
  affected by the cookie-stripping bug. `max-age=0` without a validator: companies-3.
- **shared: home-S9** — no preflights (no API calls).
- **shared: home-S10** — no server-side cache involved. The cold render equals the warm render.
- **shared: home-S11** — not measured here.
- **shared: home-3** — the hydration task:
  - Deployed mobile: 343 ms.
  - Local trace: 421 ms. 251 ms of it is JS, with TanStack `scrollRestoration` at 63 ms self time, and
    97 ms is style recalculation.
  - Hub-specific JS inside that task is small: `landing-search` 28 ms, `hub-format` 12 ms, the hub chunk
    10 ms, `company-analytics-url` 9 ms.

## 6. Not checked / open questions

- **Client navigation to `/companies`** (sidebar click): `pendingComponent` shows while the lazy chunk and the
  loader's snapshot import load. Not timed by the batch.
- **No extra runs** (the lead asked to keep the lock free). The gains for companies-1 and companies-2 are
  estimates from the timings and the build, not measured with the fix applied.
- **`hub-format` costs 48–50 ms of self time on mobile**, most of it in the first `Intl.NumberFormat`
  constructions. ICU initialisation probably happens on any page that formats numbers. Not pursued.
- **The SSR HTML is 170 KB decoded; 54 % of the body is `class` attributes** (85 KB of 157 KB). It compresses to
  29 KB, so it was left as is.
- **The mobile warm LCP element changes** from the `h1` to the hero `p`, because the font comes from cache.
  Harmless, but it makes LCP-element comparisons across views noisy.
