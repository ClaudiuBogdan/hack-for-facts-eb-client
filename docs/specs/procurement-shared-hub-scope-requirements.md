# Procurement Shared Hub Scope Requirements

**Status:** Approved — Phase 1 implementation  
**Date:** 2026-07-21  
**Codes:** A2, B1, C1, D3, F2, F3 (plus E1 period default)

## Product intent

Overview and List are **one investigation, two layouts** on `/procurement`:

| Layout | Job |
| --- | --- |
| `view=overview` | Aggregates (tops, categories, trend, headline) |
| `view=list` | Paginated records for the same URL scope |

Filters must **not disappear** when switching layouts. Missing API capabilities stay visible with Preview/TODO honesty — never silently dropped.

## Locked decisions

| Code | Decision |
| --- | --- |
| **A2** | One **unified URL schema** for the hub. |
| **B1** | Unsupported filters stay visible + Preview/TODO + “not applied to list/overview”. |
| **C1** | List-only params stay in the URL on Overview; shown as inactive **“list only”** chips. |
| **D3** | One **full shared filter sheet** (unfinished controls marked, not deferred). |
| **F2** | Search is header `q` + `view=list`, not a separate product page. Redirect `/procurement/search` → `/procurement?view=list&…`. |
| **F3** | Collapsed **dev readiness panel** (DEV or `VITE_PROCUREMENT_DEV_PANEL`). |
| **E1** | Soft default period = previous calendar year; `period=all` = explicit all-time. |

### Rejected

| Alternative | Why |
| --- | --- |
| A1 subset mapper between two schemas | Drifts; user sees dropped filters |
| B3 hide unsupported filters | Violates “don’t drop on switch” |
| C3 drop list-only on Overview | Loses investigation context |
| Separate Search tab/page | Two mental models; params get lost |
| Fake geo-filtered lists | Dishonest |

## URL contract

Single route `/procurement` with unified params (see `src/schemas/procurement-hub.ts`):

- **Layout:** `view` (`overview` | `list`), `q`
- **Shared:** `grain`, `dateFrom`, `dateTo`, `period`, `buyerRegion`, `buyerCounty`, `supplierRegion`, `supplierCounty`
- **List-oriented:** `authority_cui`, `supplier_cui`, `cpv`, `cpv_division`, `source`, `status`, `value_state`, `valueMin`, `valueMax`, `sort`, `page`, `pageSize`, `signal`

View switch never strips keys. `cleanProcurementHubSearch` only removes empties/defaults.

### Period resolution (E1)

1. `period=all` → no month bounds  
2. Else explicit dates → those months  
3. Else → previous calendar year (soft default)

Resolved dates drive **both** aggregates and list queries.

### Header `q` (F2)

Committing `q` on overview sets `view=list`. Aggregates do not use `q` until API supports it (TODO + matrix row).

### Geography (B1)

- Buyer region/county: applied to **overview aggregates**; **not** sent to list GraphQL filters until API supports it. Chip: “Not on list yet”.
- Supplier geography: Preview + TODO; not applied to either layout until wired.

## Shared filter sheet (D3)

One sheet for both views with all sections (period, grain, buyer/supplier location, parties, CPV, value, source/status/signal). Unfinished controls show Preview and stay interactive for URL round-trip where safe, or disabled with explanation.

## Chips (C1 + B1)

- Period always shown.
- Applied shared filters: normal chips.
- List-only on overview: suffix “List only”.
- Not applied to current view: suffix “Not on list yet” / equivalent.
- Clear removes the URL key for both views.

## Dev readiness panel (F3)

Collapsed checklist of capability × overview/list × live|TODO. Gated by `import.meta.env.DEV` or `VITE_PROCUREMENT_DEV_PANEL=true`.

## Acceptance

1. Overview ↔ List never drops URL filters.  
2. Shared sheet exposes all hub filters; unfinished marked Preview/TODO.  
3. Period soft-default applies to both layouts; `period=all` is explicit.  
4. Buyer location on list: visible, not applied to query.  
5. List-only facets visible on overview as “list only”.  
6. `/procurement/search?...` redirects to `/procurement?view=list&...`.  
7. Dev panel available when flag/DEV enabled.  

## Related

- Period: [`procurement-overview-period-requirements.md`](./procurement-overview-period-requirements.md)  
- Ranking / pair drill: [`procurement-ranking-cards-requirements.md`](./procurement-ranking-cards-requirements.md)  
- Geography product: [`procurement-geography-filter-requirements.md`](./procurement-geography-filter-requirements.md)  
- Spine design: [`../design/procurement/features/phase-a-spine.md`](../design/procurement/features/phase-a-spine.md)  
- Search listing design: [`../design/procurement/features/procurement-search-listing.md`](../design/procurement/features/procurement-search-listing.md)
