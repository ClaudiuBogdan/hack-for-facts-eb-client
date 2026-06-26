# Feature: Territory time-series switcher

> Domain: statistics · Section of `/statistici/teritorii/$siruta` · High-value next #6
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`,
> `features/territory-hub-uat-dashboard.md`.

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Query + recharts). Strength:
a focused dataset-switcher + trend chart bound to one territory. This is a
**section of the territory hub route**, not a new route. Reuses the dataset
detail observation engine scoped to a single SIRUTA.

## Summary

Inside the territory hub, let the user switch which dataset they view for *this
place* and read its trend over time. It deepens the hub from a static headline
into an analytical surface: pick from the territory's available datasets, see a
line chart + compact table with unit, gaps, status, and provenance, and jump to
full dataset detail.

## Facts, decisions, assumptions

- **Fact:** `getInsDatasetHistory({ datasetCode, filter, pageSize, maxPages })`
  returns territory-scoped observations; the entity view uses it with a
  siruta/county filter and `pageSize: 1000, maxPages: 30`.
- **Fact:** The dataset switcher + trend chart + series/unit selectors already
  exist as `DatasetExplorerSection` + `DatasetDetailSection` in
  `ins-stats-view.presentation.tsx`, driven by the territory's available catalog
  (`useInsDatasetCatalog` filtered by `hasUatData`/`hasCountyData`).
- **Fact:** Available datasets for a territory are constrained by coverage flags
  and the priority-loaded set; only `Date disponibile` datasets yield a trend.
- **Decision:** This section reuses the dataset switcher UI from the entity view,
  scoped to `$siruta` from the route, with the **selected dataset and split in
  the hub's URL state** (`?dataset`, `?split`, `?tab=serie`) so the hub's
  indicator-card "Vezi evoluția" links land directly here.
- **Decision:** Catalog-only datasets appear in the switcher list (so users see
  what exists) but render the "Date indisponibile încă" state + request action
  when selected, never a blank chart.
- **Assumption:** Default selected dataset = the territory's population (POP107D)
  or the first available top metric, matching the hub default. Marked Assumption
  (mirrors `ins-stats-view` default selection logic).

## Route and URL state

- **No new route.** Lives under `/statistici/teritorii/$siruta`.
- **Shared search params** (owned by the hub route, read/written here):
  - `dataset` — selected matrix code.
  - `split` — `all|year|quarter|month` (constrained to dataset periodicity).
  - `series` — serialized classification selection (reuse existing serializer).
  - `unit` — selected unit key.
  - `tab=serie` — focuses/scrolls this section.
- **Decision:** Reuse `ins-stats-view.url-state.ts` serialization so links are
  interchangeable with dataset detail and the embedded entity view.

## Data contract and mock states

UI boundary = `InsObservation`, `InsDataset` (verbatim). View-models reuse the
dataset-detail `ObservationRow` and the series/unit option shapes from
`series-selection.ts`. Territory selector input:

```ts
type TerritoryHistoryInput =
  | { sirutaCode: string }                               // LAU
  | { territoryCode: string; territoryLevel: 'NUTS3' }   // county
```

Mock states (`src/features/statistics/territory-hub/mocks/series.ts`):
- **Available trend:** POP107D over years, line + 12-row table.
- **Switch dataset:** change to FOM104D updates chart/table/unit.
- **Series selection:** dataset with classifications → selectors + active chips.
- **Gap + revised:** trend with a missing year and a `value_status` row.
- **Catalog-only selection:** "indisponibile" + request action.

## UI structure

```
<section id="serie" "Evoluție în timp">
  header: "Evoluție în timp" + selected dataset name + DataStatusBadge
  controls:
    <DatasetPicker scoped to territory's datasets> (available + catalog, badged)
    temporal split <ToggleGroup> (only periodicities the dataset has)
    [series/unit selectors] (reuse) → active criteria chips
  body:
    line chart (gaps honest, unit label, value_status annotation)
    compact table (period | value | unit | status), "arată tot"
    footer: Sursă: INS Tempo, matrice {code}, actualizat {date} → Drawer ·
            [Deschide setul complet] → /statistici/seturi/$matrixCode?siruta=$siruta&...
```

- **Decision:** Single full-width band, not a card; the chart + table pair is the
  content. Reuses the hub's scroll-to behavior when arriving via `?tab=serie`.

## Component reuse and proposed new components

- **Reuse:** `DatasetDetailSection`/`DatasetExplorerSection` (scoped),
  `series-selection.ts`, `ins-stats-view.{filters,formatters,url-state}`,
  `useInsDatasetHistory`, `useInsDatasetCatalog`; `ToggleGroup`, `Tabs`, `Table`,
  recharts; `Skeleton`, `EmptyState`.
- **New (domain):** none beyond the shared `DatasetPicker`, `DataStatusBadge`,
  `FreshnessBadge`, `SourceProvenanceDrawer`, and a thin
  `useTerritoryDatasetTrend(input, datasetCode)` wrapper around
  `useInsDatasetHistory`.

## Interactions

- Switch dataset → URL `?dataset` updates; chart/table refetch for `$siruta`.
- Change split/series/unit → URL updates; trend recomputes (no interpolation).
- Hub indicator card "Vezi evoluția" → sets `?dataset&tab=serie`, scrolls here.
- "Deschide setul complet" → dataset detail pre-scoped to this territory.
- "arată tot" expands the row preview.

## Loading, empty, error, partial, stale states

- **Loading:** switcher renders immediately (catalog cached); chart/table
  skeleton while history loads.
- **Empty (no observations for territory+dataset):** `EmptyState` "Nicio
  observație pentru acest teritoriu" + suggest another dataset.
- **Catalog-only dataset selected:** "Date indisponibile încă" + request action,
  no chart.
- **Gaps/status:** honest gaps, `value_status` annotated.
- **Error:** section error + retry; switcher stays usable.
- **Stale:** `FreshnessBadge` from the dataset's `last_sync_at`.

## Accessibility and i18n

- Chart paired with the table (required fallback); chart `aria-hidden`.
- Switcher is a labelled combobox; split toggle announces available periodicities.
- Romanian labels: "Evoluție în timp", "Deschide setul complet", "arată tot",
  "Nicio observație pentru acest teritoriu", "Date indisponibile încă",
  "Sursă: INS Tempo, matrice {code}, actualizat {date}". Periods/numbers
  locale-formatted.

## Privacy, provenance, source citation

- Per-trend source line + `SourceProvenanceDrawer`; gaps and status shown
  honestly. Catalog-only is explicit. No accusatory framing.

## Acceptance checklist

- [ ] Section renders inside the hub, scoped to `$siruta`, defaulting to the
      population trend.
- [ ] Dataset switch / split / series / unit update the trend and the hub URL,
      reusing existing serialization; links interchangeable with dataset detail.
- [ ] Hub "Vezi evoluția" deep-links land on the right dataset and scroll here.
- [ ] Catalog-only selection → "indisponibile" + request action, no blank chart.
- [ ] "Deschide setul complet" carries territory scope to dataset detail.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; chart has table fallback.

## Non-goals

- Multi-dataset overlay on one territory (advanced correlation).
- Comparison across territories (feature 5).
- A standalone route — this is a hub section.

## Open questions (blockers only)

None. Default-dataset choice is an Assumption mirroring the existing view.
