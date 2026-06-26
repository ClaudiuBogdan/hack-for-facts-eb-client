# Statistics (Statistici) — UX Handoff

> Source UX document: `docs/ux-research/statistics.md`
> Shared foundation: `docs/design/README.md`
> Domain slug: `statistics`. Public route base: `/statistici`.

## Product intent

Turn the National Institute of Statistics (INS Tempo) catalog and the official
SIRUTA territorial hierarchy into a plain-Romanian, territory-anchored public
product. A citizen should answer "how many people live in my commune, what is
the average wage in my county, how does my place compare" without ever learning
a matrix code; an analyst should reach citable time series, comparisons, maps
and provenance. The platform already ships a deep INS engine embedded inside the
entity profile (`src/components/entities/views/ins-stats-view.*`); this domain
promotes that capability into dedicated, shareable `/statistici` surfaces and
makes the **27-loaded-vs-1,898-cataloged** coverage gap an honest, first-class
state everywhere.

## User roles and top jobs

- **Casual public user** (citizen, student, resident). Knows a place name, not
  SIRUTA/matrix codes. Top jobs: see my UAT/county headline numbers; find my
  place on a map; "is this trustworthy and recent?". Needs defaults, plain
  Romanian, visual answers.
- **Journalist / analyst / NGO / watchdog**. Top jobs: citable time series for a
  territory or topic; compare territories and periods; export; understand unit,
  periodicity, definition and coverage gaps; honest "data not available" over
  silent gaps.
- **Domain expert** (statistician, local-gov analyst, planner). Comfortable with
  matrix codes, dimensions, classifications. Top jobs: browse the full 1,898
  catalog, slice a dataset by its own dimensions, multi-period extraction,
  request loading of metadata-only datasets.

## MVP scope (in assigned order)

1. **Territory hub + UAT dashboard** (`/statistici/teritorii/$siruta`) — headline
   identity (population, area, urban/rural), the 4–5 priority indicators with
   latest value + unit + sparkline + source, "compare to county/national".
2. **Demographic / economic maps** (`/statistici/harti`) — county-level
   choropleth by indicator, drill toward UAT where coverage allows, click → side
   panel with the territory's trend and cross-domain links.
3. **Dataset explorer** (`/statistici/seturi`) — searchable/filterable catalog of
   all datasets, grouped by context, with the `date disponibile` vs `doar catalog`
   distinction as a primary column.
4. **Dataset detail** (`/statistici/seturi/$matrixCode`) — one dataset fully
   explained: definition, periodicity, year range, unit, dimensions, coverage
   flags, observations table with dimension selectors, time-series chart, CSV
   export, provenance.

## High-value next scope (in assigned order)

5. **Local comparisons** (`/statistici/comparatii`) — 1 dataset + 2–N territories
   + time range → side-by-side table + bar/line chart + export.
6. **Territory time-series switcher** — a section of the territory hub: switch
   the visible dataset for one territory and read its trend.
7. **Cross-domain territory links** — a `RelatedLinksRail` on every territory
   surface (budget, primărie, companies, institutions, map) keyed by SIRUTA/CUI.
8. **Request this dataset** — badge + lightweight form on catalog-only datasets,
   turning the coverage gap into a prioritization signal.

## Source / data constraints

- **Fact:** Catalog is broad, facts are narrow — 1,898 datasets have metadata;
  only **27 priority datasets** have loaded observations
  (`fact_load_status = 'full'`). ~1,871 are `metadata_only`/`PENDING`.
- **Fact:** A reusable client INS stack already exists and is the data spine for
  this domain: types `src/schemas/ins.ts`; API adapters `src/lib/api/ins.ts`
  (`getInsUatDashboard`, `getInsCountyDashboard`, `getInsContexts`,
  `getInsDatasetsCatalog`, `getInsDatasetDetails`, `searchInsDatasets`,
  `getInsDatasetDimensions`, `getInsDatasetHistory`,
  `getInsObservationsSnapshotByDatasets`, `getInsLatestDatasetValues`,
  `getInsDimensionValuesPage`, `getInsObservationsPage`, `getAllInsObservations`);
  hooks `src/lib/hooks/use-ins-dashboard.ts`; registry
  `src/lib/ins/ins-metric-registry.ts`; series logic `src/lib/ins/series-selection.ts`;
  UI sections `src/components/entities/views/ins-stats-view.presentation.tsx`.
- **Fact:** Priority matrix codes and the UAT-headline subset are encoded in the
  registry: `INS_TOP_METRICS_BY_LEVEL` (uat: POP107D, FOM104D, SOM101F, LOC101B;
  county: POP107D, FOM104D, SOM103A, LOC101B), `INS_PRIORITIZED_DATASET_CODES_BY_LEVEL`,
  `INS_DERIVED_INDICATOR_BASE_CODES`, `INS_ROOT_CONTEXTS`.
- **Fact:** `getInsUatDashboard` takes `sirutaCode` (LAU) and returns grouped
  observations + a `partial` flag; county-level uses `getInsCountyDashboard`
  with `countyCode` + explicit `datasetCodes`. The entity view selects level via
  `entity_type === 'admin_county_council'`.
- **Fact (gap):** There is **no client `compareInsUats` adapter** and **no
  territory search/resolver** (`getInsTerritories`/SIRUTA-by-name) in
  `src/lib/api/ins.ts`. Comparisons and territory pickers must either be composed
  from existing per-territory snapshot/latest-value adapters or add a thin new
  adapter under `src/features/statistics/api`.
- **Fact (gap):** The choropleth heat data hooks (`src/hooks/useHeatmapData.ts`)
  are **budget-derived**, not INS. Map geometry (`src/hooks/useGeoJson.ts`,
  `geoJsonQueryOptions('UAT'|'County')`) and the renderer
  (`src/components/maps/InteractiveMap.tsx`, `MapLegend`, `HeatmapDataTable`) are
  reusable, but an INS-by-territory fill adapter is new.
- **Assumption:** `date disponibile` vs `doar catalog` is derived from
  `InsDataset.sync_status` / presence in the fact-loaded catalog (the UX doc maps
  this to `v_matrices` vs `matrices` `PENDING`). The exact field name must be
  confirmed at the GraphQL boundary; mocks document both shapes.
- **Assumption:** Romanian is primary; English `name_en`/`definition_en` shown
  only when present. Names come from `metadata.names.ro`/`name_ro`, never
  hardcoded.
- **Uncertain (from source):** canonical territory source `core.territories`
  (3,228) vs `statistics.territories` (3,239); not a client blocker — the client
  resolves SIRUTA through existing entity/UAT data.

## Privacy / provenance constraints

- Every number must show **unit** (symbol + name), a one-line **definition**
  (`metadata.definitions.ro`), **periodicity** in words, **year range**, and a
  source line: `Sursă: INS Tempo, matrice {code}, actualizat {date}`.
- This is public aggregate statistics — **no individual-level exposure**, so no
  `PrivacyBoundaryNotice` is required, but provenance and freshness are
  mandatory at the point of use via `SourceProvenanceDrawer` + `FreshnessBadge`.
- Never silently interpolate missing periods or average across mixed
  periodicities; label gaps and `value_status` (estimated/revised) explicitly.
- Catalog-only datasets must read as a deliberate product state
  (`Doar catalog — date indisponibile încă`), never as an error or empty bug.
- `FOM112C` carries a known data-quality residue; if surfaced, attach a caveat.

## Design implications

- One shared `DataStatusBadge` with two Romanian states — **`Date disponibile`**
  (loaded) and **`Doar catalog`** (metadata-only) — used on every dataset
  reference (explorer rows, detail header, comparison/map pickers, indicator
  cards).
- A `CoverageRibbon` near every primary result stating source = INS Tempo,
  freshness, and the known coverage limit (e.g. "27 din 1.898 seturi au date
  încărcate").
- Lead with the Romanian dataset name; show the matrix code only as
  secondary/provenance text.
- Reuse the embedded `ins-stats-view` building blocks rather than rebuilding:
  the dashboard, explorer, detail and derived-indicator sections already exist;
  the domain work is to lift them onto territory-keyed standalone routes and add
  comparisons + INS-fed maps.
- Constrain UI by coverage flags (`has_uat_data`/`has_county_data`/`has_siruta`)
  so a UAT map is never forced on a county-only dataset.

## Blockers (only true blockers)

None. The coverage-field name, comparison adapter, territory resolver and INS map
fill are gaps with documented defensible defaults (compose existing adapters /
add a thin feature-local adapter), not blockers. Canonical territory source is a
backend question that does not block client rendering.
