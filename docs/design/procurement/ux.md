# Procurement — UX Overview

> Design handoff for the **procurement** domain (slug: `procurement`).
> Consumes `docs/ux-research/procurement.md` (read-only) and `docs/design/README.md`.
> Convention: every nontrivial statement is labeled **Fact**, **Decision**, or
> **Assumption**. Open questions are blockers only.

- **Source UX document:** `docs/ux-research/procurement.md`
- **Shared foundation:** `docs/design/README.md`

## Product intent

Turn Romania's largest, most scrutiny-prone public-money domain into an honest,
plain-language money trail: *who buys → what they buy (CPV) → from whom → for how
much*, with coverage and freshness disclosed at every number, and deterministic
patterns surfaced as **review signals (`semnal de verificare`), never verdicts**.
Procurement is the bridge between the budget side ("who spent it") and the company
side ("who received it").

- **Decision:** Public framing — "Urmărim banii din achiziții publice până la
  compania care îi primește" — a money-trail surface, not a raw SEAP mirror.

## User roles and top jobs

- **Casual citizen** (Fact §3.1) — "Ce cumpără primăria / spitalul meu și de la
  cine?" Job: land on an institution page, read total spend, top suppliers,
  biggest purchases, top categories — in Romanian, jargon-free.
- **Journalist / analyst / NGO / watchdog** (Fact §3.2, the high-value audience) —
  Jobs: investigate supplier concentration, repeated buyer-supplier pairs,
  same-day direct-acquisition splitting, contract-modification inflation, young
  suppliers; export evidence; follow a supplier cross-domain. Backed by the
  scraper's ready-made PC-1…PC-15 question catalog.
- **Domain expert / auditor** (Fact §3.3) — Jobs: trace one procedure end-to-end
  (procedure → contracts → modifications), reconcile a notice number across
  SEAP/e-licitatie/TED, inspect unlinked records.

## MVP scope

Ordered MVP feature files (in `features/`):

1. `authority-procurement-slice.md` — native procurement slice on `/entities/$cui`,
   **replacing the SICAP.ai iframe** (`ContractsView`). Highest leverage.
2. `procurement-search-listing.md` — `/achizitii/cautare`, grain selector +
   capability-gated filter rail + result cards + coverage banner + CSV export.
3. `procurement-record-detail-pages.md` — `/achizitii/proceduri/$id`,
   `/achizitii/contracte/$id`, `/achizitii/achizitii-directe/$id` (shared template).
4. `cpv-category-page.md` — `/achizitii/cpv/$code`.
5. `supplier-procurement-slice.md` — procurement slice on `/companies/$cui`.
6. `coverage-data-as-of-layer.md` — reusable coverage + freshness + capability-gate
   transparency layer used by every other feature (cross-cutting; build alongside #1).

Also part of MVP IA but documented within the above: the `/achizitii` landing page
(documented in `design.md` §IA; it is a thin shell over the same components, no
separate feature file was assigned).

## High-value next scope

7. `review-signals-explorer.md` — `/achizitii/semnale` (same-day DA, repeated
   pairs, modification inflation, young suppliers) — the signature investigative
   surface.
8. `supplier-concentration-analysis.md` — top-N share + HHI per authority/category.
9. `cross-domain-entity-360.md` — CUI-joined profile rail (procurement ↔ companies
   ↔ PNRR ↔ litigation ↔ parliament).
10. `ted-cross-reference.md` — "Vezi și pe TED" on procedure/contract pages
    (gated on TED RO lane serving).
11. `per-lot-winners.md` — "Câștigători pe loți" on procedure pages (gated on the
    e-licitatie CA-notice-contracts loader serving).

## Source / data constraints (Fact, from UX §5–§6)

- **Three grains, not one table:** `procurement.procedures` (621,491),
  `procurement.contracts` (1,916,448), `procurement.direct_acquisitions`
  (18,988,987), plus `procurement.contract_modifications` (~43k). The UI must
  expose a **grain selector**; never merge them into one list.
- **Analytic surface is materialized rollups**, not live fact scans:
  `procurement_flow_facts_v1`, `org_edge_monthly_rollups`,
  `authority_cpv_division_monthly_rollups`,
  `supplier_cpv_division_monthly_rollups`,
  `same_day_direct_acquisition_candidates`, and the coverage gate
  `aggregate_quality_by_grain` / `public_contracts_filter_capabilities_v1`.
- **Capability gate is law.** Allowed answer classes: `filter_count`,
  `count_ranked_top_n`, `spend_ranked_top_n`, `buyer_region_filter`,
  `cpv_category_filter`, `same_day_direct_acquisition_signal`. **Blocked in v1:**
  `supplier_region_filter` and `llm_generated_filter`. The UI must hide blocked
  filters or show the blocker reason; never present them as authoritative.
- **Per-grain coverage thresholds** gate spend/region/cpv/signal answers
  (authority CUI ≥0.95, supplier CUI ≥0.95, amount ≥0.95 for spend, CPV ≥0.85,
  date ≥0.85, authority territory ≥0.70).
- **Currency, no FX:** non-RON rows have `value_ron = null` and keep native
  value+currency in `attrs`. Show native value+currency when RON is null;
  **never sum mixed currencies**; no EUR-total switch.
- **Status `unknown` is first-class** — show it honestly, never fold it away.
- **Missing dates:** ~310k e-licitatie procedures lack `publication_date` until a
  reload; date sort/filter must degrade gracefully and show coverage.
- **Garbage values:** ~74 canonical DA values in 1e9–1e11 are still garbage; top-N
  value rankings can be distorted — flag/cap outliers and link evidence refs.
- **Ugly names:** DA names may carry own-CUI prefix + `|...|` pipes; prefer
  CUI-based identity, render cleaned name when available, never show raw pipes as
  the primary label.
- **Unlinked modifications:** ~12–20% don't link to a contract; show them in a
  "Modificări neasociate" section, never hide.
- **Freshness lag:** sync CronJobs are code-complete but `suspend: true`; show a
  prominent "data as of" + cadence, and degrade honestly.
- **Sources today = e-licitatie/SICAP (SEAP).** TED, per-lot winners, entity
  profiles are captured but **not broadly served**; CNSC parked; PAAP/DA-detail
  deferred. Design these features coverage-aware and gate them behind a served
  flag.
- **Backend exists** (server `procurement` GraphQL + MCP module per
  `DATA_INVENTORY.md`); **client has no native procurement surface** today
  (`public-contracts-seap` catalog entry is `lifecycle: 'loading'`,
  `apiReady: false`). Hence: **mock-first** per the shared contract.

## Privacy / provenance constraints (Fact, UX §15)

- Procurement raw is **PII-rich** (winner/authority contacts, documents). Redaction
  and `privacy_class` gating happen at the serving layer; the UI must not surface
  contact PII and must use `PrivacyBoundaryNotice` where records are
  aggregated/redacted/withheld.
- Every aggregate/record must expose **source, retrieval/publication date, and a
  deep link to e-licitatie.ro** (the verifiable source row).
- **No accusation language.** Use `semnal de verificare`, `concentrare`,
  `recurență`, `diferență`, `necorelare`. Never "fraudă", "ilegal", "vinovat".
- Cross-domain joins are **evidence-led**: show *why* two records are linked (CUI
  match), and the join confidence when CUI match is partial.

## Design implications

- **Three reusable layers carry the domain:** (a) the coverage/freshness/capability
  transparency layer (`coverage-data-as-of-layer.md`), (b) the procurement record
  card + record header used in lists, slices, and detail pages, (c) the
  review-signal labeling kit. Build these once; every feature consumes them.
- **Hybrid routing** (orchestrator Decision): CUI slices live on `/entities/$cui`
  (authority) and `/companies/$cui` (supplier); search + detail pages live under
  `/achizitii/*`. Entity authority slice uses a new `view=achizitii` value in the
  existing `entitySearchSchema`; company slice uses a new `tab=achizitii` in the
  private-company tab set.
- **Aggregates from rollups, records from grain tables.** Slices/CPV pages read
  monthly rollups; search/detail read the grain tables. Mock shapes mirror both.
- **Investigative density** over marketing polish (shared README): tables, lists,
  evidence panels, compact typography, status via text+icon+color (never color
  alone). No hero atmospherics, no nested cards, radii ≤8px.
- **Money-flow visualization reuse:** reuse the existing `d3-sankey` /
  `MoneyFlowDiagram` pattern for authority → category → supplier; reuse PNRR's
  `DataQualityBanner`, `ExportButton` (CSV + BOM), filter-sheet, and chart patterns
  as the closest in-repo analog.

## Open questions (blockers only)

None block MVP-1, MVP-2, MVP-4, MVP-6 against current served data + mocks. Two
blockers gate **specific next-scope features only**, and those features are designed
to no-op until cleared:

1. **Per-lot winners + TED RO + entity profiles serving readiness** — raw is
   captured/verified but **not broadly loaded into serving**. Blocks
   `per-lot-winners.md` and `ted-cross-reference.md` from showing live data (mock +
   `blocked` state designed; flip on a served flag). (UX Open Q1.)
2. **Cross-domain ownership of entity-360** — whether procurement hosts its own
   profile or contributes a slice into a shared profile owned elsewhere. Blocks the
   *final placement* of `cross-domain-entity-360.md`, not the procurement-side
   slice contract. (UX Open Q8.)

Non-blocking known states (handled in-doc as product states, not footnotes): CPV
RO labels missing → EN fallback; no FX → native currency only; sync suspended →
"data as of"; status `unknown` → explicit label.
