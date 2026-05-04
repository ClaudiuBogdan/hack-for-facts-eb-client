# Map Grouping Domains and Grouped Value Series

**Status**: Draft
**Date**: 2026-05-04
**Author**: Codex

## Problem

The advanced map editor currently treats every map value as a UAT-level value keyed by SIRUTA. This prevents users from defining independent groupings of UATs, rendering one grouping as a unit on the map, exporting grouping columns, and computing metrics over grouped values.

Users need to define multiple grouping configurations, switch which grouping is visually active, and create numeric series whose values are aggregated at the group level. Calculation series must then be able to safely combine grouped values only when those values refer to the same grouped units.

## Context

- Current map series values are effectively `Map<seriesId, Map<sirutaCode, value>>`.
- Map rendering, bins, filters, table rows, analytics widgets, tooltips, and CSV export currently assume SIRUTA-keyed values.
- The map state already has series ordering, activation, copying, duplication, and calculation-series behavior.
- Existing saved maps must remain valid and continue to behave as UAT-level maps.
- Only one grouping can be rendered on the map at a time because overlapping group boundaries would be ambiguous.

## Decision

Add grouping as a separate map-state concept, not as a special case of existing raw series.

```ts
groupings: MapGrouping[]
activeGroupingId?: string
```

A grouping defines grouped display/correlation units:

```ts
interface MapGrouping {
  id: string;
  key: string;
  label: string;
  groups: MapGroup[];
}

interface MapGroup {
  id: string;
  label?: string;
  memberSirutaCodes: string[];
  primarySirutaCode?: string;
  memberOrder?: string[];
}
```

For derived groupings such as counties, the grouping may be generated from GeoJSON properties instead of storing every member explicitly. For custom groups, group IDs should be deterministic, such as a hash of sorted member SIRUTA codes. Ordering metadata must be stored separately from the hash.

Add a new numeric series type:

```ts
interface MapGroupedValueSeries {
  id: string;
  type: 'map-grouped-value-series';
  label: string;
  sourceSeriesId: string;
  groupingId: string;
  aggregation: 'sum' | 'first';
  unit?: string;
}
```

This series aggregates a UAT-domain source series into group-domain values:

```ts
Map<groupId, value>
```

The canonical grouped values stay keyed by `groupId`. For map rendering only, grouped values are projected back onto member SIRUTA codes so all polygons in the group receive the same color, bin, and visible value.

Introduce explicit series domains:

```ts
type SeriesDomain =
  | { type: 'uat' }
  | { type: 'group'; groupingId: string };
```

Rules:

- Existing raw series default to `{ type: 'uat' }`.
- Existing calculation series infer their domain from operands.
- `map-grouped-value-series` has `{ type: 'group', groupingId }`.
- Numeric constants have no domain and inherit the domain of the other operands.
- Calculation operands must share the same domain.
- If domains do not match, the calculation should produce a warning and no values.

Examples:

```ts
spendingByCounty.domain = { type: 'group', groupingId: 'county' }
populationByCounty.domain = { type: 'group', groupingId: 'county' }
spendingPerCapitaByCounty = divide(spendingByCounty, populationByCounty) // valid
```

```ts
spendingByCounty.domain = { type: 'group', groupingId: 'county' }
populationByRegion.domain = { type: 'group', groupingId: 'region' }
divide(spendingByCounty, populationByRegion) // invalid
```

Backward compatibility:

- `groupings` defaults to `[]`.
- `activeGroupingId` is optional.
- All existing saved series are treated as UAT-domain.
- Existing maps continue to render and export as UAT-level maps.

## Alternatives Considered

- **Use the primary SIRUTA as the group key**: rejected because it collides with the real UAT value and makes calculations ambiguous.
- **Merge grouping definitions and grouped values into one series schema**: rejected for now because grouping definitions and numeric outputs have different responsibilities. Keeping grouping in map state makes one active rendered grouping explicit.
- **Only project grouped values to SIRUTA and avoid group-domain values**: rejected because totals, filters, rankings, and calculations would over-count duplicated values.
- **Render every grouping at once**: rejected because overlapping borders and interactions would be ambiguous.

## Consequences

**Positive**

- Supports multiple independent groupings with one active rendered grouping.
- Allows grouped values to become first-class numeric series.
- Keeps calculations safe through explicit domain matching.
- Preserves existing saved maps by defaulting old series to UAT-domain.
- Allows table and CSV export to include grouping columns.

**Negative**

- Requires a domain-aware refactor of series evaluation, calculation, bins, filters, table/export, analytics widgets, and public map rendering.
- Public and editor map paths both need shared grouping projection logic.
- Some analytics must use canonical group values, while map coloring must use SIRUTA-projected values.
- Derived groupings and custom groupings may need different storage strategies.

## References

- `src/schemas/advanced-map-analytics.ts`
- `src/hooks/useAdvancedMapAnalyticsSeriesData.ts`
- `src/lib/map-series/calculation.ts`
- `src/lib/map-series/value-filters.ts`
- `src/hooks/useAdvancedMapAnalyticsBins.ts`
- `src/features/advanced-map-analytics/components/map-analytics-workspace.tsx`
- `src/features/advanced-map-analytics/components/map-analytics-public-view.tsx`
- `src/components/maps/advanced-map-analytics/advanced-map-analytics-data-table.tsx`
