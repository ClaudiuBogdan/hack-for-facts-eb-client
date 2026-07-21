# Procurement Geography Filter Requirements

**Status:** Approved product requirements, implementation pending  
**Date:** 2026-07-17  
**Scope:** Client, server, and scraper/data layer

This document is mirrored in the client, server, and scraper repositories. Keep
the three copies aligned until one canonical cross-repository contract location
is chosen.

## Product decision

Procurement geography has two independent axes:

- **Buyer location:** the headquarters or linked administrative territory of
  the contracting public institution.
- **Supplier location:** the registered office of the awarded company.

These are entity locations. They do not claim to represent the place where a
contract is delivered or executed.

The first complete version supports **region, county, and UAT/SIRUTA** for both
sides. It allows one buyer location and one supplier location at a time. A buyer
and supplier selection combine with `AND` semantics.

## Questions the module must answer

| Scope | Questions |
| --- | --- |
| Buyer only | How many distinct public institutions in this territory awarded at least one procurement record? How many records did they award? Which CPV categories and supplier locations are involved? |
| Supplier only | How many distinct companies registered in this territory won at least one procurement record? How many records did they win? Which categories and buyer locations are involved? |
| Buyer and supplier | How many records went from institutions in territory X to companies in territory Y? How many distinct institutions and companies participated? Which categories dominate? |
| Geographic flows | What share of procurement by buyers in territory X went to local suppliers versus suppliers elsewhere? How did that change over time? |

The measures must remain distinct:

- “How many contracts/acquisitions?” means `recordCount`.
- “How many public institutions?” means whole-scope `distinctAuthorities`.
- “How many companies?” means whole-scope `distinctSuppliers`.
- “Which categories?” means a CPV breakdown.
- “What value?” means awarded value only, and only when the server answerability
  policy serves it. A blocked or unknown value remains `null`, never zero.

Monthly distinct counts must never be summed to fabricate a whole-scope distinct
count.

## Filter contract

The overview filter panel contains two separate sections:

1. **Public Institution Location**
   - Level: Region / County / UAT
   - Searchable single selection
   - Helper text: “Headquarters or administrative territory of the contracting
     institution.”
2. **Supplier Location**
   - Level: Region / County / UAT
   - Searchable single selection
   - Helper text: “Registered office of the awarded company.”

Requirements:

- Use stable API values in URL state: an opaque region key, county code, or
  SIRUTA code. Display labels are resolved separately and are not filter keys.
- Region, county, and UAT are mutually exclusive within each side. Selecting a
  new level replaces the previous selection for that side.
- The two sides are independent and combine with `AND`.
- Filter chips identify the side, for example `Public institution: Cluj County`
  and `Supplier: Oradea, Bihor`.
- No selection means all records, including records whose geography is unknown.
  A selected territory excludes unknown geography, while the UI still discloses
  the geography coverage of the answer.
- Supplier geography is unavailable for the procedure grain because procedures
  do not contain supplier-level awards. The control must explain this rather
  than silently ignoring the selection.
- The period filter composes with both geography filters.
- The same geographic scope must apply to headline indicators, categories,
  rankings, time series, analysis workspace, and record lists. Unsupported
  panels render an explicit unavailable state; they must not receive empty
  arrays or zeroes as a fallback.

## Verified current capability

Verified against the running Matrix v2 GraphQL API on 2026-07-17:

| Capability | Current state |
| --- | --- |
| Buyer region facts | Present through authority CUI → public entity → SIRUTA territory. |
| Buyer region analytics | Record counts, monthly series, and CPV breakdowns are served. |
| Buyer-region distinct institutions/companies | Not served; the region rollup does not retain authority/supplier keys. |
| Buyer county | Present in analysis facts, but no serving rollup exists. |
| Buyer UAT | `buyer_siruta` exists in facts, but is not exposed in the analysis scope or rollups. |
| Supplier geography | Not built; it requires supplier CUI → registered-office territory resolution. |
| Buyer × supplier geography | No cross-geography rollup or facts-backed serving route exists. |
| Geographic record-list filters | Not present in the offset-search GraphQL filters. |
| Region/county option resolution | `procurementResolve(region/county)` currently returns no hits. |

Live buyer-region coverage is degraded and must be disclosed:

- Contracts: `0.7508` known buyer geography; `0.2492` unknown.
- Direct acquisitions: `0.5988` known buyer geography; `0.4012` unknown.

As a working proof, contract scope `buyerRegion: "Nord-Vest"` currently serves
`205672` records and a CPV breakdown. It does not serve distinct-authority,
authority-ranking, supplier-ranking, or supplier-geography answers under that
scope. Awarded-value answers remain independently blocked by the spend gate.

## Target data and API capabilities

The data layer must provide canonical, provenance-carrying geography for both
parties:

- Buyer: `buyer_siruta`, buyer county code, and buyer region.
- Supplier: `supplier_siruta`, supplier county code, and supplier region,
  derived from the company’s registered office.
- Missing or ambiguous mappings remain an explicit unknown bucket with measured
  coverage; no name-only guess may be presented as verified geography.

The serving contract must support:

- Buyer and supplier region, county, and SIRUTA fields in the common analysis
  scope.
- The same fields in contract/direct-acquisition record-list filters.
- One buyer geography plus one supplier geography in a combined scope.
- Whole-scope distinct authority and supplier counts.
- Buyer- and supplier-geography breakdown dimensions, so either selected side
  can be compared with all territories on the opposite side.
- CPV breakdowns and time series under buyer-only, supplier-only, and combined
  geography scopes.
- Stable, searchable territory options with values and display labels.
- The existing `ProcurementAnswerMeta` behavior for geo coverage, unknowns,
  degradation, abstention, build provenance, and caveats.

The combinations matrix must explicitly advertise or reject every supported
shape. Whether the implementation uses additional rollups, retained party keys,
mergeable distinct-count state, or bounded facts queries is a data/API design
decision; the product contract above must not be weakened silently to fit a
particular storage strategy.

## Parallel workstreams

### Client preparation

The client can prepare the URL schema, two-sided selector component, active
filter summaries, and capability-driven unavailable states. It must not send a
supplier/county/UAT scope that the live API rejects.

Buyer region is only partially usable with the current API. The existing landing
query asks for party rankings that fail under a buyer-region scope, and record
search cannot accept geography. A buyer-region-only client release would
therefore need scoped queries and explicit unavailable panels; it would not yet
satisfy the complete global-filter requirement.

### Data and API investigation

The scraper/data investigation determines current buyer and supplier geography
sources, coverage, provenance, ambiguity, and the safest serving strategy for
all required levels and combinations. The server work then exposes only the
matrix combinations the data layer can prove and serve within its performance
budget.

## Acceptance criteria

- A shared URL can reproduce one buyer and one supplier geography selection.
- Changing either selection updates every supported aggregate and the record
  list with the same scope.
- Buyer-only, supplier-only, and combined questions above are answerable for
  contracts and direct acquisitions.
- Procedure views support buyer geography and explain why supplier geography is
  unavailable.
- Region, county, and UAT option values are stable identifiers with resolved
  labels.
- Distinct institutions and companies are whole-scope answers, not sums of
  monthly distincts.
- Unknown geography and coverage remain visible and are never coerced to zero.
- Awarded value is shown only when its answerability block is served or degraded;
  abstained value remains unavailable.
- Unsupported combinations fail explicitly; the client never silently falls
  back to unfiltered, empty, or mock data.
