# Phase C — Analytics depth (roadmap)

> Status: **deferred** until Phase B honesty filters land and coverage gates allow  
> Primary route: `/procurement/analytics` (not implemented)

## Goal

Give journalists and researchers a dedicated aggregate surface without turning the hub into a BI dashboard. Hub stays lookup-first (Phase A); this page owns advanced group-by, share ratios, concentration, export, and (later) map/compare.

## Prerequisites

1. Phase A spine live (institution + supplier pages).
2. Phase B: geography on search + key-retaining region answers; signals optional.
3. Answerability gates stay adjacent to every KPI (no silent spend when abstained).

## Surfaces

### `/procurement/analytics`

Reuse existing GraphQL analysis operations already exposed by the API:

| API | UX use |
| --- | --- |
| `procurementStats` | Scoped KPI strip |
| `procurementSeries` | Time chart (month/quarter/year) |
| `procurementBreakdown` | Top-N tables by dimension |
| `procurementConcentration` | HHI / top-1 / top-5 share |
| `procurementShare` | Validated ratio of two scopes |
| `procurementFacets` | Multi-panel facet board (avoid N+1 breakdowns) |

**Default grain:** contracts + direct acquisitions toggle (same as hub).  
**Blocked dims:** hide or show blocker reasons from the capability matrix — never invent supplier geography before territory resolution is published.

### Competition metrics (data-dependent)

- Project SEAP offer-count fields (e.g. offers received) onto contracts in the serving model.
- Then: single-bidder rate, offer-count distributions, procedure competition charts.

### `/procurement/compare`

Side-by-side two institutions or two suppliers using the same stats/series/breakdown bundle (two scopes). Power-user; builds on institution/supplier pages.

## Map

Buyer-county / UAT choropleth only after wave-2 rollups and geo coverage pass honesty floors. Until then:

- **M1 (client):** region Preview map at `/procurement?view=map` — see [`procurement-buyer-map-requirements.md`](../../../specs/procurement-buyer-map-requirements.md)
- Map is a hub tab (Overview / Map / List); keep it off Overview hero until county/UAT + coverage floors

### Cross-domain Entity 360

Supplier/authority chips (`pnrr`, investments, litigation, money flows) when contributors return non-null — live currently serves `crossDomain: null`.

## Client sketch (when starting)

1. Route: `src/routes/procurement/analytics.tsx` + lazy page.
2. URL state: grain, scope (CUI / CPV / region / dates), dimension, measure, topN — shareable.
3. Compose existing `ProcurementStatTile`, rankings, monthly chart, answerability notice.
4. CSV export of the active breakdown table.
5. Entry from hub quick links + institution/supplier “Analyze further” CTA.

## Non-goals

- Merging grains into one list
- Unguarded value-ranked leaderboards as the default
- Supplier territory filters before registry resolution
- Replacing `/procurement/search` with analytics

## References

- Product intent §4.4: [`docs/ux-research/procurement.md`](../../ux-research/procurement.md)
- Concentration feature note: [`supplier-concentration-analysis.md`](./supplier-concentration-analysis.md)
- Phase B blockers: [`phase-b-honesty-filters.md`](./phase-b-honesty-filters.md)
