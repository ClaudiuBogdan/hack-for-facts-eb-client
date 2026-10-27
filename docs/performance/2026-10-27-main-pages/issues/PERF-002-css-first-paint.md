# PERF-002: First paint waits ≈7 s on mobile for a 72 KB stylesheet that shares the link with 1.2 MB of preloads

## Summary

The stylesheet is the only render-blocking resource on every page. On the mobile profile it takes 6.5–6.9 s to
download, because it starts at the same moment as 136 `modulepreload`s, the 350 KB font preload and the image
preloads that React hoists above it. First paint (and LCP on most pages) is therefore 7.2–7.7 s on deployed and
8.5–9.2 s on local, while the HTML itself has arrived by 0.7–1.2 s. Alone after the HTML, the stylesheet would
need about 0.4 s plus one round trip.

## Where

- **Domains:** all 16 audited pages.
- **CSS:** `index-*.css`, 70–72 KB zstd / 533 KB raw, one file for the whole app (Tailwind v4 scanning
  `./src/**/*`, `tailwind.config.js:6`).
- **What competes with it:**
  - the root preloads ([PERF-003](PERF-003-root-preloads.md));
  - the Inter font preload, `src/routes/__root.tsx:146-156`;
  - React 19 hoisting `<link rel=preload as=image>` above the stylesheet for every non-lazy `<img>`
    ([PERF-008](PERF-008-images-font.md)).

## Evidence

- **Mobile cold, deployed**, all 16 pages (`evidence/lead/phases-deployed-mobile.md`): CSS done 7.1–7.5 s, FCP
  7.2–7.7 s. The two slowest are `/legislation` and `/parlament`, which add header-image preloads
  ([PERF-016](PERF-016-header-art-preloads.md)).
  - `/`: CSS 686 → 7,404 ms, FCP = LCP 7,672 ms (`evidence/home/deployed/home-mobile/run2-cold.json`).
  - In that window ≈1.2 MB moved, and the CSS got about 6 % of it.
- **Local target:** FCP 8.5–9.2 s (`/parlament` 9.2 s, `/legislation` 9.1 s). Same bytes. The likely cause is
  the front proxy's HTTP/2 against Cloudflare's HTTP/3; it was not isolated.
- **Desktop:** FCP 0.38–0.80 s deployed (`/ins` 0.80 s, `/public-enterprises` 0.68 s), 0.23–0.82 s local
  (`/ins` 0.82 s).
- **Repeat views:** FCP 0.13–1.02 s overall (desktop 0.13–0.85 s, mobile 0.26–1.02 s); the CSS comes from the
  cache.
- **Lab bound** (lead what-if): the same local build, with every head `modulepreload` except the entry removed
  (`evidence/lead/whatif/RESULTS.md`, 3 cold loads each):

  | `/`, local mobile | CSS end | FCP = LCP | hydration end |
  |---|---:|---:|---:|
  | as built | 8,657 | 8,892 | 19,702 |
  | head modulepreloads removed | **2,954** | **3,200** | 19,629 |

  All times in ms. First paint moves **5.7 s earlier and hydration does not move**: the browser fetches the same
  chunks through the import graph, and the link is busy either way. The opposite variant, more preloads, moves FCP
  2.4–3.9 s later ([PERF-005](PERF-005-lazy-route-code.md)). The reviewer confirms both.
- **What is left after that:** with the JS preloads gone, the CSS still takes 2.3 s (0.63 → 2.95 s). It shares
  the link with the logo PNG (197 KiB, until 5.9–6.6 s), the 342 KiB font (until 7.1–7.3 s) and `funky-logo`
  (until 2.4 s). About 1.5 s more needs the image and font fixes ([PERF-008](PERF-008-images-font.md)).
- **Caveat:** DevTools throttling shares the emulated bandwidth between requests in flight and does not apply
  HTTP/2 or HTTP/3 priorities. A real phone behind Cloudflare may give the CSS a larger share, so 7 s is an upper
  bound for the same bytes. The bytes themselves are real: 2.8–3.3 MB arrives before hydration
  ([PERF-003](PERF-003-root-preloads.md), [PERF-004](PERF-004-catalogs.md), [PERF-008](PERF-008-images-font.md)).
- **The CSS itself:** 6,763 rules, 760 `@supports` colour-mix fallbacks, 143 KB of arbitrary-value rules and
  76 KB of dark-mode rules (home report §home-S4). Its size costs ≈0.4 s on the mobile profile; the contention
  is the main cost.

## Root cause

- Too many high-priority requests start together with the only render-blocking one.
- The modulepreloads and the Inter font preload are fetched at High priority alongside the stylesheet
  (VeryHigh).
- In the head, only the hoisted image preloads come before the stylesheet: on `/`, `logo-*.png` (197 KiB) and
  `funky-logo-*.png` (45 KiB), both Low priority.
- The font preload is link 141 of 142, after all 136 modulepreloads; its request starts at 720 ms.

## Proposed fix

1. Cut the preload volume: [PERF-003](PERF-003-root-preloads.md), [PERF-004](PERF-004-catalogs.md), and the logo and font items of
   [PERF-008](PERF-008-images-font.md).
2. **Stop emitting the 135 non-entry root `modulepreload`s in the head**, or place them after the stylesheet
   with `fetchpriority="low"`. In the lab this alone gave FCP −5.7 s at equal hydration. Keep the entry, and
   later the current route's own chunks.
3. Make sure no image preload lands above the stylesheet: use `loading="lazy"` or `fetchPriority="low"` on
   images below the fold, and a tiny logo.
4. Measure again on a priority-honouring setup (WebPageTest Moto G / real device) before and after, to size the
   real-world gain.

## Expected impact

- **Mobile FCP/LCP:** −5.7 s measured on `/` in the lab (8.9 → 3.2 s), with no change to hydration. The same
  is expected on every page whose LCP is static text, which is most hubs. On a real network that applies
  priorities the gain is smaller, because the CSS already gets more than its equal share.
- **Desktop:** ≈0.1–0.2 s (estimate).

## How to verify

1. Check that the SSR head lists the stylesheet before any preload, and that it has fewer preloads.
2. On mobile cold, the CSS end and FCP (`tools/shared-metrics.py`) should drop to ≈3 s with the preloads gone
   (measured), and towards ≈1.5 s once the logo and font no longer compete.
3. Do one WebPageTest or real-device run on `/` before and after, because of the throttling caveat.

## Owner

client

## Severity

**P1**: more than 1 s of LCP on mobile, on every domain.

Not in the prior docs; new.
