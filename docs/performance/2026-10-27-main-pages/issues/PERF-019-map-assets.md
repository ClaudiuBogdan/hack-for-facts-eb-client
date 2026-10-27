# PERF-019: Map pages ship MapLibre and Leaflet together, and a 3.1 MB unrounded UAT GeoJSON that no cache keeps

## Summary

Three causes are shared by the pages that draw the UAT-level map: `/map`, the campaign's `/primarie` selector,
and PNRR's map.

1. **One `maps` chunk.** `vite.config.ts` puts Leaflet, react-leaflet, MapLibre and pmtiles into one group, so
   `maps-*.js` is 297 KB zstd. A Leaflet page downloads ≈233 KB gzip of MapLibre it never runs, and a MapLibre
   page downloads Leaflet.
2. **An unrounded UAT boundary file.** `public/geojson/uat-2026-03-09.json` is 3.1 MB raw / 699–703 KB zstd, with
   14–16-digit coordinates and unused properties.
3. **No caching for `/geojson/*`.** No `Cache-Control`, and Cloudflare answers `DYNAMIC`. The county file has the
   same problem ([PERF-020](PERF-020-county-map.md)).

## Where

- **Chunk group:** `vite.config.ts:99-106`.
- **Leaflet users:**
  - the campaign map, `buget-entity-map-selector-map.tsx:1-5`;
  - `/primarie/harta`;
  - `EmployeesMap`.
- **MapLibre users:**
  - `/map` (`InteractiveMap.tsx`);
  - the PNRR map.
- **GeoJSON:** `public/geojson/uat-2026-03-09.json`, read through `src/hooks/useGeoJson.ts` (dated names: the
  contract at `:13-16` allows immutable caching).
- **`/primarie` below the fold:** `buget-entity-selector-gate.tsx:85,292` computes `isMapSectionInView` but never
  passes it as `shouldLoad`.
- **Domains:**
  - local budgets (`/map`), see also [PERF-009](PERF-009-map-first-frame.md);
  - the town-hall campaign (`/primarie`, not a domain entry point);
  - PNRR (its map tab).

## Evidence

- **`maps-*.js`:** 297 KB zstd / 1,087 KB. By source-map attribution: maplibre-gl 875 KB raw (≈233 KB gzip,
  79 %), leaflet 149 KB (≈43 KB), pmtiles 14 KB.
  - On `/primarie` mobile cold it downloads 24,996 → 27,327 ms (2.3 s), then a 170 ms evaluation task
    (primarie-5).
  - On `/map`, the 46 KB zstd of Leaflet comes in through a constants import (local-budgets-2).
- **UAT GeoJSON size:** 6.8 s on the mobile profile on both pages.

  | version | zstd |
  |---|---:|
  | as published | 703 KB |
  | coordinates rounded to 5 decimals (≈1 m) | 393–402 KB (−44 %) |
  | rounded, and keeping only `natcode`, `name`, `county` | 354 KB (−50 %) |

  Measured offline by both the local-budgets and town-hall agents.
- **`/primarie`:** the participants map, below the fold on mobile, costs 1,136 KB of the page's 4,165 KB cold
  transfer and ≈0.9 s of main thread after hydration (≈650 ms of its 2,042 ms TBT). Its chunk starts only after the
  GeoJSON has finished, so it is ready at ≈28.1 s against hydration at 17.8 s (primarie-2).
- **Headers:** no `Cache-Control` on `/geojson/*`, and `cf-cache-status: DYNAMIC`. Repeat views rely on
  heuristic freshness.

## Root cause

- A vendor group defined by "maps" rather than by library.
- Boundary files published straight from the source, without rounding or trimming.
- No header rule for `public/geojson`.

## Proposed fix

1. **Split the group:** `leaflet` (leaflet, react-leaflet, @react-leaflet/core) and `maplibre` (maplibre-gl,
   pmtiles). Then re-check the chunk graph ([PERF-003](PERF-003-root-preloads.md) cause 1).
2. **Publish a rounded, trimmed UAT file** under a new dated name.
3. **Cache the boundary files:** `Cache-Control: public, max-age=31536000, immutable` for `/geojson/**` (a Nitro
   route rule or the static server), plus a Cloudflare cache rule.
4. **`/primarie`:** pass `isMapSectionInView` as `shouldLoad`, so phones that don't scroll skip the map.

## Expected impact

- **Leaflet pages:** ≈−240 KB zstd (≈−1.3 s on mobile) and most of a 170 ms task.
- **MapLibre pages:** ≈−44 KB.
- **Every UAT map load:** ≈−300 KB (≈−1.7 s on mobile).
- **Repeat visits:** edge or browser hits instead of 700 KB downloads.
- **`/primarie` phones that don't scroll:** −1.16 MB and ≈−0.9 s of main thread.

## How to verify

1. The build has separate `leaflet-*.js` and `maplibre-*.js`, and a Leaflet page requests no MapLibre.
2. `curl -sI https://dev-chronos.transparenta.eu/geojson/uat-…json` shows a long `Cache-Control`, and a second
   request shows `cf-cache-status: HIT`.

## Owner

client; infra for the Cloudflare rule

## Severity

**P2**: measurable and local to the map pages. More than 1 s on mobile on the pages that draw the UAT map.
