# PERF-016: Legislation and parliament preload large header PNGs that phones never show, delaying mobile hydration by ≈1.5 s

## Summary

The legislation and parliament shells render decorative header art as eager `<img>` elements inside a container
that is hidden below `xl`. React 19 hoists each image as a `<link rel=preload as=image>` above the stylesheet,
one of them at `fetchpriority=high`. The `sizes` attribute still selects the 768 w candidate on phones. So a
phone downloads ≈320 KB of art it never displays, in the same window as the CSS, the root preloads and the
catalogs. A second image only feeds a WebGL effect that mounts on pointer intent. On desktop the LCP image
(453 KB) shares the link with that invisible image (395 KB).

## Where

- **Domains:** legislation (`/legislation`) and parliament (`/parlament`, and every page that uses
  `ParliamentShell`: agenda, committees, stenograms).
- **Legislation:**
  - `src/features/legal/components/legislation-header-visual.tsx:149-180`: two `<img loading="eager">`, the first
    with `fetchPriority="high"`;
  - `:120-137`: the glitch effect that uses the second image;
  - the container is `hidden … xl:flex` (`legislation-shell.tsx:72`).
- **Parliament:** `src/features/parliament/components/parliament-shell.tsx:59-71`: `loading="eager"` and
  `fetchPriority="high"` inside a `hidden xl:flex` wrapper.

## Evidence

Deployed mobile cold, medians of 3 (`evidence/*/deployed/*-mobile/run?-cold.json`; legislation-1):

| | `/legislation` | 10 pages that preload only the logo |
|---|---:|---:|
| image KB before the entry ends | 517 | 203 |
| CSS end | 7.51 s | 7.11–7.24 s |
| FCP | 7.66 s | 7.24–7.44 s |
| entry end | 12.46 s | 10.75–10.81 s |
| catalogs end | 16.73 s | 15.00–15.09 s |
| hydration shell | 19.57 s | 17.4–18.3 s |

- **Byte arithmetic:** the extra ≈314 KiB (322 kB), at the profile's 184 KiB/s, comes to ≈1.7 s. That matches
  the catalogs' delay (+1.67 s).
- **Local agrees:** CSS +0.54 s, entry +1.56 s, hydration shell +1.5 s.
- **Parliament, measured directly** (parlament-3): one extra deployed mobile load with the hero PNG blocked
  (`evidence/parliament/extra/deployed-mobile-no-hero/`, `Network.setBlockedURLs`), against the batch's 3 cold
  runs:

  | metric | image blocked | batch runs |
  |---|---:|---:|
  | entry done | 10,849 | 12,140–12,162 (−1.3 s) |
  | font done | 11,309 | 14,341–14,403 (−3.0 s) |
  | hydration end | **18,697** | 19,935–20,286 (−1.35 s) |
  | last commit | 24,229 | 25,590–26,050 (−1.5 s) |
  | FCP/LCP | 7,432 | 7,596–7,660 (−0.2 s) |

  That is a single run, but the batch's spread is ±0.2 s. All times in ms.
- **Parliament desktop:** the LCP is `header-parliament-allegory-1280-*.png`, 943 KB at high priority. On mobile
  the 768 w file, 323 KB, is fetched at high priority from 616 to 12,763 ms, for an image that is never shown.
  WebP q75–85 would be 89–122 KB (1280 w) and 31–43 KB (768 w).
- **Desktop:** 848 KB of header PNGs. The LCP image loads 273 → 567 ms beside the invisible one.
- **This is a natural experiment:** it shows the mechanism behind [PERF-002](PERF-002-css-first-paint.md) and
  [PERF-003](PERF-003-root-preloads.md). On the mobile profile, every 100 KB in the first wave moves hydration by ≈0.5 s.

## Root cause

- An `<img>` hidden with CSS still loads when it is eager.
- React 19 turns non-lazy images into head preloads above the stylesheet.
- The effect image is loaded for an interaction that may never come.
- The PNGs are not converted to WebP or AVIF.

## Proposed fix

1. **Keep the art off phones.** Render it client-side only at `xl` (`matchMedia` after hydration), or use a
   `<picture>` with a `(min-width: 1280px)` source and a 1×1 fallback.
2. **Load the effect image in the glitch module's `warmUp()`**, not at load.
3. **Convert to WebP or AVIF.** WebP q75 gives:
   - 1280 w: 453 → 130 KB;
   - future-1280: 395 → 93 KB;
   - 768 w: 168 → 56 KB.

## Expected impact

- **Mobile:** −322 KB on each page, hydration ≈−1.35 to −1.5 s (measured on parliament), FCP/LCP ≈−0.2 to
  −0.3 s, and the content lands ≈1.5 s earlier.
- **Desktop:** −395 KB, plus −320 KB on the LCP image, on legislation; −820 KB on parliament's LCP image.
  LCP ≈ FCP on slower links.

## How to verify

1. In a mobile cold run of `/legislation`: no `header-*` image requests, and `byType.image` is ≈ the logo only.
2. Hydration is within the range of the logo-only pages.

## Owner

client

## Severity

**P2** by the letter of the scale: LCP moves by ≈0.3 s. The +1.5 s to interactive on mobile makes it the
largest P2.
