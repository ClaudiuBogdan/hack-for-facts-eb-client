# Procurement — Product Intent & Requirements

> Domain slug: `procurement` · Public-facing UI language: **Romanian** · URL paths: **English**
> (to match `/entities`, `/companies`). This document is the clean intent/requirements spec
> for the procurement domain. It supersedes the previous research doc and drives
> `docs/design/procurement/design.md` (build-ready) and the implementation.
>
> Labels used where a statement needs grounding: **Fact** (grounded in the scraper raw DB /
> data inventory), **Decision** (a product/UX choice we are committing to), **Assumption**
> (a sensible inference to verify at implementation). Data figures are grounded against the
> raw database via the codex investigation (`scratchpad/procurement-raw-data-report.md`) and
> the scraper `prod-db/DATA_INVENTORY.md`.

---

## 1. Purpose & scope

Procurement makes the **public money trail** legible: from a **public institution** (the
buyer / contracting authority) to the **company** that gets paid (the supplier), classified
by **what was bought** (CPV category), with honest coverage and a path back to the source
notice on e-licitatie.ro.

Public framing: **"Urmărim banii din achiziții publice până la compania care îi primește."**
It is the bridge between *who spent it* (budget / commitments / entities) and *who received
it* (companies), and the largest, most scrutiny-prone public-data domain.

**In scope:** the three procurement grains (procedures, contracts, direct acquisitions) plus
contract modifications; CPV classification; per-institution and per-company views; search;
advanced analytics; and the coverage/freshness transparency layer.

**Out of scope here:** company registry internals (`/companies`), budget execution
(entities/budget), and PNRR/litigation/parliament internals (linked, not owned).

---

## 2. Who uses it & how

Three real usage patterns drive the whole design. Each maps to a primary surface.

| # | User & job | What they want | Primary surface |
| --- | --- | --- | --- |
| 1 | **Citizen / journalist checking one institution** — "what did my primărie / hospital / school buy?" | Contracts they had: which **companies**, **timeline**, **values**, **# of contracts**, **domains (CPV)**, **top companies**, **top contracts**, **most recent** ones. | **Public institution page** |
| 2 | **Anyone checking one company** (private *or* state-owned) — "who in the public sector does this firm work with?" | **Which public institutions** it had contracts with, **total / top**, **time interval**, plus useful context. | **Company (supplier) page** |
| 3 | **Visitor exploring the domain** | A **search** to jump to an institution / company / contract, and **headline stats** for the whole domain. | **Main page** |
| 4 | **Journalist / researcher** | **Aggregate values by arbitrary filters**, advanced search, comparison, export. | **Advanced analytics page** |

**Decision:** Design institution-first and company-first. The single most common job is
"look up a specific institution or company," so the lookup pages and the search that reaches
them are the product's spine — not a generic dashboard.

---

## 3. Product surfaces (information architecture)

**Decision — hybrid architecture.** Dedicated procurement pages live under `/procurement`;
the existing entity/company profile pages get a compact **procurement summary slice** that
links into the dedicated page. URL paths are English; UI copy stays Romanian.

| Surface | Route | Intent |
| --- | --- | --- |
| **Main page** | `/procurement` | Search + domain headline stats (PNRR-like) + entry points. |
| **Search** | `/procurement/search` | Find an institution / company / contract. Reuses the existing experimental search, scoped to procurement. |
| **Public institution** (buyer) | `/procurement/institutions/$cui` | Everything a buyer bought: top companies, categories, top/recent contracts, timeline. |
| **Company** (supplier) | `/procurement/suppliers/$cui` | Everything a company sold to the public sector: top institutions, total/time interval, categories. Works for private *or* public companies. |
| **CPV category** | `/procurement/categories/$code` | "What is bought" in a category: top institutions & suppliers, trend. |
| **Advanced analytics** | `/procurement/analytics` | Aggregate by any allowed dimension; advanced search; map; export. Researcher surface. |
| **Comparison** | `/procurement/compare` | Two institutions or two companies side by side. |
| **Contract detail** | `/procurement/contracts/$id` | One contract: parties, value, status, modification trail, source. |
| **Procedure detail** | `/procurement/procedures/$id` | One tender/notice: type, CPV, estimated vs awarded, linked contracts. |
| **Direct-acquisition detail** | `/procurement/direct-acquisitions/$id` | One catalog buy: parties, value, dates, source. |
| **Summary slice — buyer** | `/entities/$cui` (procurement view) | Compact teaser → institution page. Replaces the SICAP iframe. |
| **Summary slice — supplier** | `/companies/$cui` · `/intreprinderi-publice/$cui` | Compact teaser → supplier page. Private page already has it. |

**Decision:** Romanian-slug routes (`/achizitii/*`) are renamed to the English paths above.
See §10 for the full rename map.

---

## 4. Surface requirements

Every surface follows the platform's clean-UI principles (`DESIGN.md`): most-relevant first,
strict three-tier hierarchy, one accent, borders not shadows, progressive disclosure,
tabular figures, details-on-click. Reuse PNRR structural patterns (KPI tile, ranked list with
fill bar, map+sheet, deferred render) in the neutral-navy skin — not the brutalist skin.

### 4.1 Main page (`/procurement`)

The opposite of today's flat, six-band landing. Hierarchy:

1. **Hero + 4 KPI tiles — counts lead** (identity coverage is high, value is outlier-prone; §6):
   # direct acquisitions (13.4M+), # contracts, # institutions (buyers), # companies (suppliers).
   Total value appears only as a secondary, clearly-caveated figure (outlier-guarded, or the safer
   awarded-contracts total ~30B RON), never as an unguarded hero number. Freshness "date până la
   …" shown **inline**, never as a banner above the numbers.
2. **Search element**, front and centre — the reused experimental search (§5), scoped to
   procurement; placeholder "Caută o instituție, o firmă sau un contract".
3. **Primary band — the money trail (both ends):** two ranked leaderboards side by side —
   **top institutions (buyers)** and **top companies (suppliers)** — using the PNRR
   `RankedListCard` (fill bars, top-N + expand). Each row links to its dedicated page.
   Default ranking is **count** unless value coverage + outlier filtering allow value
   (see §6 — value-ranked top-N is outlier-sensitive).
4. **Top CPV categories** band → `/procurement/categories/$code`.
5. **Spend over time** (deferred render, below the fold).
6. **Entry points** (instituții · firme · categorii · analiză avansată) and a plain-language
   explainer accordion (achiziție directă / procedură / contract / CPV).

**Cut from today:** the amber coverage banner above the numbers; the 4 duplicate "entry
cards" that all point to the same URL; the suppliers-absent landing.

### 4.2 Public institution page (`/procurement/institutions/$cui`) — buyer view

Answers usage pattern #1. Structure:

- **Header:** institution identity + link to `/entities/$cui`; totals (value, # contracts,
  # direct acquisitions), **time interval covered**, coverage/freshness chip.
- **Top companies** it buys from — count + value + share, link to each supplier page.
- **Domains (CPV)** breakdown.
- **Top contracts** and **most recent** records — record cards (value, date, supplier,
  status, e-licitatie deep link).
- **Timeline** — spend over time (amount-present vs amount-missing split).
- **Concentration** — top-1 / top-5 supplier share.
- **Cross-domain rail** — budget execution, commitments, PNRR, parliament.

### 4.3 Company / supplier page (`/procurement/suppliers/$cui`) — supplier view

Answers usage pattern #2; works whether the company is private (`/companies/$cui`) or
state-owned (`/intreprinderi-publice/$cui`). **Reuses the existing `ProcurementSupplierSlice`
as the basis.** Structure:

- **Header:** company identity + link to its profile; **total public revenue**, # buyers,
  # contracts, **time interval (first–last seen)**, coverage chip.
- **Which public institutions** it worked with — top buyers, count + value + share, link to
  each institution page.
- **Domains (CPV)**, **top / most-recent contracts**, **revenue over time**.
- **Concentration** — single-buyer share (how dependent on one institution).
- **Cross-domain rail** — company profile, PNRR contractor, public investments, litigation,
  money flows.

### 4.4 Advanced analytics (`/procurement/analytics`) — researcher surface

- **Advanced search** + **aggregate by any allowed dimension**: institution, company, CPV
  division, county/region (buyer-side), year, grain, status, source system.
- **Group-by + metric** (count / value), top-N tables, charts, a **buyer-geography map**,
  a **comparison** entry, **CSV export**, and fully **shareable filtered URL state**.
- **Strictly respects the capability gate:** blocked dimensions (supplier region, LLM
  filters) are hidden or shown with an explicit blocker reason — never as authoritative.

### 4.5 CPV category pages (`/procurement/categories/$code`)

"What is bought." CPV label (RO when available, EN fallback) + parent/division, total spend
and counts over time, **top institutions and suppliers** in the category (gate-permitting),
trend chart. Makes opaque CPV codes navigable in plain language.

### 4.6 Detail pages (contracts / procedures / direct-acquisitions)

One shared "procurement record" template with per-grain slots: identity/IDs, status badge,
value (RON or native currency — never invented), parties (authority + supplier, linked), CPV,
dates, **modification trail** (before → after → delta) for contracts, a deep link to the
source notice, and a provenance drawer. **Unknown IDs return 404**, not a thrown error.

### 4.7 Comparison (`/procurement/compare`)

Two institutions or two companies side by side: spend, supplier/buyer concentration,
categories, and time. Power-user feature; builds on the same rollups.

### 4.8 Summary slices on profile pages

A compact procurement teaser that links into the dedicated page:

- **`/entities/$cui`** (buyer) — a new procurement view that **replaces the SICAP.ai iframe**
  (`ContractsView`): headline spend/counts, top suppliers, category breakdown, recent
  records, coverage chip, "Vezi achizițiile" → `/procurement/institutions/$cui`.
- **`/companies/$cui`** (supplier) — the existing `achizitii` tab already renders
  `ProcurementSupplierSlice`; keep it, add the "Vezi profilul de achiziții" deep link.
- **`/intreprinderi-publice/$cui`** (public-enterprise supplier) — add an `achizitii` tab
  mounting the same slice.

---

## 5. Search model

**Decision:** Reuse the **existing experimental search** rather than building a bespoke one.
Keep it to a single search element now; improve or replace later.

- The experimental search (`src/features/entity-search/*`, GraphQL `searchEntities`) already
  returns typed hits and supports a `docTypes` filter. For procurement, scope it to
  `['procurement_contract', 'procurement_procedure']` (both are actively populated); it can
  also surface institutions and companies via their entity/company doc types.
- The main page embeds this search; `/procurement/search` is the full results page.
- **Advanced filtering and aggregation are NOT in the simple search** — they live on
  `/procurement/analytics`. Simple search escalates to analytics for deep queries.

---

## 6. Data foundation

**Grounded in the raw DB** — confirmed by a read-only audit of the live raw Postgres
`transparenta_eu_public_contracts_raw` (codex report `scratchpad/procurement-raw-data-report.md`),
cross-checked with `prod-db/DATA_INVENTORY.md`.

**Two source systems, not yet deduplicated in raw (Fact).** Procurement comes from
**e-licitatie** (`elicitatie_source.*`, live API) and **SEAP/SICAP bulk** (`seap_source.*`,
data.gov.ro). They overlap; the **serving layer** dedups them into canonical grains, but raw
counts double-count. Use the serving/canonical figures for totals; never present a raw
cross-source count as unique (a `(notice_no, contract_no)` pair is not a unique contract).

| Family | System | Rows (raw, exact) | Notes |
| --- | --- | ---: | --- |
| Direct acquisitions | e-licitatie | **13,452,435** | 2017–2026; authority & supplier CUI ~99% |
| Direct acquisitions | SEAP | **4,777,220** | supplier CUI on ~99.98% |
| Contracts / awards | SEAP | **2,673,609** | supplier CUI ~97% |
| Direct-award notifications | SEAP | **1,527,120** | CUI ~96% |
| CA notice list (procedures) | e-licitatie | **310,391** | authority CUI 100%; **no supplier** (join to winners) |
| Award contracts / winners | e-licitatie | **15,315** | winner CUI ~99.9%; **values are safe** |
| Initiation notices | SEAP | **305,401** | — |
| Contract modifications | SEAP | **55,815** | links to a contract on only **~40%** of rows |
| TED notices | TED | **111,800** | 2024–2026; **buyer only** (no winner/amount/CPV typed) |
| CPV codes / divisions | — | ~9.8k / 46 | Romanian labels **not populated** |
| CNSC disputes | CNSC | **0** | schema only — **not loaded** |

The canonical serving model collapses these into three grains (**direct acquisitions ~19M**,
**contracts ~1.9M**, **procedures ~621k**) plus modifications, fed into monthly rollups
(`org_edge_monthly_rollups`, `authority_cpv_division_monthly_rollups`, …) — aggregates read
rollups, never live fact scans.

**Reliable today — build on these:**
- **Counts** — by grain, by procedure/notice type, recent activity, spend-over-time *by count*.
  Identity (CUI) coverage is high (~96–99%), so **count-ranked** top institutions/suppliers and
  CPV/count breakdowns are dependable.
- **Awarded-contract value** (e-licitatie CA winners): ~**30.2B RON** over 15,315 rows, max ~8B
  (plausible) — a *safe* value surface, unlike direct-acquisition values.

**Unsafe — must guard (Fact):**
- **Value totals and value-ranked top-N from direct acquisitions are NOT reliable.** Outliers are
  severe and ratio-based, not absolute: one DA shows **26.3 trillion RON** against a 26k estimate;
  a single school sums to 80B RON. A 100B cap is insufficient. **Decision:** default every ranking
  and the page headline to **counts**; show value only with ratio/outlier guards + visible evidence
  refs, and label any "valoare" as partial/estimated.
- **No payment data.** Values are estimated / awarded / closing — never amounts actually paid.
  Never imply "plătit".

**Other hard constraints (Fact):**
- **Currency:** non-RON → null RON; **never sum mixed currencies**; show native value+currency; no FX.
- **Dates:** e-licitatie/TED are typed; **SEAP dates are ambiguous strings** in `row_raw`
  (DD/MM vs MM/DD) needing normalization; ~310k e-licitatie procedure rows lack typed dates.
- **Names:** composite "CUI + name" strings (e.g. `1959768 Apavital SA Iasi`) — prefer CUI identity.
- **Status:** `unknown` is **first-class**; cross-source SEAP↔e-licitatie **dedup is a serving
  concern**, not the UI's.
- **Modifications:** only ~**40%** of modification rows link to a contract — show unlinked ones.
- **EU-funded flag:** present in **SEAP only**, not typed on e-licitatie direct acquisitions.

**Capability gate (serving):** `spend_ranked_top_n`, `cpv_category_filter`, `buyer_region_filter`
are gated behind coverage thresholds; `supplier_region_filter` and `llm_generated_filter` are
**blocked** and must never appear as authoritative.

---

## 7. Trust & honesty requirements

These are non-negotiable and apply to every surface:

- **Coverage adjacent to the number**, not in a footnote — KPI/ranking/chart each carry a
  coverage affordance; page-level `CoverageRibbon`; "data as of" + cadence.
- **Currency rule** (§6): RON or native; never mixed sums; flag/cap outliers; guard negatives.
- **Every record is verifiable** — deep link to e-licitatie.ro + a source/provenance drawer.
- **Identity is CUI-first** — joins and links key on CUI; show a confidence badge when an
  authority↔entity or supplier↔company match is partial.
- **Neutral language** — `semnal`, `necesită verificare`, `diferență`, `concentrare`; never
  wrongdoing labels. (Review-signal patterns exist in the data but are **deferred** here — §13.)

---

## 8. Cross-domain links (CUI spine)

- **Supplier** (CUI ~97–99% match): → company profile, PNRR contractor, public investments,
  litigation, money flows.
- **Institution** (CUI ~73–92% match): → entity profile, budget execution / commitments,
  parliament, legal acts.
- **Record:** → money-flow fact, source notice, and (later) TED / CNSC.

Every cross-domain link shows its join basis (CUI) and, where partial, its confidence.

---

## 9. Geography

Buyer-side only. There is **no SIRUTA in procurement raw**; buyer county/region must resolve via
authority CUI → entity/organization registry → SIRUTA downstream (the join rate must be measured
before launch; SEAP notices carry `Judet` on ~62% as a fallback). The advanced-analytics
**buyer-geography map** is the geographic surface, ranked by **count** by default (value is
outlier-prone, §6); institution pages may show their own county. **Supplier geography is
unavailable** — no supplier map.

---

## 10. Naming, routes & i18n

- **Decision:** English URL paths under `/procurement` (consistency with `/entities`,
  `/companies`). **UI copy and the sidebar label stay Romanian** ("Achiziții publice").
- **Decision:** This diverges from the `DESIGN.md` "Romanian slugs for new domains" rule; we
  may revisit the other domains later. Record it in the DESIGN.md decision log.
- **i18n:** all UI text via Lingui (RO primary, EN catalog); locale-aware money/number/date;
  expand acronyms (CPV, SEAP, SICAP, DA, TED) on first use or in a tooltip.

**Route rename map:**

| Old (Romanian) | New (English) |
| --- | --- |
| `/achizitii` | `/procurement` |
| `/achizitii/cautare` | `/procurement/search` |
| `/achizitii/cpv/$code` | `/procurement/categories/$code` |
| `/achizitii/contracte/$id` | `/procurement/contracts/$id` |
| `/achizitii/proceduri/$id` | `/procurement/procedures/$id` |
| `/achizitii/achizitii-directe/$id` | `/procurement/direct-acquisitions/$id` |
| — (new) | `/procurement/institutions/$cui` |
| — (new) | `/procurement/suppliers/$cui` |
| — (new) | `/procurement/analytics` |
| — (new) | `/procurement/compare` |

Keep the old Romanian paths as redirects to the new English ones for any shared/indexed URLs.

---

## 11. Reuse map (don't rebuild)

- **Search:** `src/features/entity-search/*` (`useEntitySearch`, `searchEntities`, `docTypes`),
  `src/routes/experimental.search.tsx`.
- **Supplier slice:** `src/features/procurement/components/procurement-supplier-slice.tsx`
  (`ProcurementSupplierSlice`), already mounted on `/companies/$cui` via
  `src/features/private-companies/components/private-company-achizitii-tab.tsx`.
- **Existing procurement components:** `MetricCard`, `ValueWithCurrency`,
  `ProcurementStatusBadge`, `CpvLabel`, `PartyRankingChart`, `CategoryBreakdown`,
  `SpendOverTime`, `GrainSelector` (`src/features/procurement/components/*`); schemas in
  `src/schemas/procurement.ts`; trust components in `src/components/shared/procurement-data/*`.
- **Mount points:** entity views in
  `src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx` +
  `src/components/entities/validation.ts` (replace `ContractsView`); public-enterprise tabs
  `src/features/public-enterprises/lib/tab-config.ts`.
- **Patterns:** `DESIGN.md` Reference Patterns (PNRR `InsightCard` / `RankedListCard`,
  map+sheet, `DeferredOverviewSection`; parliament hub cards) — structure, neutral-navy skin.

---

## 12. MVP scope & sequencing

1. **Rename** `/achizitii/*` → `/procurement/*` (with redirects) and **redesign the main
   page** (`/procurement`) to the §4.1 hierarchy.
2. **Public institution page** (`/procurement/institutions/$cui`) + the **buyer summary
   slice** on `/entities/$cui` (replacing the SICAP iframe).
3. **Company/supplier page** (`/procurement/suppliers/$cui`) by promoting
   `ProcurementSupplierSlice`; add the `achizitii` tab to public enterprises.
4. **CPV category pages** + **detail pages** (the evidence trail).
5. **Advanced analytics** (`/procurement/analytics`) with the buyer-geography map, export,
   shareable state, and **comparison** (`/procurement/compare`).

All surfaces are mock-first until the serving API is wired; mock shapes mirror the rollup
contracts so going live is an adapter swap (`isMockDataEnabled('public-contracts-seap')`).

---

## 13. Deferred / out of scope

A dedicated **review-signals surface** (`/procurement/semnale`: same-day DA, repeated pairs,
modification inflation) — data exists, parked for a later phase.

**Not available in the data today — do not promise (Fact, codex):** actual **payments / paid
amounts** (only estimated/awarded/closing values exist), **bidder / loser lists**, **lots** and
**line items** (only tiny samples), **contract documents** (181 link-only rows), **CNSC** disputes
(schema empty), **TED** winners/amounts/CPV (only buyer/title/date typed), and **PAAP** plans
(catalog rows only). Also deferred: **FX / EUR totals** and a **status-history timeline**.
Cross-source (SEAP↔e-licitatie) **dedup** is handled by the serving layer, not the UI.

---

## 14. Open questions (blockers only)

1. **Value-ranked top-N safety** — confirm whether the serving rollups already apply robust
   outlier filtering, or whether the UI must default to count-ranked until they do.
2. **Serving readiness** — when do per-lot e-licitatie winners, TED RO, entity profiles, and
   CPV Romanian labels reach the serving layer (they gate richer institution/supplier views)?
3. **Sync activation** — when is the suspended sync re-enabled, so we can advertise a reliable
   freshness cadence?

All other uncertainties (no-FX currency policy, `unknown` status, dirty names, unlinked
modifications, missing procedure dates, blocked supplier region) are **designed-for product
states**, not blockers.
