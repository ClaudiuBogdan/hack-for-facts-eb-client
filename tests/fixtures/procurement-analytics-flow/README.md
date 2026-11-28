# procurement-analytics-flow fixtures

`tests/integration/procurement-analytics.spec.ts` reads everything else, the server render's reads and the browser's, from the
recorded ssr-api store (`tests/fixtures/ssr-api`, TEST-001).

These five are the exception. They are the dev API's answers to the reads the place-search test makes once a firm's place is
picked: contracts and framework agreements by supplier geography. The API refuses them while D6 withholds supplier geography
(`INVALID_INPUT` on `supplierSiruta`, "supplier geography is withheld…"), and the ssr-api store records no error answer, so the
test answers them through `mockApi`. `supplier-place-withheld.json` lists each one's operation, variables and fixture.

Recorded on 28 November 2026, through the page's own queries, at the analysis build the store's recorded `ProcurementCutoff`
gives (the browser asks with it). Re-record them together with the store when that build changes.
