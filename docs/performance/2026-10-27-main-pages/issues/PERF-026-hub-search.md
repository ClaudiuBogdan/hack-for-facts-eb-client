# PERF-026: Every hub's pre-hydration code carries the landing search's own combobox library (`@base-ui/react`, ≈45 KB zstd)

## Summary

The search box on the home page and on the domain hubs is `LandingSearch`. It is built on `@base-ui/react`'s
combobox plus floating-ui, while the rest of the app uses Radix. Its chunk, `landing-search-*.js` (125 KB raw /
44 KB zstd, ≈100 KB of it base-ui), is a static import of each hub's route code. On mobile it arrives in the late
route wave ([PERF-005](PERF-005-lazy-route-code.md)) before hydration, on every page that shows the search.

## Where

- **Component:** `src/features/landing/components/search/landing-search.tsx`.
- **Importers:**
  - `src/features/ngos/hub/ngo-hub-search.tsx:4`;
  - `src/features/private-companies/components/hub/hub-search.tsx:4`;
  - `src/features/procurement/components/home/home-chrome.tsx:7`;
  - `src/features/public-enterprises/components/hub/hub-search.tsx:5`;
  - `src/features/statistics/components/hub/hub-dataset-search.tsx:3`;
  - the landing page.
- **Pages measured with it before hydration** (deployed mobile cold, `requests`): `/`, `/companies`, `/ngos`,
  `/procurement`, `/public-enterprises`, `/ins`. `/justice` also loads it without showing it
  ([PERF-018](PERF-018-route-dead-weight.md)).

## Evidence

- `landing-search-BLni4lc0.js` 44 KB zstd plus `entity-search-api.live-*.js` 4 KB, requested at:
  - 17,707 ms on `/`;
  - 16,353 ms on `/companies`;
  - 16,391 ms on `/ngos`.

  The hydration shell follows at 19.5, 18.0 and 18.1 s (`evidence/{home,companies,ngos}/deployed/*-mobile/run2-cold.json`).
- Composition (home-2, source maps): `@base-ui/react` combobox plus floating-ui ≈100 KB raw of the 125 KB.
- companies-1: 44 KB of the hub's 109 KB route code is the search.

## Root cause

- The search was built on a second headless-UI library.
- It is a static import of each hub's page, so it must arrive before the page can hydrate, although nobody can
  type into it before then.

## Proposed fix

1. Server-render the search as a plain `<input>` with the same look, and load the combobox on focus, on
   pointer-enter or when idle.
2. Or rebuild it on the Radix and cmdk primitives the app already ships.

## Expected impact

- ≈−45 KB zstd off the hydration path on every hub: ≈0.25 s on the mobile profile and ≈50 ms of mobile main
  thread.
- More once [PERF-005](PERF-005-lazy-route-code.md) is fixed, since this chunk would otherwise join the first wave.

## How to verify

1. On a hub, mobile cold: `landing-search-*.js` should start only after the input gets focus, or after
   hydration when idle.
2. The search still works with the keyboard and on touch.

## Owner

client

## Severity

**P2**: a measurable cost local to the hub pages.

Not in the prior docs; new.
