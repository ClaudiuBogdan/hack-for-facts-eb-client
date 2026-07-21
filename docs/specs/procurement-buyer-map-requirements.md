# Procurement Buyer Map Requirements

**Status:** Approved — M0 spec; M1 region Preview in client; shared hub `measure` + `mapGrain`  
**Date:** 2026-07-21  
**Aligned with:** PNRR map UX, hub scope (A2/B1), geography filter requirements, Phase C analytics

## Product intent

Journalists need a **buyer-geography choropleth** to see where public purchasing concentrates, then drill into a territory without losing period/grain scope. The map reuses [`InteractiveMap`](../../src/components/maps/InteractiveMap.tsx) (same stack as PNRR): polygon choropleth, metric series, click → context drawer → hub CTAs.

**Locked product rules** ([`docs/ux-research/procurement.md`](../ux-research/procurement.md) §9):

| Rule | Decision |
| --- | --- |
| Side | **Buyer only** — no supplier map |
| Default metric | **Record count** (value secondary / gated) |
| Home | `/procurement?view=map` — peer hub tab (not Overview hero) |
| Hub | Overview / **Map** / List share one URL schema |
| Honesty | Never paint unknown geography as zero; never pretend list is geo-filtered (B1) |

### Rejected

| Alternative | Why |
| --- | --- |
| Supplier choropleth | Territory not resolved in facts |
| Contract point markers | Scale + noise; not the investigation job |
| Jump-to-list as only click | Loses summary context (PNRR lesson) |
| Fake county/UAT colors from region approximation | Dishonest grain |

## Geography levels

| Level | Status | Visualization | Filter apply on click |
| --- | --- | --- | --- |
| **Region (8)** | **M1 live (Preview)** | County polygons painted with **parent region** value from `buyerRegion` breakdown | Sets `buyerRegion` |
| **County (42)** | **Toggle live; paint TODO** | Empty choropleth + honesty until wave-2 `buyer_county` rollup | Sets `buyerCounty` |
| **UAT** | **Toggle live; paint TODO** | UAT GeoJSON + empty paint until `buyer_siruta` + `referenceTerritories` | Sets `buyerSiruta` |

Shared URL key: `mapGrain=region|county|uat` (default `region`). Toggle is enabled on Map and in the shared filter sheet.

## Metric series

| Series ID | Label | Default | Notes |
| --- | --- | --- | --- |
| `record_count` | Record count | Yes | From breakdown `recordCount` |
| `value_awarded` | Awarded value (RON) | No | Only when meta allows; never coerce null → 0 |

Shared hub URL key: `measure` (same across Overview / Map / List). Also: `grain` (contracts / DA), period (E1 soft default previous year). Period is shown only via active-filter chips — not duplicated on the map.

## Filters ↔ map

| Filter | Map effect |
| --- | --- |
| Period / dates | Scope for analysis request (chips only — no map period line) |
| `grain` | Contracts vs DA block |
| `measure` | Count vs awarded value series |
| `mapGrain` | Map-tab polygon level only (not a global filter) |
| `buyerRegion` / `buyerCounty` / `buyerSiruta` | Written only via drawer Apply CTAs |
| List-only facets | Ignored for paint; chips say “List only” on Overview/Map |

## Click contract

1. Click polygon → open **territory drawer** only (local UI state). **Do not** write global buyer geo filters on click.
2. Drawer shows: name, record count (+ value if answerable for region), coverage/caveats.
3. Primary CTA: **Apply on Overview** → set `buyerRegion` / `buyerCounty` / `buyerSiruta`, `view=overview`.
4. Secondary CTA: **Apply on List** → `view=list` + geo keys with B1 chip **“Not applied yet”**.
5. `mapGrain` (Region / County / UAT) is Map-tab chrome in the URL — not a global filter sheet or chip.

Shared URL key: `mapGrain=region|county|uat` (default `region`). Toggle lives on the Map toolbar only.

## Coverage disclosure

Always show a status line that records without known buyer geography are **excluded** from the choropleth (not painted as zero). Surface analysis `meta.answerability` / caveats when present. For county/UAT, show Preview honesty that colours are not published yet.

## Surfaces

| Surface | Route / mount |
| --- | --- |
| Full map | `/procurement?view=map` (hub Map tab) |
| Filter sheet | Shared period, metric, buyer location, list facets (no mapGrain) |
| Map toolbar | Region / County / UAT detail (`mapGrain` URL) |
| Overview | Rankings + charts; respects `measure` labels where data exists |
| Legacy | `/procurement/analytics` → redirect to `?view=map` |

## Phased delivery

### M0 — Spec (this document)

### M1 — Region Preview + shared filters (client)

- Region choropleth via county polygons + `buyerRegion` breakdown
- Shared `measure` in hub URL / filter sheet / chips
- `mapGrain` Map-tab chrome only; county/UAT paint stubbed with TODO
- Territory drawer mini-Overview (buyers, suppliers, CPV, monthly) via
  `fetchProcurementTerritoryOverview` — client assumes party rankings under
  geo are served; cards surface GraphQL errors until API TODOs land
- Drawer inspect on click; Apply on Overview / List CTAs (B1-honest)

### M2 — County map (blocked on wave-2)

- TODO(Wave-2 buyer_county rollup): live county choropleth + county-precise drawer stats

### M3 — UAT map (blocked on siruta scope)

- TODO(buyer_siruta + referenceTerritories): UAT choropleth + SIRUTA panels

## Component sketch

```
ProcurementOverviewPage (/procurement)
  ├─ shared filter sheet (period, measure, buyer geo, list facets)
  ├─ view=overview → rankings / charts / workspace
  ├─ view=map → ProcurementMapView
  │     ├─ MapToolbar (analysis grain + mapGrain detail)
  │     ├─ InteractiveMap (County or UAT geo)
  │     ├─ Legend + coverage status
  │     └─ ProcurementTerritoryDrawer (Apply CTAs)
  └─ view=list → ProcurementSearchContent
```

## Related

- Hub scope: [`procurement-shared-hub-scope-requirements.md`](./procurement-shared-hub-scope-requirements.md)
- Geography filters: [`procurement-geography-filter-requirements.md`](./procurement-geography-filter-requirements.md)
- Phase C: [`../design/procurement/features/phase-c-analytics-depth.md`](../design/procurement/features/phase-c-analytics-depth.md)
- Phase B: [`../design/procurement/features/phase-b-honesty-filters.md`](../design/procurement/features/phase-b-honesty-filters.md)
