# Home — `/` (and the shared causes)

Subagent report, 2026-10-27 main-page audit. Code at dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/home/{deployed,local}/home-{desktop,mobile}/`; chunk and trace analysis (scripts +
outputs) in `evidence/home/analysis/`. Build analysed: the local production build (source maps from the
Sentry artifact copy; same CSS and entry size as deployed, file names differ by Sentry debug IDs).

## 1. Entry point

- `/` is the site root: the sidebar brand links to it (`src/components/sidebar/logo.tsx:18`). No other
  spelling (`/index` → 404). `?lang=en` renders the same route (its own Nitro cache key, see home-S8).
- Route: `src/routes/index.tsx` (head + cache headers, no loader) + `src/routes/index.lazy.tsx`
  (component `src/features/landing/components/landing-page.tsx`). No SSR data: the one served figure
  (institution count) is fetched in the browser by design (`src/features/landing/hooks/use-institution-count.ts:14-17`).

## 2. Numbers (medians of 3; harness TTFB; LCP element = hero `h1` „Date publice, decizii informate" on every run)

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB (transfer / decoded) | API (preflights) | HTML KB (transfer / decoded) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 89 | 468 | 468 | 0 | 266 | 992 / 1098 | 229 | 3382 | 2209 / 6472 | 1 (1) | 45 / 239 |
| deployed | desktop | warm | 1 | 204 | 204 | 0 | 0 | 411 / 481 | 227 | 5 | 0 / 6472 | 1 (0) | 0 / 239 |
| deployed | mobile | cold | 95 | 7672 | 7672 | 0.001 | 1638 | 19378 / 19807 | 228 | 3291 | 2210 / 6472 | 1 (1) | 45 / 239 |
| deployed | mobile | warm | 2 | 256 | 256 | 0 | 929 | 1470 / 1776 | 227 | 5 | 0 / 6472 | 1 (1) | 0 / 239 |
| local | desktop | cold | 9 | 312 | 312 | 0 | 267 | 764 / 875 | 227 | 3263 | 2095 / 6441 | 1 (1) | 45 / 239 |
| local | desktop | warm | 1 | 160 | 160 | 0 | 0 | 358 / 433 | 225 | 5 | 0 / 6441 | 1 (0) | 0 / 239 |
| local | mobile | cold | 8 | 8940 | 8940 | 0.001 | 1544 | 19280 / 19679 | 226 | 3172 | 2095 / 6441 | 1 (1) | 45 / 239 |
| local | mobile | warm | 1 | 264 | 264 | 0 | 909 | 1399 / 1693 | 225 | 4 | 0 / 6441 | 1 (1) | 0 / 239 |

- 212–213 JS files on every load; mobile cold `load` 17.5 s, last React commit 24.8 s (Clerk).
- Warm views get the HTML from the browser cache (`max-age=3600`, home-S8): FCP 0.2–0.26 s.
- Mobile document: TTFB 586 ms incl. the emulated 562 ms RTT; Cloudflare `cfOrigin` 26–33 ms (the pod
  serves `/` from its Nitro cache). Desktop runs are the plain-Chrome-UA re-runs (the first ones used
  `HeadlessChrome`, i.e. the crawler path of home-S11).

## 3. Waterfall (deployed, mobile, cold, run 2: `evidence/home/deployed/home-mobile/run2-cold.json`)

1. 0–824 ms document (46 KB zstd / 245 KB).
2. 685–720 ms the head starts everything at once: 2 image preloads (logo PNG 202 KB, funky-logo 46 KB),
   the CSS (72 KB), **136 `modulepreload`s** (1.17 MB) and the font preload (350 KB).
3. 7,404 ms CSS done → **FCP = LCP 7,672 ms** (hero `h1`, fallback font; Inter arrives 12,466 ms).
4. 11,997 ms the last of the 137 early chunks (entry 265 KB zstd) → 12,027 ms the browser discovers the
   **6 Lingui catalogs** (552 KB) + 45 small static deps → 16,248 ms.
5. 16,273 ms **1.32 s module-evaluation task** (≈0.5 s of it zod building schemas, home-S1).
6. 17,697 ms the router asks for the home's own route code (20 scripts, ≈123 kB / 120 KiB: `index.lazy` 44 KB,
   `landing-search` 45 KB, …), never preloaded (home-S3) → 19,236 ms.
7. 19,463 ms hydration shell, 19,922 ms hydration end (473 ms task, 156 ms forced style/layout).
8. After: 19,346 ms clerk-js 91 KB → 3 Clerk FAPI calls 21.2–22.4 s → 4 Clerk chunks 214 KB → 24.8 s;
   19,788 ms the one API call (preflight 85 ms + 721 ms); 17,646 ms favicon `/logo.png` 202 KB.

Desktop (deployed run 2): CSS 89–165, entry 89–423, catalogs 447–538, route code 896–935, hydration 992 ms,
Clerk 968–1,760, API 1,085 + 715 ms.

## 4. API calls

| operation | where | start (mobile / desktop, deployed) | duration | size | chained after |
|---|---|---|---|---|---|
| `EntityAnalytics` (landing institution count, `limit: 1`) | browser, `auth: 'none'` | 19,788 / 1,085 ms (after hydration) | 721 / 715 ms; API-side 589–715 ms (median ≈ 657, n=21, proxy log) | 864 B (313 B body) | nothing; 1 preflight (85 / 100 ms) |

- SSR: **none**, on the cold render too (proxy log has no server call for `/`; local `ssrApiCalls: []`).
  An uncached render of `/` takes 25–55 ms (curl, unique query string), a Nitro-cache hit 7–10 ms.
- Not our API but on every page: Clerk FAPI `dev_browser` → `environment` + `client` (home-S6).

---

## Shared causes

Every page pays these. Numbers are from `/`; other agents add theirs. "All" = all 16 pages in
`tools/pages.txt` unless said otherwise.

### home-S1 — The root preloads ~5 MB of JS on every page: captured vendor groups, other domains' route code, PNRR CSV data

- **Numbers.** The root route's manifest entry lists 136 `modulepreload`s (all in the HTML head) = 3.56 MB raw,
  ≈1.17 MB zstd measured (deployed mobile: the 137 chunks requested before 1 s). With the 6 catalogs of
  home-S2: 142 chunks, 5.10 MB raw before hydration can start. Breakdown by source (source-map attribution,
  `evidence/home/analysis/root-preload-breakdown.txt`): catalogs 1,421 KB · recharts group 448 · PNRR CSV
  data 318 · Sentry 309 · PostHog 221 · react+react-dom 186 · Clerk 151 · `src/schemas` 146 · MDX challenge
  content 143 · shell+core 126 · router/start 125 · UI libs 110 · challenge section metadata 99 ·
  other-domain feature code ≈ 400 (private-companies 85, statistics 68, campaigns 38, procurement 37,
  challenges 35, ngos 25, learning 22, legal 18, justice 17, pnrr 16, …) · route table 71 · table+virtual 70.
  Mobile: the early wave ends at 12.0 s; the evaluation task is 1.32 s (deployed) / 0.93 s (local trace).
  Desktop: traced evaluation tasks ≈192 ms deployed and 203 ms local; batch task medians 316 and 317 ms. In the local mobile trace, **zod self time is 494 ms of that 930 ms task**, called
  from schema chunks of parliament, advanced-map-analytics, charts, legal, company-analytics,
  private-company-api, procurement, ins-queries, entities… (`evidence/home/analysis/mobile-eval-zod-callers.txt`).
  Entry chunk (932 KB raw) by source: react-dom 175 KB, a **challenge-step section metadata object 88 KB**,
  `routeTree.gen.ts` 73 KB, router-core 46 KB, sonner 33 KB, challenges/campaigns/ngos/learning/statistics
  code 20–28 KB each (`evidence/home/analysis/entry-chunk-by-file.txt`).
- **Cause 1 — chunk groups capture shared dependencies.** `vite.config.ts:90-128` + `:358-369` put
  recharts, clerk, sentry, posthog, tanstack and MDX content into named groups. Rolldown turns
  `manualChunks` into `codeSplitting.groups`, whose `includeDependenciesRecursively` defaults to `true`
  (`node_modules/rolldown/dist/shared/define-config-DSMNXceb.d.mts:1164-1177`): each group swallows its
  members' dependencies. Result in the build: **`react` lives in `clerk-*.js`** (36 root chunks import it
  from there), **`react/jsx-runtime` lives in `challenge-step-content-en-*.js`** (25 root chunks import it;
  so every page downloads the English challenge MDX, 186 KB raw), **`use-sync-external-store/with-selector`
  lives in `recharts-*.js`** (imported by the router's `useStore`, `@tanstack/react-store/dist/esm/useStore.js:2`,
  so the router pulls the 463 KB recharts chunk), and react-query sits with table-core + virtual-core (70 KB).
- **Cause 2 — eager route files.** Auto code-splitting moves only `component`-type keys out; every route
  file's `head`/`loader`/`loaderDeps`/`validateSearch`/`beforeLoad` and their imports stay in the entry graph
  for all 192 routes. Examples: `src/routes/pnrr.tsx:8-12` → `pnrr-seo.ts:11-15` → `data-transform.ts:22-26` →
  `pnrr-uat-assignment.ts:1,4`, which inlines two `?raw` CSVs (`data-transform-*.js`, 345 KB raw / 108 KB zstd;
  the chain is confirmed in the pnrr report, pnrr-2); `src/routes/primarie/$cui/buget/provocari/$moduleSlug/$challengeSlug/$stepSlug.tsx:9`
  → `src/features/challenges/utils/challenge-step-content-resolver.ts:7` → `virtual:challenge-step-section-metadata`
  (`config/challenge-step-sections-plugin.ts`, 88 KB in the entry); `src/routes/companies.$cui.tsx:2`
  (private-company-api, 52 KB); `src/routes/ins/index.tsx:3` (statistics-api); `src/routes/achizitii/cautare.tsx:2`
  (procurement-hub schemas). Every zod schema those files reach is constructed at module evaluation.
- **Cause 3** — Sentry, PostHog, Clerk imported statically by the shell (home-S6, home-S7).
- **Fix.** (a) Drop the vendor/content `manualChunks` (or set `includeDependenciesRecursively: false` with the
  `strictExecutionOrder` the rolldown docs ask for, or give react/jsx-runtime/use-sync-external-store their
  own higher-priority group) and check that recharts and the MDX content leave the root list. (b) Keep route
  files thin: no feature/API/data imports in `head`/`validateSearch`; move SEO builders and search schemas to
  small modules; consider `codeSplittingOptions` to split `loader`. (c) Never import `?raw` data into a module
  an eager file reaches. (d) Build zod schemas lazily (inside functions) in shared schema modules.
- **Gain (estimate).** Recharts 128 + PNRR data 110 + MDX content 24 + table/virtual ≈19 ≈ **280 KB zstd
  less on every first visit (≈1.5 s on Slow 4G)**, ~0.5 s less main thread on mobile (zod, data-transform
  53 ms, recharts 35 ms), more as route files are trimmed.
- Owner client · **P1** · shared: all · known in `docs/entity-page-ssr-loading.md:136-139` (sizes listed;
  the causes above are new).

### home-S2 — Both languages' catalogs (+ admin, + PNRR) are static imports, found only after the entry is parsed

- **Numbers.** 6 files on every page: `messages` en 235 KB + ro 243 KB, `admin` en/ro 22 + 25 KB, `pnrr`
  en/ro 13 + 14 KB = **552 kB zstd / 1.49 MB (1.42 MiB) raw**. Not in the modulepreload list, so requested only when the
  module graph is walked: mobile 12,027 → 16,248 ms (**+4.2 s serial step** before evaluation can start),
  desktop 447 → 538 ms. Only `ro/messages` (243 KB) is needed on a Romanian page, plus `ro/pnrr` on `/pnrr`
  (`src/lib/i18n.tsx:131-146`); 309 KB are dead weight (≈295 KB on `/pnrr`).
- **Cause.** `src/lib/i18n.tsx:22-44`: `import.meta.glob(..., { eager: true })` for all three catalogs, chosen
  at runtime by `import.meta.env.SSR` (`:46-57`). The eager globs still compile to bare static imports in
  the client build — `utils-*.js` (i18n + utils) starts with `import"./messages-….js"` ×2, `import"./admin-…"`
  ×2, `import"./pnrr-…"` ×2 — and each catalog runs `JSON.parse` of its whole string at load.
- **Fix.** Keep the eager globs out of the client graph (a server-only module, `createServerOnlyFn`, or a
  `?ssr`-gated import), and load only the active route's locale catalogs. Longer term: per-route catalogs.
- **Gain (estimate).** The removed bytes: −309 kB per first visit on ordinary Romanian main pages, ≈−295 kB on
  `/pnrr` (≈1.6–1.7 s transfer); desktop ≈100 ms.
  Lead correction after the what-if (PERF-004): preloading the catalogs earlier from the head did not remove
  the 4.2 s transfer step, and it delayed FCP.
- Owner client · **P1** · shared: all · known in `docs/entity-page-ssr-loading.md:138` („two Lingui catalogs
  ~615KB"); the static-import mechanism is new.

### home-S3 — `.lazy.tsx` route code is never preloaded in the SSR HTML

- **Numbers.** Home: the route's 20 scripts (≈123 kB: index.lazy 44 KB + landing-search 45 KB zstd + 18 small) are
  requested at 17,697 ms on mobile, after evaluation, done 19,236 ms → hydration 19,463 ms (**≈1.5 s serial
  step**); desktop 896 → 935 ms. The manifest has preload entries for 35 routes only; `/` has none.
- **Cause.** TanStack Start's manifest maps chunks to routes only through `?tsr-split=` module ids
  (`node_modules/@tanstack/start-plugin-core/dist/esm/vite/start-manifest-plugin/normalized-client-build.js:70-88`);
  `createLazyFileRoute` files have none. 132 `.lazy.tsx` route files. **All 16 audited pages lack preloads for
  their main-page component code**; `/ngos`, `/procurement` and `/justice` preload only a layout `Outlet` chunk
  (lead correction; the ngos report found it).
- **Fix.** Move the component into the route file (auto code-split) or add the route chunk to the route's
  `head` links; then verify the HTML carries it.
- **Gain (estimate).** Mobile ≈1–1.5 s earlier hydration on `/` (more where the route chunk is bigger);
  desktop ≈50–100 ms.
- Owner client · **P1** · shared: all 16 pages · new.

### home-S4 — First paint waits for the CSS, which shares the pipe with ~2 MB of preloads

- **Numbers.** The only render-blocking resource is the CSS (72 KB zstd / 533 KB). On mobile it takes
  686 → 7,404 ms because it downloads alongside 136 modulepreloads, the font preload and 2 image preloads
  (≈1.2 MB moved in that window; the CSS got ~6 % of it) → **FCP/LCP 7.67 s deployed, 8.94 s local** (h2 via
  the front proxy); desktop 468 / 312 ms. Alone after the HTML, the CSS would need ≈0.4 s + 1 RTT.
- **Caveat.** DevTools throttling splits bandwidth between in-flight requests without honouring HTTP/2/3
  priorities, so 7.7 s is an upper bound; a real phone's result depends on Cloudflare's prioritisation.
  The bytes are real either way: 1.87 MB zstd of JS must arrive before hydration (≈10 s at 184 KiB/s).
- **Cause.** The volume of high-priority preloads (home-S1/S2), the 350 KB font preload (`src/routes/__root.tsx:146-156`),
  and React 19 hoisting `<link rel=preload as=image>` for every non-lazy `<img>` above the stylesheet (home-S5).
- **CSS itself.** 6,763 rules, 760 `@supports` colour-mix fallbacks, 143 KB of arbitrary-value rules, 76 KB
  dark-mode rules; one file for the whole app (Tailwind v4 scanning `./src/**/*`, `tailwind.config.js:6`). Size
  is a secondary cost (≈0.4 s on Slow 4G); the contention is the main one.
- **Fix.** Cut the preloads (home-S1/S2/S5); consider `fetchpriority="low"` on non-entry modulepreloads or
  emitting only the entry + route chunks; measure on a priority-honouring throttle (WebPageTest/real device).
- **Gain (estimate).** Up to ≈5–6 s of FCP/LCP on emulated Slow 4G; real devices less.
- Owner client · **P1** (mobile) · shared: all · new.

### home-S5 — 400 KB of logo PNGs and a 350 KB unsubsetted font on every first visit

- **Numbers.** `src/assets/logo/logo.png` is 415×395 RGBA, **201 KB**, displayed at 16–20 px in the sidebar
  (`src/components/sidebar/logo.tsx:4`), footer, mobile dock and landing; React preloads it in the head of
  every page. The favicon `/logo.png` is the same 201 KB file under another URL (`src/routes/__root.tsx:225`),
  `max-age=14400`. Inter variable woff2 349 KB, preloaded on every page, `font-display: swap`
  (`src/styles/fonts.css:2-10`), served from `public/` with `max-age=14400` (not hashed, not immutable). On
  mobile the font ends at 12.5 s, after FCP (swap, CLS 0.001).
- **Fix.** SVG or a 64 px WebP for the mark (≈2–5 KB), a 32/48 px favicon; subset Inter to Latin + Latin
  Extended-A + U+0218–U+021B (Romanian ȘșȚț) and import it through Vite for a hashed, immutable URL; preload only that subset.
- **Gain (estimate).** ≈−395 KB images and ≈−200 KB font per first visit (subset size to be measured) →
  ≈3 s less transfer on Slow 4G, part of it inside the FCP window.
- Owner client · **P2** · shared: all · new.

### home-S6 — Clerk (development instance) loads for every visitor, and browser API reads wait for it

- **Numbers.** `ClerkProvider` mounts on the client only (`src/lib/auth/index.tsx:189-207`), so clerk-js starts
  after hydration: mobile 19.35 s → `dev_browser`, `environment`, `client` FAPI calls 21.2–22.4 s → 4 UI
  chunks to 24.8 s = **308 KB zstd / 1.04 MB decoded / ≈270 ms main thread** (mobile; ≈60 ms desktop,
  0.97–1.76 s). The FAPI is a `*.clerk.accounts.dev` host (a `pk_test` development instance; the
  `dev_browser` handshake exists only there). It does not block FCP/LCP/hydration on `/`.
- **The cost that matters elsewhere.** `graphqlQuery` defaults to `auth: 'optional'` and awaits
  `getAuthToken()` → `waitForClerk()`, which polls every 50 ms until Clerk `isLoaded` (10 s cap)
  (`src/lib/graphql/graphql-client.ts:150-157`, `src/lib/auth/index.tsx:353-395`); the legacy
  `graphqlRequest` does the same unless `skipAuth` (`src/lib/api/graphql.ts:122`, 2 callers use it). From the
  home timings, Clerk is ready ≈22.4 s on mobile (≈2.9 s after hydration) and ≈1.56 s on desktop (≈0.46 s
  after): **any browser read issued at hydration without `auth: 'none'` waits that long**. Callers without
  it: all 11 procurement API files, justice (4 files), pnrr (`pnrr-api.live.ts`, 22 call sites), parliament agenda/
  speeches/stenograms and 25 of 27 `graphqlQuery` call sites in `parliament-api.live.ts`, private-companies registry + profile,
  and the legacy transport (entities, charts, datasets, commitments, data discovery). Home's own call uses
  `auth: 'none'` and is not delayed.
- **Fix.** Default public reads to `auth: 'none'` (attach a token only where the server needs one); load
  Clerk lazily (auth routes, signed-in cookie present, or first interaction); use a production Clerk
  instance on dev-chronos if it is meant to mirror production.
- **Gain (estimate).** Up to ≈2.9 s (mobile) / ≈0.5 s (desktop) on the first browser read of affected pages;
  −308 KB / −270 ms main thread for anonymous visitors.
- Owner client (+ infra for the instance) · **P1** (provisional: the domain agents measure the chains) ·
  shared: procurement, justice, pnrr, parliament, companies, local budgets (legacy transport) · new.

### home-S7 — Sentry (with Replay and Feedback) and PostHog ship to every visitor, consent or not

- **Numbers.** `sentry-*.js` 327 KB raw / 112 KB zstd (Replay 125 KB + Feedback 39 KB raw), `posthog-*.js`
  227 KB / 77 KB zstd, both root preloads. Init is consent-gated (`src/components/app/app-shell.tsx:65-71`,
  `src/lib/analytics.ts:108-118`) but the code is static: `src/client.tsx:7,34` → `src/lib/sentry.ts:1,9-13,293,331`;
  `app-shell.tsx:4-5`, `analytics.ts:2`. Evaluation is cheap (≈5 / 27 ms mobile); the cost is bytes.
- **Fix.** Import PostHog and Sentry dynamically once consent exists; keep only a tiny error-handler stub
  for `hydrateRoot`; Sentry's `lazyLoadIntegration` for Replay/Feedback.
- **Gain (estimate).** ≈−190 KB zstd per first visit (≈1 s on Slow 4G).
- Owner client · **P2** · shared: all · known in `docs/entity-page-ssr-loading.md:138-139` (sizes).

### home-S8 — HTML caching: Cloudflare ignores it, Nitro's route cache rewrites it and drops the cookies the page renders from

- **Cloudflare.** Every HTML response is `cf-cache-status: DYNAMIC`; `s-maxage`/`CDN-Cache-Control` are unused
  without a cache rule (known in `docs/entity-page-ssr-loading.md:129-131`).
- **Browser.** `/` asks for `max-age=3600` (`src/routes/index.tsx:12-17`); the root sends `no-store`
  (`src/routes/__root.tsx:61`) and other routes `max-age=0` (`src/lib/http-cache.ts:8`). Repeat views of `/`
  paint in 0.2–0.26 s from cache; after a deploy a returning visitor keeps running the previous build's HTML
  for up to an hour (its not-yet-fetched lazy chunks must still exist, or `src/lib/chunk-recovery.ts` reloads).
- **Nitro route cache** (`nitro.config.ts:24-45`: `/`, `/entities/**` (dead by accident, known),
  `/entity-analytics`, `/map`, `/budget-explorer`), in-memory in production:
  1. It **overwrites `Cache-Control`** with `public, max-age=<maxAge>, s-maxage=<maxAge>` (h3
     `handleCacheHeaders`, `node_modules/h3/dist/h3.mjs:1854`, called from `node_modules/ocache/dist/index.mjs:333`):
     `/map` and `/entity-analytics` reach browsers as `max-age=300` although their routes ask for 0 (seen on
     both targets).
  2. It **strips the `varies` headers from the request it renders** (`ocache/dist/index.mjs:271-277` keeps every
     header *except* those in `varies`) while hashing them into the key. With `varies: ["cookie"]` the render
     never sees `user-locale`/`ui-theme`: `/`, `/map`, `/entity-analytics` always render `lang="ro"
     class="light"` (curl with those cookies, both targets; non-cached routes honour them). In a browser
     with `user-locale=en`, the server `h1` node is discarded and replaced on the client (hydration
     mismatch → client render), while without the cookie it is kept (agent-browser probe, deployed).
  3. One entry per distinct Cookie header, all in pod memory. Fresh/stale windows (`maxAge`/`staleMaxAge`, s):
     `/` 3600/604800, `/entities/**` and `/entity-analytics` 300/86400, `/map` 300/3600, `/budget-explorer`
     3600/86400; identical bodies multiplied by every cookie combination.
  4. The cached handler buffers the whole body (`ocache/dist/index.mjs:283`): no streaming on a miss.
  For `/` the cache saves ≈30 ms (miss 25–55 ms, hit 7–10 ms, local).
- **Fix.** Drop the Nitro rule for `/` (or use `varies: []` and render cookie-free HTML, applying
  theme/locale on the client before paint), set `cache-control` explicitly after the cached handler or move
  caching to Cloudflare with a cache rule that bypasses on locale/theme cookies; shorten `/`'s browser max-age
  or rely on revalidation.
- Owner client + infra · **P2** (correctness for EN/dark visitors, memory) · shared: `/`, `/map`,
  `/entity-analytics`, `/budget-explorer` (+ all pages for the Cloudflare part) · partly known.

### home-S9 — CORS preflights without `Access-Control-Max-Age`

- **Numbers.** The API answers `OPTIONS` with no `Access-Control-Max-Age` (curl), so Chrome keeps each
  preflight 5 s. Home: 1 preflight per load (deployed: 100 ms desktop; 54–102 ms mobile). Visible in the
  data: desktop repeat view 0 preflights (within 5 s of the cold load), mobile repeat view 1 (the cold load
  lasted 25 s). **Mobile is under-reported:** DevTools throttling does not delay the `OPTIONS` (85 ms vs ≥562 ms
  for every other request), so on a real Slow 4G link each preflight costs ≥1 RTT (≈560 ms) before its POST.
- **Cause.** Server: `@fastify/cors` registered without `maxAge` (`hack-for-facts-eb-server/src/app/build-redesign-app.ts:288-311`).
  Every client POST with `Content-Type: application/json` needs a preflight (`src/lib/graphql/graphql-client.ts:162-171`).
- **Fix.** `maxAge: 7200` (Chrome's cap) on the CORS plugin; optionally GET/persisted queries for public reads.
- **Gain.** Matching cached preflight permissions are reused for up to 2 h instead of 5 s (concurrent cold
  requests can still issue more than one): ≈1 RTT per later burst (≈0.1 s desktop, ≈0.5 s real mobile).
- Owner **server** · **P2** (P1 if the domain counts show many) · shared: every page with browser API calls · new.

### home-S10 — Server-side caches: what makes later SSR renders free

- **Per request:** the router's QueryClient is new for every request (`src/router.tsx:11`); nothing is
  shared through it.
- **Whole-page:** the Nitro route cache of home-S8 (`/`, `/entity-analytics`, `/map`, `/budget-explorer`):
  1 h or 5 min fresh, stale-while-revalidate, per path+query+cookie, until the pod restarts.
- **Module-level promise caches** in feature API modules, shared by every request and user for the pod's
  lifetime: procurement `procurement-api.live.ts:79-80` (CPV divisions, no TTL; `partyNameCache` grows
  without bound), `procurement-reference-api.ts:50`, `procurement-cutoff.ts:16,29` (10 min); parliament
  `parliament-api.live.ts:156,446,851`, `api/graphql/vote-summary-cache.ts:19-26`; public enterprises
  `authority-portfolio-server.ts:12`; budget `lib/analytics-utils.ts:13-16`. Except the cutoff, these never
  expire or listen to an API data release. PNRR's caches do expire (1 h; the SEO loader refreshes in the
  background, the raw files serve stale only on error; see PERF-010).
- **Deployed pod:** same code, same behaviour (`/` last-modified ≈10 min old at probe time, `cfOrigin` 26–33 ms).
- **Home:** no SSR API calls even cold; cold render 25–55 ms, warm hit 7–10 ms.
- Owner client · **P3** (observation; staleness risk) · shared: procurement, parliament, public enterprises,
  pnrr, local budgets.

### home-S11 — Crawler path

`src/server.ts:27` → `renderRouterToStream` waits for `stream.allReady` when `isbot(User-Agent)`
(`node_modules/@tanstack/react-router/dist/esm/ssr/renderRouterToStream.js:31`): bots, curl and headless Chrome's
default UA get the fully resolved render with TTFB = full render time; browsers get the stream. On Nitro-cached
routes the body is buffered for everyone anyway (home-S8). · info · shared: all.

### Also seen (P3, shared)

- Cloudflare Web Analytics beacon injected on deployed only: 10 KB, 46 ms main thread on mobile, plus a
  `/cdn-cgi/rum` POST (infra).
- `@clerk/localizations` ro-RO (65 KB raw) ships in the root set even when Clerk never loads.

---

## Home-specific candidates

### home-1 — English and dark-theme visitors get a Romanian/light page that React throws away

- **Numbers.** With `user-locale=en`, `/` serves `lang="ro"` HTML; the client activates `en` before
  `hydrateRoot` (`src/client.tsx:13-20`), the hero `h1` node is replaced (probe: `sameH1Node: false`), i.e. a
  client render of the tree after a full download; without the cookie the node is kept. Same for `ui-theme=dark`
  (SSR `class="light"`).
- **Cause.** home-S8 (2): `nitro.config.ts:24-30` `varies: ["cookie"]` + ocache stripping the varied header.
- **Fix.** As home-S8.
- **Gain.** Removes a full client re-render (and the Romanian flash) for EN/dark visitors; not in the medians
  (harness has no cookies).
- Owner client · **P2** · shared? yes (`/map`, `/entity-analytics`) · new.

### home-2 — The landing's route code: 20 late chunks, a second headless-UI library for the search

- **Numbers.** `index.lazy` 118 KB raw (16 KB of it the scraper dataset registry, `src/lib/scraper-references/catalog.ts`,
  via `getPlatformCoverage`), `landing-search` 125 KB raw / 45 KB zstd, of which ≈100 KB is `@base-ui/react`
  combobox + floating-ui (the rest of the app uses Radix). Requested only after evaluation (home-S3):
  +1.5 s mobile.
- **Fix.** home-S3; render the search as a plain input on SSR and load the combobox on focus/idle.
- **Gain (estimate).** ≈45 KB zstd off the hydration path (≈0.25 s Slow 4G) plus ~50 ms mobile main thread.
- Owner client · **P2** · shared? no.

### home-3 — Hydration task: 473–594 ms on mobile, a third of it forced layout

- **Numbers.** Mobile hydration task 473 ms (deployed) / 594 ms (local trace), 156–177 ms `UpdateLayoutTree`;
  `index.lazy` self time 203–238 ms in that task; desktop 47 ms. Mobile TBT 1,638 ms is mostly the
  evaluation task (home-S1), then this one.
- **Cause.** Landing effects that measure geometry on mount: `usePanelTilt`, `useCanvasFieldMotion`,
  `useScrollLight`, `useRevealOnView`, `usePictureReveal`, `useSectionLight` (`landing-page.tsx:141-155`), and
  the count-up/scramble loops.
- **Fix.** Start them after first idle / first scroll, batch reads before writes, defer the
  non-hero ones until their section nears the viewport (profile per hook first; the pixel field already
  bails below 1800 px and on reduced motion).
- **Gain (estimate).** 150–300 ms of mobile TBT.
- Owner client · **P3** · shared? no.

### home-4 — The landing hoists two image preloads above the CSS

- **Numbers.** The head starts with `preload as=image` for `logo-*.png` (202 KB, home-S5) and
  `funky-logo-*.png` (46 KB, 56 px, in `CampaignLandingShareCard` at the very bottom,
  `src/features/campaigns/buget/components/CampaignAccessShareCard.tsx:4`) — both requested at 685 ms on
  mobile, competing with the CSS (home-S4).
- **Fix.** `loading="lazy"` on below-the-fold images (React then does not preload them); a small logo.
- **Gain (estimate).** ≈250 KB out of the FCP window on mobile.
- Owner client · **P2** · shared? partly (logo: all pages).

### home-5 — The landing count query takes ≈650 ms at the API for one number

- **Numbers.** `EntityAnalytics` with `limit: 1` (only `pageInfo.totalCount` is used,
  `use-institution-count.ts:19-32`): API time 589–715 ms (proxy log, n=21), 313 B body; below the fold, no LCP
  impact.
- **Fix.** Server: cheaper count path (or a cached coverage figure). Client: fine as is (`auth: 'none'`,
  1 h stale time).
- Owner **server** · **P3** · shared? no.

### home-6 — Heavy HTML for a landing page

- **Numbers.** 245 KB decoded / 46 KB zstd: 49 KB of inline `<style>` (9 CSS-in-JS blocks,
  `landing-page.tsx:174-182`), 72 KB inline SVG (73 SVGs, one 40 KB `<defs>` of gradients), 1,494 DOM nodes
  (1,627 desktop), a base64 people-band portrait in `index.lazy`.
- **Fix.** Move the landing styles into the stylesheet or a static CSS file; reference the gradient defs
  from a static SVG.
- **Gain.** Small (≈0.1–0.2 s parse on mobile); polish.
- Owner client · **P3** · shared? no.

## Not checked / open questions

- Real-network FCP: the 7.7 s mobile FCP is DevTools-throttled (no priorities). Worth one WebPageTest or
  real-device run before ranking home-S4.
- Production (`transparenta.eu`) Clerk instance and cache settings (out of scope).
- Whether old hashed chunks stay fetchable after a deploy (asset retention in the image/CDN).
- Nitro cache memory on the deployed pod (not observable from outside).
- The zod attribution is sampled and chunk-level; which schemas cost most needs a per-function profile.
- 283 KB of the root set is unmapped (module glue, `__vite__mapDeps` arrays, Sentry debug-ID snippets).
- Subset font size not measured; the ≈200 KB saving is an estimate.
