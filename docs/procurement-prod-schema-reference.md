# Procurement — Prod Schema & API Reference (for client mocks)

> **Purpose:** ground the client's procurement **mock data** in the real scrapper prod
> schema + server API, so that when the live API is wired the change is a pure adapter swap.
> **Source:** read-only audit of the `hack-for-facts-eb-scrapper` repo + live `transparenta_prod`
> (codex, 2026-06-28). Full raw report archived alongside this investigation.
> **Status:** the prod contract is **actively evolving** (latest changes 2026-06-28) — treat
> this as a moving reference, re-check before large mock work.

---

## 0. The one thing to get right

**A server GraphQL `procurement` module already exists** (`hack-for-facts-eb-server/src/modules/procurement`).
So the client should mock the **GraphQL DTOs**, not the raw DB rows:

- **camelCase** field names (`valueRon`, not `value_ron`).
- **Money as decimal strings** (`"1171228.00"`), plus booleans `isRon` / `valueSuspect`
  — **not** the current client `{ ron, nativeValue, currency, isOutlier }` shape.
- **Two server grains only:** `procurement_contract` and `direct_acquisition`
  — not the client's `contracts | direct_acquisitions | modifications`.

The raw DB snake_case shapes (§3) are the **adapter's** source of truth; the **mock API** mirrors
the camelCase DTOs (§4–5).

---

## 1. Latest scrapper work (2026-06-28)

| Date | Change |
| --- | --- |
| 2026-06-28 | Cross-source award **dedup** (Phase 1): `elicitatie_ca_award` contracts matching a canonical SEAP `canonical_contract_key` are suppressed (`dup_method='cross_source_suppressed'`). |
| 2026-06-28 | **e-licitatie per-lot award** ingestion: `source_system='elicitatie_ca_award'` contracts from `ca_notice_contracts`; no winner contact PII in prod. |
| 2026-06-28 | **Contract identity + dual-value** columns: `canonical_contract_key`, `canonical_value_source`, `value_disagreement`, `value_observations`. |
| 2026-06-28 | **Honest-NULL publication_date** — stop using scrape date as a fake e-licitatie CA publication date. |
| 2026-06-27 | `privacy_class` (`public|restricted`) + `source_url` traceability on grain tables; pre-projection block-promotion gate. |
| 2026-06-14…18 | Base procurement domain: grain tables, raw→prod loader, flows, rollups, quality gate, filter capabilities. |

Adapter source-of-truth files (scrapper):
`src/src/db/prod-migrations/20260614T090000__procurement_domain.ts` (+ later migrations),
`src/src/sources/public-contracts/prod/load-prod.ts` (transforms),
`identity.ts` (CUI/CPV/date/money/status normalization), `contract-identity.ts`,
`validate.ts` (coverage gate). Docs: `prod-db/PROCUREMENT_CONTRACT.md`, `prod-db/CONTRACT_IDENTITY.md`.

---

## 2. GraphQL API surface (the client target)

Server module: `hack-for-facts-eb-server/src/modules/procurement` (`shell/graphql/typedefs.ts`,
`resolvers.ts`, `shell/repo/*`, `core/types.ts`).

Queries available:

- Grain detail/list: `procurementProcedure(s)` / `procurementProcedureDetail`,
  `procurementContract(s)` / `procurementContractDetail`,
  `procurementDirectAcquisition(s)`, `procurementModifications(filter, minDeltaPct, …)`.
- Aggregates: `procurementTopSuppliers(authorityCui, grain, monthFrom, monthTo, topN)`,
  `procurementTopAuthorities(supplierCui, …)`, `procurementRepeatedPairs(…)`,
  `procurementConcentration(authorityCui, grain, …)`,
  `procurementAuthorityCpvSpend(authorityCui, grain, cpvDivision, …)`,
  `procurementTopSuppliersByRegionCpv(region, cpvDivision, …)`,
  `procurementSameDayCandidates(…)`.
- Meta: `procurementGrainQuality`, `procurementCpvDivisions`, `procurementResolve(dim, q, limit)`.

**DTO caveat:** GraphQL hides loader diagnostics. It does **not** expose `attrs`, `source_url`,
`privacy_class`, `source_system` (for contracts/procedures), `canonical_contract_key`,
`value_observations`, or `supplier_identity_key`. Money is `valueRon` (decimal string) + `isRon`
+ `valueSuspect` — **not** `nativeValue` / `isOutlier`.

---

## 3. Prod schema (adapter source — condensed)

DB types: `bigint` → keep as **string** in JS; `numeric(18,2)` → **decimal string**;
dates/timestamps → ISO strings. Full per-table column lists are in the archived codex report;
the load-bearing facts for mocks:

- **`procurement.procedures`** — PK `procedure_id`; `source_system` (`seap_notice|elicitatie`);
  `authority_*`, `cpv_code/cpv_raw`, `estimated_value_ron`, `awarded_value_ron`, `currency`,
  `status` (`published|in_evaluation|awarded|cancelled|suspended|unknown`), `publication_date|null`.
- **`procurement.contracts`** — PK `contract_id`, unique `contract_key`; `source_system`
  (`seap_contracts|elicitatie_ca_award`); FK `procedure_id|null`; `supplier_*`; `value_ron|null`,
  `estimated_value_ron`, `currency`; `status` (`awarded|in_progress|closed|cancelled|unknown`);
  dedup `dup_group_id|null`, `is_canonical`, `dup_method`, `dup_confidence`; identity (latest)
  `canonical_contract_key`, `value_disagreement`, `supplier_identity_key` (`RO:<cui>`),
  `supplier_identity_confidence` (`high|low|none`).
- **`procurement.direct_acquisitions`** — PK `da_id`, unique `da_key`; `source_system`
  (`seap_da|seap_dan|elicitatie_da`); `supplier_*`; `value_ron|null`, `currency`;
  `status` (`offered|awarded|finalized|cancelled|unknown`); `publication_date`, `finalization_date`;
  dedup fields as contracts.
- **`procurement.contract_modifications`** — PK `modification_id`; FK `contract_id|null`;
  `link_method` (`notice_no | authority_cui+contract_no | null`), `link_confidence`;
  `value_before_ron`, `value_after_ron`, `value_delta_ron` (can be negative), `modification_type`.
- **`procurement.cpv_divisions`** — `division_code` (2-digit), `label_en`, `label_ro|null`.
  (`cpv_codes` is observed-derived and **polluted** — use divisions for taxonomy.)
- **Flow view `procurement_flow_facts_v1`** + **rollups** (`org_edge_monthly_rollups`,
  `authority_cpv_division_monthly_rollups`, `supplier_cpv_division_monthly_rollups`,
  `same_day_direct_acquisition_candidates`) — count-first metrics with `amount_present_count`,
  `amount_missing_count`, `evidence_refs_sample`, plus `has_*` presence flags on the view.
- **Gates** `aggregate_quality_by_grain` + `public_contracts_filter_capabilities_v1` — per-grain
  coverage rates + `*_allowed` booleans + `blockers[]` (see §6).

### Raw→prod transforms the mock should reflect

- **Currency:** blank/`RON`/`LEI` → RON; non-RON → `value_ron = null` (keep `currency`). No native
  value as a first-class prod column. (e-licitatie award lane uses `default_currency_contract_value`
  as `value_ron` when available.)
- **Value guards:** null non-finite, negative, > 100,000,000,000 RON, **and > estimated×1000**.
  → this is why the served gate can allow DA spend rankings (raw outliers are stripped in prod).
- **Dates:** parsed from ISO / Romanian `dd.mm.yyyy` / JS dates; invalid → null. e-licitatie CA
  procedures use honest source date only (no scrape-date fallback) → some null.
- **Names:** composite `"<cui> <name>"` split into CUI + display name; leading CUI stripped.
- **Status:** normalized per grain (vocabularies above); unmapped → `unknown` (first-class).
- **Dedup:** `dup_group_id` + `is_canonical`; flows/search read **canonical only**. Precedence
  `elicitatie_da > seap_da > seap_dan`; cross-source award suppression Phase 1.
- **Modifications:** linked by `notice_no`, then `authority_cui+contract_no`; unlinked kept with
  `contract_id=null`, `link_method=null`.

---

## 4. Mock grain shapes (mirror the GraphQL DTOs)

```ts
type MockProcurementContract = {
  id: string
  noticeNo: string | null
  contractNo: string | null
  contractDate: string | null
  title: string | null
  authorityCui: string | null
  authorityName: string | null
  supplierCui: string | null
  supplierName: string | null
  cpvCode: string | null
  valueRon: string | null          // decimal string
  estimatedValueRon: string | null
  currency: string | null
  status: string                   // 'awarded' | 'in_progress' | 'closed' | 'cancelled' | 'unknown'
  isCanonical: boolean
  dupGroupId: string | null
  isRon: boolean
  valueSuspect: boolean
}

type MockDirectAcquisition = {
  id: string
  uniqueCode: string | null
  title: string | null
  authorityCui: string | null
  authorityName: string | null
  supplierCui: string | null
  supplierName: string | null
  cpvCode: string | null
  valueRon: string | null
  estimatedValueRon: string | null
  currency: string | null
  status: string                   // 'offered' | 'awarded' | 'finalized' | 'cancelled' | 'unknown'
  sourceSystem: 'seap_da' | 'seap_dan' | 'elicitatie_da'
  publicationDate: string | null
  finalizationDate: string | null
  isCanonical: boolean
  dupGroupId: string | null
  isRon: boolean
  valueSuspect: boolean
}

type MockContractModification = {
  id: string
  contractId: string | null
  linkMethod: 'notice_no' | 'authority_cui+contract_no' | null
  linkConfidence: number | null
  authorityCui: string | null
  supplierCui: string | null
  contractNo: string | null
  noticeNo: string | null
  modificationDate: string | null
  valueBeforeRon: string | null
  valueAfterRon: string | null
  valueDeltaRon: string | null     // can be negative
  modificationType: string | null
}
```

Realistic example rows (bake the data-quality realities in — non-RON, sparse, unlinked):

```json
{
  "contract":      { "id":"24395057","noticeNo":"SCNA1092986","contractNo":"3882","contractDate":"2023-09-21","title":"Lucrari de reparatii","authorityCui":"4784296","authorityName":"COMUNA SACADAT","supplierCui":"6535054","supplierName":"AUTOCIM","cpvCode":"45453000","valueRon":"1171228.00","estimatedValueRon":null,"currency":null,"status":"awarded","isCanonical":true,"dupGroupId":null,"isRon":true,"valueSuspect":false },
  "nonRonContract":{ "id":"139785","noticeNo":"CAN1009745","contractNo":"A1-942","contractDate":"2021-02-11","authorityCui":"27036839","supplierCui":"16072941","supplierName":"Aerochem","cpvCode":"24300000","valueRon":null,"currency":"EUR","status":"awarded","isCanonical":true,"isRon":false,"valueSuspect":true },
  "sparseDA":      { "id":"121464081","uniqueCode":null,"title":null,"authorityCui":null,"supplierCui":null,"cpvCode":null,"valueRon":null,"currency":null,"status":"unknown","sourceSystem":"seap_dan","publicationDate":null,"finalizationDate":null,"isCanonical":true,"isRon":true,"valueSuspect":false },
  "unlinkedMod":   { "id":"538978","contractId":null,"linkMethod":null,"linkConfidence":null,"authorityCui":"4340730","supplierCui":null,"contractNo":"304","noticeNo":"CAN1131954","modificationDate":"2025-06-10","valueBeforeRon":"15907919.84","valueAfterRon":"20140911.77","valueDeltaRon":"4232991.93","modificationType":"ACT ADITIONAL" }
}
```

## 5. Mock aggregate shapes (landing / institution / supplier / analytics)

```ts
type ProcurementEdgeAggregate = {     // top suppliers/authorities, money-trail leaderboards
  authorityCui: string | null
  authorityName: string | null
  supplierCui: string | null
  supplierName: string | null
  monthStart?: string | null
  sourceGrain: 'direct_acquisition' | 'procurement_contract'
  flowCount: string                   // counts are bigint strings
  amountRonSum: string | null
  amountPresentCount: string
  amountMissingCount: string
  firstFlowDate: string | null
  lastFlowDate: string | null
  evidenceRefsSample: string[]
}

type CpvBreakdownAggregate = {
  cpvDivisionCode: string | null
  cpvDivisionLabelEn: string | null
  sourceGrain: 'direct_acquisition' | 'procurement_contract'
  flowCount: string
  amountRonSum: string | null
  amountPresentCount: string
  amountMissingCount: string
}

type SameDayCandidateAggregate = {    // review signal (deferred surface, data exists)
  candidateDate: string
  authorityCui: string; authorityName: string | null
  supplierCui: string;  supplierName: string | null
  cpvCode: string | null; cpvDivisionCode: string | null
  sameDayCount: string; sameDayTotalRon: string | null; maxSingleAmountRon: string | null
  amountPresentCount: string; amountMissingCount: string
  evidenceRefsSample: string[]
}

type CoverageGate = {                 // drives what the UI may show as authoritative
  sourceGrain: 'direct_acquisition' | 'procurement_contract'
  rowsCount: string
  authorityCuiCoverageRate: string; supplierCuiCoverageRate: string
  amountCoverageRate: string; cpvCoverageRate: string; dateCoverageRate: string
  filterAnswersAllowed: boolean
  spendRankingsAllowed: boolean
  supplierRegionFiltersAllowed: boolean
  blockers: string[]
}
```

---

## 6. Live coverage-gate reality (drives UI gating)

The prod gate (thresholds: authority/supplier CUI ≥ 0.95, amount ≥ 0.95 for spend, CPV ≥ 0.85,
date ≥ 0.85, authority territory ≥ 0.70) currently resolves to:

| Grain | rows | amount cov. | filter answers | **spend rankings** | blockers |
| --- | ---: | ---: | :---: | :---: | --- |
| `direct_acquisition` | ~15.8M | 0.998 | ✅ allowed | ✅ **allowed** | supplier_region only |
| `procurement_contract` | ~0.9M | 0.801 | ❌ blocked | ❌ **blocked** | authority/supplier CUI, amount, date all < threshold |

**Consequence for the UI / mocks:** spend-ranked / top-N-by-value is **gate-allowed for direct
acquisitions** (prod strips outliers, so DA value is usable) but **blocked for contracts**. Mock
the gate honestly: show spend examples from **direct acquisitions**; show **contracts** count-first
or in a disabled/blocked state. `supplier_region_filter` and `llm_generated_filter` stay blocked.

> Note: this **refines** the procurement UX spec's "value is unsafe → counts lead" stance. That's
> true of the *raw* data, but the *served* gate is the authority: DA spend is safe post-cleaning,
> contract spend is not. `valueSuspect` per row remains the row-level honesty flag.

---

## 7. Current client mocks vs prod — mismatches to fix

When aligning `src/schemas/procurement.ts` + `src/features/procurement/mocks/fixtures.ts`:

1. **Source vocabulary** — client `source: seap | elicitatie | ted` ✗. Prod source systems:
   `seap_notice`, `seap_contracts`, `seap_da`, `seap_dan`, `elicitatie`, `elicitatie_da`,
   `elicitatie_ca_award` (TED is raw-only, not projected).
2. **Money shape** — client `{ ron, nativeValue, currency, isOutlier }` ✗. API exposes
   `valueRon` (decimal string), `currency`, `isRon`, `valueSuspect`. No `nativeValue`/`isOutlier`.
3. **Grain vocabulary** — client `contracts | direct_acquisitions | modifications` ✗. Server
   aggregate grains are `procurement_contract` and `direct_acquisition` only.
4. **Modification linkage** — client `linkMethod='contract_no'` ✗. Use `notice_no`,
   `authority_cui+contract_no`, or `null`.
5. **Invented backend fields** — client `party.matchConfidence`, `young_suppliers`,
   `modification_inflation` are **not** API fields. They may be UI-derived but must not be mocked
   as backend data. (Supplier identity confidence in prod is `high|low|none` on contracts.)
6. **Gate honesty** — do not present spend-ranked/top-N **contract** analytics as allowed while
   `procurement_contract` is gate-blocked. Use DAs for spend; contracts for count-first.
7. **Missing prod fields the client should add** — `isCanonical`, `dupGroupId`, `sourceUrl`
   (proof links on detail pages), gate `blockers`/`caveats`, `amountPresentCount`/
   `amountMissingCount`, `evidenceRefsSample`.

---

## 8. Adapter pointers (when the API is wired)

- Client mock/live dispatch already exists: `src/features/procurement/api/procurement-api.ts`
  (+ `.mock.ts` / `.live.ts`), gated by `isMockDataEnabled('public-contracts-seap')`.
- The live adapter maps the **server GraphQL DTOs** (camelCase, decimal strings) → the client Zod
  schemas. Keep the mock shapes identical to those DTOs so the only change is swapping the data
  source.
