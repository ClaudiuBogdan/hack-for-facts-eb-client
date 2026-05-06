# Future Composable Map Group Workspace Rules

**Status**: Draft
**Date**: 2026-05-04
**Author**: Codex

## Problem

The initial map grouping prototype focuses on explicit `MapGroupWorkspace` definitions and grouped value series. In the future, users may need to define groups through reusable rules, such as grouping UATs by county, then subdividing by population bands, or narrowing a workspace based on demographic characteristics.

This future capability should be explored without expanding the first prototype scope or making the core group workspace model too complex.

## Context

The main grouping specification defines the initial model:

- `groupWorkspaces`
- `activeGroupWorkspaceId`
- `map-grouped-value-series`
- series domains for safe calculations

See [Map Grouping Domains and Grouped Value Series](./specs-202605041809-map-grouping-domains-and-series.md).

This document captures a possible future extension for derived group workspace definitions. It should not be treated as required for the first prototype.

## Decision

Explore rule-composed group workspace definitions as an optional extension to explicit group definitions.

```ts
type GroupingDefinition =
  | {
      mode: 'explicit';
      groups: MapGroup[];
    }
  | {
      mode: 'derived';
      rules: GroupingRule[];
    };
```

A derived group workspace would evaluate rules from left to right. Each rule narrows or partitions the current UAT candidate set, and the final result is still a normal workspace with stable group IDs.

Example rule types:

```ts
type GroupingRule =
  | {
      type: 'geo-property';
      property: 'countyCode' | 'regionCode';
    }
  | {
      type: 'series-bins';
      seriesId: string;
      method: 'quantile' | 'thresholds';
      thresholds?: number[];
    }
  | {
      type: 'series-filter';
      seriesId: string;
      operator: 'gte' | 'lte' | 'between';
      value?: number;
      min?: number;
      max?: number;
    }
  | {
      type: 'within-grouping';
      groupWorkspaceId: string;
    };
```

Examples:

Population bands inside each county:

```ts
{
  mode: 'derived',
  rules: [
    { type: 'geo-property', property: 'countyCode' },
    { type: 'series-bins', seriesId: 'population', method: 'quantile' }
  ]
}
```

High elderly-share groups within an existing county workspace:

```ts
{
  mode: 'derived',
  rules: [
    { type: 'within-grouping', groupWorkspaceId: 'county' },
    {
      type: 'series-filter',
      seriesId: 'elderly_population_share',
      operator: 'gte',
      value: 25
    }
  ]
}
```

Rules should only define final UAT membership. They should not produce map values directly. Numeric values remain the responsibility of `map-grouped-value-series` from the main specification.

## Alternatives Considered

- **Arbitrary nested group graph**: rejected for now because it would make dependency tracking, invalidation, UI, and calculation domains too complex.
- **Only explicit groups forever**: simpler, but would make common cases like county grouping and population bands repetitive or hard to maintain.
- **Make grouping rules also compute values**: rejected because it mixes membership logic with numeric series logic.

## Consequences

**Positive**

- Allows powerful derived group definitions later.
- Keeps grouping values compatible with the main domain model.
- Supports common workflows such as grouping by county, then subdividing by population or demographics.
- Preserves a simple mental model: UAT set, then rule, then rule, then final groups.

**Negative**

- Adds dependency tracking between group workspaces and source series.
- Derived group IDs must be stable and deterministic.
- Changes to referenced series or group workspaces may require recomputing derived groups.
- UI for explaining rule order and resulting groups will need careful design.

## References

- [Map Grouping Domains and Grouped Value Series](./specs-202605041809-map-grouping-domains-and-series.md)
- `src/schemas/advanced-map-analytics.ts`
- `src/hooks/useAdvancedMapAnalyticsSeriesData.ts`
