# Procurement GraphQL API — Client Spec (v1)

> **Audience:** server team (`hack-for-facts-eb-server`).
> **Status:** client-side contract the rebuilt procurement UI is implemented against.
> The client live adapter (`src/features/procurement/api/procurement-api.live.ts`) is written
> and unit-tested against this spec; flipping `PROCUREMENT_LIVE_API_READY` in
> `src/features/procurement/lib/mock-mode.ts` switches the feature from mocks to this API.
>
> **This is a delta, not a green-field spec.** A `procurement` GraphQL module already exists
> (`hack-for-facts-eb-server/src/modules/procurement`, see
> `docs/procurement-prod-schema-reference.md` §2) with queries like `procurementContracts`,
> `procurementTopSuppliers(authorityCui, …)`, `procurementGrainQuality`, `procurementResolve`.
> This document specifies the surface the client needs; where existing queries differ (flat
> args vs. the `scope:` object below, missing filter inputs, missing detail bundles), we ask
> the server team to either migrate or confirm the existing shape so the client adapter can
> match. The client isolates all arg-shape knowledge in
> `src/features/procurement/api/graphql/procurement-filters.ts` + `procurement-queries.ts`,
> so an arg-shape decision only touches those two files.

## Conventions (match the parliament module)

- Query names are prefixed `procurement*`.
- Filter inputs use operator objects: `{ eq }`, `{ in }`, `{ contains }`, `{ gte, lte }`.
- `Date` scalar = `YYYY-MM-DD` string.
- Money = RON **decimal strings** (`"1171228.00"`) + `isRon` + `valueSuspect` booleans.
  Non-RON or guard-failed values are served as `valueRon: null` with `currency` retained.
- Rollup counts = **bigint strings** (`flowCount: "15800321"`).
- Lists and aggregates serve **canonical rows only** (`is_canonical = true`).
- Nullability is honest: a field the loader could not derive is `null`, never a fabricated
  default. Unknown status tokens are normalized to `"unknown"` (first-class value).

## Pagination strategy (per surface)

| Surface | Style | Notes |
| --- | --- | --- |
| Search lists (4 grains) | offset `page`/`pageSize` | `total: Int` is **nullable**: `null` means "unknown / too expensive to count" (client shows "1000+"). `totalEstimated: Boolean!` marks approximate counts. Server should cap `page * pageSize` (suggested 10 000) and may time-box counts on the 15.8M-row DA grain. |
| Landing / CPV / supplier aggregates | none | `topN: Int` (default 10, max 50); served from monthly rollups. |
| Detail | single object by `id` | root field returns `null` for unknown id. |
| Supplier recent records | cursor connection | keyset `(date, id)`, `first` capped at 100. |

## SDL

```graphql
scalar Date # YYYY-MM-DD

# ── shared ────────────────────────────────────────────────────────────────
type ProcurementParty {
  cui: String
  name: String
  displayName: String
}

input StringEqInput { eq: String! }
input StringInInput { in: [String!]! }
input StringQInput { contains: String! }        # server-bounded ILIKE on title/number fields
input DateRangeInput { gte: Date, lte: Date }
input DecimalRangeInput { gte: String, lte: String } # RON decimal strings

# ── grain nodes ───────────────────────────────────────────────────────────
type ProcurementProcedure {
  id: ID!
  noticeNo: String
  noticeKind: String
  procedureType: String
  contractKind: String            # works | services | supplies
  title: String
  authority: ProcurementParty!
  cpvCode: String
  cpvDivisionCode: String
  estimatedValueRon: String
  awardedValueRon: String
  currency: String
  isRon: Boolean!
  valueSuspect: Boolean!
  status: String!                 # published|in_evaluation|awarded|cancelled|suspended|unknown
  countyName: String
  publicationDate: Date
  stateDate: Date
  sourceSystem: String!           # seap_notice | elicitatie
  sourceUrl: String
  isCanonical: Boolean!
  dupGroupId: String
}

type ProcurementContract {
  id: ID!
  contractNo: String
  contractDate: Date
  procedureId: ID
  noticeNo: String
  title: String
  authority: ProcurementParty!
  supplier: ProcurementParty!
  cpvCode: String
  cpvDivisionCode: String
  valueRon: String
  estimatedValueRon: String
  currency: String
  isRon: Boolean!
  valueSuspect: Boolean!
  status: String!                 # awarded|in_progress|closed|cancelled|unknown
  sourceSystem: String!           # seap_contracts | elicitatie_ca_award
  sourceUrl: String
  isCanonical: Boolean!
  dupGroupId: String
  modifications: [ProcurementContractModification!]!  # trail, modificationDate asc
}

type ProcurementDirectAcquisition {
  id: ID!
  uniqueCode: String
  title: String
  authority: ProcurementParty!
  supplier: ProcurementParty!
  cpvCode: String
  cpvDivisionCode: String
  valueRon: String
  estimatedValueRon: String
  currency: String
  isRon: Boolean!
  valueSuspect: Boolean!
  status: String!                 # offered|awarded|finalized|cancelled|unknown
  countyName: String
  publicationDate: Date
  finalizationDate: Date
  sourceSystem: String!           # seap_da | seap_dan | elicitatie_da
  sourceUrl: String
  isCanonical: Boolean!
  dupGroupId: String
}

type ProcurementContractModification {
  id: ID!
  contractId: ID                  # null when unlinked
  linkMethod: String              # notice_no | authority_cui+contract_no | null
  linkConfidence: Float
  modificationDate: Date
  valueBeforeRon: String
  valueAfterRon: String
  valueDeltaRon: String           # may be negative
  modificationType: String
  authority: ProcurementParty!
  supplier: ProcurementParty!
  contractNo: String
  noticeNo: String
  sourceUrl: String
  parentContract: ProcurementContract  # null when unlinked
}

# ── search (offset) ───────────────────────────────────────────────────────
enum ProcurementSort { date_desc date_asc value_desc value_asc }

input ProcurementProceduresFilter {
  q: StringQInput
  authorityCui: StringEqInput
  cpvDivision: StringEqInput
  cpvCode: StringEqInput
  sourceSystem: StringInInput
  status: StringInInput
  publicationDate: DateRangeInput
  valueRon: DecimalRangeInput     # against awardedValueRon
}

input ProcurementContractsFilter {
  q: StringQInput
  authorityCui: StringEqInput
  supplierCui: StringEqInput
  cpvDivision: StringEqInput
  cpvCode: StringEqInput
  sourceSystem: StringInInput
  status: StringInInput
  contractDate: DateRangeInput
  valueRon: DecimalRangeInput
}

input ProcurementDirectAcquisitionsFilter {
  q: StringQInput
  authorityCui: StringEqInput
  supplierCui: StringEqInput
  cpvDivision: StringEqInput
  cpvCode: StringEqInput
  sourceSystem: StringInInput
  status: StringInInput
  publicationDate: DateRangeInput
  valueRon: DecimalRangeInput
}

input ProcurementModificationsFilter {
  q: StringQInput
  authorityCui: StringEqInput
  supplierCui: StringEqInput
  modificationDate: DateRangeInput
  linked: Boolean                 # contractId IS (NOT) NULL
  minDeltaPct: Float              # existing server arg, kept
}

type ProcurementProceduresPage {
  total: Int                      # null = unknown / too large
  totalEstimated: Boolean!
  items: [ProcurementProcedure!]!
}
type ProcurementContractsPage {
  total: Int
  totalEstimated: Boolean!
  items: [ProcurementContract!]!
}
type ProcurementDirectAcquisitionsPage {
  total: Int
  totalEstimated: Boolean!
  items: [ProcurementDirectAcquisition!]!
}
type ProcurementModificationsPage {
  total: Int
  totalEstimated: Boolean!
  items: [ProcurementContractModification!]!
}

# ── detail bundles ────────────────────────────────────────────────────────
type ProcurementDuplicateRef { sourceSystem: String!, id: ID! }

type ProcurementLotWinner {
  lotLabel: String!
  winner: ProcurementParty!
  valueRon: String
  currency: String
  isRon: Boolean!
  valueSuspect: Boolean!
}

type ProcurementTedRef { tedNoticeNo: String!, sourceUrl: String! }

type ProcurementProcedureDetail {
  procedure: ProcurementProcedure!
  contracts: [ProcurementContract!]!   # awarded under this procedure
  perLotWinners: [ProcurementLotWinner!]
  duplicates: [ProcurementDuplicateRef!]!
  ted: ProcurementTedRef
  gate: ProcurementCapabilityGate!
}

type ProcurementContractDetail {
  contract: ProcurementContract!       # includes modifications trail
  procedure: ProcurementProcedure
  duplicates: [ProcurementDuplicateRef!]!
  ted: ProcurementTedRef
  gate: ProcurementCapabilityGate!
}

type ProcurementDirectAcquisitionDetail {
  directAcquisition: ProcurementDirectAcquisition!
  duplicates: [ProcurementDuplicateRef!]!
  gate: ProcurementCapabilityGate!
}

# ── aggregates (shared scope) ─────────────────────────────────────────────
input ProcurementScopeFilter {
  authorityCui: String
  supplierCui: String
  cpvDivision: String
  cpvCode: String
  monthFrom: String               # YYYY-MM (rollups are monthly)
  monthTo: String
}

type ProcurementStats {
  totalValueRon: String           # null when not summable (gate)
  contractsCount: String!         # bigint strings
  directAcquisitionsCount: String!
  proceduresCount: String!
  buyersCount: String!
  suppliersCount: String!
  firstFlowDate: Date
  lastFlowDate: Date
}

type ProcurementTopPartyRow {
  authority: ProcurementParty
  supplier: ProcurementParty
  sourceGrain: String!            # procurement_contract | direct_acquisition
  flowCount: String!
  amountRonSum: String
  amountPresentCount: String!
  amountMissingCount: String!
  firstFlowDate: Date
  lastFlowDate: Date
  evidenceRefsSample: [String!]!
}

type ProcurementCategoryRow {
  cpvDivisionCode: String
  cpvDivisionLabelEn: String
  cpvDivisionLabelRo: String
  sourceGrain: String!
  flowCount: String!
  amountRonSum: String
  amountPresentCount: String!
  amountMissingCount: String!
}

type ProcurementMonthlyPoint {
  month: String!                  # YYYY-MM
  flowCount: String!
  amountRonSum: String
  amountPresentCount: String!
  amountMissingCount: String!
}

# ── supplier records (cursor) ─────────────────────────────────────────────
union ProcurementFlowRecord = ProcurementContract | ProcurementDirectAcquisition

type ProcurementPageInfo { hasNextPage: Boolean!, endCursor: String }
type ProcurementRecordEdge { cursor: String!, node: ProcurementFlowRecord! }
type ProcurementRecordConnection {
  total: Int
  edges: [ProcurementRecordEdge!]!
  pageInfo: ProcurementPageInfo!
}

# ── meta ──────────────────────────────────────────────────────────────────
type ProcurementCapabilityGate {
  sourceGrain: String!
  rowsCount: String!
  authorityCuiCoverageRate: String!
  supplierCuiCoverageRate: String!
  amountCoverageRate: String!
  cpvCoverageRate: String!
  dateCoverageRate: String!
  filterAnswersAllowed: Boolean!
  spendRankingsAllowed: Boolean!
  supplierRegionFiltersAllowed: Boolean!
  blockers: [String!]!
  dataAsOf: Date
  cadence: String
}

type ProcurementCpvDivision {
  divisionCode: String!
  labelEn: String!
  labelRo: String
}

enum ProcurementFilterDim { authority supplier cpv }
type ProcurementResolveHit {
  dim: String!
  value: String!
  label: String!
  kind: String!
  score: Float
}

type Query {
  # search (offset)
  procurementProcedures(filter: ProcurementProceduresFilter, sort: ProcurementSort, page: Int, pageSize: Int): ProcurementProceduresPage!
  procurementContracts(filter: ProcurementContractsFilter, sort: ProcurementSort, page: Int, pageSize: Int): ProcurementContractsPage!
  procurementDirectAcquisitions(filter: ProcurementDirectAcquisitionsFilter, sort: ProcurementSort, page: Int, pageSize: Int): ProcurementDirectAcquisitionsPage!
  procurementModifications(filter: ProcurementModificationsFilter, sort: ProcurementSort, page: Int, pageSize: Int): ProcurementModificationsPage!

  # detail
  procurementProcedure(id: ID!): ProcurementProcedureDetail
  procurementContract(id: ID!): ProcurementContractDetail
  procurementDirectAcquisition(id: ID!): ProcurementDirectAcquisitionDetail

  # aggregates — the same 5 queries serve landing (empty scope),
  # the CPV category page ({ cpvDivision }) and the supplier slice ({ supplierCui })
  procurementStats(scope: ProcurementScopeFilter, grain: String): ProcurementStats!
  procurementTopAuthorities(scope: ProcurementScopeFilter, grain: String, topN: Int): [ProcurementTopPartyRow!]!
  procurementTopSuppliers(scope: ProcurementScopeFilter, grain: String, topN: Int): [ProcurementTopPartyRow!]!
  procurementCategoryBreakdown(scope: ProcurementScopeFilter, grain: String): [ProcurementCategoryRow!]!
  procurementSpendOverTime(scope: ProcurementScopeFilter, grain: String): [ProcurementMonthlyPoint!]!

  # supplier recent records (canonical flows only, date desc)
  procurementSupplierRecords(supplierCui: ID!, first: Int, after: String): ProcurementRecordConnection!

  # meta
  procurementGrainQuality: [ProcurementCapabilityGate!]!
  procurementCpvDivisions: [ProcurementCpvDivision!]!
  procurementResolve(dim: ProcurementFilterDim!, q: String!, limit: Int): [ProcurementResolveHit!]!
}
```

## Semantics the server must uphold

1. **Canonical-only** — search lists, aggregates, and the supplier connection read
   `is_canonical = true` rows only; `duplicates` on detail exposes the suppressed refs.
2. **Value-suspect nulling** — values failing the loader guards (non-finite, negative,
   > 1e11 RON, > estimated×1000) are served as `valueRon: null` + `valueSuspect: true`.
3. **`grain` argument** on aggregates accepts `procurement_contract`,
   `direct_acquisition`, or `null` (= both). While `procurement_contract` is gate-blocked
   for spend, `amountRonSum` / `totalValueRon` for that grain must be `null`, not a sum.
4. **Nullable `total`** — the server may return `total: null` whenever counting would be
   too expensive (DA grain); clients render "1000+". `totalEstimated: true` marks sampled
   or planner-estimate counts.
5. **Gates** come from `public_contracts_filter_capabilities_v1` and include `dataAsOf`
   (load watermark) + `cadence` so the client can show freshness without another query.
6. **CPV taxonomy** is authoritative at **division level only** (`cpv_divisions`);
   8-digit `cpvCode` filters scope by exact code but labels are best-effort observed data
   (`cpv_codes` is polluted — see prod reference §3).

## Deferred (v2 — do not block on these)

- **Review signals**: `procurementSameDayCandidates` / repeated-pairs surfacing. The
  client parses a `signal` URL param and ships the picker UI, but treats the results as
  gate-blocked until a query is served.
- **Modifications search grain**: requires the `parentContract` join for linked rows;
  if too costly for v1, serve `procurementModifications` without `parentContract` and the
  client renders unlinked-style rows, or keep the grain gate-blocked.
- **Supplier cross-domain flags** (`pnrr` / `publicInvestments` / `litigation` /
  `moneyFlows` presence): not part of this module; the client hides those chips when the
  data is absent (`crossDomain: null` in the client schema).

## Open questions for the server team

1. Existing aggregate queries use flat args (`procurementTopSuppliers(authorityCui, grain,
   monthFrom, monthTo, topN)`). Preferred: migrate to the `scope:` object above for one
   consistent shape. If the flat args must stay, tell us — the client only needs
   `procurement-filters.ts`/`procurement-queries.ts` adjusted.
2. Count-timeout strategy for `total` on the DA grain (planner estimate vs. capped count
   vs. always-null beyond a bound).
3. Whether `procurementStats` can be served from rollups in v1 (all counts are already in
   the flow view; `firstFlowDate`/`lastFlowDate` from min/max month buckets is acceptable).
