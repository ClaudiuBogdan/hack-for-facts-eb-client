# Feature: Dataset detail (observations + time series)

> Domain: statistics · Route: `/statistici/seturi/$matrixCode` · MVP #4
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`.

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
recharts). Strength: dimension/series selection UIs and observation tables.
Reuses the most of any feature: the `DatasetDetailSection` engine already exists
in `ins-stats-view.presentation.tsx` and is lifted onto a standalone route.

## Summary

One dataset fully explained and explorable: definition, periodicity, year range,
unit, dimension axes (with option counts), classifications, coverage flags, then
an observations table with per-dimension selectors, a time-series chart, CSV
download, and provenance. For catalog-only datasets it shows the full metadata
and an explicit "no observations yet" state with a request action.

## Facts, decisions, assumptions

- **Fact:** `getInsDatasetDetails(code)` → `InsDatasetDetails` (dataset +
  `dimensions: InsDimension[]` with `option_count`, `is_hierarchical`).
  `getInsDatasetDimensions(code)` → `InsDatasetDimensionsResult`.
  `getInsDatasetHistory({ datasetCode, filter, pageSize, maxPages })` →
  `InsDatasetHistoryResult` (observations, paginated internally).
- **Fact:** Series/unit selection logic exists in `src/lib/ins/series-selection.ts`
  (`buildSeriesGroups`, `buildDefaultSeriesSelection`, `mergeSeriesSelection`,
  `buildUnitOptions`, `filterObservationsBySeriesSelection`, `buildStableSeries`)
  and is exercised by `DatasetDetailSection`.
- **Fact:** Temporal-split handling and dataset metadata rendering (definition,
  methodology, periodicity label, year range, breadcrumb hierarchy, INS Tempo URL)
  exist in `ins-stats-view.{filters,formatters,presentation}.ts(x)`.
- **Fact:** History queries require a territory filter (the entity view always
  scopes by siruta/county); the server has a 30s timeout risk → never "load
  everything" (UX doc §15 Performance).
- **Decision:** Because observations must be territory-scoped, dataset detail
  **requires a selected territory** to show observations. Default territory =
  national/representative when the dataset has it; otherwise a `TerritoryPicker`
  prompt. The metadata/definition/dimension sections render without a territory.
- **Decision:** Reuse `DatasetDetailSection` (and its series selectors, table,
  chart) directly, parameterized by `{ datasetCode, territorySelector }` instead
  of an entity. This is the design.md §5 refactor boundary applied to one section.
- **Assumption:** CSV export is built client-side from the currently filtered
  observation rows (period, value, unit, classifications, status). No server
  export endpoint is assumed.

## Route and URL state

- **Route:** `/statistici/seturi/$matrixCode` (file:
  `src/routes/statistici/seturi.$matrixCode.tsx` + lazy). `$matrixCode` is the
  INS code (apply `applyInsCodeSubstitution`).
- **Search params** (zod `validateSearch`):
  - `siruta` — selected territory (default: dataset's representative/national).
  - `level` — `LAU|NUTS3|NUTS2|NATIONAL` (derived/overridable).
  - `split` — temporal split `all|year|quarter|month` (constrained to dataset
    periodicity).
  - `series` — serialized classification selection (reuse
    `serializeSeriesSelection` / `parseInsUrlState` format).
  - `unit` — selected unit key.
  - `view` — `tabel` (default) | `grafic` | `harta`.
  - `from` — backtrack origin (`explorer`, `teritoriu`, `harti`).
  - `request` — `1` to auto-open the request dialog (catalog-only).
- **Decision:** Reuse the existing INS URL-state serialization
  (`ins-stats-view.url-state.ts`) so series/unit selection is identical to the
  embedded view and links are interchangeable.

## Data contract and mock states

UI boundary = `InsDatasetDetails`, `InsObservation`, `InsDatasetDimension`,
`InsUnit`, `InsClassification` (verbatim from `src/schemas/ins.ts`).

```ts
type DimensionAxis = {                 // from InsDimension
  index: number; type: InsDimensionType
  label: string; optionCount: number | null; isHierarchical: boolean | null
  classificationTypeCode?: string
}
type ObservationRow = {                // flattened InsObservation for the table
  period: string; value: string | null; numericValue: number | null
  unit: string | null; statusLabel: string | null
  classifications: { type: string; value: string }[]
}
```

Mock states (`src/features/statistics/dataset-detail/mocks`):
- **Available + 6 dimensions (POP107D-like):** definition, dimensions with
  option counts, observations table + time-series, multiple classifications/units.
- **Catalog-only:** full metadata, dimensions list, but observations section
  shows "Date indisponibile încă" + `RequestDatasetAction`; no chart.
- **Series with a gap + revised status:** chart shows the gap (no interpolation);
  a row carries `value_status` annotation.
- **No-territory-selected:** metadata renders; observation section prompts
  `TerritoryPicker`.
- **County-only dataset at LAU request:** observation section explains the level
  isn't available and offers county.
- **FOM112C-like residue:** metadata caveat banner.

## UI structure

```
<header band>
  Breadcrumb: Statistici / Seturi de date / {name}  (+ context hierarchy chips)
  title {name_ro} · matrix code (muted) · DataStatusBadge · CoverageRibbon
  actions: [Descarcă CSV] · [Vezi pe hartă] (if has_county/uat) · ShareFilteredView
<section "Despre set"> (ExpandableMarkdownField)
  definition (ro/en fallback) · periodicity (words) · year range · unit ·
  dimension count · coverage flags (UAT/Județ/SIRUTA chips) · methodology/notes
<section "Dimensiuni"> list of DimensionAxis with option counts + type labels
<section "Observații"> ← DatasetDetailSection engine
  <TerritoryPicker> (selected territory) + temporal split toggle
  series/unit selectors (reuse) → active criteria chips
  <Tabs view>: Tabel | Grafic | Hartă
    Tabel: <Table> period | value | unit | classifications | status (12 rows + "arată tot")
    Grafic: time-series line (gaps honest, status annotated, unit label)
    Hartă: link/embed to /statistici/harti?indicator=$matrixCode (if coverage)
  provenance footer: Sursă: INS Tempo, matrice {code}, actualizat {last_sync}
                     → SourceProvenanceDrawer + "Deschide în INS Tempo"
```

## Component reuse and proposed new components

- **Reuse:** `DatasetDetailSection`, `ExpandableMarkdownField`,
  `MarkdownDescription` (`ins-stats-view.presentation.tsx`); all of
  `series-selection.ts`; `ins-stats-view.{filters,formatters,url-state}`; hooks
  `useInsDatasetHistory`, `useInsDatasetDimensions`, `useInsDatasetCatalog`/
  `getInsDatasetDetails`; `Tabs`, `Table`, `Breadcrumb`, `Select`, `MultiSelect`,
  `ToggleGroup`, `copy-button`, `Skeleton`, `EmptyState`.
- **New (domain):** `DataStatusBadge`, `CoverageRibbon`, `FreshnessBadge`,
  `SourceProvenanceDrawer`, `TerritoryPicker`, CSV builder
  (`buildDatasetCsv(rows)`), `DatasetDetailPage` orchestrator.

## Interactions

- Change territory/split/series/unit → refetch history; URL updates via existing
  serializer; table + chart update together.
- View tabs switch Tabel/Grafic/Hartă (URL `view`).
- "Descarcă CSV" exports current filtered rows (filename
  `ins-{code}-{siruta}-{date}.csv`).
- "Deschide în INS Tempo" → external source URL (existing builder).
- Catalog-only + `?request=1` → opens request dialog.
- "arată tot" expands the 12-row preview (reuse `showAllRows` pattern).

## Loading, empty, error, partial, stale states

- **Loading:** metadata skeleton first (fast), then observation
  table/chart skeleton.
- **Catalog-only:** metadata fully rendered; observation block = "Date
  indisponibile încă pentru acest set" + dataset name + `RequestDatasetAction`.
- **No territory selected:** observation block prompts `TerritoryPicker`.
- **No observations for selection:** `EmptyState` "Nicio observație pentru
  selecția curentă" + reset-to-defaults.
- **Gaps / status:** chart never interpolates; table shows `statusLabel`
  (estimat/revizuit) via `getObservationStatusLabel`.
- **Error:** section-scoped error + retry; metadata stays if only history failed.
- **Stale:** `FreshnessBadge` from `last_sync_at`; FOM112C-style caveat banner.

## Accessibility and i18n

- Chart paired with the observations table (required tabular fallback); chart
  `aria-hidden`, table is the accessible data.
- Dimension/series selectors labelled; active-criteria chips removable by keyboard.
- Definition markdown sanitized (reuse existing `normalizeMarkdownText`).
- Romanian labels: "Despre set", "Dimensiuni", "Observații", "Tabel", "Grafic",
  "Hartă", "Descarcă CSV", "Deschide în INS Tempo", "Date indisponibile încă",
  "arată tot", "Sursă: INS Tempo, matrice {code}, actualizat {date}". Year range,
  numbers, periods locale-formatted.

## Privacy, provenance, source citation

- Mandatory provenance footer + `SourceProvenanceDrawer` (matrix code,
  `last_sync_at`, periodicity, definition, INS Tempo URL, caveats).
  `value_status` surfaced per row. Catalog-only is an explicit state. CSV export
  includes a provenance header row (source, code, retrieval date).

## Acceptance checklist

- [ ] Metadata (definition/periodicity/year range/unit/dimensions/coverage)
      renders for available and catalog-only datasets.
- [ ] Observations table + time-series render for a selected territory, reusing
      the existing series/unit selection engine and URL serialization.
- [ ] Gaps shown honestly; `value_status` labelled; no cross-periodicity mixing.
- [ ] CSV export reflects current filters and includes provenance header.
- [ ] Catalog-only → no chart, explicit "indisponibile" + request action.
- [ ] `Vezi pe hartă` only shown when coverage flags allow.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; chart has table fallback.

## Non-goals

- Multi-dataset overlay/correlation (advanced).
- Editing or loading observations.
- Cross-tab pivot builder.

## Open questions (blockers only)

None. Default-territory selection and CSV-export approach have documented
Decisions/Assumptions.
