# Render custom dataset payloads in map UAT surfaces

**Status**: Draft
**Date**: 2026-04-10
**Author**: Codex

## Problem

Custom uploaded datasets can already persist typed row payloads (`text`, `link`, `markdown`), but the map UAT inspection surfaces still treat those series as numeric-only.

- the dataset editor lets authors create and validate typed payloads per UAT row
- dataset preview surfaces can show that payload data
- the map analytics UAT surfaces only receive formatted numeric values, so payload data is dropped before rendering

This creates a product gap: users can author payload-rich custom series, but cannot inspect that payload when clicking or hovering a UAT on the map. It also collapses distinct payload types into either nothing or a flat string, which loses the affordances expected for links and markdown.

## Context

- The dataset contract already supports typed JSON payloads in `src/features/advanced-map-datasets/api/schemas.ts`.
- The editor draft model preserves payload type, value, and link label in `src/features/advanced-map-datasets/types.ts`.
- The dataset editor UAT dialog already exposes type-specific editing for `text`, `link`, and `markdown` in `src/features/advanced-map-datasets/components/dataset-editor-uat-dialog.tsx`.
- Dataset preview surfaces currently stringify persisted payloads in:
  - `src/features/advanced-map-datasets/components/dataset-public-page.tsx`
  - `src/features/advanced-map-analytics/components/uploaded-map-dataset-browser.tsx`
  - `src/features/advanced-map-datasets/utils/draft.ts`
- The map analytics runtime is numeric-first:
  - `src/hooks/useAdvancedMapAnalyticsSeriesData.ts` returns `valuesBySeriesId` and `unitsBySeriesId`
  - `src/features/advanced-map-analytics/components/map-analytics-workspace.tsx` builds selected-UAT rows only from numeric vectors
  - `src/features/advanced-map-analytics/components/map-analytics-entity-details-panel.tsx` renders only `label`, `value`, and `isActive`
  - the map tooltip HTML in `src/features/advanced-map-analytics/components/map-analytics-workspace.tsx` is also built from numeric series rows only
- `react-markdown` and `remark-gfm` are already available in `package.json`, so markdown payloads do not require a new rendering dependency.

## Decision

Render persisted custom dataset payloads in the map UAT inspection surfaces by adding a parallel payload path for uploaded dataset series and a shared type-specific payload renderer.

### 1. Scope

This feature applies only to uploaded/custom dataset series (`type === 'uploaded-map-dataset'`) in map UAT surfaces:

- selected UAT details panel
- map hover/click tooltip content
- preview workspaces that reuse the same map analytics workspace

Legend, coloring, bins, calculations, and analytics/table math remain numeric-only.

### 2. Runtime shape

Keep `valuesBySeriesId` unchanged for numeric behavior, and add a parallel payload cache keyed by `seriesId -> sirutaCode -> valueJson`.

- Source of truth: persisted `row.valueJson` from dataset detail queries
- Payload shape: reuse `AdvancedMapDatasetJsonItem`
- Population rule:
  - uploaded dataset series may contribute both numeric value and payload
  - non-uploaded series contribute no payload entries
- Ownership:
  - payload extraction should happen near the uploaded-dataset/map-runtime adapter layer, not inside presentational components
  - analytics UI should consume a normalized payload view model, not dataset editor draft state

### 3. UI contract

Introduce a shared renderer for persisted payloads in map UAT surfaces.

- `text`
  - render as a multiline text block
  - preserve line breaks
  - use compact muted styling so it reads as contextual detail below the numeric value
- `link`
  - render as an external link row/button
  - show `label` when present, otherwise fall back to the URL/host
  - open in a new tab with `target="_blank"` and `rel="noreferrer"`
- `markdown`
  - render with `react-markdown` + `remark-gfm`
  - use a constrained prose container so long content does not dominate the panel
  - do not enable raw HTML rendering

### 4. Surface behavior

- Entity details panel:
  - each uploaded dataset series row may render an optional payload section below the main numeric value
  - if a row has payload but no numeric value, the series row still renders
- Tooltip:
  - include a compact payload summary per uploaded dataset series when payload exists
  - use the same type semantics as the panel, but in a denser presentation suitable for tooltip HTML
  - markdown tooltips should render as a safe compact excerpt, while the panel remains the full-fidelity surface

### 5. Implementation boundaries

- Reuse persisted payload types from the dataset feature; do not import editor-only draft state into analytics rendering.
- Do not change map series schema or grouped-series numeric API contracts for non-uploaded series.
- Keep dataset editor and dataset public preview behavior unchanged except where code is reused by the new renderer.
- Add focused tests for:
  - payload normalization/adaptation for uploaded dataset series
  - entity details rendering of `text`, `link`, and `markdown`
  - tooltip summary output when payload exists

## Alternatives Considered

### 1. Stringify payload into the existing value line

Rejected because it collapses `text`, `link`, and `markdown` into one flat string and removes the expected interaction for links and markdown formatting.

### 2. Reuse dataset editor draft UI directly in analytics

Rejected because the analytics workspace should render persisted dataset payloads (`valueJson`), not editor draft state (`payloadDraft`). Pulling draft editing concerns into analytics would couple two different responsibilities.

### 3. Extend all map series runtime data to carry arbitrary payloads

Rejected because the feature is specific to uploaded/custom datasets. Broadening the runtime contract for every series type would add complexity where there is no product need.

## Consequences

**Positive**

- Users can inspect authored payload content directly from the map UAT surfaces.
- Link and markdown payloads keep meaningful UI instead of degrading to plain text.
- The solution reuses the existing persisted payload contract and keeps numeric map behavior stable.

**Negative**

- The map analytics runtime gains a second per-series cache alongside numeric vectors.
- Tooltip rendering needs a compact safe representation that is less rich than the panel for markdown.
- More rendering states must be covered in tests for uploaded dataset series.

## References

- `src/features/advanced-map-datasets/api/schemas.ts`
- `src/features/advanced-map-datasets/types.ts`
- `src/features/advanced-map-datasets/components/dataset-editor-uat-dialog.tsx`
- `src/features/advanced-map-datasets/components/dataset-public-page.tsx`
- `src/features/advanced-map-datasets/utils/draft.ts`
- `src/features/advanced-map-analytics/components/uploaded-map-dataset-browser.tsx`
- `src/features/advanced-map-analytics/components/uploaded-map-dataset-dialog.tsx`
- `src/features/advanced-map-analytics/components/map-analytics-workspace.tsx`
- `src/features/advanced-map-analytics/components/map-analytics-entity-details-panel.tsx`
- `src/hooks/useAdvancedMapAnalyticsSeriesData.ts`
- `src/schemas/advanced-map-analytics.ts`
- `package.json`
