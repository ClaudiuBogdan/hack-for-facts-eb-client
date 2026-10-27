# Elections: `/alegeri`

Subagent report, 2026-10-27 main-page audit. Code at dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/elections/{deployed,local}/alegeri-{desktop,mobile}/` (harness ran with `--people`: no
screenshots, no saved HTML). Scripts and the one API probe: `evidence/elections/analysis/`.

**Headline.** The page is broken on both targets. The client asks for `electionCatalog`, which the API
removed on 2026-10-21. Every visit makes 3 failing reads: 1 during SSR and 2 in the browser (`retry: 1`). It
ends on „Lista edițiilor nu s-a încărcat." at 19.8 s on mobile and 2.2 s on desktop. Apart from that, the
page is light: 26 KB of route code, a 189 ms hydration task on mobile and 85 KB of HTML. Its load time is the
shared root's (home-S1/S2/S3).

## 1. Entry point

- Sidebar „Alegeri" → `/alegeri` (`src/components/sidebar/nav-main.tsx:95`, `feature: "elections"`); the landing
  page links it too (`src/features/landing/lib/landing-groups.ts:151`). Flag on (`src/config/feature-flags.ts:13`).
- Other spellings (deployed, curl): `/alegeri/` → 307 to `/alegeri`; `/Alegeri` → 200, the same page
  (case-insensitive match, canonical `/alegeri`); `/elections` → 404. There is no English route.
- Routes: `src/routes/alegeri/route.tsx` (layout: `beforeLoad` is only the flag gate), `src/routes/alegeri/index.tsx`
  (search parser, SSR loader, `no-store` headers, head), `src/routes/alegeri/index.lazy.tsx` → component
  `src/features/elections/catalog/elections-catalog-page.tsx`. No maps or charts. There is one list (20 source
  editions per page) with a filter form and a pager.

## 2. Numbers (medians of 3; harness TTFB; LCP = the band lede `p.mt-3.max-w-[56ch]` „O ediție de sursă este…", every run)

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB (transfer / decoded) | API (preflights) | HTML KB (transfer / decoded) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 108 | 384 | 384 | 0.01 | 250 | 910 / 930 | 224 | 3237 | 2120 / 6233 | 2 (1) | 18 / 85 |
| deployed | desktop | warm | 66 | 204 | 204 | 0.01 | 87 | 400 / 410 | 222 | 24 | 0 / 6233 | 2 (0) | 18 / 85 |
| deployed | mobile | cold | 112 | 7268 | 7268 | 0.009 | 1301 | 17379 / 17503 | 220 | 2957 | 2120 / 6233 | 2 (1) | 18 / 85 |
| deployed | mobile | warm | 77 | 876 | 876 | 0.009 | 681 | 1948 / 2016 | 219 | 24 | 0 / 6233 | 2 (1) | 18 / 85 |
| local | desktop | cold | 106 | 388 | 388 | 0.01 | 227 | 768 / 786 | 222 | 3119 | 2007 / 6201 | 2 (1) | 17 / 85 |
| local | desktop | warm | 68 | 204 | 204 | 0.01 | 0 | 389 / 400 | 220 | 22 | 0 / 6201 | 2 (0) | 17 / 85 |
| local | mobile | cold | 91 | 8572 | 8572 | 0.009 | 1393 | 17161 / 17272 | 218 | 2843 | 2007 / 6201 | 2 (1) | 17 / 85 |
| local | mobile | warm | 89 | 972 | 972 | 0.009 | 685 | 2286 / 2356 | 217 | 22 | 0 / 6201 | 2 (1) | 17 / 85 |

- Both API calls fail on every load (section 4). The CLS (0.009–0.01) is the error state replacing the 8-row
  skeleton (source `form.mt-8…` on mobile and the footer on desktop, at 19.8 s and 2.2 s).
- Warm views refetch the HTML (`cache-control: no-store`, section 5, elections-4). Mobile warm document wait
  567–573 ms; FCP 876 ms vs 256 ms on `/`, which is served from the browser cache.
- Deployed `cfOrigin` 34–48 ms. The deployed pod's in-cluster SSR read is invisible, but its HTML carries the
  skeleton and loader data with only `seedKey` (one curl), so the SSR read fails there too.
- 207 JS files, 2.12 MB zstd / 6.23 MB decoded. 431–564 DOM nodes. Main thread on the mobile trace: 3.16 s busy;
  516 ms of it is the entry, plus 250 ms for Clerk.

## 3. Waterfall (deployed, mobile, cold, run 1 = median hydration: `evidence/elections/deployed/alegeri-mobile/run1-cold.json`)

1. 0–686 ms: document (18 KB zstd / 87 KB, `no-store`).
2. 625 ms: the head starts the CSS (72 KB), 136 `modulepreload`s (137 early JS, 1,143 KB), the Inter font
   (350 KB) and the logo PNG (202 KB) all at once. 7,155 ms CSS done → **FCP = LCP 7,372 ms** (band lede).
3. 10,746 ms: entry done (265 KB) → 10,781 ms the 6 Lingui catalogs + 41 small static deps (47 files, 618 KB) are
   discovered → 15,014 ms (home-S2).
4. 15,052 ms: **1.2 s module-evaluation task**.
5. 16,402 ms: the router asks for the route's code: `index.lazy` + 11 deps, 26 KB, never preloaded (home-S3) → 17,191 ms.
6. 17,379 ms hydration shell, 17,503 ms hydration end (189 ms hydration task).
7. 17,451 ms: `ElectionCatalog` (preflight 132 ms) → 18,169 ms error. Retry at 19,176 → 19,766 ms error → 19,779 ms
   „Lista edițiilor nu s-a încărcat." (CLS 0.009).
8. Meanwhile: clerk-js 17,267–18,924 ms → FAPI 19,054–20,259 ms → UI chunks to 22,699 ms (last React commit
   22,748 ms). The idle warm-up of `/alegeri/$electionKey` runs at 17,525–18,145 ms (2 files, 4 KB). `/logo.png` (202 KB) runs at 16,370–18,232 ms.

Desktop (deployed run 2): CSS 98–269 ms, entry 98–305 ms, catalogs 365–428 ms, evaluation 471 ms (342 ms long), route code
833–864 ms, hydration 930 ms, API 932 + 132 ms, retry 2,065 + 112 ms, error state 2,184 ms.

## 4. API calls

| operation | where | start (mobile / desktop, deployed cold) | duration | size | chained after |
|---|---|---|---|---|---|
| `ElectionCatalog` | SSR loader (local log; deployed in-cluster) | 4–10 ms after the document request | 31–114 ms (one warm outlier: **1,722 ms**) | 233 B gzip (an error body) | nothing; once per render, cold and warm (12/12 local loads) |
| `ElectionCatalog` #1 | browser, `auth: 'none'` | 17,339–17,479 / 880–1,099 ms (at hydration) | 670–718 / 130–173 ms | 779 B (481 B body) | hydration; 1 preflight 73–132 ms |
| `ElectionCatalog` #2 (retry) | browser | 19,052–19,176 / 2,017–2,273 ms | 573–590 / 38–112 ms | 779 B | #1's failure + 1 s retry delay (`src/lib/queryClient.ts:12`); preflight reused (< 5 s) |

- All three answer HTTP 200 with `data: null` and `errors`: `Unknown type "ElectionCatalogFilter"`, `Cannot query
  field "electionCatalog" on type "Query"` (`analysis/election-catalog-probe-response.json`).
- **Clerk (home-S6): no wait.** The read passes `auth: 'none'` (`src/features/elections/api/elections-catalog-api.ts:97`).
  On mobile it starts 44–62 ms *before* hydration end (between shell and end). Clerk's `/v1/client` only
  finishes at 19.8–20.4 s, about 2.7 s later. On desktop it starts 1–3 ms after hydration end, and Clerk is
  ready at 1.29–1.82 s.
- No call is chained on another API call. The retry is the only sequence.

## 5. Candidate issues

### elections-1: The page reads an API field the server removed; every visit ends in „Lista edițiilor nu s-a încărcat."

- **Numbers.** On both targets, every load in the batch (24 browser loads, 12 local SSR renders):
  - The SSR read fails. The HTML ships the skeleton („Se încarcă edițiile", 9 `animate-pulse`).
  - The browser reads twice and fails twice. The error state shows at 19.8 s on mobile and 2.2 s on desktop.
  - The local server logs 2 `error` lines per render (`graphql-client` + `elections-catalog-ssr`,
    the local server's log, not kept). The browser logs 2 `GraphQL errors` lines.
  - One untimed agent-browser look at the deployed site ended on the same state: „Lista edițiilor nu s-a
    încărcat. / Încearcă din nou". No Sentry ingest request was seen in the browser (consent-gated). Server-side
    Sentry was not checked.
- **Which side moved: the server, deliberately; the client has to follow.** Server commit `9c438870`
  (2026-10-21, „feat(api): Serve elections results from the serving model … The old catalog and county source report
  are removed") replaced `electionCatalog`/`electionEdition` with `electionEvents`/`electionEvent`/`electionResult`.
  `electionContests` now takes `occurrenceKey` instead of `electionKey` (server `origin/dev`
  `src/modules/elections/shell/graphql/schema.ts:271-300`). The client at `9db3bce0` still sends the old contract:
  `src/features/elections/api/elections-catalog-api.ts:39-66` (catalog, edition, contests, contest queries),
  called from `src/routes/alegeri/index.tsx:35-36` and `src/features/elections/hooks/use-elections-catalog.ts:21-34`.
  So `/alegeri/$electionKey` and `/alegeri/contest/$contestKey` are broken as well (from the schema; not loaded).
  The client's elections docs (`docs/design/elections/design.md:537`) still describe `electionCatalog`.
- **Fix.** Port `src/features/elections/api/` to `electionEvents`/`electionEvent`/`electionContests(occurrenceKey)`,
  or switch `elections` off in `src/config/feature-flags.ts:13` until then (sidebar and landing hide it).
  Optional: don't retry a GraphQL validation failure (HTTP 200 + `data: null` + validation messages).
  `retry: 1` only adds a second call and delays the error state by about 1.6 s on mobile.
  Process: a cross-repo contract check (client query documents against the deployed schema) would have caught
  this on 2026-10-21.
- **Expected gain.** The page works: the rows ship in the SSR HTML and are visible at FCP (7.3 s on mobile,
  0.38 s on desktop). Today the skeleton is followed by an error at 19.8 s / 2.2 s. It also removes 2 browser
  calls and a preflight per visit (about 1.3 s of mobile network after hydration), and the CLS of 0.009–0.01.
- Owner **client** (server changed by design; server only for the contract-check process) · **P0** · shared? no · new.

### elections-2: The SSR loader holds the first byte for the API read, with a 5 s deadline

- **Numbers.** On local, TTFB is about the SSR read plus render. The read takes 31–114 ms in 11 of 12 loads,
  and TTFB is 88–106 ms. In one warm mobile load (`local/alegeri-mobile/run3-warm.json`) the failing read took
  **1,722 ms**: TTFB went to 1,753 ms and FCP to 2,076 ms, against 856–972 ms in the other warm runs.
  Nothing on the page above the list depends on the read: the head, the lede (the LCP element) and the filters.
- **Cause.** `src/routes/alegeri/index.tsx:35-36` awaits `readElectionCatalogForSsr` when rendering on the server
  (`src/lib/ssr/loader-blocking.ts:16-18`). The read runs under `SSR_DEADLINE_MS = 5_000`
  (`src/features/elections/api/elections-catalog-ssr.ts:24`), and TanStack Start sends no HTML until every
  loader resolves (`:17`). The deployed in-cluster read is not observable (`cfOrigin` 34–48 ms).
- **Fix.** Cut the deadline to about 1 s. The page already falls back to a browser read with its own skeleton.
  Alternatively, stream the list: start the query in the loader without awaiting it, and read it with a
  suspense query inside a boundary, so the shell and LCP text flush first.
- **Expected gain.** It caps the worst-case TTFB/FCP at about 1 s above normal, instead of 5 s, when the API
  is slow. There is no change on a healthy API (30–110 ms).
- Owner client · **P3** (risk on a slow API; P2 if the deployed read is slow once elections-1 is fixed) · shared?
  pattern (other loaders use `shouldBlockLoaderForSsr`) · new.

### elections-3: Route code requested only after the root evaluates (home-S3 numbers for this page)

- **Numbers.** These are the coordinator's home-S3 figures for this page.
  - Mobile cold, lazy chunk start − entry end: **5,656 ms deployed** (5,568–5,708) and 5,622 ms local (5,589–5,971).
    Most of that gap is the catalogs (4.27 s, home-S2) and the 1.2 s evaluation (home-S1).
  - The route step itself, from `index.lazy` request to its last dep: **789 ms** on mobile (12 files, 26 KB)
    and 31–43 ms on deployed desktop. Hydration follows 190 ms later.
  - Desktop delay (lazy start − entry end): 474–595 ms.
  - `/alegeri/` has no entry in the start manifest. `index.lazy-*.js` is loaded through `__vite__mapDeps`, so
    it costs one round trip, not a chain.
- **Cause.** `createLazyFileRoute` (`src/routes/alegeri/index.lazy.tsx:5-7`) as described in home-S3.
- **Fix.** As home-S3. The route code is small (48 KB decoded, 26 KB on the wire), so moving the component into
  `index.tsx` and preloading it costs little.
- **Expected gain.** About 0.8 s earlier hydration and first API call on mobile. Desktop gain is estimated at
  ≈30–45 ms from the route fetch window.
- Owner client · P1 via home-S3 · **shared: home-S3** · known in home-S3.

### elections-4: HTML is `no-store`, so every repeat view pays a document round trip

- **Numbers.** Warm views refetch the 18 KB document. On mobile the wait is 567–573 ms, and FCP/LCP is 876 ms
  (deployed) and 972 ms (local), against 256 ms on `/` (`max-age=3600`). On desktop it is 54–94 ms, and FCP is
  204 ms on both.
- **Cause.** `src/features/elections/lib/elections-head.ts:32-33` (`no-store` plus `CDN-Cache-Control: no-store`)
  on `src/routes/alegeri/index.tsx:39`, on top of the root default `src/routes/__root.tsx:61`. Yet the data it
  renders stays fresh in the client for 10 min (`use-elections-catalog.ts:19`). There is no Nitro route rule for
  `/alegeri` (`nitro.config.ts:18`).
- **Fix.** Once elections-1 is fixed and the catalog is public metadata, use a short public policy, e.g.
  `createPublicPageCacheHeaders({ browserMaxAgeSeconds: 60, sharedMaxAgeSeconds: 600, … })`, and keep the
  cookie-varied caveats of home-S8.
- **Expected gain.** About 0.6 s of FCP on mobile repeat views within the max-age.
- Owner client · **P3** · shared: home-S8 · new for this page.

### Also seen (P3, no issue)

- `useWarmRouteCode('/alegeri/$electionKey')` (`elections-catalog-page.tsx:59`) fetches the edition route
  (4 KB) at idle. It is cheap, but the page it warms is broken by elections-1.
- `select-*.js` (22.8 KB decoded) is in the route set. It comes in through `Pagination`'s page-size select, so
  replacing the `selectTriggerClassName` import (`elections-catalog-page.tsx:6`) would save nothing.
- `/Alegeri` serves a 200 duplicate (canonical set, so this is SEO-only).

## Shared (cite home; numbers for `/alegeri`, deployed mobile cold unless noted)

- **home-S1**: 136 `modulepreload`s in the HTML; 137 early JS files, 1,143 KB zstd, done 10.75 s. Root evaluation
  task 1.18–1.31 s (mobile) / 0.27–0.34 s (desktop).
- **home-S2**: 6 Lingui catalogs + 41 static deps, 618 KB, discovered at 10.78 s → 15.01 s (4.27 s).
- **home-S3**: see elections-3 (delay 5,656 ms; route step 789 ms).
- **home-S4**: CSS 72 KB, done 7,155 ms → FCP 7,268 ms (local mobile FCP 8,572 ms).
- **home-S5 / S7**: logo PNG preload 202 KB (624–10,071 ms) + `/logo.png` 202 KB; Inter 350 KB (to 11.2 s);
  `sentry-*.js` 112 KB, `posthog-*.js` 77 KB zstd in the root set.
- **home-S6**: Clerk loads after hydration (17.27 s → FAPI to 20.3 s → UI chunks to 22.7 s; last commit 22.75 s).
  The page's reads use `auth: 'none'` and do **not** wait for it (section 4).
- **home-S8**: HTML `no-store`, `cf-cache-status: DYNAMIC`; no Nitro route cache for `/alegeri` (elections-4).
- **home-S9**: 1 preflight per cold load (73–132 ms deployed, 4–10 ms local proxy). The retry within 5 s
  reuses it. Mobile warm views pay one again.
- **home-S10**: no server-side cache on purpose („Nothing is kept between requests",
  `elections-catalog-ssr.ts:21`). The SSR read runs on every render, cold or warm.
- **home-S11**: no specific effect. The loader blocks the stream for everyone anyway (elections-2).

## 6. Not checked / open questions

- Data load and SSR timing with a working API: blocked by elections-1. Re-measure after the port. The
  `electionEvents` read may differ in size and speed.
- Whether the server-side `logger.error` reaches Sentry on the deployed pod: 2 events per render, if it does.
- The edition and contest pages were not loaded. Their breakage is inferred from the server schema.
- I ran one `git fetch` in the server checkout (refs only, no working-tree change) to read `origin/dev`'s schema,
  plus one untimed agent-browser look (no screenshot) and one API probe.
