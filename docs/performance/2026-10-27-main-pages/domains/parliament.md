# Parliament — `/parlament`

People page: the harness ran with `--people` (no screenshots, no saved HTML, no LCP text). No names below.
Evidence: `evidence/parliament/{deployed,local}/parlament-{desktop,mobile}/`. Shared causes are cited as
`shared: home-Sn` (`domains/home.md`).

## 1. Entry point

- **Not a navigation entry point today.** `/parlament` is absent from the sidebar (`src/components/sidebar/nav-main.tsx:16-27`
  lists 12 URLs, no parliament). The landing tile exists but is gated on mock mode,
  `gate: () => isMockDataEnabled('political-parliament')` (`src/features/landing/lib/landing-groups.ts:141-147`;
  the promo card has the same gate, `parliament-promo-card.tsx:11`), so the deployed live build hides it. The
  elections rail link is `disabled: true` (`src/features/elections/components/elections-page-layout.tsx:19-24`).
  Checked on deployed: neither `/` nor `/alegeri` HTML contains `href="/parlament`.
- **How a visitor gets there:** direct URL, or global-search hits for members, bills and committees
  (`src/features/entity-search/lib/entity-search-routing.ts:66-77` → `/parlament/membri|proiecte|comisii/…`) whose
  breadcrumbs and tab nav link back to `/parlament`.
- **Other spellings:** `/parlament/` → 307 to `/parlament`. `/parliament` → 404. `?tab=membri` → 307 to `?tab=grupuri`,
  from the route's `beforeLoad` (`src/routes/parlament/index.tsx:7-17`). Tabs are `?tab=prezentare` (the default
  hub, the page measured here), `voturi`, `proiecte` and `grupuri`, all rendered by one lazy route component
  (`src/features/parliament/components/parliament-page.tsx:29-41`).
- Suggestion for the lead: rank it as a hidden surface. Its costs are real for anyone who lands on it, but no menu
  sends traffic there.

## 2. Numbers

Medians of 3. Harness TTFB. LCP element: **desktop** = the hero `img` (`header-parliament-allegory-1280-*.png`,
943 KB); **mobile** = the hero description paragraph `p.max-w-[40rem]…` (on mobile the image is hidden).

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB (transfer / decoded) | API (preflights) | HTML KB (transfer / decoded) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 152 | 436 | 436 | 0 | 307 | 907 / 947 | 272 | 4558 | 2232 / 6559 | 15 (12) | 19 / 99 |
| deployed | desktop | warm | 69 | 200 | 200 | 0.004 | 150 | 523 / 546 | 259 | 44 | 0 / 6559 | 15 (0) | 19 / 99 |
| deployed | mobile | cold | 111 | 7640 | 7640 | 0.083 | 2312 | 19910 / 20049 | 271 | 3696 | 2232 / 6559 | 15 (12) | 19 / 99 |
| deployed | mobile | warm | 70 | 892 | 892 | 0.083 | 1149 | 1913 / 2007 | 270 | 44 | 0 / 6559 | 15 (12) | 19 / 99 |
| local | desktop | cold | 20 | 264 | 264 | 0.004 | 294 | 734 / 761 | 270 | 4425 | 2107 / 6528 | 15 (12) | 18 / 98 |
| local | desktop | warm | 22 | 172 | 172 | 0.004 | 88 | 410 / 429 | 257 | 39 | 0 / 6528 | 15 (0) | 18 / 98 |
| local | mobile | cold | 23 | 9204 | 9204 | 0.083 | 2127 | 19725 / 19855 | 269 | 3564 | 2107 / 6528 | 15 (12) | 18 / 98 |
| local | mobile | warm | 21 | 912 | 912 | 0.083 | 1408 | 1811 / 1901 | 259 | 39 | 0 / 6528 | 15 (3) | 18 / 98 |

- **LCP is not when the page has content.** The SSR HTML holds only the header text and 6 skeletons. Votes,
  bills, agenda, groups, the header's seat counts and the legislature line all arrive in the browser. The last
  React commit is at 25.2–26.0 s on mobile cold (deployed 25,590 / 25,739 / 26,050 ms) and 2.1–2.2 s on desktop
  cold. "Content" below means that last commit.
- **Server render, cold vs warm:** identical. SSR makes **no API calls**: `ssrApiCalls` is `[]` in all 12 local
  loads, and the proxy log has no parliament rows from the 16:50 warm-up (between `ElectionCatalog` and
  `InsCountyAnchors`). Local TTFB is 20–23 ms. Deployed TTFB is 111–152 ms, which is Cloudflare plus the network;
  the pod does no API work. The module-level caches in `parliament-api.live.ts:156,446,851` (`groupsCaches`,
  `currentMembersForCompositionCache`, `judeteCache`) are therefore only per-tab browser caches, with no TTL and
  evicted on error. They would become pod-lifetime caches (home-S10) if the fix in parlament-1 were applied as is.
- Deployed vs local: local mobile FCP is 9.2 s against 7.6 s deployed, and local TTFB is lower. Home shows the
  same gap (8.9 vs 7.7 s), so it is shared and not parliament-specific.
- Transfer is +1.2 MB over `/` on desktop (4,558 vs 3,382 KB): 1.7 MB of PNGs (parlament-3, parlament-7).

## 3. Waterfall (deployed, mobile, cold, run 1, `deployed/parlament-mobile/run1-cold.json`)

1. 0–707 ms: document, 19 KB zstd / 101 KB (TTFB 582 ms, including the emulated 562 ms RTT).
2. 616 ms: the head starts everything together. CSS 72 KB, done at 7,464 ms. The **hero PNG preload, 323 KB at
   High priority, for an image hidden below `xl`**, done at 12,763 ms. The font, 350 KB, done at 14,385 ms.
   136 modulepreloads, with the entry (264 KB) done at 12,152 ms.
3. **FCP = LCP 7,640 ms**: the description paragraph, in the fallback font.
4. 12,185–16,594 ms: all six Lingui catalogs (≈552 kB / 539 KiB). 16,638 ms: a 1.36 s module-evaluation task (home-S1/S2).
5. 18,174 ms: the router requests the route code, which is never preloaded (home-S3): `index.lazy` 25 KB,
   `use-parliament-data` 42 KB, `parliament-shell` 4 KB and 36 other files (39 files total), done at 19,884 ms. Hydration
   20,154 / 20,286 ms.
6. clerk-js from 20,057 ms; Clerk FAPI `dev_browser` 21,838 ms → `environment`/`client` done at 23,054 ms. **Only
   then, at 23,089 ms, do the 12 first API calls start** (home-S6), and they end at 23,803–24,001 ms.
7. 23,960 ms: a 513 ms render task, the vote heatmap (parlament-2). 24,996 ms: the bills chain (3 calls) →
   25,637 ms. 24,761 ms: the votes PNG (297 KB) → 26,949 ms. CLS 0.071 at 25,050 ms. Last commit 26,050 ms.

Desktop (deployed, run 2): hero PNG 126→371 ms; CSS done at 255 ms; FCP = LCP 416 ms (the PNG); entry done at
326 ms; route code 740→803 ms; hydration 947 ms; Clerk done at 1,497 ms; API 1,545→1,699 ms; bills chain
1,891→2,032 ms; last commit 2,088 ms.

## 4. API calls (all in the browser; none during SSR)

Deployed, mobile, cold, run 1. Times in ms from navigation. Sizes in bytes, transfer / decoded. Every call goes
through `graphqlQuery` without `auth: 'none'`, so it awaits Clerk (home-S6). Only the vote-detail calls opt out
(`parliament-api.live.ts:585,600`). The API itself is fast: through the local proxy, upstream TTFB medians are
68–163 ms per operation.

| # | operation (purpose) | start | dur | size | waits on |
|---|---|---|---|---|---|
| 1–4 | `ParliamentGroups` ×4: camera/senat × current/all mandates (hub aggregate, `parliament-api.live.ts:406-412`) | 23,096–23,098 | 816–903 | 721–789 / 479–950 | Clerk (FAPI end 23,054) + preflight |
| 5 | `ParliamentVotes` first:6, no chamber: hub `recentVotes`, **never rendered** | 23,100 | 893 | 1,545 / 3,683 | Clerk |
| 6–7 | `ParliamentDataFreshness` ×2: hub aggregate + the shell's own query, **duplicate** | 23,100–23,102 | 701–789 | 652–656 / 115 | Clerk |
| 8 | `ParliamentAgendas` page 1 | 23,089 | 729 | 2,619 / 20,792 | Clerk |
| 9–10 | `ParliamentVotes` camera / senat, first:4 | 23,094 | 779–860 | 1,205–1,545 / 2,177–2,970 | Clerk |
| 11–12 | `ParliamentVoteActivity` 2025, 2026 (12-month heatmap) | 23,091–23,092 | 815–837 | 2,425–2,620 / 27,476–28,558 | Clerk |
| 13–14 | `ParliamentBillActivity` 2025, 2026 | 24,996–24,997 | 587–601 | 1,182–1,376 / 3,956–5,647 | **chained** after the hub aggregate (1–7) and the 513 ms render |
| 15 | `ParliamentBills` first:4 | 24,999 | 638 | 2,438 / 6,460 | **chained**, same |

12 preflights of 88–113 ms (home-S9). The chain starts +1.0 s after the hub's last response on mobile (deployed
24,001 → 24,996 ms; local 23,436 → 24,147 ms, +0.7 s) and +0.15–0.26 s on desktop.

## 5. Candidate issues

### parlament-1: the hub's content is browser-only and waits for Clerk; it lands 4–6 s after hydration on mobile

- **Numbers.** SSR renders 6 skeletons and no data (`ssrApiCalls: []`). On mobile cold, the first API call
  starts **2.75–2.80 s after hydration end** and 26–35 ms after Clerk's FAPI `environment`/`client` calls end
  (deployed 2,803 / 2,758 / 2,753 ms; local 2,759 / 2,765 / 2,763 ms). On desktop cold it starts 598–649 ms after
  hydration (21–48 ms after FAPI). Warm: mobile 1.06–1.14 s, desktop ~0.30 s. Content (last commit) arrives at
  25.2–26.0 s on mobile against FCP 7.6 s. CLS 0.071–0.088 on mobile: the header's seat-count block appears with
  the hub data and pushes the tab nav and `<main>` down (shift sources `div.border-t-2…`, `main.mx-auto…`). Desktop,
  where the hero has `xl:min-h-[32rem]`: medians 0 cold and 0.004 repeat on deployed, 0.004 on local. Evidence: `*/parlament-*/run*-cold.json`
  (`requests`, `apiCalls`, `metrics`, `layoutShifts`).
- **Cause.** No loader, no `ssr` data. The route validates search, redirects the legacy `membri` tab to `grupuri`,
  and sets headers; it has no data loader (`src/routes/parlament/index.tsx:5-24`). Every section uses plain `useQuery`, which does not run on the server:
  `useParliamentHub` (`hooks/use-parliament-data.ts:57-62`), plus agendas, votes, activity, bills and freshness.
  All the fetchers go through `graphqlQuery` with the default `auth: 'optional'`, which awaits Clerk
  (`src/lib/graphql/graphql-client.ts:150-157`; shared: home-S6). The seat-count block renders only when data is
  present (`parliament-shell.tsx:119-138`).
- **Fix.**
  - (a) Shared, home-S6: pass `auth: 'none'` on the parliament reads (25 of 27 call sites in
    `parliament-api.live.ts`, plus the agenda, speeches and stenograms modules), or flip the default.
  - (b) Page-specific: a route loader that prefetches the hub's queries on the server under the same keys
    (`ssr: true`, as `/alegeri` does in `src/routes/alegeri/index.tsx:24-38`), so the first HTML carries votes,
    bills, agenda and groups.
    - Before (b): give the module caches a TTL or move them into the per-request QueryClient (home-S10).
    - Render the heatmaps after hydration (parlament-2), or the hydration task grows by the same ~1 s.
  - (c) Reserve the seat-count block's height so it cannot shift.
- **Gain.** (a) alone: content −2.75 s on mobile, −0.6 s on desktop (all 15 calls). (b): content at FCP
  (~7.6 s instead of 25–26 s on mobile), no browser API calls or preflights on first load, CLS → 0. Cost: TTFB
  + one in-cluster round of ~0.1–0.2 s (API medians 68–163 ms, in parallel).
- Owner client · **P1** · shared? partly ((a) = home-S6; (b) and (c) page-specific) · new.

### parlament-2: the two activity heatmaps cost ~1.2 s of main thread on mobile after the data arrives

- **Numbers.** Three post-data tasks on mobile: 605 / 269 / 355 ms in the local trace; 499 / 237 / 320 ms in the
  deployed trace. On desktop: 109 / 66 / 32 ms. Mobile TBT is 2.1–2.3 s, against 1.5–1.6 s on `/`. Self time in
  those tasks, source-mapped (local mobile trace, 22–27 s):

  | self time | where |
  |---|---|
  | 225 ms | `lib/activity-heatmap-format.ts` |
  | 178 ms | `src/router.tsx` (search serializer) |
  | 86 ms | `parliament-hub-activity-heatmap.tsx` |
  | ~120 ms | Radix tooltip/slot/context/presence |
  | ~85 ms | TanStack router |
  | 334 ms | react-dom |

  The 605 ms task also delays the bills chain (parlament-4). Evidence: `local/parlament-mobile/trace-cold.trace.json`,
  `deployed/parlament-mobile/trace-summary.txt`; ad-hoc profiling script, not kept.
- **Cause.**
  - `formatActivityDate` builds a new `Intl.DateTimeFormat` on every call (`lib/activity-heatmap-format.ts:7-14`).
    It is called for every data day (`parliament-hub-vote-activity.tsx:261`, `parliament-hub-bill-activity.tsx:61`)
    and again for every empty or uncaptured day on every render, through the inline label callbacks
    (`parliament-hub-vote-activity.tsx:349-356`).
  - Cells: populated cells with `day.search` render a TanStack `<Link>` inside a Radix `Tooltip`; other cells
    render a `div`, with a tooltip when they carry data (`parliament-hub-activity-heatmap.tsx:189-283`). Each link runs the app's JSON search serializer
    (`src/router.tsx:30-33`).
  - Two heatmaps; the vote heatmap renders twice (the 269 ms task re-runs the date formatting).
- **Fix.**
  - One module-level formatter: a two-line change.
  - Render squares as plain elements with one delegated tooltip, and build the hrefs from one
    `router.buildLocation` plus a date suffix, or use one `<Link>` per hovered/focused square.
  - Optionally render the grids after idle, below the fold.
- **Gain.** ≈0.7–0.9 s less main thread on mobile (≈150 ms on desktop); TBT −0.6 s or more. The bills chain
  starts ~0.5 s earlier.
- Owner client · **P2** · shared? no (the voturi tab reuses the vote heatmap under its list, `votes-list-layout.tsx`) · new.

### parlament-3: the hero PNG, 943 KB on desktop (the LCP), and 323 KB fetched on mobile for an image that is never shown

- **Numbers.**
  - Desktop: LCP = `header-parliament-allegory-1280-*.png`, 943 KB, High priority, 126–165 → 335–371 ms; LCP 416–544 ms
    deployed, 264–340 ms local. On this unthrottled link it finishes before FCP; on a real link it is the LCP.
  - Mobile: its container is `hidden` below `xl`, yet React hoists
    `<link rel=preload as=image imageSrcSet … imageSizes="(min-width: 1280px) 74vw, 0px" fetchPriority=high>`
    into the head (seen in the SSR HTML). Chrome fetches the 768w file, 323 KB, at High priority 616→12,763 ms.
    That is ≈1.76 s of Slow-4G link time, shared with the CSS and the entry (done 12,152 ms).
  - Estimates: WebP q75–85 = 89–122 KB for the 1280 file and 31–43 KB for the 768 file (Pillow, in memory).
- **Cause.** `parliament-shell.tsx:59-71`: `loading="eager"` + `fetchPriority="high"` on an `<img>` inside a
  `hidden xl:flex` wrapper; `sizes="…, 0px"` does not stop the download, and the PNGs are not compressed. The
  React preload hoisting is the mechanism of home-S4/home-4. Every parliament page using `ParliamentShell`
  carries it: hub, agenda, committees, stenograms. `/legislation` has the same pattern
  (`features/legal/components/legislation-header-visual.tsx`).
- **Fix.** Serve WebP/AVIF. Fetch only at `xl`, e.g. `<picture><source media="(min-width:1280px)" srcset=…>`
  with an empty fallback, or `ReactDOM.preload(…, { media })`. Keep `fetchPriority="high"` only where it is the
  LCP.
- **Gain, measured on mobile.** One extra load on deployed mobile with the PNG blocked
  (`Network.setBlockedURLs`, `evidence/parliament/extra/deployed-mobile-no-hero/`; script
  `extra/perf-run-block.mjs`), against the batch's 3 cold runs:

  | metric | blocked | batch runs |
  |---|---|---|
  | entry done | 10,849 | 12,140–12,162 (−1.3 s) |
  | font done | 11,309 | 14,341–14,403 (−3.0 s) |
  | hydration end | **18,697** | 19,935–20,286 (−1.35 s) |
  | last commit | 24,229 | 25,590–26,050 (−1.5 s) |
  | FCP/LCP | 7,432 | 7,596–7,660 (−0.2 s) |

  One run only, but the batch's spread is ±0.2 s.
- **Gain on desktop.** −820 KB transfer with WebP, and LCP on slower links.
- Owner client · **P2** by the letter (the LCP gain is 0.2 s; the 1.35 s gain is to hydration and content; raise to P1 if those count) · shared? partly (`/legislation`) · new.

### parlament-4: 15 API calls where 11 are needed, and the bills section waits for the hub aggregate

- **Numbers.** 4 of 15 calls are waste: `ParliamentVotes` first:6 (unused `recentVotes`), a second
  `ParliamentDataFreshness`, and 2 all-mandate `ParliamentGroups` that feed one "N mandate în total" footnote.
  The bills section and its 2 activity calls start only after the slowest of the 7 hub calls and the 605 ms
  render: +0.7–1.0 s after the hub's last response on mobile, +0.15–0.26 s on desktop. Evidence: section 4.
- **Cause.**
  - `fetchParliamentHubLive` fans out to 2× `loadAllGroups`, `fetchParliamentVotesLive({ pageSize: 6 })` and
    freshness (`parliament-api.live.ts:406-436`). `recentVotes` has no reader in `components/`.
  - The shell asks for freshness under a separate key (`parliament-shell.tsx:36-37`,
    `use-parliament-data.ts:458-463`).
  - `ParliamentHubBillsSection` is mounted only in the hub's success branch (`parliament-hub-page.tsx:26-44`),
    so its queries cannot start earlier.
- **Fix.** Drop `recentVotes` and its call. Read freshness once (the shell from the hub aggregate, or the hub
  from the freshness query). Fetch all-mandate counts only where they are shown, or as a field of the current
  call (server). Mount the bills section outside the hub's loading branch, as the votes section already is.
- **Gain.** −4 requests and −4 preflights per visit. Bills, and the second heatmap, ≈0.7–1.0 s earlier on mobile.
- Owner client (+ server if the counts move into one field) · **P2** · shared? no · new.

### parlament-5: the hub downloads all four tabs, every parliament surface's fetchers, and the mock fixtures

- **Numbers.**
  - The route's closure that is not preloaded: 59 files, 479 KB raw, ~155 KB gzip. On mobile the serial step is
    1.4–1.7 s (request 17.8–18.2 s → last chunk 19.2–19.9 s); on desktop ~60 ms. Lazy-chunk start − entry end on
    mobile cold: **5.7–6.0 s** deployed, 5.8–5.9 s local, mostly catalogs + evaluation; desktop 414–659 ms
    (home-S3).
  - `index.lazy` is 90 KB raw / 25 KB transfer; by source-map attribution (a proxy) **66% is the
    voturi/proiecte/grupuri tabs**: filter sheets, members table, find-rep dialog, hemicycle. It also pulls fuse.js
    27 KB, Radix Select 23 KB, floating-ui 22 KB and scroll-area 14 KB, used only by those tabs' filters.
  - `use-parliament-data` is 160 KB raw / 42.5 KB transfer: the mock modules (~25 KB generated) and the inlined
    JSON fixtures (~36 KB minified; `pl-x-2026-buget` appears 12× in the built file) are ≈39%. It also carries the
    stenogram, speech, agenda, committee and member fetchers.
- **Cause.**
  - `parliament-page.tsx:2-7` imports all four tab contents statically.
  - `hooks/use-parliament-data.ts` is one module importing the whole facade.
  - The facade imports every mock and live module statically (`api/parliament-api.ts:61-166`).
  - The mock switch is a runtime call (`isMockDataEnabled` reads `import.meta.env` inside a function,
    `src/lib/scraper-references/mock-mode.ts:7-25`), so the bundler cannot drop the mock branch.
  - Only national-budget also imports mock JSON statically.
- **Fix.**
  - `React.lazy` per tab, keeping the hub inline.
  - Split the hooks/facade per surface.
  - Gate mocks behind a compile-time constant with a dynamic `import()`.
  - Move the route component into the route file, or add a head preload (home-S3).
- **Gain.** ≈55–65 KB gzip off the hub's critical path (≈0.3–0.4 s of Slow-4G link time, plus parse). With
  home-S3, most of the 1.4–1.7 s serial step on mobile.
- Owner client · **P2** · shared? partly (home-S3) · new.

### parlament-6: the parliament schema module is evaluated on every page of the site

- **Numbers.** `parliament-*.js` (`src/schemas/parliament.ts`, 2,108 lines, 182 `z.object/enum/array`) is in the
  root's 136 modulepreloads: 17 KB raw, ~5 KB transfer. Its schemas take **53 ms of zod construction during the
  mobile evaluation task on every page**: the third-largest caller in
  `evidence/home/analysis/mobile-eval-zod-callers.txt`.
- **Cause.** Eager route files import the search schemas from that module (`src/routes/parlament/index.tsx:2`,
  `grupuri/index.tsx`, `membri/index.tsx`, `voturi/index.tsx`, `stenograme/index.tsx`,
  `membri/$memberId/{voturi,interventii}.tsx`, `stenograme/sedinte.$sessionKey.tsx`). The search schemas sit at
  lines 1733–2000 among all the data schemas.
- **Fix.** Move the search schemas to `src/schemas/parliament-search.ts`.
- **Gain.** −53 ms of mobile main thread and −17 KB raw on every page.
- Owner client · **P3** · shared? yes (all pages; part of home-S1) · new.

### parlament-7: the votes-panel PNGs, 558 KB, 1024w on both profiles

- **Numbers.** `votes-camera-1024` (297 KB) and `votes-senat-1024` (262 KB) load on desktop (≈1.98–2.05 s) and on
  mobile (24.3–26.9 s, lazy). On mobile, 412 px × 1.75 DPR picks the 1024w file. WebP q80 would be 140 + 112 KB
  (palette PNGs compress less).
- **Cause.** `votes-chamber-panel.tsx:5-8,56-72`: two PNG widths only, 512 and 1024.
- **Fix.** WebP plus a 768w variant.
- **Gain.** −300 KB on desktop, −300 to −450 KB on mobile; after LCP, so bandwidth only.
- Owner client · **P3** · shared? no · new.

### Shared (numbers from this page; analysis in home.md)

- **shared: home-S1.**
  - 232 JS files.
  - 2,232 KB transfer / 6,559 KB decoded.
  - Mobile evaluation task: 1.11–1.36 s at ~16.6 s.
  - Pre-hydration zod self time: 119 ms on desktop (local trace).
- **shared: home-S2.** All six catalogs 12,185→16,594 ms on mobile (≈552 kB / 539 KiB).
- **shared: home-S3.** Lazy start − entry end: 5.7–6.0 s mobile cold, 0.41–0.66 s desktop cold. The route's own
  serial step: 1.4–1.7 s mobile, ~60 ms desktop.
- **shared: home-S4.** CSS done at 7.46–7.53 s on mobile → FCP 7.6 s, the same as `/` (7.67 s).
- **shared: home-S5/S7.** Inter font 350 KB, done at 14.3–14.4 s on mobile. Sentry, PostHog and the logo as
  on `/`.
- **shared: home-S6.** Every one of the 15 calls waited for Clerk (section 4, parlament-1). Clerk JS 308 KB after
  hydration.
- **shared: home-S8.** `/parlament` sends `public, max-age=0, s-maxage=600, stale-while-revalidate=3600`
  (`index.tsx:19-23`). Cloudflare: `DYNAMIC`. There is no Nitro route rule. Warm views refetch the 19 KB HTML:
  warm FCP is 0.84–1.12 s on mobile, against 0.26 s for `/`.
- **shared: home-S9.** 12 preflights per cold load, 88–113 ms each. On mobile warm there are 12 again: the cold
  load took more than 5 s, so the preflight cache had expired.
- **shared: home-S11.** Not measured here.

## 6. Not checked / open questions

- The other tabs (`?tab=voturi|proiecte|grupuri`) were not timed; from the code:
  - **grupuri** adds the members directory plus two hemicycles. These read the full current roster: 5 pages of
    100, one then four in parallel, a 2-step chain (`parliament-api.live.ts:475-514`). Its filter sheet reads
    groups and counties.
  - **voturi** adds an infinite votes list and vote-kind counts.
  - **proiecte** adds the bills list.
  - All of them share parlament-1 (client-only, Clerk wait) and parlament-5.
- parlament-3's mobile gain comes from one blocked-request run. Not fetching the image at all could differ
  slightly. Real-device check: DevTools throttling does not delay preflights (home-S9), so section 4 under-reports them.
- `/parlament` has no `head` (title/description/canonical); it falls back to the root's. This is SEO, not
  performance, and outside this brief.
- Hard-coded Romanian error text in `parliament-hub-page.tsx:33` bypasses Lingui. Noted; not performance.
