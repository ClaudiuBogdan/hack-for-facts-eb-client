# Feature: Territory hub + UAT dashboard

> Domain: statistics · Route: `/statistici/teritorii/$siruta` · MVP #1
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`.

## Feature owner profile

Frontend feature implementer (React 19 + TypeScript + TanStack Router + shadcn
+ TanStack Query). Strength: composing existing data hooks into a new route and
extracting a reusable view from an entity-coupled component. No new INS data
layer is written — the engine in `ins-stats-view` and `use-ins-dashboard` is
reused.

## Summary

The territory hub is the highest public-value surface: a citizen searches their
locality/county and lands on a single trustworthy screen showing identity
(name, level, population, urban/rural) and 4–5 headline indicators (population,
employees, unemployment/wage, dwellings) — each with latest value, unit,
sparkline, source, and a "compare to county/national" action. It is the host
page for the time-series switcher (feature 6) and cross-domain links (feature 7).

## Facts, decisions, assumptions

- **Fact:** `getInsUatDashboard({ sirutaCode, period?, contextCode? })` returns
  `InsDashboardData { groups: InsUatDatasetGroup[], partial }` and is
  smoke-verified (UX doc §5). County level uses
  `getInsCountyDashboard({ countyCode, datasetCodes })`. Hooks:
  `useInsUatDashboard`, `useInsCountyDashboard`.
- **Fact:** Headline metric codes come from `INS_TOP_METRICS_BY_LEVEL` (uat:
  POP107D, FOM104D, SOM101F, LOC101B; county: POP107D, FOM104D, SOM103A,
  LOC101B) in `src/lib/ins/ins-metric-registry.ts`. Derived indicators come from
  `INS_DERIVED_INDICATOR_BASE_CODES` + `computeDerivedIndicators`
  (`ins-stats-view.derived.ts`).
- **Fact:** The entity profile already renders this via `InsStatsView`
  (`SummaryMetricsSection`, `DerivedIndicatorsSection` from
  `ins-stats-view.presentation.tsx`) but keyed off `entity: EntityDetailsData`
  and `reportPeriod`. The level branch is `entity_type === 'admin_county_council'`.
- **Decision:** Reuse `SummaryMetricsSection`/`DerivedIndicatorsSection` and the
  dashboard hooks; key them off `InsEntitySelectorInput` instead of an entity
  (see design.md §5 refactor boundary, option a or b).
- **Decision:** Level is derived from the resolved territory, not the URL: a
  county SIRUTA → `{ territoryCode: <countyCode>, territoryLevel: 'NUTS3' }`; a
  LAU SIRUTA → `{ sirutaCode }`.
- **Assumption:** Identity fields (area, urban/rural environment) are read from
  POP107D + territory metadata where present; if absent, the identity row shows
  only name + level + population. Marked Assumption because the exact
  area/environment field path is not in the UX doc.
- **Assumption:** `$siruta` resolves to a territory name/level via the same data
  the entity/UAT surfaces already use; if no client territory resolver is
  available the implementer adds a thin `resolveTerritory(siruta)` adapter (see
  TerritoryPicker in design.md §5).

## Route and URL state

- **Route:** `/statistici/teritorii/$siruta` (file:
  `src/routes/statistici/teritorii.$siruta.tsx`, lazy split for the heavy body).
- **Path param:** `$siruta` — string SIRUTA code (LAU or county).
- **Search params** (zod `validateSearch`, all optional, default view renders
  with none):
  - `dataset` — matrix code for the time-series switcher (feature 6).
  - `period` — `latest` (default) or `YYYY` / `YYYY-Qn` / `YYYY-MM`.
  - `tab` — `prezentare` (default) | `serie` (time-series switcher focus).
  - `split` — temporal split `all|year|quarter|month` (passed to switcher).
- **Decision:** Invalid SIRUTA → route renders a not-found territory state (not a
  thrown error); invalid search params normalized by the zod parser, URL left
  intact otherwise (foundation rule).

## Data contract and mock states

UI boundary types are the existing `src/schemas/ins.ts`. The route composes:

```ts
// resolved identity (new thin shape; mock under mocks/territory.ts)
type TerritoryIdentity = {
  siruta: string
  name: string                 // name_ro
  level: 'LAU' | 'NUTS3' | 'NUTS2' | 'NUTS1' | 'NATIONAL'
  countyCode?: string          // for county dashboards
  population?: { value: string; unit: string; period: string; datasetCode: 'POP107D' }
  environment?: 'urban' | 'rural' | 'mixed' | null   // Assumption: from metadata
  areaKm2?: number | null      // Assumption
}
// dashboard data: InsDashboardData from getInsUatDashboard / getInsCountyDashboard
// indicator tile (derived in-component, mirrors ins-stats-view topMetricRowsByCode)
type IndicatorTile = {
  code: string; label: string
  value: string | null; unit: string | null; period: string
  status: 'available' | 'catalog-only' | 'no-data'
  source: 'selected' | 'fallback' | 'none'
  spark: { period: string; value: number | null }[]
}
```

Mock states to ship (`src/features/statistics/territory-hub/mocks`):
- **Happy LAU:** all 4 indicators `available` with sparkline + source.
- **County:** county metric set, `SOM103A` instead of `SOM101F`.
- **Partial:** dashboard `partial=true`; one indicator `no-data` (renders
  "Date indisponibile încă" tile, not a blank).
- **Catalog-only indicator:** a tile whose dataset is metadata-only → `Doar
  catalog` badge + `RequestDatasetAction`.
- **Missing identity:** population present, area/environment absent.

## UI structure

```
<header band>
  Breadcrumb: Statistici / Teritorii / {name}
  <TerritoryHeader> {name} · <LevelBadge> · SIRUTA {siruta} (muted)
  <CoverageRibbon source="INS Tempo" freshness={lastSync} limitNote=… />
  actions: [Compară] (→ /statistici/comparatii?territory=$siruta&dataset=…)
           [Vezi pe hartă] (→ /statistici/harti?...) · <ShareFilteredView>
</header>

<section "Prezentare generală">
  identity row: Populație {value} {unit} · Mediu urban/rural · Suprafață (if present)
  <SummaryMetricsSection> — 4–5 IndicatorTile cards:
     label (ro) · value · unit · sparkline · FreshnessBadge · source link → Drawer
     each card: "Vezi evoluția" → sets ?dataset=<code>&tab=serie (feature 6)
  <DerivedIndicatorsSection> (collapsible "Indicatori derivați", grouped)
</section>

<section "Evoluție în timp"> ← feature 6 (territory-time-series-switcher)
<aside/section "Legături"> ← feature 7 (cross-domain-territory-links, RelatedLinksRail)
```

- **Decision:** Identity row and indicator grid are full-width bands; tiles are
  the only cards. No card-in-card. Sparklines are small recharts line/area, no
  axes, no decoration.

## Component reuse and proposed new components

- **Reuse:** `SummaryMetricsSection`, `DerivedIndicatorsSection`,
  `MarkdownDescription` (`ins-stats-view.presentation.tsx`); hooks
  `useInsUatDashboard`/`useInsCountyDashboard`/`useInsObservationsSnapshotByDatasets`;
  registry constants; formatters (`formatPeriodLabel`, value/unit) from
  `ins-stats-view.formatters.ts`; `Badge`, `Button`, `Tooltip`, `Breadcrumb`,
  `Skeleton`, `EmptyState`, `Sheet`.
- **New (domain):** `TerritoryHeader`, `LevelBadge`, `CoverageRibbon`,
  `FreshnessBadge`, `SourceProvenanceDrawer`, `DataStatusBadge`,
  `getDatasetDataStatus` helper.
- **New (route):** `TerritoryHubPage` orchestrating the above; a
  `useTerritoryIdentity(siruta)` hook (composes resolver + POP107D snapshot).

## Interactions

- Indicator card → "Vezi evoluția" updates `?dataset&tab=serie`, scrolls to the
  switcher (reuse the smooth-scroll pattern in `ins-stats-view` `scrollToDetailCard`).
- Source link/icon on any tile → opens `SourceProvenanceDrawer`.
- "Compară" → `/statistici/comparatii?territory=$siruta&dataset=POP107D`.
- "Vezi pe hartă" → `/statistici/harti?indicator=POP107D&level=<county|uat>&highlight=$siruta`.
- `ShareFilteredView` copies current URL.
- Keyboard: tiles are buttons/links; full keyboard traversal; visible focus ring.

## Loading, empty, error, partial, stale states

- **Loading:** identity skeleton + 4–5 tile skeletons (`Skeleton`), DESIGN_PRINCIPLES
  dot loader only for full-page bootstrap.
- **Empty / not-found territory:** `EmptyState` "Teritoriu negăsit" + a
  `TerritoryPicker` to search again; link back to `/statistici`.
- **No data for an indicator:** tile shows "Date indisponibile încă" + the
  dataset name + (if catalog-only) `RequestDatasetAction`. Never blank.
- **Partial dashboard (`partial=true`):** ribbon note "Rezultate parțiale — unele
  serii pot lipsi."
- **Error:** inline error band with retry (reuse `ChartDataError` pattern); URL
  preserved.
- **Stale:** `FreshnessBadge` shows `last_sync_at`; if older than the dataset's
  expected refresh window, append "posibil neactualizat" (Assumption: window from
  periodicity).

## Accessibility and i18n

- Tiles: semantic buttons/links, `aria-label` combining label + value + period.
- Sparkline: `aria-hidden`; the numeric value + period is the accessible content;
  a visually-hidden text summary ("Populație 12.345, 2023") accompanies it.
- LevelBadge: text + color, never color alone.
- All copy via Lingui; Romanian labels: "Prezentare generală", "Indicatori
  derivați", "Evoluție în timp", "Compară", "Vezi pe hartă", "Vezi evoluția",
  "Date indisponibile încă", "Sursă: INS Tempo, matrice {code}, actualizat {date}".
- Numbers/dates locale-aware via existing formatters.

## Privacy, provenance, source citation

- Public aggregate data; no redaction. Every tile carries a source line and
  opens `SourceProvenanceDrawer` (matrix code, `last_sync_at`, periodicity,
  definition, INS Tempo URL via the existing builder). `CoverageRibbon` states
  the 27/1.898 limit. `value_status` annotated on the sparkline tooltip.

## Acceptance checklist

- [ ] Route renders for a LAU SIRUTA and a county SIRUTA with the correct metric
      set and level branch.
- [ ] 4–5 indicator tiles render value + unit + sparkline + source; "Vezi
      evoluția" wires `?dataset&tab=serie`.
- [ ] Catalog-only / no-data indicators render explicit states, never blanks.
- [ ] `CoverageRibbon`, `FreshnessBadge`, and per-tile `SourceProvenanceDrawer`
      present; Romanian names lead, matrix code only in provenance.
- [ ] "Compară" and "Vezi pe hartă" deep-link with context preserved.
- [ ] No INS data-fetch logic duplicated; reuses existing hooks/sections.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; a11y traversal verified.

## Non-goals

- The full dataset explorer/detail (features 3–4) — only headline + switcher here.
- Multi-territory comparison (feature 5).
- Editing/loading datasets; request flow is only surfaced via the badge action.

## Open questions (blockers only)

None. Identity field paths and the territory resolver have documented Assumption
defaults.
