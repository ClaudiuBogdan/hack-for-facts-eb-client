# Advanced Map Analytics Value Filters: Implementation Logic and Decisions

This document captures the full filter implementation for `/maps/editor`, including the decisions we made, why we made them, and the exact runtime semantics currently shipped.

## 1. Product Goal

Value filters exist to mask UAT rows **after** all map series values are computed.

- Primary target is exploratory analysis and anomaly detection on map/table views.
- Filters are intentionally client-side in phase 1.
- Filters are scoped only to `/maps/editor` and do not affect `/map` or chart pages.

## 2. Main Decisions We Locked

1. Keep filters in URL state.
- Rationale: deep-linking, refresh persistence, and collaboration through shareable URLs.

2. Use per-rule logic instead of a global combinator.
- Rationale: better control and extensibility.
- Each rule has its own connector (`joinWithPrevious`) and `enabled` toggle.

3. Keep order semantically important.
- Rationale: left-to-right evaluation changes results, especially with mixed `AND` / `OR`.

4. Allow filtering by active series or an explicit source series.
- Rationale: common use case is filtering by population while displaying spending.

5. Keep invalid rules warning-only.
- Rationale: analysis should stay interactive; we skip invalid rules and continue rendering.

6. Add stats filters as a first-class rule kind.
- Rationale: threshold-only filters are too limited for skewed public-finance datasets.

7. Keep UI compact.
- Rationale: list rows remain minimal; full configuration is edited in modal.

8. Do not open modal on add.
- Rationale: fast creation flow; user edits only when needed.

9. Make connector type visible directly in list icon.
- Rationale: users can understand chain logic at a glance.

10. Keep filtering fully local with no refetch on filter edits.
- Rationale: preserve responsiveness and avoid unnecessary API traffic.

## 3. Data-Flow Placement

Filter evaluation happens in `useAdvancedMapAnalyticsSeriesData` after all series vectors are prepared:

1. Fetch grouped base vectors (mock adapter in phase 1).
2. Merge local vectors (INS/GeoJSON where relevant).
3. Run map calculation series (non-temporal, scalar by `siruta_code`).
4. Build `displayValuesBySeriesId` from enabled series.
5. Apply value filter masking with `applyAdvancedMapAnalyticsValueFilters(...)`.
6. Return masked vectors used consistently by map, table, bins, and tooltip.

Important behavior:

- Filter edits recompute locally.
- Query key does not include filter rules.
- No remote refetch is triggered by value-filter changes.

## 4. URL Schema and Rule Model

Schema lives in `src/schemas/advanced-map-analytics.ts` under `valueFilters.rules`.

Each rule has:

- `id: string`
- `enabled: boolean` (default `true`)
- `joinWithPrevious: 'AND' | 'OR'` (default `AND`)
- `seriesRef`
- `kind: 'threshold' | 'stats'`

Source selector:

- `{ mode: 'active' }` (dynamic active-series binding)
- `{ mode: 'series', seriesId: string }` (explicit source)

State also includes:

- `valueFiltersPanelCollapsed: boolean`

## 5. Contract Strictness

- Current parser accepts only the canonical value-filter contract.
- Legacy rule shapes are not migrated in place.
- Rules must provide explicit `kind`.

## 6. Evaluation Semantics (Authoritative)

Implementation: `src/lib/map-series/value-filters.ts`.

### 6.1 Universe and source vectors

- `globalUniverse`: union of all `siruta_code` keys from `displayValuesBySeriesId`.
- Rule values are read from `allValuesBySeriesId` (not only displayed series).

This enables:

- filtering by non-displayed series,
- masking applied consistently to displayed vectors.

### 6.2 Rule eligibility

- Disabled rules are skipped.
- Rules with missing source series are skipped with warnings.
- Rules with invalid parameters are skipped with warnings.
- If no enabled valid rules remain: no mask is applied.

### 6.3 Left-to-right set logic

Let `currentBand` be the current matched SIRUTA set.

1. First valid rule initializes `currentBand`.
2. Next rule uses connector:
- `AND`: evaluate on current band, intersect.
- `OR`: evaluate on global baseline, union.

This was a deliberate decision:

- `AND` progressively narrows current candidates.
- `OR` re-introduces candidates from the full baseline.

### 6.4 No-match behavior

If final set is empty:

- display vectors become empty for all displayed series,
- warning `value_filter_no_matches` is emitted.

## 7. Threshold Rules

Operators:

- `gt`, `gte`, `lt`, `lte`, `eq`, `neq`
- `between`, `not_between`
- `is_defined`, `is_undefined`

Semantics:

- `between` and `not_between` are inclusive.
- `eq` and `neq` use epsilon `1e-9`.
- Undefined/non-finite values:
- only `is_undefined` can match undefined,
- other operators treat undefined as non-match.
- `between` bounds are normalized if user swaps order.

## 8. Stats Rules

Stats rules are single-source (one source series per rule) and evaluated on numeric values from the current evaluation universe.

Undefined and non-finite values are excluded from the sample.

### 8.1 Supported stats types

1. `percentile_band`
- Inputs: `minPercentile`, `maxPercentile`
- Method: nearest-rank percentile
- Bounds: inclusive
- If min > max: normalized by swap

2. `rank`
- Inputs: `direction: top|bottom`, `count`
- Deterministic tie-break: value then `siruta_code`
- Selects exactly first `N` matches after sorting

3. `median_compare`
- Inputs: `mode: gt|gte|lt|lte`
- Uses median of sample

4. `zscore`
- Inputs: `mode: abs_gte|gte|lte`, `threshold`
- Formula: `z = (x - mean) / stddev`
- Skips with warning if sample < 2 or stddev is zero

5. `iqr_outlier`
- Inputs: `side: upper|lower|both`, `multiplier`
- Quartiles from nearest-rank percentiles (`Q1`, `Q3`)
- Fences: `Q1 - m*IQR`, `Q3 + m*IQR`
- Skips with warning if sample < 4 or IQR is zero

6. `mad_robust_zscore`
- Inputs: `threshold`
- Robust z formula:
- `robustZ = 0.67448975 * (x - median) / MAD`
- Skips with warning if sample < 3 or MAD is zero

## 9. Warning Model

Warnings are non-blocking and accumulate into existing map warning UI.

Filter-specific warnings:

- `value_filter_invalid_rule`
- `value_filter_missing_series`
- `value_filter_missing_active_series`
- `value_filter_no_matches`
- `value_filter_stats_invalid_parameters`
- `value_filter_stats_insufficient_sample`
- `value_filter_stats_zero_variance`
- `value_filter_stats_no_defined_values`

Design intent:

- always render what is valid,
- expose diagnostics instead of failing hard.

## 10. UI/UX Decisions and Behavior

### 10.1 Panel and list

- Panel: compact, collapsible.
- Rows are minimal and show:
- rule number,
- summary text,
- dynamic connector glyph (`AND` / `OR`) as main icon,
- enable/disable switch,
- row menu.

### 10.2 Editing model

- Configuration happens in modal (`edit` mode).
- Add rule inserts predefined default immediately.
- No auto-open modal on add.

### 10.3 Reordering

- Drag-and-drop (`@dnd-kit`) and menu actions (move up/down).
- Order is persisted in URL and is semantically meaningful.

### 10.4 Rule editor

Fields:

- connector (rows index > 0),
- source series,
- rule kind (threshold/stats),
- operator/stat-specific parameters.

Stats UX:

- Each selected stats type displays a dedicated explanation block:
- what it does,
- example usage,
- tips and tricks.

## 11. Source Targeting Semantics

`seriesRef.mode = 'active'`:

- dynamic binding to the currently active displayed series.
- If no active series exists, rule becomes invalid and is skipped with warning.

`seriesRef.mode = 'series'`:

- binds to explicit series ID.
- Can target a disabled/non-displayed series if vector exists in `allValuesBySeriesId`.

This is intentional and supports workflows like:

- filter by population,
- display spending.

## 12. Consistency Across Map/Table/Bins/Tooltip

Masking is applied before downstream rendering data is consumed.

Result:

- map coloring,
- table rows,
- bins analytics,
- tooltip values

all observe the same filtered UAT set.

## 13. Tests We Added/Extended

Schema tests:

- parse/serialize round-trip for rule list.
- strict rejection for legacy `combinator`.
- strict rejection for missing `kind`.

Evaluator tests:

- mixed `AND`/`OR` left-to-right behavior.
- disabled rule skipping.
- all threshold operators.
- all stats types.
- undefined semantics.
- deterministic rank tie-breaking.
- warning scenarios and no-match warning.

Hook tests:

- post-calculation masking.
- active-series dynamic source behavior.
- explicit source series behavior.
- no refetch on local filter edits.

Component tests:

- compact list interactions.
- editor modal stats fields.
- reorder behavior.

## 14. Defaults and Guardrails

Default new threshold rule:

- `enabled: true`
- `joinWithPrevious: 'AND'`
- `seriesRef: { mode: 'active' }`
- `operator: 'is_defined'`

Default new stats rule by type:

- percentile: `0..100`
- rank: `top 10`
- median compare: `>= median`
- z-score: `|z| >= 2`
- iqr: `both`, `1.5`
- mad robust z: `3.5`

Guardrails:

- strict parameter validation with skip+warning behavior,
- deterministic sorting to avoid unstable results,
- no implicit zero-fill for missing data.

## 15. Known Limits (Current Phase)

1. Client-side filtering only.
2. No parenthesis/grouping in boolean expressions.
3. Left-to-right precedence only.
4. Stats sample is driven by current evaluation scope and selected source vector.
5. Filters are scoped to advanced map analytics route only.

## 16. Suggested Future Enhancements

1. Optional grouped boolean expressions (parenthesized groups).
2. Rule templates (common presets like "negative values", "top 10% population").
3. Explainability preview:
- show sample size and matched count per rule before apply.
4. Server-side filtering option for very large datasets.
5. Shareable "analysis recipe" snapshots with annotations.
