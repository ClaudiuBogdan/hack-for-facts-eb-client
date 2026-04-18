# `/entities/$cui` -> `/primarie/$cui` Migration Gap Analysis

Date: 2026-04-18

## Scope

This document compares:

- Source of truth: `/entities/$cui`
- Migration target: `/primarie/$cui`

Note: the codebase uses `$cui`, not `$cuid`.

The goal is to identify functionality present in `/entities/$cui` that is still missing, reduced, or behaviorally different in `/primarie/$cui`.

## Executive Summary

`/primarie/$cui` is not yet a full migration of `/entities/$cui`.

It reuses some shared entity components and adds campaign-specific UI, but it still differs materially in:

- rendering strategy
- SEO and image preview
- default report type behavior
- search-state breadth
- available views
- route-level UX features
- settings behavior
- interactive prefetching

## What `/primarie/$cui` Already Has

`/primarie/$cui` is not empty. It already implements:

- Entity details loading
- Execution line items loading
- Subordinate ranking loading
- GeoJSON and public-map series prefetching
- Contracts view
- Commitments view
- INS view
- Profile view
- KPI summary and shared trends block
- Campaign-specific map preview
- Campaign-specific grouped line items and analytics modal
- Reports teaser section
- Notification bell in the campaign header

## Missing Or Incomplete Functionality

### 1. Rendering And SSR

- Missing: full SSR page rendering parity. `/entities/$cui` is SSR-backed and loader-driven, while the actual `/primarie/$cui/` page route is still `ssr: false`.
- Missing: SSR-to-client handoff parity. `/entities/$cui` passes `ssrParams`, `ssrSettings`, and forced overrides into the client route, then reuses rehydrated query cache data as an SSR placeholder.
- Missing: SSR-safe preference handling. `/entities/$cui` explicitly avoids reading cookies during SSR to preserve CDN cache correctness; `/primarie/$cui` does not need that flow today because it is still CSR at the page level.

Primary references:

- `src/routes/entities.$cui.tsx`
- `src/routes/entities.$cui.lazy.tsx`
- `src/routes/primarie/$cui/index.tsx`

### 2. SEO, Metadata, And Image Preview

- Missing: entity-specific SEO metadata parity. `/entities/$cui` builds title, description, OG, Twitter, and JSON-LD from an entity snapshot.
- Missing: dynamic social/image preview parity. `/entities/$cui` has `/entities/$cui/share-image.png` backed by a server handler.
- Different behavior: `/primarie/$cui` uses generic campaign SEO, not entity-specific SEO.
- Different behavior: `/primarie/$cui` is `noindex,follow`, while `/entities/$cui` is `index,follow`.

Primary references:

- `src/features/entities/seo/entity-share-seo.ts`
- `src/routes/entities.$cui.share-image[.]png.ts`
- `src/server/handlers/entity-share-image.ts`
- `src/features/campaigns/buget/seo/campaign-seo.ts`

### 3. Initial Data Loading And Default Report Type

- Incomplete: default report type behavior is not preserved.
- `/entities/$cui` leaves `report_type` optional, then falls back to `entity.default_report_type` in the UI and downstream view logic.
- `/primarie/$cui` normalizes missing `report_type` to `PRINCIPAL_AGGREGATED` immediately.
- Result: the source-route behavior described as "default to `detailed` for non-main creditors" is not safely migrated.

Primary references:

- `src/routes/entities.$cui.lazy.tsx`
- `src/features/challenges/schemas/challenge-entity-analysis-route-search-schema.ts`
- `src/routes/primarie/$cui/index.tsx`

### 4. Search State And URL Parity

- Missing from `/primarie/$cui` search state:
  - `mapFilters`
  - `expenseSearch`
  - `incomeSearch`
  - `analyticsChartType`
  - `analyticsDataType`
  - `lineItemsTab`
  - `selectedFundingKey`
  - `selectedExpenseTypeKey`
  - `transferFilter`
  - `advancedFilter`
  - `show_period_growth`
- Incomplete: `/primarie/$cui` supports a narrower URL model centered on campaign analysis.
- Different behavior: `/primarie/$cui` canonicalizes defaults back into the URL much more aggressively than `/entities/$cui`.
- Different behavior: `/primarie/$cui` preserves `ins*` window-managed query params across updates, but it still does not match the broader `/entities/$cui` route-state surface.

Primary references:

- `src/components/entities/validation.ts`
- `src/features/challenges/schemas/challenge-entity-analysis-route-search-schema.ts`
- `src/routes/entities.$cui.lazy.tsx`
- `src/routes/primarie/$cui/index.lazy.tsx`

### 5. Global Settings And Normalization

- Missing: full normalization parity.
- `/entities/$cui` supports the richer normalization flow handled by `resolveNormalizationSettings`, including forced overrides and legacy euro modes.
- `/primarie/$cui` only supports `total` and `per_capita`.
- Missing: `percent_gdp` support.
- Missing: route-level handling for legacy `total_euro` and `per_capita_euro`.
- Missing: route-level `show_period_growth` support. `/primarie/$cui` hardcodes it to `false`.
- Incomplete: `/primarie/$cui` changes currency and inflation through persisted settings, but does not round-trip those updates into the URL the same way `/entities/$cui` does.

Primary references:

- `src/lib/globalSettings/params.ts`
- `src/components/entities/validation.ts`
- `src/routes/entities.$cui.tsx`
- `src/routes/entities.$cui.lazy.tsx`
- `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx`

### 6. View Coverage

Missing dedicated views in `/primarie/$cui`:

- `expense-trends`
- `income-trends`
- `map`
- `related-charts`
- `relationships`
- `reports`

Present in both or already migrated in some form:

- `contracts`
- `commitments`
- `ins`
- `profile`

Important note:

- `employees` and `ranking` were not counted as migration gaps because they are not exposed by the `/entities/$cui` view registry today.

Primary references:

- `src/hooks/useEntityViews.tsx`
- `src/routes/entities.$cui.lazy.tsx`
- `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx`

### 7. Overview / Main-Info Parity

`/primarie/$cui` `main-info` is not a 1:1 migration of `/entities/$cui` `overview`.

Missing or incomplete pieces:

- Missing: the source overview's `EntityLineItemsTabs` experience.
- Missing: the source overview's `LineItemsAnalytics` quick analytics section.
- Missing: the source overview's direct deep-link into `/entity-analytics`.
- Incomplete: `/primarie/$cui` keeps the compact shared trends block, but not the dedicated `expense-trends` and `income-trends` pages.
- Incomplete: `/primarie/$cui` uses public map preview cards, not the full route-level map view from `/entities/$cui`.
- Incomplete: `/primarie/$cui` only has a reports teaser section, not the full reports page.

Primary references:

- `src/components/entities/views/Overview.tsx`
- `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx`
- `src/features/challenges/components/analysis/challenge-entity-reports-section.tsx`
- `src/components/entities/EntityReports.tsx`

### 8. Map Functionality

- Missing: full `/entities/$cui` map view parity.
- Missing: `mapFilters` parity in the route URL.
- Missing: "Explore Full Map" behavior from the entity map view.
- Missing: heatmap-style full entity map route experience within `/primarie/$cui`.
- Incomplete: `/primarie/$cui` has a campaign-oriented public map preview, but not the full dedicated map page behavior available from `/entities/$cui`.

Primary references:

- `src/components/entities/views/MapView.tsx`
- `src/components/entities/hooks/useEntityMapFilter.ts`
- `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx`

### 9. Reports Functionality

- Missing: full reports page parity.
- `/entities/$cui` has a dedicated reports page with:
  - type filter
  - year filter
  - sort order
  - pagination
  - internal back-navigation
- `/primarie/$cui` only provides a teaser/expandable reports section.

Primary references:

- `src/components/entities/EntityReports.tsx`
- `src/features/challenges/components/analysis/challenge-entity-reports-section.tsx`

### 10. Relationships And Related Charts

- Missing: `relationships` view parity.
- Missing: `related-charts` view parity.

Primary references:

- `src/components/entities/EntityRelationships.tsx`
- `src/components/entities/views/RelatedChartsView.tsx`

### 11. Route-Level UX, Telemetry, And Persistence

Missing from `/primarie/$cui`:

- `useEntityViewAnalytics`
- `useRecentEntities`
- `EntityNotificationAnnouncement`
- `FloatingQuickNav`
- `mod+;` shortcut for opening report controls

Impact:

- `/primarie/$cui` visits do not populate recent entities the same way `/entities/$cui` does.
- `/primarie/$cui` does not emit the same route/view analytics behavior.
- `/primarie/$cui` does not show the delayed "Monitor this institution" announcement banner.
- `/primarie/$cui` loses the route-level quick navigation affordances present on `/entities/$cui`.

Primary references:

- `src/routes/entities.$cui.lazy.tsx`
- `src/hooks/useEntityViewAnalytics.ts`
- `src/hooks/useRecentEntities.ts`
- `src/features/notifications/components/EntityNotificationAnnouncement.tsx`

### 12. Interactive Prefetching And Performance Behavior

- Missing: debounced report-control prefetch parity.
- Missing: the `/entities/$cui` route loader's view-specific map/trend prefetch behavior.
- Different behavior: `/primarie/$cui` eagerly warms its always-visible campaign sections instead of mirroring the source route's interactive prefetch pattern.

Primary references:

- `src/routes/entities.$cui.tsx`
- `src/routes/entities.$cui.lazy.tsx`
- `src/routes/primarie/$cui/index.tsx`
- `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx`

### 13. Migration Leaks And Cross-Route Escapes

- Incomplete migration: some `/primarie/$cui` drill-down flows still route users back to `/entities/$cui`.
- Incomplete migration: subordinate cards intentionally open `/entities/$cui`, not deeper `/primarie/$cui` analysis.

Primary references:

- `src/features/challenges/components/analysis/challenge-entity-subordinates-section.tsx`

## Items That Should Not Be Counted As Missing

These are not current migration gaps based on the present source route behavior:

- `employees` view
- `ranking` view

Reason:

- They appear in the `/entities/$cui` switch, but they are not actually exposed by `useEntityViews()` today.

## Recommended Migration Checklist

Highest-priority parity items:

1. Restore SSR parity or intentionally document why `/primarie/$cui` remains CSR.
2. Preserve `entity.default_report_type` behavior instead of hard-defaulting to `PRINCIPAL_AGGREGATED`.
3. Add entity-specific SEO and dynamic image preview parity if `/primarie/$cui` is meant to replace `/entities/$cui`.
4. Reintroduce missing route-level features:
   - recent entities
   - view analytics
   - notification announcement
   - floating quick navigation
5. Decide whether `/primarie/$cui` should support the full `/entities/$cui` view set or whether those views remain intentionally excluded.
6. Close migration leaks that still send users back to `/entities/$cui`.

## Key Comparison Files

- `src/routes/entities.$cui.tsx`
- `src/routes/entities.$cui.lazy.tsx`
- `src/routes/entities.$cui.share-image[.]png.ts`
- `src/components/entities/validation.ts`
- `src/hooks/useEntityViews.tsx`
- `src/components/entities/views/Overview.tsx`
- `src/components/entities/views/MapView.tsx`
- `src/components/entities/EntityReports.tsx`
- `src/routes/primarie/$cui/index.tsx`
- `src/routes/primarie/$cui/index.lazy.tsx`
- `src/features/challenges/schemas/challenge-entity-analysis-route-search-schema.ts`
- `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx`
- `src/features/challenges/components/analysis/challenge-entity-analysis-header.tsx`
- `src/features/challenges/components/analysis/challenge-entity-reports-section.tsx`
