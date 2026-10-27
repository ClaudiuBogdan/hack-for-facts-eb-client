# Procurement: `/procurement`

Procurement subagent's report for the 2026-10-27 main-page audit. Code: dev `9db3bce0` (local build) and image
`4a6d672a` (deployed). Batch ran 18:39–18:45. Evidence lives in
`evidence/procurement/{deployed,local}/procurement-{desktop,mobile}/`, and the scripts used for this report in
`evidence/procurement/extra/`.

## 1. Entry point

- The sidebar entry „Achiziții publice" links to **`/procurement`**. The layout is `src/routes/procurement/route.tsx`, the
  route `src/routes/procurement/index.tsx` (loader, head, headers) plus `index.lazy.tsx` (component), and the page
  `src/features/procurement/components/home/procurement-home-page.tsx`.
- **`/achizitii` returns 301 → `/procurement`** with the search params kept (`src/routes/achizitii/index.tsx:8-15`).
  Deployed: 88 ms, `x-envoy-upstream-service-time: 3`, `cf-cache-status: DYNAMIC`. It is not a duplicate page.
- Old explorer links (`/procurement?tab=…`, etc.) redirect to `/procurement/analytics` in `beforeLoad`
  (`index.tsx:29-33`). A bare `/procurement` does not redirect.
- Not a people page. The hero search is the landing page's `LandingSearch` (shared chunk, see home-2).

## 2. Numbers (medians of 3; ms unless marked)

| target · profile · view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | requests | transfer KB | JS KB xfer / decoded | API calls (+preflight) | HTML KB xfer / decoded |
|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed · desktop · cold | 149 | 520 | 520 | 0 | 294 | 1,021 / 1,123 | 259 | 3,260 | 2,290 / 6,646 | 1 (+1) | 31 / 176 |
| deployed · desktop · warm | 134 | 336 | 336 | 0 | 14 | 507 / 647 | 257 | 44 | 0 / 6,646 | 1 (+0) | 31 / 176 |
| deployed · mobile · cold | 115 | 7,408 | 7,408 | 0.001 | 1,916 | 18,289 / 18,663 | 259 | 3,261 | 2,290 / 6,646 | 1 (+1) | 31 / 176 |
| deployed · mobile · warm | 83 | 984 | 984 | 0 | 932 | 2,019 / 2,568 | 258 | 43 | 0 / 6,646 | 1 (+1) | 31 / 176 |
| local · desktop · cold | 45 | 336 | 336 | 0 | 35 | 784 / 977 | 257 | 3,125 | 2,158 / 6,615 | 1 (+1) | 31 / 175 |
| local · desktop · warm | 42 | 252 | 252 | 0 | 41 | 426 / 602 | 255 | 42 | 0 / 6,615 | 1 (+0) | 30 / 175 |
| local · mobile · cold | 41 | 8,632 | 8,632 | 0.001 | 1,879 | 18,339 / 18,740 | 257 | 3,125 | 2,158 / 6,615 | 1 (+1) | 31 / 175 |
| local · mobile · warm | 49 | 992 | 992 | 0 | 914 | 1,975 / 2,498 | 256 | 42 | 0 / 6,615 | 1 (+1) | 31 / 175 |

DOM 1,503 nodes on desktop and 1,368 on mobile; 22–24 React commits; no console errors. **The HTML is refetched on
repeat views** (31 KB, `max-age=0`), unlike `/` (`max-age=3600`), so warm TTFB is the server's time. The desktop TBT gap
(294 deployed vs 35 local) is a window artifact: the ≈330 ms evaluation task starts after FCP on deployed (558 > 520)
and at FCP locally (332), so TBT counts it only on deployed. The code is the same.

The **LCP element is the hero `<h1>`** („Ce cumpără statul / și de la cine",
`h1.mt-5.text-[clamp(2.2rem,8vw+0.6rem,2.75rem)]…`) in every run. LCP = FCP in every run.

**The medians hide the cold server render.** Every page process keeps the front door's reads for 10 minutes (§5,
procurement-1), so only the first load after expiry pays for them:

| run | TTFB | origin | what happened |
|---|---|---|---|
| deployed desktop run1-cold | **1,891** | `cfOrigin;dur=1728` | memo expired on pod A |
| deployed desktop run1-warm | **3,159** | `cfOrigin;dur=3129` | next request → pod B, its own memo also expired (chronos-dev runs 2 replicas, `k8s/overlays/chronos-dev/workload-patch.yaml:7`) |
| deployed desktop runs 2–3, all mobile | 64–149 | 44–97 | both pods warm |
| local desktop run1-cold | **1,559** | 4 SSR calls, the slowest one 1,500 ms | memo expired on the local server |
| local, every other run | 25–56 | no SSR calls | memo warm |
| curl, deployed, 16:58 | 2,603 | `x-envoy-upstream-service-time: 2523` | cold, then 23–28 ms for the next two |

The cold first loads also push FCP/LCP out: deployed desktop run1-cold FCP 2,280 vs 496–520 warm, and local run1-cold 1,984 vs 332–336.

## 3. Waterfall (deployed, mobile, cold, run 1; Slow 4G + 4× CPU)

1. Document: TTFB 115 (pod memo warm), response end 755. 31 KB zstd / 176 KB HTML, 137 `modulepreload`s.
2. 644 → 7,145: CSS (render-blocking) shares the pipe with the root's preloads (home-S1/S4). The 350 KB font finishes at 11,253.
   **FCP = LCP = 7,496 (h1).**
3. 644 → 10,784: entry `index-*.js`. 10,817 → 15,051: all six Lingui catalogs (≈552 kB / 539 KiB; home-S2). 15,109: the 1,190 ms evaluation task (home-S1).
4. 16,473 → 18,072: the route's code, 26 files / 127 KB, requested only after evaluation (`index.lazy` 16,473 → 17,659,
   `landing-search` 16,489 → 18,072) (home-S3).
5. 18,300: 434 ms hydration task → hydration shell 18,319, **hydration end 18,756**.
6. 18,614 → 20,671: county GeoJSON, 115 KB. 18,793 → 20,074: the analytics route code warm-up.
   20,725: **294 ms long task rendering the county map** (`county-map` projection).
7. 18,207 → 22,340: Clerk JS + FAPI (`dev_browser`, `environment`, `client`). **22,387: the only browser API call
   starts, 3.6 s after hydration and 47 ms after Clerk's `/v1/client` returns** (home-S6). It ends at 23,245. The 91 ms
   commit at 23,276 fills „Cele mai noi".
8. 24,127: last Clerk UI chunk. Last React commit 24,893.

## 4. API calls

| operation (as the proxy names it) | what it is | where | start | duration | size | chained after |
|---|---|---|---|---|---|---|
| `ProcurementHomeNational` | national picture, 19 aliases | SSR (memo) | doc +5 | 850 (790–855 in 3 cold renders) | 3.1 KB gz | — |
| `ProcurementPartyNames` | names for the ranked CUIs | SSR (memo) | doc +859 | 50–70 | 0.9 KB gz | **National** (needs its CUIs; `procurement-home-api.ts:222-226`) |
| `ProcurementHomeCategories` | CPV tree, both populations | SSR (memo) | doc +6 | 959 (720–960) | 3.0 KB gz | — |
| `ProcurementHomeContracts` | the year's 8 largest contracts (48 rows, page 1 of ≤3) | SSR (memo) | doc +7 | **1,500 (1,500–1,930)** | 2.4 KB gz | — |
| `ProcurementHomeContracts` (really `ProcurementHomeRecentContracts`) | „Cele mai noi": the newest complete month's 8 largest contracts | **browser** | desktop: hydration end +509–892; mobile: **+3,581–3,638** | desktop 170–257, mobile 837–878 (+ preflight 78–122) | 7.9 KB br | **Clerk ready** (via `getAuthToken`), and the National read's cutoff month (already in the seed) |

SSR rows: local desktop run1-cold (`ssrApiCalls`); ranges: the three cold renders in `api-proxy.log` (16:50, ~17:08,
18:40). The SSR critical path is the contracts read. National + names (≈920) and categories (≈960) finish first, so the
names chain costs nothing today. TTFB − slowest read ≈ 55 ms of render.

**Why the browser read looks like the SSR one.** `graphqlQuery` sends `{ query, variables }` with no `operationName`
(`src/lib/graphql/graphql-client.ts:171`), so the proxy and the harness name the call after the query text. The year's
big contracts and the newest month's contracts share `PROCUREMENT_HOME_CONTRACTS_QUERY`
(`api/graphql/procurement-home-queries.ts:158-164`). Their variables differ only in the dates, which are the same length,
so `reqBytes` is identical at 640. The browser call is the month read: it is client-only by design, keyed on the cutoff
month the national read derives (`hooks/use-procurement-home.ts:74-87`, `procurement-home-page.tsx:101-104`). The big
contracts list is seeded from the loader and is never read again in the browser.

## 5. Candidate issues

### procurement-1: The front door's server memo expires every 10 minutes, and the next visitor waits for the whole API fan-out

- **Numbers.** Cold renders: deployed TTFB 1,891 / 3,159 (two pods, two cold renders in a row), curl 2,603. Local
  1,559, with SSR reads of 850 + 70 (chained), 959 and 1,500 in parallel. Warm: 64–149 deployed, 25–56 local. FCP
  follows (deployed desktop 2,280 vs ~510). Evidence: `deployed/procurement-desktop/run1-{cold,warm}.json`
  (`document.headers.server-timing`), `local/procurement-desktop/run1-cold.json` (`ssrApiCalls`).
- **What the cache is.** Not `procurement-api.live.ts:80`: that module (CPV divisions, party names) is never imported
  by the front door. The cache is `createServerMemo` (`src/lib/ssr/server-memo.ts:19-48`), three module-level `Map`s
  in `src/features/procurement/api/procurement-home-ssr.ts:28-30`, keyed by year, `KEEP_MS` = 10 min (`:26`),
  promise-shared across concurrent requests, failures dropped. It lives for the life of the Node process, **one per
  pod**: the deployed pod behaves the same, and with 2 replicas (chronos-dev) or up to 8 (prod HPA,
  `k8s/base/hpa.yaml:11-12`), up to N visitors per 10-minute window pay the cold render.
- **Cause.** On expiry, `memo()` deletes the entry and reads again, and the request awaits it
  (`server-memo.ts:35-40`). There is no stale-while-revalidate, and TanStack Start sends no HTML until the loader
  resolves (`routes/procurement/index.tsx:48-49`). Cloudflare does not cache the HTML (`DYNAMIC`, home-S8), so the
  route's `s-maxage=600` (`index.tsx:54-62`) does not help. `/procurement` has no Nitro route rule (`nitro.config.ts`).
- **Fix.** Make `createServerMemo` serve an expired value while one background read refreshes it (keep failures out,
  as now). Raise the front door's window to match the data (SEAP loads daily at most: 1–6 h). Optionally warm the three
  reads on server start. The same helper serves 10 SSR modules (7 procurement, 2 justice, 1 public
  enterprises), all with `KEEP_MS = 10 min`, so one change covers them.
- **Gain.** −1.5 to −3.0 s TTFB, FCP and LCP for every visitor who hits an expired memo. On a low-traffic dev pod that
  is most first visits after a quiet spell. Only a pod's very first request would still pay it, and none with a
  start-up warm-up.
- Owner client · **P1** (>1 s TTFB, every profile) · shared? partly (same helper: procurement/*, justice,
  public-enterprises). New: home-S10 lists module caches but not this memo.

### procurement-2: „Cele mai noi" waits for Clerk before it reads (home-S6, measured here)

- **Numbers.** In all 24 runs, the one browser read starts 11–124 ms after Clerk's `/v1/client` response ends, not
  at hydration:

  | | hydration end | Clerk `/v1/client` end | API start | start − hydration end |
  |---|---|---|---|---|
  | deployed mobile cold (3 runs) | 18,584–18,756 | 22,159–22,340 | 22,212–22,387 | **3,628–3,638** |
  | deployed mobile warm | 2,373–3,036 | 3,137–3,751 | 3,223–3,797 | 735–850 |
  | local mobile cold (3 runs) | 18,667–18,756 | 22,231–22,295 | 22,288–22,344 | **3,581–3,621** |
  | local mobile warm | 2,418–3,044 | 3,173–3,728 | 3,242–3,852 | 748–824 |
  | deployed desktop cold | 1,073–3,021 | 1,605–3,648 | 1,658–3,663 | 585–642 |
  | local desktop cold | 924–2,803 | 1,436–3,278 | 1,458–3,312 | 509–892 |

  Evidence: `requests` and `apiCalls` in every `run*-*.json`. Extraction: `extra/chain.mjs`.
- **Cause.** The read calls `graphqlQuery` without `auth: 'none'` (`procurement-home-api.ts:329`, and likewise `:98`,
  `:209`, `:274`, `:381`). So `getAuthToken()` → `waitForClerk()` polls until Clerk `isLoaded`
  (`src/lib/graphql/graphql-client.ts:151-153`, `src/lib/auth/index.tsx:353-395`), and Clerk mounts only after hydration.
- **Fix.** Pass `auth: 'none'` on the procurement reads (all public), or flip the default as home-S6 proposes. The
  other 10 procurement API files have the same gap, and their pages (institution, supplier, category, analytics) read in
  the browser after navigation.
- **Gain.** The band fills ≈3.6 s earlier on mobile cold (≈23.2 s → ≈19.6 s), ≈0.6 s on desktop, ≈0.8 s on mobile
  repeat views. No effect on LCP: the band is the sixth, below the fold.
- Owner client · **P2** for this page (P1 as part of home-S6) · shared: home-S6 · known in home-S6.

### procurement-3: The cold reads are slow at the API; the year's contract list sets the critical path

- **Numbers.** `ProcurementHomeContracts` (contract awards of 2025, `sort: value_desc`, page 1 of 48 rows) 1,500–1,930.
  `ProcurementHomeNational` (19 aliases) 790–855. `ProcurementHomeCategories` 720–960. All against the dev-chronos API
  from Zeus (`api-proxy.log`, 3 cold renders). In-cluster the deployed cold render still took 1.7–3.1 s at the origin,
  so it is not the network hop. The browser's similar month read returns in 66–257 ms on desktop, and the lead's
  first look saw it at about 2 s once and fast afterwards, which suggests the API caches too (not checked, §6).
- **Cause.** Server side: `procurementContracts` → `repo.searchContractsOffset` sorts a year of awards by value
  (`hack-for-facts-eb-server/src/modules/procurement/shell/graphql/resolvers.ts:232-235`; sibling checkout of Oct 14).
  Not analysed further. Client side, `fetchGroupedContracts` reads up to 3 pages **in sequence**
  (`procurement-home-api.ts:324-341`): a year whose top consortium spills past row 48 costs 2–3 × 1.5 s, against the
  5 s SSR deadline (`procurement-home-ssr.ts:25`).
- **Fix.** Server: an index or precomputed top-N for (year, record kind, accepted value, value desc), and the same for
  the national aggregates. Client: none needed if procurement-1 lands, since the cold read leaves the request path.
- **Gain.** Cold TTFB ≈ −1 s (the contracts read down to the next-slowest read, ≈0.9 s). Overlaps with procurement-1.
- Owner **server** · **P2** · shared? no.

### procurement-4: The county map: 115 KB GeoJSON with no cache headers, then a 294 ms main-thread projection

- **Numbers.** `/geojson/judete-2026-03-09.json`: 400 KB raw, 115 KB zstd, served with **no `Cache-Control`**
  (`last-modified` + weak ETag only), `cf-cache-status: DYNAMIC` (curl, and `requests` in the runs). Fetched after
  hydration: mobile cold 18,614 → 20,671 (local 18,530 → 20,570), desktop 1,054 → 1,129. Then one 294 ms long
  animation frame on mobile (`TimerHandler:setTimeout`, 291 ms of script). The trace attributes 221 of 242 ms of the `HubCountyBand` render to
  `county-map` (`trace-cold.trace.json`, window 20.3–20.7 s; `extra/window-profile.mjs`). That task is 241 ms of the
  mobile TBT of 1,916. The local trace shows the same task (325 ms @ 20.07 s). Repeat views reuse the file from the
  HTTP cache by heuristic freshness only.
- **Cause.** `HubCountyBand` fetches the GeoJSON on mount (`src/features/statistics/components/hub/hub-county-band.tsx:100`,
  `src/hooks/useGeoJson.ts:17-33`) and projects all county polygons and label positions in the browser
  (`src/features/statistics/lib/county-map.ts:293-302`, `projectCounties`). The server renders the band without shapes.
  `public/geojson/` gets no cache header from Nitro, and Cloudflare has no rule for it.
- **Fix.** Precompute the projected county paths and label points at build time: the data is static, a few tens of KB
  at `COUNTY_MAP_WIDTH`. Render them in the SSR HTML (or import them as a hashed asset), which drops both the fetch and
  the 294 ms task. At minimum, serve `/geojson/*` with `Cache-Control: public, max-age=31536000, immutable` (the files
  are dated and never overwritten, per `useGeoJson.ts:13-16`) and a Cloudflare cache rule.
- **Gain.** Mobile: −241 ms TBT, map shown ≈2 s earlier (≈20.9 s → ≈18.8 s cold), −115 KB on the cold load.
  Desktop: ≈75 ms.
- Owner client (+ infra for the cache rule) · **P2** · shared? yes: every hub using `HubCountyBand` (INS, companies,
  NGOs, public enterprises, justice, procurement) · new.

### procurement-5: The route's code arrives after the entry is evaluated (home-S3 on this page)

- **Numbers.** Mobile cold, deployed: entry ends 10,784, and the lazy route chunk starts at 16,372–16,473 (**lazy
  start − entry end = 5,569–5,722, median 5,689**; local 5,512–6,037, median 5,519). Most of that gap is the
  catalogs (10,817 → 15,051) and the 1,190 ms evaluation task (home-S1/S2). The part S3 adds is the route's own serial download: 16,473 → 18,072 (**≈1.6 s**, 26
  files / 127 KB, `landing-search` 45 KB of it, home-2), and hydration starts at 18,300. Desktop deployed: 527–618 gap,
  51–73 ms route download (median 55 ms). The HTML's 137 modulepreloads include `recharts` and `procurement-hub`, but not
  `index.lazy-*` or any of its 26 files.
- **Cause.** `createLazyFileRoute` (`src/routes/procurement/index.lazy.tsx`), see home-S3.
- **Fix / gain.** As home-S3. Here: ≈1.6 s earlier hydration on mobile cold, minus contention from 127 KB more
  preloaded early. Rendering the hero search as a plain input on SSR (home-2) takes 45 KB off that path.
- Owner client · P1 (shared) · shared: home-S3, home-2 · known in home-S3.

### procurement-6: The newest month's records could ship with the page instead of a second browser round trip

- **Numbers.** The only browser API call, plus its preflight (home-S9): mobile 837–878, desktop 170–257. It is gated
  on Clerk today (procurement-2), so the band is complete at 23.1–23.2 s on mobile cold.
- **Cause.** By design the read waits for the national read's cutoff month and runs in the browser
  (`use-procurement-home.ts:74-87`), although the server already has that month when the national memo resolves.
- **Fix.** In `readProcurementHomeForSsr`, chain a fourth memo after the national read (`national.then(n =>
  recent(n.cutoff.contract))`), either awaited (the warm render costs nothing; cold, it runs in parallel with the
  1.5 s contracts read) or streamed as a deferred promise. Seed `useProcurementHomeRecent` with it for the default
  `recente=contracte`.
- **Gain.** Removes the browser call and its preflight for the default view: the band is in the HTML. Below the
  fold, so no LCP change. Mostly visual completeness, plus one fewer request on a slow link.
- Owner client · **P3** · shared? no · new.

### procurement-7: API reads are unlabelled on the wire

- **Numbers.** Two different reads appear as `ProcurementHomeContracts` in the proxy log and the harness (§4). The
  lead's first look ("the browser reads ProcurementHomeContracts, ~2 s at first") was this mislabel: the browser read
  is the month list, not the SSR-seeded year list.
- **Cause.** `graphqlQuery` keeps `operationName` for its own logs and leaves it out of the request body
  (`src/lib/graphql/graphql-client.ts:171`). Shared query text: `procurement-home-queries.ts:158-164`.
- **Fix.** Send `operationName` in the body. Give the month read its own query name (`ProcurementHomeRecentContracts`)
  so server logs and APM can tell them apart.
- **Gain.** Observability only (server-side latency per operation).
- Owner client · **P3** · shared? yes (every `graphqlQuery` caller) · new.

### procurement-8 (P3, small): extra code on and after the page

- `hub-snapshot` (companies hub snapshot, 17 KB raw / 4.4 KB gz) is pulled in only for the county populations
  (`home-context-bands.tsx:9,37-39`). It could be a 42-entry population map.
- `useWarmRouteCode('/procurement/analytics')` (`procurement-home-page.tsx:79`) fetches ≈56 KB gz more on idle. On
  mobile cold it runs 18,793 → 20,074, alongside the GeoJSON and Clerk. Intended: it keeps the analytics click
  fast. Could wait for `load` + Clerk on slow connections (it already skips Save-Data).
- `ProcurementHomeSearchField autoFocus` (`procurement-home-page.tsx:151`): on a phone, focusing on load is a UX
  question, not a timing one. Not measured.
- Owner client · P3 · new.

### Shared causes seen here (cite the home doc)

| shared | numbers on `/procurement` |
|---|---|
| home-S1 root preloads | 137 modulepreloads in the HTML; 246 JS files, 2,290 KB transfer / 6,646 KB decoded per cold load (deployed); 1,190 ms evaluation task on mobile cold (802 ms in the trace) |
| home-S2 Lingui catalogs | six catalogs, ≈552 kB / 539 KiB, of which the `messages` pair is 2 × ~240 KB zstd; mobile 10,817 → 15,051; desktop 438 → 511 |
| home-S3 lazy route chunk | lazy start − entry end: **5,689 ms mobile cold** deployed (local 5,519), 577 ms desktop; route download ≈1.6 s mobile (procurement-5) |
| home-S4 CSS contention | CSS 644 → 7,145 on mobile cold → FCP/LCP 7,408 deployed (local 8,632) |
| home-S5/S7 logo, font, Sentry, PostHog | font 350 KB (mobile ends 11,253); sentry 112 KB + posthog 77 KB zstd before hydration |
| home-S6 Clerk | `/v1/client` at 22.2–22.3 s mobile cold, 3.6 s after hydration; the procurement read waits for it (procurement-2) |
| home-S8 HTML caching | `cache-control: public, max-age=0, s-maxage=600, stale-while-revalidate=3600`, `vary: Accept-Encoding, Cookie`, `cf-cache-status: DYNAMIC`; no Nitro route rule for `/procurement`, so the module memo (procurement-1) is the only cache |
| home-S9 preflights | 1 per cold load (78–122 ms deployed; 0 on desktop repeat views) |
| home-S11 bots | not re-measured; curl TTFB = full render (2.6 s cold) |

## 6. Not checked / open questions

- How many replicas actually serve chronos-dev right now (the manifest says 2, and the two cold renders in a row fit
  that). Prod can scale to 8: one cold render per pod per window.
- The API's own cache (why the same reads take 1.5 s cold and <0.3 s later), and its lifetime. Server-side, not read.
- Real-device mobile: DevTools does not throttle preflights (home-S9), and the 3.6 s Clerk gap may differ on real
  hardware.
- A non-default `?recente=directe` or `?firme=…` view: same reads (the toggles are client-side), not timed.
- English or dark-theme visitors: the harness has no cookies (home-1 / home-S8 do not apply here, since there is no Nitro cache).
