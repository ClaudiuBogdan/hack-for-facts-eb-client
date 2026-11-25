# PROC-001: Move the remaining legacy procurement reads to v3 before the public switch

**Status:** open (2026-11-25). **Priority:** P1, gate: before the public switch (root). **Owner:** procurement-da-client (root,
25 November 2026). **Related:** TEL-001; the server's `legacy-retired.ts` (SEC-GRANTS-PROC-2211, owner-approved 2026-11-22).

## Problem

With `PROCUREMENT_LEGACY_ENABLED=false`, the API on Chronos dev answers every legacy procurement record read with
`SERVICE_UNAVAILABLE` ("legacy procurement data is not served by this API; use the direct-acquisition release (procurementDa*) or
procurementTotals", reason `legacy_retired`). The legacy direct-acquisition list is retired too
(`PROCUREMENT_LEGACY_DA_LIST_ENABLED=false`). Analysis reads (`procurementStats`, `procurementSeries`, `procurementBreakdown`, …) still
answer the `direct_acquisition` grain from procurement v3. Their `contract` and `procedure` grains abstain: the block comes back with
`answerability: abstained` and no figures, and no error.

Checked on 2026-11-25 against the open dev API, with read-only calls:
- `procurementContracts`, `procurementContract`, `procurementProcedure` and `procurementDirectAcquisition` were refused as above;
- `procurementSupplierRecords` was refused (root);
- a supplier-scoped analysis read answered `direct_acquisition` and abstained on `contract`.

The client still sends these reads. Every one is marked `legacy: true` at its `graphqlQuery` call.

### In hand (25 November 2026, on root's word)

| | Page | Operation | Now | Change |
|---|---|---|---|---|
| a | `/procurement/direct-acquisitions/$id`, legacy id with no release match | `ProcurementDirectAcquisitionDetail`, `…Record` (`procurementDirectAcquisition`); `resolveLegacyLink` | refused: the page fails | the page's not-found state |
| b | the same page | `ProcurementDirectPurchaseAround` (`procurementDirectAcquisitions`) | refused, handled: no neighbours | read dropped |
| c | `/procurement/suppliers/$cui` | `ProcurementSupplierDirectNames` (`procurementDirectAcquisitions`) | refused, handled: no fallback names | moved to `procurementDaPurchases` |
| j | `/companies/$cui`, "Bani publici" | `ProcurementSupplierRecords` | refused: the band's detail fails ("Cifrele nu s-au încărcat") | DA from the v3 analysis grain and `procurementDaPurchases`; contracts from the contract-award winner reads |

### To move (this issue)

| | Page | Operation (root) | Now, from the code |
|---|---|---|---|
| d | `/procurement/suppliers/$cui` | `ProcurementSupplierRows`, `ProcurementSupplierPartners` (`procurementContracts`); the awards analysis fields (`contract` grain) | **refused, and not handled.** `readSupplierRows` throws. Its result is awaited in the profile's `Promise.all`, so the **whole supplier profile fails**, its direct purchases included. The awards analysis abstains. |
| e | `/procurement/contracts/$id` (also `/achizitii/contracte/$id`) | `ProcurementContractNotice`, `ProcurementContractPage` (`procurementContract`), `ProcurementContractAround` (`procurementContracts`) | refused. The server read fails (`{ id }`), the browser reads again, and the page shows its error state. Ids are legacy internal ids (e.g. `2311757`); v3 has no lookup from them to a contract-award record. |
| f | `/procurement/procedures/$id` | `ProcurementProcedurePage` (`procurementProcedure`) | refused: the same error state. v3 has no procedure read. |
| g | `/procurement` home: the big contracts and recent contracts lists; the buyer profile's contracts list | `fetchGroupedContracts` (`procurementContracts`) | home: refused, not handled (that list's query fails). Buyer profile: handled (`isLegacyOffAnswer`), no contracts listed. |
| h | the buyer profile's framework agreements | `ProcurementBuyerFrameworks` (analysis, legacy grain) | refused, handled: no figure |
| i | the entity page's Contracts view (`ContractsView` → `ProcurementAuthoritySlice`) | `ProcurementContracts` through `fetchAuthorityProcurementSliceLive` (recent contracts); `ProcurementAggregates` | refused. The slice's `Promise.all` fails, so the whole view shows its error state. The aggregates' `contract` blocks abstain. |
| — | `/procurement/analytics` (and `/procurement/categories/$code`, which redirects there) | analysis reads and `procurementRecords`, `contract` and `procedure` grains | abstaining. How the page shows it was not checked on screen. |

Not reachable on dev: the search cases for the procedures, direct-acquisitions and modifications grains in
`procurement-api.live.ts` (no caller sets `recordGrain`), and the `src/development` prototypes (`yarn dev` only).

## Impact

The public Chronos build runs this API configuration, so every page above fails or loses its contract figures for every reader. The
supplier page (d) is the worst case: a refused contract read takes the whole page down, the direct purchases with it.

## Fix

One plan per page goes to root first. Each page either moves to the contract-award v3 reads (per buyer, per winner, per record), is
redirected, or is removed, and some of these need the owner's call. The closure criterion: no client request marked `legacy: true` is
reachable from a served route; every page above shows only v3 figures or its own not-found or none state; tests cover each. Deployed to
Chronos dev.

## Log
- 2026-11-25 · opened · from the companies band failure (root); listed every reachable legacy read on client `dev` 5d93c166; dev API probes
  confirmed the refusals
