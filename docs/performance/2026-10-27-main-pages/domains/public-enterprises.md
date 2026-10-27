# Public enterprises: `/public-enterprises`

Audited 2026-10-27 by the public-enterprises subagent. Code: dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/public-enterprises/{deployed,local}/public-enterprises-{desktop,mobile}/`. The page shows
no people (authorities and enterprises only), so the harness ran without `--people`.

**In short.** The hub is cheap where it was designed to be. It makes no API call during SSR or at load, the
snapshot costs 6 KB zstd of JS, the HTML is 26 KB zstd, and the LCP is the SSR `h1`. Its time goes to the
shared shell (home-S1/S2/S4: FCP 7.4 s and hydration 18.1 s on mobile). After that come two costs of its own.
The route's 23 chunks (121 KB) are requested only after the shell has evaluated, a 1.54 s serial step on
mobile (pe-1 = home-S3). A below-the-fold county map then fetches a 115 KB GeoJSON at hydration and spends a
250–300 ms long task when it lands (pe-2).

## 1. Entry point

- **The navigation links to `/public-enterprises`** from the sidebar ("Întreprinderi publice") and the
  landing page's domain grid (both `href="/public-enterprises"` in the deployed `/` HTML).
- **`/intreprinderi-publice` answers `301 → /public-enterprises`** on both targets (`cf-cache-status:
  DYNAMIC`), from `src/routes/intreprinderi-publice/index.tsx:8-17` with
  `LEGACY_FRONT_DOOR_REDIRECT = { statusCode: 301 }` (`src/features/public-enterprises/lib/legacy-redirect.ts:27`).
  Only `lang` is carried over. It is not a duplicate page, and nothing in the navigation links to it. An old link
  costs one extra round trip (≈0.1 s desktop, ≈0.56 s Slow 4G).

## 2. Numbers (medians of 3; cold = empty cache, warm = repeat view)

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | requests | transfer KB | JS KB (tr / dec) | API | HTML KB (tr / dec) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 249 | 684 | 684 | 0 | 271 | 1,356 / 1,425 | 227 | 3,166 | 2,208 / 6,465 | 0 | 26 / 160 |
| deployed | desktop | warm | 98 | 352 | 352 | 0 | 7 | 568 / 673 | 226 | 31 | 0 / 6,465 | 0 | 26 / 160 |
| local | desktop | cold | 48 | 348 | 348 | 0 | 261 | 749 / 902 | 225 | 3,045 | 2,091 / 6,434 | 0 | 25 / 160 |
| local | desktop | warm | 51 | 232 | 232 | 0 | 4 | 395 / 500 | 224 | 29 | 0 / 6,434 | 0 | 25 / 160 |
| deployed | mobile | cold | 121 (585)* | 7,376 | 7,376 | 0.001 | 1,785 | 18,128 / 18,450 | 227 | 3,165 | 2,208 / 6,465 | 0 | 26 / 160 |
| deployed | mobile | warm | 86 | 844 | 844 | 0 | 799 | 1,920 / 2,287 | 226 | 30 | 0 / 6,465 | 0 | 26 / 160 |
| local | mobile | cold | 47 (573)* | 8,656 | 8,656 | 0.001 | 1,677 | 18,326 / 18,611 | 225 | 3,045 | 2,091 / 6,434 | 0 | 25 / 160 |
| local | mobile | warm | 48 | 936 | 936 | 0 | 743 | 1,777 / 2,152 | 224 | 29 | 0 / 6,434 | 0 | 25 / 160 |

\* Navigation Timing's `responseStart` excludes DevTools' emulated 562 ms latency. The value in brackets is
the document's TTFB as the network layer saw it (`document.ttfb` in the run JSON).

- **LCP element:** the hero `h1` ("Firmele statului / și ale primăriilor",
  `h1.mt-5.text-[clamp(2.2rem,8vw+0.6rem,2.75rem)]…`, `src/features/public-enterprises/components/hub/hub-hero.tsx:45`).
  It is plain SSR text, so LCP = FCP on every run, and it never depends on JS.
- **Server render:** local TTFB 30–56 ms on every request; curl to the deployed site shows `x-envoy-upstream-service-time: 60`.
  The page is not in Nitro's `routeRules` (`nitro.config.ts:18-59`), so each request renders afresh. It also
  honours the locale and theme cookies (no home-S8 stripping).
- **Outlier:** deployed desktop run 3 was ≈10× slower on the network (CSS 914 → 4,765 ms, entry → 6,774 ms),
  and every resource was affected. It is a network blip, not the page. The medians come from runs 1–2's range.
- DOM: 1,503 nodes on desktop, 1,369 on mobile. Console errors: none. CLS 0.001 on mobile at 11.2–11.3 s, from
  the hero's shortcut links when the font swaps (home-S5).

## 3. Waterfall (deployed, mobile, cold, run 2: `run2-cold.json`)

1. **0 → 720 ms:** the document, 26.8 KB zstd / 164 KB (TTFB 585 ms = one emulated RTT).
2. **628 → 7,117 ms:** the render-blocking CSS (70 KB). It shares the pipe with 136 modulepreloads, the
   font (342 KB, done at 11.2 s) and the logo (202 KB). **FCP = LCP 7,328 ms**, the hero `h1` (home-S4).
3. **629 → 10,748 ms:** the entry (259 KB zstd) and the root preloads (home-S1).
4. **10,780 → 15,009 ms:** all six Lingui catalogs (≈552 kB / 539 KiB; the `messages` pair is 229 + 238 KB,
   home-S2). At 15,034 ms the module
   evaluation task takes 1,254 ms (home-S1).
5. **16,383 → 17,925 ms:** the route's own code, 23 files and 121 KB zstd (`index.lazy`, `landing-search`,
   `hub-snapshot`, `hub-county-band`, …). These are requested only now (home-S3, pe-1). The 202 KB favicon
   `/logo.png` (16,342 → 18,720 ms) downloads alongside them.
6. **18,128 ms:** hydration shell, a 417 ms task (`trace-summary.txt`). Hydration ends at 18,438 ms.
7. **18,335 → 19,832 ms:** the county GeoJSON (115 KB). It is followed by a 252 ms long task at 19,853 ms
   (pe-2). Then Clerk runs 19.9–21.4 s (home-S6), and the last JS (Clerk UI) arrives at 23.8 s.

Desktop, deployed run 1: CSS and entry are done at 290 ms, FCP is 564 ms, the catalogs run 556–612 ms, and the
evaluation task (298 ms) starts at 653 ms. The route wave runs 983–1,041 ms, hydration happens at 1,096 ms,
and the GeoJSON runs 1,165–1,235 ms, followed by a 73 ms task at 1,243 ms.

## 4. API calls

| operation | SSR / browser | start | duration | size | chained after |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

There are none. `ssrApiCalls` is `[]` in all local runs, and the proxy log's warm-up render (16:50) holds no
server call for this page. The hub reads no API, by design (`src/routes/public-enterprises/index.tsx:7-19`).
The only API read is the hero search, which fires on typing and uses `auth: 'none'`
(`src/features/entity-search/api/entity-search-api.live.ts:79-81`), so it never waits for Clerk (home-S6).
The page has no preflights. The non-API fetches are the county GeoJSON (pe-2), `/cdn-cgi/rum` (deployed only),
and Clerk's FAPI calls (`dev_browser`, `environment`, `client`).

**Server-side caching (S10).** There is nothing to cache. The loader's `await import('…/hub-snapshot')`
(`index.tsx:23-26`) is the only server work beyond rendering, and the module cache keeps it for the process
lifetime. Cold and warm server renders are the same. The deployed pod behaves the same way (60 ms upstream).

## 5. What the snapshot design ships (the lead's question)

- **JS:** `hub-snapshot-*.js` is 24.2 KB raw / **6.2 KB zstd**. It is statically imported by the lazy route
  chunk (`src/routes/public-enterprises/index.lazy.tsx:3`), so it is part of the hydration wave (pe-1). Its
  generated source is 42.7 KB (`src/features/public-enterprises/lib/hub-snapshot.ts`). The model work over it
  (`hub-model.ts`) is trivial; on mobile, `count-up` and `reveal` together use less than 20 ms of main thread.
- **Hydration payload:** the loader returns only the SEO figures (≈0.5 KB in `$_TSR`: counts, dates, two
  source URLs). The snapshot is not dehydrated.
- **HTML:** 164 KB decoded / 26 KB zstd. `<main>` is 99.6 KB (895 elements, mostly class attributes); the
  head plus sidebar is 56 KB. The figures appear twice, in the HTML and in the JS, which costs only those 6 KB.
- **The 1.4 MB authority portfolio** (`lib/portfolio-snapshot.json`) is **server-only**. It becomes the
  1.6 MB `.output/server/_ssr/portfolio-snapshot-*.mjs`, which `api/authority-portfolio-server.ts:16` imports
  lazily. No client chunk contains it, and the hub never loads it.
- **Entry:** the entry chunk carries ≈49 KB of source (source-map `sourcesContent`, a proxy) from this domain's
  eager route files: pending components, head builders, schemas and the legacy redirects. Every page pays for
  this. It is the home-S1 pattern, small on its own.

**Verdict:** the snapshot is not a cost worth fixing (≈6 KB per first visit). The page's own costs are
*when* its code is requested (pe-1) and what the county band fetches (pe-2).

## 6. Candidate issues

### pe-1: The route's code (23 files, 121 KB) is requested only after the shell has evaluated

- **Numbers (mobile cold).** The lazy chunk starts **5,635 ms after the entry ends** (deployed: 5,756 /
  5,635 / 5,542; local: 5,998 / 5,690 / 5,672). That splits into the catalog step (4.2 s, home-S2) and the
  evaluation task (1.16–1.25 s, home-S1), then **the route wave itself: 16,383 → 17,925 ms = 1.54 s** (local
  1.50 s). The wave is 23 files, 121 KB zstd / 294 KB decoded; `landing-search` (45 KB) arrives last, and
  hydration follows 0.2 s later. Desktop: the route wave takes 58–148 ms (983 → 1,041 ms, hydration at 1,096 ms).
  Evidence: `deployed/public-enterprises-mobile/run{1,2,3}-cold.json` (`scripts`, `requests`).
- **Cause.** `src/routes/public-enterprises/index.lazy.tsx:1-11` is a `createLazyFileRoute`. The build
  manifest has **no `/public-enterprises/` entry** (`.output/server/_tanstack-start-manifest_v-*.mjs`, which
  maps only `?tsr-split` chunks), so the SSR HTML carries only the root's 136 modulepreloads. The lazy
  import's Vite preload list (106 files, 23 beyond the root closure) starts at `router.hydrate`.
- **Fix.** As home-S3. Here, move `PublicEnterpriseHubRoutePage` into `index.tsx` so auto code-splitting
  emits a `?tsr-split=component` chunk the manifest preloads. The loader's `import()` of the snapshot can then
  become a static import in the split component. Check that the HTML lists `index-*.js`, `hub-snapshot-*.js`
  and `landing-search-*.js`. Do this together with the favicon fix (home-S5): the 202 KB `/logo.png` currently
  downloads inside this wave.
- **Expected gain.** Hydration ≈0.9–1.5 s earlier on mobile: the 121 KB moves into the first wave (+≈0.66 s
  there at 184 KiB/s) and the 1.54 s serial step goes away. On desktop, ≈60–150 ms earlier. FCP/LCP are
  unchanged.
- Owner client · **P1** · shared? **yes: home-S3** (all 16 main pages) · new (home-S3).

### pe-2: A below-the-fold county map fetches a 115 KB GeoJSON at hydration, then blocks the main thread

- **Numbers.** `/geojson/judete-2026-03-09.json` is 399,837 B raw and 113–115 KB zstd on the wire. It is
  requested right after hydration:
  - Deployed mobile: 18,335 → 19,832 ms (1.5 s), then a **252–300 ms long task** (LoAF:
    `tanstack-*.js` setTimeout → React render). Run 2 shows a 252 ms task at 19,853 ms; the traced load
    shows a 300 ms task at 19,609 ms, right after the GeoJSON ends at 19,585 ms. That is ≈200 ms of the mobile TBT
    (1,785 ms).
  - Deployed desktop: 1,165 → 1,235 ms, then a 67–73 ms task (≈20 ms TBT).
  - Local: the same pattern (mobile 246–248 ms tasks, desktop 68–84 ms).

  The band is the fourth section (`#judete`), far below the mobile first viewport (`run1-cold.png`). It
  lands ≈1.7 s after hydration, when the reader is likely to start tapping, so it is an INP risk too. The file
  has 42 features and 9,939 points. Its coordinates carry 14–15 decimals and 15 properties per county, 13 of them unused here (e.g.
  `pop1948…pop2011`), but the band reads only `name` + `mnemonic` (`src/features/statistics/lib/county-map.ts:12`).
  It is served with **no `Cache-Control`** and `cf-cache-status: DYNAMIC`, even though the name is dated
  (versioned). Repeat views read it from disk cache only by heuristic freshness.
- **Cause.** `src/features/statistics/components/hub/hub-county-band.tsx:100` calls `useGeoJsonData('County')`,
  which is enabled on mount in the browser (`src/hooks/useGeoJson.ts:17-21,59-65`). The page mounts it through
  `CountiesBand` (`src/features/public-enterprises/components/hub/hub-bands.tsx:149`;
  `public-enterprise-hub-page.tsx:76`). The band already reserves its box (`hub-county-band.tsx:363`,
  `aspect-[640/454]`), so a deferred fetch causes no CLS.
- **Fix.**
  1. Enable the query only when the band nears the viewport, through an IntersectionObserver with a
     ~1-viewport margin (the page already runs `useRevealOnView`).
  2. Ship a slim county-outline asset. Rounded to 4 decimals with only `name`/`mnemonic` kept, it measures
     182 KB raw / **31 KB brotli**, against 400 KB / 88 KB brotli today. Pre-projected SVG path strings for the
     640-px map would be smaller still.
  3. Send `Cache-Control: public, max-age=31536000, immutable` for `/geojson/*` through a Nitro route rule.
- **Expected gain.** Cold mobile: −115 KB and −1.5 s of network right after hydration, and the 250–300 ms task
  moves to when (if) the reader scrolls there. With the slim asset, −84 KB of transfer (≈0.45 s Slow 4G) and
  roughly half the parse work wherever the map does load. Mobile TBT −≈200 ms at load; desktop −≈20 ms.
- Owner client · **P2** · shared? **yes: the same `HubCountyBand` / `useGeoJsonData('County')`** on the
  INS, NGO, companies, procurement and justice hubs, plus PNRR map views (not in the home-S list) · new.

### pe-3: The hero search's combobox is on the hydration path

- **Numbers.** `landing-search-*.js` is 45 KB zstd / 122 KB. With `entity-tags` (9 KB), `entity-search-api`
  (5 KB), `popover` (3 KB) and the Base UI / floating-ui parts, the search accounts for ≈65 KB of the 121 KB
  route wave. It is the last file of that wave to arrive (17,925 ms, vs 17,329 ms for `index.lazy`), so on
  mobile it decides when hydration can start. Desktop: 44 KB, arriving at 1,011–1,210 ms.
- **Cause.** `src/features/public-enterprises/components/hub/hub-search.tsx:5,23-36` imports `LandingSearch`
  statically. On desktop it autofocuses the input (`autoFocus={!isMobile && !hash}`).
- **Fix.** As home-2: render a plain input on SSR and load the combobox on focus or idle. On desktop, autofocus
  would then trigger that load at once, which is fine.
- **Expected gain.** ≈0.3–0.4 s earlier hydration on mobile (≈65 KB less on the critical path, Slow 4G), and
  less evaluation in the hydration task.
- Owner client · **P2** · shared? **yes: home-2** (the same chunk on `/`, the companies, INS, NGO and procurement hubs and `/procurement/analytics`) · new.

### pe-4: A deploy-time snapshot page whose HTML no cache keeps

- **Numbers.**
  - Headers: `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`, `Vary: Accept-Encoding, Cookie`
    (`src/routes/public-enterprises/index.tsx:27-33`), and `cf-cache-status: DYNAMIC` on every run.
  - Repeat views refetch the HTML: warm document end is 702 ms on mobile (one emulated RTT plus transfer) and
    103–136 ms on desktop. Warm mobile FCP is 844 ms.
  - Deployed desktop document TTFB is 198–250 ms in the harness and 160 ms by curl from Zeus, of which 60 ms
    is upstream.
- **Cause.** home-S8: Cloudflare has no cache rule, so `s-maxage` is unused. The figures change only when a
  generator run is committed and deployed, so this page is the easiest one to cache at the edge (no API, no
  user data). It needs the cookie-bypass condition home-S8 describes, because its render follows the locale and
  theme cookies.
- **Fix.** Use the home-S8 Cloudflare rule (bypass on the locale and theme cookies). Leave the browser
  `max-age` at 0 because of home-S8's stale-chunk risk.
- **Expected gain.** Deployed TTFB ≈−100–200 ms for cold visitors outside the cluster's region. There is no
  change to the mobile emulation numbers, which are dominated by home-S1/S2/S4.
- Owner infra (+ client) · **P3** · shared? **yes: home-S8** · known (Cloudflare `DYNAMIC`,
  `docs/entity-page-ssr-loading.md:129-131`).

## 7. Shared causes: this page's numbers (cite the home-S items)

- **shared: home-S1.** 216 JS files per cold load: 136 modulepreloads and 78 script-initiated. They total
  2,208 KB zstd / 6,465 KB decoded (deployed). The entry is 259 KB / 910 KB and finishes at 10.75 s on mobile.
  The evaluation task is 1.16–1.25 s on mobile and 298–302 ms on desktop. Main thread by script on mobile
  (trace): `index-*.js` 992 ms (deployed) / 1,087 ms (local).
- **shared: home-S2.** Six catalogs, ≈552 kB / 539 KiB; the `messages` en + ro pair is 229 + 238 KB. On mobile they load 10,780 → 15,009 ms
  (+4.2 s serial); on desktop 556 → 612 ms.
- **shared: home-S3.** See pe-1. Lazy start − entry end: **5,635 ms** on mobile, deployed (local 5,690 ms).
  The route wave itself takes 1.54 s; on desktop, 58–148 ms.
- **shared: home-S4.** The CSS (70 KB zstd / 520 KB) loads 628 → 7,117 ms on mobile, giving FCP/LCP
  7.38 s deployed and 8.66 s local. On desktop it takes 259 → 443 ms and FCP is 684 ms.
- **shared: home-S5/S7.**
  - The logo preload (202 KB) runs 627 → 10,065 ms on mobile.
  - The favicon `/logo.png` (202 KB) runs 16,342 → 18,720 ms on mobile, inside the route wave.
  - Inter (342 KB) runs 666 → 11,218 ms on mobile (CLS 0.001 at the swap).
  - Sentry and PostHog are in the root preloads.
  - The Cloudflare beacon uses 36 ms of main thread on mobile (deployed only).
- **shared: home-S6.** Not applicable to the load: there are 0 browser API calls, and the search uses
  `auth: 'none'`. For the record, Clerk FAPI runs 20.2–21.4 s on mobile, i.e. ready ≈3.3 s after the
  hydration shell at 18.1 s; on desktop it runs 1.37–1.88 s, ≈0.3–0.8 s after hydration at 1.1 s.
  `clerk.browser.js` evaluation takes 89–113 ms on mobile.
- **shared: home-S8.** See pe-4. The page is not in the Nitro route cache, so the cookie-stripping and
  `Cache-Control` rewrite do not apply here.
- **shared: home-S9.** Not applicable (0 API calls, 0 preflights).
- **shared: home-S10.** No SSR API calls, cold or warm. The loader's dynamic import is the only server-side
  state.
- **shared: home-S11.** No Suspense data, so bots and browsers get the same streamed HTML.

## 8. Not checked / open questions

- **What makes the mobile hydration task 417 ms (deployed) / 511 ms (local)?** That includes 94–103 ms of
  `UpdateLayoutTree`; on desktop the task is ≈50–70 ms. A likely contributor is
  `useRenderedWidth`'s `useLayoutEffect` → `getBoundingClientRect()` + `setState` during the hydration commit
  (`src/features/statistics/components/uat-map/uat-map-viewport.ts:261-275`, used by the county band). It
  forces a full-page layout and a synchronous re-render before paint. Others are `useRevealOnView` and
  `HomeSectionNav`. The trace has no JS sampling, so this is unattributed. Compare home-3.
- Client-side navigation from the sidebar was not measured: `PublicEnterpriseHubPending`, the loader's
  `import()` and the lazy chunk.
- `?lang=en`, dark theme and a signed-in visitor were not measured.
- No real-device or priority-honouring throttle was used (the home-S4 caveat applies to FCP 7.4 s).
- If Cloudflare caching is enabled (pe-4): Cloudflare does not key HTML on `Vary: Cookie`, so the bypass has to
  be an explicit rule condition. This needs checking with infra.
- Beyond pe-2: the other `/geojson/*` assets (UAT 3.2 MB, region 65 KB) also lack `Cache-Control` and are
  `DYNAMIC` (checked with curl). The pages that load them were not measured here.
