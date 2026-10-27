# Justice: `/justice`

The hub reads no data at all. Its figures are a snapshot compiled into the route's JS
(`src/features/justice/lib/hub-snapshot.ts`), so there are **0 SSR API calls and 0 browser API calls** in all 24 loads. Its
time goes entirely to the shared shell (home-S1…S4). After that come two costs of its own: a procurement search
component it never uses, which is on the hydration path, and a county map that downloads and projects 400 KB of
GeoJSON after hydration.

Evidence: `evidence/justice/{deployed,local}/justice-{desktop,mobile}/`, harness run with `--people` (no screenshots,
HTML or LCP text). The hub itself names courts, not people.

## 1. Entry point

- Linked from the **landing page** only: the „Lege și justiție" group, `src/features/landing/lib/landing-groups.ts:132`.
  The deployed landing HTML carries one `href="/justice"`. It is **not in the sidebar**: there is no justice entry
  in `src/components/sidebar/`.
- `/justitie` answers **301 → `/justice`** (`src/routes/justitie/index.tsx:5-7`). Every deeper `/justitie/*` path does
  the same, dropping the query (`src/routes/justitie/$.tsx:10-13`). No duplicate page; an old link costs one extra
  round trip, ≈0.6 s on Slow 4G.
- Route: `src/routes/justice/index.tsx` is eager (search parser, cache headers, head) and
  `src/routes/justice/index.lazy.tsx` holds the component →
  `src/features/justice/components/hub/justice-hub-page.tsx`.

## 2. Numbers

Medians of 3 runs. TTFB is the harness value (navigation `responseStart`). On mobile, the request-level TTFB under
the 562 ms latency emulation is in brackets.

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydr. shell / end | req | transfer KB | JS KB transfer / decoded | API | HTML KB transfer / decoded |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 187 | 596 | 596 | 0 | 251 | 1,032 / 1,107 | 242 | 3,198 | 2,241 / 6,537 | 0 | 25.9 / 161.9 |
| deployed | desktop | warm | 101 | 300 | 300 | 0 | 0 | 512 / 618 | 241 | 30 | 0 / 6,537 | 0 | 26.0 / 161.9 |
| deployed | mobile | cold | 246 (603) | 7,368 | 7,368 | 0.001 | 1,696 | 18,142 / 18,466 | 242 | 3,199 | 2,241 / 6,537 | 0 | 26.2 / 161.9 |
| deployed | mobile | warm | 127 (573) | 964 | 964 | 0 | 797 | 1,987 / 2,380 | 241 | 30 | 0 / 6,537 | 0 | 26.1 / 161.9 |
| local | desktop | cold | 50 | 400 | 400 | 0 | 28 | 776 / 844 | 240 | 3,070 | 2,116 / 6,506 | 0 | 25.2 / 161.4 |
| local | desktop | warm | 40 | 244 | 244 | 0 | 4 | 425 / 524 | 239 | 29 | 0 / 6,506 | 0 | 25.1 / 161.4 |
| local | mobile | cold | 40 (569) | 8,616 | 8,616 | 0.001 | 1,759 | 18,117 / 18,425 | 240 | 3,070 | 2,116 / 6,506 | 0 | 25.2 / 161.4 |
| local | mobile | warm | 32 (570) | 1,012 | 1,012 | 0 | 813 | 1,967 / 2,345 | 239 | 29 | 0 / 6,506 | 0 | 25.1 / 161.4 |

- **LCP element** (every run, both targets): the hero lede `p.mt-5.max-w-[46ch].text-lg…`, the paragraph under the
  `h1` (`justice-hub-hero.tsx:49`). It is server-rendered text, so **LCP = FCP**, and both wait for the CSS (home-S4).
  Local mobile FCP varies from 7.1 to 8.7 s across runs, the CSS contention again.
- About 231 JS chunks; 1,497–1,631 DOM nodes; no console errors.
- **Desktop TBT 251 (deployed) vs 28 (local)** is a timing artifact, not a cost difference. The evaluation task
  (280–298 ms on both) lands after FCP on deployed and before FCP locally, so only deployed counts it.
- **Warm views re-download the HTML**: `max-age=0` and no validator → 26 KB and one round trip every time (home-S8).
  Mobile warm TBT ≈800 ms is the re-evaluation of 6.5 MB of cached JS (home-S1).

## 3. Waterfall (deployed, mobile, cold, run 2: `evidence/justice/deployed/justice-mobile/run2-cold.json`)

1. **0 → 737 ms: document.** TTFB 603 ms (`cfOrigin` 159 ms), 26.8 KB zstd / 166 KB.
2. **637 → 7,110 ms: CSS**, sharing the pipe with 137 modulepreloads, the 342 KB font and the 202 KB logo →
   **FCP = LCP 7,368 ms** (hero lede) (home-S4/S5).
3. **637 → 10,773 ms: entry `index-*.js`** (265 KB) with the root preloads (home-S1).
   **10,804 → 15,034 ms: all six Lingui catalogs** (≈552 kB / 539 KiB), found only once the entry is parsed
   (home-S2).
   **15,062 ms: module-evaluation task** of 1,191 ms (home-S1).
4. **16,340 → 17,942 ms: the route's code**, 27 files / 128 KB, requested only after evaluation (home-S3). The last
   file to finish is `landing-search-*.js` (45 KB, justice-1). Then the lazy chunk evaluates (56 ms) and the
   hydration task runs (319 ms): **hydration shell 18,142 ms / end 18,466 ms**.
5. **18,370 → 20,183 ms: county GeoJSON** (116 KB zstd / 400 KB), then a **247 ms projection task** → map commit at
   ≈20,450 ms (justice-2). The court page's code is warmed in parallel (`_code.lazy`, 18,498 → 19,269 ms).
6. **18,042 → 24,188 ms: Clerk** (`clerk.browser.js`, FAPI 20,575–21,788 ms, 4 UI chunks), 316 KB. Last React commit
   at 24,233 ms (Clerk UI). Nothing on the page waits for it (home-S6).

Desktop, deployed cold (median): entry ends 352 ms, catalogs 447–670 ms, route batch 920 → 983 ms, hydration
1,032 / 1,107 ms, GeoJSON 1,092 → 1,184 ms, map task 66 ms.

## 4. API calls

| operation | SSR / browser | start | duration | size | chained after |
|---|---|---|---|---|---|
| none | SSR | n/a | n/a | n/a | n/a |
| none | browser | n/a | n/a | n/a | n/a |

- **SSR:** `ssrApiCalls` is `[]` in all 12 local loads. The proxy log has no server call for `/justice`, either in the
  16:50 warm-up (between the procurement and elections renders) or during the batch. **Cold and warm server renders
  are the same**: local document TTFB 37–59 ms in every run, deployed `cfOrigin` 40–161 ms. No server cache
  matters here (home-S10), and the deployed pod behaves the same: `nitro.config.ts` has no route-cache rule for
  `/justice`.
- **Browser:** 0 API calls and 0 preflights (home-S9 does not apply).
- **home-S6 (Clerk wait):** there are **no browser API reads on this page, so none waits for Clerk**. Clerk is ready at
  ≈21.8 s on mobile and ≈1.74 s on desktop; it delays nothing on `/justice`. The justice API files do call
  `graphqlQuery` without `auth: 'none'` (`judicial-court-api.ts:68,85,107`, `judicial-case-api.ts:49,57`,
  `judicial-analysis-api.ts:23`, `company-litigation-api.ts:68,77`), so the court, case and analytics pages could
  wait for Clerk on client-side reads. Not measured here.
- Requests that are not API calls: `/geojson/judete-2026-03-09.json` (same origin, 116 KB, justice-2), Clerk FAPI ×3
  (home-S6), and Cloudflare `cdn-cgi/rum` (deployed only).

## 5. Candidate issues

### justice-1: A procurement search the page never shows sits on the hydration path (`home-chrome` barrel)

- **Numbers.** In every load, 10 files that `/justice` does not use: `landing-search` 45 KB, `entity-tags` (a 39 KB
  JSON) 9 KB, `entity-search-api.live` 5 KB, `home-chrome` and 6 icons. **67.6 KB transfer / 172.6 KB decoded
  (deployed mobile run 2) = 53 % of the route's 128 KB batch.**
  - Mobile: the rest of the batch is done by 17,490 ms but hydration waits for `landing-search` until 17,942 ms.
    **≈450 ms later hydration** (deployed, median of 3: 445–453 ms; local 421–430 ms).
  - Desktop: 0 ms (other files finish later).
  - Evidence: `evidence/justice/*/justice-mobile/run*-cold.json` (`requests`); build closure computed from
    `perf-build-9db3bce0/.output/public/assets/index.lazy-DA6nqblY.js`.
- **Cause.** The hub imports layout helpers from the procurement barrel `src/features/procurement/components/home/home-chrome.tsx`:
  - `justice-hub-page.tsx:7` imports `HomeSectionNav`;
  - `justice-hub-bands.tsx:8` imports `HomeBand` and `SHOW_MORE_CLASS`;
  - `justice-hub-hero.tsx:9` imports `SHOW_MORE_CLASS`.

  `HomeBand` and `HomeSectionNav` are only re-exported there from `./home-section-nav` (`home-chrome.tsx:14`; that
  module already ships in the entry chunk), and `SHOW_MORE_CLASS` is a string constant (`home-chrome.tsx:59`). But
  the same module statically imports `LandingSearch` (`home-chrome.tsx:7`) for `ProcurementHomeSearchField`
  (`:122-133`), so its chunk `import`s `landing-search-*.js`, which pulls `entity-search-api.live` and
  `src/assets/entity-tags.json`. The justice hub has its own court search (`justice-court-search.tsx`). The court,
  case and analytics pages import the same barrel (`justice-court-page.tsx`, `justice-case-page.tsx`,
  `analysis-levels.tsx`), so they pay too.
- **Fix.** Import `HomeBand` and `HomeSectionNav` from `home-section-nav`. Move `SHOW_MORE_CLASS`,
  `RULED_NOTE_CLASS`, `Bone`, `TextPending` and `ShowMorePending` into a leaf module with no imports beyond `cn`.
  Or move `ProcurementHomeSearchField` into its own file. Then check that `index.lazy-*.js` no longer imports
  `landing-search-*.js`.
- **Gain.** −67 KB transfer / −173 KB decoded on a first visit to any justice page. Hydration ≈0.45 s earlier on
  mobile (cold); ≈0 on desktop. A visitor arriving from the landing page already has `landing-search` cached
  (home-2), so the gain is for direct entries such as search results and shared links.
- Owner **client** · **P2** · shared? partly: all 4 justice pages; `national-budget` analytics imports `Bone` from the
  same barrel. NGOs and public enterprises use the search themselves. New.

### justice-2: The county map downloads 400 KB of GeoJSON after hydration and projects it on the main thread

- **Numbers.**
  - `judete-2026-03-09.json`: **116 KB zstd / 400 KB**, requested after hydration. Mobile 18,370 → 20,183 ms;
    desktop 1,092 → 1,184 ms.
  - Then **one long task of 253 ms on mobile** (median; 246–270 deployed, 245–268 local; 317 ms in the traced load)
    and **66 ms on desktop**; 172 ms on mobile warm (GeoJSON cached, projection redone).
  - Profile of the traced task (`evidence/justice/{deployed,local}/justice-mobile/trace-cold.trace.json`): **≈200 ms
    self time in `county-map-*.js`**, mostly the label search (`segmentDistanceSq` / `signedDistance` inside
    `poleOfInaccessibility`, 146 ms in one function), plus 17–25 ms of forced layout in `uat-map-viewport`.
  - That is ≈200 ms of TBT on mobile. Until then (≈2.3 s after hydration on mobile) the map is a grey placeholder,
    because the map is never in the SSR HTML. CLS stays 0.001: the placeholder's `aspect-[640/454]` matches the
    real map (height 453.6).
  - The file is served from `public/` with **no `Cache-Control`** (`etag`/`last-modified` only, `cf-cache-status: DYNAMIC`).
- **Cause.**
  - `src/features/statistics/components/hub/hub-county-band.tsx:100` reads it with `useGeoJsonData('County')`,
    which is browser-only (`src/hooks/useGeoJson.ts:64`).
  - `src/features/statistics/lib/county-map.ts:192-221` (`projectCounties`) projects all 9,939 points and runs a
    polylabel search per county at runtime. It is cached per GeoJSON object (`:293-302`), i.e. once per page load.
  - The input is static: one boundary file, a fixed 640-unit width.
- **Fix.** Precompute the projection at build time: 42 path strings, label points and `room`, plus the height, as
  a generated module or a hashed JSON asset. Measured on the file: 117 KB raw / 40 KB gzip unsimplified; **60 KB /
  20 KB** simplified at 0.6 viewBox units (5,109 points). Render the SVG on the server, or at least without the
  projection step. Give `public/geojson/*` an explicit long `Cache-Control` (the names are already dated).
- **Gain.** −75 to −95 KB transfer per first visit. −250 ms long task / ≈−200 ms TBT on mobile and −66 ms on
  desktop. The map is painted with the page instead of ≈2.3 s after hydration (mobile).
- Owner **client** (+ infra for the header) · **P2** · shared? **yes**: every hub drawing `HubCountyBand` or `CountyMap`
  (INS, companies, NGOs, procurement context bands, public-enterprise hub) and the PNRR map preview read the same
  file. New.

### justice-3: The route's code is found only after the shell evaluates (shared: home-S3)

- **Numbers (as the lead asked).** Lazy chunk start minus entry end, mobile cold: **5,567 ms deployed** (runs:
  5,460–5,672) and **5,792 ms local** (5,538–5,811); desktop 533 ms deployed / 595 ms local. Most of that gap is
  home-S2 (catalogs, 10.8 → 15.0 s) and home-S1 (the 1.19 s evaluation). The part that is only home-S3 is the
  route batch itself: 27 files / 128 KB, **16,340 → 17,942 ms (1.6 s)** before the 18,142 ms hydration. Desktop
  batch: 64 ms.
- **Cause / fix.** As home-S3: `index.lazy.tsx` has no `?tsr-split` id, so the manifest has no `/justice/` entry. The
  HTML preloads only the 136 root chunks and the `/justice` layout chunk `route-*.js` (137 links). Moving the component into
  `src/routes/justice/index.tsx` (auto split) or adding its chunk to the route `head` would let the 128 KB
  (≈61 KB after justice-1) load in the first wave.
- **Gain.** Up to ≈1.6 s earlier hydration on mobile in this emulation (the bytes still share the first wave),
  ≈60 ms on desktop.
- Owner client · P1 (as home-S3) · shared? **yes: home-S3**.

### justice-4: Every number and date builds a new `Intl` formatter

- **Numbers.** In the 509 ms hydration task of the local mobile trace, **82 ms of self time is in
  `judicial-format-*.js`** (`millionsText` 44, `countText` 14, `dayText` 12, `monthText` 12). Part of this is ICU's
  first use of `ro-RO`, which some function has to pay once. On Zeus, Node shows that a fresh `Intl.NumberFormat`
  costs ≈19 µs per call against ≈0.5 µs cached, and a fresh `DateTimeFormat` ≈54 µs per call. At 4× CPU,
  600 calls ≈ 45 ms.
- **Cause.** `src/features/justice/lib/judicial-format.ts:29,45,52,57-58,65,73,80,91,97,103`: `new Intl.*Format(...)`
  is created inside each function. The same code runs during SSR.
- **Fix.** Memoise the formatters per locale tag and options, in a module-level `Map`.
- **Gain (estimate).** ≈20–45 ms off the mobile hydration task; a few ms of SSR per request.
- Owner client · **P3** · shared? no (justice pages). New.

### justice-5: The county band forces layout inside the hydration task

- **Numbers.** In the same 509 ms hydration task, **118 ms of self time is in two layout reads**:
  - `useRenderedWidth`: `getBoundingClientRect()` in a layout effect (`uat-map-viewport.ts:261`, 71 ms);
  - `useTooltipAnchor().frameSize()`: `clientWidth/clientHeight` (47 ms), called by a `useLayoutEffect` with no
    dependency array that runs after every commit (`hub-county-band.tsx:147-151`).

  The task also contains 107 ms of `UpdateLayoutTree`. In the deployed traced load the hydration task is 526 ms
  (353 ms of it `FunctionCall`).
- **Fix.** Take the width from `ResizeObserver`'s first callback, which fires after layout. Skip `tooltip.place` when
  nothing is active.
- **Gain (estimate).** Up to ≈100 ms off the longest post-FCP task on mobile, splitting it in two. The layout itself
  may only move, not vanish.
- Owner client · **P3** · shared? yes (every `HubCountyBand`). New.

### justice-6: Small page-specific extras (P3)

- `county-population.ts:1` imports the whole companies hub snapshot (`hub-snapshot-*.js`, 4.8 KB transfer / 17 KB)
  to read 42 population numbers. Use a 42-entry table or a shared population module.
- `HubFiguresBand` (`statistics/components/hub/hub-figures.tsx:9`) statically pulls the sparkline chart parts
  (`hub-figures` + `period-chart-parts` + `change`, ≈7 KB transfer), which the justice figures do not draw.
- The route sends `s-maxage=3600, stale-while-revalidate=604800, Vary: Cookie` (`src/routes/justice/index.tsx:18-24`),
  but Cloudflare answers `DYNAMIC`. The page reads nothing, so it is the easiest page to cache at the edge (home-S8).
  The gain is small: `cfOrigin` 40–161 ms.

## Shared (numbers from this page)

| cause | `/justice` numbers |
|---|---|
| home-S1 (root preloads) | 137 modulepreloads (136 root + `/justice` layout chunk). 231 JS chunks, 2,241 KB transfer / 6,537 KB decoded cold. Evaluation task 1,191 ms mobile, 280–290 ms desktop; mobile warm 559 ms |
| home-S2 (catalogs) | six catalogs, ≈552 kB / 539 KiB, of which the `messages` pair is 478 KB transfer; requested 10,804 → 15,034 ms mobile (447 → 670 ms desktop) |
| home-S3 (lazy route code) | justice-3: 5,567 ms (entry end → lazy start), route batch 1.6 s mobile |
| home-S4 (CSS contention) | CSS 70 KB / 533 KB, 637 → 7,110 ms mobile → FCP/LCP 7,368 ms; desktop FCP 596 ms |
| home-S5 (logo, font) | `logo-*.png` 202 KB + `/logo.png` 202 KB, Inter 342 KB (ends 11,243 ms mobile) |
| home-S6 (Clerk) | 316 KB transfer / 1.06 MB, 18,042 → 24,188 ms mobile (1,012 → 1,957 ms desktop); no API read waits on this page |
| home-S7 (Sentry, PostHog) | 112 + 77 KB transfer |
| home-S8 (HTML caching) | `/justice` is not Nitro-cached; Cloudflare `DYNAMIC`; `max-age=0` without a validator → warm views re-download 26 KB (one round trip, 573 ms on mobile) |
| home-S9 (preflights) | 0 (no API calls) |
| home-S10 (server caches) | none needed: no SSR reads |
| home-S11 (crawler path) | no async data, so a bot render equals a browser render (curl TTFB local 42–58 ms) |
| Cloudflare beacon | 10 KB, 42 ms main thread on mobile (deployed only) |

## 6. Not checked / open questions

- The court (`/justice/courts/$code`), case and analytics pages were not measured. They read the judicial API, use
  `graphqlQuery` with the default `auth: 'optional'` (home-S6) and import the same `home-chrome` barrel (justice-1).
- No extra timed runs were made (the batch was starving). justice-1's gain is read off the batch waterfall (when the
  rest of the batch finished), not measured with the fix applied.
- justice-4/5 come from one traced load per target; the split between ICU first-use and per-call cost is estimated
  from a Node benchmark.
- The 1.6 s mobile route batch is ≈1 RTT plus 128 KB at 184 KiB/s under DevTools throttling; a real device with
  HTTP/3 prioritisation may differ.
