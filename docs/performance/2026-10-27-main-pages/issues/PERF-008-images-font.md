# PERF-008: ≈400 KB of logo PNGs and a 350 KB unsubsetted font on every first visit, competing with the CSS

## Summary

The logo mark shown at 16–20 px is a 415×395 RGBA PNG of 201 KB. Every page carries it twice:

- the hashed asset, preloaded by React in the head;
- the favicon `/logo.png`, the same bytes under another URL.

The Inter variable font, 350 KB, is preloaded on every page. It is not subset, and it is served from `public/`
with a 4-hour cache. Some pages hoist more image preloads above the stylesheet:

- the landing's 46 KB `funky-logo` from the bottom band;
- legislation's header PNGs.

The hashed logo, the font and the other head-preloaded images compete with the CSS during first paint
([PERF-002](PERF-002-css-first-paint.md)); the favicon loads later.

## Where

- **Domains:** all 16 audited pages (logo, favicon, font). The extra image preloads are on `/` (home-4) and
  `/legislation` and `/parlament` ([PERF-016](PERF-016-header-art-preloads.md)).
- **Logo:**
  - `src/assets/logo/logo.png`, used in `src/components/sidebar/logo.tsx:4`, the footer, the mobile dock and the
    landing;
  - favicon `src/routes/__root.tsx:225` → `public/logo.png`.
- **Font:**
  - preload `src/routes/__root.tsx:146-156`;
  - `@font-face` `src/styles/fonts.css:2-10` (`font-display: swap`).
- **Landing:** `src/features/campaigns/buget/components/CampaignAccessShareCard.tsx:4` (`funky-logo`, 56 px, at
  the very bottom of `/`).

## Evidence

- **Deployed mobile cold `/`**: `logo-*.png` 202 KB and `funky-logo-*.png` 46 KB are requested at 685 ms, before
  the CSS. The font, 350 KB, ends at 12.5 s; `/logo.png`, 202 KB, starts at 17.6 s and ends at 20.0 s
  (`evidence/home/deployed/home-mobile/run2-cold.json`).
  - Images: 5 requests, 429 KB. Font: 350 KB. Favicon: 202 KB (`byType`).
- **Other pages:**
  - companies: logo 203 KB, favicon 197 KB, font 342 KB;
  - local budgets: logo PNG and `/logo.png` 197 KB each, in the route wave, plus Inter 342 KB;
  - every other domain report gives the same three files: logo 197–203 KB, favicon 197–202 KB, Inter 342–350 KB.
- **Headers:** `/logo.png` and `/fonts/*.woff2` are sent with `max-age=14400` (not hashed, not immutable). The
  hashed `/assets/logo-*.png` is immutable.
- **CLS:** the font swaps after FCP on mobile. That is a CLS of 0.001 on most pages, and **0.04 at 11.3 s on
  `/ins`** (ins report).

## Root cause

- An unoptimised source PNG is used for a 16–20 px mark.
- The favicon points at the same large file.
- React 19 hoists a `preload as=image` for every `<img>` that is not `loading="lazy"`, including images below
  the fold.
- The full Inter variable font is preloaded from `public/`.

## Proposed fix

1. Make the mark an SVG or a 64 px WebP/PNG (≈2–5 KB), and give the favicon a 32/48 px PNG or SVG plus an
   `.ico`.
2. Use `loading="lazy"` (and no preload) for images below the fold, such as the landing's `funky-logo` and the
   legislation header art that is hidden below `xl`.
3. Subset Inter to Latin, Latin Extended-A and U+0218–U+021B, which keeps Romanian ȘșȚțĂăÂâÎî. Import it through Vite so it gets a hashed,
   immutable URL, and preload only that subset.

## Expected impact

- **Images:** ≈−395 KB for the logo and favicon on every first visit. Deferring the below-the-fold `funky-logo`
  takes ≈46 KB more out of the initial load on `/`.
- **Font:** ≈−200 KB (subset size to be measured).
- **Time:** ≈3 s less transfer on the mobile profile, part of it inside the FCP window; contributes to
  [PERF-002](PERF-002-css-first-paint.md).
- **Repeat visitors:** the font and favicon stay cached across the 4 h boundary.

## How to verify

1. `byType.image` and `byType.font` in a new mobile cold run of `/` should be < 30 KB images and < 150 KB font.
2. The SSR head should have no `preload as=image` for below-the-fold images.

## Owner

client

## Severity

**P1** under the brief's scale, because it hits every domain. Its own gain is moderate, so it ranks below the
JS issues.

Not in the prior docs; new.
