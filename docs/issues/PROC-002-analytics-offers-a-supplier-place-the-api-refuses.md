# PROC-002: Hide the analytics page's firm-place filter, which the API refuses

**Status:** open (2026-11-28). **Type:** defect. **Priority:** P2, before the public switch. **Owner:** procurement-da-client
(root, 28 November 2026: PROC-KB0Z's next small step after step 1). **Related:** PROC-KB0Z (scrapper), TEST-001.

## Problem

On `/procurement/analytics`, the filters sheet offers "Locul firmei" (the supplier's place) on the contracts and framework
agreements tabs. Picking a place sends the page's reads with `supplierSiruta`:
- `AnalyticsFigures` (contracts and frameworks);
- `AnalyticsSeries`;
- `AnalyticsRanking`;
- `AnalyticsConcentration`.

The dev API refuses each one with `INVALID_INPUT` (field `supplierSiruta`): "supplier geography is withheld: the organization
registry does not currently classify every servable supplier identifier as public". So the reader can pick a filter that only
produces errors. Seen on Chronos dev on 28 November 2026 (analysis build 1795692846658728), in the TEST-001 recording of
`procurement-analytics.spec.ts` › "the filters sheet's place search takes the keys".

The direct purchases' tab already leaves the firm's place out. The contracts' tabs don't.

## Impact

A reader sees errors in place of figures, with nothing on the page saying why. This affects every reader of the contracts' and
frameworks' views who uses the filter.

**Not a D6 gate (procurement-da-api, 28 November 2026).** The analysis API serves no supplier geography on any grain, and no
field says so:
- the direct-acquisition grain always refuses `supplierRegion`, `supplierCounty` and `supplierSiruta` (server
  `da-v3-analysis-source.ts:544-546`, capability `supplierGeography` false), because the release carries no supplier place
  (design D4/M3);
- the contract grain being built from the money build (PROC-KB0Z slices a/b) will have `supplierGeography` false too;
- `ProcurementAnswerMeta` has no capabilities field, and there's no capabilities query.

So the D6 status can't gate it. A refused read fails the page's whole request, so the client must not probe either.

## Fix

- Hide "Locul firmei" on every tab, and say why in one line (the sources the API serves don't give the firm's place). With no
  served field to read, it's hidden outright. If the API later adds a capability flag (procurement-da-api offered
  `capabilities.supplierGeography` on the answer meta), the filter follows it.
- An address that already carries `localitate_firma` (a shared link) drops the filter, and the page says so, rather than send
  the refused reads.
- Tests: the filter absent and the reason shown on every tab; an old address with the key drops it and says so. The place-search
  integration test asserts the absence (its five refusal fixtures go with it).

**Decision (root, 28 November 2026):** hide it outright, with the one-line reason, and drop `localitate_firma` from old addresses
with the note. The served capability flag comes after the launch.

Closed when, on Chronos dev, the analytics page offers no firm-place filter and sends no `supplierRegion`, `supplierCounty` or
`supplierSiruta` read.
