# Statistics (Statistici) — Domain Design

> Consumes: `docs/design/statistics/ux.md`, `docs/ux-research/statistics.md`,
> `docs/design/README.md`. Every nontrivial statement is labeled
> **Fact** / **Decision** / **Assumption**.

## 1. Domain purpose and scope

**Decision:** The statistics domain delivers a dedicated `/statistici` area that
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
| `/statistici` | Landing: themed entry, territory search, coverage ribbon | (landing; covered by design.md §6, not a separate assigned file) |
| `/statistici/teritorii/$siruta` | Territory hub = UAT/county dashboard + time-series switcher + cross-domain rail | `territory-hub-uat-dashboard.md`, `territory-time-series-switcher.md`, `cross-domain-territory-links.md` |
| `/statistici/harti` | Demographic/economic choropleth maps | `demographic-economic-maps.md` |
| `/statistici/seturi` | Dataset explorer (catalog, status-aware) | `dataset-explorer.md` |
| `/statistici/seturi/$matrixCode` | Dataset detail | `dataset-detail.md` |

**Decision (route added by this domain, consistent with the canonical scheme):**

| Route | Surface | Feature file |
|---|---|---|
| `/statistici/comparatii` | Local comparisons | `local-comparisons.md` |

**Decision — non-route features.** Territory time-series switcher and
cross-domain links are **sections of `/statistici/teritorii/$siruta`**, not
routes. Request-this-dataset is a **dialog action** reachable from explorer rows
and dataset detail (URL state `?request=<matrixCode>`), not a route.

**Decision — path slugs are Romanian** (`teritorii`, `harti`, `seturi`,
`comparatii`), matching the foundation's Romanian-slug rule and existing routes
(`/primarie`, `/companies`).

**Decision — territory key is SIRUTA.** `$siruta` is the LAU/county SIRUTA code.
County hubs accept the county SIRUTA; level (`LAU` vs `NUTS3`) is derived from
the resolved territory, mirroring `ins-stats-view`'s `isCounty` branch.

**Decision — navigation.** Add a single sidebar entry "Statistici" → `/statistici`
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

## 6. Landing page (`/statistici`) — design

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
   share, each a saved query into `/statistici/seturi?context=…`.
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
(`lib/hub-national-series.ts`, captured from the same API on 2026-09-16):
closed years of official statistics do not change, and re-reading 35 years
of six datasets on every view carries no information. The live latest point
is appended only when it is a newer year of the same cell and unit.

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

**Dataset explorer (`/statistici/seturi`).** Decision: a facet rail beside
the list on desktop (themes as a list with loaded-dataset counts, cadence,
coverage), the same controls in the sheet on a phone; the status control
(„Cu date" / „Doar catalog") shows only when it can change something. Rows
carry a `DataStatusBadge` only when catalog-only — an „available" badge on
every row of an all-available catalog was noise. The right column shows the
cadence and the latest period when the catalog row carries one, else the
catalog's declared span. Fixed: `?context=1` (a bare digit the router parses
as a number) and a single `?frecventa=ANNUAL` were dropped by the search
schema, so every theme link from the hub landed unfiltered.

**Territory hub (`/statistici/teritorii/$siruta`).** Decision: the four
headline indicators as a band with county and national references, then
every other indicator in an accordion grouped by domain (from the matrix
code's three-letter prefix: `POP`, `FOM`/`SOM`, `LOC`, `SCL`, `SAN`, `GOS`,
`TUR`, `ART`, `AGR`, `JUS`, `ADM`), one compact row each — name, latest
value with a Romanian unit word, period, sparkline, provenance, compare.
The first two groups open by default. Replaced a 9,600-pixel wall of
identical tiles that led with agriculture because it sorted by code and
printed raw unit symbols („17.953 other").

**Dataset detail (`/statistici/seturi/$cod`).** Decision: the scope is a row
of labelled chips („Sexe: Total", „Teritoriu: România") rather than a run-on
sentence of bare values, with the same popovers behind them and the same
bottom sheet on a phone. The hero says the unit in Romanian and formats the
period; the chart is captioned „Evoluție în timp" rather than repeating the
title, formats its axis in the active locale, and fills the column. The
selection logic (native lane, pins, validation) is untouched.

**Comparisons (`/statistici/comparatii`).** Decision: the picture first —
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
| 1 | Territory hub + UAT dashboard | `/statistici/teritorii/$siruta` | `getInsUatDashboard`/`getInsCountyDashboard`, registry top metrics, derived indicators | `TerritoryHeader`, dashboard route |
| 2 | Demographic/economic maps | `/statistici/harti` | geojson + `getInsObservationsSnapshotByDatasets` (county) | INS choropleth fill adapter |
| 3 | Dataset explorer | `/statistici/seturi` | `useInsDatasetCatalog`, `useInsContexts` | status-aware list route |
| 4 | Dataset detail | `/statistici/seturi/$matrixCode` | `getInsDatasetDetails`, `getInsDatasetHistory`, dimensions, series-selection | standalone detail route |
| 5 | Local comparisons | `/statistici/comparatii` | per-territory `getInsLatestDatasetValues`/snapshot OR new `compareInsUats` | comparison route |
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

- Every dataset reference across all surfaces shows a `DataStatusBadge`
  (`Date disponibile` / `Doar catalog`) sourced from `getDatasetDataStatus`.
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
