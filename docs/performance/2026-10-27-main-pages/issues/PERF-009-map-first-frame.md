# PERF-009: `/map` draws its first frame at 35.9 s on mobile, after a serial chain that starts only at hydration

## Summary

On `/map`, nothing that the map needs starts before hydration. After it, six steps run one after another:

1. the 3.1 MB UAT GeoJSON (699 KB zstd, unrounded coordinates, no cache header);
2. the MapLibre chunk, imported only once the data is in. It also carries 46 KB zstd of Leaflet;
3. the MapLibre worker;
4. the worker tiles the GeoJSON;
5. label glyphs, fetched from MapLibre's demo server;
6. paint.

The page's one data read also waits for Clerk ([PERF-015](PERF-015-reads-wait-for-clerk.md)). Meanwhile, from first paint until
the map arrives, the server HTML states "Map geometry is unavailable", which is false. LCP does not see any of
this: it is a text note, and the WebGL canvas is never an LCP candidate.

## Where

- **Domain:** local budgets. **URL:** `/map`, sidebar item 2 and the landing tile "Hartă".
- **GeoJSON:**
  - `src/hooks/useGeoJson.ts:53-65`, called from `map-analytics-workspace.tsx:2008-2021`;
  - the route prefetch is client-only in `beforeLoad` (`src/routes/map.tsx:15-23`). It does not run on
    hydration (`@tanstack/router-core/dist/esm/ssr/ssr-client.js:8`).
- **MapLibre import:** `map-analytics-workspace.tsx:178-181` and `:3140` (`isMapLoading`). Other map routes
  warm it with `warmAdvancedAnalyticsMapResources` (`analytics-map-warmup.ts:14-36`); `/map` does not.
- **Leaflet in the MapLibre chunk:** `InteractiveMap.tsx:50-53` imports two zoom constants from
  `components/maps/polygonLabels.ts`, which imports `leaflet` at `:2`.
- **Glyphs:** `InteractiveMap.tsx:121` points at `demotiles.maplibre.org` (third party, `max-age=600`).
- **"Unavailable" message:** `map-analytics-workspace.tsx:3776-3789` (and the preview branch `:3526-3537`). On
  the server the GeoJSON query is disabled (`useGeoJson.ts:64`), so it is neither loading nor errored.
- **Data read:** `src/lib/api/map-series.ts:101-104` awaits `getAuthToken()`.

## Evidence

**Map drawn** (a proxy measure): the end of the last long task after the glyphs arrive. LCP misses the canvas.

| | mobile | desktop |
|---|---:|---:|
| deployed, cold | **35.9 s** | 3.9 s |
| local, cold | 35.8 s | 3.6 s |
| repeat view | 6.1–6.2 s | 3.0 s |

Mobile chain (deployed run 2):

| step | start | end |
|---|---:|---:|
| hydration | | 21.5 s |
| GeoJSON (699 KB) | 21.7 s | 28.5 s |
| MapLibre and Leaflet chunk (297 KB) | 29.0 s | 31.3 s |
| worker (132 KB) | 31.8 s | |
| glyphs (148 KB) | 34.0 s | 35.3 s |
| paint | | 35.8 s |

- **Desktop:** the Clerk wait is the critical path. Clerk's `/v1/client` ends at 1,845 ms and the series read
  runs 1,884–2,025 ms.
- **TBT:** 3.5 s on mobile, the highest of all pages. The main thread is busy for 7.2 s.
- **GeoJSON size:** rounding to 5 decimals takes it from 3.18 to 2.13 MB raw (compact JSON) and from 713 to
  402 kB at zstd level 3 (696 → 393 KiB), measured on `public/geojson/uat-2026-03-09.json` (the reviewer's run).
- **False message:** "Geometria hărții nu este disponibilă." is in `ssr.html` on both targets. On mobile cold it
  is on screen from 7.3 s to 21.5 s.
- **Route chunk:** `map.lazy` carries SheetJS ([PERF-018](PERF-018-route-dead-weight.md)). The chunk-group and GeoJSON causes are
  shared with other map pages ([PERF-019](PERF-019-map-assets.md)).
- **Source:** local-budgets-2, local-budgets-4 and local-budgets-6 in `domains/local-budgets.md`.

## Root cause

- The data, the renderer and the glyphs are each requested only when the previous step finishes.
- The data starts only after hydration, because the route's prefetch runs in `beforeLoad`, which TanStack does
  not run on hydration.
- The UAT file is unrounded and not cached.
- The renderer chunk drags Leaflet in through a constants import.
- On the server, a disabled query falls through to the "unavailable" branch.

## Proposed fix

1. Start the GeoJSON fetch and the `InteractiveMap` import when the route chunk loads: call
   `warmAdvancedAnalyticsMapResources({ queryClient, includeCountyGeoJson: true })` from the `/map` component, or use a
   client `loader`.
2. Publish a rounded GeoJSON (5 decimals) without unused properties, under a new dated name. Serve
   `/geojson/*` as `public, max-age=31536000, immutable`, and let Cloudflare cache and compress it.
3. Move the zoom constants out of `polygonLabels.ts`.
4. Self-host the three glyph ranges with immutable headers, and preload them with the worker.
5. Treat "not in the browser yet" as loading, not unavailable. This is the data-trust rule in `DESIGN.md`.
6. Longer term, ship pre-tiled boundaries (PMTiles is already a dependency).
7. The Clerk wait goes with [PERF-015](PERF-015-reads-wait-for-clerk.md).

## Expected impact

| change | mobile, map drawn | desktop |
|---|---|---|
| rounded GeoJSON | −304 KB, ≈−1.7 s | |
| Leaflet out of the MapLibre chunk | −46 KB, ≈−0.25 s | |
| overlapping renderer, worker and glyphs with the data | ≈−2 to −3 s | |
| all of the above | **≈−4 to −5 s** | ≈−0.2 to −0.3 s |
| plus the Clerk fix | | −0.65 s |

All of these are estimates. The false "unavailable" message goes away.

## How to verify

1. Add a `map.on('idle')` mark, or reuse the last-long-task proxy, in a mobile cold run of `/map`.
2. Check the request start times: the GeoJSON and `maps-*.js` start before or at hydration, and the glyphs come
   from the site's own origin.

## Owner

client; infra for the `/geojson` headers

## Severity

**P1**: more than 1 s on mobile, on a sidebar page.

The map workspace's 525 KB chunk is known in `docs/entity-page-ssr-loading.md:138`. The chain and the GeoJSON
size are new.
