# Feature: Dataset explorer (catalog, status-aware)

> Domain: statistics · Route: `/statistici/seturi` · MVP #3
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`.

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
shadcn `Table`/`Command`). Strength: searchable/filterable list surfaces and
honest data-status modeling. Reuses the catalog/context hooks and the search
scoring already in `ins-stats-view`.

## Summary

A first-class browse surface over the full INS catalog (~1,898 datasets) that is
honest about coverage: every row shows `Date disponibile` vs `Doar catalog`.
Users search by Romanian name / matrix code / context, filter by theme,
periodicity, coverage flags and data status, and click through to dataset detail.
This is the surface that manages the 27-vs-1,871 expectation gap for experts.

## Facts, decisions, assumptions

- **Fact:** `useInsDatasetCatalog({ filter, limit, offset })` →
  `InsDatasetConnection { nodes: InsDataset[], pageInfo }`. Filter
  (`InsDatasetFilterInput`): `search`, `codes`, `contextCode`, `rootContextCode`,
  `periodicity[]`, `hasUatData`, `hasCountyData`. `useInsContexts` →
  hierarchical contexts for the browse tree (`INS_ROOT_CONTEXTS` for root labels).
- **Fact:** Search scoring + grouping by context already exist in
  `ins-stats-view.tsx`/`.formatters.ts` (`getSearchScore`, `normalizeSearchValue`,
  `getContextPathSegments`, grouped-dataset builder) and can be reused.
- **Fact:** `InsDataset` carries `name_ro/en`, `periodicity[]`, `year_range[]`,
  `dimension_count`, `has_uat_data`, `has_county_data`, `has_siruta`,
  `sync_status`, `last_sync_at`, `context_name_ro/en`.
- **Decision:** Data status per row comes from the shared
  `getDatasetDataStatus(dataset)` helper (design.md §7). It is the only place the
  available/catalog-only rule lives.
- **Decision:** Default sort pins available datasets and registry-prioritized
  codes first (reuse the `prioritizedIndex` ordering), then Romanian name
  `localeCompare`. With an active search, score dominates.
- **Decision:** The filter set is a **server filter where supported**
  (`search`, `contextCode`, `periodicity`, `hasUatData`, `hasCountyData`) and a
  **client filter for data status** (since status derives from `sync_status`).
- **Assumption:** The catalog can be fetched at a high `limit` (the entity view
  uses 500) and paginated/virtualized client-side; if the full 1,898 must be
  served in pages, the route uses `offset`/`pageInfo` with `page`/`pageSize`
  search params. Marked Assumption — implementer confirms response size budget.

## Route and URL state

- **Route:** `/statistici/seturi` (file: `src/routes/statistici/seturi.index.tsx`
  + lazy). Default renders without params (grouped, available-first).
- **Search params** (zod `validateSearch`):
  - `q` — free-text search.
  - `theme` / `rootContext` — root context code (themed grouping).
  - `context` — specific context code.
  - `periodicity` — `ANNUAL|QUARTERLY|MONTHLY` (multi, comma-separated).
  - `coverage` — `uat|county|siruta` (multi) → maps to `hasUatData` etc.
  - `status` — `available|catalog` (multi; default both).
  - `view` — `grupat` (grouped tree, default) | `lista` (flat table).
  - `sort` — `relevanta|nume|an|periodicitate` (default `relevanta`).
  - `page`, `pageSize` — only if server pagination is used.

## Data contract and mock states

UI boundary = `InsDataset` (verbatim). Row view-model:

```ts
type DatasetRow = {
  code: string
  name: string                  // name_ro || name_en || code
  contextLabel: string
  periodicityLabel: string      // formatDatasetPeriodicity()
  yearRange: string | null      // "2015 – 2023"
  coverage: { uat: boolean; county: boolean; siruta: boolean }
  dimensionCount: number | null
  status: 'available' | 'catalog-only'
  lastSyncAt: string | null
}
```

Mock states (`src/features/statistics/explorer/mocks`):
- **Mixed catalog:** ~30 rows, both statuses, multiple themes/periodicities.
- **Search hit:** `q="turism"` → TUR101C/TUR104E ranked first.
- **Filter to county-only coverage:** `coverage=county` hides UAT-only rows.
- **Status filter:** `status=available` shows only the 27-style loaded set.
- **Empty result:** filter combination with zero matches.
- **Catalog-only row:** `Doar catalog` badge + inline `RequestDatasetAction`.

## UI structure

```
<header band> "Seturi de date INS" + subtitle + CoverageRibbon ("27 din 1.898 cu date")
<sticky filter bar>
  <Command/search input> q  (debounced, reuse 200ms pattern)
  <Select> Temă (root contexts) · <MultiSelect> Periodicitate
  <MultiSelect> Acoperire (UAT/Județ/SIRUTA) · <ToggleGroup> Status: Toate|Date disponibile|Doar catalog
  <ToggleGroup> view: Grupat | Listă · <Select> sort
  active filters as <FilterTag> chips (reuse active-filters-bar.tsx)
<body>
  view=grupat: <Accordion> by theme/context → rows
  view=lista: <Table> columns: Nume | Cod | Temă | Periodicitate | Interval | Acoperire | Status
  each row: name (link → detail) · matrix code (muted) · DataStatusBadge ·
            coverage mini-badges · FreshnessBadge · (catalog-only) Cere set
  <pagination> if server-paged
```

- **Decision:** Row is a single accessible link to
  `/statistici/seturi/$matrixCode`. Matrix code is muted secondary text. Status
  badge is always present.

## Component reuse and proposed new components

- **Reuse:** `useInsDatasetCatalog`, `useInsContexts`; search/group helpers from
  `ins-stats-view.formatters.ts`; `Table`, `Accordion`, `Command`, `Select`,
  `MultiSelect`, `ToggleGroup`, `active-filters-bar.tsx`/`FilterTag`,
  `pagination`, `Skeleton`, `EmptyState`, `Badge`.
- **New (domain):** `DataStatusBadge`, `getDatasetDataStatus`, `CoverageRibbon`,
  `FreshnessBadge`, `DatasetExplorerTable`/`DatasetExplorerGrouped`,
  `RequestDatasetAction` (feature 8). `DatasetPicker` (shared) can wrap this
  list logic for other features.

## Interactions

- Type in search → debounced server `search` + client re-rank; URL `q` updates.
- Filter/sort/view changes update URL; default view renders with none.
- Row click → dataset detail (carries `?from=explorer` for backtracking).
- Catalog-only row "Cere set" → opens request dialog (`?request=<code>`).
- `ShareFilteredView` copies the filtered URL.

## Loading, empty, error, partial, stale states

- **Loading:** table/accordion `Skeleton` rows; preserve filter bar.
- **Empty:** `EmptyState` "Niciun set nu corespunde filtrelor" + "Resetează
  filtrele".
- **All catalog-only (status filter):** banner explaining these have no loaded
  observations yet + bulk-friendly `RequestDatasetAction` per row.
- **Error:** inline error with retry; URL preserved.
- **Stale:** `FreshnessBadge` per row from `last_sync_at`.

## Accessibility and i18n

- Semantic `<table>` with `<th scope="col">`; grouped view uses Accordion with
  proper button/region semantics.
- Status and coverage conveyed by text + icon, not color alone.
- Search input labelled; filter chips removable by keyboard.
- Romanian labels: "Seturi de date INS", "Temă", "Periodicitate", "Acoperire",
  "Status", "Date disponibile", "Doar catalog", "Grupat", "Listă", "Interval",
  "Cere set", "Resetează filtrele". Periodicity rendered in words.

## Privacy, provenance, source citation

- Catalog metadata only here; the source is INS Tempo. `CoverageRibbon` states
  the loaded-vs-cataloged limit prominently. Each row's `FreshnessBadge` and the
  detail page provide per-dataset provenance. No accusatory language; status is
  neutral product state.

## Acceptance checklist

- [ ] All datasets browseable; every row shows `DataStatusBadge` from
      `getDatasetDataStatus`.
- [ ] Search ranks by relevance (reused scoring); themes/periodicity/coverage/
      status filters work and serialize to URL.
- [ ] Grouped and flat list views both render; row → dataset detail with `from`.
- [ ] Catalog-only rows expose `RequestDatasetAction`.
- [ ] Empty/error/loading states present; `CoverageRibbon` states 27/1.898.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; table semantics correct.

## Non-goals

- On-demand dataset loading pipeline UX (advanced).
- Cross-tab / pivot builder.
- Observation-level data (lives in dataset detail).

## Open questions (blockers only)

None. Catalog page-size strategy has an Assumption default (high-limit +
client virtualization, fall back to server pagination).
