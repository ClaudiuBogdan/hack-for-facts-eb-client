# Fixing the 2026-10-27 audit

Started 2026-10-28 on branch `perf-fixes`, from `origin/dev` `1e0d6f13`. The [audit](README.md) found 26
issues. The agents fix the client-side ones that need no decision, without supervision. The rest wait for the
owner, under [Parked](#parked-needs-the-owner).

## How each fix is done

- Verified anonymously on a local production build, measured as in the audit: median of 3 runs, mobile and
  desktop, before and after. Signed-in flows are not tested, so nothing here changes them.
- `yarn run check`, the tests the change touches, and a visual check on mobile and desktop.
- Reviewed by Codex (`gpt-6.1-sol`, reasoning `xhigh`) before the commit; its findings are fixed or answered.
- One commit per issue, local on this branch: no push, no PR, no merge into `dev`.
- A fix that needs a decision, regresses another page or shows no gain is parked below with its question.
- No feature flags change, and no dependencies are added.

## Measurement

- **Local target** as in the audit's [Reproduce](README.md#reproduce): Nitro behind the h2 + zstd front proxy and
  the CORS/logging API proxy to the dev-chronos API, on ports 3013–3016. One target at a time, under the audit's
  lock for the whole start → warm → measure → stop cycle: `tools/measure-local.sh`.
- **Builds** as the Dockerfile builds them, without the `.dockerignore` paths: `tools/build-local.sh`. At most
  three at once, none during a measurement cycle.
- **Runs:** 3 cold loads per page and profile (`perf-run.mjs --no-warm --no-trace`), medians; the server is
  warmed with one request per page first, as in the audit. `tools/fixes-table.mjs` prints before → after.
- **Baseline:** `perf-fixes` at `1e0d6f13`, all 16 pages, mobile and desktop, measured 2026-10-28. Every "before"
  below comes from it, not from the audit's `9db3bce0` numbers.
- **Stalls:** some cold mobile loads of `/national-budget` stall in the lab: the document and every asset stay
  unfinished until the 120 s timeout, with 18–32 KB of JS received. It happens on the baseline too (1 of 3 runs, then
  2 of 3 on a re-run), so it reads as a stall at the local h2 proxy, not the app. Medians skip those runs; that
  page's mobile "before" in stream D's numbers is the median of the 3 valid baseline runs (FCP 8.53 s, hydrated
  18.06 s), and D measured its "after" with 5 runs. No run stalled after the fixes (stream D 10 of 10, the final batch
  3 of 3).
- Raw output stays outside git, under `evidence/fixes/`.

## Streams

| stream | issues | notes |
|---|---|---|
| A. Shared bundle | [PERF-002](issues/PERF-002-css-first-paint.md), [003](issues/PERF-003-root-preloads.md), [004](issues/PERF-004-catalogs.md), [008](issues/PERF-008-images-font.md), [011](issues/PERF-011-sentry-posthog.md), [018](issues/PERF-018-route-dead-weight.md) item 9, [019](issues/PERF-019-map-assets.md) step 1; then [005](issues/PERF-005-lazy-route-code.md) | PERF-005 goes last, on the merged branch, because it moves every main page's route code and must ship with the byte cuts. PERF-011 changes the imports only; consent still gates `init`. |
| B. Local budgets | [PERF-006](issues/PERF-006-entity-analytics-skeleton.md), [009](issues/PERF-009-map-first-frame.md) steps 1–5, [018](issues/PERF-018-route-dead-weight.md) items 1–5, [019](issues/PERF-019-map-assets.md) steps 2–4 | Also the page titles of `/entity-analytics`, `/map` and `/charts`, and the `/map` „geometry not available" wording. |
| C. PNRR | [PERF-007](issues/PERF-007-pnrr-dataset.md) steps 1–3, and the origin headers of step 4 | |
| D. National budget | [PERF-013](issues/PERF-013-national-budget-head.md) | |
| E. Parliament, legislation | [PERF-014](issues/PERF-014-parliament-browser-only.md) steps 2–4, [016](issues/PERF-016-header-art-preloads.md), [025](issues/PERF-025-parliament-heatmaps.md), [018](issues/PERF-018-route-dead-weight.md) item 8 | |
| F. Hubs | [PERF-020](issues/PERF-020-county-map.md), [026](issues/PERF-026-hub-search.md) (option 1: a plain input, combobox on demand), [018](issues/PERF-018-route-dead-weight.md) items 6–7 | |
| G. Server memos, loaders | [PERF-010](issues/PERF-010-server-memo.md) steps 1, 3, 4; [021](issues/PERF-021-blocking-ssr-loaders.md) steps 1–2 | Today's memo windows stay; see Parked 8. |
| Elections | [PERF-001](issues/PERF-001-elections-broken.md) steps 1 and 3, [021](issues/PERF-021-blocking-ssr-loaders.md) step 3, the `electionCatalog` line in the elections design doc | Done by the elections session on its own branch. |

## Status

Statuses: fixed, partly fixed, parked, dropped (no gain). Numbers are the local target's medians, before → after, from
each stream's own build of the change (cumulative within a stream, so later rows include earlier ones). The whole
branch against the baseline is under [Result](#result).

| id | stream | status | commit | mobile | desktop | notes |
|---|---|---|---|---|---|---|
| PERF-001 | Elections | fixed, on `elections` | `c9cd6ca6`, `8b9b8a78` | | | Not in `perf-fixes`. Also covers step 3 (no retry of GraphQL validation errors, `src/lib/queryClient.ts`) and PERF-021 step 3. Questions: Parked 10 |
| PERF-002 | A | fixed (steps 1–3) | `e1ef814a` | FCP on 4 pages (this commit with PERF-003): `/` 8.90 → 3.23 s, `/companies` 8.68 → 2.93 s, `/national-budget` 7.86 → 3.09 s, `/entity-analytics` 8.50 → 2.82 s | FCP 0.26–0.38 → 0.16–0.26 s | Step 2: `AppHeadContent` leaves out the root route's chunk preloads (entry and child-route preloads stay), so the stylesheet comes first and every page has 1 modulepreload. Steps 1 and 3 come through PERF-003, 004 and 008. Step 4 is Parked 9 and 6. |
| PERF-003 | A | fixed (steps 1–2), step 3 partly | `d1893cf4`, `b20ecf3e` | Step 1: JS before hydration −142 to −158 KB on `/`, `/companies`, `/national-budget`, `/pnrr`. Step 2: JS −172 to −175 KB per page, hydrated −0.2 to −1.0 s on all 15 measured pages (`/` 14.65 → 14.10 s, `/public-enterprises` 13.79 → 12.83 s, `/parlament` 13.60 → 13.03 s) | flat | Step 1: the client vendor chunk groups are gone (MDX keeps per-locale chunks), so recharts, the English MDX and TanStack Table/Virtual leave the root graph. Step 2: data modules leave the route files the route tree imports: the PNRR SEO snapshot builders, the challenge and learning definitions, the company and NGO profile reads, the parliament search schemas (`schemas/parliament-search.ts`). Shared code before a page's own: 1,687 → 810 KB zstd (step 1 with the stream) → 644 KB (step 2). Step 2's numbers come from builds that both also carried PERF-005. Left: the INS, procurement, map-series and NGO-head clusters (25, 12, 10, 7 KB), each needing several routes changed together; step 3 follows from them. Step 4 is Parked 6. |
| PERF-004 | A | fixed (steps 1–3, step 4 browser half) | `6da12728` | catalogs per page 536 KB in 6 files → 237 KB in 1 (−299 KB) | same | The browser keeps only the lazy loaders; the eager catalogs moved to `lib/i18n-server-catalogs.ts`, imported only by `src/server.ts`. `admin` and `pnrr` load on their routes only. |
| PERF-005 | A | parked (no gain) | branch `perf/parked-005-route-preloads` | FCP 2.42–2.64 → 2.46–2.61 s; hydrated −0.6 to +0.5 s per page (+0.07 s on average); `/parlament` 14.04 → 13.60 s | ±0.06 s | Done and measured on 15 pages: each page's component moved into its route file so the manifest lists its chunks, preloaded by a server-rendered script after the stylesheet (head unchanged). The chunks are requested at about 2.5 s instead of 12 s on mobile, but hydration does not move: the bytes, not their order, set the time on the emulated link. Not merged; Parked 17. |
| PERF-006 | B | fixed | `00854e50` | `/entity-analytics` LCP 19.73 → 8.50 s (= FCP) | LCP 1.03 → 0.29 s | The ranking's 25 rows are in the server HTML; table preferences apply after mount. |
| PERF-007 | C | fixed | `e9ac46cf` | `/pnrr` full overview 41.36 → 8.76 s (at FCP); transfer ≈6.2 → 2.96 MB; hydrated 18.50 → 18.79 s; TBT 1.23 → 1.54 s | overview 2.92 → 0.31 s; hydrated 0.73 → 0.81 s | Steps 1–3 and step 4's origin headers. The server builds the overview with the worker's own code (bounded memo, background warm-up), the raw dataset loads only for a tab, the filter sheet, a filter, a project or the export, and `/api/pnrr/raw/*?v=…` is immutable with an ETag. Rendered text byte-identical to the baseline on 5 URLs × 2 profiles. Cost: HTML 20 → 39 KB zstd, hydration +0.1–0.3 s, TBT +0.2–0.3 s on mobile. Questions: Parked 12. Not done: audit items pnrr-3, pnrr-4. |
| PERF-008 | A | fixed (steps 1–2) | `79c5f6f4` | images per first visit 399 → 10 KB (`/` 614 → 181 KB); FCP `/` 3.23 → 2.59 s after PERF-002/003 | | A 3 KB 96 px WebP mark replaces the 201 KB PNG; 48 px `favicon.png` and `favicon.ico`; the landing's partner logo is lazy. Step 3 (Inter subset) is Parked 14. |
| PERF-009 | B | fixed (steps 1–5) | `4d0884de`, step 2 in `f0156bdb` | `/map` drawn 36.15 → 30.40 s | drawn 4.06 → 3.40 s | „Drawn" is the end of the last long task. Self-hosted Noto Sans glyphs (OFL), MapLibre workers prewarmed, no Leaflet import in `InteractiveMap`, the loading state instead of „not available". Step 7 is Parked 2. |
| PERF-010 | G | fixed (steps 1, 4) | `9399bd17` | `/procurement` TTFB 1.54 → 0.05 s; hydrated 19.27 → 18.64 s | TTFB 0.04 → 0.05 s | Step 1: past its window a memo serves the kept read at once while one background read refreshes it; a failed refresh keeps the old read. Server render of `/procurement` 10 min 20 s after the first: 3,378 → 82 ms. Step 4: CPV divisions and geography options memoised for 6 h, party names expire after 6 h (at most 5,000). Step 2 is Parked 8; step 3 and the questions are Parked 13. |
| PERF-011 | A | fixed (steps 1–3) | `e788bf90`, `81427181`, `606f0299` | Sentry + PostHog before hydration 183 → 0 KB without consent | same | `lib/sentry.ts` is a 3 KB loader; the SDK setup moved unchanged to a lazy `lib/sentry-sdk.ts`; calls made while it loads run after init. PostHog loads on the first consented event. Consent still gates `init`; the error page still reports without consent (checked on the build with intercepted ingest hosts). The lazy Sentry chunk is 143 KB zstd (was 109), for consenting visitors and error pages only. The national-budget analytics page uses the app's error boundary instead of `@sentry/react`'s (`606f0299`). |
| PERF-012 | — | parked | | | | Parked 1 |
| PERF-013 | D | fixed | `b7deb7bd` | `/national-budget` LCP 9.04 → 8.61 s (= FCP); footer shift 0.29 → none; TBT 1.68 → 1.59 s | LCP 0.95 → 0.35 s (= FCP); CLS 0.436 → 0; transfer 3243 → 2967 KB | Steps 1–3: the head and pinned bar render without data, the boundary's fallback holds every band's place, the year check runs only for an `an` other than the default. FCP +44 ms desktop, +76 ms mobile (within the baseline's spread, but the first paint now lays out more); kept for the LCP and CLS gain. The first figures still wait for the API's series reads (about 0.8 s) and the law band for PERF-023 (Parked 4). Mobile after: 5 of 5 runs valid. |
| PERF-014 | E | fixed (steps 2–4) | `d69824c2` | `/parlament`: browser API reads 15 → 0, preflights 12 → 0, CLS 0.083 → 0.001, content in the first paint (was 24.3 s), hydrated 20.14 → 17.94 s (with 016, 025, 018) | reads 15 → 0, content in the first paint (was 1.76 s); LCP 0.29 → 0.32 s | A route loader reads the hub tab's queries on the server under the hooks' keys (anonymous; the resolvers read no user), each with a 5 s deadline and a 10-minute memo; a failed read loads in the browser and that render goes out `no-store`. Module caches are 10-minute memos; the vote-summary cache is browser-only and capped. Sync time in Bucharest time. Cost: HTML 18 → 34 KB. Step 1 is Parked 2; questions: Parked 16. |
| PERF-015 | — | parked | | | | Parked 2 |
| PERF-016 | E | fixed | `0b6d380f` | `/legislation` art 314 → 0 KB, FCP 9.18 → 8.53 s, hydrated 19.56 → 18.21 s; `/parlament` art 316 → 0 KB, FCP 9.14 → 8.60 s | `/legislation` art 827 → 175 KB, FCP 0.52 → 0.44 s; `/parlament` art 921 → 120 KB | The header art is a `<picture>` shown from Tailwind's `xl` up (phones get an inline blank pixel and no preload), WebP q85; the legislation effect's image loads on pointer intent. `/legislation` mobile TBT 1.30 → 1.40–1.47 s in E's runs with no added script, 0.87 s in the final batch. |
| PERF-017 | — | parked | | | | Parked 3 |
| PERF-018 | A, B, E, F | fixed (items 1, 2, 4–9) | `7860cada` (B), `6057d62a` (A), `35a89e02` (F), `4f56550d` (E) | B: hydrated `/map` 21.69 → 19.93 s, `/entity-analytics` 19.73 → 18.77 s, `/charts` 18.15 → 17.61 s | `/map` 0.93 → 0.82 s, `/entity-analytics` 1.03 → 0.84 s, `/charts` 0.77 → 0.69 s | B: items 1, 2, 4, 5 fixed; route code before hydration `/map` −163 KB, `/entity-analytics` −127 KB, `/charts` −54 KB (zstd). `/charts` mobile TBT 1.30 → 1.41 s in B's run, 0.92 s in the final batch. A: item 9 fixed, `src/components/data-trust/*` marked side-effect free, so `/legislation` no longer loads framer-motion (46 KB). F: items 6–7 fixed, the hub search leaves the `home-chrome` barrel and the tag vocabulary loads on demand: `/justice` JS 2116 → 2056 KB, hydrated 18.39 → 17.75 s mobile; the other hubs −7 to −8 KB. E: item 8, the `/parlament` list tabs are lazy and the mocks load only in mock mode: the route's own code 115 → 59 KB gzip, JS 2109 → 2048 KB. Item 3 is Parked 11; step 10 is Parked 6. |
| PERF-019 | A, B | fixed (steps 1–3) | `d1893cf4` (A), `f0156bdb` (B) | `/primarie` transfer 4040 → 3678 KB | 4318 → 3956 KB | A: step 1, the `maps` vendor group is gone, so `/primarie`'s map libraries drop 296 → 50 KB. B: steps 2–3 fixed: rounded files (UAT 713 → 400 KB, county 115 → 61 KB zstd), `/geojson/**` immutable for a year. Step 4 is Parked 11; CDN rule is Parked 5. |
| PERF-020 | F, B | fixed (steps 1–4) | `76264339` (F), `f0156bdb` (B) | hubs: the county GeoJSON no longer loads, page bytes −110 to −120 KB, longest task after hydration 235–309 → 86–100 ms, TBT −0.1 to −0.2 s | bytes −70 KB, the 70–120 ms map task gone | F: the county paths are projected once at build time (`scripts/generate-county-shapes.ts`, 26 KB brotli instead of 86 KB, with a staleness test) and fetched as the map nears the screen. B: step 4, `/geojson/judete-2026-10-28.json` cached for a year; the shapes are regenerated from it after the merge. Server rendering the map is Parked 15; CDN rule is Parked 5. |
| titles | B | fixed | `f9c0ca74` | | | Server-rendered title, description, canonical and `og:*` on `/entity-analytics`, `/map`, `/charts`. |
| PERF-021 | G, Elections | fixed (steps 1–2; 3 on `elections`) | `e6c565df` | TTFB `/ins` 0.43 → 0.04 s, `/legislation` 0.21 → 0.03 s | `/ins` TTFB 0.34 → 0.04, FCP 0.78 → 0.33, hydrated 1.47 → 0.90 s; `/legislation` FCP 0.52 → 0.26, hydrated 0.98 → 0.70 s | `/ins` hub read in a 10-minute server memo; `/legislation` asks only for `moIssues`, loads through `ensureQueryData` from a memo keyed by year (a failed read goes out `no-store` and the browser reads it); `legal-api` leaves the entry chunk. Step 3 done on `elections`; step 4 is Parked 4. |
| PERF-022 | — | parked | | | | Parked 4 |
| PERF-023 | — | parked | | | | Parked 4 |
| PERF-024 | — | parked | | | | Parked 4 |
| PERF-025 | E | fixed | `4e8490f3` | `/parlament` TBT 2.52 → 1.49 s; long tasks after hydration 1.43 → 0.21 s; longest 505 → 90 ms | TBT 0.41 → 0.26 s; no long task after hydration | Plain `<a>`/`<div>` squares with one delegated tooltip per grid (hover after 100 ms, focus, Escape), one shared date formatter, addresses built once. |
| PERF-026 | F | fixed (option 1) | `8affca06` | hydrated `/` 19.66 → 19.08, `/companies` 18.38 → 17.75, `/ngos` 18.34 → 17.61, `/procurement` 18.29 → 17.66, `/public-enterprises` 18.34 → 17.83, `/ins` 18.41 → 17.80 s (control `/justice` unchanged) | unchanged within noise | The server renders the search as a plain field with the same markup; the combobox loads on focus, pointer, mod+K or idle and takes over the typed text and focus. Loading it only on interaction is Parked 15. |

## Result

`perf-fixes` at `629771b8` (every stream merged, PERF-005 left out), all 16 pages, measured 2026-10-28 on the local
target as the baseline was: 3 cold loads per page and profile, medians, baseline → after.

**Mobile** (Slow 4G, 4× CPU)

| page | TTFB s | FCP s | LCP s | TBT s | CLS | hydrated s | JS KB | bytes KB | API calls |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 0.01 → 0.01 | 8.90 → 2.61 | 8.90 → 2.61 | 1.68 → 1.15 | 0.001 → 0.001 | 19.79 → 13.69 | 2095 → 1289 | 3172 → 1937 | 1 → 1 |
| `/national-budget` | 0.03 → 0.03 | 7.86 → 2.58 | 8.39 → 2.58 | 1.77 → 1.16 | 0.001 → 0.001 | 17.91 → 12.84 | 2036 → 1224 | 2965 → 1768 | 10 → 10 |
| `/entity-analytics` | 0.01 → 0.01 | 8.50 → 2.46 | 19.73 → 2.46 | 1.86 → 1.14 | 0.000 → 0.000 | 19.73 → 13.72 | 2247 → 1326 | 3086 → 1784 | 0 → 1 |
| `/map` ² | 0.01 → 0.01 | 8.53 → 2.50 | 8.53 → 2.50 | 3.84 → 2.83 | 0.000 → 0.000 | 21.69 → 16.46 | 2776 → 1882 | 4610 → 2954 | 1 → 1 |
| `/charts` | 0.02 → 0.03 | 8.52 → 2.46 | 8.52 → 2.46 | 1.30 → 0.92 | 0.000 → 0.000 | 18.15 → 12.43 | 2075 → 1208 | 2909 → 1656 | 0 → 0 |
| `/companies` | 0.05 → 0.04 | 8.68 → 2.56 | 8.68 → 2.56 | 1.90 → 1.12 | 0.000 → 0.000 | 18.40 → 12.80 | 2083 → 1274 | 3040 → 1732 | 0 → 0 |
| `/ngos` | 0.05 → 0.05 | 8.63 → 2.62 | 8.63 → 2.62 | 2.01 → 1.03 | 0.000 → 0.000 | 18.69 → 12.74 | 2085 → 1275 | 3040 → 1731 | 0 → 0 |
| `/procurement` ¹ | 1.54 → 0.05 | 8.67 → 2.60 | 8.67 → 2.60 | 2.02 → 1.15 | 0.001 → 0.001 | 19.27 → 12.97 | 2158 → 1349 | 3126 → 1817 | 1 → 1 |
| `/justice` | 0.05 → 0.06 | 8.71 → 2.58 | 8.71 → 2.58 | 1.67 → 1.08 | 0.001 → 0.001 | 18.39 → 12.86 | 2116 → 1248 | 3070 → 1703 | 0 → 0 |
| `/public-enterprises` | 0.06 → 0.04 | 8.65 → 2.58 | 8.65 → 2.58 | 1.72 → 1.06 | 0.001 → 0.001 | 18.40 → 12.78 | 2091 → 1281 | 3045 → 1737 | 0 → 0 |
| `/alegeri` | 0.07 → 0.08 | 8.54 → 2.49 | 8.54 → 2.49 | 1.30 → 0.90 | 0.009 → 0.009 | 17.41 → 12.53 | 2007 → 1194 | 2842 → 1643 | 2 → 2 |
| `/parlament` | 0.02 → 0.04 | 9.14 → 2.54 | 9.14 → 2.54 | 2.52 → 0.99 | 0.083 → 0.001 | 20.14 → 13.02 | 2107 → 1239 | 3564 → 1993 | 15 → 0 |
| `/ins` | 0.43 → 0.04 | 7.09 → 2.56 | 7.09 → 2.56 | 1.62 → 1.03 | 0.040 → 0.040 | 18.19 → 12.69 | 2141 → 1451 | 3101 → 1912 | 0 → 0 |
| `/legislation` | 0.21 → 0.02 | 9.18 → 2.50 | 9.18 → 2.50 | 1.30 → 0.87 | 0.027 → 0.027 | 19.56 → 12.40 | 2051 → 1195 | 3202 → 1647 | 2 → 2 |
| `/pnrr` | 0.05 → 0.04 | 8.51 → 2.51 | 8.51 → 2.51 | 1.23 → 1.02 | 0.001 → 0.001 | 18.50 → 14.18 | 2109 → 1423 | 2945 → 1893 | 0 → 0 |
| `/primarie` | 0.03 → 0.03 | 8.54 → 2.49 | 8.54 → 2.49 | 1.92 → 1.41 | 0.001 → 0.001 | 17.95 → 12.99 | 2377 → 1310 | 4040 → 2214 | 2 → 2 |

**Desktop**

| page | TTFB s | FCP s | LCP s | TBT s | CLS | hydrated s | JS KB | bytes KB | API calls |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 0.01 → 0.01 | 0.32 → 0.22 | 0.32 → 0.22 | 0.27 → 0.13 | 0.000 → 0.000 | 0.91 → 0.71 | 2095 → 1289 | 3263 → 2027 | 1 → 1 |
| `/national-budget` | 0.03 → 0.03 | 0.30 → 0.28 | 0.95 → 0.28 | 0.23 → 0.13 | 0.436 → 0.000 | 1.44 → 1.28 | 2036 → 1224 | 3243 → 1769 | 11 → 11 |
| `/entity-analytics` | 0.01 → 0.01 | 0.26 → 0.19 | 1.03 → 0.19 | 0.26 → 0.12 | 0.000 → 0.000 | 1.03 → 0.68 | 2247 → 1326 | 3363 → 1784 | 0 → 1 |
| `/map` ² | 0.01 → 0.01 | 0.27 → 0.16 | 0.27 → 0.16 | 1.17 → 0.75 | 0.003 → 0.003 | 0.93 → 0.90 | 2776 → 1882 | 4887 → 3231 | 1 → 1 |
| `/charts` | 0.02 → 0.02 | 0.28 → 0.21 | 0.28 → 0.21 | 0.27 → 0.13 | 0.000 → 0.000 | 0.77 → 0.60 | 2075 → 1208 | 3186 → 1934 | 0 → 0 |
| `/companies` | 0.04 → 0.03 | 0.38 → 0.28 | 0.38 → 0.28 | 0.03 → 0.13 | 0.000 → 0.000 | 1.05 → 0.77 | 2083 → 1315 | 3039 → 1773 | 0 → 0 |
| `/ngos` | 0.05 → 0.05 | 0.44 → 0.38 | 0.44 → 0.38 | 0.35 → 0.13 | 0.000 → 0.000 | 1.09 → 0.89 | 2085 → 1316 | 3039 → 1773 | 0 → 0 |
| `/procurement` | 0.04 → 0.04 | 0.39 → 0.26 | 0.39 → 0.26 | 0.05 → 0.14 | 0.000 → 0.000 | 1.02 → 0.78 | 2158 → 1390 | 3125 → 1859 | 1 → 1 |
| `/justice` | 0.05 → 0.05 | 0.42 → 0.28 | 0.42 → 0.28 | 0.31 → 0.12 | 0.000 → 0.000 | 0.88 → 0.66 | 2116 → 1289 | 3070 → 1745 | 0 → 0 |
| `/public-enterprises` | 0.06 → 0.03 | 0.40 → 0.26 | 0.40 → 0.26 | 0.30 → 0.12 | 0.000 → 0.000 | 1.04 → 0.71 | 2091 → 1281 | 3045 → 1737 | 0 → 0 |
| `/alegeri` | 0.06 → 0.07 | 0.39 → 0.26 | 0.39 → 0.26 | 0.27 → 0.12 | 0.010 → 0.010 | 0.89 → 0.63 | 2007 → 1194 | 3120 → 1920 | 2 → 2 |
| `/parlament` | 0.02 → 0.04 | 0.29 → 0.19 | 0.29 → 0.19 | 0.41 → 0.12 | 0.004 → 0.000 | 0.84 → 0.64 | 2107 → 1239 | 4425 → 2369 | 15 → 0 |
| `/ins` | 0.34 → 0.04 | 0.78 → 0.32 | 0.78 → 0.32 | 0.32 → 0.13 | 0.000 → 0.000 | 1.47 → 0.82 | 2141 → 1492 | 3101 → 1954 | 0 → 0 |
| `/legislation` | 0.18 → 0.01 | 0.52 → 0.24 | 0.52 → 0.24 | 0.25 → 0.11 | 0.000 → 0.000 | 0.98 → 0.62 | 2051 → 1195 | 3717 → 1822 | 2 → 2 |
| `/pnrr` | 0.03 → 0.04 | 0.28 → 0.24 | 0.28 → 0.24 | 0.23 → 0.14 | 0.000 → 0.000 | 0.73 → 0.76 | 2109 → 1423 | 2945 → 1892 | 0 → 0 |
| `/primarie` | 0.02 → 0.02 | 0.29 → 0.23 | 0.29 → 0.23 | 0.34 → 0.27 | 0.000 → 0.000 | 0.83 → 0.73 | 2377 → 1310 | 4318 → 2492 | 2 → 2 |

1. `/procurement` mobile is the re-check of the same build (`evidence/fixes/final-recheck`). In the full cycle,
   runs 1 and 2 found the server memo empty and re-read the API on the server (TTFB 5.05 and 1.49 s, FCP 3.52 s):
   the dev API took about 5 s for those reads, and a read past the 5 s deadline is not kept. That is the API's
   latency (Parked 4), not the client.
2. `/map` still hits the run cap on both profiles, as in the baseline; its numbers are the capped runs'. `/pnrr`
   no longer hits it.

- **First paint:** mobile FCP 7.1–9.2 s → 2.5–2.6 s on every page, mostly from PERF-002/003/004/008 (the head no
  longer preloads the root's chunks, the catalogs and telemetry left the entry, the logo preload went). Desktop FCP
  improves on every page.
- **Hydration:** mobile 17.4–21.7 s → 12.4–16.5 s; JS per page −0.65 to −1.07 MB; bytes per page −1.0 to −2.1 MB.
- **Content that waited for data** now comes with the HTML: `/entity-analytics` LCP 19.73 → 2.46 s mobile,
  `/national-budget` desktop LCP 0.95 → 0.28 s and CLS 0.436 → 0, `/parlament` CLS 0.083 → 0.001 and 15 → 0 browser
  reads, `/pnrr`'s overview at first paint (PERF-007).
- **Moved the wrong way:**
  - desktop TBT on `/companies` 0.03 → 0.13 s and `/procurement` 0.05 → 0.14 s: the start-up evaluation task got
    shorter (284–342 → about 210 ms) but now starts after the earlier first paint, so TBT counts it;
  - `/pnrr` desktop hydration 0.73 → 0.76 s, within its baseline spread (PERF-007's larger HTML).
- **One more browser read on `/entity-analytics`:** its HTML now carries the ranking's rows (PERF-006), and Nitro's
  route cache serves that HTML for 5 minutes (24 hours stale). When the cached copy is older than the query's 60 s
  `staleTime`, the browser re-reads the ranking right after hydration (the 0 → 1 API call above; nothing on screen
  moves). It refreshes data the page would otherwise show as old. Part of Parked 3.
- Not measured here: real devices, signed-in visitors, client-side navigation timings.

## Branches

- **`perf-fixes`**: every stream merged (A–G), the county shapes regenerated after B's and F's merge, the catalogs'
  references refreshed, and this file. Whole-branch Codex review (`codex review --base origin/dev`, `gpt-6.1-sol`,
  `xhigh`): no actionable findings. Leak scan over `origin/dev..perf-fixes`: only false positives (import paths
  with a `home` folder, a test DSN, variable names). Not pushed.
- **`perf/parked-005-route-preloads`**: PERF-005, measured and left out (Parked 17).
- **`elections`** (PERF-001): `c9cd6ca6`, `8b9b8a78`, unchanged at the end of this work. A trial merge with
  `perf-fixes` conflicts only in `src/locales/{en,ro}/messages.po` (reference lines and B's new titles): take both
  sides, then `yarn i18n:extract`. Its `/alegeri` route files still need PERF-005 if it is merged (Parked 10).
- **`national-budget`**, **`justice-portal`**, **`companies-hub-redesign`**: no new conflicts. Their trial merges with
  `perf-fixes` conflict in exactly the files they already conflict in against `origin/dev`.

## Parked: needs the owner

1. **Clerk ([PERF-012](issues/PERF-012-clerk-eager.md)).** Load Clerk only on the auth routes, when a signed-in
   cookie exists, or on the first action that needs it? That changes the sign-in flow, and checking it needs a
   signed-in test account. Infra: should dev-chronos use a production Clerk instance?
2. **Anonymous reads ([PERF-015](issues/PERF-015-reads-wait-for-clerk.md), [PERF-014](issues/PERF-014-parliament-browser-only.md) step 1, [PERF-009](issues/PERF-009-map-first-frame.md) step 7).** Which reads need a
   token? May public reads default to `auth: 'none'`, and may `getAuthToken()` return `null` at once when no
   Clerk session cookie exists? A wrong answer silently drops data for signed-in users.
3. **HTML caching ([PERF-017](issues/PERF-017-html-cache.md)).** Cookie-free HTML for the cached routes, explicit
   `Cache-Control`, HTML caching at the CDN, and `/`'s one-hour browser `max-age`. A mistake serves the wrong
   language or theme, or an old build after a deploy.
4. **Server ([PERF-022](issues/PERF-022-slow-resolvers.md), [PERF-023](issues/PERF-023-national-budget-law-chain.md), [PERF-024](issues/PERF-024-preflight-max-age.md), [PERF-021](issues/PERF-021-blocking-ssr-loaders.md) step 4, [PERF-017](issues/PERF-017-html-cache.md) step 5).** Server repo work:
   resolver latency, a chapter-level aggregate, the CORS `maxAge`, the ranking query. Also the campaign
   `subscription-stats` route that answers 404. PERF-023's client part waits for the aggregate.
5. **CDN rules ([PERF-007](issues/PERF-007-pnrr-dataset.md), [PERF-009](issues/PERF-009-map-first-frame.md), [PERF-019](issues/PERF-019-map-assets.md), [PERF-020](issues/PERF-020-county-map.md)).** Cloudflare cache rules for
   `/api/pnrr/raw/*`, `/geojson/*` and `/map-glyphs/*`. The agents set the origin headers; the rules are infra.
   Nitro serves the glyph `.pbf` files as `text/plain`: should the CDN compress them?
   The versioned `/api/pnrr/raw/*?v=…` files come brotli-compressed from the origin; check that the CDN passes that through.
6. **CI checks ([PERF-001](issues/PERF-001-elections-broken.md) step 4, [PERF-003](issues/PERF-003-root-preloads.md) step 4, [PERF-018](issues/PERF-018-route-dead-weight.md) step 10).** A check of the
   client's GraphQL documents against the server schema, and bundle budgets. Which schema can CI reach, and
   should a budget fail the build?
7. **Elections flag ([PERF-001](issues/PERF-001-elections-broken.md) step 2).** Switch `elections` off on
   dev-chronos until the port is deployed? The agents don't change flags.
8. **Memo windows ([PERF-010](issues/PERF-010-server-memo.md) step 2).** How stale may procurement, justice and
   public-enterprise data be: 10 minutes as today, or 1–6 hours? The stale-while-revalidate part goes ahead.
9. **Real devices and production (audit open questions 1, 2 and 5).** One WebPageTest or real-phone run before
   and after; production's Clerk and cache rules; how long old chunks stay fetchable after a deploy.
10. **Elections (from the PERF-001 port on branch `elections`).**
    - *Independent candidates:* the API serves an independent candidate's ballot name, and the pages show
      „Candidat independent" instead. Should the pages show the name?
    - *Prototypes:* the `alegere`, `analize` and `scrutin` prototypes under `src/development/` still read the
      retired API, so they compile but load no data. Port them or retire them?
    - *Contest page:* it now shows results (votes and shares, margin, mandates per phase, turnout) where it
      showed only metadata, in the catalog layout rather than the results-analytics prototype's. Review the
      design?
    - *Issue codes:* listed raw (for example `POSTAL_VOTED_ENVELOPES`), because the API does not describe them.
      Ask the server for public descriptions?
    - *Publication date:* „Cifre publicate pe platformă" shows when the API switched to that set of figures. Is
      that the date readers should see?
    - *Route code ([PERF-005](issues/PERF-005-lazy-route-code.md)):* `/alegeri`'s route files are rewritten on
      `elections`, so its component move waits until that branch is merged. Do it then, on `dev`?
    - *Old links:* old edition keys now answer 404, and the old `?an=` and `?tip=` filters are ignored. Add
      redirects?
11. **Local budgets (stream B).**
    - *`/primarie` map ([PERF-019](issues/PERF-019-map-assets.md) step 4):* on the 412×823 phone profile the map
      section starts about 746 px down, so it is already in view at hydration and loading it near the viewport saves
      nothing (tried and reverted). Move the map lower, load it on a „show map" action, or leave it?
    - *Classification labels per locale ([PERF-018](issues/PERF-018-route-dead-weight.md) item 3, about 17 KB zstd
      per page):* the server-rendered filter panels on `/entity-analytics` and `/map` show the prefix labels at once.
      Load the active locale's trees before hydration (root and Lingui loading), or show the code first and the label
      when it arrives (a visible change)?
    - *`/charts` empty state:* the server renders „No charts yet" until the browser reads the saved charts, so a
      returning reader sees it briefly, as before. Show a neutral placeholder instead, at the cost of the call to
      action for new visitors at first paint?
12. **PNRR (stream C, [PERF-007](issues/PERF-007-pnrr-dataset.md)).**
    - *Trade-off:* the overview shows about 33 s earlier on a phone and a cold visit moves about 3.2 MB less, for
      19 KB more HTML and 0.1–0.3 s more hydration and blocking time on mobile. Accept it?
    - *Overview cache:* `/api/pnrr/overview` reuses the raw files' old policy (`max-age=60, s-maxage=3600,
      stale-while-revalidate=600`). The file set is frozen; cache it longer?
    - *Opening a project:* from the server overview it now waits for the raw dataset (about 20 s on the phone
      profile), with the status shown. Serve project details from the server instead, or open the drawer at once with a
      loading state?
    - *Server CPU:* the unfiltered overview costs 450–650 ms per data refresh (in the background); each new filtered
      URL rendered on the server costs 10–450 ms, cached but not rate-limited, as the SEO snapshot is today. Move the
      processed data into a persistent worker thread (audit item pnrr-6)?
    - *Desktop:* preload the raw data when idle (about 3 MB per visit) so the tabs open at once?
13. **Server memos (stream G, [PERF-010](issues/PERF-010-server-memo.md)).**
    - *Maximum age:* a kept read has no maximum age, so after a quiet spell the first visitor sees the older data, and
      if refreshes keep failing it is served indefinitely (logged). Should a render wait for a fresh read past, say,
      24 hours? Goes with Parked 8.
    - *Reference windows:* the CPV divisions, geography options and party names now keep for 6 hours, as the
      analytics already keep the same lists. Keep 6 hours?
    - *Warming at start (step 3, not done):* the server loads its renderer on the first request, so a start-up hook
      cannot reach the memos; warming would mean rendering `/procurement`, `/ins` and `/legislation` in-process after
      each start, also in dev, CI and the integration tests. Is that acceptable? Today only one render per server start
      pays.
14. **Font (stream A, [PERF-008](issues/PERF-008-images-font.md) step 3).** No font subsetter is installed on the
    build host, so the Inter subset was not made. Add fontTools as a tool, or supply a subset made elsewhere? Until
    then, the 341 KB font preload is the main thing still competing with the stylesheet: keep it, or drop the preload
    and let the font swap in later?
15. **Hubs (stream F).**
    - *County map ([PERF-020](issues/PERF-020-county-map.md) step 3):* the hubs fetch the county shapes as the map
      nears the screen, which costs nothing at load on a phone. Should the hubs with static data render the map on the
      server instead? It would paint with the page, for about 26 KB more compressed HTML on every hub visit.
    - *Search ([PERF-026](issues/PERF-026-hub-search.md)):* the combobox still loads when the browser is idle on every
      hub visit (about 45 KB after hydration). Load it only on focus, pointer or mod+K, saving those bytes when nobody
      searches, at the cost of a short wait on first use on slow phones?
16. **Parliament (stream E, [PERF-014](issues/PERF-014-parliament-browser-only.md)).**
    - *Group counts:* the issue lists the all-mandate group counts as unused, but they feed the visible „N mandate în
      total" line on the hub. They were kept. Should that line go?
    - *Memo window:* the parliament reads are kept 10 minutes on the server, as the page's `s-maxage=600`. Acceptable,
      or part of Parked 8?
    - *HTML size:* desktop LCP +0.03 s from the 34 KB HTML, about 10 KB of it the heatmaps' data, which render after
      idle anyway. Read that data in the browser instead (about 4 reads, after Clerk)?
    - *Time zone:* the sync time now shows Bucharest time for readers abroad (it was the browser's), because the
      server needs one fixed zone. OK?
    - *Images:* the votes-panel PNGs (558 KB, the 1024 px file on phones) load after hydration now; WebP plus a 768 px
      variant would save another 300–450 KB. Not done.
17. **Route code preloads ([PERF-005](issues/PERF-005-lazy-route-code.md)).** Done on 15 pages and measured with every
    other fix in: first paint unchanged, page chunks requested about 9 s earlier on mobile, but hydration unchanged
    (+0.07 s on average) except `/parlament` (−0.44 s). After the byte cuts, hydration waits on the entry's imports and
    the language catalog, fetched one after the other. Kept unmerged on `perf/parked-005-route-preloads` (`fa150f0a`,
    `e58fd02a`, `5d5c464f`). Merge it after a real-device or priority-honouring network run (Parked 9) shows a gain,
    perhaps with `fetchpriority="low"` on the added links?
