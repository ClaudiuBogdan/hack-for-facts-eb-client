# Experimental Map Tech Decisions

This document captures the key implementation decisions for `/experimental/map` (phase 1).

## Scope and Route

- New route: `/experimental/map` (kept experimental, isolated from `/map` behavior).
- UAT-only rendering in phase 1.
- Join key is `siruta_code` (mapped to `feature.properties.natcode`).

## URL State and Persistence

- URL is source of truth for map state.
- Search schema includes:
  - `series[]`
  - `activeSeriesId`
  - `activeView` (`map` | `table`)
  - `seriesPanelCollapsed`
  - `configPanelCollapsed`
  - `binsPanelCollapsed`
  - `binsPresets[]`
  - `activeBinPresetId`
  - `tableBinFiltersByPresetId`
  - `mapCenter`
  - `mapZoom`
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
  - `fetchGroupedSeriesData(request) -> { manifest, rows, warnings? }`
- Long-row contract:
  - `rows: { series_id, siruta_code, value }[]`
- Phase 1 uses a mock map-specific adapter behind this stable interface.
- Map and table endpoints remain separate externally (backend reuse is internal).

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
  - URL budget warning

## Sidebar and Editor UX

- Left sidebar has three collapsible cards:
  - `Config` (top)
  - `Data Series` (second)
  - `Bins` (third)
- Both collapse states are URL-persisted.
- `Config` quick settings include:
  - editable map name (`Experimental UAT Map` default)
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

## Table View (Experimental)

- `activeView='table'` renders a wide multi-series table instead of the map.
- Table rows are UAT keyed by union of `siruta_code` across enabled series vectors.
- Table columns include static metadata (`UAT`, `County`, `SIRUTA`) plus one value column per enabled series.
- Active series column is placed first among dynamic series columns.
- Missing values are rendered as `Missing` (no implicit zero fill).
- Row navigation to entity page is conditional:
  - navigate only when a resolvable `entityCui` exists
  - otherwise row remains non-navigable.
- Table includes a dedicated `Filter` dropdown (separate from `View`).
- Filter dropdown has one bins section per preset with checkbox options for `G1..Gn` and `NO_DATA`.
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
- Group ids are derived at runtime from ordered bins (`G1..Gn`) plus `NO_DATA`.
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
