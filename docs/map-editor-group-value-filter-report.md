# Map Editor Group Value Filter Report

Date: 2026-05-13

## Summary

The reported behavior is real. In the map editor, value filter rules are evaluated on the source series keys before the active group workspace display layer is applied. For a normal UAT-domain active series shown through an active group workspace, that means the rule matches individual member UATs instead of the group as a single render unit.

This explains the screenshot pattern: a `Less than 500` rule leaves child UAT rows like `483` and `497`, then the grouped table recomputes the visible group total from those surviving members. The group row becomes a partial sum such as `980`, even though a group value of `980` should fail a `< 500` group-level filter.

## Expected Behavior

When a group workspace is active, the group is the filtering unit:

- evaluate threshold and stats rules against one value per group;
- include or exclude the whole group;
- when a group matches, keep all member UATs for map coloring, tooltips, table rows, and CSV/export display;
- when a group does not match, hide all member UATs for that group.

## Current Code Path

1. `useAdvancedMapAnalyticsSeriesData` computes all series values, then builds `displayValuesBySeriesId` directly from `calculationResult.valuesBySeriesId`.
   - File: `src/hooks/useAdvancedMapAnalyticsSeriesData.ts`
   - Relevant lines: 209-223

2. `applyAdvancedMapAnalyticsValueFilters` resolves the rule source vector from `allValuesBySeriesId`, then builds the evaluation universe from `displayValuesBySeriesId` using the source series domain.
   - File: `src/lib/map-series/value-filters.ts`
   - Relevant lines: 57-61, 86-121

3. For a UAT-domain active source series, the domain is still `{ type: 'uat' }`, so the matched set is a set of SIRUTA/member keys.

4. The filtered result is then passed downstream. Group display helpers aggregate over the already-filtered member vectors:
   - `buildManualGroupDisplayValuesBySeriesId` projects a group value onto every member SIRUTA after filtering.
     - File: `src/features/advanced-map-analytics/components/map-analytics-render-units.ts`
     - Relevant lines: 144-188
   - `resolveGroupRowSeriesValue` sums member values for UAT-domain series.
     - File: `src/components/maps/advanced-map-analytics/advanced-map-analytics-table-rows.ts`
     - Relevant lines: 350-356

## Root Cause

The value filter evaluator only knows about series domains, not the active render unit context. Grouped display is currently applied after filtering, so active manual grouping over a UAT-domain series is treated as a UAT filter.

This conflicts with the grouping design doc, which says grouped values are owned by the render unit and that active group display values must be preferred over raw member UAT values.

Important distinction: this is not the same as filtering an explicit `map-grouped-value-series`. That series type is already materialized as a group-domain vector keyed by `groupId`, so the core evaluator can filter those values as group units. The broken case is a plain UAT-domain series, such as population, being displayed through an active manual group workspace.

There is also a related downstream risk in table/detail member rows: some helpers intentionally reintroduce raw source-member values for grouped series. That can be valid for member inspection, but filtering and sorting must not infer visibility from those raw member values when the active user-facing unit is the group.

## Fix Direction

The filter pipeline should evaluate on the same unit the user is looking at.

Smallest safe approach:

1. Before applying value filters, detect when an active group workspace is controlling the visible series.
2. Build a group-level evaluation vector for UAT-domain series in that workspace: `Map<groupId, groupValue>`.
3. Evaluate threshold and stats rules against group IDs, not member SIRUTA codes.
4. Convert matched group IDs back to the downstream display shape by keeping all member UAT values for matched groups and removing all members for unmatched groups.
5. Keep existing group-domain series behavior unchanged, because `map-grouped-value-series` already evaluates on `groupId` values.

## Test Gap

Existing `value-filters` tests cover UAT-domain filtering, alternate source-series filtering, stats rules, domain mismatch, and no-match warnings. They do not cover active group workspace filtering over a UAT-domain source series.

Existing grouped-series tests mostly exercise explicit `map-grouped-value-series` behavior and public/detail member display. They do not protect the active manual grouping case shown in the screenshot.

Add a focused regression test with two groups:

- `g1 = a + b = 980`, members `483` and `497`;
- `g2 = c = 489`;
- active rule: `lt 500`;
- expected result: `g1` is excluded entirely, `g2` is included entirely.

This test should assert both the filtered vectors and the table/group display values so partial group sums cannot return.
