# Domain: Administrative Units, SIRUTA & INS Statistics (Statistici)

## Review changelog (2026-06-26)

- **Recommendation:** Added design handoff notes that make the UAT dashboard and data-status-aware dataset explorer the first design targets.
- **Recommendation:** Standardized the 27-vs-1,871 coverage risk with the shared DataStatusBadge, CoverageRibbon, and request-this-dataset loop.
- **Assumption:** Romanian is the primary UI language for v1, with English source fields shown only when complete enough for the specific dataset.

> UX/product research for the **statistics** domain (slug: `statistics`).
> Scope: administrative geography (SIRUTA territories) and statistical time series
> (INS Tempo contexts, datasets, dimensions, classifications, observations, units,
> time periods) plus the `ins_compat` compatibility facade.
>
> Source of truth: the scraper project at
> `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-scrapper`
> (data inventory, INS notes, schema migration, source code). No live database was
> contacted; counts below come from the inventory, notes, and code only.
>
> Labeling: **Fact:** = grounded in inventory/notes/code. **Assumption:** = a
> reasoned product hypothesis not directly proven by the data. **Recommendation:**
> = a UX/product proposal.

---

## 1. Domain Summary

The statistics domain combines two tightly coupled public-data layers:

1. **Administrative geography (SIRUTA / NUTS / LAU):** the official Romanian
   territorial hierarchy used as a join key across the whole platform — national,
   NUTS1 regions, NUTS2 development regions, NUTS3 counties (județe), and LAU
   administrative-territorial units (UATs, the local-government level).
2. **INS Tempo statistical time series:** the National Institute of Statistics'
   structured statistical catalog and observations — contexts, datasets
   (matrices), dimensions, classifications, units of measure, time periods, and
   the numeric observations themselves.

**Fact:** The serving model lives in `transparenta_prod` schemas `statistics.*`
(the deliberate product contract) and `ins_compat` (a temporary raw-shaped
facade for the current server INS module). Raw custody lives in the
`transparenta_eu_ins` database (raw v2 with request/response metadata,
snapshots, parse runs). Source:
`prod-db/INS_NOTES.md`, `prod-db/DATA_INVENTORY.md`.

**Fact:** The serving projection is broad on metadata but narrow on facts:
1,898 datasets have full catalog metadata (names, definitions, dimensions,
options), but only **27 "priority" datasets** have loaded observations
(`fact_load_status = 'full'`). The remaining ~1,871 datasets are
`metadata_only` / `PENDING`. Source: `INS_NOTES.md`, migration
`20260618T070000__statistics_domain.ts`.

**Fact:** Backend status is transitional. The INS server module EXISTS and has
GraphQL use cases (contexts, datasets, observations, latest values, UAT
dashboard, comparisons) but is **NOT wired into the default redesign module
list**. Client usage is transitional: entity URL state and map/analytics
features use INS/SIRUTA params; advanced-map and entity analytics depend on
SIRUTA. No dedicated INS MCP/search surface is verified. Source:
`DATA_INVENTORY.md` (Surface Availability table).

The product opportunity is to move from a raw-shaped compatibility read to a
deliberate **statistics product contract**, and to decide the first user-facing
experience (UAT dashboard, local comparisons, demographic/economic maps, or a
generic dataset explorer).

---

## 2. Public Value

- **Democratize official statistics.** INS Tempo is powerful but expert-facing
  and hard to navigate. Turning 1,898 cataloged datasets into browsable,
  plain-language, territory-anchored experiences lets ordinary citizens find
  "how many people live in my commune" or "what is the average wage in my
  county" without understanding INS matrix codes.
- **Anchor the territory hub.** SIRUTA is the spine that connects budgets,
  primării, companies, public institutions, and maps to a place. A clear
  territory experience is a cross-domain enabler for the whole platform.
- **Enable local comparison.** "How does my UAT compare to neighbors/county/
  national on population, wages, employment, tourism?" is a high-value
  question that no single Romanian public source answers easily today.
- **Feed maps and analytics.** Demographic/economic choropleth maps (county /
  UAT level) turn 23.6M observations into instantly readable geography.
- **Trust through traceability.** **Fact:** serving rows carry
  `source_snapshot_id`, `source_response_id`, `source_parse_run_id`, source
  timestamps, and `lineage_status`, with raw API responses retained as the
  rebuild source. This supports provenance display ("Source: INS Tempo,
  matrix POP107D, last synced …") that builds trust.

---

## 3. Target Users

### Casual public users
Citizens, students, curious residents. They know their locality/county name,
not SIRUTA codes or INS matrix codes. They want a quick, understandable number
or map and a trustworthy source label. Low tolerance for jargon; high need for
plain Romanian, defaults, and visual answers.

### Journalists, analysts, NGOs, researchers, watchdogs
Need reliable, citable time series for a territory or topic; ability to
compare territories and periods; export data; understand definitions and
coverage gaps. They value metadata (unit, periodicity, source date, dataset
definition) and honest "data not available" states over silently missing
values.

### Domain experts (statisticians, local-government analysts, urban planners)
Comfortable with INS matrix codes, dimension axes, classifications, and
periodicity. Need the full dataset explorer: dimension selection, classification
drill-down, multi-period extraction, and access to the broad 1,898-dataset
catalog (including metadata-only datasets they may request to be loaded).

---

## 4. Key User Questions

### Questions the product should answer immediately
- How many people live in my locality / UAT / county? (population, POP107D)
- What is the average wage / employment / unemployment in my area? (FOM104D,
  SOM101F, SOM103A)
- What does my UAT "dashboard" look like — the headline demographic, labor,
  and local indicators on one screen?
- Where is my area on the map, and how does it compare to neighbors / county /
  national?
- What is the source, unit, and last-update date for this number?

### Questions requiring deeper analysis
- How has my area changed over time (annual / quarterly / monthly trend)?
- How do several UATs/counties compare across multiple datasets at once?
- For a specific INS dataset (e.g., tourism nights TUR101C, health SAN101B,
  schools SCL101C), what are the observations for a chosen territory, time
  period, and classification breakdown?
- Which of the 1,898 cataloged datasets exist for my topic, and which are
  actually loaded with data vs. metadata-only/PENDING?
- What classifications (e.g., activity, sex, age group, environment
  urban/rural) are available to slice a dataset?

---

## 5. Available Data

**Fact:** The following serving tables exist in `statistics.*` and are
populated (counts from `INS_NOTES.md` live metadata + priority load,
2026-06-18; territory count cross-checked in `DATA_INVENTORY.md` 2026-06-25):

| Entity (serving table)                          | Count        | Notes |
|-------------------------------------------------|-------------:|-------|
| `statistics.contexts`                           | 340          | INS catalog contexts (hierarchical, `ltree` path, `children_type` context/matrix) |
| `statistics.territories`                        | 3,239 (raw) / 3,228 (`core.territories`) | Levels: NATIONAL, NUTS1, NUTS2, NUTS3, LAU; SIRUTA code + `siruta_metadata` |
| `statistics.time_periods`                       | 619          | ANNUAL / QUARTERLY / MONTHLY; year, quarter, month, period_start/end |
| `statistics.classification_types`               | 1,891        | Hierarchical flag + `label_patterns` |
| `statistics.classification_values`              | 25,573       | Hierarchical (`ltree` path, parent_id, level), `content_hash` |
| `statistics.units`                              | 106          | Units of measure with code, symbol, multilingual names |
| `statistics.datasets`                           | 1,898        | INS matrix code, context, `metadata` JSONB (names, definitions, yearRange, flags, periodicity), `fact_load_status` |
| `statistics.dataset_dimensions`                 | 7,203        | Per-dataset dimensions: TEMPORAL / TERRITORIAL / CLASSIFICATION / UNIT_OF_MEASURE; `option_count` |
| `statistics.dataset_dimension_options`          | 326,792      | Resolved option rows linking to territory / time_period / classification_value / unit |
| `statistics.observations` (priority 27 only)    | 23,554,665   | value (numeric), value_status, natural_key_hash, time_period_id, territory_id, unit_id |
| `statistics.observation_classifications`        | 43,766,947   | Links observations → classification_values (many-to-many) |

**Fact:** The 27 priority datasets with loaded facts (matrix codes from
`load-prod.ts` `INS_PRIORITY_MATRIX_CODES`), grouped by apparent theme from
code prefixes:

- **Population (POP):** POP107D, POP108D, POP201D, POP206D, POP309E, POP310E,
  POP206C, POP217A
- **Labor / workforce (FOM):** FOM104D
- **Wages / earnings (SOM):** SOM101F, SOM103A, SOM101E, SOM103B
- **Local / territorial (LOC):** LOC101B, LOC103B
- **Government / public sector (GOS):** GOS107A, GOS110A, GOS116A, GOS118A,
  GOS104A, GOS105A
- **Education (SCL):** SCL101C, SCL103D
- **Health (SAN):** SAN101B, SAN104B
- **Tourism (TUR):** TUR101C, TUR104E

**Fact:** The "top five" UAT-dashboard subset is POP107D, FOM104D, SOM101F,
SOM103A, LOC101B (`INS_TOP_UAT_MATRIX_CODES`).

**Fact:** SIRUTA source profile (`siruta.ts` `SIRUTA_2025_PROFILE`): 16,978
raw rows across 3 levels — 42 (counties/NUTS3), 3,181 (UATs/LAU level 2),
13,755 (localities level 3). The serving `statistics.territories` collapses
these to 3,239 territory nodes with SIRUTA codes and parent hierarchies.
SIRUTA cross-check verified (179132 = București, 54975 = Cluj-Napoca). Source:
`INS_NOTES.md` verification status, `siruta.ts`.

**Fact:** Compatibility facade `ins_compat` exposes raw-shaped views
(`contexts`, `matrices`, `matrix_dimensions`, `matrix_nom_items`,
`statistics`, `statistic_classifications`, `territories`, `time_periods`,
`classification_types`, `classification_values`, `units_of_measure`,
`v_matrices`, `v_contexts`, `v_territories`, `v_classification_types`,
`v_time_periods`, `v_units`) so the existing server module can read the new
product schema without rewrite. `v_matrices` only exposes datasets with loaded
facts (`fact_load_status in ('partial','full')`); `matrices` exposes all 1,898
(metadata-only rows appear as `PENDING`). Source: migration
`20260618T070000__statistics_domain.ts`.

**Fact:** Server use cases verified working against the product contract
(`ins-golden-smoke.ts`): `listInsContexts`, `listInsDatasets`,
`getInsDataset`, `listInsObservations`, `listInsLatestDatasetValues`,
`getInsUatDashboard`, `compareInsUats`. Live smoke returned e.g. POP107D with
6 dimensions, SIRUTA 10006 → 3,120 observations, UAT dashboard 16 groups /
1,664 observations. Source: `INS_NOTES.md`.

**Fact:** Rolling temporal refresh planning is deterministic: annual current +
previous 3 years, quarterly current + previous 8 quarters, monthly current +
previous 24 months (`INS_ROLLING_WINDOW_COUNTS`). Source: `constants.ts`.

**Fact:** Dataset `metadata` JSONB exposes user-facing fields via
`v_matrices`: `names.ro/en`, `definitions.ro/en`, `yearRange[0/1]`
(start/end year), `flags.hasUatData`, `flags.hasCountyData`, `flags.hasSiruta`,
and `periodicity`. Source: migration view definition.

---

## 6. Missing or Uncertain Data

- **Fact:** ~1,871 of 1,898 datasets are metadata-only (`fact_load_status =
  metadata_only` / `PENDING`). They have catalog metadata and dimensions but
  **no loaded observations**. The scraper can collect their facts (the worker
  + raw v2 pipeline exists and the rolling-refresh planner is deterministic),
  but they have not been loaded into the serving projection yet. UX must treat
  these as "catalog entry exists, data not yet available."
- **Fact:** One known data-quality residue: matrix `FOM112C` had a failed
  checkpoint due to conflicting time periods in source labels; 61 unresolved
  `label_mappings`. Classified as non-structural, but it is a concrete
  dataset whose facts may be incomplete. Source: `INS_NOTES.md` Quality Gate.
- **Assumption:** Dataset code prefixes (POP/FOM/SOM/LOC/GOS/SCL/SAN/TUR) are
  meaningful thematic groupings, but the exact Romanian-language dataset
  names live in `metadata.names.ro` and were not individually enumerated in
  the source notes. The product must read names from the dataset metadata,
  not hardcode them.
- **Uncertain:** Whether `statistics.territories` (3,239) and
  `core.territories` (3,228) are kept in sync, and which one is canonical for
  client territory rendering. The inventory lists both. UX should target
  `core.territories` as the cross-domain hub and use `statistics.territories`
  for INS-specific SIRUTA joins.
- **Uncertain:** No dedicated INS MCP tool or search projection is verified
  for the redesign module set. Dataset/territory discovery via search or
  agent tools is not currently available.
- **Uncertain:** Multilingual coverage. Names/definitions carry `ro`/`en`
  JSONB keys, but completeness of English translations across all 1,898
  datasets is not guaranteed.
- **Missing:** No server-side aggregation/materialized views exposed beyond
  raw `v_matrices`/`v_contexts`. The Phoenix raw DB had materialized views
  (`mv_annual_nuts2_totals`, `mv_national_timeseries`, `mv_matrix_stats`) but
  these are raw-side and not confirmed in the product contract. Precomputed
  national/county rollups for maps may need to be derived.

---

## 7. Core Entities and Relationships

**Fact:** Entity model derived from the `statistics.*` schema:

```
contexts (340) ──< datasets (1,898) ──< dataset_dimensions (7,203)
                       │                       │
                       │                       └──< dataset_dimension_options (326,792)
                       │                              ↘ links to territories / time_periods /
                       │                                  classification_values / units
                       │
                       └──< observations (23.6M, priority 27 only)
                                │   (dataset_id, observation_id) PK
                                │   territory_id? time_period_id  unit_id?
                                │   value (numeric), value_status, natural_key_hash
                                │
                                └──< observation_classifications (43.8M)
                                        ↘ classification_value_id

territories (3,239)  self-referential parent_id, ltree path
                     level: NATIONAL/NUTS1/NUTS2/NUTS3/LAU, siruta_code, siruta_metadata

time_periods (619)   ANNUAL/QUARTERLY/MONTHLY, year/quarter/month, period_start/end
classification_types (1,891) ──< classification_values (25,573, hierarchical ltree)
units (106)          code, symbol, multilingual names
```

Key relationships and UX implications:

- **Dataset ↔ Context:** datasets belong to a context; contexts are
  hierarchical (`ltree path`, `children_type` = context or matrix). This is
  the natural **catalog browse tree** (context → sub-context → datasets).
- **Dataset ↔ Dimensions:** each dataset declares its dimension axes (up to
  6 observed, e.g. POP107D). Dimension types are TEMPORAL, TERRITORIAL,
  CLASSIFICATION, UNIT_OF_MEASURE. This drives the **dataset explorer's
  filter/facet UI** — each dimension becomes a selectable axis.
- **Observation ↔ Territory + Time + Classifications:** an observation is a
  single numeric value located in space (territory), time (time_period), and
  sliced by zero or more classification values. This is the unit of a time
  series and a map cell.
- **Territory self-hierarchy:** NATIONAL → NUTS1 → NUTS2 → NUTS3 (county) →
  LAU (UAT). This drives **territory pickers, breadcrumb navigation, and map
  drill-down**. SIRUTA code is the stable join key to budget/primarie/
  companies/institutions.
- **Classification hierarchy:** classification_values have `parent_id` /
  `ltree path` / `level`, enabling drill-down (e.g., activity section →
  division → group).
- **Lineage:** datasets/observations/observation_classifications carry
  `source_snapshot_id`, `source_response_id`, `source_parse_run_id`,
  source timestamps — enabling **per-number provenance display**.

---

## 8. Recommended User Journeys

### Journey A — Casual public user ("How big is my commune?")
1. **Overview:** Land on the territory/landing page; search or pick "my
   locality/UAT" by name.
2. **Detail:** Territory hub page shows headline stats (population, area,
   environment urban/rural) sourced from POP107D and SIRUTA metadata, with a
   plain-language source label.
3. **Insight:** A mini UAT dashboard card surfaces 5 priority indicators
   (population, average wage, employment, local indicators) with the latest
   value and a tiny sparkline; a "compare to county/national" chip leads to
   the comparison view.

### Journey B — Journalist/analyst ("Compare my county to neighbors")
1. **Overview:** Open local-comparisons; pick a primary territory (county) and
   a dataset (e.g., average wage SOM101F).
2. **Detail:** Side-by-side table + bar chart of the chosen county vs.
   selected peers (neighbor counties / national), latest year, with unit and
   source.
3. **Insight:** Add a second dataset (e.g., unemployment) to spot
   correlations; export the table; follow a cross-domain link to that
   county's budget execution or primairie page.

### Journey C — Researcher/domain expert ("Explore a specific INS dataset")
1. **Overview:** Open the dataset explorer; browse the context tree or search
   "tourism nights" → TUR101C.
2. **Detail:** Dataset page shows definition, periodicity, year range, unit,
  dimensions, and coverage flags (hasUatData / hasCountyData / hasSiruta);
  select dimensions (territory = a county, time = 2019–2024, classification
  = accommodation type).
3. **Insight:** Result table + time-series chart of observations; switch the
  territorial axis to map view (choropleth by UAT/county); download CSV;
  inspect provenance (matrix code, source response, last sync).

### Journey D — Map/analytics user ("Demographic/economic map")
1. **Overview:** Open demographic/economic maps; choose an indicator
  (population density, average wage) and level (county or UAT).
2. **Detail:** Choropleth map colored by latest value; click a region to
  drill from NUTS2 → NUTS3 → LAU.
3. **Insight:** Side panel shows the clicked territory's time trend and
  cross-domain links (budget, primarie, companies registered there).

---

## 9. Recommended Information Architecture

- **Landing page (Statistici):** explain what INS statistics are, surface the
  27 available "ready" datasets as themed cards (Population, Labor & Wages,
  Local indicators, Public sector, Education, Health, Tourism), and a
  prominent territory search ("Enter your locality/county").
- **Search / listing (Dataset explorer):** browse by context tree, search by
  dataset name/code, filter by theme/periodicity/coverage/has-data. Clearly
  distinguish "Data available" (27) from "Catalog only" (~1,871).
- **Entity detail — Territory:** the hub page for a SIRUTA territory
  (locality/UAT/county/region/national) with headline statistics, UAT
  dashboard, time series, and cross-domain links (budget, primarie,
  companies, public institutions, maps).
- **Entity detail — Dataset:** the page for one INS dataset with definition,
  dimensions, classifications, coverage, observations table, and time-series
  / map views.
- **Comparison (Local comparisons):** pick 1 dataset + 2–N territories +
  time range; side-by-side table, bar/line chart, export.
- **Dashboards / analytics:**
  - **UAT dashboard:** the 5-indicator local headline view (per territory).
  - **Demographic/economic maps:** choropleth analytics by territory level.
- **Cross-domain related links:** from every territory page, link to budget
  execution (`/budget-explorer`, `/primarie/$cui/buget/*`), primarie
  transparency (`/primarie/$cui`), companies registered in the territory,
  public institutions, and the map (`/map`, advanced-map analytics).
- **Assumption:** A top-level `/statistici` route is the natural home; the
  territory hub can live at `/statistici/teritoriu/$siruta` (or reuse the
  existing `/entities/$cui` territory surface) and datasets at
  `/statistici/seturi/$matrixCode`.

---

## 10. Recommended Pages

1. **Statistici landing (`/statistici`)** — intro, themed dataset cards (the
   27 ready datasets grouped by POP/FOM/SOM/LOC/GOS/SCL/SAN/TUR), territory
   search box, links to maps and comparisons. Primary content: curated entry
   points, not the full 1,898 list.
2. **Dataset explorer (`/statistici/seturi`)** — searchable/filterable list of
   all 1,898 datasets with columns: name (ro), context, periodicity, year
   range, coverage flags, **data status (available / catalog only)**, unit.
   Primary content: the catalog as a first-class browse surface.
3. **Dataset detail (`/statistici/seturi/$matrixCode`)** — definition (ro/en),
   periodicity, year range, unit, dimension axes with option counts,
   classifications, coverage flags, observations table with dimension
   selectors, time-series chart, map toggle, CSV download, provenance
   (matrix code, source last sync). Primary content: one dataset fully
   explained and explorable.
4. **Territory time series (`/statistici/teritoriu/$siruta` or territory hub
   section)** — headline population/area, the 5-indicator UAT dashboard, a
   per-dataset time-series switcher for that territory. Primary content:
   "this place over time."
5. **Local comparisons (`/statistici/comparatii`)** — choose dataset + 2–N
   territories + time range; side-by-side table, bar chart, line chart,
   export. Primary content: relative performance across places.
6. **UAT dashboard (`/statistici/uat/$siruta`)** — single-screen local
   headline: population (POP107D), average wage (SOM101F/SOM103A), employment
   (FOM104D), local indicators (LOC101B), each with latest value, unit,
   sparkline, source, and "see trend." Primary content: the fastest answer to
   "how is my UAT doing?"
7. **Demographic / economic maps (`/statistici/harta` or integrate into
   `/map` + advanced-map-analytics)** — choropleth by indicator and territory
   level (county/UAT), drill-down, click-to-detail. Primary content:
   geography of an indicator.

**Assumption:** Pages 1, 4/6 (territory hub + UAT dashboard), and 7 (maps) are
the highest public-value starting points; pages 2 and 3 (dataset explorer +
detail) serve experts and underpin the others.

---

## 11. Recommended Filters and Search

**Searchable:**
- Datasets by Romanian name, English name, INS matrix code, and context path.
- Territories by Romanian name, SIRUTA code, county, and NUTS code
  (leveraging `v_territories.name_normalized` with unaccent).
- Classifications by code and name (within a dataset's classification
  dimension).

**Filterable:**
- **Dataset** (the primary object in the explorer).
- **Theme/context** (context tree; themed groupings).
- **Territory** (level: national / NUTS2 / county / UAT; specific territory
  or "all counties in region X").
- **Time period** (year for annual; year+quarter for quarterly; year+month
  for monthly; plus a "latest available" shortcut).
- **Classification value** (drill the hierarchical classification tree).
- **Coverage flags** (hasUatData, hasCountyData, hasSiruta) — lets users find
  datasets that have data at the level they care about.
- **Data status** (available vs. catalog only) — essential to avoid
  frustration with the ~1,871 metadata-only datasets.

**Plain-language explanations (must-haves):**
- Every number shows its **unit** (symbol + name) and a one-line definition
  pulled from `metadata.definitions.ro`.
- Every dataset shows **periodicity** in words ("annual", "quarterly",
  "monthly") and **year range**.
- "Catalog only / data not yet available" badge with a short explanation and,
  ideally, a "request this dataset" action.

**Reserved as advanced functionality (not MVP):**
- Free-form multi-dataset pivot/crosstab builder.
- Custom classification cross-tabulation across multiple dimensions.
- Saved queries and composite indicators (the raw schema has empty
  `saved_queries` / `composite_indicators` tables, signaling future intent).

---

## 12. Recommended Visualizations

- **Choropleth maps** (county and UAT level) for any dataset with
  territorial coverage — the flagship visualization for demographic/economic
  indicators. Drill from national → NUTS2 → NUTS3 → LAU.
- **Time-series line charts** for a territory + dataset across periods; show
  data gaps explicitly (do not interpolate missing periods).
- **Small multiples / sparklines** on the UAT dashboard for the 5 headline
  indicators.
- **Side-by-side bar charts** for local comparisons (territory vs. peers vs.
  national).
- **Heatmaps** (territory × time) for dense periodic data (monthly/quarterly).
- **Hierarchy/tree views** for the context catalog and for hierarchical
  classifications (drill-down).
- **Data-status indicators** everywhere: a clear badge distinguishing loaded
  facts from catalog-only entries; "last synced" timestamp from
  `source_last_sync_at`.

**Plain-language and trust overlays:** every chart must show source
("Sursa: INS Tempo, matrice {code}, actualizat {date}"), unit, and a
definition tooltip. Map legends must use human-readable bins, not raw numeric
ranges. **Recommendation:** show value_status (e.g., estimated/revised) as a
visual annotation when present.

---

## 13. MVP Features

1. **Territory hub + UAT dashboard**
   - User problem: "I want to quickly see how my locality/UAT is doing."
   - Expected user value: a single trustworthy screen with 5 headline
     indicators, units, sources, and sparklines.
   - Required data: `core.territories` / `statistics.territories`; the 5
     `INS_TOP_UAT_MATRIX_CODES` datasets (POP107D, FOM104D, SOM101F, SOM103A,
     LOC101B) via `getInsUatDashboard`; `metadata` for definitions/units.
   - Recommended UX pattern: a territory search → hub page with a 5-card
     dashboard, each card = latest value + unit + sparkline + "source" link.
   - Priority rationale: highest public value per unit of effort; the server
     use case already exists and is smoke-verified; answers the most common
     casual question immediately.

2. **Demographic / economic choropleth maps (county level)**
   - User problem: "Where is indicator X high/low across the country?"
   - Expected user value: instant geographic understanding of population,
     wages, employment, tourism, etc.
   - Required data: observations for priority datasets with `hasCountyData`;
     `statistics.territories` at NUTS3 level; territory geometry (from the
     existing advanced-map stack).
   - Recommended UX pattern: indicator + level selector → choropleth with
     drill-down and click-to-territory-detail; reuse the existing
     advanced-map-analytics infrastructure.
   - Priority rationale: maps are the most shareable, intuitive surface and
     reuse existing client map features that already depend on SIRUTA.

3. **Dataset explorer (catalog browse, data-status aware)**
   - User problem: "Which INS datasets exist, and which actually have data?"
   - Expected user value: honest browsing of all 1,898 datasets with a clear
     "available / catalog only" distinction.
   - Required data: `statistics.datasets` + `v_matrices` (for fact-loaded
     list) + `contexts` tree + coverage flags.
   - Recommended UX pattern: searchable/filterable list grouped by context,
     with data-status badges and links to dataset detail.
   - Priority rationale: necessary to manage the 27-vs-1,871 expectation gap
     and to give experts a real entry point.

4. **Dataset detail (observations + time series for one dataset)**
   - User problem: "Show me the actual numbers for dataset X, filtered how I
     want."
   - Expected user value: a filterable observations table + time-series chart
     with definitions, units, and provenance.
   - Required data: `getInsDataset` + `listInsObservations` + dimensions +
     classifications + time_periods + units.
   - Recommended UX pattern: dimension selectors → observations table →
     time-series chart → CSV download → provenance footer.
   - Priority rationale: the core "explorer" that makes the 27 loaded
     datasets genuinely usable; foundation for comparisons and maps.

### High-value next features

- **Local comparisons (multi-territory)** — user problem: "how does my area
  compare to peers"; value: side-by-side ranking + charts; data:
  `compareInsUats` + observations; UX: pick dataset + 2–N territories + time
  range → table + bar/line chart + export; rationale: high analyst/journalist
  value, builds directly on dataset detail.
- **Territory time-series switcher** — user problem: "how did this place
  change over time"; value: multi-dataset trend on one territory; data:
  observations across priority datasets for one SIRUTA; UX: territory page
  tab with dataset switcher + line chart; rationale: deepens the territory hub
  into an analytical surface.
- **Cross-domain territory links** — user problem: "what else do you know
  about my area"; value: jump to budget/primarie/companies/institutions for
  the same SIRUTA; data: `core.territories` as the join hub; UX: related-links
  rail on every territory page; rationale: realizes the cross-domain value of
  the SIRUTA spine with minimal new data.
- **"Request this dataset" for catalog-only entries** — user problem: "I need
  data that is listed but not loaded"; value: a feedback channel that also
  informs which of the ~1,871 datasets to load next; data: the metadata-only
  dataset list; UX: badge + lightweight request form; rationale: turns the
  coverage gap into a product signal and prioritization input.

---

## 14. Advanced Features

1. **Full-catalog dataset explorer (all 1,898, with on-demand loading)**
   - User problem: experts need datasets beyond the 27 priority ones.
   - Expected user value: browse and, eventually, query any of the 1,898
     datasets.
   - Required data: all `statistics.datasets` metadata; on-demand fact
     loading via the existing `ins:load-prod --matrix-codes` path.
   - Recommended UX pattern: catalog page with "request to load" / "notify
     when available" actions; status pipeline visible.
   - Priority rationale: depends on a loading/refresh operational process
     before it can be a first-class UX.

2. **Multi-dataset comparison / correlation explorer**
   - User problem: "are wage and employment trends correlated across
     counties?"
   - Expected user value: overlay multiple datasets for the same territories.
   - Required data: observations for several priority datasets + territories.
   - Recommended UX pattern: dual-axis or small-multiples comparison with
     correlation hints.
   - Priority rationale: advanced analytical value; needs solid MVP first.

3. **Custom dataset / map series builder (integrate with advanced-map)**
   - User problem: "I want to build and share my own demographic map."
   - Expected user value: user-defined map series from INS data, shareable.
   - Required data: priority observations + territory geometry + the existing
     advanced-map-datasets feature.
   - Recommended UX pattern: extend the existing dataset editor with an INS
     series source.
   - Priority rationale: leverages existing client infrastructure
     (`features/advanced-map-datasets`, `advanced-map-analytics`).

4. **INS MCP tools (dataset discovery, territory time series, cross-domain
   normalization)**
   - User problem: agents/automations need to query statistics.
   - Expected user value: programmatic discovery and retrieval of INS series.
   - Required data: the product contract + read-only `ins_compat_reader`
     role (already live).
   - Recommended UX pattern: MCP tools mirroring the verified server use
     cases (`listInsDatasets`, `getInsDataset`, `listInsObservations`,
     `getInsUatDashboard`, `compareInsUats`) plus a territory resolver.
   - Priority rationale: brings statistics into the platform's AI/agent
     surface; the data and role already exist, only the tool surface is
     missing.

5. **Saved queries / composite indicators**
   - User problem: "I keep rebuilding the same view."
   - Expected user value: persist and share custom queries/indicators.
   - Required data: empty raw-side `saved_queries` / `composite_indicators`
     tables signal intended support; needs serving-side tables.
   - Recommended UX pattern: save/share buttons on explorer and comparison
     pages.
   - Priority rationale: only after the core explorer is stable and
     adopted.

---

## 15. UX Risks and Edge Cases

- **The 27-vs-1,871 coverage gap (biggest UX risk).** Users will see a rich
  1,898-dataset catalog but find data in only 27. Without an explicit,
  honest "data not yet available" state, this reads as broken. **Fact:** the
  scraper contract already separates `v_matrices` (fact-loaded) from
  `matrices` (all, with `PENDING`). UX must surface this distinction
  everywhere.
- **Dimension sprawl / dataset heterogeneity.** Datasets have between ~3 and
  6+ dimensions of different types; some are hierarchical classifications
  with thousands of values. A naive "one filter UI for all datasets" will
  overwhelm users. Each dataset's explorer must render only its own
  dimensions, with sensible defaults.
- **Periodicity mismatch.** Mixing annual, quarterly, and monthly datasets in
  comparisons or maps can mislead. The UI must normalize or clearly label
  periodicity and never silently average across frequencies.
- **Territory level mismatch.** Not all datasets have UAT (LAU) data; some
  only have county or national. Forcing a UAT map on a county-only dataset
  yields empty cells. Use the `hasUatData`/`hasCountyData`/`hasSiruta` flags
  to constrain the UI.
- **`statistics.territories` (3,239) vs `core.territories` (3,228).** Two
  territory sources with slightly different counts can cause inconsistent
  SIRUTA resolution across domains. Pin one canonical source for client
  rendering.
- **Missing periods / `value_status`.** Time series have gaps; observations
  can be estimated/revised. Charts must show gaps honestly and label status.
- **Known data-quality residue.** Matrix `FOM112C` has a known failed
  checkpoint and 61 unresolved label mappings. If surfaced, it must carry a
  data-quality warning.
- **Jargon / matrix codes.** Exposing "POP107D" to casual users is
  off-putting. Lead with the Romanian name; show the code only as a
  secondary/provenance detail.
- **Performance.** 23.6M observations and 43.8M classification links; naive
  queries can be slow (the notes mention a 30s server timeout risk that
  motivated `v_matrices` filtering). UX must rely on pre-scoped queries
  (dataset + territory + time) and avoid "load everything" patterns.
- **English completeness.** Bilingual names/definitions may be incomplete;
  the product should gracefully fall back to Romanian with a note rather than
  show empty fields.

---

## 16. Open Questions

1. **Canonical territory source:** should client territory rendering and INS
   joins use `core.territories` (3,228) or `statistics.territories` (3,239),
   and how is the 11-row difference explained/resolved?
2. **First UX surface:** is the UAT dashboard, local comparisons,
   demographic/economic maps, or the generic dataset explorer the best
   starting point — given the INS module is not yet in the default redesign
   wiring?
3. **Catalog-only dataset strategy:** hide the ~1,871 metadata-only datasets,
   show them as "catalog only," or expose a "request to load" flow? Which
   next datasets should be loaded after the priority 27?
4. **Redesign wiring:** when will the INS server module be added to the
   default redesign module list, and does the UX depend on the
   `ins_compat` facade or a direct `statistics.*` GraphQL contract?
5. **Map geometry + rollups:** are county/UAT geometries and precomputed
   national/county rollups available in the product contract, or must maps
   derive aggregations on the fly from 23.6M observations?
6. **Search/MCP:** should INS datasets and territories be indexed into the
   platform search and exposed as MCP tools in this slice, or deferred?
7. **Multilingual scope:** is English coverage of dataset names/definitions
   complete enough to ship a bilingual UI, or should Romanian be primary?

---

## 17. Final Recommendation

- **Best starting point:** the **territory hub + UAT dashboard** for the five
  top datasets (POP107D, FOM104D, SOM101F, SOM103A, LOC101B), paired with
  **county-level demographic/economic choropleth maps**. These reuse verified
  server use cases (`getInsUatDashboard`, `compareInsUats`,
  `listInsObservations`) and existing client map/SIRUTA infrastructure, and
  answer the most common public questions immediately.
- **Highest-value user journey:** Journey A (casual user: territory search →
  UAT dashboard → compare to county/national) — it converts the richest data
  (population + labor + wages at LAU level) into the most understandable
  single screen.
- **Most important MVP feature:** the **UAT dashboard** — it is the smallest
  credible "useful statistics product" and directly exposes the
  already-verified `getInsUatDashboard` use case; everything else
  (comparisons, maps, explorer) builds on it.
- **Biggest UX risk:** the **27-vs-1,871 coverage gap** — without an honest,
  pervasive "data available / catalog only" distinction, the catalog feels
  broken. Mitigate with status badges, a "request this dataset" flow, and
  default surfaces that only show fact-loaded datasets.
- **Biggest data dependency:** only 27 of 1,898 datasets have loaded
  observations; the product's perceived breadth depends on an operational
  commitment to load more datasets via `ins:load-prod`, prioritized by the
  request flow and thematic value.
- **Top open questions:** (1) canonical territory source (`core` vs
  `statistics`); (2) when INS joins the default redesign module list and on
  which contract (`ins_compat` vs direct `statistics.*`); (3) catalog-only
  dataset strategy and the next-batch loading priority.

## Design Handoff Notes (added in review)

- **Canonical route assumption:** dedicated `/statistici` area, with `/statistici/uat/$siruta` or `/statistici/teritoriu/$siruta` for territory dashboards and `/statistici/seturi/$matrixCode` for datasets.
- **Shared components to reuse/build:** DataStatusBadge (`date disponibile` / `doar catalog`), CoverageRibbon, FreshnessBadge, SourceProvenanceDrawer, TerritoryPicker, DatasetDimensionSelector, RequestDatasetAction.
- **First screen to design:** UAT dashboard: territory search/header, five headline indicators, unit/source/provenance on each card, sparkline, compare-to-county/national action, and "data not available" state for missing datasets.
- **Copy guardrail:** lead with Romanian dataset names and definitions; show matrix codes as provenance, not primary labels.
- **Product-owner question:** choose whether catalog-only datasets are visible in v1 with a request loop or hidden until observations are loaded.
