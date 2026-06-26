# Domain: Public Procurement (Achizații Publice)

## Review changelog (2026-06-26)

- **Recommendation:** Aligned the first procurement slice with the hybrid route standard: `/entities/$cui` and `/companies/$cui` host CUI slices; `/achizitii/*` owns domain search/detail pages.
- **Recommendation:** Added design handoff notes for the shared evidence, coverage, freshness, and review-signal components needed before visual design.
- **Assumption:** Global search may route procurement records to `/achizitii/*` only after coverage/freshness badges are shown on each result.

> UX/product research document for the **procurement** domain (slug: `procurement`).
> Scope: public procurement procedures, direct acquisitions, contracts, modifications,
> CPV codes, authority/supplier relationships, contract documents, and derived
> procurement money-flow facts.
>
> Sources of truth consulted (read-only): scraper project
> `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-scrapper`
> — `prod-db/DATA_INVENTORY.md`, `prod-db/PUBLIC_CONTRACTS_NOTES.md`,
> `prod-db/PUBLIC_CONTRACTS_DATA_AUDIT.md`, `prod-db/PUBLIC_CONTRACTS_NEW_DATASETS.md`,
> `prod-db/AI_AGENT_FILTER_QUESTION_CATALOG.md`, the procurement schema migration
> `src/src/db/prod-migrations/20260614T090000__procurement_domain.ts`, and the
> aggregate-filters / filter-capabilities migrations
> (`20260616T220000`, `20260616T221000`, `20260617T073000`). Client alignment checked
> against `src/components/entities/views/ContractsView.tsx`,
> `src/components/entities/validation.ts`, `src/routes/companies.$cui.tsx`, and
> `src/lib/scraper-references/catalog.ts`.
>
> Convention used below: **Fact:** grounded in inventory/notes/code. **Assumption:**
> a sensible, labeled inference. **Recommendation:** a UX/product proposal.

---

## 1. Domain Summary

Public procurement is the process by which Romanian state institutions, local
authorities, and other public buyers acquire goods, services, and works from
private or public suppliers. It is one of the largest, most money-relevant, and
most scrutiny-prone public-data domains: it covers **how public money leaves the
budget and reaches companies**.

On Transparenta.eu, procurement is a cross-cutting domain that connects
**public entities** (authorities/buyers) → **private companies** (suppliers) →
**money flows** → **categories (CPV)**. It is the natural bridge between the
"who spent it" (budget/commitments) and "who received it" (companies) sides of
public finance.

**Fact:** The scraper models procurement as **three distinct entity tables plus
derived facts**, not one unified table, because the underlying lifecycles and
grains differ:

- `procurement.procedures` — tender/notice lifecycle (e-licitatie CA notices +
  SEAP notices).
- `procurement.contracts` — supplier-level awarded contracts (SEAP `contracts`
  family only).
- `procurement.direct_acquisitions` — catalog buys, ~10× the volume, distinct
  lifecycle (e-licitatie DA + SEAP DA/DAN).
- `procurement.contract_modifications` — value/date/type changes linked to
  contracts.
- `procurement.cpv_codes` + `procurement.cpv_divisions` — procurement-owned CPV
  classification reference (kept out of `core.classification_codes`, which is the
  CAEN home).
- Derived flow facts: `procurement.procurement_flow_facts_v1` (view over
  `flows.money_flows`), and materialized rollups
  `org_edge_monthly_rollups`, `authority_cpv_division_monthly_rollups`,
  `supplier_cpv_division_monthly_rollups`, `same_day_direct_acquisition_candidates`,
  and the quality/capability gate `aggregate_quality_by_grain` /
  `public_contracts_filter_capabilities_v1`.

**Fact:** Sources in scope today are **e-licitatie/SICAP (SEAP)** — the primary
system of record for Romanian procurement. TED (EU above-threshold), CNSC
(appeal decisions), ANAP, and PAAP exist as probes/partial lanes; CNSC is parked
as portal-blocked (needs a Playwright browser lane), CN-detail is not built, and
PAAP is deferred.

**Fact:** The scraper slice reached **DoD Phase 2 (data + sync)** on 2026-06-16.
Phase 3 (API/client/search/MCP product surfaces) is **deferred per user
decision** — which is exactly the gap this document targets.

---

## 2. Public Value

Procurement is where the largest share of discretionary public money is spent and
where corruption risk concentrates. Making it understandable delivers concrete
public value:

- **Follow the money, end to end.** Connect "a ministry's budget credit" → "the
  contract it signed" → "the company that got paid" → "that company's
  registration/litigation profile". Today the client stops at budget execution
  and commitments; procurement closes the loop to the payee.
- **Lower the barrier to scrutiny.** SEAP/e-licitatie publish raw data, but it is
  voluminous (~19M direct acquisitions), inconsistently coded, and hard to
  navigate. A guided, plain-language surface lets a citizen or journalist ask
  "who does institution X buy from, and how concentrated is that?" without
  writing SQL.
- **Surface review signals, not verdicts.** Deterministic patterns the scraper
  already computes — repeated buyer-supplier pairs, same-day direct-acquisition
  splitting candidates, contract modifications (value inflation), young/new
  suppliers — are **review signals**, and must be presented as such (the scraper
  explicitly labels same-day candidates "a review signal, not a finding of
  illegality").
- **Trust through disclosure.** Every aggregate answer should expose its
  **coverage** (how complete the underlying CUI/amount/date/CPV data is), so users
  know what a number can and cannot be trusted for. This mirrors the scraper's
  own `aggregate_quality_by_grain` gate philosophy.
- **Cross-domain accountability.** A supplier that appears in procurement, PNRR
  contractors, public investments, and judicial litigation is far more
  investigable when those are linked by CUI on one profile.

**Recommendation:** Frame the domain publicly as "Urmărim banii de la
achiziții publice până la compania care îi primește" — money-trail transparency,
not a raw contract registry.

---

## 3. Target Users

### 3.1 Casual public users (citizens, local residents, students)
- Curious about "what does my city hall / local hospital / school buy, and from
  whom?" Low tolerance for jargon (CPV, SICAP, SEAP, direct acquisition).
- Need: a single, readable page per authority showing top suppliers, biggest
  purchases, and total spend, with plain-language category labels.

### 3.2 Journalists, analysts, NGOs, researchers, watchdogs
- The primary high-value audience. Want to investigate concentration, repeated
  pairs, splitting, modifications, and cross-domain supplier profiles.
- Need: filterable listings, exportable evidence, top-N rankings with
  denominators and coverage, and deep links to the source notice on
  e-licitatie.ro.
- **Fact:** The scraper's `AI_AGENT_FILTER_QUESTION_CATALOG.md` already enumerates
  15 procurement questions (PC-1…PC-15) aimed at exactly this audience — this is
  the ready-made backlog.

### 3.3 Domain experts (public officials, auditors, integrity/ANAP-adjacent,
    procurement professionals)
- Comfortable with CPV codes, procedure types, contract numbers, and SEAP
  terminology. Want precision: exact contract numbers, modification deltas,
  procedure status lifecycle, and linkage integrity between procedures →
  contracts → modifications.
- Need: raw-ish detail pages, status timelines, modification trails, and the
  ability to reconcile a notice number across SEAP/e-licitatie/TED.

---

## 4. Key User Questions

### 4.1 Questions the product should answer immediately (deterministic, MVP)

- Who are the top suppliers of institution X (by count and by value), and what
  share of X's spend do they represent? (PC-1, PC-5)
- What does institution X buy, broken down by category (CPV division) and year?
  (PC-4)
- Which institutions buy from company Y, and how much? (PC-3)
- How many contracts / direct acquisitions does an authority have, and what is
  the total value, with a stated coverage caveat for missing values?
- Show me this specific contract / direct acquisition / procedure with its
  source reference and a deep link to e-licitatie.ro.
- What modifications were applied to this contract, and how did the value
  change? (PC-8)
- Which authority-supplier pairs recur most often? (PC-6)
- What are the same-day direct-acquisition splitting candidates for an
  authority? (PC-7) — clearly labeled a review signal.

### 4.2 Questions requiring deeper analysis (advanced / later)

- Supplier concentration metrics (top-1 share, top-5 share, HHI) for an
  authority or category. (PC-5, PC-14)
- Awards to recently registered / young suppliers. (PC-9, PC-15)
- Top regions receiving spend from an authority (requires supplier territory,
  which is **not approved in v1** — see §6). (PC-12)
- Top institutions buying a category in a region. (PC-13)
- Contracts/procedures with missing linkage, and the affected value. (PC-10)
- Appeal-outcome / risk signal from CNSC decisions linked to a procedure (CNSC
  lane is parked — see §6).
- TED above-threshold cross-reference for a notice (TED RO lane is in-flight —
  see §5/§6).
- Company "unusually concentrated public revenue from a single buyer" (PC-14) —
  needs the company-side revenue view.

---

## 5. Available Data

All counts below are **Fact:** from `DATA_INVENTORY.md` (exact live counts,
2026-06-25) and the schema migration, unless marked otherwise.

### 5.1 Serving tables (`procurement.*`)

| Table / surface | Rows (2026-06-25) | Grain | Key fields |
| --- | --- | --- | --- |
| `procurement.direct_acquisitions` | **18,988,987** | one catalog buy | `da_key`, `source_system` (elicitatie_da / seap_da / seap_dan), `unique_code`, `authority_cui/name`, `supplier_cui/name`, `cpv_code/raw`, `value_ron`, `estimated_value_ron`, `currency`, `status`, `status_raw`, `state_id`, `county_name`, `publication_date`, `finalization_date`, `is_canonical`, `dup_group_id`, `attrs` |
| `procurement.procedures` | **621,491** | one tender/notice | `source_system` (elicitatie / seap_notice), `notice_no`, `notice_kind`, `procedure_type`, `contract_kind` (works/services/supplies), `title`, `authority_cui/name`, `cpv_code/raw`, `estimated_value_ron`, `awarded_value_ron`, `currency`, `status` (published/in_evaluation/awarded/cancelled/suspended/unknown), `county_name`, `publication_date`, `state_date`, `attrs` |
| `procurement.contracts` | **1,916,448** | one supplier-level award (SEAP contracts family) | `contract_key`, `procedure_id` (FK, 93.4% linked), `notice_no`, `contract_no`, `contract_date`, `title`, `authority_cui/name`, `supplier_cui/name`, `cpv_code/raw`, `value_ron`, `estimated_value_ron`, `currency`, `status`, `is_canonical`, `dup_group_id`, `attrs` |
| `procurement.contract_modifications` | ~43,209 (full-load) / 51,994 raw | one modification event | `contract_id` (FK, ~79-88% linked), `link_method`, `authority_cui/name`, `supplier_cui/name`, `contract_no`, `notice_no`, `modification_date`, `value_before_ron`, `value_after_ron`, `value_delta_ron`, `modification_type`, `year`, `quarter` |
| `procurement.cpv_codes` | 9,760 | CPV code (loader-derived, 8-digit) | `cpv_code`, `label_ro`, `parent_code`, `cpv_level`, `source` |
| `procurement.cpv_divisions` | 46 seeded divisions | CPV division (2-digit) | `division_code`, `label_en`, `label_ro` |

### 5.2 Derived flow facts & rollups (the analytic surface)

**Fact:** These are the deterministic, coverage-gated projections the scraper
recommends as the **first production filter surface** (per
`AI_AGENT_FILTER_QUESTION_CATALOG.md`):

- `procurement.procurement_flow_facts_v1` — canonical view over
  `flows.money_flows` restricted to `source_id='procurement'` and flow types
  `procurement_contract` / `direct_acquisition`. Exposes
  authority/supplier CUI+name+org_id, amount, currency, flow_date/year, CPV code
  + division, authority territory (SIRUTA/county/region via
  `core.public_entities` + `core.territories`), and presence flags
  (`has_authority_cui`, `has_supplier_cui`, `has_amount`, `has_cpv`,
  `has_flow_date`, `has_authority_territory`).
- `procurement.org_edge_monthly_rollups` — monthly authority×supplier rollup
  (flow_count, amount_ron_sum, amount_present/missing, distinct CPV, evidence
  sample refs). Powers buyer-supplier top-N and repeated-pair questions.
- `procurement.authority_cpv_division_monthly_rollups` — monthly
  authority×CPV-division rollup. Powers "spending by category and time".
- `procurement.supplier_cpv_division_monthly_rollups` — monthly
  authority×supplier×CPV-division rollup. Powers "top suppliers in category C
  for institution X".
- `procurement.same_day_direct_acquisition_candidates` — repeated same-day DA
  candidates by authority×supplier×CPV (`same_day_count`, `same_day_total_ron`,
  `max_single_amount_ron`, evidence refs). **Review signal only.**
- `procurement.aggregate_quality_by_grain` + `public_contracts_filter_capabilities_v1`
  — per-grain coverage rates and a machine-readable gate that declares which
  answer classes are **allowed** (filter_count, count_ranked_top_n,
  spend_ranked_top_n, buyer_region_filter, cpv_category_filter,
  same_day_direct_acquisition_signal) and which are **blocked**
  (`supplier_region_filter` and `llm_generated_filter` are explicitly **not
  allowed in v1**).

### 5.3 Cross-domain links available

**Fact:**
- Authority (buyer) `authority_cui` → `core.public_entities` (territory,
  SIRUTA/county/region). Match rate ~73-92% per audit.
- Supplier `supplier_cui` → company registry / `core.organizations`. Match rate
  ~97-99% per audit.
- Contracts → `procedure_id` (internal FK, `on delete set null`).
- Modifications → contracts via `contract_id` and via `notice_no`→procedure
  (99.5%) or `(authority_cui, contract_no)`→contract (88.3%).
- Procurement flows share `flows.money_flows` with PNRR and budget producers
  (procurement writes only its own `source_id`s).
- CPV → `procurement.cpv_codes` / `cpv_divisions` (procurement-owned, not
  `core.classification_codes`).
- SICAP↔TED join key exists at source (`tedNoticeNo` / TED
  `publication-number`), proven but not yet broadly loaded.

### 5.4 Backend / client status

**Fact:** The server `procurement` module EXISTS (GraphQL + MCP + flow
integration + source contributor), per `DATA_INVENTORY.md`. MCP tools include
filter discovery/query surfaces.

**Fact:** The client has **NO dedicated procurement route**. The only
procurement-adjacent client surface is `src/components/entities/views/ContractsView.tsx`,
which embeds an **external SICAP.ai iframe** per entity CUI — there is no native
procurement data rendered. The scraper-references catalog entry
`public-contracts-seap` is marked `lifecycle: 'loading'`, `apiReady: false`,
`clientFeaturePaths: []`. Entity page tabs today are `main-info`, `contracts`,
`commitments`, `ins`, `profile` (per `src/components/entities/validation.ts`).
Existing `/companies/$cui` and `/entities/$cui` pages are the natural hosts for
supplier/authority slices.

---

## 6. Missing or Uncertain Data

Distinguishing what exists vs. what is missing/uncertain, with UX impact.

### 6.1 Collectible but not yet loaded / in-flight

**Fact:**
- **Per-lot e-licitatie winners** (`GetCANoticeContracts`) — the single
  highest-value addition; fills the empty supplier gap on ~316k CA notices.
  Lane built + e2e-verified 2026-06-24 (winners 8/8 exact), ~15,228 rows
  captured so far; **not yet broadly loaded into serving**.
- **TED RO subset** (~20-45k notices/yr, above-EU-threshold only) — lane in
  flight, ~21,236 notices captured; SICAP↔TED join key proven.
- **DA detail** (catalog line items, documents, `daAwardNoticeID`) and
  **offline DA award notices** — distinct datasets not captured (DA is list-only
  today, ~10M+ rows with no line items).
- **Entity profiles** (CA + supplier registry: name/CUI/address/contact) —
  entity-profile lane captured ~1,939 rows (100% CUI); strengthens the CUI
  identity hub.
- **Official CPV-2008 vocabulary** — `procurement.cpv_codes` is loader-derived
  (data-observed); an official seed is collectible but not done. The
  `cpv_divisions` table is seeded with 46 English labels; Romanian labels
  (`label_ro`) are **not populated**.
- **CN open-tender notices + errata + concessions** — separate uncalled
  endpoint; we capture CAN awards only.
- **Clarifications** (procedure Q&A documents) — not captured.

### 6.2 Blocked / deferred sources

**Fact:**
- **CNSC appeal decisions** — parked as portal-blocked (client-side rendered
  grid; needs a Playwright browser lane). Unique appeal-outcome/risk signal,
  ~56,605 cases. Schema/transport deployed but `cnsc_source.*` stays empty.
- **CN-detail** — not buildable (frozen 2013-2020 sample, no detail-store join).
- **PAAP annual procurement plans** — deferred (planned intent only, weakly
  linked, no documented endpoint).
- **ANAP ex-ante control list**, **debarred operators**, **Competition Council
  bid-rigging blacklist** — small PDF/HTML scrape targets, not captured; would
  be a unique supplier-risk enrichment.

### 6.3 Data quality issues that directly affect UX

**Fact (from `PUBLIC_CONTRACTS_DATA_AUDIT.md` and the G2/G3 rollout notes):**
The scraper ran a major remediation (2026-06-15/16). Five critical defects were
fixed and verified live, but **residuals remain** that the UX must account for:

- **Currency:** EUR/USD values were stored unconverted in `_ron` columns. Fix
  decision (user, 2026-06-16): **null `value_ron` for non-RON + keep native
  value+currency in `attrs` + flag** — no FX conversion today. UX consequence:
  some rows have **no RON amount**; the UI must show the native value+currency
  when RON is null, and never silently sum mixed currencies.
- **Status lifecycle:** SEAP contracts were 100% `unknown`; now mapped to
  `awarded`. SEAP DA `Oferta acceptata` mislabel fixed to `awarded`. Residual:
  some `unknown` status remains where the source vocabulary didn't map. UX
  consequence: treat `unknown` as a first-class status with an honest label, not
  a hidden one.
- **Dates:** e-licitatie DA publication/finalization dates were 100% NULL (loader
  bug, fixed → 100% populated). Residual: **e-licitatie procedures
  `publication_date` still 0** for ~310k rows (CA-notice list uses a different
  raw date field; a `state_class_at` fallback fix exists in code but needs a
  reload to apply to existing rows). UX consequence: procedures may lack a
  publication date; sort/filter by date must degrade gracefully and show
  coverage.
- **Garbage money:** canonical DA sum was 164 trillion RON (impossible); fixed
  to ~1.69T (max 89B). Residual: ~74 canonical DA values in 1e9–1e11 are still
  garbage (value ≫1000× estimated, supplier_cui='2', null currency). UX
  consequence: top-N value rankings can still be distorted by a few garbage
  rows; show evidence refs and allow the user to inspect outliers.
- **Names:** DA display names carried own-CUI prefix + pipe characters (61.5%);
  a name-hygiene fix exists in code (`6aac2d126`) but is **deferred** pending a
  consolidation reload. UX consequence: supplier/authority names may look ugly
  ("|Spitalul...|"); prefer CUI-based identity for joins and show a cleaned
  name when available.
- **Modification link rate:** ~0.796-0.88 (below the 0.80 floor on partial
  data). UX consequence: not every modification links to a contract; show
  "unlinked" modifications explicitly rather than hiding them.
- **Negative / out-of-band values:** a few hundred negative DAs/contracts and
  some future dates (clamped to ≤now+2d in code, but not yet applied to existing
  rows). UX consequence: guard against negatives in displays and exports.
- **Sync freshness:** daily incremental prod-load CronJob + monthly SEAP
  repoll/stale-delete + terminal-CA-freeze are **code-complete but suspended
  (`suspend: true`)**, not yet activated. UX consequence: data has a freshness
  lag; show a "data as of" timestamp and refresh cadence.

### 6.4 Coverage gates the UX must respect

**Fact:** `public_contracts_filter_capabilities_v1` explicitly **blocks** in v1:
- `supplier_region_filter` — not allowed (supplier territory not verified in
  procurement rollups).
- `llm_generated_filter` — not allowed as an authoritative filter (generated
  summaries/keywords/risk are discovery text only).

And **gates** `spend_ranked_top_n`, `buyer_region_filter`, `cpv_category_filter`,
`same_day_direct_acquisition_signal` behind per-grain coverage thresholds
(authority CUI ≥0.95, supplier CUI ≥0.95, amount ≥0.95 for spend, CPV ≥0.85,
date ≥0.85, authority territory ≥0.70). The UX must not expose a blocked filter
as if it were authoritative; it should show the coverage and the blocker reason.

---

## 7. Core Entities and Relationships

**Fact:** Entity model from the schema migration:

```
core.public_entities (authority/buyer)          core.organizations / companies (supplier)
        │  authority_cui                                ▲  supplier_cui
        ▼                                               │
procurement.procedures (tender/notice lifecycle)        │
        │  procedure_id (FK, on delete set null)        │
        ▼                                               │
procurement.contracts (supplier-level award, SEAP) ─────┘
        │  contract_id (FK, on delete set null)
        ▼
procurement.contract_modifications (value/date/type deltas)

procurement.direct_acquisitions (catalog buys, separate lifecycle)
        │ authority_cui, supplier_cui, cpv_code
        ▼
flows.money_flows (procurement_contract | direct_acquisition)
        │ source_id='procurement'
        ▼
procurement.procurement_flow_facts_v1  ──►  rollups:
   (canonical fact view)                  • org_edge_monthly_rollups
                                          • authority_cpv_division_monthly_rollups
                                          • supplier_cpv_division_monthly_rollups
                                          • same_day_direct_acquisition_candidates
                                          • aggregate_quality_by_grain (coverage gate)

procurement.cpv_codes / cpv_divisions (classification reference, procurement-owned)
```

Key modeling notes (all **Fact:**):
- **Three tables, not one**, because procedures (tender lifecycle), contracts
  (supplier award), and direct acquisitions (catalog buys, ~10× volume) have
  distinct grains and lifecycles. A single `contracts` table would drown
  procedures under 14M+ DAs.
- **Dedup is a reversible link layer** (`dup_group_id` + `is_canonical`), not a
  destructive merge. Flows/search read **canonical rows only**. Precedence:
  elicitatie > SEAP (SEAP canonical in pre-e-licitatie years).
- **No FKs to `core.organizations`** (platform decision #5): raw CUI+name live
  on every table; `org_id` is backfilled only on `flows.money_flows`.
- **Status is mutable current-state** (`status` + `status_raw`), not an event
  table. History lives in raw `elicitatie_source.contract_snapshots`;
  `procurement.status_events` is deferred until a UI needs a timeline.
- **CPV is procurement-owned** (`procurement.cpv_codes`), never mixed into
  `core.classification_codes` (CAEN home).

**Assumption:** The entity-360 relationship (XS-1/XS-4 in the question catalog) —
authority ↔ supplier ↔ budget ↔ litigation ↔ parliament controls — is the
intended cross-domain spine, joined by CUI.

---

## 8. Recommended User Journeys

Each journey progresses **overview → detail → insight**.

### 8.1 Casual citizen — "What does my city hall buy?"

1. **Overview:** Land on the authority's entity page (`/entities/$cui`) and see a
   "Public procurement" summary card: total spend last 12 months, # of
   contracts, # of direct acquisitions, top category, "data as of" + coverage.
2. **Detail:** Open the procurement tab → browse top suppliers (by count and
   value, plain-language), biggest recent direct acquisitions, and a category
   breakdown (CPV division → human label).
3. **Insight:** A "things worth a second look" panel surfaces the top repeated
   supplier pair and any same-day DA candidates, each labeled "semnal de
   verificare, nu o concluzie", with a deep link to the source notice.

### 8.2 Journalist/analyst — "Is supplier concentration a story here?"

1. **Overview:** Search an authority or a category → land on the procurement
   listing filtered by authority + year.
2. **Detail:** Open the "Supplier concentration" analysis → top suppliers with
   count, total value, share of authority total, and (advanced) HHI/top-5 share;
   each row links to the supplier's company profile and to evidence contracts.
3. **Insight:** Drill into a recurring buyer-supplier pair or a same-day
  splitting candidate cluster → export the evidence list (contract numbers,
  values, dates, source refs) and follow the supplier cross-domain (companies,
  PNRR, litigation).

### 8.3 Domain expert / auditor — "Trace one procedure end-to-end"

1. **Overview:** Search by notice number / contract number / unique
  identification code → land on the procedure detail page.
2. **Detail:** See the procedure lifecycle (status, type, CPV, authority,
  estimated vs awarded value), the linked contracts (supplier-level), and the
  modification trail (before/after/delta, type, date).
3. **Insight:** Reconcile across sources — SEAP vs e-licitatie vs TED
  (when loaded) — via the notice number, and inspect any unlinked
  modifications or contracts with a missing procedure link (PC-10).

---

## 9. Recommended Information Architecture

### 9.1 Landing page (`/achizitii` — new)
- Domain hero: "Urmărim banii din achiziții publice" + total volume / # buyers /
  # suppliers / # contracts (with coverage caveats and "data as of").
- Entry points by intent: "Explorează o instituție", "Explorează un furnizor",
  "Categorii de achiziții (CPV)", "Semnale de verificare".
- A few high-signal starters (top authorities by spend, top categories) — only
  where `spend_ranked_top_n` is allowed by the capability gate.

### 9.2 Search / listing
- Unified procurement search across procedures, contracts, direct acquisitions,
  and modifications, with a **grain selector** (procedures | contracts | direct
  acquisitions | modifications) because the lifecycles differ.
- Filters (see §11) + result cards with authority, supplier, value, date, CPV,
  status, source-system badge, and deep link to e-licitatie.ro.

### 9.3 Entity detail (authority or supplier slice)
- Hosted on `/entities/$cui` (authority) and `/companies/$cui` (supplier),
  replacing the current SICAP.ai iframe `ContractsView` with native slices.
- Authority slice: spend summary, top suppliers, category breakdown, repeated
  pairs, same-day candidates, modifications. Supplier slice: top buyers,
  total public revenue, categories, first-seen/last-seen, cross-domain links.

### 9.4 Comparison
- Compare two authorities (spend, supplier count, concentration, categories) or
  two suppliers (buyers, revenue, categories). Advanced, later.

### 9.5 Dashboards / analytics
- Category (CPV division) trends over time; territory (buyer region) spend;
  modification-inflation leaders; review-signal leaderboards (same-day,
  repeated pairs, young suppliers). All coverage-gated.

### 9.6 Cross-domain related links
- From a supplier: → company profile (registration, CAEN, representatives,
  financials), → PNRR contractor, → public investments, → judicial litigation,
  → money flows.
- From an authority: → public entity profile, → budget execution /
  commitments, → parliament interpellations/controls, → legal acts issued.
- From a contract/procedure: → money flow fact, → source notice on
  e-licitatie.ro, → (later) CNSC appeal, TED notice.

---

## 10. Recommended Pages

Concrete page list, MVP first.

### 10.1 `/achizitii` — Procurement landing (MVP)
Primary content: domain intro, headline totals with coverage, entry points by
intent, a few gateway rankings (only capability-allowed ones), "data as of" +
cadence.

### 10.2 `/achizitii/cautare` — Procurement search & listing (MVP)
Primary content: grain selector (procedures/contracts/DAs/modifications), filter
rail (§11), paginated result cards (authority, supplier, value, date, CPV,
status, source badge, e-licitatie deep link), coverage banner for the current
filter set, CSV/export.

### 10.3 `/achizitii/proceduri/$id` — Procedure detail (MVP)
Primary content: notice_no, procedure_type, contract_kind, title, authority
(linked), CPV + division label, estimated vs awarded value, status lifecycle
badge, publication/state dates, linked contracts list, source deep link.

### 10.4 `/achizitii/contracte/$id` — Contract detail (MVP)
Primary content: contract_no + date, authority + supplier (linked), CPV, value
(RON + native currency if non-RON), status, modification trail (before/after/
delta/type/date), parent procedure link, money-flow fact link, source deep link.

### 10.5 `/achizitii/achizitii-directe/$id` — Direct acquisition detail (MVP)
Primary content: unique_code, authority + supplier, CPV, value, status, state_id,
publication + finalization dates, county, source-system badge, source deep link.
(Later: line items + documents when DA-detail lane loads.)

### 10.6 `/achizitii/cpv/$code` — CPV category page (MVP)
Primary content: CPV code + label (RO when available, EN fallback), parent/
division, total spend + # contracts/DAs in this category over time, top
authorities and suppliers in the category (capability-gated), trend chart.

### 10.7 Authority procurement slice on `/entities/$cui` (MVP)
Primary content: spend summary, top suppliers (count + value + share), category
breakdown, repeated pairs, same-day DA candidates (review-signal labeled),
modifications. **Replaces the SICAP.ai iframe.**

### 10.8 Supplier procurement slice on `/companies/$cui` (MVP)
Primary content: total public revenue, top buyers, categories, first/last-seen,
cross-domain links (PNRR, investments, litigation).

### 10.9 `/achizitii/semnale` — Review signals dashboard (Advanced)
Primary content: leaderboards for same-day DA candidates, repeated buyer-supplier
pairs, modification-inflation leaders, young-supplier awards — all clearly
labeled review signals with evidence refs and export.

### 10.10 `/achizitii/compara` — Comparison (Advanced)
Primary content: side-by-side authorities or suppliers across spend,
concentration, categories, territory.

---

## 11. Recommended Filters and Search

### 11.1 Searchable (free text)
- Authority name + CUI; supplier name + CUI; contract title; notice_no /
  contract_no / unique_identification_code; CPV code or label; procedure type.
- Full-text over procedure/contract titles (the scraper plans procurement
  `title + body` vectors for paraphrase discovery — discovery only, not
  authoritative filter).

### 11.2 Filterable (deterministic dimensions — only capability-allowed ones
        exposed as authoritative)

**Fact:** Allowed dimensions per `public_contracts_filter_capabilities_v1`:
`source_grain`, `authority_cui`, `supplier_cui`, `cpv_code`,
`cpv_division_code`, `flow_date`, `flow_year`, `authority_county_code`,
`authority_region`.

Recommended filter rail:
- **Grain:** procedures | contracts | direct acquisitions | modifications.
- **Source system:** elicitatie | seap (and later ted).
- **Authority** (CUI/name) and **Supplier** (CUI/name).
- **CPV division / category** (with human labels; RO label when populated, EN
  fallback) — only when `cpv_category_filter` allowed.
- **Time:** year, date range (on `flow_date` / `publication_date` /
  `finalization_date` / `contract_date` depending on grain).
- **Status:** published / in_evaluation / awarded / cancelled / suspended /
  finalized / offered / unknown (vocabulary depends on grain; show the right
  one per grain).
- **Buyer region** (county/region) — only when `buyer_region_filter` allowed;
  show coverage.
- **Value range** (RON) — with a clear "native currency shown when RON null"
  note.
- **Review signals:** same-day DA candidates, repeated pairs, modifications
  > X%, young suppliers — as toggleable pre-filtered views.

### 11.3 Plain-language explanations required
- What is a "direct acquisition" vs a "procedure/contract" (the 3-table split
  is not obvious to the public).
- What CPV is and how divisions map to "Construction", "IT services", "Medical
  equipment", etc.
- What "semnal de verificare" means and that it is **not** a finding of
  illegality.
- What "coverage" means and why a number might be partial.

### 11.4 Reserved as advanced / blocked (do not expose as authoritative in v1)

**Fact:** Blocked by the capability gate:
- **Supplier region filter** (supplier territory not verified) — do not expose;
  if a region question is asked, route to buyer region and disclose the
  limitation.
- **LLM-generated filters** (summaries, keywords, risk labels, suggested
  filters) — discovery text only, never an authoritative filter facet.

**Assumption:** FX-converted EUR totals are not available (no FX conversion);
do not offer a "total in EUR" switch until an FX source is decided.

---

## 12. Recommended Visualizations

All visualizations should be coverage-gated and evidence-linked.

### 12.1 MVP visualizations
- **Spend over time** (monthly bar/line) per authority or category, from
  `org_edge_monthly_rollups` / `authority_cpv_division_monthly_rollups`. Show
  amount-present vs amount-missing split.
- **Top suppliers / top authorities** horizontal bar (count + value), with share
  of total and evidence refs — only where `count_ranked_top_n` or
  `spend_ranked_top_n` is allowed.
- **Category breakdown** treemap or donut by CPV division (procurement-owned
  labels), per authority or globally.
- **Status distribution** per grain (procedures vs DAs have different
  vocabularies).
- **Modification trail** timeline on a contract detail page
  (before → after, delta, type, date).
- **Money-flow Sankey** authority → category → supplier (the client already
  ships `d3-sankey` and a `MoneyFlowDiagram` learning component — reuse the
  pattern).

### 12.2 Advanced visualizations
- **Supplier concentration** — top-1 / top-5 share + HHI gauge per authority or
  category (PC-5, PC-14).
- **Buyer-supplier edge / network** graph for repeated pairs (PC-6) and
  same-day clusters (PC-7) — review-signal labeled.
- **Territory choropleth** of buyer-region spend (only where
  `buyer_region_filter` allowed; the client has rich map analytics to reuse).
- **Young-supplier / new-entrant** timeline (PC-9, PC-15).
- **Cross-domain entity 360** radial/profile linking procurement → companies →
  PNRR → litigation → parliament.

---

## 13. MVP Features

For each feature: **user problem · expected user value · required data ·
recommended UX pattern · priority rationale.**

### MVP-1: Native authority procurement slice (replaces SICAP.ai iframe)
- **User problem:** Today the entity "contracts" tab just embeds SICAP.ai; users
  leave the site and get no integrated, coverage-aware view.
- **Expected user value:** A citizen lands on a city hall's page and immediately
  sees total spend, top suppliers, biggest purchases, and top categories — in
  Romanian, with honest coverage.
- **Required data:** `procurement_flow_facts_v1`,
  `org_edge_monthly_rollups`, `authority_cpv_division_monthly_rollups`,
  `aggregate_quality_by_grain` (coverage), `cpv_divisions` labels; authority CUI
  from the entity page.
- **Recommended UX pattern:** A "Achizații publice" section/card group on
  `/entities/$cui` (and the existing `contracts` tab repurposed): summary KPIs,
  top-suppliers bar, category donut, recent-DAs list, "data as of" + coverage
  chip. Keep an "Open in e-licitatie.ro" deep link per item.
- **Priority rationale:** Highest leverage — turns the largest data asset
  (19M DAs) into an integrated, readable answer for the most common question
  ("what does institution X buy"), on a page that already gets traffic.

### MVP-2: Procurement search & listing with grain selector
- **User problem:** There is no way to search procurement natively; users must
  know SICAP.
- **Expected user value:** Search by authority/supplier/contract number/CPV and
  filter by grain, time, status, category, value — with paginated, exportable
  results.
- **Required data:** `procurement.procedures/contracts/direct_acquisitions` +
  `cpv_codes/cpv_divisions`; capability gate to hide blocked filters.
- **Recommended UX pattern:** `/achizitii/cautare` with a grain tab selector,
  filter rail (only allowed dimensions), result cards with source-system badge
  and e-licitatie deep link, coverage banner, CSV export.
- **Priority rationale:** The general-purpose entry point that every other
  feature links into; without it, detail pages are dead ends.

### MVP-3: Procedure / Contract / Direct-acquisition detail pages
- **User problem:** No native detail view exists; users can't inspect one
  contract with its modification trail.
- **Expected user value:** A journalist follows an evidence ref from a ranking
  to the exact contract, sees value/status/dates/supplier/authority, the
  modification trail, and the source link.
- **Required data:** `procedures`, `contracts`, `direct_acquisitions`,
  `contract_modifications`, `cpv_codes`, `attrs` (native currency/value).
- **Recommended UX pattern:** Three detail templates sharing a common
  "procurement record" layout: header (IDs, status badge, value), parties
  (authority + supplier linked), classification (CPV), lifecycle/dates,
  related (procedure↔contracts↔modifications), source deep link, "report a
  data issue" affordance.
- **Priority rationale:** Closes the evidence trail; required for trust (every
  aggregate links to a verifiable record).

### MVP-4: CPV category page
- **User problem:** CPV codes are opaque; "45210000" means nothing to a citizen.
- **Expected user value:** Browse "Lucrări de construcții" → see total spend,
  top authorities/suppliers, trend.
- **Required data:** `cpv_codes`, `cpv_divisions`, category rollups.
- **Recommended UX pattern:** `/achizitii/cpv/$code` with label (RO/EN), parent
  hierarchy, trend chart, top-N (capability-gated), related categories.
- **Priority rationale:** Makes the category dimension navigable and
  plain-language; underpins the category breakdown everywhere.

### MVP-5: Supplier procurement slice on `/companies/$cui`
- **User problem:** A company page shows registration/financials but not "how
  much public money does it receive and from whom".
- **Expected user value:** See a supplier's total public revenue, top buyers,
  categories, first/last seen — linked to its company profile.
- **Required data:** `procurement_flow_facts_v1`,
  `org_edge_monthly_rollups`, `supplier_cpv_division_monthly_rollups`.
- **Recommended UX pattern:** A "Venituri din achiziții publice" section on the
  company page: KPIs, top-buyers bar, category donut, cross-domain link chips
  (PNRR, investments, litigation).
- **Priority rationale:** Completes the money trail from both ends and powers
  cross-domain investigation (XS-4).

### MVP-6: Coverage & "data as of" transparency layer
- **User problem:** Users can't tell whether a number is complete or partial.
- **Expected user value:** Every aggregate shows coverage (CUI/amount/date/CPV
  presence rates) and a freshness timestamp; blocked filters are hidden with an
  honest explanation.
- **Required data:** `aggregate_quality_by_grain`,
  `public_contracts_filter_capabilities_v1`, load-run / watermark metadata.
- **Recommended UX pattern:** A reusable "DataQualityBadge" + coverage tooltip
  on every KPI/chart; a "Despre datele acestea" explainer; a site-wide
  procurement "data as of" + cadence note.
- **Priority rationale:** Trust is the product's core asset; the scraper already
  built the gate — the UI must reflect it.

### High-value next features (post-MVP, before full Advanced)

- **Review-signals explorer (same-day DA, repeated pairs, modification
  inflation).** User problem: patterns are computed but invisible. Value: the
  signature investigative use case. Data: `same_day_direct_acquisition_candidates`,
  `org_edge_monthly_rollups` (repeated pairs), `contract_modifications`. UX: a
  dedicated `/achizitii/semnale` with leaderboards, cluster drill-downs, and
  export — every item labeled "semnal de verificare, nu o concluzie". Rationale:
  the highest-journalism-value surface and a key differentiator.
- **Supplier concentration analysis (top-N share, HHI).** User problem: "is
  this authority's spend captured by one supplier?" Value: a single honest
  metric. Data: `org_edge_monthly_rollups`. UX: concentration gauge + top-N with
  share. Rationale: directly answers PC-5/PC-14, a flagship analytical question.
- **Cross-domain entity 360.** User problem: procurement is an island. Value:
  one profile linking procurement → companies → PNRR → litigation → parliament.
  Data: CUI joins across domains. UX: a unified profile rail. Rationale: makes
  the whole platform more than the sum of its domains (XS-1/XS-4).
- **TED above-threshold cross-reference.** User problem: can't see the EU-level
  view of a notice. Value: reconcile SICAP↔TED. Data: TED RO lane (in-flight) +
  `tedNoticeNo` join. UX: a "Vezi și pe TED" link on procedure/contract pages.
  Rationale: low-effort once the TED lane loads; adds authoritative EU layer.
- **Per-lot e-licitatie winners on procedure pages.** User problem: procedures
  lack supplier-level awards. Value: completes the award picture on ~316k CANs.
  Data: `elicitatie_ca_notice_contracts` (captured, not yet served). UX: a
  "Câștigători pe loți" section on the procedure page. Rationale: fills the
  biggest known data gap once the loader serves it.

---

## 14. Advanced Features

Same per-feature fields.

### Advanced-1: CNSC appeal-outcome integration
- **User problem:** Can't see whether a contract was contested and the outcome.
- **Expected user value:** An appeal/risk signal on procedures and contracts.
- **Required data:** CNSC decisions (lane currently parked/portal-blocked; needs
  a Playwright browser lane); SICAP notice_no join.
- **Recommended UX pattern:** A "Contestatții" section on procedure/contract
  pages with decision date, outcome, and a redacted PDF link (PII-gated per
  scraper privacy policy).
- **Priority rationale:** Unique legal system-of-record signal; blocked on
  extraction, so deprioritized until the lane is unblocked.

### Advanced-2: DA line-item + document viewer
- **User problem:** Direct acquisitions are list-only; no catalog items or
  documents.
- **Expected user value:** Inspect what was actually bought (line items) and the
  award documents.
- **Required data:** `elicitatie_direct_acquisition_detail` (getView) + DA
  documents (lanes not yet captured).
- **Recommended UX pattern:** Expandable line-item table + document list with
  MinIO-backed download links (privacy-class aware).
- **Priority rationale:** High value but large extraction effort; post-MVP.

### Advanced-3: Supplier-risk enrichment (debarred operators, bid-rigging
        blacklist, ANAP ex-ante)
- **User problem:** No risk context on a supplier.
- **Expected user value:** A "semnale de risc furnizor" chip linking to
  debarment/sanction evidence.
- **Required data:** ANAP/Competition Council/e-licitatie debarment lists (small
  PDF/HTML scrape, not captured).
- **Recommended UX pattern:** Risk badges on supplier profiles + a dedicated
  risk register page.
- **Priority rationale:** Unique but small and effort-intensive; later.

### Advanced-4: Authority/supplier comparison tool
- **User problem:** Hard to benchmark one authority against another.
- **Expected user value:** Side-by-side spend, concentration, categories,
  territory.
- **Required data:** Rollups + territory.
- **Recommended UX pattern:** `/achizitii/compara` with 2-N entity picker and
  synced charts.
- **Priority rationale:** Power-user feature; builds on MVP rollups.

### Advanced-5: Status lifecycle timeline (from raw snapshots)
- **User problem:** Current-state status hides history.
- **Expected user value:** A timeline of status changes per procedure/contract.
- **Required data:** `elicitatie_source.contract_snapshots` (raw, 14M snapshots
  over 13.7M contracts); `procurement.status_events` is deferred — derive from
  snapshots on demand.
- **Recommended UX pattern:** A vertical timeline on detail pages, "istoric
  stadii", derived from snapshots.
- **Priority rationale:** Deferred by the scraper until a UI needs it; this is
  the UI need.

### Advanced-6: Natural-language procurement assistant (LLM, discovery-only)
- **User problem:** SQL-level questions are hard for lay users.
- **Expected user value:** Ask "cine sunt principalii furnizori ai primăriei X
  în 2024?" and get a coverage-cited answer.
- **Required data:** Deterministic rollups (never LLM as authoritative filter —
  per capability gate).
- **Recommended UX pattern:** A grounded Q&A box that always cites the
  deterministic projection + coverage; LLM only for paraphrase/discovery.
- **Priority rationale:** Aligned with the scraper's "LLM is discovery only"
  policy; high polish, later.

---

## 15. UX Risks and Edge Cases

- **Misleading totals from garbage/currency rows.** A few garbage values
  (1e9–1e11) and null-RON non-RON rows can distort top-N. Mitigation: cap/flag
  outliers, show native currency, never sum mixed currencies, expose evidence
  refs for top items.
- **Over-claiming review signals.** Same-day candidates and repeated pairs are
  **not** findings of illegality. Mitigation: consistent "semnal de verificare"
  labeling, an explainer, and no guilt-implying iconography.
- **`unknown` status confusion.** Some rows are `unknown` (unmapped source
  vocabulary). Mitigation: show `unknown` explicitly with a tooltip; never
  silently fold it into another status.
- **Missing dates on procedures.** ~310k e-licitatie procedures lack
  `publication_date` until a reload applies the fallback fix. Mitigation:
  date-filter/sort must degrade gracefully and show coverage.
- **Ugly names (CUI prefix + pipes).** Until the name-hygiene reload, names may
  contain `|...|`. Mitigation: prefer CUI-based identity; render a cleaned name
  when available; never display raw pipes as the primary label.
- **Unlinked modifications.** ~12-20% of modifications don't link to a contract.
  Mitigation: show an "Modificări neasociate" section rather than hiding them.
- **Currency not converted.** No FX; some values are EUR/USD in `attrs`.
  Mitigation: show "valoare nativă" with currency; do not offer an EUR total
  switch.
- **Freshness lag.** Sync CronJobs are suspended (`suspend: true`), not yet
  activated; some validation CronJobs were erroring on 2026-06-25. Mitigation:
  prominent "data as of" + cadence; a data-status page.
- **Blocked filters presented as available.** Supplier region and LLM filters
  are blocked in v1. Mitigation: hide them or show the blocker reason; never
  let an LLM facet pose as authoritative.
- **Privacy / PII.** Raw procurement is PII-rich (winner/authority contacts,
  document files). Mitigation: enforce privacy at the serving layer (scraper
  policy), redact contact PII, gate document access by `privacy_class`.
- **Scale/perf.** 19M DAs + 16.5M flows. Mitigation: serve aggregates from
  materialized rollups (not live fact-table scans); paginate; reuse the client's
  existing virtualization (`@tanstack/react-virtual`).
- **Dual-source confusion (SEAP vs e-licitatie).** The same acquisition may
  appear in both; canonical-flag dedup handles it but users may see "duplicate"
  notices. Mitigation: a "surse" badge + a "why you may see this twice" explainer.

---

## 16. Open Questions

1. **Serving readiness of the new lanes.** When will per-lot e-licitatie winners,
   TED RO, and entity profiles be **loaded into serving** (raw is captured/
   verified) so the UI can use them? (Affects MVP-3 "Câștigători pe loți" and the
   TED cross-reference.)
2. **CPV Romanian labels.** `cpv_divisions.label_ro` is not populated (only EN).
   Should the platform seed the official RO CPV-2008 vocabulary (api-pub
   `searchCpvs`) before launch, or ship with EN labels + a RO mapping later?
3. **Currency / FX decision.** Keep the current "null RON + native in attrs +
   flag" policy, or invest in an FX rate source to offer EUR totals? (Affects
   every value aggregate.)
4. **Status events timeline.** Is there user demand for a status-history
   timeline that justifies deriving `procurement.status_events` from raw
   `contract_snapshots`, or is current-state enough for v1?
5. **Sync activation.** When will the daily/monthly CronJobs be unsuspended and
   the 2026-06-25 validation errors resolved, so the UI can advertise a reliable
   freshness cadence?
6. **CNSC unblock.** Is a Playwright browser lane for CNSC decisions on the
   roadmap, and is `contestati.ro` an acceptable interim seed/cross-check?
7. **Supplier territory.** Will supplier region ever be verified (currently
   blocked), or is buyer-region the permanent territory lens for procurement?
8. **Entity-360 ownership.** Which domain owns the cross-domain entity 360
   (XS-1/XS-4), and does procurement contribute slices into a shared profile, or
   host its own?

---

## 17. Final Recommendation

- **Best starting point:** Build the **native authority procurement slice on
  `/entities/$cui`** (MVP-1) that replaces the current SICAP.ai iframe, powered
  by the already-built deterministic rollups
  (`org_edge_monthly_rollups`, `authority_cpv_division_monthly_rollups`) and the
  coverage gate. It is the highest-leverage, lowest-risk move: it turns 19M rows
  into a readable answer on a page that already gets traffic, with data that is
  already served and quality-gated.

- **Highest-value user journey:** The **journalist concentration journey**
  (§8.2): authority → top suppliers with share → repeated pair / same-day
  candidate → supplier cross-domain profile. This is the journey that
  differentiates Transparenta.eu from a raw SEAP mirror and directly serves the
  watchdog audience the scraper's PC-1…PC-15 catalog was designed for.

- **Most important MVP feature:** **MVP-1 (native authority procurement slice)**
  — with **MVP-6 (coverage & "data as of" layer)** as the non-negotiable trust
  companion. Together they deliver an honest, integrated answer to the single
  most common procurement question.

- **Biggest UX risk:** **Over-claiming review signals and under-disclosing data
  quality.** Same-day/repeated-pair signals presented as verdicts, or totals
  built from garbage/currency-mixed/null-RON rows, would destroy the trust the
  platform depends on. Mitigation: consistent "semnal de verificare" labeling,
  outlier flagging, no mixed-currency sums, and visible coverage on every
  number.

- **Biggest data dependency:** **Serving-side activation of the new lanes and
  sync.** Per-lot winners, TED RO, entity profiles, CPV RO labels, the suspended
  sync CronJobs, and the deferred name-hygiene/procedures-date reloads all
  determine what the UI can honestly show. The MVP must be designed to degrade
  gracefully (coverage-aware) until those land, and the roadmap must sequence UI
  features against the loader/sync rollout.

- **Top open questions:** (1) when do per-lot winners / TED / entity profiles
  reach serving; (2) seed Romanian CPV labels now or later; (3) keep no-FX
  currency policy or add an FX source; (4) is a status-history timeline worth
  deriving from snapshots; (5) when will sync CronJobs be activated and the
  2026-06-25 validation errors resolved.

## Design Handoff Notes (added in review)

- **Canonical route assumption:** hybrid. Authority procurement lives first as a native slice on `/entities/$cui`; supplier procurement lives on `/companies/$cui`; procurement-owned search and detail pages live under `/achizitii/*`.
- **Shared components to reuse/build:** EvidenceViewer / SourceProvenanceDrawer, CoverageRibbon, FreshnessBadge, DataStatusBadge, ReviewSignalBadge (`semnal de verificare, nu concluzie`), EntityRelatedLinks rail, CSV/export action.
- **First screen to design:** the `/entities/$cui` authority procurement slice replacing the SICAP.ai iframe: headline spend/counts, top suppliers, category breakdown, recent records, coverage/freshness strip, and review-signal teaser.
- **Copy guardrail:** Romanian UI must explain `achizitie directa`, `procedura`, `contract`, `CPV`, `valoare nativa`, and `semnal de verificare` in plain language.
- **Product-owner question:** confirm whether procurement records join global search in v1, and whether search results may include review-signal teasers or only neutral record metadata.
