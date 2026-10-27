# PERF-004: Both languages' Lingui catalogs (552 KB zstd) load on every page, and only after the entry is parsed

## Summary

Every page downloads six catalog chunks: `messages`, `admin` and `pnrr`, each in English and Romanian. That is
552 kB zstd (539 KiB; 1.49 MB / 1.42 MiB raw). A Romanian page needs only `ro/messages` (243 kB); `/pnrr` also needs
`ro/pnrr` (14 kB), because `src/lib/i18n.tsx:131-146` activates the `pnrr` catalog on `/pnrr` paths. They are not in the
head's preload list. The browser finds them only after it has parsed the entry, so on mobile they form a ≈4.2 s step
between the end of the preload wave and module evaluation. That step is transfer, not discovery: preloading the
catalogs earlier did not make them arrive earlier on a full link. The gain is in the bytes removed.

## Where

- **Domains:** all 16 audited pages.
- **Code:** `src/lib/i18n.tsx:22-44`. Three `import.meta.glob(..., { eager: true })` calls sit at module level
  next to their lazy twins. `:46-57` picks the lazy set on the client (`import.meta.env.SSR`).
- **Build:** the eager globs still compile to bare static imports in the client build. `utils-*.js` (i18n plus
  utils) lists `messages-…js` ×2, `admin-…` ×2 and `pnrr-…` ×2 in its `__vite__mapDeps` and imports them at the
  top. Each catalog runs `JSON.parse` on its whole string when it loads.

## Evidence

- **Mobile cold, deployed**, all 16 pages (`evidence/lead/phases-deployed-mobile.md`, from
  `tools/shared-metrics.py`):
  - requested 10.8–12.5 s, done 15.0–16.7 s (`/parlament` 12.2 → 16.6 s, `/legislation` 12.5 → 16.7 s);
  - the step takes **4.2–4.4 s** on every page (local: 4.2–4.5 s).
  - `/`: 12,027 → 16,248 ms (`evidence/home/deployed/home-mobile/run2-cold.json`).
  - `/national-budget`: 10.77 → 15.0 s.
  - `/companies`: 10.8 → 15.0 s.
- **Desktop:** 0.3–0.7 → 0.4–0.8 s (≈50–140 ms step; `/ins` 0.74 → 0.80 s).
- **Local target:** same files, same sizes, same position in the waterfall
  (`evidence/*/local/*-mobile/run*-cold.json`).
- **Sizes** (zstd): `messages` en 235 KB + ro 243 KB, `admin` en/ro 22 + 25 KB, `pnrr` en/ro 13 + 14 KB.
- **Lab check** (lead what-if `pre`, local build, mobile; `evidence/lead/whatif/RESULTS.md`): the six catalogs
  were preloaded from the head, so they started at 0.68 s instead of 11.9 s.
  - They still ended at 15.9 s on `/` (base 16.2 s) and 15.7 s on `/entity-analytics` (base 15.0 s), because
    the link is full either way. The 4.2 s step is transfer: 539 KiB is ≈2.9 s at 184 KiB/s (1.51 Mbit/s).
  - Hydration moved 1.5 s earlier, but that is the route code's gain ([PERF-005](PERF-005-lazy-route-code.md)).
  - FCP moved 2.9 s later (8.9 → 11.8 s), because the extra preloads competed with the CSS.
  - So discovery is not the cost; the bytes are. The reviewer confirms this reading
    (`evidence/lead/review/REVIEW.md` §4).

## Root cause

`import.meta.glob` with `eager: true` is a static import, whatever branch later reads it. The `SSR` ternary
chooses which object the code uses, but the bundler has already put all six catalogs into the client graph.
Because they are imported by `utils-*.js` rather than listed by the router manifest, the head carries no
`modulepreload` for them. The browser discovers them only after the entry and `utils` have arrived and been
parsed.

## Proposed fix

1. Move the eager globs into a server-only module (`createServerOnlyFn`, or a module that only the server entry
   imports), so that the client graph keeps only the lazy loaders.
2. On the client, load the active locale's `messages` catalog before `hydrateRoot`. The client already awaits
   locale activation in `src/client.tsx:13-20`.
3. Do not add it as a head `modulepreload`: in the what-if, extra head preloads delayed FCP by 2.4–3.9 s
   ([PERF-002](PERF-002-css-first-paint.md)). Start the import from the entry instead. `src/client.tsx:18` already awaits it.
4. Load `admin` and `pnrr` only on the routes that use them. Longer term, split catalogs per route.

## Expected impact

- **Bytes (the headline gain; estimate, no run tested it):** −309 kB per first visit on Romanian main pages
  and ≈−295 kB on `/pnrr`, ≈1.6–1.7 s of transfer at 184 KiB/s. On the mobile profile that moves hydration by
  about the same amount.
- **Discovery:** no measurable gain. Preloaded from 0.68 s, the catalogs ended only 0.3 s earlier.
- **Desktop:** ≈100 ms.

## How to verify

1. Inspect the client build: `head -c 600 assets/utils-*.js` should list no catalog in `__vite__mapDeps`.
2. The client build's graph holds the catalogs only as lazy chunks, one per locale and scope.
3. Re-run mobile cold on `/`: one catalog file instead of six (two on `/pnrr`), ≈300 kB less JS transfer, and
   an earlier catalog end (`tools/shared-metrics.py`).

## Owner

client

## Severity

**P1**: it hits every domain. The unused bytes cost ≈1.7 s of transfer on mobile (estimate).

Known in `docs/entity-page-ssr-loading.md:138` ("two Lingui catalogs ~615KB"); the static-import mechanism is new.
