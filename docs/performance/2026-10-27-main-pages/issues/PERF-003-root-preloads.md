# PERF-003: Every page preloads 136 chunks (1.16 MB zstd) of mostly unrelated code before it can hydrate

## Summary

The root route lists 136 `modulepreload` links in every page's head: 3.56 MB raw, 1.16 MB zstd (1,133 KiB). This set
includes recharts, 318 KB of PNRR CSV data, the English challenge MDX content, Sentry, PostHog, Clerk, and
about 400 KB of other domains' feature code. Two build-level causes produce it:

- Named chunk groups in `vite.config.ts` pull shared dependencies such as `react` and `react/jsx-runtime`
  into vendor and content chunks.
- Every route file's eager part (`validateSearch`, `head`, `loader`) is in the entry graph for all 192 routes.

On the mobile profile this wave ends at 10.7–12.5 s, and it is followed by a 1.1–1.4 s module-evaluation task.
About half of that task is zod building schemas for pages the visitor is not on.

## Where

- **Domains:** all 16 audited pages. The same 136 root links are on every page, 1,132–1,134 KiB transfer.
  `/ngos`, `/procurement` and `/justice` add one 460–545 B layout-route chunk.
- **Chunk groups:** `vite.config.ts:90-128` (`getClientManualChunk`) and `vite.config.ts:358-369`
  (`manualChunks`). Rolldown turns `manualChunks` into `codeSplitting.groups`, and their
  `includeDependenciesRecursively` defaults to `true`
  (`node_modules/rolldown/dist/shared/define-config-DSMNXceb.d.mts:1164-1177`).
- **Eager route files** (examples):
  - `src/routes/pnrr.tsx:8-12` → `features/pnrr/seo/pnrr-seo.ts:11-15` → `lib/data-transform.ts:22-26` →
    `lib/pnrr-uat-assignment.ts:1,4`, which inlines two CSV files with `?raw` (276 + 50 KB) and parses them at
    module scope (`:131`, `:148`).
    - Only the server-side snapshot builders (`pnrr-seo.ts:242-262`) use them.
    - The resulting root preload `data-transform-*.js` is 345 KB raw / 108 KB zstd, 94 % of it CSV.
    - Parsing costs ≈16–22 ms per page in Node on Zeus (≈65–90 ms at 4× CPU, estimate). Source: pnrr-2.
  - `src/routes/primarie/$cui/buget/provocari/$moduleSlug/$challengeSlug/$stepSlug.tsx:9`
    → `src/features/challenges/utils/challenge-step-content-resolver.ts:7`
    → `virtual:challenge-step-section-metadata`: 88 KB in the entry.
  - `src/routes/companies.$cui.tsx:2-3` → `private-company-api`: 52 KB, 30 % of it mock fixtures
    (`private-company-api.ts:4-8`, companies-4).
  - `src/routes/ins/{index,seturi/index,seturi/$cod,teritorii/$siruta}.tsx` → the INS fetchers: 9 root
    preloads (72 KB raw / 26 KB zstd), plus ≈115 KB of INS source inside the entry (ins-3).
  - `src/routes/achizitii/cautare.tsx:2` → procurement-hub schemas.
- `src/routes/parlament/{index,grupuri/index,membri/index,voturi/index,stenograme/index}.tsx` and others →
  `src/schemas/parliament.ts`: 2,108 lines, 182 schemas, **53 ms of mobile evaluation on every page**
  (parlament-6). The search schemas sit among all the data schemas.
- **Static shell imports:** Sentry, PostHog and Clerk ([PERF-011](PERF-011-sentry-posthog.md), [PERF-012](PERF-012-clerk-eager.md)).

## Evidence

- **Head of every page:** 136 `modulepreload`s, the same set on every page.
  - Deployed mobile cold: the wave ends at 10.7–12.5 s (12.2 s on `/parlament`, 12.5 s on `/legislation`),
    1,132–1,134 KiB.
  - Evaluation task: **≈1.1–1.4 s** (medians per page, all 16 pages; `evidence/lead/phases-deployed-mobile.md`).
    The reviewer's re-run measured 1.13 s on `/`, against 1.22 s in the batch.
  - Everything requested before hydration: 2.8–3.3 MB per page (2,733–3,243 KiB).
  - Desktop: the wave ends at 0.3–0.7 s and the evaluation task is 272–337 ms.
- **What is in it:** the root preload graph plus the six catalogs loaded right after it ([PERF-004](PERF-004-catalogs.md)), 142 chunks.
  Source-map attribution, `evidence/home/analysis/root-preload-breakdown.txt`, KB raw:

  | Group | KB raw |
  |---|---:|
  | catalogs ([PERF-004](PERF-004-catalogs.md)) | 1,421 |
  | recharts group | 448 |
  | PNRR CSV data | 318 |
  | Sentry | 309 |
  | PostHog | 221 |
  | react + react-dom | 186 |
  | Clerk | 151 |
  | `src/schemas` | 146 |
  | MDX challenge content | 143 |
  | challenge section metadata | 99 |
  | other domains' feature code | ≈400 |

- **Captured dependencies in the build** (`.output/public/assets`, verified by the lead):
  - `react` is exported from `clerk-*.js`, and 319 chunks import from it.
  - `react/jsx-runtime` lives in `challenge-step-content-en-*.js`, and 394 chunks import from it. So every page
    downloads the English challenge MDX (186 KB raw).
  - `use-sync-external-store/with-selector` lives in `recharts-*.js` (22 importers, among them the router's
    `useStore`). So every page downloads recharts (463 KB raw, 128 KB zstd).
- **Zod:** in the traced local mobile load of `/`, zod self time is **494 ms of the 930 ms evaluation task**
  (reviewer's own attribution: 500 ms). The calls
  come from the schema chunks of parliament, advanced-map-analytics, charts, legal, company-analytics,
  procurement, ins and entities (`evidence/home/analysis/mobile-eval-zod-callers.txt`).
- **Entry chunk** (`index-*.js`, 932 KB raw, identical on both targets), largest items:

  | Item | KB raw |
  |---|---:|
  | react-dom | 175 |
  | challenge section metadata object | 88 |
  | `routeTree.gen.ts` | 73 |
  | router-core | 46 |
  | sonner | 33 |
  | challenges, campaigns, ngos, learning and statistics code | 20–28 each |

  (`evidence/home/analysis/entry-chunk-by-file.txt`)
- **Both targets** carry the same set: deployed 2,120–2,494 KB JS transfer per mobile cold load (2,936 KB on
  `/map`), local 2,007–2,377 KB (2,776 KB on `/map`).
  The difference is Cloudflare's zstd level against the proxy's level 3.

## Root cause

1. Named groups (`recharts`, `clerk`, `sentry`, `posthog`, `tanstack`, `motion`, `maps`, and the content groups)
   are code-splitting groups with `includeDependenciesRecursively: true`. Each group swallows the modules its
   members depend on, including `react`, `jsx-runtime` and `use-sync-external-store`. Any chunk that needs
   those modules then imports the whole group chunk.
2. TanStack's auto code-splitting moves only the `component` keys out of a route file. `validateSearch`, `head`,
   `loader`, `beforeLoad` and everything they import stay in the entry graph, for all 192 routes. Zod schemas
   reached this way are built at module evaluation.
3. Sentry, PostHog and Clerk are static imports of the shell.

## Proposed fix

1. Remove the vendor and content `manualChunks`, or give the shared runtime (`react`, `react-dom`,
   `react/jsx-runtime`, `use-sync-external-store`) its own higher-priority group, or set
   `includeDependenciesRecursively: false` with the `strictExecutionOrder` that rolldown asks for. Then check
   that recharts and the MDX content have left the root list.
2. Keep route files thin: no feature, API or data imports in `head`, `validateSearch` or `loader`. Move search
   schemas and SEO builders into small modules. Never let an eager route file reach a `?raw` import. Consider
   `codeSplittingOptions` for `loader`.
3. Build zod schemas lazily (inside functions or getters) in shared schema modules.
4. Add a CI budget on the root preload list (count and KB), so this does not come back.

## Expected impact

- **Bytes (estimate, transfer arithmetic; not yet measured on a rebuild):** recharts 128 KB, PNRR data 110 KB, MDX content 24 KB and table/virtual ≈19 KB come to
  **≈280 KB zstd less on every first visit**, ≈1.5 s at the mobile profile's 184 KiB/s (1.51 Mbit/s).
- **Main thread:** up to ≈0.5 s less on mobile (zod 494 ms, data-transform 53 ms and recharts 35 ms, in the
  traced load). Part of the zod time may remain, for example the 76 ms reached from the entry.
- **Head preloads alone, measured:** the lead's `strip` what-if removed every head `modulepreload` except the
  entry, on local `/`, mobile cold. FCP went from 8.89 to 3.20 s and hydration did not move
  ([PERF-002](PERF-002-css-first-paint.md)). The 136-link list costs ≈5.7 s of FCP on this profile and buys nothing for
  hydration.
- **More** as route files are trimmed: other-domain feature code is ≈400 KB raw.
- **Desktop:** ≈50–100 ms.

## How to verify

1. `grep -c 'rel="modulepreload"'` on the SSR HTML of `/`, before and after.
2. `node evidence/home/analysis/root-breakdown.cjs` against the new build.
3. Re-run `tools/perf-run.mjs --profile mobile` on `/` and one hub. The preload wave end and the evaluation task
   (`tools/shared-metrics.py`) should both drop.
4. Check in the build that `react` is no longer exported from `clerk-*.js`
   (`grep -l 'from"./clerk-' assets/*.js | wc -l` ≈ only Clerk users).

## Owner

client

## Severity

**P1**: it hits every domain, and it costs more than 1 s on mobile.

Known in `docs/entity-page-ssr-loading.md:136-139` (sizes only); the causes above are new.
