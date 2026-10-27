# PERF-020: The hubs' county map downloads a 400 KB GeoJSON after hydration and projects it on the main thread (≈300 ms on mobile)

## Summary

`HubCountyBand` draws the county map on most domain hubs. It fetches `/geojson/judete-2026-03-09.json` only
after hydration. The file is 400 KB raw / 114 KB zstd, with 15–17-digit coordinates and 15 properties per
county, of which the map reads 2. It is served without `Cache-Control`.

The band then projects the shapes and searches each county's label point during render. On mobile that is one
250–300 ms task, of which ≈150 ms is the label search. The map shows ≈2 s after hydration. Every hub fetches it
at hydration, even where the band is far below the fold (the third band on `/ins`).

- **LCP:** unaffected; the map is below the fold.
- **TBT:** affected.
- **`/map`:** it loads the same county file, plus a 3.1 MB UAT file ([PERF-009](PERF-009-map-first-frame.md)).

## Where

- **Domains:** the hubs that render `HubCountyBand`: `/companies`, `/ngos`, `/procurement`, `/justice`,
  `/public-enterprises`, `/ins` (all measured); also `/ngos/registry` (`registry-county-map.tsx`) and the PNRR
  map preview.
- **Fetch:** `src/hooks/useGeoJson.ts:53-65` (`enabled` only in the browser).
- **Projection:**
  - `src/features/statistics/components/hub/hub-county-band.tsx:100-102` (`countyShapes()` during render);
  - `src/features/statistics/lib/county-map.ts:149-191` (`poleOfInaccessibility`);
  - `:57,76` (`segmentDistanceSq`, `signedDistance`);
  - `:192-224,294-300`.
- **Asset:** `public/geojson/judete-2026-03-09.json`. It has a dated name but no hash, and no cache header.

## Evidence

| page | GeoJSON fetch, mobile cold (deployed) | main-thread task, mobile | desktop |
|---|---|---|---|
| `/ngos` | 18,309 → 19,815 ms, 114 KB zstd | 274–302 ms (local 291 ms) | 67 ms fetch, 109–119 ms task |
| `/companies` | 18,276 → 19,799 ms, 113 KB | 249–309 ms (warm ≈224 ms) | 67–77 ms task |
| `/procurement` | 18,614 → 20,671 ms, 115 KB | 294 ms: 241 ms of the page's 1,916 ms TBT | 1,054 → 1,129 ms fetch, ≈75 ms task |
| `/justice` | 18,370 → 20,183 ms, 116 KB | 253 ms (246–270), warm 172 ms | 1,092 → 1,184 ms fetch, 66 ms task |
| `/public-enterprises` | 18,335 → 19,832 ms, 115 KB | 252–300 ms: ≈200 ms of the page's 1,785 ms TBT | 1,165 → 1,235 ms fetch, 67–73 ms task |
| `/ins` | 18.2 → 20.4 s, 115 KB | 269–323 ms (repeat 177–253 ms): ≈220–270 ms of the page's 1,623 ms TBT | 62–99 ms task |


- **CPU profile of the task:**
  - `/ngos` (`evidence/ngos/extra/mobile-map-task-by-source.txt`): 196 ms of 304 ms in `county-map.ts`.
  - `/companies` (`evidence/companies/analysis/`): 140 ms in `segmentDistanceSq` and 12 ms in `signedDistance`.
  - `/procurement` (`evidence/procurement/extra/window-profile.mjs` on the trace): 221 of 242 ms.
  - `/justice` (`trace-cold.trace.json`): ≈200 ms, 146 ms of it in one function.

  In every case the time is the label search (`poleOfInaccessibility`).
- **Precomputed size**, measured on the file:
  - by ngos: 26 KB brotli for 1-decimal paths with label points;
  - by justice: 60 KB raw / 20 KB gzip, simplified at 0.6 viewBox units.
- **CLS:** none. The placeholder's `aspect-[640/454]` matches the real map (justice-2).
- **Forced layout in the hydration task:**
  - `/ngos`: the band's tooltip layout effect (`hub-county-band.tsx:147-151`) costs 43 ms through
    `tooltip.frameSize()` (ngos-3).
  - `/justice`: 118 ms, combining the width measurement (`useRenderedWidth`, `uat-map-viewport.ts:261-275`) and
    the tooltip measurement.
  - `/public-enterprises`: an estimated ≈100 ms, not attributed.
- **Slim file:** public enterprises measured a version without the 13 unused properties (of 15) and with rounded
  coordinates at 31 KB brotli instead of 88 KB.
- **Headers:** no `Cache-Control`; `cf-cache-status: DYNAMIC` (`evidence/ngos/extra/county-geojson.txt`).
  Repeat views rely on heuristic freshness.
- **Repeat views:** the projection cache is a `WeakMap`, so it does not survive a reload. Warm views still pay
  ≈224 ms.

## Root cause

- The shapes are computed per visit from raw GeoJSON in the browser, although they never change between data
  releases.
- The asset is published without cache headers.
- The fetch is gated on the browser, after hydration.

## Proposed fix

1. Generate the projected shapes at build time: a per-county SVG `d` at 1 decimal, plus the label point and
   room. That is 26 KB brotli (measured, `evidence/ngos/extra/county-geojson.txt`) against the 114 KB zstd
   served today.
2. Ship them as a lazily imported module or a hashed asset. The band then only colours paths.
3. Static-data hubs could render the SVG on the server (≈25 KB more compressed HTML), so the map paints with FCP.
   Otherwise, since the band is far below the fold on most hubs, fetch when it nears the viewport.
4. At minimum, serve `/geojson/*-YYYY-MM-DD.json` with `Cache-Control: public, max-age=31536000, immutable`.
   The dated-name contract in `useGeoJson.ts:13-16` already allows that. Also strip the unused `pop*`
   properties and round the coordinates.

## Expected impact

- **Per first visit to a hub:** −88 KB, and ≈−250 ms of mobile TBT (≈−60 ms desktop).
- **Mobile:** the map is visible ≈1.5 s earlier.
- **Repeat visits:** no revalidation.

## How to verify

1. On a hub, mobile cold: no `judete-*.json` request, or a hashed one under 30 KB.
2. The longest task after hydration is under 100 ms on mobile (`longTaskList`).

## Owner

client; infra for the asset headers

## Severity

**P2** under the brief's scale: a measurable cost, below the fold, on about six hubs.

Not in the prior docs; new.
