# Map Grouping Domains and Grouped Value Series

**Status**: Draft
**Date**: 2026-05-04
**Author**: Codex

## Problem

The advanced map editor currently treats every map value as a UAT-level value keyed by SIRUTA. This prevents users from defining independent group workspaces of UATs, rendering one workspace as grouped map units, exporting group columns, and computing metrics over grouped values.

Users need to define multiple group workspaces, switch which workspace is visually active, and create numeric series whose values are aggregated at the group level. Calculation series must then be able to safely combine grouped values only when those values refer to the same grouped units.

## Context

- Current map series values are effectively `Map<seriesId, Map<sirutaCode, value>>`.
- Map rendering, bins, filters, table rows, analytics widgets, tooltips, and CSV export currently assume SIRUTA-keyed values.
- The map state already has series ordering, activation, copying, duplication, and calculation-series behavior.
- Existing saved maps must remain valid and continue to behave as UAT-level maps.
- Only one group workspace can be rendered on the map at a time because overlapping group boundaries would be ambiguous.

## Decision

Add group workspaces as a separate map-state concept, not as a special case of existing raw series.

```ts
groupWorkspaces: MapGroupWorkspace[]
activeGroupWorkspaceId?: string
```

A `MapGroupWorkspace` defines a selectable grouping context. A `MapGroup` is one merged unit inside that workspace:

```ts
interface MapGroupWorkspace {
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

For derived workspaces such as counties, the workspace may be generated from GeoJSON properties instead of storing every member explicitly. For custom groups, group IDs should be deterministic, such as a hash of sorted member SIRUTA codes. Ordering metadata must be stored separately from the hash.

Add a new numeric series type:

```ts
interface MapGroupedValueSeries {
  id: string;
  type: 'map-grouped-value-series';
  label: string;
  sourceSeriesId: string;
  groupWorkspaceId: string;
  aggregation: 'sum' | 'first';
  unit?: string;
}
```

This series aggregates a UAT-domain source series into group-domain values:

```ts
Map<groupId, value>
```

The canonical grouped values stay keyed by `groupId`. For map rendering only, grouped values are exposed through render units and projected back onto member SIRUTA codes so all polygons in the group receive the same color, bin, and group-level visible value.

### Render Units and Display Values

When a group workspace is active, the map should build an active render-unit context:

```ts
interface ActiveMapRenderUnitContext {
  renderUnitIdBySirutaCode: Map<string, string>;
  renderUnitsById: Map<string, MapRenderUnit>;
}
```

The render unit ID is the `groupId`. Member UAT polygons still provide geometry and hit areas, but value ownership belongs to the render unit. This means:

- Continuous gradient ranges and bins classify unique render-unit values, not repeated member UAT values.
- Polygon fill resolves `feature natcode -> renderUnitId -> group value`.
- Map labels draw once per group for the group label and aggregate value.
- UAT names can still be drawn as secondary geography labels inside the group.
- Tooltips, details, public map entity rows, and active-series table cells must prefer the grouped display value layer over direct UAT source values.

The source series remains UAT-domain data. The grouped display layer is a read model derived from the source series and active group workspace. Editor and public map surfaces should use the same helper path for this layer so they cannot drift into showing group colors with raw member UAT tooltip values.

Introduce explicit series domains:

```ts
type SeriesDomain =
  | { type: 'uat' }
  | { type: 'group'; groupWorkspaceId: string };
```

Rules:

- Existing raw series default to `{ type: 'uat' }`.
- Existing calculation series infer their domain from operands.
- `map-grouped-value-series` has `{ type: 'group', groupWorkspaceId }`.
- Numeric constants have no domain and inherit the domain of the other operands.
- Calculation operands must share the same domain.
- If domains do not match, the calculation should produce a warning and no values.

Examples:

```ts
spendingByCounty.domain = { type: 'group', groupWorkspaceId: 'county' }
populationByCounty.domain = { type: 'group', groupWorkspaceId: 'county' }
spendingPerCapitaByCounty = divide(spendingByCounty, populationByCounty) // valid
```

```ts
spendingByCounty.domain = { type: 'group', groupWorkspaceId: 'county' }
populationByRegion.domain = { type: 'group', groupWorkspaceId: 'region' }
divide(spendingByCounty, populationByRegion) // invalid
```

Backward compatibility:

- `groupWorkspaces` defaults to `[]`.
- `activeGroupWorkspaceId` is optional.
- All existing saved series are treated as UAT-domain.
- Existing maps continue to render and export as UAT-level maps.

## Series Scoping and Granularity

The user-facing model treats the selected group workspace as the current series context:

```ts
groupWorkspaces: MapGroupWorkspace[]
activeGroupWorkspaceId?: string
series: Array<MapSupportedSeries & { groupWorkspaceId?: string }>
```

In this model:

- `activeGroupWorkspaceId: undefined` means the default ungrouped UAT workspace.
- `series.groupWorkspaceId: undefined` means the series belongs to the default ungrouped workspace.
- A defined `series.groupWorkspaceId` means the series belongs to that group workspace.
- The series list shows only series whose `groupWorkspaceId` matches the active group workspace.
- Adding a new series assigns it to the active group workspace.
- Moving or duplicating a series between group workspaces can be supported explicitly.
- Active manual-group selection is conceptually scoped by both `groupWorkspaceId` and `groupId`, even if local UI state stores the two fields separately.
- The same deterministic `groupId` may appear in multiple workspaces, especially when workspaces are duplicated. Toggling an active group should therefore compare both workspace and group before clearing selection.

This avoids presenting mixed group workspace contexts in the same visible series list. Existing ungrouped series remain simple because they have no `groupWorkspaceId`.

## Workspace Lifecycle

Deleting a group workspace should keep remaining series valid:

- `map-grouped-value-series` entries that depend on the deleted workspace are removed because they cannot resolve a group domain without that workspace.
- Plain UAT-domain source series scoped to the deleted workspace are preserved by clearing `series.groupWorkspaceId`.
- The active series selection is recalculated against the remaining visible workspace.
- Calculation series that reference removed series should follow the existing missing-dependency warning behavior unless a broader cascade-delete rule is introduced.

This intentionally treats grouped value series differently from plain scoped series: grouped value series are derived group-domain outputs, while plain series can still exist in the default UAT workspace.

## CSV Group Workspace Import

The Groups panel supports an append-only `Import workspace from CSV` action. Importing creates a new explicit `MapGroupWorkspace`; it does not replace the existing map configuration, series, filters, or view state.

Primary row-per-UAT format:

```csv
siruta_code,group,group_label,primary,order
1017,alba_iulia,Alba Iulia area,true,1
1071,alba_iulia,Alba Iulia area,false,2
1874,alba_iulia,Alba Iulia area,false,3
```

Rules:

- `siruta_code` and `group` are required. Accepted SIRUTA aliases are `siruta_code`, `siruta`, and `natcode`; accepted group aliases are `group`, `group_id`, and `group_key`.
- `group_label` or `label` controls the display label. If omitted, the `group` value is used.
- `primary` or `is_primary` marks the primary UAT. If omitted, the first ordered member is primary.
- `order` or `member_order` controls `memberOrder`. If omitted, file order is preserved.
- Unknown SIRUTA codes and one UAT assigned to multiple groups block import.
- Duplicate UAT rows inside the same group are deduped with a warning.
- Missing Romania UATs are allowed; imported workspaces can be partial.

The importer also supports the UAT consolidation simulation cluster format:

```csv
cluster_id,anchor_uat_id,anchor_name,merged_uat_ids
50923,50923,BăIle Herculane,50923;52115;52721
```

Mapping:

- `cluster_id` becomes a deterministic `cluster_${cluster_id}` group id.
- `anchor_uat_id` becomes `primarySirutaCode`.
- `merged_uat_ids` becomes `memberSirutaCodes`.
- The primary UAT is first in `memberOrder`, followed by the remaining source order.
- App GeoJSON UAT names are preferred for labels over imported `anchor_name` values.

## Test Coverage

The implementation should keep focused coverage for the grouping behaviors that are easy to regress:

- Public tooltips and public entity detail rows use render-unit/group display values instead of raw member UAT values.
- Group labels render once per group while member UAT labels remain available as geography labels.
- Gradient and bin classification use unique group values and then project the result to member polygons.
- Clicking the same deterministic group ID in another workspace activates that workspace/group pair instead of toggling off the previous active group.
- Deleting a group workspace removes dependent grouped value series and unscopes ordinary source series.
- CSV group workspace import parses row-per-UAT and simulation cluster formats, validates UAT membership, and appends an active workspace without changing existing series.

Relevant test files:

- `src/features/advanced-map-analytics/components/map-analytics-public-view-helpers.test.ts`
- `src/features/advanced-map-analytics/components/map-analytics-workspace-mobile-controls.test.tsx`
- `src/components/maps/polygonLabels.test.ts`

Add an optional granularity field later if the UI needs validation or aggregation rules across territorial levels:

```ts
type TerritorialGranularity =
  | 'country'
  | 'macroregion'
  | 'development_region'
  | 'county'
  | 'uat'
  | 'locality'
  | 'custom';
```

Possible schema shape:

```ts
interface MapGroupWorkspace {
  id: string;
  key: string;
  label: string;
  granularity?: TerritorialGranularity;
  groups: MapGroup[];
}

interface MapSupportedSeries {
  groupWorkspaceId?: string;
  granularity?: TerritorialGranularity;
}
```

The default remains simple: missing `groupWorkspaceId` and missing `granularity` are interpreted as the ungrouped UAT workspace. The granularity field should be optional and descriptive at first. It can later support validation such as preventing incompatible calculations, limiting which series can be shown in a grouping, or deciding when aggregation/projection is required.

Useful territorial levels for Romania and EU data:

- `country`: NUTS 0 / Romania.
- `macroregion`: NUTS 1 macroregions.
- `development_region`: NUTS 2 development regions.
- `county`: NUTS 3 counties, including Bucharest.
- `uat`: LAU / SIRUTA administrative-territorial units such as municipalities, towns, and communes.
- `locality`: SIRUTA localities such as villages or component localities.
- `custom`: user-defined groups that do not map cleanly to a standard territorial level.

## Alternatives Considered

- **Use the primary SIRUTA as the group key**: rejected because it collides with the real UAT value and makes calculations ambiguous.
- **Merge grouping definitions and grouped values into one series schema**: rejected for now because grouping definitions and numeric outputs have different responsibilities. Keeping grouping in map state makes one active rendered grouping explicit.
- **Only project grouped values to SIRUTA and avoid group-domain values**: rejected because totals, filters, rankings, and calculations would over-count duplicated values.
- **Render every group workspace at once**: rejected because overlapping borders and interactions would be ambiguous.

## Consequences

**Positive**

- Supports multiple independent group workspaces with one active rendered workspace.
- Allows grouped values to become first-class numeric series.
- Keeps calculations safe through explicit domain matching.
- Preserves existing saved maps by defaulting old series to UAT-domain.
- Allows table and CSV export to include grouping columns.

**Negative**

- Requires a domain-aware refactor of series evaluation, calculation, bins, filters, table/export, analytics widgets, and public map rendering.
- Public and editor map paths both need shared grouping projection logic.
- Some analytics must use canonical group values, while map coloring must use SIRUTA-projected values.
- Derived group workspaces and custom group workspaces may need different storage strategies.

## Runtime Performance Notes

Map camera updates are intentionally treated as viewport state, not data state. A performance trace on May 8, 2026 showed map drag freezes caused by committing URL/map viewport state from early `dragend` / `zoomend` events while MapLibre was still animating inertia. That React update invalidated analytics dependencies and recomputed draft-size warnings during the drag settle window.

The map should recover hover, tooltip, scroll, and selection affordances on `dragend`, `zoomend`, pointer release, and cancel events. Persisting the camera should happen only after final movement settlement events such as `moveend` / `idle`. User-driven viewport restore state must stay outside canonical map state: it should not mark drafts dirty, update `updatedAt`, or invalidate grouped series, table, or map calculations. Saved `mapCenter` and `mapZoom` remain valid initial defaults, but normal pan/zoom writes only lightweight runtime restore state.

MapLibre source updates are split by responsibility. Main UAT/county polygons, group boundaries, selected group boundaries, and label sources are updated independently so a boundary recalculation does not force the polygon source, labels, or styles to be reprocessed. Persistent polygon style is baked into GeoJSON feature properties (`__mapFillColor`, `__mapFillOpacity`, `__mapLineColor`, `__mapLineOpacity`, `__mapLineWidth`) instead of long-lived MapLibre `feature-state`; `feature-state` is reserved for transient hover. This avoids renderer stalls where retained tiles replay feature state during pan/zoom.

Label source construction is also data-driven rather than zoom-driven. County fallback labels, UAT labels, grouped render-unit labels, and grouped member labels are rebuilt only when their input data changes. Zoom thresholds, opacity fades, text offsets, and stroke attenuation are MapLibre paint/layout expressions, so crossing zoom levels should not trigger React-side label rebuilding.

## References

- `src/schemas/advanced-map-analytics.ts`
- `src/hooks/useAdvancedMapAnalyticsSeriesData.ts`
- `src/lib/map-series/calculation.ts`
- `src/lib/map-series/value-filters.ts`
- `src/hooks/useAdvancedMapAnalyticsBins.ts`
- `src/features/advanced-map-analytics/components/map-analytics-workspace.tsx`
- `src/features/advanced-map-analytics/components/map-analytics-public-view.tsx`
- `src/features/advanced-map-analytics/components/map-analytics-render-units.ts`
- `src/components/maps/advanced-map-analytics/advanced-map-analytics-data-table.tsx`
- `src/components/maps/InteractiveMap.tsx`
- `src/components/maps/interactive-map-data.ts`
- `src/components/maps/interactive-map-label-sources.ts`
