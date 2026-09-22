# Statistics (Statistici) — Domain Design

> Consumes: `docs/design/statistics/ux.md`, `docs/ux-research/statistics.md`,
> `docs/design/README.md`. Every nontrivial statement is labeled
> **Fact** / **Decision** / **Assumption**.

## 1. Domain purpose and scope

**Decision:** The statistics domain delivers a dedicated `/ins` area that
exposes INS Tempo statistics and SIRUTA geography as plain-Romanian,
territory-anchored, shareable surfaces. It is the SIRUTA spine that other
domains (budget, primărie, companies, institutions, maps) link into.

**Fact:** The capability already exists embedded in the entity profile
(`src/components/entities/views/ins-stats-view.tsx`, 1,600+ lines: UAT/county
dashboard, dataset explorer, dataset detail, derived indicators). This domain
**reuses that engine** and promotes it to standalone routes; it does not rebuild
the INS data layer.

**Decision:** Scope = the eight assigned features. Out of scope for this domain
doc: full-catalog on-demand loading UX, multi-dataset correlation explorer,
custom map-series builder, INS MCP tools, saved queries (UX doc §14 "Advanced").

## 2. High-level design patterns

- **Decision — Investigative, not marketing.** Dense, scannable, full-width
  bands or constrained unframed layouts (`max-w-5xl`/`max-w-6xl` `mx-auto px-6`).
  Cards only for repeated records, indicator tiles, modals. No card-in-card. No
  decorative backgrounds. Radii ≤ 8px. Follow
  `src/features/advanced-map-analytics/DESIGN_PRINCIPLES.md` (8pt grid, restraint,
  `divide-y` lists, hover affordances, `…` not `...`).
- **Decision — Coverage honesty is the domain's signature pattern.** The
  27-vs-1,898 gap is surfaced through three reused primitives on every surface
  that names a dataset:
  - `DataStatusBadge` — two states, Romanian labels: **`Date disponibile`**
    (loaded facts) and **`Doar catalog`** (metadata-only / `PENDING`). Color +
    icon + text (never color alone).
  - `CoverageRibbon` — page-level line: source, freshness, known limit
    (e.g. "INS Tempo · 27 din 1.898 seturi cu date · actualizat lunar").
  - `RequestDatasetAction` — on every `Doar catalog` dataset.
- **Decision — Plain language first, code as provenance.** Headline = Romanian
  dataset name + unit + value. Matrix code (`POP107D`) appears only in
  provenance/secondary text and the `SourceProvenanceDrawer`.
- **Decision — Per-number provenance.** Each chart/table/tile exposes
  `Sursă: INS Tempo, matrice {code}, actualizat {date}` and opens a
  `SourceProvenanceDrawer` (source URL to INS Tempo, matrix code, last sync,
  periodicity, definition, caveats). Reuse the entity view's INS Tempo URL
  builder (`buildInsTempoDatasetUrl` pattern) and definition/metadata readers.
- **Decision — Coverage-flag-driven UI.** `has_uat_data`/`has_county_data`/
  `has_siruta` gate available territory levels, map levels, and comparison
  pickers. Never render an empty-cell UAT map for a county-only dataset.
- **Decision — Honest temporal/territorial handling.** Show data gaps (no
  interpolation); never average across ANNUAL/QUARTERLY/MONTHLY; label
  `value_status`. Reuse `buildStableSeries` and the temporal-split logic from
  `ins-stats-view.filters.ts`.
- **Decision — URL is the shareable state.** Selected dataset, territory,
  period, dimensions/series, view (table/chart/map), compare set, and sort live
  in TanStack Router search params so any investigative view is linkable.

## 3. Information architecture and routes

**Fact (handed down by orchestrator — canonical):**

| Route | Surface | Feature file |
|---|---|---|
| `/ins` | Landing: themed entry, territory search, coverage ribbon | (landing; covered by design.md §6, not a separate assigned file) |
| `/ins/teritorii/$siruta` | Territory hub = UAT/county dashboard + time-series switcher + cross-domain rail | `territory-hub-uat-dashboard.md`, `territory-time-series-switcher.md`, `cross-domain-territory-links.md` |
| `/ins/harti` | Demographic/economic choropleth maps | `demographic-economic-maps.md` |
| `/ins/seturi` | Dataset explorer (catalog, status-aware) | `dataset-explorer.md` |
| `/ins/seturi/$matrixCode` | Dataset detail | `dataset-detail.md` |

**Decision (route added by this domain, consistent with the canonical scheme):**

| Route | Surface | Feature file |
|---|---|---|
| `/ins/comparatii` | Local comparisons | `local-comparisons.md` |

**Decision — non-route features.** Territory time-series switcher and
cross-domain links are **sections of `/ins/teritorii/$siruta`**, not
routes. Request-this-dataset is a **dialog action** reachable from explorer rows
and dataset detail (URL state `?request=<matrixCode>`), not a route.

**Decision — path slugs are Romanian** (`teritorii`, `harti`, `seturi`,
`comparatii`), matching the foundation's Romanian-slug rule and existing routes
(`/primarie`, `/companies`).

**Decision — territory key is SIRUTA.** `$siruta` is the LAU/county SIRUTA code.
County hubs accept the county SIRUTA; level (`LAU` vs `NUTS3`) is derived from
the resolved territory, mirroring `ins-stats-view`'s `isCounty` branch.

**Decision — navigation.** Add a single sidebar entry "Statistici" → `/ins`
(integration note: `src/components/sidebar/nav-main.tsx` `MainItemUrl` union and
items array). Sub-surfaces are reached from the landing page and contextual
links, not from top-level nav.

## 4. Shared layout and navigation decisions

- **Decision — page shell.** Each route: a `<header>` band with `text-2xl
  font-semibold tracking-tight` title (the only large type), a one-line muted
  subtitle, then a `CoverageRibbon`. Body uses full-width bands; lists use
  `rounded-lg border border-border/60 divide-y divide-border/60`.
- **Decision — breadcrumbs.** Use `src/components/ui/breadcrumb.tsx`:
  `Statistici / Teritorii / {Territory}` and
  `Statistici / Seturi de date / {Dataset name}`.
- **Decision — territory header is shared.** A `TerritoryHeader` (new, §5)
  renders name, level badge (Localitate/UAT/Județ/Regiune/Național), SIRUTA code
  as muted provenance, and the cross-domain rail trigger. Reused by the hub,
  comparison rows, and map side panel.
- **Decision — responsive.** Mobile-first. Indicator grid `grid-cols-2` →
  `lg:grid-cols-4/5`. Tables get horizontal scroll wrappers. Map: full-width with
  the side panel as a `Sheet` on `< lg`. Filter bars become a `Sheet`-triggered
  panel on mobile (reuse existing filter patterns).

## 5. Domain components and reuse plan

**Decision — reuse existing INS engine (do not rebuild):**

- Types: `src/schemas/ins.ts` (`InsDataset`, `InsObservation`, `InsTimePeriod`,
  `InsTerritory`, `InsUnit`, `InsContext`, `InsDatasetDimension`,
  `InsEntitySelectorInput`, `InsObservationFilterInput`, `InsLatestDatasetValue`,
  `InsDashboardData`).
- API adapters + hooks: `src/lib/api/ins.ts`, `src/lib/hooks/use-ins-dashboard.ts`.
- Registry: `src/lib/ins/ins-metric-registry.ts`.
- Series/unit logic: `src/lib/ins/series-selection.ts`.
- Presentation sections: `src/components/entities/views/ins-stats-view.presentation.tsx`
  (`SummaryMetricsSection`, `DerivedIndicatorsSection`, `DatasetExplorerSection`,
  `DatasetDetailSection`, `MarkdownDescription`, `ExpandableMarkdownField`) and
  formatters/filters/derived/url-state siblings.

**Decision — refactor boundary.** `ins-stats-view.tsx` currently takes
`entity: EntityDetailsData`. To reuse on standalone routes, the implementer
extracts the entity-agnostic core to accept an **`InsEntitySelectorInput`** (the
component already derives `entitySelector` from it internally). Two acceptable
paths, implementer chooses the lower-risk one at build time:
- (a) Add an optional `selector`/`territory` prop path that bypasses the
  `entity` derivation, keeping the entity profile call site working; **or**
- (b) Reuse the lower-level presentation sections + hooks directly in the new
  route components (preferred when the monolith is hard to parameterize).
Either way, **no INS data-fetching logic is duplicated**.

**Decision — shared domain primitives to build under `src/features/statistics/components`:**

- `DataStatusBadge` — props `{ status: 'available' | 'catalog-only' }`; renders
  Romanian label + lucide icon (`CircleCheck` / `CircleDashed`) + `Badge`
  variant. (Foundation shared component; statistics owns the first build.)
- `CoverageRibbon` — props `{ source, freshness, limitNote }`; compact muted band.
- `FreshnessBadge` — props `{ label: 'actualizat'|'publicat'|'date pana la', date }`.
- `SourceProvenanceDrawer` — props `{ datasetCode, lastSyncAt, periodicity,
  definition, sourceUrl, caveats? }`; uses `Sheet`.
- `TerritoryHeader` — name, level badge, SIRUTA provenance, rail trigger.
- `TerritoryPicker` — async combobox over `Command` + `Popover`; resolves a
  territory (name/SIRUTA/county) to `{ siruta, level, name }`. **Fact:** no
  client territory resolver exists; implementer adds a thin
  `resolveTerritories` adapter (see §6) or composes county/UAT filter lists
  (`src/components/filters/county-filter`, `uat-filter`).
- `DatasetPicker` — combobox over `useInsDatasetCatalog`, shows `DataStatusBadge`
  per option, defaults the picker to `Date disponibile` datasets.
- `RelatedLinksRail` — cross-domain rail (foundation shared component).
- `RequestDatasetAction` + `RequestDatasetDialog` — badge + form.
- `ShareFilteredView` — copy-current-URL affordance (reuse `copy-button.tsx`).

**Decision — reuse shadcn primitives** (`Button`, `Badge`, `Tabs`, `Table`,
`Sheet`, `Dialog`, `Tooltip`, `Select`, `MultiSelect`, `Command`, `Popover`,
`EmptyState`, `Skeleton`, `Breadcrumb`, `pagination`) before adding anything new.

**Decision — charts/maps reuse.** Time-series/bar charts reuse the chart stack
under `src/components/charts` (and the recharts usage already present in
`ins-stats-view`); maps reuse `src/hooks/useGeoJson.ts`,
`src/components/maps/InteractiveMap.tsx`, `MapLegend`, `HeatmapDataTable`, and
binning from `src/hooks/useAdvancedMapAnalyticsBins.ts`.

## 6. Landing page (`/ins`) — design

**Decision (2026-09-16): the hub is the companies hub's composition, in the
landing's visual language (`src/components/landing-skin/*`), one band per
idea.** It is a presentation page that hands off to the analysis surfaces;
it is not itself an analytics page. Sections, top→bottom:

1. **Hero** — mono caption „Statistici / INS Tempo", the two-line headline
   „Fiecare localitate, cu cifrele la vedere", one sentence on the dataset,
   the **matrix search** (the landing field's chrome over
   `insDatasets(filter: {search})`, observations-loaded only; Enter opens the
   highlighted dataset or the explorer with the term; `mod+K` focuses), and
   „Sau mergi direct la" → explorer, comparisons. Beside it, the **catalog on
   its eight themes**: a proportion strip and one row per theme with count and
   share, each a saved query into `/ins/seturi?context=…`.
2. **Figures band**, counting up on arrival: datasets with observations,
   territories on SIRUTA, population at the latest 1 January, years of annual
   series. Each cell links to the surface that holds it.
3. **01 / Indicatori naționali** — eight national cells with period, matrix
   code, sparkline and the unit as a Romanian word; each row opens the dataset
   detail on exactly that cell (`teritoriu`, `clasificari`, `unitate`,
   `frecventa`).
4. **02 / Pe județe** — an SVG county choropleth beside the ranked list, a
   shared hover highlight, and a switch between three indicators
   (`?indicator=viata|somaj|salariati`, default `viata`, in the URL so the
   view is shareable). Counties the read did not return are hatched and
   counted, never zero. Below the band, the **territory search** („Sau
   localitatea ta") with quick tries; LAU rows link into the territory hub.
5. **03 / Din 1990 până azi** — births versus deaths as a two-line chart, with
   three 35-year deltas beside it and links into each series with its span.
6. **04 / Pornește o investigație** — three prefilled analyses.
7. **Surse și acoperire** — source, loaded/catalog counts, the periods read,
   and the capture date of the series.

**Data.** `fetchStatisticsHub` (`api/graphql/statistics-hub-fetchers.ts`):
one `insLatestDatasetValues` at RO/NATIONAL for nine codes
(`HUB_NATIONAL_DATASETS`), one `insObservations` per county layer at the
national indicator's latest year filtered client-side to the national cell
on every axis but the county one, the catalog counts, and one territory
count. Sections fail independently and are named in `failures`; the page
renders a retry for a failed section and keeps the others. The **annual
histories behind the charts are kept in the client**
(`lib/hub-national-series.ts`, captured from the same API on 2026-09-22):
closed years of official statistics do not change, and re-reading 35 years
of eight datasets on every view carries no information. The live latest point
is appended only when it is a newer year of the same cell and unit. The first
capture (2026-09-16) covered six of the band's eight rows and cut two of those
short, so POP107D and LOC101B drew no sparkline and tourism's growth was
measured from 2003 rather than 2001; a unit test now holds every band code to
a well-formed capture.

**Prototypes (2026-09-16).** Four compositions were built and compared at
`/development/statistics/ins-landing`, all on the shipped link contracts,
with captured values labelled as such:

| Variant | Shape | Outcome |
|---|---|---|
| `editorial` | The companies hub's rhythm: matrix search hero with the theme panel, figures band, numbered bands. | **Chosen.** One idea per band reads top to bottom; the same language as `/companies` makes the two front doors read as one site. |
| `place` | App skin; the territory search is the hero, compact tiles, four trend cards, tools, themes as chips. | Rejected. The strongest single act, but the page had no reason to keep reading past the tiles. Its territory search survives inside the counties band. |
| `stories` | App skin; a data brief: eight key figures, births vs deaths, two county rankings. | Rejected. The stories survive as bands 02 and 03; as a whole the page read as an article, not a front door. |
| `questions` | App skin; three question cards wired to their surfaces, one featured figure. | Rejected. The cards competed for the fold and each carried a control; the hub keeps one search. |

The shipped landing before this decision (national tiles, county decade
story, a three-level example, themes, honesty band) was retired with the
prototype; `useStatisticsUatSnapshot` and `fetchStatisticsLandingCatalog`
remain in use.

Known follow-ups from the review of 2026-09-17, deliberately not in scope:

- The three county layers share one read and one retry: a failed layer
  hides the map for all three. Splitting the read per layer needs a UI for
  a toggle option whose layer is missing.
- The national unemployment share (SOM101F, monthly) and the county map's
  registered unemployment rate (SOM103A, annual) are different measures;
  the map has no national reference of its own yet.
- The hub gave up its ⌘K binding because the global entity search owns
  that key; a hub-local shortcut needs a key of its own.

## 6b. Analysis pages — rework of 2026-09-17

Audited in the browser (desktop and phone captures, filter and control
probes) after the hub landed. Decisions, one per page:

**Dataset explorer (`/ins/seturi`).** Decision: a facet rail beside
the list on desktop (themes as a list with loaded-dataset counts, cadence,
coverage), the same controls in the sheet on a phone; the status control
(„Cu date" / „Doar catalog") shows only when it can change something. Rows
carry a `DataStatusBadge` only when catalog-only — an „available" badge on
every row of an all-available catalog was noise. The right column shows the
cadence and the latest period when the catalog row carries one, else the
catalog's declared span. Fixed: `?context=1` (a bare digit the router parses
as a number) and a single `?frecventa=ANNUAL` were dropped by the search
schema, so every theme link from the hub landed unfiltered.

**Territory hub (`/ins/teritorii/$siruta`).** Decision: the four
headline indicators as a band with county and national references, then
every other indicator in an accordion grouped by domain (from the matrix
code's three-letter prefix: `POP`, `FOM`/`SOM`, `LOC`, `SCL`, `SAN`, `GOS`,
`TUR`, `ART`, `AGR`, `JUS`, `ADM`), one compact row each — name, latest
value with a Romanian unit word, period, sparkline, provenance, compare.
The first two groups open by default. Replaced a 9,600-pixel wall of
identical tiles that led with agriculture because it sorted by code and
printed raw unit symbols („17.953 other").

**Dataset detail (`/ins/seturi/$cod`).** Decision: the scope is a row
of labelled chips („Sexe: Total", „Teritoriu: România") rather than a run-on
sentence of bare values, with the same popovers behind them and the same
bottom sheet on a phone. The hero says the unit in Romanian and formats the
period; the chart is captioned „Evoluție în timp" rather than repeating the
title, formats its axis in the active locale, and fills the column. The
selection logic (native lane, pins, validation) is untouched.

**Comparisons (`/ins/comparatii`).** Decision: the picture first —
the whole history, then the chosen period with its selector beside it — and
the table under them. The indicator picker lists nothing until two
characters are typed; an unfiltered 1,916-row list taught nothing. Bar labels
drop the legal-form prefix INS capitalises and are cut to fit; the unit
symbol reads as a Romanian word.

Known follow-ups from the review of 2026-09-17, deliberately not in scope:

- The theme labels in `src/lib/ins/ins-metric-registry.ts` are translated at
  module scope, so a locale switch leaves the rail in the boot locale.
- An explorer row shows loaded coverage („până în 2024") and a catalog year
  span in the same slot; only the wording tells them apart.
- Two territories that differ only in legal form („COMUNA" / „ORAȘ") share a
  bar label on the comparisons chart; the legend and tooltip keep the names.

## 6c. The catalog rail is INS Tempo's own hierarchy (2026-09-17)

The rail's eight themes were the eight INS domains and nothing else, while
INS Tempo itself navigates a three-level tree. Decision: the rail draws that
tree, the one a reader recognises from
`statistici.insse.ro:8077/tempo-online` — domain (`A. STATISTICA SOCIALA`),
group (`A.4 FORTA DE MUNCA`), subdomain (`4. SOMERI INREGISTRATI`) — as a
WAI-ARIA tree with one tab stop, arrows to walk and open it, and the branch
holding the current selection open on arrival.

Shape of the live tree, read 2026-09-17: 340 nodes — 8 domains, 70 groups,
262 subdomains. Every dataset hangs off a subdomain; the median subdomain
holds 3 or 4 of the 1,916 matrices and the largest holds 61.

What each level does:

- **Domain** filters as `rootContextCode` and carries the loaded-dataset
  count the landing catalog already reads.
- **Subdomain** filters as `contextCode`, the exact context a dataset hangs
  from.
- **Group** only opens. The server has no filter between the two — a group
  code matches no dataset row — so a group that looked selectable would
  return an empty list. `isSelectableContextLevel` is the single place that
  says so.

One search param still carries the whole hierarchy (`?context=`), because
the eight domain codes are a fixed registry: anything else is an exact
context. The tree is one read of two aliased pages (`insContexts` caps a
page at 200 rows), cached for a day, and the eight domains render from the
registry even when that read fails, so the rail never filters worse than it
did before the tree existed.

INS glues the caption of its own press-release links onto a context name
(`A.1 POPULATIE SI STRUCTURA DEMOGRAFICA Comunicate de presa`), so the rail
cuts the caption off; `cleanContextName` only fires on names carrying one of
the two known captions, which leaves the sentence-case sustainable-
development names alone.

Follow-ups, deliberately not in scope:

- A group cannot filter. Lifting that needs a server-side filter over a
  context subtree (`contextCodes: [String!]` or a path prefix on
  `InsDatasetFilterInput`), after which the group row becomes selectable
  with no change to the URL contract.
- Only domains show a count. The deployed API fills `matrix_count` on the
  eight domains and returns `0` for every group and subdomain (probed against
  dev-chronos-api on 2026-09-17; the sibling server sources read as a direct
  per-context count, so the two disagree and the probe wins until it changes).
  Counting the other 332 nodes client-side would mean reading the whole
  catalog, so the same server change that unlocks the group filter should
  carry counts per node — and one caveat with it: `matrix_count` counts the
  whole catalog while the domain counts here are loaded-only, and two
  populations must never share a column without saying so.
- The tree has no search of its own, unlike the INS page. The dataset search
  beside the list already finds a dataset by name or code.

## 6d. The section is INS, and the catalog page is one of its pages (2026-09-17)

The module answers with one institution's data, so its routes now say so:
`/statistici/*` became `/ins/*` (`/ins`, `/ins/seturi`, `/ins/seturi/$cod`,
`/ins/teritorii/$siruta`, `/ins/comparatii`). The sidebar entry keeps reading
„Statistici" — the acronym names the source, the word names what a reader is
looking for. No redirect stands behind the old paths: nothing outside the app
links to them yet, and a redirect tree would outlive the reason for it.

Decisions on `/ins/seturi`, which read as a standalone surface rather than as a
page of the section:

- **The way back comes first.** A „Înapoi la statistici" button above the
  title, the same control the dataset detail and the territory hub already
  carry. Every other page of the section had one; the catalog was the page a
  reader could only leave through the sidebar.
- **The status control is gone**, and with it `?stare=`. The catalog is one
  population again — every catalogued dataset, each row carrying its own
  `DataStatusBadge` — instead of three tabs over the same list. `dataStatus`
  survives as a call-site option (`buildDatasetFilterInput(search, { onlyWithData })`)
  because the hub's matrix search and the comparison picker open a series
  straight away and must not offer a dataset with no facts in it. This
  supersedes the status-control decision in §6b and the `Status` toggle in
  `features/dataset-explorer.md`.
- **The copy-link button is gone.** The URL is the shareable state and the
  address bar is where a reader copies it from; `ShareFilteredView` stays on
  the territory hub, where the state a reader would share is further from the
  address bar.

Two populations meet wherever a count leads to the catalog: the hub's theme
rows, its matrix search and the rail all count datasets with observations,
while the catalog page counts every catalogued dataset. Each of those places
now names the population it opens — the rail keeps its „· seturi cu date"
legend, the theme panel's copy says a row opens „tema în tot catalogul", and
the search's footer link says „Caută în tot catalogul" instead of promising a
number the other side would not match. `?stare=` used to hide this by
filtering the destination; without it, the words have to do the work.

## 6e. The catalog's polish pass (2026-09-17)

The layout was right and the parts were not: the rail's groups were separated
by whitespace alone, the selected theme read as a grey fill, the row count
floated between the search box and the list, the pager floated under it, and
every component carried its own class strings. Decisions, all of them
DESIGN.md's own rules applied to this page:

- **The page header is a band of its own**, closed by a rule: the way back,
  the title, then one line on what the page holds. The way back is a quiet
  link, not an outlined button — it was the heaviest thing above the title and
  it is the least important control on the page. `StatisticsBackLink` is the
  single implementation, used by the catalog, the dataset detail and the
  territory hub, so the module cannot drift into three weights of „back".
- **The class constants live in `statistics-theme.ts`** — `bandHeader`,
  `railGroup`, `railOption`, `facetRow`, `facetRowSelected`, `facetCount` —
  and the components import them, the parliament convention the module already
  followed everywhere else.
- **The results are one band, mounted for the page's whole life.** The count is
  its header strip, the rows (or the skeleton, or the empty state) are its
  body, the pager is its footer. Nothing floats beside the list any more. The
  band is permanent on purpose: the count is a live region, and a live region
  that is destroyed and re-inserted with its text already inside it — which is
  what a query-key change does — announces nothing. `overflow-hidden` keeps the
  last row's focus ring inside the card's radius when there is no pager under
  it.
- **The row is the target.** The title's `after:inset-0` overlay makes the
  whole row clickable and draws the focus ring around it — the overlay the
  hub's figure tiles already use. Only two things are lifted above it — the
  request action and the matrix code; lifting the whole metadata column made
  its empty space a dead zone that still lit up on hover.
- **The active facet carries a navy left bar**, not a grey fill: weight, tint
  and position say it together, so colour is never the only signal. Two
  scrollers tried to eat that bar before it landed: a second bounded box around
  the tree (which caps its own height already), and the negative margins the
  rail's rows used to bleed their hover fill to the edges — `overflow-y: auto`
  computes `overflow-x: auto`, so inside the phone sheet anything hanging past
  the column's start edge is clipped away. The rail carries no negative margin
  now.
- **A row stops repeating the context** the list is already filtered by. Nine
  rows under „4. SOMERI INREGISTRATI" said it nine times.
- **The matrix code wears the shared provenance chip** and is lifted above the
  row overlay, because it is the string a reader copies into INS Tempo and an
  overlay would make it unselectable — §Data Trust treats the source id as
  data. Filter chips lost their pill radius: §Shapes caps radius at 8px.

## 6f. The dataset detail's polish pass (2026-09-19)

`/ins/seturi/$cod` had every part the page needs and no hierarchy between
them. Measured on SOM101F at 390px, a reader scrolled past roughly four
screens of published legalese before reaching the number the page exists to
show. Decisions:

- **The definition is clamped to three lines** behind „Citește definiția
  completă" (`DetailDefinition`). INS publishes these verbatim from the
  methodology annex and SOM101F's quotes Legea 76/2002 in full — 3,400
  characters. The clamp is visual (`line-clamp-3`), so the whole string stays
  in the DOM for search, copy and assistive tech, and the threshold is a
  character count rather than a measured height because the server renders
  this and a measurement would need an effect — a flash of the wrong state.
- **Identity is a line of text, not six badges.** The header used to open with
  `INS Tempo`, the code, the status, the freshness and one badge per cadence,
  in four visual weights, which made the metadata about the dataset the
  heaviest thing on the page. It is now the title, then one quiet line —
  code chip, source, cadence, context. A badge is kept for the two facts that
  are exceptions worth stopping on: `Doar catalog`, and a series INS appears to
  have stopped refreshing. On the common page neither renders.
- **Freshness is the dataset's, not the window's.** The stale check reads the
  server-resolved latest period rather than the last row of the charted
  window, so pinning `?pana=2000` no longer makes the matrix look abandoned.
  POST A returns no latest value at all when the URL pins a classification or
  a unit, so it falls back to the newest period among the resolved
  observations — all of them, not the windowed ones. Reading it only from POST
  A silenced the stale badge on exactly the deep-linked URLs where an
  abandoned series matters most.
- **The working surface is one band**: a header strip naming it and counting
  its observations, the scope chips on their own tinted strip as the band's
  input, the figure and the chart in its body, the export and compare controls
  at the foot of that body, and the source line as the band's closing strip.
  Loose above the band the chips read as more metadata about the title; inside
  it they read as the control they are.
- **The source line is on the page, not in a drawer.** §Data Trust asks for
  source, date and the way back to the original beside the claim:
  `Sursă: INS Tempo · matricea POP107D · actualizată 2 aprilie 2026 · Deschide
  pe INS Tempo`. That date used to be an accordion row of its own — a
  disclosure control over a string already fully visible in its own trigger.
  `insTempoDatasetUrl` is the one builder, and it is locale-aware; the host is
  INS's own `statistici.insse.ro` and has nothing to do with this app's `/ins`
  routes.
- **Two accordion stacks, each with a name.** Nine identical rows separated by
  an unnamed gap read as one wall; „Explorează datele" and „Despre acest set de
  date" are quiet tier-1 labels, and the second heading dropped from
  `text-base font-semibold`, which competed with the h1.
- **The y axis may leave zero, between two bounds.** Romania's population
  falling 23,2M → 21,6M drew as a flat stripe across the top of a zero-based
  plot — the one reading of that series that is false. `seriesAxis` keeps the
  zero baseline when the series reaches within half its own magnitude of zero
  (rates and shares keep it) **and** when it spans less than 1% of its
  magnitude, because padding a window around a range that narrow magnifies
  rounding into a trend on gridlines that all round to the same label. In
  between it pads the observed range and **steps the ticks itself**: given
  only a domain, Recharts quarters it and turns a clean 21–23,5 mil. window
  into 21 / 21,6 / 22,3 / 22,9 / 23,5. The value axis then picks the first
  number format that gives every tick a distinct label, widening its gutter as
  it goes — a magnified plot measured against five identical labels would be
  worse than the flat line it replaced. Every bound is checked before use:
  this runs during render on the server too, and a 1e308 upper bound is an
  endless tick loop, a subnormal one is `NaN` bounds.
- **The grid is a solid hairline** and the period axis reads in words
  („iul. 2010", not `2010-07`). A dashed grid reads as a projection or a
  threshold when it is neither.
- **Skeletons match the layout they replace** — a header block and a band with
  a figure and a chart, not three grey rectangles — so the page rebuilds into
  the shape it was already occupying.
- **Found by review in the browser, and fixed there.** Opening SOM101F's
  definition moved the band 1,388px down at 390px while the scroll position
  stayed put — the figure, the chart and the control that undoes the tap all
  left the screen at once — so the opened text scrolls inside a bounded box.
  The character threshold that decided whether to clamp was a desktop measure
  (585px of prose ≈ 250 characters in three lines, against 348px ≈ 135 on a
  phone) and under-triggered on exactly the viewport that needed it, so the
  clamp is measured instead, on mount and on resize; before hydration the text
  is clamped and no toggle renders, which is the honest state. Separator
  glyphs came out of both meta lines: a „·" between flex items lands either at
  the end of a wrapped line, where it reads as a typo, or at the start of the
  next, where it reads as a bullet list — the catalog's own rows have always
  used spacing alone. The column went to `max-w-6xl` to match that catalog,
  since at 5xl clicking a row and coming back shifted the page 64px sideways.
  Plain chart markers switch off past 60 points, where they merged into a 5px
  band on a phone and the blob rather than the line carried the shape; flagged
  points keep their marker at any density. The tooltip groups its digits
  without changing one of them (`groupWireValue` works on the string —
  parsing to a float would round the long decimals the archival contract
  exists to preserve) and names its unit. A scope axis with nothing to choose
  lost its chip: given the same border as its neighbours it read as a control
  that did nothing when pressed. And „Seturi înrudite (6 din 8)" had „din"
  spliced into a `<Trans>` as a literal, which Lingui never extracts — the
  English page read „Related datasets (6 din 8)".

- **Deferred.** The figure still carries no change-versus-previous-period: the
  difference between two INS values is in percentage points for a rate and in
  percent for a count, and getting that wording wrong on a public-money surface
  is worse than omitting it. `DetailObservationsTable` prints wire values
  verbatim by design (archival fidelity) and stays unformatted. A monthly
  series' x axis still ends at the last period of the selected year rather
  than at the last published one — `buildTimeSeries` pads the window with
  explicit gaps, which is right, but it means the axis's last word can be a
  month INS has not reached.

## 6g. A page that shows a series, and one panel to change it (2026-09-19)

Two problems, one root: `/ins/seturi/ADM101A` showed a filter prompt over 50
perfectly good observations, and changing any axis took three clicks through
two stacked popovers.

**A default series, always.** `insLatestDatasetValues` answers `NO_DATA` for
any matrix with no row at the requested entity, and ADM101A's territorial axis
holds macroregions and counties — there is no national total to find. Probed
2026-09-19: `matchStrategy: "NO_DATA"` for `{ territoryCode: RO, level:
NATIONAL }`, while `insObservations` returns 50 rows for the same matrix. So
the page stopped waiting for the server's pick and makes one of its own.

- `chooseRepresentativeCell` reads the observations already fetched and ranks
  the complete identities in them: INS's own „Total" on the most axes, then
  the most published periods (a default that draws a line beats one that draws
  a point), then the latest period, then the lowest member codes — INS's
  declaration order, and the tie-break that makes the answer independent of
  the order the server returned rows in. `sourceRowSelection` is the gate: a
  row that does not carry every declared axis is never adopted.
- It is a **default, not a choice**: it fills gaps in `resolveDetailSelection`
  exactly where the server's own pick does, lands in `defaultedTypes` (dotted
  underline on the chip), raises the „selecție reprezentativă" chip on the
  figure, and is never written to the URL.
- It is **latched** per dataset + pinned selection, because the read it comes
  from is the read it changes: adopting a cell completes the scope, which
  turns the next fetch into a complete series for that one cell. Latching
  means the choice is made once per URL and cannot chase its own result.
- When nothing is safe to pick — no observations, or no row that is a valid
  complete source coordinate — the prompt still renders. That state is real,
  it is just no longer the common one.

**One panel, not two.** The scope chip used to open a popover holding a
labelled combobox that opened a second popover holding the options: three
clicks and two overlapping white panels to change one axis. The chip already
names the axis, so it now opens straight onto `DetailDimensionPanel` — a
header naming the axis and carrying „Șterge", the server-backed search, the
options, the pager. `ScopeSegment.control` became a function of its surface:
`panel` on desktop, `field` in the phone sheet, where six stacked axes do each
need a name and a closed resting state.

- The option rows no longer paint cmdk's keyboard cursor with `bg-accent`,
  which in this theme is pure black and made the list read as a terminal. It
  is the module's navy tint, the same signal the catalog's facet rows use.
- The panel header wraps rather than truncates: INS axis names run past 40
  characters, and a header ending in „…" does not say which axis is open.
- The unresolved chip reads „alege", not „alege {axis}" — it sat inside a chip
  that already printed the axis name, so it said it twice.
- The panel header holds nothing focusable. Radix moves focus to the first
  tabbable element when a popover opens, so a „Șterge" button in the header
  took it: typing did not search, the arrows did not move through the options,
  and Enter cleared the value. The reset sits in the footer with the pager,
  which leaves the search input first in tab order.

**Two matrices that still could not draw, found by sweeping 44 of them.**

- **ACC102C had nothing to ask with.** `insObservations` refuses a
  non-geographic matrix carrying neither a classification pin nor a unit
  („needs a classification pin or a unit for a non-geographic dataset"), and a
  matrix with no territorial axis has nothing for `territoryLevels: [NATIONAL]`
  to stand on. With no server-resolved default the page sent the read anyway
  and put a red error where the series belongs — a chicken-and-egg the
  representative could not break, because it reads the rows that read could not
  fetch. `resolveDetailSelection` now reports `needsSourceAnchor` and withholds
  the filter, and the page fetches ONE member of the unit axis to anchor the
  first read. One extra request, only on the pages that would otherwise be
  unable to ask for anything at all.
- **AMG155D had a complete coordinate it could not draw.** It declares both
  ANNUAL and QUARTERLY, so `dataset.periodicity.length === 1` does not resolve
  the cadence and `latest` was null. A series may never mix cadences, so an
  unresolved cadence blocks the chart exactly like a missing axis. The
  representative carries one now, taken from the chosen cell's own rows:
  chart-capable first, then the cadence with the most rows behind it, then the
  one reaching furthest. What the reader pinned and what the server resolved
  both still win over it.

**Two things the review caught that the types could not.** The series cache key
is built from the URL, and the URL is identical whichever cell was latched — so
two different defaults for one address shared a cache entry and the second read
was served the first one's rows for 24 hours; the key now carries the cell. And
the tie-break compared the *sum* of the member codes, which makes {D0:1,D1:4}
and {D0:2,D1:3} equal; it compares the ordered tuple and the unit now, so there
is a total order and no dependence on response order.

## 6h. Four designs for the detail page, side by side (2026-09-20)

Open, not decided. The prototype is `statistics/dataset-detail`; each variant is
a deep link, and `?cod=` points any of them at another matrix:

| Variant | Link | Argues |
|---|---|---|
| **Combined** | `?v=combined` | The parts of the other four that survived the comparison — see below. Currently the one to beat. |
| Editorial | `/development/statistics/dataset-detail?v=editorial` | The figure means nothing without its scale. Value, the sentence that reads it and two comparisons come first; the scope moves BELOW the chart as its caption. |
| Workbench | `?v=workbench` | The axes are a standing left rail, the data column is only data, the table is open. Built for the second visit. |
| Brief | `?v=brief` | Nothing is collapsed: a five-tile stat band, a full-width annotated figure, and the former accordion rows as two readable columns. |
| Report | `?v=report` | A published statistical release — title block, lede, numbered figure with its source note underneath, numbered table, numbered notes. |

All four call `useDatasetPrototypeModel`, which runs the feature's real hooks
against one fixed scope and reuses `chooseRepresentativeCell`, so the panes
differ in layout and in what they choose to say — never in their numbers.

`combined` is `workbench`'s spine — a standing selection rail, a data column
that never gets pushed down when an axis changes — carrying `workbench`'s own
opening (the value LARGE with the extremes, mean and count as a fact row on the
same baseline), `brief`'s marked extremes (the row says what the peak IS, the
mark says WHERE), `editorial`'s area tint, and `report`'s reading sentence,
definition and numbered notes under the figure. It deliberately does not take
`brief`'s uncollapsed prose column: the definition is set to a reading measure
and the table keeps its own scroller, so SOM101F's 1,500-word definition and
POP107D's formula block land at the foot of the page instead of dwarfing it.

Everything the page knows ABOUT the dataset sits under the title, once. The
figure used to close on a source strip naming the matrix code and the source
that the line under the title already named — the same fact stated twice, 500px
apart, with the refresh date reachable only by scrolling past the chart. The
strip is gone and its facts moved up, ordered identity → placement →
provenance:

```
ACC101B   10. CONDITII DE MUNCA   Sursă: INS Tempo ↗, actualizată 5 noiembrie 2025
```

Cadence and span are NOT in that line. The rail states both a hundred and fifty
pixels to the left, and „Interval de ani" is the control you change them with —
restating a control's current value as static text beside it is the same
duplication the footer was. Every fact on the page now appears once.

„Sursă" and the way back are one item, because the source's name IS the link:
a standalone „INS Tempo" beside „Deschide pe INS Tempo" said the same words
twice. The group stays intact when the line wraps, which on a phone puts the
whole provenance statement on its own row. Spacing separates the items, never
„·" (§6f). The link keeps the 24px hit area WCAG 2.2 AA 2.5.8 asks for.

The opening figure carries its unit and is separated from its period by a
rule, not a gap:

```
ULTIMA VALOARE
10 numar │ 2024        minim 5 2021   maxim 50 1997   medie 31,3   observații 33
```

Three rules behind that line:

- **The figure and its unit are one span**, as in `DetailTier0Hero`. A flex gap
  between them lets them land on different lines, and „21.646.220" over
  „persoane" is two facts where there was one.
- **A bare count still gets a unit.** `hubUnitWord` is deliberately empty for
  „count" because „10 numar" is not a sentence — but a figure with no unit at
  all leaves the reader to guess what 10 counts, so the SYMBOL is worded, by
  `describeUnitSymbol`: „număr", with its diacritic. The dataset's `unitLabel`
  is the wrong fallback — it is `name_ro ?? symbol`, so a unit INS published
  without a Romanian name would have printed the API's own „count" to the
  reader. „%" and „persoane" come through `hubUnitWord` unchanged. A literal
  space sits between the figure and the unit: a margin alone leaves two
  adjacent text nodes that a screen reader speaks as „10număr".
- **The rule is a `before:` decoration on the period's own span**, so it can
  never wrap away from what it separates, and it shows only from `sm` up. Below
  that a long figure fills the line and the period drops to its own, where a
  separator has nothing to separate and reads as a stray tick at a line start;
  a short figure still fits beside its period there, and simply goes without
  the rule. This is §6f's „no „·" between flex items" rule solved rather than
  obeyed — but note the `sm:pl-4` that carries the rule adds 16px at the
  breakpoint, so the line can rewrap there.

Its reading order is figure → what it says → the notes → the table. The table
is last on purpose: it is the appendix a reader consults once the figure and
the notes have told them what they are looking at, and 197 rows sitting between
the prose and the methodology separate two halves of one argument.

„Seturi înrudite" is a list of links, with the row shape the accordion already
uses — name, code chip, and a status badge ONLY when the set is catalog-only,
because „Date disponibile" down every row of an all-available list is the noise
§6f removed from the header and the catalog. In the prototype the links carry
`cod` back into the same variant, so a reader comparing designs can follow a
related set and still be looking at the pane they are judging; on promotion the
destination becomes `/ins/seturi/$cod`.

A matrix with no territorial axis is not „România". ACC101C declares only CAEN,
time and unit, and the rail read „Teritoriu: România" — the same class of false
claim as the hardcoded „TOTAL". The territory is now null for such a matrix and
every pane drops the segment rather than defaulting it.

Making them clickable forced the prototype's own read to grow up. Half the sets
related to ACC101B are non-geographic — ACC101C has only CAEN, time and unit —
and `insObservations` refuses such a matrix a read carrying neither a pin nor a
unit, so a click landed on an error. The prototype model now does what the page
does: it fetches one member of the unit axis and pins it, and keeps the anchor
in the query key. 13 of 13 sets reachable from ACC101B now open on a chart.

Three things the combination itself forced:

- The mean's label moved to the right of the plot. A falling series leaves its
  right side empty, while the left is where the line and the new area tint are
  busiest — „medie 31,3" set there sat on top of both.
- The chart's right gutter is sized from the end label. A fixed 44px fits „10"
  and truncates POP107D's „21.646.220" to „21.64…" — the one number on the
  figure a reader is most likely looking for.
- A computed figure prints at a precision the source justifies. The population
  mean came out as „22.511.356,94", claiming a hundredth of a person across 35
  observations; past a thousand the decimals are noise.

What the panes already settled, whichever wins:

- **Summary facts earn their space.** Every variant grew peak / trough / mean /
  change because „10" alone says nothing. Today's page shows the value and the
  chart and never connects them.
- **Mark the extremes on the figure.** A 33-point line whose peak and trough
  are the point of the page should not need hovering to locate them.
- **A figure that is capped must say so.** `buildTimeSeries` caps the plot at
  200 periods. SOM101F's peak (february 2010) therefore falls outside its own
  figure, so an extreme the chart does not contain is NOT annotated, and a note
  under the plot says the reperele cover the whole series. Without it a summary
  silently describes a wider series than the figure below it.
- **The masthead is ours.** `report`'s first pass set „Institutul Național de
  Statistică" as the byline because it looked like a release. It was corrected
  the same day: this page is published by Transparenta.eu over INS data, and a
  document wearing the institute's name claims an authorship it does not have
  (§Data Trust — the source is named as a source, never as the publisher).
- **A scope line is read off the rows, never assumed.** All four panes first
  printed a literal „TOTAL" for the classification axis. ADM101A has no Total
  member — its representative cell is „Municipii" — so three of the four were
  stating something false about the series on screen. The labels now come from
  the shown rows' own classifications, and the unpinned national case is named
  „România" rather than INS's own row name („TOTAL"), which says nothing under
  the heading „Teritoriu".
- **A reference that cannot be drawn is withheld, not lost.** `workbench`'s
  mean line is a whole-series figure against a possibly-capped plot; when it
  falls outside the domain Recharts discards it silently. It is now tested
  against the effective domain first — including the `[0, 'auto']` baseline
  case, where the ceiling is the highest plotted value — and simply not drawn
  when it does not belong there.

What the panes exposed as costs:

- `brief`'s „nothing is collapsed" holds for ACC101B's three-sentence
  definition and fails on SOM101F, whose published definition runs ~1,500 words
  and dwarfs the table beside it. A stat band without a disclosure ladder needs
  a measure cap somewhere.
- `workbench` at `max-w-7xl` overflows the app shell at 1440px with the sidebar
  open; the column is `max-w-6xl`, like every other page in the domain.
- `report` gives up density entirely. Its figure is set to a reading measure,
  which is the right call for a document and the wrong one for 197 monthly
  points.

## 6i. The detail page adopts the combined design (2026-09-20)

Promoted from the prototype `statistics/dataset-detail`, variant **`combined`**
(`/development/statistics/dataset-detail?v=combined`). The four it was built
from — `editorial`, `workbench`, `brief`, `report` — stay on disk as the record
of what was compared; §6h says what each argued and what it cost.

What the page is now, top to bottom:

1. **Title, then one provenance line.** `ACC101B · 10. CONDITII DE MUNCA ·
   Sursă: INS Tempo ↗, actualizată 5 noiembrie 2025`. The series band used to
   close on a source strip repeating the matrix code and the source this line
   already named. „Sursă" and the way back are ONE item, because the source's
   name IS the link. Cadence and the year span are not here: the rail states
   both, and „Interval de ani" is the control that changes them.
2. **A standing scope rail on the left**, sticky, with the data column beside
   it — `DetailScopeSentence layout="rail"`. Same segments, same controls, same
   phone sheet; only the desktop shape differs, and the chips branch is not
   rendered at all when the rail is chosen (two copies of every control is a
   duplicate for a screen reader, not a style).
3. **The figure and the facts that scale it**, on one baseline:
   `10 număr · 2024` beside `unitate · minim · maxim · medie · observații`.
   The unit is the row's first fact rather than a heading over it, stated once
   instead of repeated after every figure.
4. **The chart marks what the facts name** — peak, trough and the latest point,
   with an area tint and the mean as a dashed reference. The facts say WHAT the
   extremes are; the marks say WHERE.
5. **The definition, then the numbered notes.** Methodology, sources, INS's own
   observations and continuity are sections `1.`–`4.`, not four identical
   chevrons: a number is cheaper to cite than a chevron is to open, and a
   reader could not tell from the outside which row held what they came for.
6. **The appendix last**, closed: the table, the axes, the coverage, the
   provenance and the related sets. It is what a reader consults once the
   figure and the notes have said what they are looking at.

Rules the promotion had to hold, and does:

- **The latest PUBLISHED cell is the headline, readable or not.**
  `summarizeSeries` skips unreadable values, so its „latest" is the last
  READABLE one — printing that under „Ultima valoare" while INS's actual latest
  cell is confidential would present a stale number as current. The page passes
  `absent` for exactly that case and the summary says so in words, with the
  cell's period and quality flag. Absence is never a figure and never 0.
- **The summary parses values with the chart's own reader.** `toChartValue`,
  not `parseFloat` — `parseFloat('0oops')` is 0, which would report a new
  minimum for a row the figure below draws as a gap.
- **An extreme the chart does not contain is not marked.** `buildTimeSeries`
  caps the plot at `CHART_MAX_POINTS`, so a long monthly series' peak can live
  outside its own figure; Recharts drops such a mark silently, which is worse
  than not claiming it. The mean is withheld the same way when it falls outside
  the plotted domain.
- **A computed figure prints at a precision its source justifies.** A
  population mean read „22.511.356,94" — a hundredth of a person across 35
  observations.
- **Both catalogs are filled.** The unit words („număr", „persoane",
  „procente", „ani") had empty `ro` msgstrs and Romanian `en` ones, so English
  showed Romanian; this page is the first to render them, and it fixed them.

## 7. Data model expectations at the UI boundary

**Fact — canonical shapes from `src/schemas/ins.ts`** (reuse verbatim):
- `InsDataset`: `code`, `name_ro/en`, `definition_ro/en`, `periodicity[]`,
  `year_range[]`, `dimension_count`, `has_uat_data`, `has_county_data`,
  `has_siruta`, `sync_status`, `last_sync_at`, `context_*`, `metadata`,
  `dimensions`.
- `InsObservation`: `dataset_code`, `value` (string|null), `value_status`,
  `time_period`, `territory`, `unit`, `classifications[]`.
- `InsTimePeriod`: `iso_period`, `year`, `quarter?`, `month?`, `periodicity`.
- `InsDashboardData`: `{ groups: InsUatDatasetGroup[], partial: boolean }`.

**Decision — data status derivation (single helper).** Add
`getDatasetDataStatus(dataset: InsDataset): 'available' | 'catalog-only'` under
`src/features/statistics/lib`. **Assumption:** derive from `sync_status`
(`'full'`/`'partial'` → available; `'metadata_only'`/`'PENDING'`/null →
catalog-only). Confirm the exact value at the GraphQL boundary; the helper is the
single point of change. Every feature consumes this helper, never inline logic.

**Decision — mock contract.** Feature mocks live under
`src/features/statistics/<feature>/mocks` and must match the schema field names
above so the production adapter swap is mechanical. Mocks must include: ≥1
`available` and ≥1 `catalog-only` dataset; an observation series with a **gap**
and a `value_status` non-null row; a county-only dataset (`has_uat_data=false`);
and a null-unit observation.

## 8. Feature implementation map

| Order | Feature | Route/Section | Primary reused data | New surface |
|---|---|---|---|---|
| 1 | Territory hub + UAT dashboard | `/ins/teritorii/$siruta` | `getInsUatDashboard`/`getInsCountyDashboard`, registry top metrics, derived indicators | `TerritoryHeader`, dashboard route |
| 2 | Demographic/economic maps | `/ins/harti` | geojson + `getInsObservationsSnapshotByDatasets` (county) | INS choropleth fill adapter |
| 3 | Dataset explorer | `/ins/seturi` | `useInsDatasetCatalog`, `useInsContexts` | status-aware list route |
| 4 | Dataset detail | `/ins/seturi/$matrixCode` | `getInsDatasetDetails`, `getInsDatasetHistory`, dimensions, series-selection | standalone detail route |
| 5 | Local comparisons | `/ins/comparatii` | per-territory `getInsLatestDatasetValues`/snapshot OR new `compareInsUats` | comparison route |
| 6 | Time-series switcher | hub section | `getInsDatasetHistory` for one SIRUTA | dataset switcher |
| 7 | Cross-domain links | hub section | SIRUTA/CUI join only | `RelatedLinksRail` |
| 8 | Request this dataset | dialog | metadata-only list | request form + submit adapter |

## 9. Responsive behavior

- **Decision.** Indicator tiles: `grid-cols-2 gap-3` → `md:grid-cols-3` →
  `lg:grid-cols-5`. Explorer/detail tables: scroll container + sticky header.
  Filter bars: sticky on desktop (`sticky top-0`), `Sheet` trigger on mobile.
  Map: panel inline on `lg+`, `Sheet` on smaller. Comparison chart/table stack
  vertically on mobile.

## 10. Accessibility, i18n, privacy, provenance

- **Decision (a11y).** All controls keyboard-reachable and labelled; icon-only
  buttons need `aria-label`; decorative icons `aria-hidden`. Tables keep
  semantic `<table>` markup with descriptive headers. Charts and maps require an
  adjacent textual summary and a tabular fallback (the explorer/detail already
  pair chart + table; maps pair choropleth + `HeatmapDataTable`). Badges never
  the sole state signal. `Sheet`/`Dialog` manage focus and headings.
- **Decision (i18n).** All user-facing text via Lingui macros (`t`/`<Trans>`).
  Romanian primary; `name_en`/`definition_en` only when present, else Romanian
  with a note. Locale-aware number/percent/date formatting (reuse
  `ins-stats-view.formatters.ts` `formatPeriodLabel`, value/unit formatting and
  `getUserLocale`). Never hardcode matrix codes as labels; expand acronyms in
  tooltips.
- **Decision (provenance/privacy).** Public aggregate data → no individual
  redaction needed, but `CoverageRibbon` + per-number source line +
  `SourceProvenanceDrawer` + `FreshnessBadge` are mandatory. Gaps and
  `value_status` shown honestly. Catalog-only = explicit product state, never an
  error. `FOM112C` caveat when surfaced.

## 11. Acceptance criteria (domain-level)

- Every dataset reference across all surfaces states its data status, and a
  `DataStatusBadge` (`Doar catalog`, from `getDatasetDataStatus`) is what says
  it when there is something to say. A `Date disponibile` badge on every row
  of an all-available catalog, and on every detail page of one, is noise: the
  honesty it stood for is carried by the badge on the exceptions, by the row
  count, and on the detail page by the figure and the series itself. Decided
  in §6e for the catalog and §6f for the detail page.
- Every primary result shows a `CoverageRibbon` and a per-number source line.
- No surface forces a territory level a dataset lacks (coverage flags enforced).
- Romanian names lead; matrix codes appear only as provenance.
- Time series never interpolate gaps; mixed periodicities never silently mixed.
- All four MVP routes render meaningful loading (skeleton), empty (`EmptyState`),
  catalog-only, error, and stale states.
- `yarn typecheck` clean; Lingui extract/compile run; no `any`; named exports;
  kebab-case files; functional components.
- No new INS data-fetching logic duplicated — features consume the existing
  adapters/hooks.

## 12. Open questions (blockers only)

None. Documented gaps (data-status field name, `compareInsUats` adapter,
territory resolver, INS map fill adapter, `ins-stats-view` parameterization) have
defensible defaults in this doc and the feature files.
