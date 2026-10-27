# National budget — `/national-budget`

Subagent report for the 2026-10-27 main-page audit. Code: dev `9db3bce0` (deployed image `4a6d672a`).
Evidence: `evidence/national-budget/{deployed,local}/national-budget-{desktop,mobile}/` (batch) and
`evidence/national-budget/extra/` (stream timing, the Clerk/hydration experiment, and the scripts that made them).
All batch runs used the corrected desktop UA (plain Chrome, not `HeadlessChrome`).

## 1. Entry point

- The sidebar's "National Budget" (`src/components/sidebar/nav-main.tsx:58`) and the landing page
  (`src/features/landing/components/landing-page.tsx:71`, `landing/lib/landing-groups.ts:65`) link `/national-budget`.
- Route: `src/routes/national-budget.index.tsx` has `ssr: true`, no loader or `beforeLoad`, and sends `no-store` to the browser
  and the CDN (`:32-36`). The component is in `national-budget.index.lazy.tsx` → `src/features/national-budget/home/`.
- Other spellings (deployed, `curl -A Chrome`):
  - `/budget-explorer` → **301** `/national-budget`, and `?year=2024` → `/national-budget?an=2024` (`src/routes/budget-explorer.tsx:23-34`).
  - `/budget-explorer?view=…` (any explorer key) → 200: the old explorer stays.
  - `/buget-national-2026` → 301 `/national-budget` (`src/routes/buget-national-2026.tsx`).
  - `/national-budget/` → 307 (the router's trailing-slash redirect). `/buget-national` → 404.
  - No duplicate pages.
- The page has 8 data bands plus a head and a figures band. Every band has its own Suspense/error boundary
  (`home-shell.tsx:42-69`), and the whole page sits in **one outer Suspense** (`national-budget-home-page.tsx:100-111`).

## 2. Numbers (medians of 3; LCP element = the head's `h1` „De unde vin banii publici / și pe ce se duc" on every run)

| target | profile | view | TTFB | FCP | LCP | CLS | TBT | hydration shell / end | req | transfer KB | JS KB (transfer / decoded) | API (preflights) | HTML KB (transfer / decoded) | doc end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| deployed | desktop | cold | 131 | 408 | 1048 | **0.436** | 256 | 842 / 1309 | 231 | 3362 | 2147 / 6323 | 11 (3) | 55 / 382 | 1156 |
| deployed | desktop | warm | 64 | 344 | 1000 | **0.436** | 13 | 426 / 798 | 230 | 128 | 0 / 6323 | 12 (1) | 55 / 385 | 1139 |
| deployed | mobile | cold | 93 | 7280 | 7804 | 0.001 (0.29 shift) | 1917 | 17812 / 18366 | 225 | 3079 | 2146 / 6323 | 10 (2) | 55 / 383 | 1165 |
| deployed | mobile | warm | 54 | 864 | 1928 | **0.29** | 918 | 2048 / 2446 | 224 | 119 | 0 / 6323 | 10 (2) | 55 / 382 | 1149 |
| local | desktop | cold | 25 | 244 | 1016 | **0.436** | 243 | 624 / 1284 | 229 | 3244 | 2036 / 6292 | 11 (3) | 54 / 383 | 1238 |
| local | desktop | warm | 28 | 192 | 1388 | **0.436** | 0 | 388 / 727 | 240 | 247 | 0 / 6292 | **25** (1) | 54 / 379 | 1215 |
| local | mobile | cold ¹ | 29 | 8522 | 9008 | 0.001 (0.29 shift) | 1623 | 17590 / 18045 | 223 | 2964 | 2036 / 6292 | 10 (2) | 54 / 379 | 1164 |
| local | mobile | warm ¹ | 28 | 880 | 1952 | **0.29** | 894 | 2108 / 2360 | 222 | 116 | 0 / 6292 | 10 (2) | 54 / 382 | 1270 |

¹ Local mobile run1-cold timed out (harness cap, 120 s): the document stopped after the 82.6 KB shell and the CSS and entry
never completed on that connection (`local/national-budget-mobile/run1-cold.json`). That points at the local front proxy, not
the app; see §6. Its paired warm load was in effect a second cold load (FCP 6.7 s). The summaries include all three
runs and ignore null metrics: cold FCP/LCP/hydration therefore use runs 2–3; other cold metrics and the warm medians
include run 1.

- The mobile cold CLS median is 0.001, but every mobile cold run has **one 0.29 shift** 0.46–0.5 s after FCP (7.74–7.79 s).
  The harness's CLS window misses it there; it is counted on warm loads. It is the same footer shift as on desktop (national-budget-1).
- Last React commit: desktop 6.0–8.2 s, mobile cold 23.6–23.9 s, mobile warm 7.6–8.3 s. That is the law band's chained reads (national-budget-3).
- DOM 1.9–2.1 k nodes. 202–203 JS files per load, the same set as home (home-S1).
- **Crawler path (home-S11):** `curl` (a bot to `isbot`) gets the `allReady` render. Its TTFB is 2.2 s on deployed
  (`x-envoy-upstream-service-time: 2127`), which is the total SSR data time. A Chrome UA gets the shell at 0.11–0.13 s.

## 3. Waterfall (deployed, mobile, cold, run 2: `deployed/national-budget-mobile/run2-cold.json`)

1. 0–1,141 ms: the document streams. The shell (head plus the outer fallback, 82.6 KB decoded) is ready at once. The page
   content follows when the catalog and the full-year series are read (≈0.85 s at the server, §4), and the law reads end the stream.
2. 619–7,085 ms: the CSS shares the pipe with 136 modulepreloads (home-S4). **FCP 7,312 ms**: header, the 10-row skeleton
   and the **footer** in view.
3. ≈7.75 s: the parser runs the streamed `$RC` swaps, the page replaces the skeleton, the footer is pushed out
   (**0.29 shift**), and **LCP 7,804 ms** (the `h1`, which had been in the HTML since ≈1 s).
4. 619–10,797 ms: the entry (265 KB zstd). 10.77–15.0 s: Lingui catalogs and the other late static imports, 661 KB (home-S2).
   15.04 s: 1.39 s module-evaluation task.
5. 16,319–17,361 ms: the page's own route code, 10 files / 58 KB zstd, requested only now (home-S3).
6. **Hydration** shell 17,541 ms, end 18,020 ms (673 ms hydration task in the trace).
7. 17,688 ms → 23,810 ms: the law band's chapter reads, 2 chains × 5 sequential pages (§4). The page's last commit is at 23.8 s.
   Clerk runs from 17.45 s to 22.98 s (home-S6) and does not delay these reads.

Desktop (deployed run 2): first paint 380 ms with the skeleton and footer. Content arrives ≈0.9 s, then the footer shifts
(0.436) and LCP 1,048 ms. Hydration 829 / 1,309 ms. Law chain 1.0 → 6.5 s.

## 4. API calls

SSR: 15 calls on **every** render, on the local server (11 renders with data, medians below; `ssrApiCalls`). No
cross-request cache exists for this page. Start is relative to the document request.

| operation | where | start | duration (median, min–max) | size (gzip) | chained after |
|---|---|---|---|---|---|
| `BudgetNationalCatalog` | SSR | 26 ms | 74 ms (39–**1,132**: ≈1.1 s whenever the API's own cache is cold) | 7.5 KB | — (the page suspends on it) |
| `BudgetNationalExecutionSeries` ×5 (totals by year, YTD by month, totals/spending/revenue lines) | SSR | 118 ms | **764** (680–898) | 0.5–1.3 KB | catalog (snapshot id is in every key) |
| `BudgetExecutionObservations` ×3 (GDP shares, GDP, budget columns) | SSR | 119 ms | 119 (59–266) | 1.0–2.1 KB | catalog |
| `EntityAnalytics` ×2 (ANAF authorities, year and year−1) | SSR | 120 ms | 135 (93–284) | 2.6 KB | catalog |
| `AggregatedLineItems` ×2 (ANAF chapters, year and year−1) | SSR | 121 ms | 169 (105–322) | **54 KB** each | catalog |
| `BudgetApprovedRecords` (law deficit, row 9901) | SSR | 122 ms | **1,090** (998–1,221) | 0.9 KB | catalog |
| `BudgetApprovedTotals` (law totals) | SSR | 122 ms | **1,088** (984–1,251) | 2.3 KB | catalog |
| `BudgetApprovedRecords` ×10 (law chapters: 2 laws × 5 cursor pages of 100) | browser, `auth: 'none'` | at hydration: desktop ≈1.0 s; mobile 17.7–18.1 s | 1.03–1.32 s each, 5 rounds: band done +5.5 s (desktop) / +6.1 s (mobile) | ≈6 KB each (≈60 KB for 10) | each page after the previous one (cursor) |
| `BudgetApprovedRecords` (law deficit, again) | browser | desktop only, ≈1.0 s | ≈1.1 s | — | duplicate of the SSR read (national-budget-3) |
| catalog + the 14 SSR reads above, again | browser | desktop repeat views at 0.63–0.76 s | as SSR | ≈130 KB | duplicate (national-budget-2) |

- Content time = catalog plus the slowest read the page waits for (the full-year series): **≈0.85–0.93 s**. Stream end =
  approved reads, **≈1.2 s**. When the API's catalog cache is cold, these are 2.4 s / 2.7 s (deployed stream sample
  `extra/stream-timing-deployed.txt`, compared with `-2.txt`).
- Preflights (home-S9): 2–3 per cold load (69–173 ms deployed); the 5 s preflight cache covers the chained pages.
- **home-S6 question:** no browser read on this page waits for Clerk. All of them pass `auth: 'none'`
  (`src/features/national-budget/analytics/api/national-budget-api.ts:99`, `src/lib/api/entity-analytics.ts:85,105`). Mobile cold:
  the first reads start 17.69–18.06 s, 0.15–0.18 s after hydration shell. clerk-js is still downloading then (17.4–19.5 s), and
  Clerk's FAPI calls run 19.3–20.9 s. Desktop: the reads start ≈1.0 s and Clerk is ready ≈1.4–1.6 s (cold).

## 5. Candidate issues

### national-budget-1: The whole page, `h1` included, waits for data behind a skeleton that leaves the footer in view (CLS 0.29–0.44 on every load)

- **Numbers.** Every load of all 4 targets × profiles has one footer shift (`footer.relative.border-t…`): **0.436 desktop**
  (12/12 loads) and **0.29 mobile** (11/11 completed loads). LCP is the same `h1` and lands only when the content streams in:
  - desktop: LCP−FCP **0.64 s** (deployed cold 408 → 1,048);
  - mobile warm: **1.06 s** (864 → 1,928);
  - mobile cold: **0.52 s** (7,280 → 7,804).

  First paint shows the header, a 10-row skeleton (≈512 px) and the footer, and the footer text is the first LCP candidate
  (`run2-cold.json` `lcpCandidates`).
- **Cause.**
  - `NationalBudgetHomePage` wraps the whole page in one Suspense whose fallback is `HubPending rows={10}` in `py-20`
    (`src/features/national-budget/home/components/national-budget-home-page.tsx:100-111`).
  - Inside it, `Page` suspends first on the catalog (`:58,63`). Then it suspends on `useUnfinishedYears` (`:64`), which awaits
    the full-year totals series (`hooks/use-home-data.ts:144-161`, ≈0.76 s at the API).
  - So the head, whose `h1` and intro are static text (`components/home-head.tsx:178-200`), streams only at ≈0.85–0.93 s,
    together with all the bands.
  - On mobile cold the HTML is there at ≈1 s, but the swap runs after the CSS (7.09 s) and the parser catch-up, 0.5 s after FCP.
  - On mobile warm the entry's 573 ms evaluation task (895–1,468 ms) delays the swap further.
- **Fix.**
  1. Render the head's static part (crumb, `h1`, intro) outside the data boundary, so it is in the shell. Only the year menu,
     the sources line and the balance aside need the catalog: give them their own `BandRead`.
  2. Give the remaining fallback the page's height (e.g. `min-h-[100svh]`, or the figures band plus band skeletons) so the
     footer is never in the first viewport.
  3. Move `useUnfinishedYears` out of `Page`, into the year menus, or read it only when `an` is in the address. The bare page
     opens on `defaultYear(catalog)` (`lib/home-data.ts:74-76`). This lets the figures and bands stream after the catalog
     alone, not after catalog + series.
- **Expected gain.** CLS 0.29/0.436 → ≈0 on all profiles. LCP = FCP: about −0.64 s on desktop, −0.5 s on mobile cold and
  **−1.06 s on mobile repeat views**. Bands no longer wait for the full-year series: up to −0.7 s for the figures band.
- Owner client · **P1** (CLS is "poor" on every load, and >1 s of LCP on mobile repeat views) · shared? partly: any page whose
  route-level fallback is shorter than the viewport gets the same footer shift. This page's cause is its own · new.

### national-budget-2: When Clerk becomes ready before the content arrives, React discards the streamed HTML and re-reads everything in the browser

- **Numbers.**
  - Batch, desktop: in 7 of 12 loads the browser read the catalog again; in 4 (local warm 3/3, deployed warm 1/3) it repeated
    **all 15 SSR reads** (25 API calls instead of 11, 189 KB API transfer vs 59 KB).
  - LCP 1,228–1,420 ms vs ≈1,000 ms without. Mobile: 0/11 (hydration is 0.9–17 s after the document ends).
  - Experiment (`extra/hydration-race-deployed-desktop.{json,log}`, deployed desktop, 3 cold + 3 repeat loads per variant):
    - normal: when Clerk was ready **before** the document ended (repeat views at 680–748 ms, and one cold load with a slow
      2.2 s render), the final `h1` is a client-rendered node, not the server's, and the page made **25** calls. This happened
      in 4/4 such loads. When Clerk was ready after the document ended (2 cold loads), the server's `h1` was kept and the page
      made 11 calls.
    - with clerk-js blocked: server `h1` kept and 11 calls in **6/6** loads.
  - Clerk timing on a repeat view: clerk-js from disk at 317–348 ms, FAPI `environment`/`client` until 623 ms, a React commit at
    632 ms, then the catalog read at 635 ms (`local/national-budget-desktop/run2-warm.json`).
- **Cause.**
  - `ClerkProvider` mounts on the client, above the routes (`src/lib/auth/index.tsx:189-207`; the auth context value changes
    when Clerk loads, `:152`; providers wrap `<Outlet/>` in `src/components/app/app-shell.tsx:101-145`).
  - A context change that reaches a Suspense boundary still **pending** from the server makes React give up hydrating it and
    render it on the client (react-dom `updateDehydratedSuspenseComponent` → `retrySuspenseComponentWithoutHydrating`).
  - The page's boundary stays pending until ≈0.9–1.2 s (national-budget-1, §4). The client then renders the fallback, issues
    its own reads, and drops the streamed HTML when it arrives.
- **Fix.**
  - Load Clerk lazily (home-S6's fix: auth routes, signed-in cookie, or first interaction). This removes it.
  - Otherwise, keep Clerk's provider value stable until the stream has ended (the router's `$_TSR.streamEnded`) or `load`.
  - national-budget-1 shortens the window for the head, but band boundaries pending at that moment are exposed the same way.
- **Expected gain.** Desktop repeat views: −14 to −15 duplicate API calls (≈130 KB), LCP −0.2 to −0.4 s, no throw-away of the
  server HTML. Real-world mobile on fast networks/CPUs would sit between the two profiles.
- Owner client · **P2** · shared? **yes, likely**: any page whose main content streams after the shell (route component in a
  Suspense boundary waiting on SSR reads). It adds a consequence to home-S6 · new.

### national-budget-3: The law band reads 2 × 5 pages of records in a chain in the browser (≈1.1 s per page at the API)

- **Numbers.**
  - 10 browser `BudgetApprovedRecords` calls in 5 rounds: band complete at 6.0–8.2 s on desktop (last commit), 7.6–8.3 s on
    mobile warm, and **23.6–23.9 s on mobile cold (≈5.5 s after hydration ends)**.
  - Each page takes 0.96–1.32 s on deployed. The same read at SSR (deficit, 1 page) takes 1.09 s median.
  - On desktop, the SSR deficit read is issued again in the browser (11th call in 11/12 desktop loads), because the client's
    prefetch runs before the server streams that read.
- **Cause.**
  - `lawChaptersOptions` reads the state-budget synthesis' credit rows for both laws, page by page, browser-only by design
    (`src/features/national-budget/home/hooks/use-home-data.ts:107-124,216-223,261-264`: "their rows come in pages, some 5 s").
  - Cursor paging is at `MAX_PAGE_SIZE = 100` (`analytics/api/national-budget-api.ts:52-54,288-310`), and it keeps about 20
    chapter rows of 401–500 (`lib/home-law.ts:54-66`).
- **Fix.**
  - Server: a chapter-level aggregate, or a filter on `budgetApprovedRecords` for chapter-level rows (all lower codes blank),
    so one request returns the ≈20 rows. A records page should not cost ≈1 s.
  - Client: then read it on the server with the other law reads.
- **Expected gain.** The law band completes with the rest (≈1.2 s server-side). That is −5 s desktop and −6 s mobile on the
  page's settle time, and −10 browser calls / ≈55 KB.
- Owner **server** (+ client) · **P2** (below the fold, not LCP) · shared? no · new.

### national-budget-4: The API sets the content time on every render: catalog gate, 0.76 s series, 1.1 s law reads

- **Numbers.**
  - Every render makes 15 SSR calls (11/11 completed local loads; the deployed pod streams content at the same ≈0.85–0.93 s).
  - The catalog is a serial gate: 39–86 ms when the API's cache is warm, **1.03–1.13 s** when it is cold. That was seen at
    warm-up, in local desktop run1 and in 2 of 7 local mobile renders (proxy log), and in a deployed sample with content at 2.4 s.
  - The five `BudgetNationalExecutionSeries` take 680–898 ms; `BudgetApprovedTotals`/`Records` take 984–1,251 ms (§4).
  - With the cold catalog: deployed desktop run1 LCP 2,400 ms; local desktop run1 2,660 ms.
- **Cause.** The API's response times (owner `server`; operations named above). On the client there is no route loader, so
  the reads start only when React renders `Page` (`national-budget.index.tsx:32-36`), and nothing is shared between requests
  (home-S10). The `no-store` choice is deliberate (`:28-30`: a failed band must not be cached).
- **Fix.**
  - Server: profile the series and approved resolvers, and keep the catalog cached (it changes only when a load lands).
  - Client, optional: a short in-process cache of the catalog keyed by nothing (its snapshot ids key every other read), or
    `ensureQueryData` for the catalog in a loader so the reads start before render.
- **Expected gain.** After national-budget-1 this no longer moves LCP. It moves the figures and bands: up to −0.7 s for
  most bands (series), −1 s for the law band, and −1 s whenever the catalog cache is cold.
- Owner **server** · **P2** · shared? no (other pages have their own resolvers) · new.

### national-budget-5: 160 KB of the 394 KB HTML is inline script; reads are dehydrated whole for a few numbers

- **Numbers.** Deployed streamed HTML: 394 KB decoded / 55 KB zstd. 38 inline scripts make 160 KB, of which ≈148 KB is
  serialized query data:

  | read | dehydrated | what the page uses |
  |---|---|---|
  | catalog | 35 KB | |
  | budget-columns observations | 25 KB | 4 values |
  | law deficit records | 22 KB | 1 value |
  | law totals | 22 KB | a few cells |
  | 5 series | 23 KB | |
  | ANAF authorities | 11 KB | |

  Markup is 212 KB: the spending and revenue bands are ≈30 KB each, mostly a 100-cell grid with an inline `color-mix(…)`
  style of ≈170 B per cell. The 2 ANAF chapter reads download 2 × 54 KB gzip of every functional×economic row at SSR to
  make 2 × 1.3 KB of chapter totals (`lib/home-data.ts:342-353`, `src/lib/api/entity-analytics.ts:111-130`).
- **Cause.** The query options cache the raw API answers (`analytics/hooks/use-national-budget-analytics.ts:53-95`). The
  router's query integration dehydrates every query into the document. The page already reduces in `queryFn` for the law
  chapters and the ANAF chapters, but not for these reads.
- **Fix.**
  - Reduce in `queryFn` (page-specific keys) to what the bands draw.
  - Colour the cells by class rather than inline style.
  - Server: an aggregate by chapter for the ANAF lane.
- **Expected gain.** About −60 to −70 KB decoded HTML (≈−10 KB zstd), and less parse/deserialize work on mobile (tens of ms
  at 4× CPU). The SSR fetch shrinks by ≈100 KB gzip.
- Owner client (+ server for ANAF) · **P3** · shared? no · new (the size was the lead's first look).

### national-budget-6: The page's own code arrives only after evaluation (home-S3); its weight is small

- **Numbers.**
  - home-S3 delay, mobile cold, deployed: the lazy chunk starts **5.52–5.86 s after the entry ends** (median 5.77 s;
    10.74–10.80 → 16.32–16.60 s). Most of that gap is home-S2 (catalogs to 15.0 s) plus the 1.39 s evaluation task.
  - The serial step that is this page's own: 10 files / 58 KB zstd / 149 KB raw, requested at 16.3–16.6 s and done at
    17.36–17.64 s (**1.04 s**). Hydration shell follows at 17.54–17.88 s.
  - Desktop: route chunks 739–788 ms after an entry done at 280 ms.
- **Content (source maps, `sourcesContent` length as a proxy).**
  - `national-budget.index.lazy` (76 KB raw): all of it is the page's own bands, led by `home-law` 18 KB and `home-data` 16 KB.
  - `analytics-parts` (42 KB): shared with the analytics page.
  - `hub-figures` (10 KB).
  - No chart library: the charts are hand-drawn SVG/`div`. recharts (128 KB zstd) is still loaded, as a root preload (home-S1).
- **Fix / owner / severity.** As home-S3: client · P1 there · shared: yes · new.

## Shared causes (numbers from this page; analysis in `domains/home.md`)

- **home-S1** (root preloads): 202–203 JS files, 2.15 MB transfer / 6.3 MB decoded per cold load, the same as home. That
  includes recharts, which this page never uses.
- **home-S2** (Lingui catalogs): `messages-*` ×2 (243 + 235 KB), `admin` ×2 and `pnrr` requested 10.77 s, done 15.0 s (mobile cold).
- **home-S3**: see national-budget-6 (1.04 s serial step; 5.77 s entry-end → lazy start).
- **home-S4** (CSS contention): CSS 0.62 → 7.09 s → FCP 7.28 s (mobile cold, deployed); local 8.5 s.
- **home-S5 / home-S7** (logo, font, Sentry/PostHog): the same files as home; not re-measured.
- **home-S6** (Clerk): clerk-js 17.4 → 23.0 s on mobile cold. This page's reads don't wait for it (`auth: 'none'`), but its
  arrival triggers national-budget-2.
- **home-S8** (HTML caching): not Nitro-cached; `no-store` + `CDN-Cache-Control: no-store` by design; `cf-cache-status: DYNAMIC`.
  The old spelling `/budget-explorer` is in Nitro's route-cache list (its 301 is cached).
- **home-S9** (preflights): 2–3 per cold load, 69–173 ms on deployed; mobile under-reported as home-S9 says.
- **home-S10** (server caches): none for this page. All 15 SSR reads run on every render, local and deployed alike.
- **home-S11** (crawler path): curl gets `allReady` at 2.2 s TTFB on deployed. Before the fix, the harness's old
  `HeadlessChrome` desktop UA took the same path.

## 6. Not checked / open questions

- national-budget-2 is proven for the trigger (Clerk ready before the content ends; 4/4 with vs 0/6 without) but not for the
  exact context. Which provider value change reaches the boundary (Clerk's own contexts or `AuthContext`, `src/lib/auth/index.tsx:152`)
  needs a React DevTools/Profiler pass. Other domains with streamed route content should check their desktop repeat views
  for duplicate reads.
- Why the deficit read is repeated on desktop even when nothing is client-rendered: the router's query stream sends the
  catalog's dehydrated entry only with the page segment (first seen 0.85 s, together with the content;
  `extra/stream-timing-deployed-2.txt`), so pending queries do not seem to reach the client early. This was not traced inside
  `@tanstack/router-ssr-query-core`.
- Local mobile run1-cold stalled after the shell (CSS/JS on the same connection never finished; 120 s cap). It looks like
  `tools/front-proxy.mjs` (HTTP/2 + streamed HTML), not the app; the deployed target never stalled. The lead may want to
  check the proxy.
- The API's catalog cache lifetime (cold again after ≈30 min idle in the samples) is the server's to state.
- Real Slow 4G devices: DevTools does not throttle preflights (home-S9), so the law chain's first round is under-reported on mobile.
