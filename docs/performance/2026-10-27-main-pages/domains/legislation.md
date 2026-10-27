# Legislation: `/legislation`

Evidence: `evidence/legislation/{deployed,local}/legislation-{desktop,mobile}/` (batch 19:11–19:17).
Not a people page. Build attribution: source maps from the build's Sentry artifact copy (session-local, not kept) (bytes
attributed through the mappings; a proxy).

## 1. Entry point

- Sidebar "Legislație" → `/legislation` (`src/components/sidebar/nav-main.tsx:90`); the landing page links
  the same URL (`src/features/landing/components/landing-page.tsx:72`, `landing-groups.ts:126`).
- `/legislation/` → **307** to `/legislation`. There is no Romanian spelling: `/legislatie` → 404.
- Route: `src/routes/legislation/index.tsx` (loader + headers, eager) + `index.lazy.tsx` (component).
  The page is `src/features/legal/components/legislation-page.tsx`. Its frame is `legislation-shell.tsx`
  (hero, header image, chips, tabs).

## 2. Numbers (medians of 3)

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB xfer / decoded | API (+preflights) | HTML KB xfer / dec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 273 | 592 | 608 | 0.001 | 237 | 1,058 / 1,093 | 225 | 3,833 | 2,164 / 6,357 | 2 (+2) | 21 / 110 |
| deployed | desktop | warm | 215 | 384 | 384 | 0 | 0 | 582 / 604 | 222 | 28 | 0 / 6,357 | 2 (+0) | 21 / 110 |
| deployed | mobile | cold | 238 | 7,664 | 7,664 | 0.027 | 1,409 | 19,570 / 19,750 | 225 | 3,320 | 2,164 / 6,357 | 2 (+2) | 21 / 110 |
| deployed | mobile | warm | 219 | 860 | 860 | 0.027 | 725 | 1,880 / 1,973 | 224 | 27 | 0 / 6,357 | 2 (+2) | 21 / 110 |
| local | desktop | cold | 216 | 480 | 480 | 0 | 231 | 872 / 914 | 223 | 3,716 | 2,051 / 6,326 | 2 (+2) | 20 / 109 |
| local | desktop | warm | 215 | 376 | 376 | 0 | 0 | 589 / 610 | 220 | 25 | 0 / 6,326 | 2 (+0) | 20 / 109 |
| local | mobile | cold | 234 | 9,108 | 9,108 | 0.027 | 1,539 | 19,669 / 19,854 | 222 | 3,202 | 2,051 / 6,326 | 2 (+1) | 20 / 109 |
| local | mobile | warm | 209 | 852 | 852 | 0.027 | 691 | 1,855 / 1,969 | 221 | 25 | 0 / 6,326 | 2 (+1) | 20 / 109 |

- **LCP element.** On desktop it is the header image `img.pointer-events-none.absolute.inset-0.z-10`, i.e.
  `header-justice-1280-*.png` (453 KB, 387,872 px²), loadTime 507–719 ms. In 2 of 3 cold runs it lands after
  FCP (+16 ms, +64 ms). On mobile the header image is hidden (`hidden … xl:flex`), so LCP is the description
  `p.max-w-[40rem]…` (49,704 px²) = FCP.
- **Images.** Desktop cold images are 1,030 KB of 3,833 KB: header 453 + an invisible "future" header 395 +
  logo 202. Mobile cold images are 517 KB: two **invisible** header PNGs, 169 + 153, plus the logo.
- **TTFB.** The warm TTFB stays at ~215 ms: the HTML is `max-age=0` (home-S8), so every repeat view pays the
  SSR loader again. Deployed `cfOrigin` is 173–214 ms (median 198), against 24–101 ms on main pages without SSR
  API calls (see legislation-3).
- **CLS 0.027 on mobile** at 20.41 s, when the status counts land (legislation-4). There is no console error.

## 3. Waterfall (deployed, mobile, cold, run 1: `deployed/legislation-mobile/run1-cold.json`)

1. 0 → 585 ms: document TTFB; done at 693 ms (21.6 KB zstd, 110 KB). The head hoists `preload as=image` for the
   logo and both header images, above the stylesheet (`ssr.html`).
2. From 625 ms everything starts together: CSS 72 KB (→ 7,528), entry 265 KB (→ 12,464), 135 modulepreloads
   (home-S1), font 350 KB (→ 12,932), logo 202 KB (→ 11,558), header-768 169 KB at **High** (→ 10,890) and
   future-768 153 KB (7,562 → 12,201). Both header images are `display:none` at 412 px.
3. 7,528 ms: the CSS is done → **FCP = LCP 7,664 ms** (description paragraph).
4. 12,494 ms: the Lingui catalogs are requested after the entry (home-S2) → done 16,731. Module evaluation is
   one 1,181 ms task at 16,762.
5. 18,103 ms: the route chunks are requested, never preloaded (home-S3): 16 files, 76 KB zstd. All but one are
   done by 18,940; **motion** (47 KB) is done at 19,370 (legislation-2).
6. 19,570 / 19,750 ms: hydration shell / end. At 19,698 ms 2 API calls start (preflights 98 ms):
   status counts → 20,371 (header chips, CLS 0.027 at 20,414); domain counts → 20,793.
7. 19,464 ms: Clerk JS → FAPI 21.2–22.5 s → UI chunks → 24.9 s, which is also the last React commit (home-S6).

## 4. API calls

| operation | where | start (ms) | duration (ms) | size | chained after |
|---|---|---|---|---|---|
| `LegislationOverview` (`mostCited` + `moIssues`) | SSR loader | +4–7 after the document request | local 170–223, cold and warm, every render | 560 B gzip | nothing; it blocks TTFB |
| `LegislationStatusCounts` (`legalActCounts(groupBy: STATUS)`) | browser, `auth: 'none'` | at hydration: mobile 19,704 / desktop 1,091 | desktop 177–356, mobile 627–708 | 0.5–0.7 KB | hydration (useQuery) |
| `LegislationDomainCounts` (`legalActCounts(groupBy: DOMAIN)`) | browser, `auth: 'none'` | same tick | **926–1,191** on every profile and view | 0.6–0.9 KB | hydration (useQuery) |

- **Clerk (home-S6).** Neither browser read waits for Clerk. Both pass `auth: 'none'`
  (`legal-status-counts-api.live.ts:66-67`, `legal-domain-counts-api.live.ts:47-53`, `auth` at `:52`).
  - Deployed mobile: they start at 19,698 / 19,704 ms, against hydration shell 19,570 and end 19,750. Clerk's
    `environment`/`client` FAPI responses only end at 22,445–22,460 ms.
  - Desktop: they start at 1,090, against hydration shell 1,058 and Clerk `client` 1,743.
- **Preflights (home-S9).** There are 2 preflights per burst (the two concurrent POSTs each take one), 83–105 ms
  deployed. Mobile warm views pay them again.
- **Nothing is cached server-side.** Local SSR calls `LegislationOverview` on every render, cold and warm (unlike
  procurement, home-S10). The deployed `cfOrigin` (198 ms) says the pod does the same. The browser reads repeat
  on every document: the query cache is in memory only.
- **Probes from Zeus to the dev API** (3× each, an ad-hoc script, not kept):
  - full overview 157–294 ms
  - `moIssues` alone 49–64
  - `mostCited` alone 154–243
  - STATUS counts 162–218
  - DOMAIN counts 1,008–1,221

## 5. Candidate issues

### legislation-1: Two hidden header PNGs are preloaded on every profile, one only for a click effect

- **Numbers** (deployed mobile cold, medians of 3 per page, `evidence/*/deployed/*-mobile/run?-cold.json`):

  | | legislation | 10 pages that preload only the logo |
  |---|---|---|
  | image KB before the entry ends | 517 | 203 |
  | CSS end (s) | 7.51 | 7.11–7.24 |
  | FCP (s) | 7.66 | 7.24–7.44 |
  | entry end (s) | 12.46 | 10.75–10.81 |
  | catalogs end (s) | 16.73 | 15.00–15.09 |
  | hydration shell (s) | 19.57 | 17.4–18.3 |

  - The extra ≈314 KiB (322 kB) before the catalogs end take ≈1.7 s at Slow-4G's 184 KiB/s. That matches the +1.67 s on the
    catalogs.
  - Local agrees: CSS +0.54 s, entry +1.56 s, hydration +1.5 s.
  - Parliament, which uses the same pattern, shows the same shift (entry 12.15 s).
  - Desktop: 848 KB of header PNGs. The LCP image (453 KB) shares the link with the invisible future image
    (395 KB, 273 → 567 ms).
- **Cause.** `legislation-header-visual.tsx:149-180`: two `<img loading="eager">`, the first with
  `fetchPriority="high"`. Their container is `hidden … xl:flex` (`legislation-shell.tsx:72`).
  - React 19 hoists both image preloads (`<link rel=preload as=image imageSrcSet …>`) above the stylesheet;
    only the first has `fetchPriority="high"` (`ssr.html`; mechanism in home-S4/S5).
  - With `sizes="(min-width: 1280px) 70vw, 0px"` the browser still fetches the 768w candidate below `xl`.
  - The second image (`header-justice-future-registered-*`) only feeds the WebGL glitch, which mounts on
    pointer intent (`:120-137`).
  - Both are 8-bit palette PNGs with alpha.
- **Fix.**
  - Don't let mobile fetch the art: render it client-side only at `xl` (e.g. `matchMedia` after hydration), or
    use a `<picture>` with a `(min-width:1280px)` source and a 1×1 fallback. `display:none` alone doesn't stop
    an eager image.
  - Load the "future" image only in `warmUp()`, together with the glitch module (5 KB in
    `legislation-section-*.js`).
  - Convert to WebP/AVIF: WebP q75 (Pillow) gives 1280: 453 → 130 KB, future-1280 395 → 93 KB,
    768: 168 → 56 KB.
- **Gain.**
  - Mobile: −322 KB, hydration ≈ −1.5 s, FCP/LCP ≈ −0.3 s, and the counts land ≈1.5 s earlier.
  - Desktop: −395 KB and −320 KB on the LCP image; LCP ≈ FCP (−16…−64 ms here, more on slower links).
- **Owner** client. **Severity P2** by the letter (LCP +0.3 s). The +1.5 s hydration on mobile argues for P1.
  **shared?** yes, with parliament (`src/features/parliament/components/parliament-shell.tsx:62`). New.

### legislation-2: The `@/components/data-trust` barrel drags framer-motion into the route

- **Numbers.** The route set is 16 chunks, 76 KB zstd / 184 KB decoded (deployed). `motion-*.js` is 47.1 KB of it
  (62%) / 135.5 KB decoded (74%), plus `copy-button` 1.6 KB.
  - Mobile cold: every other route chunk is in by 18,940 ms (median of 3 runs: 18,897–19,020); motion
    arrives at 19,327–19,449, **+430 ms**, and hydration follows 200 ms later.
  - Desktop: no measurable tail.
  - The other main pages don't load motion through this barrel: entity-analytics and map load it for their own
    reasons; `/alegeri` doesn't load it.
- **Cause.**
  - `legislation-shell.tsx:5` imports `DataStatusBadge` from the barrel `src/components/data-trust/index.ts`.
  - The barrel also re-exports `SourceProvenanceDrawer` (→ `ui/copy-button.tsx:3` `framer-motion`) and
    `EvidenceLink` (→ tooltip).
  - The package has no `sideEffects: false`, so rolldown keeps them as bare imports in the shared chunk
    `legal-format-*.js`: `import"./sheet-…"; import"./tooltip-…"; import"./copy-button-…"`.
  - Sheet and dialog are already in the root graph, so motion is the net cost.
  - `act-detail-header.tsx:7` does the same on act pages.
- **Fix.** Import `DataStatusBadge` from `@/components/data-trust/data-status-badge` in the two legal files, or
  add `"sideEffects": ["*.css"]` to `package.json` app-wide (check it build-wide first). Optionally drop
  framer-motion from `CopyButton`.
- **Gain.** Mobile hydration ≈ −0.43 s; −48.7 KB zstd / −137.6 KB decoded on every visit to `/legislation/*`.
  Desktop ≈ 0.
- Owner client · **P2** · shared? no for the main pages (elections imports the barrel on its sub-pages) · new.

### legislation-3: The SSR loader waits for a citation ranking the front door never renders

- **Numbers.**
  - Local: `LegislationOverview` takes 170–223 ms of a 198–266 ms TTFB, on every render, cold and warm.
  - Deployed: `cfOrigin` is 173–214 ms, against ≈45 ms median on main pages without SSR API calls. A
    curl to the loader-less `/legislation/guide` gives TTFB 105–141 ms, against 274–342 for `/legislation`
    (curl gets the bot path, home-S11).
  - Probes: `mostCited` alone takes 154–243 ms; `moIssues` alone 49–64 ms.
- **Cause.** `src/routes/legislation/index.tsx:12-15` → `fetchLegislationOverview()` →
  `legal-api.live.ts:27-58` also asks for `legalActs(sort: IN_DEGREE, dir: DESC, first: 7)`. Only
  `/legislation/analytics` renders it (`legislation-analytics-page.tsx:57`). The front door renders only
  `latestGazetteIssues` (`legislation-page.tsx:64`). There is no cache, although the corpus is frozen (gazette
  frontier 2026-07-09, `legal-coverage.ts:76`).
- **Fix.**
  - Split the query: the front door asks only for `moIssues`, the analytics tab asks for `mostCited`.
  - Cache the result at module level with a TTL (the procurement pattern, home-S10), or let Cloudflare cache the
    HTML that already says `s-maxage=600` (home-S8).
  - Move the loader to `queryClient.ensureQueryData`. It currently bypasses the query cache, so tab switches
    refetch.
- **Gain.** TTFB −100…−150 ms on every HTML request (cold and warm, both profiles); ≈ −180 ms with a cache.
- Owner client (the server sort costs ~100–180 ms: `server` if kept) · **P2** · shared? no · new.

### legislation-4: Counts arrive only after hydration; the DOMAIN aggregate takes ~1 s every time

- **Numbers.**
  - `LegislationDomainCounts` takes 926–1,191 ms in the browser on every load, cold and warm, every profile,
    and 1,008–1,221 ms from curl.
  - `LegislationStatusCounts` takes 177–356 ms on desktop.
  - Both start only at hydration: mobile cold 19.7 s → domain grid numbers at 20.8 s; desktop 1.1 → 2.2 s.
  - When the status chips arrive, mobile shifts by **CLS 0.027** (sources `main`, the tab-nav border). The shell
    reserves one 44 px chip row (`legislation-shell.tsx:121-124`), but at 412 px the three chips wrap: the column
    is 332 px after `pr-12` (`:76`).
- **Cause.**
  - `use-legislation.ts:30-56`: plain `useQuery` on purpose, so a failure degrades only the grid, and
    `staleTime` is 5 min in memory.
  - Server: `legalActCounts(groupBy: DOMAIN)` unnests `summaries.domains` over the whole corpus on every call
    (`hack-for-facts-eb-server/src/modules/legal/shell/repo/acts-repo.ts:476-491`), with no cache.
- **Fix.**
  - Server: cache or materialise the grouped counts (the corpus is frozen).
  - Client: serve both aggregates from a module-level TTL cache on the server and SSR them. Keep the
    degrade-on-failure path with a short deadline: `allSettled`-style, so the loader never fails on them.
  - Reserve two chip rows below `sm`.
- **Gain.** The grid and chips appear in the first paint, not +1.1 s after hydration (mobile +1.2 s, desktop
  +1.1 s); CLS 0.027 → 0 on mobile; −2 POSTs and 2 preflights per view.
- Owner server + client · **P2** · shared? no · new.

### legislation-5: Legal code (and its mock fixtures) rides in every page's root preloads

- **Numbers.** These root-preloaded chunks are fetched on every page (home-S1): `legal-*.js` (`schemas/legal` +
  `schemas/elections`) 4.6 KB zstd / 11.3 KB, `legal-act-detail-*.js` 3.9 / 9.0 KB, `legal-coverage` 1.0 / 0.6 KB.
  - `legal-act-detail-*.js` is a mock fixture, `mocks/fixtures/legal-act-detail.ts`.
  - The entry also carries 11.5 KB of legal modules: `legal-act-api.live.ts` 5.1 KB, the overview fixture
    2.6 KB, `legal-api.live.ts` 1.9 KB, route files.
  - In total ≈33 KB decoded / ≈10 KB zstd on every page. This is why `legal-*` chunks show up in the landing
    page's preloads.
- **Cause.**
  - The eager route files `src/routes/legislation/**/*.tsx` (`validateSearch` schemas, loaders) are part of the
    root graph.
  - The mock/live dispatchers import the fixtures statically: `legal-act-api.ts:3`, and
    `legal-api.ts:4` → `legal-api.mock.ts:5`.
- **Fix.** Load the mock branch with `await import()` inside `if (isLegalMockEnabled())`. The rest follows the
  home-S1 fix. Companies has the same pattern: `private-company-api-*.js` holds 17.3 KB of fixtures.
- Owner client · **P3** · shared? yes (home-S1; the mock-first dispatchers in companies too) · new.

### Also seen (P3)

- **The loader has no deadline and no degrade path.** `index.tsx:12-15` passes no signal, and `graphqlQuery`
  has no default timeout. A hung API holds the SSR response, and a failed one throws in the loader, so the route
  error page replaces the component's own error state (`legislation-page.tsx:56-59`).

### Shared causes seen here (cite the home report)

| cause | this page's numbers |
|---|---|
| home-S1 | 136 root modulepreloads; JS 2,164 KB zstd / 6,357 KB decoded, 209 chunks (route-only 76 KB of it) |
| home-S2 | catalogs requested 12.49 s → 16.73 s on mobile |
| home-S3 | lazy chunk start − entry end on mobile cold = **5,639 ms** deployed (5,599–5,712), 6,008 local. Of that, catalogs (to 16.73 s) and the 1.18 s evaluation task come first; the route step itself is 18,103 → 19,370 = 1.27 s (0.84 s without motion). Desktop 419–580 ms |
| home-S4 | CSS done at 7.53 s on mobile; here the CSS shares the link with the header images (legislation-1) |
| home-S5/S7 | logo 202 KB preloaded (+ `/logo.png` 202 KB again after hydration), Inter 350 KB, Sentry/PostHog in the root set, CF beacon 27 ms main thread |
| home-S6 | Clerk JS at 19.46 s, FAPI to 22.5 s, UI chunks to 24.9 s; **no legislation read waits for it** |
| home-S8 | `public, max-age=0, s-maxage=600, stale-while-revalidate=3600` (`index.tsx:16-20`), `cf-cache-status: DYNAMIC`; not in the Nitro route cache |
| home-S9 | 2 preflights per burst, 83–105 ms |
| home-S11 | curl TTFB comparisons above went through the bot path |

## 6. Not checked / open questions

- Real Slow-4G preflight cost (home-S9 says DevTools under-reports it).
- Whether React's image preload hoisting can be turned off per `<img>`. With `fetchPriority="low"` it still
  preloads, so the fix in legislation-1 avoids rendering the `<img>` on the server.
- WebP/AVIF quality on the engraved art needs a visual check before choosing q75.
- Client navigation between tabs (loader refetch, `defaultPreload: 'intent'`) was not measured.
- Other `/legislation/*` tabs share the shell, so legislation-1 and legislation-2 apply there too. Not measured.
