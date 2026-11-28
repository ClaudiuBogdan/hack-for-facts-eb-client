# PROC-003: Stop the analytics contract tabs sending filters the money build refuses

**Status:** open (2026-11-28). **Type:** defect. **Priority:** P2, before the public switch. **Owner:** procurement-da-client.
**Related:** PROC-002 (the supplier place, the same shape), PROC-KB0Z (scrapper), TEST-001, owner 26 Nov: the analytics contract
and framework tabs are "Decide at launch".

## Problem

Since 14:57Z on 28 November 2026 the dev API answers the contract grain from the money build (procurement-da-api, image e4522ea8,
`PROCUREMENT_CA_ANALYSIS_ENABLED`). For now it refuses these scope fields on contract-grain stats, series and breakdowns, with
`INVALID_INPUT` (field `scope`):
- `buyerRegion`, `buyerCounty`, `buyerSiruta`;
- `q` (title search);
- `valueMin`, `valueMax`;
- `status`, `procedureType`;
- the supplier place fields (PROC-002).

Example, probed on dev: "buyer county is not available for contract awards from the money build yet", and the same for title
search.

On `/procurement/analytics?tip=contracte|acorduri`, picking a buyer place, typing title words or setting a value range sends
those fields, so the page's reads fail and the reader sees errors in place of figures. The direct purchases' tab is unaffected.

Found by TEST-001's strict run of `procurement-analytics.spec.ts` after re-recording, on 28 November 2026. Six tests read refused
contract-grain reads:
- AnalyticsFigures (34);
- AnalyticsSeries (14);
- AnalyticsRanking (1);
- AnalyticsConcentration (1).

The fields involved were `buyerCounty` 20, `q` 28, `supplierSiruta` 5, `valueMin` 3, `buyerRegion` 2 and `buyerSiruta` 2.
The recorder keeps no error answer, so these reads have no fixture.

## Impact

Every reader of the contract and framework tabs who uses one of those filters, on Chronos dev now and in production if launched
as is. The spec passes in CI's passthrough mode (the refusals come through and the page shows its error state), but it can't run
strict, so the TEST-001 guard can't come back for it until this is fixed.

## Fix (to agree with root; the tabs are the owner's "decide at launch")

- On the contract grain, while the API refuses a field, the filters sheet doesn't offer it and says why in one line. An address
  that carries one drops it and says so, rather than sending a refused read (as PROC-002 does for the supplier place).
- When procurement-da-api serves a field (slice b and after), it comes back. A served capability flag would let the page follow
  the API, not a client list.
- Tests: each refused field absent on the contract tabs and present on the direct tab, and an old address dropping it. The spec's
  six tests re-recorded, then strict.

Closed when, on Chronos dev, the contract and framework tabs send no field the API refuses, and `procurement-analytics.spec.ts`
passes strict.
