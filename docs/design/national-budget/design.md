# National budget — design notes

Area: `/buget-national-2026` (`src/features/budget-2026/`), `/budget-explorer`
(`src/routes/budget-explorer.lazy.tsx`, `src/features/national-budget/`,
`src/components/national-budget/`, `src/components/budget-explorer/`).
Session: `national-budget` worktree, dev server on :3008.

## 1. Audit of what exists (2026-10-02)

### 1.1 `/buget-national-2026`

- Static JSON in `src/features/budget-2026/data/`, extracted server-side from the
  **draft** law's Anexa 3 PDFs (server note
  `docs/research/research-202603231105-national-budget-2026-client-data-issues.md`),
  dated 2026-03-23. No API, no Zod schema, no catalog entry, no lineage badge.
- Thousand-lei values: 2026 proposed 527,413,262; 2025 preliminary 500,854,887;
  2024 realised 432,389,656; estimates 2027–2029 501,946,089 / 506,264,766 /
  493,586,216; 55 principal credit holders (ordonatori principali).
- Page: gradient hero with an animated total, a prose card, a functional treemap,
  a Sankey (two tabs), a top-10 ranking, top-15 year-on-year bars, a 2024–2029
  trend line, a methodology section of three cards plus an article.
- No Lingui; Romanian without diacritics; `ro-RO` hardcoded; undated FX rates
  (`formatting.ts`).
- The only inbound link is the parliament info sheet, labelled
  „Bugetul instituțiilor parlamentare" — wrong: the page is the whole state budget.

### 1.2 `/budget-explorer`

- Live: legacy `aggregatedLineItems` (ANAF execution, `PRINCIPAL_AGGREGATED`), one
  read per section, client-side only (the server HTML holds loading states).
- A stack of up to nine cards, each a 600px treemap: „Total buget" (informative sum
  of the five sectors, transfers included), sectors 1–5, own revenues, external
  grants, Treasury. Defaults to 2025 although 2026 is served through August.
- Its route `head` is exported from the lazy file and never applied: the page has no
  title or meta.

## 2. Data findings (probed on the dev API through :3008, 2026-10-02)

- **Execution is served 2016 → August 2026.** State budget = `budget_sector_ids:["1"]`,
  `funding_source_ids:["1"]`, `report_type: PRINCIPAL_AGGREGATED`, expenses `ch`:

  | Year | Spent (bn lei) | | Year | Spent (bn lei) |
  |---|---:|---|---|---:|
  | 2016 | 130.08 | | 2021 | 264.23 |
  | 2017 | 144.42 | | 2022 | 315.37 |
  | 2018 | 174.67 | | 2023 | 345.68 |
  | 2019 | 200.56 | | 2024 | 435.20 |
  | 2020 | 246.93 | | 2025 | 499.44 |
  | | | | 2026 Jan–Aug | 312.79 |

  2015 returns nothing; September 2026 onward returns nothing. Revenue (`vn`, same
  filter): 2024 278.15, 2025 325.79, 2026 Jan–Aug 247.22 bn lei.
- **`MONTH` periods are monthly flows, not year-to-date:** the twelve 2025 months
  sum to 499.46 against the year's 499.44. Jan–Aug 2026 312.78 vs Jan–Aug 2025
  302.62 (+3.4%, nominal).
- **Sector ids:** 1 state, 2 local, 3 social insurance, 4 unemployment, 5 health
  (FNUASS). Report types are different consolidation levels and must not be mixed
  (sector 1, 2025, no source filter: principal 570.47, detailed 519.13, secondary
  205.67 bn).
- **Execution ranks the same 55 ordonatori principali as Anexa 3** (`entityAnalytics`,
  sector 1, source 1, 2025: `totalCount` 55). Execution agrees with the annex's
  „preliminat 2025": Labour 99.25 bn executed against 99.24 bn implied by the annex
  (91.80 bn at −7.5%); Finance – general actions 87.11 against 87.15. A plan-vs-spent
  view per ministry is feasible once the annex rows carry CUIs (a reviewed 55-row
  mapping; never a name join at runtime).
- **Approved-law facts (`budgetApprovedFacts`) are served but not usable yet**:
  filters take `{eq: …}` objects; `pageSize` is capped at 100; `total` is null; in
  two 100-row samples of 2026 only 4 and 12 rows carried a functional code; no
  ordonator field; the component is `national_budget` (not `state_budget`).
  **Correction (handoff, 2 October):** that reader selects the older
  `budget.approved_budget_facts`. The reviewed lane is
  `budget.approved_budget_lines`: seven law editions 2019–2025, 180,507 lines
  (each law as sent to the Monitorul Oficial; five forms: state synthesis and
  authority detail, social insurance, health, unemployment), audited, with no
  API reader yet.
- **The consolidated general budget (BGC) is in production.** Correction
  (handoff, 2 October): the empty `bgc_official_facts` only means the old reader
  does not see the new lane. 241 selected Ministry of Finance bulletin releases,
  January 2006 – July 2026, sit in `budget.execution_release_*`; six months are
  unpublished (December 2008, September and November 2012, July 2019, January
  2024, May 2025, each with a reason). Each release is cumulative from January;
  its facts carry coverage, status and finality. The new execution-release reader
  is pending.
- **Two execution sources agree but stay apart.** The bulletin's state-budget
  spending equals the ANAF principal aggregate probed above: 499.44 bn for 2025
  in both, 271.98 bn (bulletin, January–July 2026) against 271.97 (the sum of
  the ANAF months). Different populations by design (MF national report vs
  ANAF entity reports) and different data-through dates; the page keeps them
  apart.

## 3. Problems found in the current pages

Data trust (verified):

1. Year-on-year „creșteri / net" are top-15 sums shown as totals: +46.06 bn and
   net +26.19 bn on the page; all 40 increases are +46.43 bn and the net is
   +26.56 bn (thousand-lei sums from `entities-ranking.json`).
2. The page is a March draft („Proiect de lege") with no date, in October 2026.
3. Appropriations (credite bugetare) are titled as spending („Cheltuieli…",
   „Evoluția cheltuielilor").
4. One trend line joins realised 2024, preliminary 2025, proposed 2026 and
   estimates 2027–2029, nominal, unlabelled as such.
5. The server HTML sends „0 RON" as the headline (animated counter), and the
   Sankey footer differs between server („Total acoperit de flux 527,41") and client
   („Total vizibil în flux 463,87", 88% of the total, share not stated).

From the code audit (not each re-verified): `?year=` overrides the period picker on
the explorer; a failed funding-source lookup silently widens a sector to every
source; the no-transfers „Total buget" applies every sector's exclusions to all of
them; `FilteredSpendingInfo` says „Spending" in income mode; real (inflation
adjusted) values are not labelled as such.

## 4. Server asks (numbered, for the server session)

1. **A reader for `budget.approved_budget_lines`** (superseding the earlier ask
   on `budgetApprovedFacts`): filters by edition, fund, form, authority code,
   measure and target year; the source fields the page shows (`budget_year`,
   `measure_year`, `publication`, `fund`, `form`, `annex`, `authority_code/name`,
   the hierarchy codes, `label`, `row_role`, `credit_type`, context row,
   `token`, `amount`, `unit`, file/version/hash); plus the explicit totals (§5.3)
   and each authority's own total row, so no client adds rows.
2. **The adopted 2026 law and its rectifications**, loaded as versions, so plan
   figures are not the March draft and a plan-versus-execution rate can one day
   use final credits.
3. **A „data through" date for execution** (latest loaded month), so the UI derives
   its cutoff instead of hardcoding it. The dev API serves August 2026 while the
   scrapper audit says July.
4. **Sector filter on the national time series** (`budgetAggregateTimeseries` sums
   all entities; it cannot isolate the state budget).
5. **Flag multi-month deltas** (scrapper audit ANAF-01: a month after a gap carries
   several months' money while marked monthly).
6. **A reader for the execution releases** (corrected: the BGC data exists, the
   reader does not): the release index with gaps and reasons, and one release's
   current facts with their semantic key, unit, cell, file URL and hash. The BGC
   is the only honest „national total"; until it is served, any cross-sector sum
   stays an informative sum.
7. **An authority-code → CUI map, reviewed**, before any plan-versus-ANAF
   comparison per ministry (the law's codes are not CUIs; names are not keys).

## 5. Page prototypes (2 October 2026)

Brief: one page, the explorer separate, two variants on the reviewed handoff,
labelled mocks („Date pentru machetă — API în lucru"). Prototype:
`/development/national-budget/page` (`?v=panorama`, `?v=intrebari`); record of
the variants in `src/development/prototypes/national-budget/page.RATIONALE.md`;
review file `data-handoff-20261002/prototype-review-ready.md`.

### 5.1 Contract

`src/schemas/national-budget-page.ts` (wire rows as the tables hold them, domain
shapes, typed `unavailable` / `gap` results) and
`src/features/national-budget/page/` (adapter with mock and live
implementations, query hooks, the model). The live adapter answers
`api_pending`; going live is a `.live` implementation mapping the server's rows
to the same types. Proposed endpoints: `budgetEditions`, `budgetApprovedTotals`,
`budgetApprovedSeries`, `budgetApprovedAuthorities`,
`budgetApprovedAuthorityLines`, `budgetExecutionRelease` (names are proposals).
Fixtures are regenerated, never edited:
`node scripts/generate-national-budget-page-fixtures.mjs`.

### 5.2 Rules the page holds

- A law's value names its edition and target year; forecasts per edition stay
  separate („Estimare pentru 2026 din bugetul 2025").
- One unit per table, stated in the header; law amounts ×1000, execution as
  declared.
- A comparison runs only when scope, unit, period and basis match; plan versus
  execution never does today (initial law, not final credits), so the page shows
  both figures and the failed checks, no rate (`model/comparability.ts`).
- The bulletin's lines are a tree whose parents equal the sum of their children
  (checked by test on both releases and both components); nothing is added
  across levels.
- Real, draft and invented values are marked apart (no mark, `PROIECT`, `DEMO`).

### 5.3 Explicit totals used

| Budget | Revenue | Expenditure |
|---|---|---|
| State | record 0, „VENITURI - TOTAL" | credit rows of capitol 5001, „CHELTUIELI - BUGET DE STAT" |
| Social insurance, health, unemployment | record 0, „VENITURI - TOTAL" | credit rows of capitol 5000, „TOTAL GENERAL" |

Health also prints 5005 „CHELTUIELI - TOTAL" (77,220,381 against 77,224,741
thousand lei in 2025); the page names 5000 and does not add the other. The
2025 revenue totals equal the printed unit witnesses pinned by the scrapper
(357.353.033 / 155.110.881 / 77.220.381 / 2.857.392).

## 6. Redo in the hubs' language (2 October 2026)

**Owner, on §5's two variants:** „very bad". They asked for the language of
`/procurement`, `/ins`, `/ngos` and `/procurement/analytics`, editorial, with
complex data in a table like the analytics page's, its inner buttons and
components adapted. §5's prototype (`national-budget/page`) is kept as a
record, per the keep-prototypes rule.

### 6.1 Decision: two pages, as procurement has them

- **Front door:** `/development/national-budget/hub`, in the `/procurement`
  hub's language.
- **Analysis page:** `/development/national-budget/analize`, in the
  `/procurement/analytics` language.

Their anatomy is in `src/development/prototypes/national-budget/budget.RATIONALE.md`.
They reuse the hubs' components: `HomeSectionNav`, `HomeBand`, `HubSectionHead`,
`HubFiguresBand`, `IndicatorToggle`, the lattice chrome, procurement's number
formats and the filter-sheet parts. At promotion, `HomeSectionNav` and
`HomeBand` should move out of the procurement feature into `src/components/`,
since a second domain now uses them.

### 6.2 Data: the ANAF lane replaces the synthetic list

- The front door's „who spends most" and the analysis page's ministries table
  read the served ANAF lane: the state budget's payments per principal
  authority, 2016 to August 2026. That is 55 authorities in 2025, linking to
  their entity pages by CUI.
- The snapshot is generated by `scripts/generate-national-budget-anaf-fixture.mjs`
  from the dev API. Every year's ranking sums to its total, which the tests check.
- It is a different population and data-through date than the MF bulletin
  (August against July 2026), so it carries its own label and is never added
  to or divided by the bulletin. ANAF's 2025 state-budget payments equal the
  bulletin's (499.44 bn lei), which a test also checks.
- The 2025 synthetic authority list is no longer shown. The draft's 55
  authorities appear only as the draft's own list, marked „proiect".

### 6.3 Rules added

- **Every table at a level adds up.** The bulletin's tree is cut at a depth:
  the lines at that depth plus the shallower leaves (`cutRows`). A group row
  opens its own lines (`rand=`), and the headline then names it, with a ✕.
- **Blank stays blank.** A line the bulletin prints blank stays in the table
  as „gol în sursă", for example the consolidated budget's „împrumuturi"
  in 2025.
- **A year in progress names its months,** by its own source: the bulletin's
  „ian.–iul. 2026", ANAF's „ian.–aug. 2026".
- **A missing year says why:** a bulletin outside the sample, an unpublished
  month, or a law still pending.

### 6.4 Server ask added

8. **ANAF state-budget year series in one read.** Today the series is eleven
   `aggregatedLineItems` reads summed client-side. This extends ask 4; the
   ministries ranking already goes live through `entityAnalytics`.

## 7. The live advanced analysis page (4 October 2026)

**Owner:** „split the national budget between the main page of the budget,
that should be graphical and easy to understand for almost every citizen, and
a dedicated analytics page where we can analyze across years, months, and the
different dimensions of the budget … continue on this analytics page." The
server's national budget API is done (seven read-only roots on Chronos
development, server `1805fdb7`, handoff of 4 October 2026).

### 7.1 Decision: the citizens' page and the advanced page

- **Citizens' page:** `national-budget/hub`, to become graphical (next).
- **Advanced page:** `/development/national-budget/avansat`, live on the API.
  It analyses across years, quarters and months and across the budget's
  dimensions: lines, budgets, the law's funds, chapters, titles and laws, and
  the ministries.
- `national-budget/analize` (the mock-era analysis page) is kept as a record.

### 7.2 The API as the page reads it

| Root | What the page reads it for |
|---|---|
| `budgetNationalCatalog` | Lane snapshots, the nine editions and their slots, the 52 series items, coverage and missing months |
| `budgetNationalExecutionSeries` | Every line by year (full year), quarter or month (the month alone or from 1 January); a period and the same period a year earlier |
| `budgetExecutionObservations` | One release's budgets (16 columns, the consolidation bridge) and its printed GDP shares |
| `budgetApprovedTotals` | Each fund's named totals and forecasts; every law's plan for every year; each authority's 5001 line |
| `budgetApprovedSeries` | The years band: each year's own law (`OWN_YEAR_APPROVALS`) |
| `budgetApprovedRecords` | The synthesis' chapters, titles and revenue chapters; one authority's chapters and titles |

`budgetExecutionReleases` is not read: the catalog's coverage gives the missing
months the period menu needs.

The transport is `src/features/national-budget/analytics/api/`. It uses the
shared `graphqlQuery` on `/api/v1/graphql`, with no auth, through the dev proxy,
so SSR works and there is no CORS. Each answer is Zod-parsed. It:

- splits a grid into reads of 12 items and merges them in order;
- sends listed dates unique and ascending (the server refuses them otherwise);
- follows pages of 100 to the end, within 40 pages, and says when a list is cut;
- sends every data read with its lane's `expectedSnapshot`, and keys the query
  by it. A `SNAPSHOT_CHANGED` sends the catalog to be read again, so one view
  never mixes two loads of a lane;
- branches on `extensions.code`. A refused input and a moved lane are not
  retried; `SERVICE_UNAVAILABLE` and other failures are retried once;
- leaves credit types out of a revenue-only totals read (the server refuses
  them there).

Values stay exact. `toAnalyticsSeries` is the handoff's adapter, in
`lib/series.ts`: a point only for an AVAILABLE period, every other period in
`missingPeriods` (an array), and the exact string in `pointDetails`. Floats are
only plotting coordinates. Amounts are shown from the exact digits
(`exactText`), and thousand lei become lei by moving the point (`thousandToLei`).
Client `dev` already has `src/lib/exact-decimal.ts` and `pointDetails` on
`AnalyticsSeries` (3 October). This branch predates them, and the fast-forward
was blocked in this session, so the feature carries local equivalents with the
same shapes, to swap for `dev`'s at promotion.

### 7.3 Anatomy

It is the procurement analytics page's grid:

- **Head:** the way back, how recent the data is, and the period menu (year,
  quarter, or month from 1 January or alone; a period no bulletin answers is
  dimmed, with why) or the law's year. The question is the headline, its
  phrases opening the filters, a line's ✕ dropping it. Then filters, ready
  questions, the link, the caveats marker and „API live" with the snapshots.
- **Pinned bar:** Cheltuieli, Venituri, Deficit, Legea, Ministere.
- **Figures:** four true of the selection, each within its own source.
- **The answer, by tab:**
  - **Cheltuieli and Venituri:** *Pe categorii* is a table of lines with lei,
    % of GDP, share bar, change on a year earlier and a 2006–2025 sparkline, at
    a level (groups / titles or categories / sources / the whole tree). A group
    opens; a line opens its time tab; each value's evidence is read on demand.
    *Pe bugete* is the release's budgets with share and change, then the bridge
    to the consolidated budget. *În timp* is a chart of the line over a matrix
    of lines by period: years, quarters or months.
  - **Deficit:** *În timp* (revenue, spending, balance) and *Pe bugete*.
  - **Legea:** *Pe fonduri* (each fund's total and the law's forecasts), *Pe
    capitole* (functional chapters that open on titles; titles under their
    groups; revenue chapters with the printed deficit set apart), and *Lege
    după lege* (every law's plan for every year).
  - **Ministere:** *Aprobat în lege* (each principal authority's 5001 line,
    share, next-year forecast; opens on its chapters and titles) and *Plătit
    (ANAF)* (the labelled snapshot).
- **Below the answer:** the years band (a click makes a year the page's), one
  source line with „Cum am calculat", and the filter sheet.

The period model:

- a year is the December release (`FULL_YEAR`);
- a quarter or a single month is the server's audited difference
  (`PERIOD_DIFFERENCE`);
- a month „from 1 January" is the release's own figure (`YTD`).

The page opens on the newest month from 1 January (January–July 2026) against
the same months of 2025. A year the bulletins have not finished is read as
its newest month.

### 7.4 Data findings (live, 4 October 2026)

- **Coverage:** January 2006 – July 2026, 241 of 247 months. Missing:
  2008-12, 2012-09, 2012-11, 2019-07, 2024-01, 2025-05. As full years, 2008
  is unavailable (no December release), and so are 2011 and 2013 (the release
  covers another period).
  **Since 7 October** (snapshot `e1.a772b180…`) the December 2008, 2011 and
  2013 bulletins are read: every full year 2006–2025 is AVAILABLE, and
  2008-12 is no longer a missing month. 2013's balance is the bulletin's own
  (−15.771,3 million lei; spending less revenue is 15.771,2). December and
  Q4 2013 as periods stay unavailable (their predecessor's finality differs).
- **The tree holds in the workbook years.** In every year from 2019 to 2025
  except 2023, each parent equals its children; a test checks this with a live
  fixture.
- **The PDF years do not add up.** In 2006–2018 and 2023 some printed lines
  have no item, so a level need not add up to its total. For example, 2023
  revenue lines fall 55 bn short (the 2014–2020 EU receipts line is not mapped).
  The page says so.
- **Budgets by column** exist only in workbook releases: 16 columns, from the
  state budget to the bridge (558.3 bn before transfers, −94.5 bn of
  transfers, 460.4 bn consolidated, January–July 2026).
- **GDP shares are printed in every release,** a year-to-date value against
  MF's annual GDP estimate (2,056 bn for 2026). The share rows carry no
  catalog item and are matched by their line's label.
- **The law:**
  - 5001 for the state budget, 5000 for the other funds; health's 5000 is not
    its 5005.
  - The 2017 state budget has no budget-credits total (`NO_MATCHING_RECORD`).
  - The synthesis' 21 chapters add up to 5001 (499.58 bn in 2025), with titles
    under groups 01/70/79.
  - The revenue chapters add up to the revenue total once the printed `9901
    DEFICIT` (−142.23 bn in 2025) is set apart.
- **Authorities:** codes belong to an edition. The authority series exists
  only on `targetYearsOfEdition`. The page compares within a law, never across
  laws by code.
- **Speed** (dev, warm):
  - catalog ~1.2 s; a 12-item grid ~0.7 s; an observation page ~0.1 s; a
    record page ~1 s;
  - SSR of most views 0.8–2 s;
  - a ministry's drill ~4 s (three record pages in sequence). The titles view
    and a chapter's drill read one chapter only (1.1 s, was 4.9 s).

### 7.5 Rules added

- **Two printed values at most.** A share is two printed values of one release
  or one law; a change compares two values of the same basis. Nothing is
  summed or subtracted, and named totals never are.
- **Law and execution never share a table or a series.** A law's forecasts
  stay in their edition. *Lege după lege* sets laws side by side and never
  merges them.
- **A period or cell without a value is a gap** with the server's reason:
  a dashed slot in a chart, a „·" with a tooltip in a matrix, a sentence for a
  whole answer.
- **The pinned names of a scrolling matrix carry a rule and a shadow.** A cell
  passing under them then reads as covered: „…14,2" for 114,2.
- **One load per lane per view.** A band's failure belongs to its view: the
  bands are keyed by the view, so the next view starts afresh.

### 7.6 Server asks added

9. **A level filter on `budgetApprovedRecords`** (chapter totals, titles,
   everything). A chapters view would then read about 25 rows, not about 500
   in five sequential pages; a ministry's drill takes ~4 s today.
10. **`catalogItem` on GDP-share observations,** as the amounts have it.
    Today they are matched by label.
11. **Component series.** The state budget, local budgets, social insurance and
    the other budgets by year, quarter and month, with audited gaps, not only
    per release. „The state budget by month" is a common question.
12. **Map the PDF-era lines to items** (2006–2018, 2023; for example 2023's
    2014–2020 EU receipts), so a level adds up in those years.
13. **Authority identity across editions:** a stable key or a reviewed
    continuity table, so a ministry can be followed from law to law.
14. **Law document URLs:** `document.url` is `null` today; the page says
    „legătura sursei: în așteptare".

Documentation only: the SDL could state that listed dates must be unique and
ascending, and that a revenue-only totals read refuses credit types.

### 7.7 Open points

- **The citizens' page** (`hub`) becomes graphical next.
- **Promotion:**
  - a route and the Lingui catalogs;
  - `exact-decimal`/`pointDetails` from `dev`;
  - the full review gate (Opus 5.5 xhigh, Codex `gpt-6.1-sol` xhigh,
    Playwright integration against a mocked API), since this is a new API
    adapter.
- **ANAF payments** stay a labelled snapshot until a live `entityAnalytics`
  read replaces it.

## 8. Finding things: navigation and the budget as a filter (5 October 2026)

The owner asked to focus on UX and navigation, so that a reader finds the
relevant number. On the budgets tab they also asked to see each budget's
evolution, and to open a budget in time for a given line (the state budget's
goods and services, for example).

### 8.1 Decision: three filters, three views

The bulletin is a cube: **line × budget × period**. The page now treats it as
one:

- **Three filters:** the line (`rand`), the budget (`buget`, new; empty means
  the consolidated budget) and the period. Each is a picker in the answer's
  bar and a removable phrase in the headline (✕).
- **Three views**, each a slice of the cube:
  - *Pe categorii*: lines, for one budget and one period;
  - *Pe bugete*: budgets, for one line and one period;
  - *În timp*: periods, for one line and one budget.
- **A row narrows its own filter.**
  - A line row opens its lines, or goes to its history.
  - A budget row goes to its history (`dupa=timp&buget=…`), keeping the line.
- **The budgets tab** now has each budget's years (a sparkline, from the
  Decembers) beside its share and change.

### 8.2 Navigation

- **Back works.** Every view is a history entry (`replace` dropped), as on
  `/procurement/analytics`.
- **Search („Caută", `/` or Ctrl/⌘ K) opens the contents** (§8.6) with its
  filter focused. Every typed word must begin a word of the name. It works
  without diacritics („invatamant", „educatiei"). A name that begins with
  the typed words comes first. Plain fuzzy matching was rejected:
  „invatamant" matched „Taxe vamale".
- **The trail** sits above a drilled table: for example *Cheltuieli totale ›
  Cheltuieli curente*, or *Toate capitolele › Învățământ*. Each step back is a
  link. It replaces the „Toate rândurile" / „Toate capitolele" links that
  were under the table. On the time and budgets tabs, the line picker already
  names the line, so the trail stays out.
- **The sticky bar** carries the search on desktop; on a phone, the search
  sits in the head's action row.

### 8.3 Data findings (live, 5 October 2026)

- **A budget's column exists only in the workbook releases,** and those are
  patchy month to month until 2023. For one line, the months with budget
  columns are:

  | Year | Months with columns |
  |---|---|
  | 2019 | June, December |
  | 2020 | January, April, December |
  | 2021 | February–May, August–December |
  | 2022 | January, March, July, August, November, December |
  | 2023 | January, April, July–October (not December) |
  | 2024 on | every month (January 2024 missing) |

  Every December 2019–2025 has the columns, except 2023.
- **Reasons the page tells apart:**
  - `no_budget_columns`: the release prints no budget columns (a PDF). It is
    detected per read: no row of that budget in the release.
  - `blank_in_source`: the release has the columns, but this cell is blank.
  - A missing release keeps the server's own reason.
- **Cost:** reads stay small.
  - One line × all budgets × every December: one page, ~0.2 s.
  - One budget × one line × 31 months: one page, ~0.1 s.
  - One budget × a section's lines × 36 months: up to ~10 pages, ~1 s.
- **Budget figures are printed exact strings** with float noise
  (`8585562336.000000868807546794414520263671875`). They are displayed
  rounded and never summed.

### 8.4 Rules added

- **One budget means cumulative figures only:** a year (its December
  release), or a month from 1 January.
  - The client never subtracts two releases to get a quarter or a month
    alone; that is server ask 11.
  - A quarter or a month alone, asked with a budget, reads its release from
    1 January, with an amber note naming both periods.
  - The time tab offers no quarters with a budget.
- **No GDP share for one budget:** the bulletin prints shares for the
  consolidated budget only.
- **The budget's share** in the figures is of „Toate bugetele, înainte de
  transferuri", the release's own column: never a sum.

### 8.5 Open points

- **Server ask 11 (component series)** would bring:
  - quarters and months alone for a budget;
  - audited gaps instead of the client's per-read `no_budget_columns`.
- **A ministry's trail** needs its name read once more; for now its headline
  names it and its table keeps the way back.

### 8.6 The contents, in a side panel

**Tried and dropped: a navigator variant** (`avansat?v=navigare`). Its
contents stood in a rail on the left. The owner liked the panel, but the
tables lost their room: at 1152 px the change and sparkline columns were cut,
and widening the frame to 88 rem only moved the problem. The variant was
removed at the owner's request.

**Kept: the same contents in a side panel on `avansat`**, as the filters are:

- **Where it opens:** from the right on a wide screen (28 rem), from the
  bottom on a phone (88 vh, a fixed height, so typing doesn't make it jump).
- **What opens it:** „Caută" in the head and in the sticky bar, `/`, or
  Ctrl/⌘ K. The filter takes the focus. A choice closes the panel; Escape
  does too.
- **What it lists:**
  - spending and revenue as the bulletin's tree, the deficit, and every
    budget side by side;
  - *Bugetul citit*: folded while the page reads the consolidated budget;
    its title names the budget it reads;
  - the law: funds, chapters (they open), titles, revenue (its chapters, to
    be found: „TVA"), law after law;
  - the ministries (the law's, largest first, read when the panel opens),
    and paid (ANAF);
  - the ready questions, folded.
- **Where you stand:** marked, for a line and a budget alike. Its branch is
  open, and the panel scrolls to it.
- **A choice goes where its row would.**
  - A group opens its lines; a line goes to its history.
  - On the budgets or time tab, a line stays on that tab.
  - A budget keeps the line and the tab.
  - Back undoes it.
- **It replaces the search box** (a command palette) of §8.2's first version.
  The page keeps its own bars: the population tabs, the line and budget
  pickers.

### 8.7 The whole tree, no levels (5 October 2026)

The owner asked to drop the level switch (*Grupe · Titluri · Arborele*;
for revenue *Grupe · Categorii · Surse · Arborele*) and show all the data,
hierarchical where it needs to be.

- **The line table** is the bulletin's tree:
  - each group is a row above its lines, one step in;
  - top-level groups are section rows (bold, shaded); deeper groups are
    medium weight;
  - lines are ranked largest first within their group;
  - the rank column went (a rank across levels means nothing);
  - shares are still of the total.
- **The time tab's matrix** shows the same tree under the total, ranked by
  the newest period.
- **The subtotal** „Transferuri – total" (to 2021) stays out: its parts are
  rows of their own.
- **Checked against live data:** with the subtotal out, each group equals the
  rows one step under it, and the top rows equal the total, in every full
  year 2019–2025 (not 2023), within a thousand lei
  (`rankedTree`, `analytics-lib.test.ts`).
- **A group folds and unfolds in place** (owner, the same day; it replaces
  opening a group as its own table):
  - a chevron sits before the group's name, and the row's click folds it;
  - everything starts open; „Restrânge / Desfă toate grupele" in the table's
    head folds or unfolds them all;
  - the fold is the reader's own: not in the address, reset by another view;
  - the categories tab never drills, so `rand` there is ignored: an old
    drilled link opens the whole tree, its headline and trail with it;
  - the time icon still takes any row, a group too, to its history;
  - picking a line in the contents panel goes to its history.
- **The time matrix folds too:** there the chevron folds, and the name still
  picks the chart's line.
- **The trail** remains for an opened law chapter only.
- **`nivel` is gone from the address.** An old link with it still opens
  (the key is ignored).
- **The figures' „largest line"** reads a fixed cut: spending titles,
  revenue sources.

### 8.8 A headline that doesn't move the page (5 October 2026)

- **Why:** the question changes with every choice, and its height used to
  change with it (48–200 px on a desktop, 72–224 px on a phone), pushing
  everything below.
- **The box:** the headline now stands in a box of one height
  (7.75rem ≈ 124 px), aligned to its bottom.
- **The text fits the box:**
  - it steps down in size until it fits, measured before the browser paints
    (`useLayoutEffect`), and again when the box's width changes;
  - steps: desktop 60 → 48 → 40 → 34 → 30 → 24 px; phone 36 → 18 px;
  - the server sends a first guess by length.
- **Measured:** across 18 of the longest questions at 390, 768, 1024 and
  1440 px, the box is 124 px every time, the 137-character authority name
  included.
- **Phrases are inline text** (`role="button"`, Enter and Space), not
  buttons: a button never breaks across lines, so a long ministry's name
  stood on lines of its own and shrank the headline for nothing.
- **The ✕ that removes a phrase** is a corner badge, out of the sentence:
  shown on hover or focus, and always on a touch screen.

### 8.9 Table headers under the bar (5 October 2026)

- **The ask:** keep each table's header row in view while scrolling down.
- **Rejected:** a script that moved the headers on each scroll. The browser
  scrolls on its own, faster track, so the headers trailed by a frame and
  jumped (the owner saw it at once).
- **The rule:** headers stick with CSS `sticky`, drawn in step with the
  scroll.
  - `--bar-h` holds the sticky bar's height, measured; the headers stick
    just under it.
  - The tables' boxes don't scroll on their own (`overflow-visible`). The
    law's two wide tables scroll sideways below 1024 px; there their header
    stays at their top.
- **The period matrix** must scroll sideways, and a header inside that box
  would stick to the box, not to the page:
  - its periods stand in a strip above it, sticky, that follows the
    sideways scroll;
  - both have fixed columns (`--name-col`, `--period-col`) and the same set
    width, so they line up cell for cell;
  - the table keeps its real header, visually hidden, for screen readers;
  - the strip is `aria-hidden` and its buttons leave the tab order (the
    chart's bars pick a period by keyboard).
- **Checked:**
  - read at once after each scroll step, no frame waited, every header sits
    on the bar's edge (lines, budgets, law chapters, law after law,
    ministries, the matrix; desktop and phone);
  - the strip lines up with the numbers at both ends;
  - no table runs past a phone's screen;
  - axe finds nothing in the answer, light and dark.
- **Not covered:** the ANAF payments table (the `analize` prototype's own)
  keeps a scrolling header.

### 8.10 Bands that don't move the page while they load (5 October 2026)

- **Why:** on every choice, the figures band (and the table) fell back to a
  shorter placeholder, a 128 px bar against a 168 px band, and pushed the
  page when the numbers arrived. The band's own height also varied with its
  captions (336–369 px on a phone).
- **The last answer stays:**
  - `useDeferredValue` on the page's state: the controls and the headline
    follow a choice at once, while the figures, the answer's table and the
    years keep their last answer;
  - that answer is dimmed after 200 ms (a read from the cache never dims)
    and changes in place;
  - the Suspense boundaries stay mounted across views, so a deferred render
    that suspends leaves the old answer on screen;
  - only the error boundary is keyed by the view, so a failure doesn't
    outlive it (`KeptRead`).
- **One height:**
  - the figures' captions keep a set number of lines (three on a phone, two
    wider), clamped with the whole text on hover;
  - a figure without a note keeps the note's lines;
  - the first-load placeholder has the band's exact shape: 184 px on a
    desktop and 401 px on a phone, like the band.
- **Measured:** every frame while switching to a new year, to a budget and to
  the law, at 1440 and 390 px. No placeholder showed, the band kept one
  height, and the answer's top never moved.
- **The cost:** a long note can be cut on a phone („…bugetul general…"); its
  whole text is on hover.

### 8.11 The last polish before the commit (5 October 2026)

- **Removed:**
  - the measure switch („Lei / % din PIB"): the table shows both columns;
  - the „API live" mark: the data snapshots stay under „Cum am calculat".
- **The active row and column** of a table are framed by a blue line along
  both edges, painted as a background (not a border or a shadow); the cell
  where they cross is boxed. This covers:
  - law after law: the chosen law and its year;
  - the period matrix: the line followed and the period picked;
  - the budgets: the budget read.
- **One control row per tab:**
  - the step (Ani · Trimestre · Luni) and the law's Cheltuieli · Venituri
    sit on the row of the pickers, at its right;
  - the row keeps its height when a tab has no controls;
  - on a phone it stays one line and scrolls sideways;
  - the answer starts at the same place on every tab: 164 px under the
    section's top on a desktop, 152 px on a phone, measured over 12 views.
- **The chart's tooltip** gives the amount as it reads („541,1 mld. lei"),
  then to the leu.
- **The chart's tick labels** centre on their bar; the first and the last
  keep to the chart's edges (the last month no longer runs past it).
- **The law's two wide tables** (funds, law after law) scroll sideways below
  1024 px; there their header stays put. A sticky header inside that box was
  pushed down over the first rows.
- **Open, for the implementation:** with a ministry opened, its four figures
  still describe all ministries (its own total, its share, its rank are the
  candidates).

### 8.12 The review before the commit (5 October 2026)

Opus 5.5 (xhigh) and Codex `gpt-6.1-sol` (xhigh) reviewed the change. Their
findings, all fixed before the commit:

- **The budgets tab mixed sections.** A line was read by its label alone,
  and labels repeat across sections („subvenții", „operațiuni financiare").
  The revenue row filled the spending one (shares over 300%). It now reads
  and matches by section too.
- **Loans were double counted.** „Împrumuturi" (title 80) sat under the
  total; it belongs to financial operations (79 = 80 + 81, checked on the
  live series 2007–2025). A tree test now covers a year with loans.
- **Shares and changes were divided as floats.** They are now divided on the
  exact decimals and rounded at the digit shown (`exactPercent`,
  `exactChange`). A float rounded 0.0499…% up to +0.1%.
- **„Primii 5" summed five of the law's totals.** It is gone. The ministries
  now show the largest one's share and the next year's estimate.
- **A line missing from a release was hidden,** while the note still said
  each group was the sum of its rows (October 2019: „Contribuții sociale").
  - A line of this year's or last year's bulletins with no value now stays,
    a gap with its reason, and the note says its group no longer adds up.
  - A line that didn't exist yet stays out.
- **The default period ignored „month alone",** so the figures read
  January–July while the chart read single months.
- **Reads outside the bands took the whole page down:**
  - the ministry's name in the headline is now read without holding the
    head, keeping the last name while the next is read;
  - the period menu's years have an error boundary of their own.
- **A failed band survived a snapshot change.** Its error boundary is now
  keyed by the snapshots too.
- **An annex read in more than one way** would mix its readings in the
  record-based views. They now say so instead (no edition has such
  conflicts today).
- **Keyboard and markup:**
  - law chapters and ministries open from their names by keyboard;
  - the tabs follow the ARIA pattern (arrows, Home, End, one tab stop, a
    tab panel);
  - the contents panel opens a chapter in the state budget.
- **Small fixes:**
  - the parsed address is memoized, so the deferred view lags only on a real
    change;
  - an answer that doesn't parse is not retried;
  - a page cut short without a cursor says so;
  - the law's years come from the catalog (2016 included);
  - the mock-era `analize` page no longer sums an opened line's rows into a
    total.

## 9. The page in production (5 October 2026)

The `avansat` prototype is now a real page at **`/national-budget/analytics`**,
next to `/companies/analytics` and `/procurement/analytics`. The prototype
stays in `src/development/` as the design record, ANAF tab included.

### 9.1 Decisions

- **Rendered on the server, with no loader.**
  - The page's suspense reads run on the server and reach the browser through
    the router's query integration (`setupRouterSsrQueryIntegration`). The
    document carries every number of the view, and the browser doesn't read
    them again. Checked on six views: no read after hydration, and every
    server node kept by hydration (recoverable errors go to Sentry, not to the
    console: a test watches the nodes, not the console).
  - A failed server read sends the page's skeleton, and the browser reads the
    view itself. The integration ends the streamed read with a rejected
    promise, which the browser logs as an unhandled `Error: redacted`. That is
    the integration's behaviour, not the page's.
- **Never cached** (`no-store`, also for the CDN), as on the companies page. A
  render whose read failed carries the error, and the snapshots move whenever
  a bulletin or a law lands.
- **Head:**
  - the bare page is indexed under its canonical address;
  - a question (any page key in the address) is `noindex, follow`.
- **The ANAF „Plătit" tab is not in production.** It is another source with
  another identity (CUI), read through the mock-era hub hooks as a snapshot.
  The ministries population has one tab („Aprobat") until server ask 15
  brings a live read.
- **The breadcrumb is text** („Bugetul național / Analize avansate") until
  the citizens' page has a route.
- **An opened ministry has its own figures** (closing the open point in
  §8.11):
  - its approved total (row 5001);
  - its share of the state budget, divided exactly;
  - its rank among the principal authorising officers;
  - its estimate for the next year, from the same law.
  
  All four are printed rows of one law, read through the ministries table's
  own queries.
- **Codes travel as numbers:** `rand=25`, not `rand="25"`. A code with a
  leading zero stays text; the router writes it bare (`rand=0100`), since it
  can't read as a number, and the zero survives.

### 9.2 Code

- `src/features/national-budget/analytics/`:
  - `components/` holds the page, ported from `avansat.*`;
  - `lib/analytics-{state,view,format}.ts` hold the address, the words and the
    formats;
  - `hooks/use-analytics-state.ts` is the router binding.
- **Translations:** the names the page gives the bulletin's lines and the
  law's chapters and titles are translated (`() => t\`…\``). A quarter's
  column head is `T2 '26` in Romanian and `Q2 '26` in English. Both catalogs
  are filled.
- **Exact decimals:** `lib/exact.ts` now runs on the app's
  `@/lib/exact-decimal`, with `exactText` in the reader's notation.
  `thousandToLei` keeps its own decimal-point move, because `shiftDecimal`
  only divides.
- **Tests:**
  - unit tests for the address (parse, write, the tab rule, codes);
  - unit tests for the route (search validation, headers, head);
  - a Playwright integration spec that holds the page to its structure and
    its address, never to a number. In CI the server reads the dev API, and
    the browser can't (the API answers no CORS preflight).

### 9.3 Server ask added

15. **The ministries' ANAF payments by year, in one live read** (extends asks
    4 and 8). This is what the „Plătit" tab needs to come back. Asks 7
    (authority code → CUI) and 13 (authority identity across editions) would
    then let a ministry be followed from the law to its payments.

### 9.4 The review before the commit (5 October 2026)

Opus 5.5 (xhigh) and Codex `gpt-6.1-sol` (xhigh) reviewed the promotion.
Fixed before the commit:

- **An opened ministry's headline broke hydration.** Its name was a
  non-suspense read, so the server wrote the code and the browser the name.
  React then dropped the page's server render and drew it again.
  - The console never said so: recoverable errors go to Sentry. So the
    tests now check that the server's heading node survives hydration.
  - The name is now a suspense read in its own boundary; while it reads, or
    if it fails, the headline names the code.
  - The law and the credit type it reads are deferred, so the name shown
    stays until the new one is in.
- **An address the page couldn't read broke the next control** (`tip=altceva`,
  then a tab). The next address is now rebuilt from what the page read, so
  an unreadable value leaves at the first change.
- **Amounts on screen were rounded through floats.** `moneyText`,
  `billionsText` and the figures now take the exact string and round on its
  digits. A float rounds 2.049999999… bn up to 2,1.
- **The schema's decimal forms** (`+12.5`, `.5`, `12.`) are normalised before
  the shared library reads them, so a value the server vouches for is no
  longer shown as a gap.
- **The integration spec skips itself, with its reason,** where the API it
  is given doesn't serve the national budget. That is the nightly run
  against production, which has no `/api/v1/graphql`.
- **Smaller fixes:**
  - no clock in a render (the law year falls back to the bulletins' newest
    year);
  - the English time headline asks about the trend;
  - the evidence's codes are translated;
  - the alerts count has a plural;
  - a law year's gap names its status in words;
  - the unreachable „Ce cuprind" headlines are gone;
  - the ministries table and its figures share one read.
- **A second round** (the same two reviewers, on the fixes) found:
  - the chart's bar labels were still rounded through floats; they now round
    on the exact digits too;
  - the headline's quiet error never cleared. Sentry's boundary renders its
    fallback as a new component type each time, so the failed question is
    kept by the boundary's owner, and a new question is read again;
  - the spec's probe used schema introspection, which the deployed APIs
    refuse; it now asks for the catalog and skips only on a missing endpoint
    or field;
  - the hydration test could pass by catching React's own replacement
    heading; it now records only nodes React hasn't touched. It fails on a
    forced server/browser mismatch, which was checked;
  - a ministry the law prints no value for fell back to the overall figures;
    the band now says its status, and the count and rank are the table's.
- **Not fixed here, app-wide:** the server renders every page with one
  shared Lingui instance, activated per request in the root's `beforeLoad`.
  A render that resumes after an await (a loader, a suspense read) can find
  another request's language. This page renders after its reads, so it is
  as exposed as the loader pages. The fix is a per-request i18n instance at
  the root.

### 9.5 Open points

- **No page links here yet.** The citizens' page (`hub`) is the front door
  and has no route yet.
- **Server ask 11 (component series)** would let the budgets view read
  quarters and single months.

## 10. The citizens' page (5 October 2026)

**Owner:** „start working on the main page of the budget … easy to read and
understand, with good visual graphics, but first decide what is the most
relevant information, how to present it … allow selecting the year, and have
links to the advanced page from different components … The plan is to
remove the old national budget page, so decide if you want to use the
execuții bugetare data, especially for ministries. The layout style similar
to INS, procurement, companies … design different versions of the sections
so I can pick the best of them."

Prototype: `/development/national-budget/principal` (`?v=pagina`, and
`?v=galerie` for every design of every band in one column, `&banda=<id>` for
one band). An amber ribbon over each band switches its design and keeps the
choice in the address (`?cheltuieli=bon&venituri=treemap`), so a set of picks
is a link. Record of the designs: `principal.RATIONALE.md`.

### 10.1 What a citizen asks, in order

1. **How big is it?** The head and the figures band: spending, revenue, the
   deficit and its share of GDP, spending as a share of GDP, for the year.
2. **What is the money spent on?** (`cheltuieli`) By nature: pensions and
   benefits, salaries, goods and services, investments, interest, EU and
   PNRR projects.
3. **On which domains?** (`domenii`) Education, defence, police, roads,
   health — the state budget's payments by functional chapter.
4. **Who spends it?** (`ministere`) The ministries and central bodies,
   ranked, each opening on what it paid for and linking to its entity page.
5. **Where does it come from?** (`venituri`) Contributions, VAT, income
   tax, excise, profit tax, non-tax revenue, EU money, PNRR grants.
6. **How much is borrowed?** (`deficit`) The deficit year by year, in lei and
   as a share of GDP, against the EU's 3% threshold.
7. **How is this year going?** (`anul`) The year in progress against the
   same months of the year before.
8. **Through which budgets does it pass?** (`bugete`) The state budget,
   local budgets, pensions, health … and the transfers between them, which
   is why the budgets add up to more than what is spent.
9. **What did Parliament approve?** (`lege`) The law's four funds, its
   chapters, and the law year after year.
10. **Where to go next** — ready questions into `/national-budget/analytics`.

Spending comes before revenue: it is what most readers come for. Every
band links to the analysis page's matching view (`nextSearch` of the
analytics state), and every ministry to its entity page.

### 10.2 Data: three sources, kept apart

- **The MF bulletins** (the national budget API) answer for the whole
  public purse: the consolidated general budget's totals, lines, GDP shares,
  budget columns and months. 2006 → the newest month.
- **ANAF's budget execution** (`entityAnalytics`, `aggregatedLineItems`;
  state budget = sector 1, source 1, principal aggregated reports) answers
  for the state budget's detail. **Decision: yes, the citizens' page uses
  it for the ministries and the domains.**
  - It is live, fast (0.05–0.9 s a read) and reaches August 2026.
  - It is the only source of payments by ministry (by CUI, so each links to
    its entity page) and by functional chapter (education, defence …): the
    bulletin is economic only, and the law is a plan.
  - Its total reconciles with the bulletin: ANAF's state budget equals the
    bulletin's state-budget column, 499,44 bn lei in 2025 and 271,98 bn in
    January–July 2026.
  - It is read over the **bulletin's own window**: a year in progress is
    January to the bulletin's newest month (July), not ANAF's (August), so
    both sources describe the same months.
  - **Not for an all-budgets view by domain.** Sectors 1–5 summed give
    991 bn lei for 2025 against the bulletin's 808,7 consolidated; taking
    out the transfers between units (economic 51) still leaves ~871. That
    view would not reconcile with the page's own headline, so the domains
    band is the state budget's, and says that pensions and hospitals are
    paid mostly from their own budgets (the budgets band).
  - ANAF's reports start in 2016: an earlier year's ANAF bands say so.
- **The budget laws** answer for the plan, in their own band, 2016–2025;
  2026's law is not loaded yet. Never a rate of execution against the law,
  never law and execution in one chart.

The old pages this replaces: `/budget-explorer` (ANAF treemaps per sector,
read in the browser, no head) and `/buget-national-2026` (the March 2026
draft as static JSON). The citizens' page covers the explorer's question
(where the money goes, by domain and by ministry) with the reconciled
sources above; the draft page's numbers are superseded by the laws and the
bulletins. Removing them is part of the promotion.

### 10.3 The year

- **One year for the whole page**, `?an=`; the bare page opens on the newest
  year the bulletins finish (2025). The year in progress is offered as
  „2026 (până în iulie)" and every band reads it as January–July, against
  the same months a year earlier.
- Chosen from a dropdown in the head and the same select in the pinned bar
  (every year, newest first; a year the API doesn't vouch for in full is
  listed, disabled, with its reason — 2008, 2011 and 2013 were, until their
  December bulletins were read on 7 October), or by clicking a year's column
  in the time charts.
  **Owner, 6 October:** the head's year buttons were too much text; one
  dropdown replaces them.
- **The head's source line is a few words** (owner, 6 October): „Surse:
  Ministerul Finanțelor ↗, ANAF ↗, date până în iulie 2026", each source a
  link (MF's execution page, the budget transparency portal), the date the
  bulletins' newest month. It closes the head as on `/procurement`: at the
  head's foot, just above the pinned bar, from a wide screen; under the panel
  on a phone. The bands keep their own fuller source notes.
- „Anul în curs" always shows the newest year, whatever year is chosen, and
  says so.

### 10.4 Rules added

- **„The rest" is the printed total less the lines shown,** computed on the
  exact decimals and drawn hatched, last. In the PDF years (2006–2018, 2023)
  it also holds the lines the bulletin printed without an item.
- **Lei out of 100** (the hundred squares, the receipt) are whole lei by the
  largest remainder, so they always make exactly 100; the shares beside them
  keep one decimal.
- **ANAF amounts** are summed per chapter on their two-decimal strings, never
  as floats.
- **A band reads, waits and fails on its own** (`BandRead`, keyed by the band,
  its design and the year).

### 10.5 Data findings (live, 5 October 2026)

- **GDP shares exist only in the workbook Decembers:** 2019–2022, 2024,
  2025. December 2023 is a PDF and prints none; there are none before 2019.
  The GDP views start in 2019 and say why. For the year in progress the
  bulletin prints the share against the full-year GDP estimate (2,3% for the
  deficit, January–July 2026), labelled as such.
- **The 2016 and 2017 syntheses list their rows without a credit type**
  (corrected after the review, 7 October): a read of budget credits finds
  no 5001 total (`NO_MATCHING_RECORD`) and no chapter rows, though the
  rows exist as untyped descriptors (2016: 5001 = 132.233.926 thousand lei;
  2017: 150.159.505). The law band says the rows aren't marked as budget
  credits rather than that the law lacks them. Whether those untyped rows
  are budget credits is for the scrapper to confirm (a server ask).
- **December 2023 has no budget columns:** the budgets band says so for 2023.
- **ANAF:** „Finanțe — acțiuni generale" pays the debt interest (50,1 bn
  lei in 2025), the EU contribution and EU co-financing; the transfer to the
  pensions budget (39,2 bn) is paid by the Labour ministry. Chapter 51 is
  two-thirds EU contribution and co-financing, not „authorities". Ministries
  reorganised under a new CUI have no change on the year before (shown as
  new), and a few swings (Investments, Finance in 2026) may come from that.
- **January–July 2026 against 2025:** revenue +11,2%, spending +2,9%, the
  deficit 48,1 bn lei against 76,4.

### 10.6 Open points

- **The owner picks one design per band** (the prototype's ribbon); then the
  page is promoted to `/national-budget` with the full review gate, the
  analytics page's breadcrumb links back to it, and `/budget-explorer` and
  `/buget-national-2026` are removed (their inbound links and the sidebar's
  „National Budget" entry move to the new page).
- The names of the ministries outside the twelve largest keep ANAF's spelling
  without diacritics; a reviewed CUI → name list would fix that.

## 11. The citizens' page in production (7 October 2026)

**Owner:** „This prototype is ready for full implementation
(`?v=pagina&domenii=harta`) … get it done, reviewed and deployed to dev." The
picks: the first design of every band — head A (the question and the year's
balance), spending and revenue as „100 de lei", domains and the law's chapters
as the treemap, the ministries as rows that open, the deficit as two lines,
the year in progress month by month, the budgets' bridge, the law as a plan.
The prototype stays in `src/development/` as the design record.

### 11.1 Decisions

- **Route `/national-budget`** (`src/routes/national-budget.index.tsx`),
  code in `src/features/national-budget/home/`. Rendered on the server with no
  loader, like the analysis page; one search key, `an` (the year), the default
  year left out of the address; never cached; the bare page indexed under its
  canonical address, a chosen year `noindex, follow`.
- **Every read of the year starts at once** (`useHomePrefetch`): a band whose
  reads run one after another finds them in flight. Each read's options are
  one function shared by the band and the prefetch, so they share a key.
- **The law's chapters are read in the browser.** The synthesis' credit rows
  come in five pages of 100, read one after another (~5,5 s): on the server
  they held the whole document (8,6 s for a year, down to 1,2–2,1 s without
  them). They are the last thing on the page; the server sends their
  skeleton. Their read is also summarised in its query function, so the
  cache holds some twenty chapters, not the law's rows: the document went
  from 1,24 MB to 435 KB.
- **The years the bulletins don't finish** are listed but can't be chosen;
  which they are is the API's answer for the snapshot (2008, 2011 and 2013
  until 7 October; none since). The head and the pinned bar carry the same
  year dropdown.
- **The old pages:**
  - `/buget-national-2026` (the March 2026 draft as static JSON) is deleted
    and redirects here; its data files stay for the prototype fixtures.
  - `/budget-explorer` redirects here **only when bare** (a `year` becomes
    `an`). It is still the site's filtered explorer — the INS territory pages,
    the learning content and the AI route metadata link to it with filters —
    so it stays for those links. Removing it for good is the owner's call.
  - The sidebar, the landing page, the sitemap, `llms.txt` and the learning
    content point here; the parliament sheet's budget link opens the law's
    ministries on the analysis page (the two chambers are principal
    authorising officers there).
- **The analysis page's breadcrumb** links back here (closing §9.5).
- **Numbers in the reader's notation:** shares and percentages go through the
  hubs' formatter (the prototype hard-coded Romanian notation); names inside
  sentences through `inSentence` (it keeps „TVA"/„VAT").
- **Translations:** both catalogs filled (255 entries); the English uses the
  site's terms („budget appropriations" for „credite bugetare").

### 11.2 Code

- `components/`: the page, the head and figures, one file per band, the
  charts, the shell (band frame, pinned bar, year options, links).
- `hooks/`: `use-home-data.ts` (the reads and the prefetch),
  `use-home-year.ts` (the route binding), `use-whole-of.ts` (a total and its
  named lines as parts).
- `lib/`: `home-data.ts` (the year model, the line sets, ANAF's filter and
  chapter sums), `home-law.ts` (the law's chapters and inputs),
  `home-geometry.ts` (tones, lei out of 100, the treemap), `home-format.ts`.
- Tests: `lib/home-lib.test.ts`, `src/routes/-national-budget.index.test.ts`,
  `src/routes/-national-budget-legacy-redirects.test.ts`,
  `tests/integration/national-budget-home.spec.ts` (structure and address
  only: in CI the browser cannot reach the API).

### 11.3 The review before the commit (7 October 2026)

Opus 5.5 (xhigh) and Codex `gpt-6.1-sol` (xhigh) reviewed the promotion.
Fixed before the commit:

- **EU money was understated** (Opus, high). „Fonduri europene" and „Proiecte
  cu fonduri UE" were only the post-2014–2020 lines; the 2014–2020 lines fell
  into „the rest" (in 2019 the page named 0,2 bn of EU revenue while ~25 bn
  sat in the rest). Each framework's printed line is now its own part, its
  hint naming the framework.
- **A failing band lost its heading, and kept its error for the next year.**
  Each band now keeps its question as its head while it reads or if it fails,
  and its boundary is keyed by the year. The law's chapters (read in the
  browser) have their own boundary: their failure leaves the plan standing.
  A CI run had caught the law band's heading missing after a transient
  server-side read failure.
- **The year menu's read could take the page down;** it now has its own
  boundary (every year offered if it fails). A year the bulletins don't
  finish, asked in the address, opens the default year with a notice; the
  menus list such years with the server's reason.
- **Incomplete reads looked complete:** ANAF's authorities fail on a cut list,
  its chapters use the explorer's complete-or-fail reader, and a law read cut
  short fails instead of pushing unread chapters into „the rest".
- **Rounding:** shares carry six decimals so a label rounds once; the „100 de
  lei" sentences use the grid's own counts.
- **2016 compared with a 2015 ANAF doesn't cover:** no previous window is
  read for ANAF's first year, and no change is claimed.
- **Links:** they carry `lang`; the law links carry the page's year.
- **Smaller:** the deficit band's unused GDP read and Romanian month list; the
  GDP read narrowed from fifty rows to four; a partial year's deficit share
  named against the full-year GDP estimate; a release without GDP shares says
  so; plurals; treemap cells announced; the law's missing 5001 total told
  apart from missing chapters; the learning tour and a lesson's mission point
  back at the explorer (their steps describe it).
- **A second round** (the same two reviewers, on the fixes) found:
  - the year menu's availability read could still blank the server's render
    (a server render has no error boundaries): it now never fails — without
    it every year is offered;
  - the head's balance and the figures kept an error across years, and no
    boundary reset when a lane moved: every read boundary is keyed by its
    year and the lanes' snapshots (the year-in-progress band by the
    snapshots only, so its toggle survives a change of year);
  - a ministry's own read, failing, wiped the ranking: it has its own
    boundary under its row;
  - a failed year was answered from the cache with its old error on a
    return visit: a change of year drops the page's failed reads first;
  - double rounding remained possible at the edges (14,4999…% → 15%): every
    shown share is now rounded once from the exact amounts (`shareOf`);
  - the entity links dropped `lang`;
  - the 2016–2017 wording (the rows aren't marked as budget credits; see
    §10.5) and a cut-short law read is no longer retried.

### 11.4 Open points

- **Server asks:** the 2016–2017 syntheses' untyped rows (are they budget
  credits?); a level filter on the law's records (ask 9) would let the law's
  chapters render on the server; ANAF's ministries in the national budget
  API (ask 15) and a code ↔ CUI map (ask 7).
- An unfinished year asked in the address prefetches its own reads before
  falling back to the default year (only odd links reach it).
- `/budget-explorer` with filters stays; removing it is the owner's call,
  with its inbound links (INS territory pages, learning content, AI route
  metadata) to move first. The revenue mission's spending/revenue switch
  (`accountCategory`) is not part of the explorer's search schema (it was
  ignored before this change too).
- The shared Lingui instance during streamed SSR (§9.4) applies here too.


### 11.5 The 2008, 2011 and 2013 full years (7 October 2026)

The API now answers the three years the bulletins didn't finish (snapshot
`e1.a772b18006ed4f2ffec74bd4d1ccbe31`; December releases of 2008, 2011 and
2013, URLs and hashes in the lane's provenance). The page needed no data
change: the year menu withholds only the years the API's FULL_YEAR read
doesn't vouch for, and the deficit band plots what it reads, so the three
years became selectable and plotted with the new snapshot.

- The two derivations moved out of their components into pure functions
  with tests (`unfinishedYearsOf`, `yearTotalsOf` in `home/lib/home-data.ts`):
  an AVAILABLE year is offered and plotted; a year the read lacks or marks
  unavailable stays a gap with its reason; a balance of zero is a value.
- The balance is the bulletin's printed line, never spending less revenue:
  2013 shows −15.771,3 million lei, the printed figure (the difference of the
  printed totals is 15.771,2).
- What stays unavailable for those years, said as what the served data
  lacks — not as what the bulletin prints (the 2008 annual table has budget
  columns; the qualified lane publishes only its national column): the
  spending and revenue lines, GDP shares, the budgets' columns, ANAF's
  ministries and domains (from 2016), the law (2016–2025), and December/Q4
  2013 as periods.
- **A total without its lines is not a whole that is all „other"** (primary
  review): where none of a band's lines has a value for the year, the
  spending and revenue bands keep the verified total and say the breakdown
  isn't available, with no grid and no „other" row (`partsOfWhole` returns
  null). A line of exactly zero is a value, so the breakdown stands.
