# PERF-024: The API's CORS preflights carry no `Access-Control-Max-Age`, so browsers repeat them every 5 s

## Summary

Every browser GraphQL call, and the map-series REST call, is a cross-origin `POST` with
`Content-Type: application/json`, so it needs a preflight. The API answers `OPTIONS` without `Access-Control-Max-Age`. Chrome then caches each preflight for
only 5 s, so every new burst of reads pays one extra round trip before its first request. DevTools throttling
does not delay the `OPTIONS`, so the mobile figures below under-report the real cost by about one round trip
(≈560 ms on Slow 4G).

## Where

- **Domains:** the 7 of 16 pages that make preflighted JSON POSTs on load: `/`, `/national-budget`, `/map`,
  `/procurement`, `/alegeri`, `/parlament`, `/legislation`. `/primarie` makes browser API calls too, but only
  simple `GET`s, with no preflight.
- **Server:** `@fastify/cors` is registered without `maxAge` in
  `hack-for-facts-eb-server/src/app/build-redesign-app.ts:288-311`.
- **Client:** the preflight comes from the JSON `POST` in `src/lib/graphql/graphql-client.ts:162-171`, and the
  same from the REST map series call.

## Evidence

- **Response headers:** `curl -X OPTIONS` on the deployed API returns no `Access-Control-Max-Age` (home-S9).
- **Measured on deployed:**

  | page | preflights per cold load | time each |
  |---|---|---|
  | `/` | 1 | 100 ms desktop; 54–102 ms mobile (throttle not applied) |
  | `/national-budget` | 2–3 | 69–173 ms |
  | `/map` | 1 | 53–142 ms |
  | `/parlament` | **12**, and 12 again on mobile repeat views | 88–113 ms |
  | `/legislation` | 2 | 83–105 ms |
  | `/alegeri` | 1 | 73–132 ms |
  | `/procurement` | 1 | |

- **On `/`, the 5 s cache is visible:**
  - desktop repeat views made within 5 s of the cold load send 0 preflights;
  - mobile repeat views, where the cold load lasted 25 s, send 1.

## Root cause

The server's CORS plugin uses the default, which sends no max-age, so Chrome caps the preflight cache at 5 s.

## Proposed fix

1. Server: `maxAge: 7200` (Chrome's cap) on the CORS plugin.
2. Optional: send public reads as `GET` with persisted or short queries, or with a simple content type, so no
   preflight is needed at all.

## Expected impact

- Matching cached preflight permissions are reused for up to 2 h instead of 5 s. Concurrent cold requests can
  still issue more than one preflight.
- That saves ≈1 RTT for each later burst: ≈0.1 s on desktop and ≈0.5 s on a real mobile link, on every page
  with browser reads after the first.

## How to verify

1. `curl -si -X OPTIONS -H 'Origin: https://dev-chronos.transparenta.eu' -H 'Access-Control-Request-Method: POST' https://dev-chronos-api.transparenta.eu/api/v1/graphql`
   should show `access-control-max-age: 7200`.
2. Repeat views should show `preflights: 0` in `summary.json` on mobile too.

## Owner

**server**

## Severity

**P2**: a measurable but modest cost per page. It is under-reported by the lab and hits every page with browser
reads.
