# Approved-budget client readiness — 2 October 2026

Checked against authoritative Chronos namespace f1f7d96a-a6ae-45d9-9927-b92352a86266, production DB transparenta_prod/system7650223665352777749 using explicit read-only transaction. No API/DB/schema changes.

## Database: available

budget.approved_budget_lines contains the reviewed seven editions 2019–2025:

| Edition | Lines | Approved | Forecast |
|---|---:|---:|---:|
|2019|31028|14377|16651|
|2020|27104|12666|14438|
|2021|23633|8403|15230|
|2022|24410|8645|15765|
|2023|25302|9181|16121|
|2024|24220|8754|15466|
|2025|24810|8976|15834|

Total180507. Actual2019productionaudit evidence/live/run/audit-report.json under experimental/mfp-approved-2019-deploy-20260930:0failures,180507expected=stored,488negativecaught/16positiveclean. 2018deployment is active in the existingOpus session; at thisDBsnapshot2018wasnotinthe reviewedlinestable. Older years remain pending in this lane. The separate legacy approved_budget_facts has2015–2026rows, but that does not substitute for reviewed-line admission.

## API: existing facts reader, audited lines not yet exposed

Read-only POSTquery tested:

```graphql
query ClientBudgetReadiness {
  budgetApprovedFacts(page: 1, pageSize: 1) {
    items { factId budgetYear measureYear budgetComponent label measureKind amountValue unit }
    total estimated caveats
  }
}
```

- https://dev-chronos-api.transparenta.eu/api/v1/graphql:HTTP200,datareturned (2026 external_grants estimate2028,amount0,unitthousand_lei).
- https://api.transparenta.eu/api/v1/graphql:HTTP404NotFound.
- DevintrospectionHTTP403; no claimthatqueryschemaenumeratedlive.
- Actualserver reader src/modules/budget/shell/repo/catalog.ts:listApprovedBudgetFacts selects budget.approved_budget_facts. No approved_budget_lines reader found in server src.
- Dev configuredbrowserorigin https://dev-chronos.transparenta.eu; localhostclientneedsappropriateexistingproxy/originconfiguration,notassumedCORSavailability.

## Before connecting the approved-edition client

Add a read-onlyserver query for budget.approved_budget_lines, with edition/fund/form/authority/measure/targetyear filters and pagination. Preserve source fields needed by client:budget_year,measure_year,publication,fund,form,authority_code/name,hierarchycodes,label,row_role,credit_type,context,amount/string,unit andsourceprovenance. Amount is thousand_lei; do not display raw amount as lei. Editionyear and forecasttargetyear remain separate. Rows include totals/subtotals/details and commitment vs budget credits; an unfilteredsum double-counts them. Proposedendpointnaming/design remains to be reviewed, not implemented here.

Client can begin layout and typeddata-contract work now. Audited-data integration requires this API slice, API output verifiedagainstDB, deployment todev, then browserintegration. PublicAPI rollout is separate. No needwaitforolder-yearqualificationtobuild2019–2025client.
