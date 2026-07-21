# Procurement Overview Period Requirements

**Status:** Approved — implemented in client (2026-07-21)  
**Scope:** `/procurement` hub overview (headline stats, rankings, categories,
monthly series, analysis workspace)  
**Decision code:** **E1**

## Problem

The hub landed with **no time filter**, so indicators and rankings reflected
**all-time** history. Nothing in the chrome disclosed that window, so a
suspicious total or ranking looked like “current procurement” when it was not.

Users need a **bounded default** and a **visible period** at all times.

## Decision

| Choice | Value |
| --- | --- |
| Default window | **Previous calendar year** (UTC), e.g. in 2026 → `2025-01-01` … `2025-12-31` |
| Disclosure | Period chip **always** shown (default year, custom range, or “All time”) |
| All-time escape | Explicit URL `period=all` (not “empty dates” alone) |
| Custom range | Explicit `dateFrom` / `dateTo` (month-normalized) win over the default |
| Clear all | Reset to soft default (previous year, no geography) — landing state |

### Resolution order

1. `period=all` → no month bounds (all time)  
2. Else if `dateFrom` and/or `dateTo` → those bounds  
3. Else → previous calendar year (soft default; clean `/procurement` URL)

### Why previous calendar year (not trailing 12 months / YTD)

- Easy to label and share (“2025”).  
- Stable for year-over-year comparison.  
- Complete months; avoids an incomplete current year early in January.  
- Trailing 12 months is better for “right now” but harder to chip-label.

### Why not full history as default

- Rankings and headline counts become hard to interpret.  
- Outlier / bad amounts from old years dominate without context.  
- All time remains available as an **explicit** choice.

## UI contract

- Active-filter chips always include **Period**.  
  - Default/custom: `Period: Jan 2025 – Dec 2025` → remove → all time.  
  - All time: `Period: All time` → remove → restore previous-year default.  
- Filter sheet: “Previous year” and “All time” presets; date inputs show the
  **effective** range (including soft default). Helper text states the default.  
- Filter badge count: period counts when **not** all-time, plus geography.  
- Headline stats and body analytics use the **resolved** period (same scope).

## Non-goals

- Changing institution/supplier slice defaults (separate surfaces).  
- Changing Search listing default sort/grain.  
- Data-layer fixes for bad amounts.  
- Rolling “last 12 months” as the default (rejected for E1).

## Acceptance criteria

1. Landing on `/procurement` with no period params scopes analytics to the
   previous calendar year.  
2. A Period chip is always visible and matches the effective window.  
3. Choosing All time (chip or sheet) sets `period=all` and removes month bounds.  
4. Custom dates clear `period=all` and drive the scope.  
5. Clear all restores previous-year default and clears geography.  
6. Refreshing with `period=all` stays all-time (does not snap back to default).

## Implementation pointers

- `src/schemas/procurement-overview.ts` —
  `resolveProcurementOverviewPeriod`, `getPreviousCalendarYearBounds`,
  `toProcurementLandingQueryFilters`  
- `src/features/procurement/components/procurement-overview-page.tsx`  
- `src/features/procurement/components/procurement-overview-active-filters.tsx`  
- `src/features/procurement/components/procurement-overview-filter-sheet.tsx`

## Related

- Ranking cards / hub IA: [`procurement-ranking-cards-requirements.md`](./procurement-ranking-cards-requirements.md)  
- Geography filters: [`procurement-geography-filter-requirements.md`](./procurement-geography-filter-requirements.md)  
- Spine: [`docs/design/procurement/features/phase-a-spine.md`](../design/procurement/features/phase-a-spine.md)
