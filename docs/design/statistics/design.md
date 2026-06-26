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

**Decision.** Primary content = curated entry points, not the 1,898 list.
Sections, top→bottom:
1. Title "Statistici" + subtitle "Date oficiale INS Tempo, ancorate în
   teritoriu." + `CoverageRibbon`.
2. **Territory search** (prominent `TerritoryPicker`): "Caută localitatea sau
   județul tău" → navigates to `/statistici/teritorii/$siruta`.
3. **Themed dataset cards** for the loaded set, grouped by registry theme
   (Populație, Forță de muncă & salarii, Indicatori locali, Sector public,
   Educație, Sănătate, Turism). Each card lists its `Date disponibile` datasets
   → dataset detail. Built from `INS_PRIORITIZED_*` filtered to available.
4. **Entry tiles** to `/statistici/harti`, `/statistici/seturi`,
   `/statistici/comparatii`.

**Assumption.** Landing is straightforward composition of domain components and
is specified here rather than as a separate feature file (it has no assigned
slug). Implementer builds it after the four MVP features exist.

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
