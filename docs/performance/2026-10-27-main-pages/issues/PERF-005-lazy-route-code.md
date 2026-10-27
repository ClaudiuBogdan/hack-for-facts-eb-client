# PERF-005: The page's own route code is never preloaded; on mobile it starts ≈5.6 s after the entry and adds a 0.8–4.7 s serial step before hydration

## Summary

Each page's component code lives in a `.lazy.tsx` route file. TanStack Start's manifest maps chunks to routes
only through `?tsr-split=` module ids, so `createLazyFileRoute` chunks never get a `modulepreload` in the SSR
HTML. The browser requests the page's own code only after the catalogs have arrived ([PERF-004](PERF-004-catalogs.md)) and the
entry has been evaluated. On mobile that request goes out 5.5–5.8 s after the entry has downloaded (deployed; 5.5–6.0 s local), and the
route's chunk wave then takes another 0.8–4.7 s before React can hydrate.

## Where

- **Domains:** all 16 audited pages.
  - `/ngos` is no exception. Its one manifest preload is `ngos-*.js`, the 460 B layout `Outlet` chunk, and the
    hub's own `ngos/index.lazy.tsx` code is not preloaded (the ngos report found this; the home report first counted 15 of 16).
- **Manifest:** `.output/server/_tanstack-start-manifest_v-*.mjs` has 35 entries with preloads. One of them is
  `__root__` (136 preloads), so 34 of the 191 other routes have any.
  - None for `/`, `/companies/`, `/national-budget/`, `/entity-analytics`, `/map`, `/ins/`, `/alegeri/`,
    `/parlament/`, `/legislation/`, `/pnrr`, `/primarie/` and `/public-enterprises/`.
  - One each for `/ngos`, `/procurement` and `/justice`, for their layout routes only (460–545 B `Outlet`
    chunks).
- **Mechanism:**
  `node_modules/@tanstack/start-plugin-core/dist/esm/vite/start-manifest-plugin/normalized-client-build.js:70-88`.
- **Route files:** 132 `src/routes/**/*.lazy.tsx`.
  - Home: `src/routes/index.lazy.tsx:4`.
  - National budget: `src/routes/national-budget.index.lazy.tsx`.
  - Companies: `src/routes/companies.index.lazy.tsx`.
  - Entity analytics: `src/routes/entity-analytics.lazy.tsx`.
  - Map: `src/routes/map.lazy.tsx`.

## Evidence

Mobile cold, deployed (`tools/shared-metrics.py deployed mobile`; the route wave counts the same-origin JS requested after
the catalogs end and before hydration):

| page | entry done | route code requested | route wave (files, KiB zstd) | hydration shell |
|---|---:|---:|---|---:|
| `/` | 11.9 s | 17.6 s | 20 files, 120 KiB | 19.4 s |
| `/national-budget` | 10.8 s | 16.5 s | 10, 57 | 17.8 s |
| `/entity-analytics` | 10.7 s | 16.4 s | 69, 289 | 19.4 s |
| `/map` | 10.8 s | 16.4 s | 107, 535 | 21.5 s |
| `/charts` | 10.7 s | 16.3 s | 45, 113 | 18.0 s |
| `/companies` | 10.8 s | 16.3 s | 21, 109 | 18.0 s |
| `/ngos` | 10.8 s | 16.3 s | 21, 111 | 18.0 s |
| `/procurement` | 10.8 s | 16.5 s | 26, 127 | 18.3 s |
| `/justice` | 10.8 s | 16.3 s | 27, 125 | 18.1 s |
| `/public-enterprises` | 10.7 s | 16.4 s | 23, 118 | 18.1 s |
| `/alegeri` | 10.8 s | 16.4 s | 12, 26 | 17.4 s |
| `/parlament` | 12.2 s | 17.9 s | 39, 142 | 19.9 s |
| `/ins` | 10.8 s | 16.2 s | 20, 106 | 17.9 s |
| `/legislation` | 12.5 s | 18.1 s | 16, 74 | 19.6 s |
| `/pnrr` | 10.8 s | 16.3 s | 41, 143 | 18.3 s |
| `/primarie` | 10.7 s | 16.3 s | 16, 77 | 17.8 s |

On every page, the route code is requested **5.5–5.8 s after the entry** (local: 5.5–6.0 s), and the route wave
takes 0.8–4.7 s. The domain agents' own measurements agree: 5,479–5,790 ms.

- **Domain reports:**
  - national-budget-6: a 1.04 s step.
  - companies-1: a 1.49 s step, with the lazy chunk 5,590 ms after the entry.
  - local-budgets: the route wave takes 1.5 s on `/charts`, 2.6 s on `/entity-analytics` and 4.7 s on `/map`.
- **Desktop:** the route code is requested 0.76–1.22 s after navigation start, 0.4–0.65 s after the entry has
  downloaded, and its wave takes 30–190 ms (`evidence/lead/phases-deployed-desktop.md`).
- **Local target:** the same shape (`tools/shared-metrics.py local mobile`).
- **Lab what-if** (lead; local build, mobile, 3 cold loads per variant; `evidence/lead/whatif/RESULTS.md`).
  The variant adds a `modulepreload` for every chunk the page loaded before hydration but did not preload:

  | page | hydration end, base → pre | FCP, base → pre |
  |---|---|---|
  | `/` | 19.70 → **18.24 s** (−1.46 s) | 8.89 → 11.83 s (**+2.94 s**) |
  | `/entity-analytics` | 20.46 → **18.08 s** (−2.39 s); LCP 20.42 → 18.06 s | 8.53 → 12.43 s (+3.90 s) |
  | `/national-budget` | 17.91 → **16.56 s** (−1.36 s) | 8.63 → 11.06 s (+2.43 s) |

  Late discovery of the route code costs 1.4–2.4 s of hydration; the catalogs end at about the same time in both
  variants ([PERF-004](PERF-004-catalogs.md)). On the emulated link, though, preloading from the head only moves the wait to
  first paint.

## Root cause

- The Start manifest's route → chunk mapping comes from the code-splitter's `?tsr-split=` ids. A
  `createLazyFileRoute` module is a plain dynamic import of the route's lazy file, so it has no entry.
- The SSR HTML therefore preloads only the root set ([PERF-003](PERF-003-root-preloads.md)).
- The router asks for the lazy chunk when it matches the route on the client, which happens after the entry
  (and the catalogs it waits for) has been evaluated.

## Proposed fix

1. Move each main page's component from `<route>.lazy.tsx` into `<route>.tsx`, and let the auto code-splitter
   split it. The resulting chunks are in the manifest. (`/ngos`'s split chunk is only its layout `Outlet`.)
2. Not as a plain head `modulepreload`: in the what-if that cost 2.4–3.9 s of FCP. If it goes in the head,
   give it `fetchpriority="low"`, or emit it after the stylesheet has loaded, and measure FCP.
3. Then check the SSR HTML: it should list the page's own chunk and its static dependencies.
4. Do the main pages first. Every hub has the same shape, so one pattern fixes all of them.
5. **Ship it together with the byte cuts** ([PERF-003](PERF-003-root-preloads.md), [PERF-004](PERF-004-catalogs.md)) and with the stylesheet
   ahead of the preloads ([PERF-002](PERF-002-css-first-paint.md)). On its own it trades first paint for hydration (see
   Evidence).

## Expected impact

- **Mobile, measured:** hydration 1.4–2.4 s earlier on `/`, `/national-budget` and `/entity-analytics` (lab).
  Up to ≈4 s on `/map` is an estimate; it was not tested. The catalogs end at about the same time in both
  variants ([PERF-004](PERF-004-catalogs.md)), so this gain belongs to the route code.
  Without byte cuts this costs 2.4–3.9 s of FCP on the emulated link. A link that honours priorities would give
  the CSS precedence, which the lab cannot show.
- **Desktop:** ≈50–100 ms.
- **Bytes:** no change. This fix is about order, not size.

## How to verify

1. **SSR HTML:** the modulepreload list of `/` and of each main page contains the page's own component chunk
   (the generated `?tsr-split=component` chunk once the component moves into the route file) and its
   dependencies.
2. **Lab what-if (done):** `tools/front-proxy-variant.mjs` rewrites the head and adds `modulepreload`s for
   every JS file the page loaded before hydration but did not preload. That covers the catalogs, their static
   dependencies and the route wave. It ran on the local build, mobile cold, under the lock (`tools/whatif.sh`);
   results are in `evidence/lead/whatif/RESULTS.md`. Re-run it against the fixed build to see both milestones
   move.
3. **After the fix:** re-run `tools/perf-run.mjs --profile mobile` on `/` and `/entity-analytics`. "Route code
   requested" (`tools/shared-metrics.py`) should sit inside the first wave.

## Owner

client

## Severity

**P1**: it costs more than 1 s of mobile time to interactive on most pages, and it hits most domains.

Not in the prior docs; new.
