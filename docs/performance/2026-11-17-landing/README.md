# Landing page load: 2026-11-17

The owner's Lighthouse run on the landing scored **25** on mobile. That run measured the Vite dev server
(`:3000`, unbundled `/src/...` modules) in a Chrome profile with extensions, so it says little about
production. This note measures production builds instead, fixes what could be fixed without touching
shared infrastructure, and lists what is left for the owner to supervise.

## Method

- **Target.** Local production builds (`tools/build-local.sh` from the 2026-10-27 audit), served the way the
  pod runs them, behind the audit's h2 + zstd front proxy (`tools/measure-local.sh`, port 3013).
- **Lighthouse 12.8.2**, performance only, headless Chromium 1234. Mobile is the default profile (simulated
  Slow 4G, 4x CPU), five runs; desktop is `--preset=desktop`, three runs. Medians below.
- **Deployed reference.** `dev-chronos` (30b555c2, no map yet): mobile 51–53, desktop 75–92.
- **Fonts.** A glyph specimen (Romanian, figures with `tnum`, symbols, italic, six weights, Cyrillic, Greek,
  Vietnamese) screenshotted on both builds and compared pixel by pixel, plus the font files each page fetched.
- **Main thread.** CDP CPU profiles of a cold load at 4x CPU, read against the build's generated code.

## Results (mobile, median of 5)

| Build | Score | FCP | LCP | TBT | Speed Index |
|---|---|---|---|---|---|
| Before the map (dd3c183c) | 63 | 2.71 s | 4.43 s | 711 ms | 2.92 s |
| With the map (0a4634e1) | 59 | 2.71 s | 4.44 s | 878 ms | 2.88 s |
| + prefetch deferred | 60 | 2.73 s | 4.46 s | 748 ms | 3.19 s |
| + Inter subset | 69 | 2.72 s | 3.32 s | 778 ms | 3.03 s |
| **Final (this change)** | **68** | 2.72 s | **3.32 s** | 798 ms | 2.90 s |

Desktop stayed at 98–99 throughout. TBT varies by about ±100 ms between runs of one build.

## What changed

1. **The budget map's prefetch waits for the reader.** It used to start right after `load`, fetching about
   0.8 MB (the MapLibre chunk, the UAT shapes, the counties, the label points, the figures) and parsing it
   inside Lighthouse's blocking window: +170 ms TBT, −4 points. It now starts when the section is within
   about three screens (2,400 px); the map is still built within one. On a phone the landing's first screen
   is about 4,800 px above that point. `budget-map-section.tsx`, `use-budget-map-data.ts`.
2. **Inter is subset.** Each style is split into two faces. The Latin core the app is written in (Latin-1,
   Latin Extended-A, Romanian Șș Țț, punctuation and the symbols the UI prints, 496 characters) is a subset:
   117 KB instead of 341 KB for the regular, 129 KB for the italic. It is bundled by Vite, so its URL is
   hashed and immutable, and the regular one is the only preload. Every other character Inter has comes from
   the full file, under a `unicode-range` listing exactly those characters, so a page fetches it only when it
   prints one. The first version claimed everything outside the core; the desktop language menu's flag emoji
   then pulled in the full 341 KB file for no glyph. Both variable axes, every OpenType feature and the
   hinting are kept: the specimens are pixel-identical. LCP 4.46 → 3.32 s: Lighthouse's mobile model counts
   every request started before the heading paints, and the font was the largest. `styles/fonts.css`,
   `routes/__root.tsx`, `scripts/subset-inter-font.py`, `assets/fonts/`. This closes Parked 14 of the
   2026-10-27 audit (PERF-008 step 3).
3. **One `Intl.NumberFormat` per language and precision** for the landing's figures. The count-ups formatted
   every figure on every animation frame with a new formatter. `lib/national-facts.ts`.

## Tried and reverted

**Layout reads during hydration.** Two mount-time reads force a layout of the whole page inside a long task
on phones (CPU profile, 4x): the mobile dock's first scroll read (`mobile-bottom-dock.tsx`, 81–133 ms) and the
margin field's `getClientRects` (`pixel-canvas.tsx`, 101–127 ms; the field is `display:none` below 1,800 px).
Moving both to the next frame removed them from the hydration task, but Lighthouse's TBT did not move beyond
noise (the layout then runs in the next frame, which the browser does anyway). The dock's version also changed
behaviour: a scroll before that first frame has no earlier position to compare against, so either a
downward or an upward first scroll is judged differently from today (the existing test and Codex's review
caught one each). Both changes were reverted. Worth revisiting only together with the hydration work below.

## For the owner to supervise

These are the remaining costs, largest first. Each changes a module shared by every page, so none was done
here.

1. **Every page evaluates every route at start-up.** The main chunk (236 KB) carries 181 eager route files
   (273 KB of source) and, through their `validateSearch` schemas, keys and API helpers, code from nearly
   every feature. Its module evaluation is about 100 ms unthrottled (≈400 ms on the mobile profile), with
   about 50 ms of it building Zod schemas at module scope. This is the largest single long task. The way
   out is the audit's PERF-003 step 3 (build schemas lazily) and PERF-005 (lazy route code), i.e. how routes
   are declared: routing, SSR and search-param contracts.
2. **Done (2026-11-17): Clerk loads on demand**, see [clerk-on-demand.md](clerk-on-demand.md). Start-up JS 1,638 →
   1,496 KB; anonymous visitors make no Clerk request; streamed server HTML is kept. The original note:
   **Clerk loads on every page** (PERF-012, the audit's Parked 1): about 300 KB of `clerk-js` from the
   `clerk.accounts.dev` development instance, with its own long tasks after hydration. Loading it only on
   the auth routes, or after first interaction, changes how signed-in state reaches the header and the
   reads that wait for a session (PERF-015). Infra question from the audit still open: should dev-chronos
   use a production Clerk instance?
3. **The 70 KB stylesheet blocks first paint** (Lighthouse estimates 450 ms on mobile). Critical CSS or a
   split stylesheet is the audit's PERF-002 step 4 (Parked 9): build pipeline.
4. **The 241 KB message catalog** is fetched on every page before hydration (PERF-004's per-route catalogs).
   i18n infrastructure.
5. **Hydration itself** (≈80 ms of React work unthrottled on the landing, plus the layout reads above). The
   landing hydrates every band at once; deferring the bands below the fold is a landing-page design call.

## Reproduce

```sh
bash docs/performance/2026-10-27-main-pages/tools/build-local.sh . <build-dir>
TLS_DIR=<tls> HOOK=<lighthouse hook> bash docs/performance/2026-10-27-main-pages/tools/measure-local.sh \
  <build-dir> <out-dir> <pages-file with "home|/|0"> mobile 1
```

The Lighthouse hook ran `npx lighthouse@12.8.2 https://127.0.0.1:3013/ --only-categories=performance`
five times on mobile and three with `--preset=desktop`, with Chrome trusting the local certificate
(`--ignore-certificate-errors-spki-list`).
