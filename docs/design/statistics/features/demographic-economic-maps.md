# Feature: Demographic / economic maps

> Domain: statistics · Route: `/statistici/harti` · MVP #2
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`.

## Feature owner profile

Frontend feature implementer with data-visualization / mapping focus (MapLibre +
GeoJSON choropleth, recharts side panel). Reuses the existing client map stack;
writes one new INS-by-territory fill adapter. Familiarity with
`src/components/maps/InteractiveMap.tsx` and the advanced-map binning hooks is
expected.

## Summary

A choropleth view of any loaded INS indicator over Romanian geography:
choose indicator + territory level (county default, UAT where coverage allows),
read the map colored by latest value, click a region to open a side panel with
that territory's trend and cross-domain links. This is the most shareable surface
and reuses the verified map geometry/renderer; only the **fill values** are new
(INS instead of budget heat data).

## Facts, decisions, assumptions

- **Fact:** Geometry + renderer already exist and are reusable: `useGeoJson`
  (`geoJsonQueryOptions('UAT'|'County')`, `src/hooks/useGeoJson.ts`),
  `InteractiveMap` (`mapViewType: 'UAT'|'County'`, `getFeatureStyle`,
  `onFeatureClick`, `heatmapData`, `geoJsonData`, `highlightedFeatureId`),
  `MapLegend`, `HeatmapDataTable`, binning `useAdvancedMapAnalyticsBins`.
- **Fact:** The existing heat hooks (`src/hooks/useHeatmapData.ts`,
  `heatmapJudetQueryOptions`/`heatmapUATQueryOptions`) are **budget-derived**, not
  INS. They are the integration template, not the data source for this feature.
- **Fact:** INS values per territory for a dataset are available via
  `getInsObservationsSnapshotByDatasets({ datasetCodes, filter })` and
  `getInsLatestDatasetValues` (`src/lib/api/ins.ts`). The filter supports
  `territoryLevels: ['NUTS3'|'LAU']`, `period`, `classificationValueCodes`.
- **Fact:** Coverage flags `has_county_data` / `has_uat_data` (and `has_siruta`)
  determine which levels an indicator supports.
- **Decision:** Build a new feature-local adapter
  `getInsChoroplethValues({ datasetCode, level, period, classification? })` under
  `src/features/statistics/maps/api` that returns
  `Map<sirutaCode, number | null>` by composing the snapshot adapter. This keeps
  the new logic isolated and swappable.
- **Decision:** Indicators offered are the loaded set filtered by the level's
  coverage flag (county: `has_county_data`; UAT: `has_uat_data`). County is the
  default level (UX doc MVP scope: county-level).
- **Decision:** UAT level is offered only for indicators with `has_uat_data`; if
  the selected indicator lacks UAT data, the UAT option is disabled with a
  tooltip ("Fără date la nivel de UAT pentru acest set").
- **Assumption:** No precomputed national/county rollups exist in the product
  contract (UX doc §6 "Missing"); the choropleth derives latest-value-per-
  territory client-side from the snapshot adapter for the priority datasets. If a
  rollup endpoint appears later, swap inside `getInsChoroplethValues` only.
- **Assumption:** Map binning uses quantile/Jenks bins from
  `useAdvancedMapAnalyticsBins`; legend bins are human-readable ranges, not raw
  min/max (UX doc §12).

## Route and URL state

- **Route:** `/statistici/harti` (file: `src/routes/statistici/harti.tsx` +
  lazy). Default view renders with no params (county map of POP107D).
- **Search params** (zod `validateSearch`):
  - `indicator` — matrix code (default `POP107D`).
  - `level` — `county` (default) | `uat`.
  - `period` — `latest` (default) | `YYYY`.
  - `classification` — optional classification value code for sliceable datasets.
  - `highlight` — SIRUTA to pre-select/zoom (used by deep links from the hub).
  - `panel` — SIRUTA of the open side panel (mirrors click selection).
- **Decision:** `level=uat` with a county-only `indicator` normalizes to
  `level=county` in the parser, leaving a toast-free corrected URL.

## Data contract and mock states

```ts
type ChoroplethCell = { siruta: string; value: number | null; name: string }
type ChoroplethData = {
  datasetCode: string
  level: 'county' | 'uat'
  period: string                 // iso_period actually used
  unit: { symbol: string | null; name: string | null }
  cells: ChoroplethCell[]        // → Map<siruta, value> for InteractiveMap.heatmapData shape
  status: 'available' | 'catalog-only'
}
```

Mock states (`src/features/statistics/maps/mocks`):
- **County happy:** full coverage, 42 counties valued.
- **UAT happy:** subset of UATs valued, some `null` (gap) cells.
- **County-only indicator at UAT level:** adapter returns empty → UI shows the
  level-coverage notice and offers switching to county.
- **Catalog-only indicator selected:** picker prevents it; if deep-linked, page
  shows `Doar catalog` notice + `RequestDatasetAction`, no empty map.
- **Sparse fill:** many `null` cells → rendered in a distinct "fără date" bin.

## UI structure

```
<header band> title "Hărți demografice și economice" + CoverageRibbon
<sticky toolbar>
  <DatasetPicker> (indicator; only available datasets; DataStatusBadge per option)
  <ToggleGroup> level: Județ | UAT  (UAT disabled if !has_uat_data)
  <Select> perioadă: Cele mai recente | 2023 | 2022 …
  [<Select> clasificare] (only if dataset has a CLASSIFICATION dimension)
  <ShareFilteredView>
<main grid: map (2fr) + side panel (1fr; Sheet on <lg)>
  <InteractiveMap> choropleth, MapLegend (human-readable bins), "fără date" bin
  <SidePanel> (when a region selected):
     <TerritoryHeader mini> name + level + SIRUTA
     latest value + unit + FreshnessBadge + source → Drawer
     mini time-series (getInsDatasetHistory for that siruta+indicator)
     RelatedLinksRail (feature 7): buget, primărie, firme, instituții, hub
     [Deschide teritoriul] → /statistici/teritorii/$siruta
<below map> <HeatmapDataTable> tabular fallback (sortable: territory, value)
```

## Component reuse and proposed new components

- **Reuse:** `useGeoJson`/`geoJsonQueryOptions`, `InteractiveMap`, `MapLegend`,
  `HeatmapDataTable`, `useAdvancedMapAnalyticsBins`, `ToggleGroup`, `Select`,
  `Sheet`, `Skeleton`, `EmptyState`; INS hooks
  `useInsObservationsSnapshotByDatasets`, `useInsDatasetHistory`,
  `useInsDatasetCatalog`; formatters from `ins-stats-view.formatters.ts`.
- **New (domain):** `getInsChoroplethValues` adapter + `useInsChoropleth` hook;
  `MapIndicatorToolbar`; `TerritoryMapSidePanel`; reuse `DatasetPicker`,
  `CoverageRibbon`, `FreshnessBadge`, `SourceProvenanceDrawer`, `RelatedLinksRail`.
- **Decision (`MapListSync`):** the choropleth + `HeatmapDataTable` is the
  foundation's `MapListSync` pattern — selection highlights in both; implement as
  shared selected-SIRUTA state driving `highlightedFeatureId` and table row
  emphasis.

## Interactions

- Pick indicator/level/period → refetch fill via `useInsChoropleth`; URL updates.
- Click region → `?panel=<siruta>`, side panel opens, region highlighted; table
  row scrolls into view and emphasizes.
- "Deschide teritoriul" → `/statistici/teritorii/$siruta`.
- Drill intent: county click with `has_uat_data` indicator offers "Vezi UAT-urile"
  → `level=uat` zoomed to that county (Assumption: reuse existing zoom-to-feature).
- `highlight` deep-link pre-selects and zooms on load.
- Legend, level toggle, and table headers fully keyboard operable.

## Loading, empty, error, partial, stale states

- **Loading:** map skeleton (geometry may be cached) + legend skeleton; dot
  loader for first geometry fetch.
- **Empty (no cells for selection):** overlay `EmptyState` "Fără date pentru
  această selecție" + suggestion to change level/period.
- **Level-coverage mismatch:** non-blocking banner "Acest set nu are date la
  nivel de UAT" + button to switch to county.
- **Catalog-only indicator (deep-linked):** `Doar catalog` notice +
  `RequestDatasetAction`; no empty choropleth rendered.
- **Error:** geometry vs data errors handled separately; data error keeps the map
  shell and shows a retry in the toolbar.
- **Stale / gaps:** `null` cells in a "fără date" bin (distinct neutral fill, not
  the low-value color); `FreshnessBadge` on the side panel.

## Accessibility and i18n

- Map is decorative-without-text alone → the `HeatmapDataTable` is the required
  tabular fallback with semantic headers and sortable values.
- Legend conveys bins by text ranges + swatches (color never alone).
- Toolbar controls labelled; level toggle announces disabled state + reason.
- Side panel is a focus-managed `Sheet` on mobile.
- Romanian labels: "Hărți demografice și economice", "Județ", "UAT",
  "Cele mai recente", "Clasificare", "Fără date", "Deschide teritoriul",
  "Vezi UAT-urile", "Sursă: INS Tempo, matrice {code}, actualizat {date}".

## Privacy, provenance, source citation

- Aggregate public data; no redaction. `CoverageRibbon` (with the 27/1.898 limit)
  + per-territory source line + `SourceProvenanceDrawer`. The legend and side
  panel both state unit and period. `value_status` shown in the side-panel
  tooltip. Never imply a ranking is a judgment — neutral wording only.

## Acceptance checklist

- [ ] County choropleth of POP107D renders with no params; legend uses readable
      bins; `HeatmapDataTable` mirrors the map.
- [ ] Indicator/level/period/classification changes refetch via the new INS fill
      adapter and update the URL; budget heat hooks are NOT used for fill.
- [ ] UAT level disabled (with reason) for county-only indicators; deep-linked
      mismatches normalize to county.
- [ ] Region click opens side panel with value, mini-trend, source, and
      `RelatedLinksRail`; "Deschide teritoriul" deep-links to the hub.
- [ ] Catalog-only / no-data / error states render explicitly; no blank map.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; tabular fallback present.

## Non-goals

- Custom user-defined map series / sharing editor (advanced-map-datasets territory).
- Time-animated maps; multi-indicator overlays; correlation maps.
- Deriving server-side rollups — client derives latest-per-territory for priority
  datasets only.

## Open questions (blockers only)

None. Rollup availability and drill-zoom reuse have documented Assumption
defaults; the fill adapter isolates any later backend change.
