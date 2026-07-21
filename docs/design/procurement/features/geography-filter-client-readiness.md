# Procurement Geography Filter: Client Readiness

**Status:** Initial buyer-region integration implemented; broader matrix pending  
**Date:** 2026-07-17  
**Product requirements:**
[`docs/specs/procurement-geography-filter-requirements.md`](../../../specs/procurement-geography-filter-requirements.md)

## Outcome

The procurement overview filter sheet is designed around two independent location
sections:

1. **Public Institution Location** — headquarters or linked administrative
   territory of the contracting institution.
2. **Supplier Location** — registered office of the awarded company.

Each side supports one Region, County, or UAT selection. The two selected sides
combine with `AND`. The existing date range composes with both.

The first client slice now uses the live reference API for region and county
options. Buyer region is applied exactly. Buyer county is an explicitly labelled
regional approximation because the county rollup is not published. Unsupported
supplier geography is explained but cannot be selected.

## Selector data source

Use the server's reference module, not `procurementResolve`, for the option
catalog. The following live query was validated on 2026-07-17:

```graphql
query ProcurementGeoOptions($filter: ReferenceTerritoryFilter!) {
  referenceRegions {
    region
    countyCount
    uatCount
  }
  referenceCounties {
    countyCode
    countyName
    region
    uatCount
  }
  referenceTerritories(filter: $filter, first: 20, sort: name) {
    totalCount
    edges {
      node {
        territorialSirutaCode
        name
        countyCode
        countyName
        region
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

The live response contains 8 regions and 42 counties. UAT search supports
server-side name matching, an `isUat` predicate, and optional county or region
constraints. Store these stable values:

| Level | URL/API value | Display label |
| --- | --- | --- |
| Region | `ReferenceRegion.region` | region name |
| County | `ReferenceCounty.countyCode` | `countyName` |
| UAT | `Territory.territorialSirutaCode` | `name`, with county beneath it |

All raw reference responses must be Zod-parsed before becoming selector
options. Region and county lists may use a long query cache lifetime. UAT
results should be debounced, paged, and fetched only while the picker is open.

## Panel interaction

Keep the current PNRR-style side sheet and period section. Add one reusable
`ProcurementGeographyField` for each party side.

Each field contains:

- a level control: Region / County / UAT;
- a searchable single-select picker;
- a selected-value card with a clear action;
- helper text explaining which entity address is being filtered;
- an inline loading, error, retry, and no-results state.

Changing the level clears the previous value for that side. Selecting buyer
geography does not clear supplier geography, or vice versa. The filter trigger
badge counts period, buyer geography, and supplier geography as separate active
filter groups.

The overview shows removable chips outside the sheet, for example:

- `Public institution: Cluj County`
- `Supplier: Oradea, Bihor`

Labels are presentation data. Only stable keys go into the URL and GraphQL
variables.

## URL state

Extend the overview search schema with these optional, mutually exclusive keys:

```text
buyerRegion     buyerCounty     buyerSiruta
supplierRegion  supplierCounty  supplierSiruta
```

Rules:

- At most one geography key is retained per side.
- Buyer and supplier keys may coexist and mean `AND`.
- Invalid or empty values normalize to absent.
- A shared URL must resolve its label from the reference API; the label is not
  duplicated in the URL.
- Existing `dateFrom` and `dateTo` behavior remains unchanged.

## Analytics boundary

Selector availability and procurement answerability are separate concerns.
The reference API can populate every selector today, but the procurement API
cannot yet apply every chosen scope.

| Selection | Safe current behavior |
| --- | --- |
| Buyer region | Can scope stats, record/value series, and CPV breakdowns for supported grains. |
| Buyer county | Keep behind capability state until a county rollup is served. |
| Buyer UAT | Keep behind capability state until SIRUTA is added to the analysis scope. |
| Supplier region/county/UAT | Keep behind capability state until supplier geography is built. |
| Buyer + supplier | Keep behind capability state until the combination matrix supports it. |

The current landing request cannot simply receive `buyerRegion`: it requests
authority and supplier rankings in the same GraphQL operation, and those
breakdowns are rejected for that scoped rollup. A single rejected field makes
the landing request fail.

Before applying buyer region, split or conditionally compose the overview data
requests so each panel asks only for a supported matrix combination. Panels
that are unavailable for the active scope need an explicit message such as
“This breakdown is not available for the selected geography.” They must not be
fed an empty array, zero, or unfiltered data.

The record list cannot honestly participate until the procedures/contracts/
direct-acquisitions filters accept the same geography keys. Until then, the
client must label the overview-only limitation; it must not claim a global page
filter.

## Implemented initial client slice

The first client implementation is narrow and reversible:

1. Zod-parse and long-cache live reference region and county vocabularies.
2. Persist mutually exclusive buyer region/county keys in URL state.
3. Provide a searchable buyer selector, active summary, clear actions, loading,
   retry, and no-results states.
4. Apply buyer region to stats, CPV categories, and monthly series.
5. Omit unsupported party-ranking fields and show explicit unavailable panels.
6. Resolve a selected county to its parent region and disclose that approximation
   in the panel and active-filter summary.

Next: add UAT search, supplier geography, exact county filtering, combined
buyer/supplier scope, and record-list filtering only when their serving contracts
become live and validate against Matrix v2.

Likely client files:

```text
src/schemas/procurement-overview.ts
src/features/procurement/api/graphql/procurement-reference-queries.ts
src/features/procurement/api/procurement-reference-api.ts
src/features/procurement/hooks/use-procurement-geography.ts
src/features/procurement/components/procurement-geography-field.tsx
src/features/procurement/components/procurement-overview-filter-sheet.tsx
src/features/procurement/components/procurement-overview-page.tsx
```

Names may be adjusted during implementation to match the final server
capability surface. Avoid a new shared/global geography abstraction until this
contract is proven by the procurement use case.

## Client acceptance checks

- Region and county choices come from the live reference API.
- UAT search is debounced, paged, and stores territorial SIRUTA, not a label.
- One geography value per side survives URL reload and resolves its label.
- Buyer and supplier selections coexist with `AND` semantics.
- Period and geography filters compose without losing either state.
- Unsupported choices and panels explain their limitation explicitly.
- No unsupported scope is sent, and no failed response falls back to empty or
  unfiltered data.
- When a scope is enabled, every affected GraphQL document validates against
  the live server and every supported overview panel receives that same scope.
