# Phase A — Procurement spine (implemented)

> Status: **shipped in client** (2026-07-19)  
> Depends on: live GraphQL analysis + search (no new rollups)

## Goal

Make the product spine match [`docs/ux-research/procurement.md`](../../ux-research/procurement.md): look up an institution, look up a company, explore the domain — before more dashboard analytics.

## Delivered

| Surface | Route / mount | Notes |
| --- | --- | --- |
| Institution page | `/procurement/institutions/$cui` | Buyer KPIs, top suppliers, CPV, timeline, recent contracts |
| Supplier page | `/procurement/suppliers/$cui` | First-class wrapper around `ProcurementSupplierSlice` |
| Entity slice | `/entities/$cui?view=contracts` | Replaces SICAP.ai iframe with live authority slice |
| Hub IA | `/procurement` | Unified URL: `view=overview\|list`; shared filters |
| List layout | `/procurement?view=list` | Record search (legacy `/procurement/search` redirects here) |
| Ranking links | party rankings | Hub → institution/supplier pages; on institution/supplier slices, top counterpart rows → pair List (`view=list` + `authority_cui` + `supplier_cui` + grain + `sort=value_desc`) |

Ranking card UX (show 5 + sheet, API-honest depth, Preview, pair drill-down):
[`docs/specs/procurement-ranking-cards-requirements.md`](../../../specs/procurement-ranking-cards-requirements.md)

Hub default period (previous calendar year, always disclosed):
[`docs/specs/procurement-overview-period-requirements.md`](../../../specs/procurement-overview-period-requirements.md)

Shared hub scope (A2/B1/C1/D3/F2/F3):
[`docs/specs/procurement-shared-hub-scope-requirements.md`](../../../specs/procurement-shared-hub-scope-requirements.md)

## Key files

- `src/features/procurement/components/procurement-authority-slice.tsx`
- `src/features/procurement/components/procurement-institution-page.tsx`
- `src/features/procurement/components/procurement-supplier-page.tsx`
- `src/components/entities/views/ContractsView.tsx`
- `src/routes/procurement/institutions/$cui.{tsx,lazy.tsx}`
- `src/routes/procurement/suppliers/$cui.{tsx,lazy.tsx}`

## Out of scope (see Phase B / C)

- Buyer-region party rankings under geography filter
- Search-list geography / wired review signals
- Dedicated `/procurement/analytics`, compare, map
