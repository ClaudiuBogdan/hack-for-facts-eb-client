# Advanced Map Analytics Tech Decisions

This document captures the key implementation decisions for `/maps/editor` (phase 1).

For full value-filters internals and rationale, see `docs/advanced-map-analytics-value-filters-implementation.md`.

## Chronos dev decimal values (2026-09-07)

The authoritative map vector contains decimal strings or missing values. CSV ingestion preserves source text; duplicate rows, invalid values and manifest mismatches make the complete matrix unavailable. Calculations, group sums, ranking, threshold/bin membership, table sorting and CSV exports use these values without an intermediate JavaScript-number conversion. Arithmetic uses 40 significant digits with half-even rounding, matching budget arithmetic; recurring divisions follow that rounding policy.

A group sum requires every member. An all-missing analytics total remains missing; actual zero remains zero. Statistics over defined observations retain their existing sample semantics and coverage display. Drawing coordinates and compact display labels convert to numbers only at presentation boundaries. Continuous colors normalize against decimal endpoints before conversion.

**User decision:** keep existing numeric constants, filters and saved bin boundaries for this release. Their input precision remains the precision of JavaScript numbers. No configuration version or saved-map migration is introduced. Automatic numeric bins use representable spacing and an outward lower boundary so source values remain covered. Equality and rank comparisons use decimal equality, with name/SIRUTA tie-breaks for equal values.

This is client groundwork; it does not by itself mount the native grouped-series API, replace `/map`, or establish Chronos dev browser acceptance. Those remain separate migration gates.

## Scope and Route

- New route: `/maps/editor` (isolated from `/map` behavior).
- UAT-only rendering in phase 1.
- Join key is `siruta_code` (mapped to `feature.properties.natcode`).

## URL State and Persistence

- URL is source of truth for map state.
- Search schema includes:
  - `version` (required contract version)
  - `series[]`
  - `activeSeriesId`
  - `valueFilters.rules[]` (per-rule `enabled`, `joinWithPrevious`, `seriesRef`)
  - `valueFiltersPanelCollapsed`
  - `activeView` (`map` | `table`)
  - `seriesPanelCollapsed`
  - `configPanelCollapsed`
  - `binsPanelCollapsed`
  - `binsPresets[]`
  - `activeBinPresetId`
  - `tableBinFiltersByPresetId`
  - `mapCenter`
  - `mapZoom`
- Legacy URL shapes are intentionally unsupported in the current contract.
- Long URL payload is allowed for now; warning-only URL budget guard is used.

## Series Model

- Supported series union is a subset of chart series:
  - `line-items-aggregated-yearly`
  - `commitments-analytics`
  - `ins-series`
  - `aggregated-series-calculation`
- Exactly one series can be active for choropleth display.
- "No active series" is valid and must not auto-select fallback.

## Data Contract and Adapter

- Map data is consumed via a provider-neutral contract:
  - `fetchGroupedSeriesData(request) -> { manifest, payload, warnings? }`
- Payload contract (phase 1):
  - `manifest.format = wide_matrix_v1`
  - `payload.mime = text/csv`
  - `payload.data` is a wide CSV matrix (`siruta_code,<series_id_1>,<series_id_2>,...`)
- Phase 1 uses a mock map-specific adapter behind this stable interface.
- Map and table endpoints remain separate externally (backend reuse is internal).

## Native INS map periods (2026-09-07)

The map reuses the chart dataset/dimension editor with a map-specific period
control. New map selections default to a shared latest reference period; territories
without an observation in that period remain unavailable. Mixed-frequency sources
require an explicit frequency.

**User decision:** any explicit period selection requires `intervalOperation`:
`sum`, `average`, or `latest`. This is separate from the carried `aggregation`
field, which must never implicitly select a temporal operation. Existing saved
intervals without the new field remain readable and prompt for a choice.
The operation and optional latest frequency are included in request serialization
and its cache identity. Numeric constants and filter/bin inputs remain unchanged.

Saved map periods are preserved when coverage metadata changes. Neither the INS
editor nor the shared period picker may automatically shorten an interval or
replace its frequency. The picker retains its existing default behavior for charts;
only maps opt into preservation. Out-of-coverage endpoints remain visible and
editable, and switching from latest to interval clears the previous frequency.

These controls and the native server reader are implemented independently of
provider mounting. Full native map composition and local/dev acceptance remain
release gates; this section does not claim that the replacement map is deployed.

## Calculation Semantics (Map-Specific)

- Map calculation engine is non-temporal, scalar per `siruta_code`.
- Strict undefined propagation:
  - If any operand is undefined for a key, result is undefined for that key.
- Operations:
  - `sum`, `subtract`, `multiply`, `divide`
- Division by zero:
  - Returns undefined for that key and emits warning.
- Mixed units:
  - Warning only, rendering continues.
- Missing INS/base coverage:
  - Undefined values stay undefined (no implicit zero fill).

## Warning Model

- Warning types include:
  - missing dependency
  - undefined merge result
  - divide-by-zero
  - mixed unit
  - sparse coverage
  - invalid/duplicate CSV rows
  - value-filter invalid/missing-source/no-match
  - value-filter stats invalid-params/insufficient-sample/zero-variance/no-defined-values
  - URL budget warning

## Value Filters Engine (v2)

- Value filters are evaluated after base vectors + INS vectors + calculation vectors are ready.
- Rule model:
  - `kind: 'threshold' | 'stats'`
  - `enabled` per rule
  - `joinWithPrevious: 'AND' | 'OR'` per rule
  - source target per rule (`active` dynamic or explicit `seriesId`)
- No backward-compatibility migration is applied for legacy rule shapes.

### Evaluation Semantics

- Global universe is the union of displayed SIRUTA keys.
- Left-to-right pipeline:
  - first valid enabled rule initializes current band
  - `AND`: evaluate on current band, then intersect
  - `OR`: evaluate on global baseline, then union
- Disabled rules are skipped.
- Invalid rules are skipped with warnings.
- If no valid enabled rule remains, masking is not applied.

### Threshold Rules

- Operators: `gt|gte|lt|lte|eq|neq|between|not_between|is_defined|is_undefined`
- `between` / `not_between` are inclusive.
- `eq` / `neq` use epsilon tolerance (`1e-9`).
- Undefined values only match `is_undefined`; all other operators treat undefined as non-match.

### Stats Rules

- Supported stats types:
  - `percentile_band`
  - `rank`
  - `median_compare`
  - `zscore`
  - `iqr_outlier`
  - `mad_robust_zscore`
- Stats operate on one source series per rule and exclude undefined/non-finite values from sample.
- Deterministic tie-breaking for rank: sort by value, then by `siruta_code`.
- Percentile bounds are inclusive and normalized if min/max are swapped.

## Stats Filter Explanations

- Each stats type shows a dedicated inline explanation inside the rule editor modal.
- Explanations include:
  - what the filter does
  - when to use it
  - practical example
  - tips and tricks
- Explanations are context-sensitive and update immediately when stats type changes.

## Sidebar and Editor UX

- Left sidebar has four collapsible cards:
  - `Config` (top)
  - `Data Series` (second)
  - `Value Filters` (third)
  - `Bins` (fourth)
- Both collapse states are URL-persisted.
- `Config` quick settings include:
  - editable map name (`Untitled map` default)
  - active view selector (`Map` / `Table`)
  - warning count shortcut
- `Open Config` launches a minimal read-only summary modal.
- Warning count opens a dedicated warnings modal with full warning text and context.
- Inline warning strip above the map is removed.
- Config modal keeps only map name + warnings summary (no active series/unit fields).
- Row behavior:
  - Drag-and-drop reorder (`@dnd-kit`)
  - Series-type icon sets active series
  - Clicking active icon on disabled series auto-enables + sets active
  - Disabling active series clears `activeSeriesId`
  - Row menu supports Edit/Delete
- Add flow:
  - Insert default `line-items-aggregated-yearly` immediately, then open modal.
- Edit flow:
  - Open same modal by `seriesId`.
- Modal editing model:
  - Live apply only (no save/cancel commit model).

## Fetch Control While Editing

- Network fetching is paused while editor modal is open.
- UI continues to display the last fetched snapshot while editing.
- On modal close, query resumes and fetches latest effective base-series state.

## Tooltip and Legend Behavior

- Tooltip is composed from series cache (active + other enabled series values).
- Missing values are shown as missing/undefined (never coerced to zero).
- In bins mode, tooltip includes bins analytics context:
  - bins preset title (`config.title` fallback to active series label)
  - classified bin result label
- `NO_DATA` tooltip marker follows bins classification (`isNoData`) when bins mode is active.
- If no active series:
  - no choropleth values
  - empty/no-active overlay
  - legend hidden

## Table View

- `activeView='table'` renders a wide multi-series table instead of the map.
- Table rows are UAT keyed by union of `siruta_code` across enabled series vectors.
- Table columns include static metadata (`UAT`, `County`, `SIRUTA`) plus one value column per enabled series.
- Active series column is placed first among dynamic series columns.
- Missing values are rendered as `Missing` (no implicit zero fill).
- Row navigation to entity page is conditional:
  - navigate only when a resolvable `entityCui` exists
  - otherwise row remains non-navigable.
- Table includes a dedicated `Filter` dropdown (separate from `View`).
- Filter dropdown has one bins section per preset with checkbox options for stable bin IDs and `NO_DATA`.
- Filter selections are URL-persisted in `tableBinFiltersByPresetId`.
- Table filter semantics:
  - no selected groups anywhere => no filtering (all rows visible)
  - multiple selections within one preset => union
  - selections across presets => OR

## Bins Presets

- Bins are configured as presets in URL state (`binsPresets[]`).
- `activeBinPresetId` controls which preset styles the map; no active preset is valid.
- Bins classify the currently active series values.
- Preset config includes optional `title`, used as discrete legend main title (with active series fallback).
- Phase 1 scale mode is `sequential` only.
- Boundary semantics are fixed to `[min, max)` and last bin must be open-ended (`max = null`).
- Group ids use stable bin IDs from schema plus `NO_DATA`.
- Each bin can be optionally marked as disabled; disabled bins are skipped in classification.
- `NO_DATA` label/color are user-editable; tooltip marker for `NO_DATA` is toggleable.
- Missing/unmatched values map to `NO_DATA` (never coerced to zero).
- Regenerate is manual from the bins modal/editor flow.
- Legend switches to a discrete bins legend when bins mode is active and valid.
- Discrete legend hides internal group ids and renders item text as `Label — Range` for bins.
- Default generated/add-bin labels are `Label 1`, `Label 2`, ...
- Switching `manual -> gradient` requires confirmation and immediately reapplies gradient colors.
- If invalid local range drafts exist, close actions require discard confirmation.
- Bins warnings are merged into the global warning flow/modal.

## Performance and Stability Decisions

- Deterministic query key from normalized, sorted base series definitions.
- Client-side calculation runs after base vectors load.
- Map style lookup remains O(1) via heatmap map joins.
- Mock SIRUTA loader cache resets on transient failure to allow retry.
