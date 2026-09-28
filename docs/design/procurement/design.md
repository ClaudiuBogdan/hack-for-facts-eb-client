# Procurement — Domain Design

> Build-ready design decisions for the procurement domain. Pairs with `ux.md` and
> the per-feature files in `features/`. Labels: **Fact** / **Decision** /
> **Assumption**. Open questions are blockers only.

---

## 1. Domain purpose and scope

Procurement renders the public money trail from buyer (authority) to payee
(supplier), classified by CPV, with deterministic review signals. Scope:
procedures, contracts, direct acquisitions, contract modifications, CPV
classification, authority/supplier slices, search, and the coverage/freshness
transparency layer. Out of scope for this domain doc: company registry internals
(owned by `private-companies`), budget execution (owned by entities/budget),
PNRR/litigation/parliament internals (linked, not owned).

---

## 2. High-level design patterns

These patterns are the domain's backbone. Every feature references them by name.

- **Decision — Grain is explicit, never merged.** Procedures, contracts, direct
  acquisitions, and modifications have distinct lifecycles and grains (Fact UX §7).
  Lists use a **grain selector** (segmented `ToggleGroup`/`Tabs`); cards adapt
  per-grain fields; detail pages share one template with per-grain slots.

- **Decision — Coverage is adjacent to the number, not in a footnote.** Every KPI,
  ranking, and chart carries a coverage affordance (`CoverageRibbon` page-level,
  `DataStatusBadge` element-level, tooltip detail). A spend/region/CPV/signal answer
  is only shown as authoritative when the capability gate allows it for that grain;
  otherwise it is hidden or shown with a blocker explanation. This is the
  `coverage-data-as-of-layer.md` contract; treat it as a hard dependency.

- **Decision — Review signals are neutral.** Same-day DA, repeated pairs,
  modification inflation, young suppliers are wrapped in `ReviewSignalBadge` +
  always-present caption "semnal de verificare, nu o concluzie". No red/danger
  iconography, no guilt color. Each signal links to evidence refs.

- **Decision — Identity is CUI-first.** Names may be dirty (`|...|`, own-CUI
  prefix). Joins, links, and dedup key on CUI; display a cleaned name when present,
  fall back to CUI. Show `IdentityConfidenceBadge` when a CUI↔entity match is
  partial (authority match ~73–92%, supplier ~97–99% per UX §5.3).

- **Decision — Money is shown honestly.** RON when present; native value+currency
  (from `attrs`) when `value_ron` is null; **never sum mixed currencies** — a mixed
  set shows a RON subtotal + an "X înregistrări în altă monedă (neînsumate)" note.
  No EUR-total switch (no FX). Guard negatives and flag outliers.

- **Decision — Every record is verifiable.** Each record and aggregate row exposes
  a deep link to e-licitatie.ro (`EvidenceLink`) and a `SourceProvenanceDrawer`
  (source system, notice/contract no, retrieval date, parser caveats).

- **Decision — Aggregates from rollups; records from grain tables.** Slices and CPV
  pages read monthly rollups (fast, pre-gated); search/detail read grain tables.

- **Decision — Mock-first.** No native client surface exists yet
  (`public-contracts-seap`: `apiReady:false`). Each feature ships a typed mock
  adapter (`*.mock.ts`) shaped like the server contract, swappable for `*.live.ts`,
  per `docs/design/README.md` Mock-First contract and the PNRR/private-companies
  precedent.

---

## 3. Information architecture and routes

### 3.1 Canonical routes (orchestrator Decision)

| Route | Purpose | File-route |
| --- | --- | --- |
| `/achizitii` | Domain landing | `routes/achizitii.tsx` (+ `.lazy.tsx`) |
| `/achizitii/cautare` | Search & listing | `routes/achizitii.cautare.tsx` (+ `.lazy`) |
| `/achizitii/proceduri/$id` | Procedure detail | `routes/achizitii.proceduri.$id.tsx` |
| `/achizitii/contracte/$id` | Contract detail | `routes/achizitii.contracte.$id.tsx` |
| `/achizitii/achizitii-directe/$id` | Direct-acquisition detail | `routes/achizitii.achizitii-directe.$id.tsx` |
| `/achizitii/cpv/$code` | CPV category page | `routes/achizitii.cpv.$code.tsx` |
| `/achizitii/semnale` | Review-signals explorer (next) | `routes/achizitii.semnale.tsx` |
| `/entities/$cui?view=achizitii` | Authority procurement slice | existing route, new `view` value |
| `/companies/$cui?tab=achizitii` | Supplier procurement slice | existing route, new `tab` value |

- **Decision:** Romanian public slugs (`/achizitii`, `/cautare`, `/proceduri`,
  `/contracte`, `/achizitii-directe`, `/cpv`, `/semnale`, `/compara`) per shared
  Route Strategy. `$id`/`$code` are opaque server keys (e.g. `contract_key`,
  `da_key`, procedure id, CPV code), validated by route param parsing.
- **Decision:** Follow the existing route+lazy split (`*.tsx` route shell with
  `validateSearch`/`loader`/`head`, `*.lazy.tsx` component) as in
  `companies.$cui.tsx` / `pnrr.tsx`.

### 3.2 `/achizitii` landing (MVP, no separate feature file)

- **Decision:** Thin shell composed entirely from shared components:
  - Hero band: title "Urmărim banii din achiziții publice" + one-line intent, plus
    headline totals (total volume, # buyers, # suppliers, # records) **each with a
    `DataStatusBadge` and coverage caveat**; `CoverageRibbon` + `FreshnessBadge`
    "data as of".
  - Entry points (4 link cards/buttons): "Explorează o instituție", "Explorează un
    furnizor", "Categorii de achiziții (CPV)", "Semnale de verificare".
  - High-signal starters: top authorities by spend / top categories — **rendered
    only where `spend_ranked_top_n` / `cpv_category_filter` is gate-allowed**;
    otherwise show the count-ranked variant or an honest "indisponibil" note.
  - Plain-language explainer accordion: ce este o achiziție directă / procedură /
    contract / CPV / semnal de verificare (copy guardrail, UX §11.3).

### 3.3 Cross-domain links

- **Decision:** Preserve context with query params (`from`, `county`, `year`,
  `source`) per shared Route Strategy. Authority slice → budget/commitments,
  parliament, legal acts. Supplier slice → company profile, PNRR, investments,
  litigation. Records → money-flow fact, source notice, (later) TED, CNSC.
  Implemented via the shared `RelatedLinksRail`.

---

## 4. Shared layout and navigation decisions

- **Decision — Authority slice mounts in the existing entity view system.** Add
  `achizitii` to the `view` search param in `src/components/entities/validation.ts`
  (`entitySearchSchema.view`) and to the entity tab nav. It replaces the
  `contracts` view (the SICAP iframe `ContractsView`). Keep `contracts` as a
  legacy alias that normalizes to `achizitii` (mirrors the existing
  legacy-normalization comment in `validation.ts`).
- **Decision — Supplier slice mounts in the private-company tab system.** Add
  `achizitii` to `PRIVATE_COMPANY_TAB_IDS` (`src/features/private-companies/lib/tab-config.ts`)
  and the `tab` search param in `src/schemas/private-company.ts`. Icon:
  `Landmark` or `ReceiptText` (lucide). Label: "Achiziții publice".
- **Decision — `/achizitii/*` pages use the standard app shell** (sidebar +
  content), not a bespoke chrome. The landing, search, and detail pages share a
  constrained `max-w-6xl` content column for reading (search may go wider for the
  table); detail pages `max-w-4xl`.
- **Decision — Sticky filter bar** on `/achizitii/cautare` (shared README: list-
  heavy pages get a compact sticky filter bar). Slices use inline period/year
  controls, not a sticky bar.
- **Decision — Sidebar entry:** add "Achiziții publice" to the app sidebar nav
  (`src/components/ui/sidebar.tsx` / sidebar config) pointing at `/achizitii`.

---

## 5. Domain components and reuse plan

### 5.1 Reuse from shared/existing (do not rebuild)

- shadcn primitives (`src/components/ui`): `Button`, `Badge`, `Tabs`,
  `ToggleGroup`, `Table`, `Sheet`, `Dialog`, `Tooltip`, `Select`, `MultiSelect`
  / `styled-multi-select`, `Collapsible`, `Pagination`, `EmptyState`, `Card`
  (records only), `Skeleton`, `ScrollArea`, `Separator`, `Breadcrumb`,
  `active-filters-bar`, `filter-tag`, `amount-range-picker`,
  `debounced-status-input`, `copy-button`.
- Charts: `src/components/charts` + Recharts; `d3-sankey` + the existing
  `MoneyFlowDiagram` pattern for authority→category→supplier.
- Tables/virtualization: `src/components/tables` + `@tanstack/react-virtual` for
  large result lists.
- Maps: `src/components/maps` + advanced-map-analytics for buyer-region choropleth
  (next-scope only).
- PNRR analogs to copy patterns from: `PnrrDataQualityBanner` (collapsible coverage
  banner), `PnrrExportButton` (CSV + `﻿` BOM), `PnrrFilterSheet`,
  `PnrrStatsRibbon`, `PnrrProjectTable` + `PnrrProjectDrawer`.
- Entity/company hosts: `entity-profile-view` tab system; private-company tab
  system (`private-company-page.tsx`, `tab-config.ts`).

### 5.2 Shared cross-domain components to standardize here (README §"Shared
components to standardize")

These are used by ≥2 domains; procurement is a primary consumer. Build them under
`src/components/shared/` (or the agreed shared location) so legal/justice can reuse.

- `CoverageRibbon` — page-level source/freshness/known-gap summary.
- `DataStatusBadge` — `live | mock | partial | stale | blocked | unverified`.
- `FreshnessBadge` — "actualizat la / publicat la / date până la".
- `SourceProvenanceDrawer` — source URL, scraper ref, retrieval/publication dates,
  parser notes, caveats.
- `EvidenceLink` — inline link to a source row / e-licitatie.ro notice / document.
- `IdentityConfidenceBadge` — high/medium/low CUI↔entity match certainty.
- `PrivacyBoundaryNotice` — why a record is aggregated/redacted/withheld.
- `ReviewSignalBadge` — neutral signal indicator (must not imply wrongdoing).
- `RelatedLinksRail` — narrow cross-domain link rail.
- `ShareFilteredView` — copy-current-view affordance.
- `RequestDatasetAction` — request blocked/missing data (used on CNSC/DA-detail/TED
  "indisponibil" states).

Full prop contracts live in `features/coverage-data-as-of-layer.md` (it owns the
coverage/provenance trio + capability gate). Other features reference, not redefine.

### 5.3 Procurement-specific new components

- `ProcurementRecordCard` — one result row across grains; per-grain field slots
  (authority, supplier, value+currency, date, CPV+division label, status badge,
  source-system badge, e-licitatie deep link). Used by search, slices, CPV page,
  signals explorer.
- `ProcurementRecordHeader` — detail-page header (IDs, status, value, parties).
- `GrainSelector` — segmented control (proceduri | contracte | achiziții directe |
  modificări) wired to `grain` URL param.
- `ValueWithCurrency` — renders RON or native value+currency, handles null/negative/
  outlier flagging.
- `StatusBadge` (procurement) — per-grain status vocabulary incl. explicit
  `unknown` ("nedeterminat").
- `CpvLabel` — code + RO label (EN fallback) + division, with tooltip explainer.
- `TopSuppliersChart` / `TopBuyersChart` — horizontal bar (count + value + share).
- `CategoryBreakdown` — donut/treemap by CPV division.
- `SpendOverTime` — monthly bar/line with amount-present vs amount-missing split.
- `ModificationTrail` — timeline (before → after → delta, type, date) for contracts.
- `ConcentrationGauge` — top-1/top-5 share + HHI (next-scope).

---

## 6. Data model at the UI boundary

Mock-first; shapes mirror the server `procurement` GraphQL module and the rollup
views (Fact UX §5). Implementation puts these in `src/schemas/procurement.ts` and
feature mocks under `src/features/procurement/**/api`.

### 6.1 Record shapes (grain tables)

```ts
// Common identity + provenance carried by every procurement record
type ProcurementProvenance = {
  readonly sourceSystem: 'elicitatie' | 'seap_notice' | 'seap' | 'elicitatie_da'
    | 'seap_da' | 'seap_dan' | 'ted'
  readonly sourceUrl: string | null           // deep link to e-licitatie.ro / SEAP
  readonly retrievedAt: string | null          // ISO
  readonly publishedAt: string | null          // ISO; may be null (procedures bug)
  readonly isCanonical: boolean
  readonly dupGroupId: string | null
}

type Party = {
  readonly cui: string | null
  readonly name: string | null                 // may be dirty; render cleaned/fallback
  readonly displayName: string | null          // cleaned name when available
  readonly matchConfidence: 'high' | 'medium' | 'low' | null
}

type MoneyValue = {
  readonly ron: number | null                  // null for non-RON or garbage-flagged
  readonly nativeValue: number | null
  readonly currency: string | null             // 'RON' | 'EUR' | 'USD' | ...
  readonly isOutlier: boolean                   // flagged garbage / out-of-band
}

type ProcedureRecord = {
  readonly id: string
  readonly grain: 'procedure'
  readonly noticeNo: string | null
  readonly noticeKind: string | null
  readonly procedureType: string | null
  readonly contractKind: 'works' | 'services' | 'supplies' | null
  readonly title: string | null
  readonly authority: Party
  readonly cpvCode: string | null
  readonly cpvDivisionCode: string | null
  readonly estimatedValue: MoneyValue
  readonly awardedValue: MoneyValue
  readonly status: ProcurementStatus
  readonly countyName: string | null
  readonly publicationDate: string | null      // may be null (~310k)
  readonly stateDate: string | null
  readonly provenance: ProcurementProvenance
}

type ContractRecord = {
  readonly id: string                          // contract_key
  readonly grain: 'contract'
  readonly contractNo: string | null
  readonly contractDate: string | null
  readonly procedureId: string | null          // 93.4% linked
  readonly noticeNo: string | null
  readonly title: string | null
  readonly authority: Party
  readonly supplier: Party
  readonly cpvCode: string | null
  readonly value: MoneyValue
  readonly estimatedValue: MoneyValue
  readonly status: ProcurementStatus
  readonly provenance: ProcurementProvenance
  readonly modifications: ContractModification[]
}

type DirectAcquisitionRecord = {
  readonly id: string                          // da_key
  readonly grain: 'direct_acquisition'
  readonly uniqueCode: string | null
  readonly authority: Party
  readonly supplier: Party
  readonly cpvCode: string | null
  readonly value: MoneyValue
  readonly estimatedValue: MoneyValue
  readonly status: ProcurementStatus
  readonly stateId: string | null
  readonly countyName: string | null
  readonly publicationDate: string | null
  readonly finalizationDate: string | null
  readonly provenance: ProcurementProvenance
}

type ContractModification = {
  readonly id: string
  readonly contractId: string | null           // ~79–88% linked → null = unlinked
  readonly linkMethod: string | null
  readonly modificationDate: string | null
  readonly valueBefore: MoneyValue
  readonly valueAfter: MoneyValue
  readonly valueDelta: MoneyValue
  readonly modificationType: string | null
}

type ProcurementStatus =
  | 'published' | 'in_evaluation' | 'awarded' | 'cancelled' | 'suspended'
  | 'finalized' | 'offered' | 'unknown'
```

### 6.2 Aggregate shapes (rollups + coverage)

```ts
type CoverageGrade = {
  readonly metric: 'authority_cui' | 'supplier_cui' | 'amount' | 'cpv'
    | 'flow_date' | 'authority_territory'
  readonly rate: number            // 0..1
  readonly threshold: number       // gate threshold for this metric
  readonly meetsThreshold: boolean
}

type CapabilityGate = {
  readonly grain: string
  readonly allowed: Array<'filter_count' | 'count_ranked_top_n'
    | 'spend_ranked_top_n' | 'buyer_region_filter' | 'cpv_category_filter'
    | 'same_day_direct_acquisition_signal'>
  readonly blocked: Array<'supplier_region_filter' | 'llm_generated_filter'>
  readonly coverage: CoverageGrade[]
  readonly dataAsOf: string | null   // watermark ISO
  readonly cadence: string | null    // e.g. 'zilnic (suspendat)'
}

type TopPartyRow = {            // top suppliers/buyers
  readonly party: Party
  readonly flowCount: number
  readonly amount: MoneyValue              // sum; amountMissingCount disclosed
  readonly amountMissingCount: number
  readonly shareOfTotal: number | null     // null when total has missing amounts
  readonly evidenceRefs: string[]          // record ids / source refs
}

type CategoryRow = {           // CPV division breakdown
  readonly divisionCode: string
  readonly labelRo: string | null
  readonly labelEn: string
  readonly flowCount: number
  readonly amount: MoneyValue
}

type MonthlyPoint = {
  readonly month: string                   // 'YYYY-MM'
  readonly amountPresent: number
  readonly amountMissingCount: number
  readonly flowCount: number
}

type SameDayCandidate = {
  readonly authority: Party
  readonly supplier: Party
  readonly cpvDivisionCode: string
  readonly day: string
  readonly sameDayCount: number
  readonly sameDayTotal: MoneyValue
  readonly maxSingleAmount: MoneyValue
  readonly evidenceRefs: string[]
}
```

- **Decision:** Every aggregate response carries its `CapabilityGate` +
  `CoverageGrade[]` alongside the data so the UI can gate/annotate without a second
  request. Mocks include realistic partial coverage (some metrics below threshold)
  to exercise the gated states.
- **Assumption:** exact GraphQL field names will be confirmed against the server
  `procurement` module at implementation time; the UI boundary types above are the
  contract the adapter maps to. Where a field is not in UX §5, it is an Assumption
  to verify in the adapter, not in the UI.

---

## 7. Feature implementation map

| # | Feature file | Route(s) | Primary data | Key new components |
| --- | --- | --- | --- | --- |
| 1 | authority-procurement-slice | `/entities/$cui?view=achizitii` | `org_edge_monthly_rollups`, `authority_cpv_division_monthly_rollups`, `procurement_flow_facts_v1`, gate | KPIs, `TopSuppliersChart`, `CategoryBreakdown`, recent-DA list, signal teaser |
| 2 | procurement-search-listing | `/achizitii/cautare` | grain tables + `cpv_codes/divisions` + gate | `GrainSelector`, filter rail, `ProcurementRecordCard`, coverage banner, export |
| 3 | procurement-record-detail-pages | `/achizitii/{proceduri,contracte,achizitii-directe}/$id` | grain tables + `contract_modifications` + `attrs` | `ProcurementRecordHeader`, `ModificationTrail`, related links |
| 4 | cpv-category-page | `/achizitii/cpv/$code` | `cpv_codes/divisions` + category rollups + gate | `CpvLabel`, `SpendOverTime`, top-N |
| 5 | supplier-procurement-slice | `/companies/$cui?tab=achizitii` | `procurement_flow_facts_v1`, `org_edge_*`, `supplier_cpv_*` | KPIs, `TopBuyersChart`, `CategoryBreakdown`, cross-domain chips |
| 6 | coverage-data-as-of-layer | cross-cutting | `aggregate_quality_by_grain`, `public_contracts_filter_capabilities_v1`, watermark | `CoverageRibbon`, `DataStatusBadge`, `FreshnessBadge`, `SourceProvenanceDrawer`, gate hook |
| 7 | review-signals-explorer | `/achizitii/semnale` | `same_day_*`, `org_edge_*`, `contract_modifications` | leaderboards, cluster drilldown, `ReviewSignalBadge` |
| 8 | supplier-concentration-analysis | slice section + `/achizitii/semnale` | `org_edge_monthly_rollups` | `ConcentrationGauge`, top-N+share |
| 9 | cross-domain-entity-360 | rail on slices | CUI joins across domains | `RelatedLinksRail` (entity-360 variant) |
| 10 | ted-cross-reference | section on procedure/contract detail | TED RO lane + `tedNoticeNo` | "Vezi și pe TED" panel (gated) |
| 11 | per-lot-winners | section on procedure detail | `elicitatie_ca_notice_contracts` | "Câștigători pe loți" table (gated) |

- **Decision — build order:** #6 (coverage layer) and the shared record components
  first (they unblock all others), then #1, #2, #3, #4, #5, then next-scope 7–11.

---

## 8. Responsive behavior

- **Decision — mobile-first** (shared README). Breakpoints follow Tailwind defaults.
- Slices: KPI grid `grid-cols-2 md:grid-cols-4`; charts stack on mobile, side-by-side
  `lg:` up. Tables become stacked record cards below `md`.
- Search: filter rail is a `Sheet` (drawer) below `lg`, persistent left rail at
  `lg+` (mirrors `PnrrFilterSheet`). Results are cards on mobile, optional dense
  table at `md+`.
- Detail pages: single column on mobile; header + two-column (record body / related
  rail) at `lg+`.
- Charts: always paired with a tabular/textual fallback (a11y) and remain readable
  at 320px.

---

## 9. Accessibility, i18n, privacy, provenance

- **A11y (Fact + README):** Radix/shadcn primitives for all interactive controls;
  full keyboard reachability; semantic `<table>` with descriptive headers; charts
  and maps get adjacent text summary + tabular fallback; status never color-only
  (text + icon + color); tooltips never hold the only critical info; sheets/dialogs
  manage focus + close. Grain selector is a labelled radio/segmented group.
- **i18n:** all UI text via Lingui macros (`t\`\`` / `<Trans>`); RO primary, EN via
  catalogs. Locale-aware money/number/percent/date formatting (`Intl`, existing
  `formatNumber`/format utils). Expand acronyms (CPV, SEAP, SICAP, DA, TED, CNSC,
  HHI) on first use or in a tooltip. Run `yarn i18n:extract && yarn i18n:compile`
  after adding strings; never edit `.po` manually.
- **Privacy:** `PrivacyBoundaryNotice` where records are redacted/aggregated;
  never surface contact PII; document/file access gated by `privacy_class` at the
  serving layer.
- **Provenance:** `CoverageRibbon` + `FreshnessBadge` on every page;
  `SourceProvenanceDrawer` + `EvidenceLink` on every record/aggregate row; cross-
  domain joins show the join basis (CUI) and confidence.

---

## 10. Acceptance criteria (domain-level)

- **Decision:** A procurement page is acceptance-complete only when:
  1. It exposes source, freshness ("data as of"), and coverage near the primary
     result — not in docs.
  2. No blocked filter (`supplier_region_filter`, `llm_generated_filter`) is shown
     as authoritative; blocked dimensions are hidden or carry a blocker reason.
  3. Every value respects the currency rule (RON or native; no mixed-currency sums)
     and flags outliers/negatives.
  4. Every review signal carries the neutral caption and links to evidence.
  5. Every record links to its e-licitatie.ro source and a provenance drawer.
  6. Grain is explicit wherever multiple grains appear.
  7. Loading uses skeletons matching final layout; empty/no-coverage uses
     `EmptyState`; blocked/stale states are rendered, not silently empty.
  8. `yarn typecheck` passes; strings are Lingui-wrapped; a11y checks pass.

---

## 11. Open questions (blockers only)

1. **Serving readiness** of per-lot winners, TED RO, and entity profiles — gates
   live data for `per-lot-winners.md` and `ted-cross-reference.md` only (both ship
   mock + `blocked`/`unverified` states behind a served flag). (UX Open Q1.)
2. **Entity-360 ownership** — whether procurement hosts its own cross-domain
   profile or contributes a slice into a shared one; affects final placement of
   `cross-domain-entity-360.md`, not the procurement slice contract. (UX Open Q8.)

All other uncertainties (CPV RO labels, no-FX, suspended sync, status `unknown`,
dirty names, unlinked modifications) are designed-for product states, not blockers.


---

## 12. The front door, redesigned (prototyped 26, promoted 27 September 2026)

> **Status:** promoted — `benzi` is live at `/procurement`, the explorer moved
> to `/procurement/search`; see §12.4. The prototype, losers included, was
> deleted at promotion.

`/procurement` was the workbench — three tabs, a filter sheet, a grain
toggle, the map, a coverage banner quoting API caveats, a dev panel. The
`/ins` and `/companies` hubs split the front door from the analysis; this
section prototypes procurement's front door in their editorial language. The
workbench stays as it is until a variant is chosen.

> §2's "Mock-first … no native client surface exists yet" is stale:
> `procurement-api.live.ts` serves every read below.

**Prototype (deleted at promotion):** `/development/procurement/hub`,
three variants over the same live reads, so the panes differ in layout, never
in numbers. One GraphQL request carries the national picture (~0.8 s on the
dev API); party names follow in a second, bounded one.

### 12.1 What each figure may claim (written before the design)

Measured on the dev API (build 8, snapshot ~2026-07-25) and checked against the
scrapper's `docs/procurement/PROCUREMENT_TYPES_AND_VALUES_EXPLAINED.md`,
`prod-db/PROCUREMENT_SERVING_REVIEW_2026-08-05.md`,
`prod-db/PROCUREMENT_SERVING_PARITY_RUNBOOK.md` and
`prod-db/PUBLIC_CONTRACTS_TIME_COVERAGE_AUDIT.md`.

| Figure (2025) | Read | Basis | Safe to say |
|---|---|---|---|
| Direct acquisitions: 2,014,671, 18.0 bn lei | `procurementStats {grain: direct_acquisition, year}` | accepted value, **excl. VAT**; date = finalization, else publication | yes — "fără TVA"; 2016–2018 not comparable (legacy rows can't tell a purchase from a refused offer), so series start 2019 |
| Contract awards: 39,539 | `procurementStats {grain: contract, recordKind: contract_award}` | count | yes, as a count |
| Framework agreements: 88,105 | `recordKind: framework_agreement` | count; a ceiling is not a purchase | count only |
| Contract award money: 103.6 bn lei from 28,839 valued awards | same | awarded value, **provisional** | **no, not as spending** — build 8 has no `framework_role`, so e-licitatie framework ceilings and call-offs count as awards (+20.8% over 2016–2025; the 10.3 bn SHORAD ceiling tops 2025). Contracts rank **by number** until the framework-role build is served |
| Buyers / suppliers (distinct) | `procurementSeries(measure: distinctAuthorities / distinctSuppliers, bucket: year)` | per population | yes, per population, never summed across grains |
| Procedure mix | `procurementBreakdown(dimension: procedureType)`, by count | SEAP's label | yes by count: open 44%, simplified 29%, **negotiated without notice 19.3% (7,636)** |
| Categories | `cpvDivision` | one CPV per record; 2.1% of award value has none | contracts by count, direct by value |
| Buyer county | `buyerCounty` ÷ INS POP105A (1 Jan 2025) | registered office: central institutions sit in București | yes, as a rate per resident, with the method beside the map |
| Supplier rankings | `supplier` | consortium money belongs to no firm | direct by value; contracts by count, said |
| Concentration / HHI, same-day splitting, amendment inflation, single-bid | — | gated, stale or not served | **not on the page** |
| Freshness | monthly `recordCount` | derived: the last month holding ≥ half a typical month | "date până în …" (contracts ≈ May 2026, direct ≈ May 2026 on this build); months after it are drawn as incomplete, never as a collapse |

### 12.2 The variants

| Key | Structure | Argues |
|---|---|---|
| `benzi` | The hubs' rhythm: hero (title, procurement-scoped search, largest buyers beside it), the four figures, the company profile's pinned bar of numbered bands — how the state buys, what, who sells, where, since when, the newest large records — and three ways in | A front door that answers the questions a reader brings, one band each |
| `traseu` | Follow the money: who buys → what → from whom, side by side; a pick in any column narrows the other two and one sentence says what the selection adds up to (in the URL: `?cumparator=&cpv=&furnizor=&tip=`). How, where, since when follow, shorter | Procurement's own shape — a trail between two parties — as the page's centrepiece |
| `jurnal` | The records first: the largest contracts and direct purchases of the newest complete month, the months as a strip that picks one (`?luna=`) and shows where the source thins out, category chips (`?cpv=`); the year and the counties as context | A journalist's front door, one that changes every month |

Shared by all three: the search is the site's, scoped to institutions and
firms, and opens their **procurement** pages; the source is said once under the
hero („Sursa: SEAP, e-licitatie.ro ↗, date până în …"); every lede is computed
and returns nothing when the data would contradict it; the county map is the
INS hub's divergent band (coloured against the national figure), copied into the
prototype with procurement links — at promotion, extract one shared choropleth.

Open for the owner: the variant (or a combination), the title (working titles:
„Ce cumpără statul / și de la cine", „Cine cumpără, / ce și de la cine", „Ce
cumpără statul, / lună de lună"), and where the workbench lives once the front
door takes `/procurement`.

### 12.3 The owner's pick: `benzi`, with the money made relevant (27 September 2026)

The owner chose `benzi` and asked for more relevant data in „Pe ce se duc banii
publici" and „Firmele care vând statului", and for „Cum se cumpără" to follow
the years. Band order now: 01 Ce se cumpără · 02 Cine vinde · 03 Pe județe ·
04 În timp · 05 Cum se cumpără · 06 Cele mai noi · Analize.

- **What the money buys, in a reader's categories** (`hub.categories.ts`). The
  band promised money and ranked contracts by count, by CPV division, so
  furniture and food sat beside road building. It now ranks **money** in 21
  categories a reader recognises — roads, bridges and motorways; buildings;
  railways and metro; water, sewage and networks; medicines; energy; IT… —
  each a set of CPV prefixes (longest prefix wins). The API ranks one CPV
  level per request, so the tree comes from nested breakdowns (divisions; the
  classes of 45; the categories of 4522 and 4523; the groups of 30, 33, 79,
  90) in one request (~0.85 s); every leaf is in one breakdown, so the
  categories add up to the population. „Altele" is 0.8% of 2025 contract
  money and 6.4% of direct money. Contract money carries the provisional
  mark; the lede says roads took 37% (38.0 bn lei), buildings 14%.
- **Who sells = who wins the largest contracts.** Firm rankings by value were
  either retail (Selgros, Dedeman — direct purchases) or one mega-award
  (SHORAD). And **52% of 2025 contract money went to consortia — 89% for
  roads** (`valueWithheldAssociationSum` on the supplier breakdown): SEAP
  publishes the whole award, not each member's part, so no firm ranking can
  hold it. The band now says so in its lede and lists the year's largest
  contracts with **every winner named**: SEAP publishes one award row per
  consortium member, each with the whole value (and some awards twice), so
  rows are grouped by buyer + contract number + value (`groupContracts`) and
  the value is counted once. A guarded line names the firms that recur
  (Spedition UMB and Tehnostrade, each in 4 of the 8). Direct-purchase sellers
  stay one toggle away, described as what they are („cumpărături mici, din
  catalogul SEAP"). „Cele mai noi" groups its contracts the same way.
- Rows keep the name on the left with what it counts under it, and the lei
  alone on the right, so names do not truncate at 390px.

### 12.4 Promoted (27 September 2026)

**Where the code went**

| Prototype | Promoted to |
|---|---|
| `hub.model.ts` (types, cutoff, per resident, labels) | `src/features/procurement/lib/home-model.ts` |
| `hub.categories.ts` (reader categories, CPV tree, `groupContracts`) | `lib/home-categories.ts` |
| the sentences in `hub.shared.tsx` / `hub.money.tsx` | `lib/home-text.ts` (computed, guarded, each returns null when the data would contradict it) |
| number helpers in `hub.parts.tsx` | `lib/home-format.ts` (counts through Lingui `plural`: the „de" rule is Romanian's plural categories) |
| `hub.data.ts` | `api/procurement-home-api.ts` + `api/graphql/procurement-home-queries.ts`, `hooks/use-procurement-home.ts`, `api/procurement-home-ssr.ts` |
| `hub.benzi.tsx`, `hub.money.tsx`, `hub.bands.tsx`, `hub.parts.tsx` | `components/home/` — `procurement-home-page`, `home-money-bands`, `home-context-bands`, `home-rows`, `home-chrome` |
| `hub.county-band.tsx` / `-rank.tsx` (copies) | none: the INS hub's `HubCountyBand` now takes a resolved `HubCountyBandDefinition` and an optional `countyLink` (agreed with the INS session; `/ins` renders as before) |
| local state for the toggles | the URL: `?cumparatori=`, `?bani=`, `?firme=`, `?indicator=`, `?recente=` (`schemas/procurement-home.ts`; defaults never written) |

**Decisions taken at promotion**

1. **The explorer moved to `/procurement/search`** (overview, list, rankings,
   one URL schema, as before). `/procurement` redirects a link that carries
   any explorer key there — read off the keys, not the parsed values, since
   the explorer fills a default period — keeping the site's own keys (`lang`,
   `currency`). `/achizitii/cautare` and `/procurement/analytics` point at the
   explorer; `/achizitii` still lands on the front door. Twenty-two internal
   links that carried explorer filters now name `/procurement/search`;
   breadcrumbs and „Achiziții publice" links stay on the front door.
2. **The search opens procurement pages.** The site search took a new
   `hrefOf` option (`LandingSearch`): an institution opens
   `/procurement/institutions/$cui`, a company `/procurement/suppliers/$cui` —
   on the row's link, on Enter and on Cmd-click alike.
3. **Rows are links only where they open what they count.** A buyer, a firm,
   a contract, a county (the explorer's list for that county, grain and year)
   and the three start cards link; a reader category does not — it gathers
   several CPV codes, and the explorer filters by one (the companies hub's
   precedent for its new-firms sectors). The start cards open exact lists
   (`record_kind` contract awards / framework agreements, the rankings), with
   no counts that a list could contradict.
4. **The national county figure is the country's own ratio** — all of the
   year's records over the national population (INS POP105A, 1 January 2025,
   the companies hub's snapshot), never a mean of county rates nor only the
   counties SEAP could place (DESIGN.md log, 2026-09-25). The method is
   beside the map; the central institutions' seat in București is said once.
5. **The average direct purchase is over the valued purchases** (8,948 lei),
   not every purchase — caught by a unit test.
6. **Server render, kept ten minutes.** The loader reads the national
   picture, the categories and the year's largest contracts on the server
   under a 5 s deadline each, and seeds the page's queries (the INS hub's
   pattern); the newest month's records need the national read's cutoff and
   load in the browser. Each server read is kept in the process for ten
   minutes (`lib/ssr/server-memo.ts`, success only, one shared flight, its
   own deadline rather than a request's signal), as long as a shared cache may
   keep the page. A render with a failed read goes out `no-store`.
7. **Figures say exactly what they count**: „Instituții cu achiziții directe"
   (14,660; „3.446 au atribuit contracte"), „Firme care au vândut direct
   statului" (93,119; „8.614 au câștigat contracte") — two populations, never
   a union.

**What the pre-commit reviews changed** (Opus 5.5 xhigh, Codex gpt-6-astra high):

- Every explorer link is built by a typed helper (`lib/home-links.ts`) whose
  values the explorer's schema keeps: contract awards are `record_kind:
  purchases`, framework agreements `frameworks` (the first draft passed server
  tokens the explorer silently dropped, so „Acordurile-cadru" opened every
  contract). A test runs each through the explorer's parser.
- Unknown money stays unknown: a county or a category with no published
  amount is hatched or shown „—", never 0 lei; a lede claims „cei mai mulți
  bani" or „urmează" only of a category no other bucket (Altele, no CPV)
  outweighs.
- The year in progress counts only through its cutoff month (a monthly value
  series), and is dropped when none of its months is complete; the part year
  comes from the data, not the clock.
- The newest records follow their own population's cutoff month; direct
  purchases are selected and dated by finalization (the server binds the
  filter's `publicationDate` to `finalization_date`; the publication date is
  empty at the source). The largest contracts are read page by page until every
  consortium shown is whole; a tie that outlasts the pages read is a failed
  read with a retry, never an empty list.
- The loader always passes its year; the categories and the largest contracts
  stand when the national read fails, and every band keeps its anchor.
- County rates need the population of the same year; otherwise the band says
  so instead of drawing a map. State companies in the search open their buyer
  page. Party rows open the party's page on the ranking's year.
- The provisional mark is a popover (a tap opens it) named by its visible word,
  and sits beside every contract-money lede and list.
- A render with a failed read sends `CDN-Cache-Control: no-store` too (the
  layout's CDN header would otherwise outlive `no-store`); the explorer's
  cache varies on the cookie; route heads resolve in the request's own locale
  (`translatorFor`), not the shared Lingui instance.

**Measured on a production build** (Nitro on zeus, dev API, 2026-09-27):

| | TTFB | LCP | CLS | JS (uncompressed) |
|---|---|---|---|---|
| `/procurement`, server read kept | 50 ms | 376 ms | 0.003 | 4.9 MB, 231 files |
| `/procurement`, first render after the window | 0.95–1.6 s | +0.33 s | — | — |
| `/procurement/search` (the old page) | 61 ms | 348 ms | 0.001 | 6.2 MB, 7 GraphQL calls |
| `/companies` (reference) | 63 ms | 396 ms | 0.001 | 4.6 MB |

The national read is ~450 ms warm and does not get faster split into
parallel requests (measured: the API resolves the fields server-side); the
category tree likewise (~500 ms, ~465 ms split). A client-side navigation
from `/companies` paints the hero at ~250 ms and the figures at ~1.6 s (the
browser's own reads; a hover preloads them).

**Follow-ups**

- An explorer filter over several CPV codes would let a reader category open
  exactly what it counts.
- A procedure-type filter in the explorer would let „Negociere fără anunț
  prealabil" open its 7,636 contracts.
- When the framework-role build is served, drop the provisional mark and let
  contract money rank buyers (the hero ranks contracts by number until then).
- The companies hub keeps its own county-band fork; one shared choropleth
  (with the INS band's `countyLink`) is a separate job.

## 13. The buyer page, redesigned (prototyped and promoted 27 September 2026)

`/procurement/institutions/$cui` — one public buyer's procurement — moves from
the old card grid (six population tabs, a signals row, a monthly bar chart, raw
CUIs for unnamed suppliers) to the company profile's rhythm, the way the front
door moved to the hubs' (§12).

### 13.1 What a buyer's data can say (probed on the dev API, 2026-09-27)

Probed on a commune (Surduc, SJ, 3,553 residents), a town (Otopeni, IF), a
national hospital (Fundeni), the national road company (CNAIR) and a state
regie with no budget record (Romsilva):

- **Direct purchases are the dense, clean money for every buyer** (Surduc:
  145 in 2025, 2.84 mil. lei; Fundeni: 3,647, 66.5 mil. lei). Contract awards
  are few and often unvalued (Otopeni: 12 in 2025, 5 with a value; Fundeni:
  10 awards beside 36 framework agreements) and provisional (§12.1).
- **Procedures abstain for 2025** (`TIME_COVERAGE_BELOW_FLOOR`): the page
  counts contract awards by procedure type instead.
- **Suppliers by county** answer "does it buy locally?" (Otopeni 51% Ilfov,
  Surduc 61% Sălaj); **top-N shares** are servable (the scrapper's serving
  review, §5) with one caveat said on the page: a firm under two CUIs splits.
  HHI is left out.
- **Each top supplier's years** (a series per supplier, one request) show
  standing relationships: all eight of Fundeni's top sellers sold in nearly
  every year since 2019.
- **The budget platform's `entity`** gives the type (`uat`, `health`, …), the
  UAT and its population (per-resident money for a town hall), the address,
  and whether a budget page exists. It spells places with diacritics, so a
  town hall is named from its territory („Orașul Otopeni", not „ORASUL
  OTOPENI"). Its `CUI` scalar takes ten digits at most.
- The identity spine answers a foreign identifier (`00041200627`) with
  `unavailable` and **no CUI**; the lookup is positional.

### 13.2 The variants (`/development/procurement/buyer`, live data)

- **`dosar` — profile bands.** The company page's head (the years chart
  beside it picks the year), a pinned numbered bar, the figures band, then
  one band per question: what, from whom (with the firms year by year), from
  where, when, how, the largest records, the context.
- **`intrebari` — answer first.** A reporter's questions, each answered in a
  sentence, the evidence beside it; a question the data cannot answer is left
  out.
- **`relatii` — firms first.** The firms-by-year matrix leads; four
  two-column bands.

The owner picked **`dosar`** ("I love it").

### 13.3 Promoted (27 September 2026)

**Where the code went.** `api/procurement-buyer-api.ts` (the profile: three
multi-root requests and the identity side by side, then names + each top
supplier's years + the county's total; the records beside them), `api/graphql/procurement-buyer-queries.ts`,
`api/procurement-buyer-ssr.ts` (a bounded server memo: 500 buyer-years, ten
minutes), `hooks/use-procurement-buyer.ts`, `lib/buyer-model.ts` (shapes,
naming, address, year rule), `lib/buyer-text.ts` (every sentence),
`components/buyer/` (head, charts, rows, bands, page), `schemas/procurement-buyer.ts`
(the URL: `year`, `ce`, `mari`). The old page, its signals row and the
institution-overview read (spine query, schemas, hook, concentration copy)
are deleted; the authority slice stays for the entity page's contracts view.

**Decisions.**

- The year is the URL's `year` (the name every link already passes), from
  2019 through the last complete year, fixed in the loader so the server and
  the browser agree. Picking a year in the chart keeps the year shown, dimmed,
  until the new one arrives; the year in progress is dashed and cannot be
  picked. The part year runs through SEAP's derived cutoff month (§12).
  *Superseded 28 September — the owner wants the latest data by default:*
  the page opens on the newest year with data — the year in progress once
  SEAP's cutoff (the shared read, `api/procurement-cutoff.ts`, ten minutes)
  falls in it, else the last complete year, so January does not open on an
  empty year. The year in progress is read as on the firm page (§14): every
  read through the cutoff month (`lib/profile-period.ts`), the records to its
  last day, the county share over the same months, the population of the
  last complete year; compared with nothing; the head says the date. Its
  month strip marks the months past the cutoff („încă fără date") and drops
  the December mark; the years sentence stops at the last complete year. The
  year is picked from the chart or the firm page's dropdown (right end of the
  head's top row; on a phone the kicker keeps only the way back). A year
  picked is written to the URL — the default moves with the data. An empty
  year links to the newest year with records („Vezi 2025"), on both profile
  pages. A cutoff that cannot be read leaves the page partial, whatever its
  year; a default the server opened without it is never cached. One date
  covers the page: the chart's column for the year in progress, its line in
  the dropdown and the source line all stop at the page's cutoff month (the
  earlier population's), and explorer links carry those months
  (`dateFrom`/`dateTo`), not the calendar year. A client-side navigation
  without a year is never held for the cutoff read (the app's loader rule):
  the page paints its frame, reads the newest year beside it, and the loader
  starts the page's reads as it lands. Reviewed by Opus 5.5 (xhigh); the
  findings above were its.
  *Superseded again, the same day — both profile pages open on the last
  twelve months* („Ultimele 12 luni", the list's first option; the years
  follow, 2026 kept as the year in progress). See §15.
- Each band's choice defaults to what the year has (direct purchases for
  „Ce cumpără" unless there were none; contracts for „Cele mai mari" when
  there were any) and stays out of the URL when it equals that default.
- Supplier lists never render raw CUIs while names load: names come in the
  same read as the figures. If the follow-up fails twice the page shows CUIs,
  says so, and the render goes out `no-store`.
- A year with no record is said once („Nicio achiziție în 2023"), not as
  seven empty bands.
- Rows link only to what they count: a county row opens the buyer's direct
  purchases from that county in the explorer; „Cele mai mari" opens the
  year's list; the head's „Toate înregistrările" opens every record. Procedure
  rows are not links (the explorer's list does not filter by procedure).
- The firms-by-year cells are not tab stops: each carries its value as text
  for assistive technology and a pointer readout; the firm's name is the link.
  The grid fits a phone (the total column waits for `sm`).
- The context band says only what the page has not: the county share (from
  1%) and the seat. The CUI, the budget link and the figures stay in the head
  and the figures band.
- Sentences use the Romanian count grammar („21.016 locuitori", „3.553 de
  locuitori", „21 de contracte") and are left out when the data would
  contradict them.

**Loading.** The API resolves one request's fields one after another, so the
profile is three requests side by side (keys, figures, the CPV levels) and
the budget platform's identity record is a fourth request, which fails soft;
the follow-up (names, each top seller's years, the county's total) starts
when the keys and the identity land. The reader's categories come from one flat breakdown per
CPV level (division, group, class, category — eight reads, not the front
door's sixteen-read drill); each level keeps what the next does not hold, so
a works contract coded 45210000 is a building and medicines coded 33600000
are medicines. Measured on a production build (Nitro on zeus, dev API,
2026-09-27):

| | TTFB | LCP | CLS | JS (uncompressed) |
|---|---|---|---|---|
| Buyer, first render (large, uncached), one request + follow-up | ~3.1 s | — | — | — |
| Buyer, first render, three requests + flat CPV levels | 1.0–1.3 s (one outlier 2.4 s) | 0.8–1.2 s | ≤ 0.001 | 4.76 MB, 214 files |
| Buyer, read kept (ten minutes) | 16–32 ms | — | — | — |
| `/companies/$cui` (reference) | 0.66 s | 1.0 s | 0.001 | 4.58 MB |

A client-side navigation from the front door paints the page frame in
~110 ms and the buyer with its firms at ~1.5 s. After an SSR load the page
reads nothing more.

**Follow-ups.** An explorer filter by procedure type would let procedure rows
open what they count; the county band could become a map once the shared
choropleth exists; when the framework-role build is served, drop the
provisional mark and let contract money speak.

**What the pre-commit review changed** (Opus 5.5 xhigh):

- 2019 has no change against 2018 (legacy SEAP rows, not comparable); the
  year before is not read for it.
- Below a half, the leading category is „categoria cu cei mai mulți bani",
  never „cea mai mare parte" (a majority); the top firm's is „cea mai mare
  sumă". Growth since 2019 is said only at ±50% and „în lei ai fiecărui an"
  (prices rose by about a half over those years).
- Contract money says how many contracts it covers („15,1 mil. lei la 5
  contracte" of 12). The procedure sentences count out of every award and say
  „toate au avut un anunț public" only when no award's procedure is unlisted
  or unknown; unlisted ones get a row. The „Cum" band says SEAP counts a
  consortium's contract once per member firm (every contract count here is of
  award rows, as on the front door).
- A year with framework agreements and no award is not „nothing" or „only
  direct": the head says the agreements.
- The budget platform's identity is its own request and fails soft (the CUI
  names the buyer, the records' county places it); a partial profile is
  neither kept in the server memo nor fresh in the browser, so names come
  back on the next read.
- The head links open all direct purchases and all contracts (the explorer's
  default is contracts only). A county council, a sector town hall and a
  state company (SA, RA) are named for what they are. Pages with no record
  since 2019 carry `noindex`; the tab keeps the buyer's name after a year is
  picked (the head reads any cached year).
- The part year is reachable by keyboard (its figures are in its name) and
  each population's part-year figure names its own cutoff; the chart
  readouts are not live regions. The per-resident and county-share figures
  say how they are computed, once, in the source line.

**What the verification pass changed** (Opus 5.5 xhigh, second pass): a
failed identity read makes the page `partial` too (served, never kept or
cached) and the buyer is named by the identity spine's label before its CUI;
a CPV remainder whose records carry no value is unknown, not „0 lei" (the
breakdowns carry `withValueCount`); labels keep an acronym whole mid-sentence
(„IT și telecomunicații", on the front door too); a whole share reads „Toți
banii … au mers pe …"; a CUI with no record since 2019 is not called a buyer
(„Nu apare ca cumpărător în SEAP…", with its supplier page linked); the buyer
kind „Comună" has its own message context (parliament's „Comună" is a joint
session); a sector's town hall is „Sectorul 1"; the method line names only
the computed figures the page shows.


## 14. The supplier page, redesigned (prototyped and promoted 27–28 September 2026)

`/procurement/suppliers/$cui` — one firm as the state's supplier — moves from
the old card grid (population tabs, value-basis badges on most rows, a monthly
bar chart) to the buyer page's rhythm (§13), seen from the seller's side.

### 14.1 What a firm's data can say (probed on the dev API, 2026-09-27/28)

- **The company profile already answers "how much public money".** Its
  „Bani publici" band shows the totals, a yearly chart, who pays, what for and
  the newest records. The supplier page answers what only procurement data
  can: who buys from the firm and what the firm is to them, how it wins, and
  with whom.
- **Supplier-scoped analysis reads withhold consortium money.** The
  association design keeps a consortium's money out of each member's figures
  (`PROCUREMENT_ASSOCIATION_DEDUP_DESIGN.md`, option C);
  `valueWithheldAssociationSum` is null per firm. The count keeps the
  member's rows for most firms (Dexamart: 22 in both) but not for all —
  Hydrostroy AD, a foreign member, has 2 contracts in the analysis for 2024
  against 16 award rows in the record list, all won with partners.
  The record list is the truth for a firm's contracts.
- **Partners can be found, but three shapes look alike.** A buyer's award
  rows on the day of the firm's row (one search per buyer and day) hold every
  other firm's row under the same notice and contract number. That can be a
  consortium — one value, the same firms (CNAIR CAN1136776, 92/110645); a
  multi-supplier framework — lots at their own values, each with its own
  competing distributors, titled „Acord cadru …" (a hospital's thirty
  medicine lots under one contract number); or one contract published at
  several values (Dexamart and Roman Impex on SCNA1099802/121, three values).
  So an award is a notice, a contract number and a value (to the hundred
  lei); it is a consortium only when not framework-titled and the firm has
  the same partners on every value under the notice. A member's row may carry
  no value: it joins when the contract has one value, and is unresolved when
  it has several.
- **The API caps a request at 50 aliases and 500 fields.** Past either it
  answers only errors, in an HTTP 200; a large firm's hundred-row partner scan
  hit it and left the page quietly partial until the scan was split.
- **What the firm is to an institution is readable:** the institution's own
  direct purchases in the year (`authorityCui` stats) and its top direct
  supplier (a one-row breakdown) — „Pentru Grădinița nr. 1 Otopeni, firma a
  fost cel mai mare furnizor direct: 29% din achizițiile ei directe."
- **No explicit data date.** `provenance.asOf` is null on the Postgres engine;
  `maxMonth` names a month with a trickle of records (600 direct purchases
  against ~135,000 in a full month). The page derives SEAP's cutoff from the
  national monthly counts, as the front door does, and says it: „Date
  actualizate până la 31 mai 2026". The record lists run ahead of the
  analysis build (records dated to 2026-09-03).
- OMV Petrom Marketing's fuel cards are CPV 30163100 (office machinery), so
  the reader's categories file most of its sales under „Mobilier, birotică și
  papetărie" — a mapping fix for `home-categories.ts`, not made here.

### 14.2 The versions (three authors, live data)

The owner asked three authors to research the data and build their own
version independently: Fable (high effort), Codex `gpt-6-astra` (high) and
Opus. All three reached the consortium finding.

- **Fable** — closest to the buyer page; reused the company profile's head
  pieces; counted framework agreements apart; partners inside „Cele mai mari".
- **Astra** — evidence first and most cautious: no contract money, no
  turnover, strict partner matching (notice number), abstaining past a
  hundred rows.
- **Opus** — the buyer page's bands plus the firm's weight in each client's
  purchases, a „Cu cine câștigă" band for consortia, and „Cum câștigă" in
  plain words.

**The owner's pick: Opus**, with changes asked while polishing: the head in
the company profile's own shape (its sentence, status chips, notice, CUI
button — Fable's instinct, taken further); no „Pe ani, din 2019" label and no
„Alege un an" caption on the chart; the year as a dropdown at the right end
of the head's top row (above the chart on a wide screen, beside the way back
on a phone); the year in progress selectable, the default staying the last
complete year, with the data's date in the head — from the API, not written
into the code.

### 14.3 Promoted (28 September 2026)

**Where the code went.** `api/procurement-supplier-api.ts` (the profile),
`api/graphql/procurement-supplier-queries.ts` (rows, partners, names),
`api/procurement-supplier-ssr.ts` (500 firm-years, ten minutes, partial reads
not kept), `hooks/use-procurement-supplier.ts`, `lib/supplier-model.ts`,
`lib/profile-period.ts` (the year in progress, shared with the buyer page), `lib/supplier-text.ts`,
`lib/supplier-keys.ts`, `components/supplier/` (head, rows, bands, page),
`schemas/procurement-supplier.ts` (the URL: `year`, `ce`, `mari`). What both
profile pages share moved to `components/profile/` (the years chart, the year
dropdown, the party-by-year grid, county and procedure rows, `moneyFact`)
and `lib/profile-model.ts`; the buyer page now uses them, so its chart lost
the same label and caption. The old page, its slice view, quick filters,
population tabs and entity header are deleted; the supplier slice API stays
for the company profile.

**Decisions.**

- Contracts are the firm's award rows, as SEAP publishes them and the
  explorer lists them (a contract's lots are rows of their own). An award
  published twice counts once in the money and the largest list; a contract
  published at several values is never summed — the largest list shows each
  value as its own record. When every row of the year was read (≤ 100), the
  contract clients, categories and counties come from the rows, consortia
  included; past that, clients come from the analysis, whose count keeps the
  member rows for most firms. Procedures are the analysis's; when it names
  fewer contracts than the list holds, the band says for how many.
- A consortium's contracts are shown at their whole value, labelled „valoarea
  lor întreagă" with a sentence saying it is not what the firm got; partners
  are named and counted once per contract; a partner with no CUI (a foreign
  firm) is not a link. How many were won with others is a floor („cel puțin")
  unless every row was scanned and told apart; a row the scan cannot tell (no
  buyer, day, notice or number; a day fuller than the read) is counted and
  said, never assumed alone.
- A sentence names an institution only by a known name, never a bare CUI; an
  institution the name spine holds only as a placeholder is named from the
  firm's own direct purchase from it.
- The weight in a client is the firm's direct money from it over the client's
  own direct purchases in the same period, said for its five largest clients
  and only from a tenth up; „cel mai mare furnizor direct" only when the
  client's top supplier is the firm.
- The year in progress is read through SEAP's cutoff — the earlier of the two
  populations' — and compared with nothing: its last months may still be
  filling, so a change would partly measure the feed. The head says the date
  („Date actualizate până la 31 mai 2026"), or „An în curs: date incomplete"
  when no cutoff reaches the year; every label keeps the plain year. A
  client's link opens the institution's page on the same year; explorer
  links for the year in progress carry its months (`dateFrom`/`dateTo`),
  not the calendar year.
- A registry that could not be read leaves the head without the firm's
  sentence rather than calling the firm foreign; the page goes partial
  (`no-store`, not kept). An identifier the API refuses as an organisation's
  answers 404. A band choice in the URL (`ce`, `mari`) that the year cannot
  show — its toggle hidden — is ignored, not honoured with an empty band.
- The turnover sits in the firm band as a measure of size, with a sentence
  saying it is never divided by the sales to the state.
- The head and the firm band do not repeat each other: what the firm is and
  its status are the head's; turnover, employees and the first SEAP sale the
  band's.

**Loading.** Three analysis requests side by side (the year's clients alone,
so the weights start early; the figures with the years and the top clients
since 2019; the CPV levels), the rows with their year and month totals, and
the registry; follow-ups for the weights, the names (with the direct-purchase
fallback), the top clients' years, the partners (≤ 40 buyer-days per request)
and the buyers' counties (≤ 50 per request). Splitting the
analysis into six requests was measured slower (the API queues one client's
requests). Measured on a production build (Nitro on zeus, dev API,
2026-09-28):

| | TTFB |
|---|---|
| Large firm (Vodafone, Farmexim, OMV), uncached | 1.2–2.7 s |
| Small firm (Costalex, Hydrostroy, Dexamart), uncached | 0.35–0.7 s |
| Any firm, read kept (ten minutes) | ~30 ms |

A client-side navigation from a buyer page paints the frame in ~120 ms, the
firm's name, sentence and status at ~0.45 s (the registry is read on its own
while the profile loads) and the whole page at ~1.7 s.

**Reviews.** Codex `gpt-6-astra` (xhigh) and Opus 5.5 (xhigh) reviewed the
promoted page. What they found and what changed: frameworks' lots had been
called consortia; the partner match had hung on the value and dropped a
value-less member; revisions had been summed; clients had been capped at ten
in the count; a failed registry had read as a foreign firm; bare CUIs had
reached sentences; the year in progress had been compared with a year whose
same months were complete; a failed cutoff read had let a page be cached;
deadlines had not bounded every read; the partner scan had broken the API's
per-request caps for large firms. Checked live afterwards: Hydrostroy's 2024
reads 16 of 16 contracts won in consortia (every row has partners under its
notice and contract number, at its value or with none; two copies — one
without a buyer CUI, one on another day — take their award's reading).

**Follow-ups.** A per-firm participation count (consortia included) served
by the API would replace the client-side scan; an explicit „complete through"
month per data type would replace the derived cutoff; the fuel-card CPV
mapping; names with diacritics for institutions (the budget platform's
territory names, as the buyer page does for its own head).

## 15. The last twelve months (28 September 2026)

Both profile pages — a buyer's (`/procurement/institutions/$cui`) and a
firm's (`/procurement/suppliers/$cui`) — open on the **last twelve months**
SEAP has complete, the owner's call: the newest data, and a whole year's
worth of months. The period list at the right end of the head's top row
(„Perioada") offers „Ultimele 12 luni" first, with its months and figures
(„iunie 2025 – mai 2026 · 28,5 mil. lei · 6 contracte"), then the years —
2026 kept, marked „în curs" — down to 2019. No `year` in the URL is the
last twelve months; a year picked is written.

**Why it beats the year in progress as the default.** Twelve months end at
SEAP's cutoff (the page's month, the earlier population's), so the page is
as fresh as the data and still a year's worth: the change against the twelve
months before is fair again („+26% față de cele 12 luni dinainte"), the
per-resident figure is annual again, a December is always inside, and
January does not open on an almost empty year. The window moves on its own
as SEAP completes each month.

**What the API can say (probed 2026-09-28).** Any month range reads — stats,
breakdowns, CPV levels, records by date. Distinct counts cannot be added
across a series' year buckets (a firm selling in both years counts twice):
the buyer's firms come from `procurementConcentration` (`supplierCount`,
equal to the series' `distinctSuppliers` for every year checked), for years
and windows alike. A firm's distinct institutions over a window come from
the authority ranking, which the API caps at a hundred: exact below it,
„peste 100 de instituții" past it (the figure is then left out, not shown as
100) — a whole-period distinct count in the API would lift the cap.

**How the pages say it.** One period phrase everywhere a year was named
(`lib/profile-period-text.ts`): „În ultimele 12 luni (iunie 2025 – mai 2026)
a făcut…" in the head, „Achiziții directe, ultimele 12 luni" on a figure,
„față de cele 12 luni dinainte" for the change, „Decembrie a adus 21% din
banii achizițiilor directe ale ultimelor 12 luni". The years chart presses
no column and says the window's figures on its line; the month strip runs
June to May, each year named where it begins, December still marked. The
records, the county share, the weights and the partner scan read the same
months; explorer links carry them (`dateFrom`/`dateTo`); links to the other
profile page carry no year (its default is the same window) — a year page
links on its year.

**How it is built.** A period is a choice — `recent` or a year
(`lib/profile-period.ts`: `periodChoice`, `periodOf`, `ProfilePeriod`) — and
every read, key, server memo and link takes it. The window waits for the
shared cutoff read, as the year in progress does; with no cutoff known (a
failed read, or one that tells no month) the page describes the last
complete year instead, says so under the head („Ultimele 12 luni nu s-au
putut citi acum; pagina arată 2025.") and goes partial (`no-store`, not
kept, read again on mount). The largest records never fall back — they are
read for the period asked or fail — so they are held back beside a fallen
profile, and once they land (the cutoff reads again) the profile is read
again. The newest-year default of the morning (a loader that first resolved
which year to open) is gone: the choice is known from the URL alone.

**One caveat, kept off the page.** The cutoff takes a month once it holds
half a typical month's records, so the window's last month may still be
filling: the change against the twelve months before can read a few points
low — never a year's worth, as comparing a year in progress would.

Reviewed by Opus 5.5 (xhigh). Its findings, fixed: records beside a
fallen-back profile, a fallback that went unmarked (and so cached), the floor
of institutions at exactly a hundred (the ranking's „other" bucket tells it),
English templates that broke with the phrase, the registry and identity reads
now started before the cutoff lands, an unused distinct-firms read for
contracts dropped.

## 16. The direct-purchase page (prototyped 28 September 2026)

`/procurement/direct-acquisitions/$id` — one direct purchase — is where every
„Cele mai mari" row of the front door and the two profile pages lands. It
still wears the old shared detail layout. Prototype:
`/development/procurement/direct-purchase` (`?v=fisa-jos|fisa-jos-alaturi`,
`&da=<record>`), on nine real records read from the production database and
the dev API, shaped as the adapted API would answer.

### 16.1 What a direct purchase's data can say (measured 2026-09-28)

Prod database (read-only, owner's approval) and dev API:

- **Three families, three depths.** Of 2025's canonical direct purchases,
  66% are e-licitatie catalogue purchases (1.42 M), with their own page; 24%
  come from SEAP's quarterly export (510 k) — catalogue purchases (they carry
  DA codes) that our discovery never captured; 10% are award notifications
  (207 k, DAN codes, mostly since 2023) — purchases made outside the
  catalogue and notified in SEAP. Only the first family has items, terms and
  decisions; the other two are a summary row (title, parties, CPV, value,
  dates), and their source is a whole quarterly XLSX on data.gov.ro with a
  row number.
- **The catalogue detail is complete where it exists** (a 0.2% sample of
  2025+, 4,101 records): description, delivery, payment and contract type
  100%; items 100% filled (name, catalogue description, unit, CPV, quantity,
  unit price, catalogue price); 17% have more than one line (max 60).
  Types: supply 69%, services 29%, works 2%. EU funding 3.2% (PNRR the most).
- **The numbers agree with themselves.** The lines sum to the value on 99.5%
  of purchases; where they do not, the gap is often exactly one line (a line
  dropped after the offer). The price paid differs from the firm's catalogue
  price on 7.3% of lines. The **estimate equals the value on 98.4%** (SEAP
  fills it from the offer): it is shown only where it differs.
- **How it ended is told, and by whom.** ~93% „Ofertă acceptată"; the rest
  are attempts, not purchases: the firm refused the institution's conditions
  (with a reason: „lipsă stoc", „preț incorect"), let them lapse, or the
  institution refused the offer („CPV incorect", „achiziție eronată") or let
  it lapse. The firm decides first, then the institution; the median purchase
  is published and finalised the same day.
- **Privacy.** 5.5% of details carry a person's contact data in their free
  text; the server then withholds all of it (description, delivery, payment,
  reasons), though the phone is usually in one field. Items stay public
  (98.3%).
- **The two parties' relationship is one request away.** An analysis scope
  takes `authorityCui` and `supplierCui` together: the pair's years, its
  share of the institution's direct-purchase money, the firm's rank among
  the institution's firms and the institution's among the firm's clients —
  0.4–0.7 s for all of it.
- **The same product, the same firm, other institutions' prices** are
  comparable for distributors: 67% of Farmaceutica Remedia's catalogue codes
  went to two institutions or more, and 96% of its lines are in shared codes
  (dexametazonă: 34 hospitals, 9.88–11.76 lei). Small firms reuse codes for
  other products (Solnet's „13" is a toner unit and a school's DJI drone set;
  a florist's „B201" spans 125 to 178,322 lei), so a match needs code, name
  and unit — and a generic name still misleads („Multifuncțională" matched a
  1,200 lei printer against a 25,000 lei A3 Konica): the rule is three other
  institutions or more, and the production read should match the catalogue
  description too.

### 16.2 What the API must change (handed to the server session, 2026-09-28)

1. **The detail is not linked (blocking).** `procurement.da_details` holds
   11,257,271 rows; 5,000 have `da_id`. The server reads the detail by
   `da_id`, so almost every purchase answers `NOT_CAPTURED` though its detail
   is in the database. The key it already holds works: the purchase's
   `attrs.direct_acquisition_id` = `da_details.source_ref` with
   `source_system = 'elicitatie_da_detail'` (unique index).
2. **The items error (blocking).** `ProcurementDaItem.id` is `ID!`; the
   mapper emits `daItemId` and nothing renames it, so any item fails and the
   whole `detail` is null beside `AVAILABLE`.
3. **Institutions lost to their name.** 0.6% of catalogue purchases have no
   authority CUI; 58% of those carry it in the name behind a mangled prefix
   („R 361684 Banca Nationala a Romaniei", „r1890420 RAJA S.A"). For some
   buyers this is most of their year: 82.4% of BNR's 2026 direct purchases,
   so its institution page misses them.
4. **How it ended.** The purchase carries `finalized|cancelled` only; the
   page needs SEAP's state (who refused or let it lapse) with the reasons.
5. **The page's reads** — added to the direct-purchase detail or read beside
   it: the parties' display names and what they are (the spine, the budget
   platform, the registry — as the profile pages read them); the pair's
   years and its figures for the purchase's year (the analysis scope above);
   the records around this one between the same two (a list by date, both
   CUIs, three either side); per line, the same product's prices at other
   institutions (a new projection: firm × catalogue code × name × unit ×
   month, with count, min, median, max — computed per request it is ~1 s for
   a mid-size firm and far too slow for Dedeman's 40,000 a year), and how
   many other times the institution bought it.
6. Smaller: privacy by field rather than by record; export rows with no date
   (18 of Apa Brașov's rows from Dedeman) sort first in a list by date. *Later
   the same day the dev API sorts them last; the date sort still reads the
   finalization date alone, so a row with only a publication date sorts with
   the undated (§16.7).*

### 16.3 The variants

**First round (28 September).** Three layouts of the same parts: `benzi`
(the profile pages' rhythm — head with the value beside the title, a figures
band, a pinned numbered bar, one band per question), `fisa` (a record sheet:
the receipt in the wide column, the value, steps, terms, parties and the
pair's years in a rail) and `relatie` (the pair's years beside the title,
the relationship first). **The owner picked `fisa`**, with two changes: the
value and the purchase's other details (the steps, the terms) move under
„Ce s-a cumpărat", and the extra information — the institution and the firm
beyond this purchase — is set apart, so it cannot be read as part of the
record. `benzi` and `relatie` are deleted.

**Second round, three sheets.** The purchase is one block in all three
(`PurchaseBlock`): „Ce s-a cumpărat" → the value, how it ended, the date and
the basket's size → the lines → „Cum s-a făcut" → „Condițiile" → the source.
The context is another (`ContextBlock`), opening with a „Context" label,
the title „Alte achiziții între ele" and one line naming the two („Ce a mai
cumpărat Banca Națională a României de la Floraria Iris SRL, din 2019
încoace." — the owner's pick of four; the first draft, „Instituția și
firma" with „Nu face parte din achiziție: …", read as defensive). The
sentences under it no longer repeat the names („Au fost 17 achiziții
directe între ele; prima, în 2023."). They differ only in how the
two are set apart:

- **`fisa` — context beside.** The purchase in the wide column; the context
  in a tinted, bordered panel beside it (below it on a phone), its records
  stacked so a title keeps its width.
- **`fisa-jos` — context after.** The purchase first, in one readable
  column; the context in a tinted band across the page after it, the
  sentences and years beside the records, the two parties under them.
- **`bon` — the purchase framed.** The purchase as a bordered receipt
  (dashed rules between the value, the lines, the steps and terms; the
  source at its foot); the context outside the frame, plain, beside it.

**Third round: `fisa-jos`, the purchase reorganised.** The owner kept the
purchase-then-context sheet and asked for its information to be organised
better. The facts had been scattered — status, date and basket size loose
under the value, the institution's description as a small grey quote beside
the lines, type and category at the foot among the terms. Now:

- **The head says the status and the value.** One marked line above the
  title („✓ Finalizată", „⊗ Refuzată de firmă", „Raportată în SEAP"), and the
  value in bold inside the sentence („… a cumpărat direct de la … cu
  98.448 lei fără TVA, pe 21 ianuarie 2026").
- **The description answers the heading.** Under „Ce s-a cumpărat", plainly
  introduced — „Instituția a descris achiziția așa:" — then its words, large,
  folded after three lines. (A first caption, „Descrierea instituției, în
  SEAP", read as jargon.) Left out when it repeats the title; a withheld text
  is said in its place.
- **The value beside one grid of facts:** Starea (with who accepted, or who
  refused and why), Data, Coșul (named by type: produse, servicii, lucrări),
  Categoria (CPV) and, only where they exist, Finanțarea and the
  institution's estimate.
- **Then the lines** (one sentence on where the money went — the count is a
  fact above), **„Cum s-a făcut"**, and **„Livrarea și plata"** — all that is
  left of the terms.

`fisa-jos-alaturi` sets the same facts, delivery and payment included, in a
column beside the lines. `fisa` and `bon` are deleted.

Context under a line — other institutions' prices, the institution's
repeats — carries the same tint and a „Context" label, so the one visual
rule holds at every scale: tinted is context, plain is the record.

The nine records: BNR's flowers (a ten-line basket, 30 funeral wreaths at
1,000 lei the largest line), a kindergarten's weekly food packages (its
first firm, 377 records since 2020), a school's PNRR IT kit, a hospital's
medicines priced against other hospitals (and a line outside the value), a
service under its catalogue price, an offer the firm refused („preț
incorect") and redone the same day at 20,000 lei, text withheld for privacy,
a quarterly-export row (Dedeman parquet — four bought the same day as four
records) and an award notification (a 3.5 mil. lei guard contract, 62% of
the hospital's direct-purchase money in 2025).

### 16.4 Decisions in the prototype

- **The record and its context never mix.** The value, the lines, the
  steps and the terms are the purchase; the institution's and the firm's
  years, ranks and other records are context, labelled and tinted. The
  figures band of the first round is gone: its shares were context sitting
  where the record was.
- **The page says, never judges.** Neighbouring records, weekly repeats, a
  split by product, a redo after a refusal are shown as records, not named
  as patterns; a price comparison states the range and where this price
  falls.
- **Context is the purchase's own year** (the year in progress through the
  cutoff), not the last twelve months: a 2021 purchase's page describes
  2021, whenever it is read. Party links carry that year.
- **The receipt is sorted by money**, numbered as SEAP lists it, with each
  line's share; a line the value leaves out is struck and said; the total is
  the purchase's value.
- **A title that names one line** („Stugeron…" for six medicines) is followed
  by „și alte 5 produse". Titles in capitals are set in reading case (known
  acronyms, Roman numerals and words with digits kept).
- **Price comparisons** from three other institutions, same firm, code, name
  and unit; identical prices are said as such („Același preț la alte 5
  instituții") — often the case for medicines.
- **A refused offer** is struck, says who refused and why, and links its redo
  („Refăcută în aceeași zi… 20.000 lei") when one follows within two weeks
  with the same title.
- **A summary-only record** says once what SEAP publishes for it and why
  there are no lines; its dates and source close the purchase block.
- **Shares have a floor** („sub 0,1%").
- **The list around this record** marks it with a bar at its edge, which
  reads on the tinted panel and on the plain page alike.

### 16.5 Open for the owner

The facts above the lines or beside them; whether the price comparison is
worth the new projection (it only speaks for distributors' catalogues, but
there it is the strongest fact on the page).

### 16.6 Promoted (28 September 2026)

`fisa-jos` is the page. The prototype and its fixtures are deleted; the
fixtures live on as the feature's test fixture (`lib/direct-purchase.fixture.ts`).

**Where the code went.** `lib/direct-purchase-model.ts` (the page's shape,
and every rule that reads the record: the family, how it ended and who
stopped it, the value a reader may take as spent, the lines, the excluded
line, the context's period and window, the redo), `lib/direct-purchase-text.ts`
(every sentence), `api/procurement-direct-purchase-api.ts` (the reads),
`api/graphql/procurement-direct-purchase-queries.ts`,
`api/procurement-direct-purchase-ssr.ts` (a bounded server memo, ten
minutes), `hooks/use-procurement-direct-purchase.ts`,
`lib/direct-purchase-keys.ts`, `components/direct-purchase/` (head, block,
receipt, context band, page, the two visual rules in
`direct-purchase-style.ts`). The shared record page (`ProcurementDetailPage`)
now serves procedures and contracts only; its direct-purchase sections, the
old fetcher and their test are gone.

**The reads.** Two queries, so a failure stays in its part of the page:

1. *The purchase* — the record with its detail, then its names (the spine's
   labels, the budget platform's record of the institution, the CPV labels;
   ~0.25 s each). The names fail soft (the record's own names stand, the page
   is `partial`). When the API errors *inside* the detail — as it does today
   for the 5,000 linked details, over the items' `id` — the record is read
   again without it and the detail said unavailable for now; an error
   anywhere else fails the read. A missing record is `null`: a 404 on the
   server, the page's own verdict in the browser.
2. *The context* — the pair's years from 2019 to the year in progress (so
   „din 2019 încoace" holds for a purchase of any year), the pair's, the
   institution's and the firm's year with each one's place in the other's
   (three analysis requests side by side), and the records around this one
   (both CUIs, newer and older than its publication day, three either side).
   Each fails soft: a part whose read failed is `null` — never a zero — its
   sentences and chart are left out, and the band says a part is missing. A
   purchase has no context to read when SEAP gives no CUI for a side (BNR's),
   no date at all (~615,000 export and notification rows), or a date before
   2019 (the legacy rows cannot tell a purchase from a refused offer); the
   band then shows the two parties and says which of the three it is, and
   the server sends `context: null`, so the render is still cached.

The year in progress is read through SEAP's cutoff (the shared read), or the
purchase's own month when that is later; only a purchase in that year waits
for the cutoff before its year's reads. A render with any partial read goes
out `no-store` and is not kept; in the browser a partial read is read again
after a minute, not on every return to the tab.

**Decisions made while building.**

- *Names.* An institution is named by the budget platform (as on its own
  page), else the spine's label, else SEAP's name — a display name that is
  only the CUI does not count, nor does the budget platform's entity for a
  body it does not know (it answers the CUI as the name). A firm is named as
  its own page names it (`displayCompanyName`). A CUI SEAP wrote before a
  name („R 361684 …") is dropped when no CUI was read or it is the party's
  own; any other number is the name's („2004 IMPEX SRL").
- *Value.* A purchase shows its checked value; an attempt its offer, struck;
  a value that did not pass the checks is said beside a dash, never shown as
  the value.
- *Status without the detail.* A cancelled catalogue purchase whose detail is
  not read (or whose text is withheld, the reasons with it) is „Nefinalizată":
  the page does not guess who stopped it.
- *Lines not taken over yet.* The purchase block says so and links the SEAP
  page; the facts grid says „lista nu e încă preluată". This is most of
  today's pages until the server links the details (§16.2).
- *Titles.* `tidyTitle` (all procurement pages) keeps known acronyms, codes
  with digits, Roman numerals and a letter used as a label („CORP B",
  „VITAMINA C") in a title shouted in capitals — the one-letter words (a, o,
  e) read as words — and raises the first letter of one written in lower
  case, unless it capitalises its second („iPad").
- *Dates.* A purchase is dated by its end; an attempt by its request, in the
  head, the facts and the records around alike — its second date is its
  cancellation („anulată pe"), shown only when it follows the request (SEAP
  has ~300 the other way round). A redo is dated plainly, or „în aceeași zi".
- *Labels in two languages.* CPV labels are kept in both languages and picked
  as the page renders; the institution's „what and where" is composed as it
  renders too — the purchase is kept ten minutes and served to every
  language.
- *Duplicates.* Only a canonical record has a page (a duplicate's id is a
  404). The source line says when SEAP publishes the same purchase in
  another source too, and that the platform counts it once.
- *Price comparisons and repeats* have their place in the model and the
  receipt (under a line, in the context tint) and stay empty until the API
  serves them (§16.2, item 5).

**Review (Opus 5.5, 28 September 2026).** Two blockers and nine should-fix
findings, all fixed: a failed context read printed zeros as facts; a
withheld cancelled record showed both sides accepting; a pre-2019 purchase
sent an inverted range and was never cached; the pair sentences read as
all-time over a span that ended with the purchase's year; an unverified value
was called unpublished in the head; a cancelled record's end was called its
finalisation and dated its request; the `unknown` state bought in the head
and was refused in the block; a record with no date got the missing-CUI
sentence, „on on", and no cache; the institution's line was kept in one
language and served in another; `tidyTitle` raised the Romanian „a" and
lowered HACCP; the redo matched the latest same-title record within two
weeks, not the nearest within one. Among the nits, also fixed: the explorer
link counts what it opens on (the purchases, not the cancelled, from 2019);
receipt shares need every line's money and „mai mult de jumătate" means more;
the detail's lasting error no longer says „reload"; the rank and count
sentences carry named placeholders and read in English („14th supplier out
of 83", „once more"); „Data" and the contract types have their own context.
Filling the English of „Achiziție directă" and „Cod CPV" left their empty
Romanian falling back to English on every page that uses them; both are
filled now.

**What the server still owes the page** (handed to the server session): the
detail link and the items' `id` (the lines, steps and terms appear by
themselves once served), the raw state with its reasons for a record whose
detail is not read, the CUI SEAP writes inside a name, and the per-line
price and repeat reads.

### 16.7 The API prototype: today and target (28 September 2026)

A second prototype of the promoted page, kept (the owner: no prototype is
removed unless they say so): `/development/procurement/direct-purchase`
(`yarn dev`), in `src/development/prototypes/procurement/direct-purchase.*`.
It is not a design round. It is the server session's checklist: what the page
looks like on the API as it answers now, what it must look like once the API
serves §16.2, and which record still waits on which change, read live.

**The views** (`?v=`, `&da=<record>` picks the record):

- `azi` — the promoted page, reading the dev API as it answers now.
- `tinta` — the promoted page's own components (`DirectPurchaseHead`,
  `DirectPurchaseBlock`, `DirectPurchaseContextBand`) fed what the fixed API
  must serve for the record: the institution's CUI recovered from its name,
  the detail with its lines, steps, terms and reasons, and per line the same
  product's prices at other institutions and the institution's repeats. The
  names and the context are read live, as the page reads them. A closed panel
  over the page, „API for this record", lists each field as the dev API
  serves it now beside what it must serve, with the change that closes it.
  Where the dev API still files the purchase without its institution's CUI,
  a note over the context band says the live counts leave it out (BNR's
  band says the pair never bought anything, beside a purchase between them).
- `api` — ten records × six changes, read live: ✓ served, ✗ open, — not
  relevant to the record, each column linked to the change's text (what is
  wrong, measured; what to serve; where; how the view checks it). `compare`
  puts `azi` beside `tinta`.

**The records** — ten, each chosen for what it needs:

| `da=` | Record | What it shows |
|---|---|---|
| `flori` | BNR, flowers, 10 lines | the CUI written in the name (change 3); a basket |
| `scoala` | Școala Brătilești, IT kit | EU funding (PNRR) in the detail |
| `serviciu` | Edilitara Târgu Jiu | a service bought under the catalogue's price |
| `refuzata` | ADI Ipatele-Drăgușeni | the firm refused the terms, with its reason; redone the same day (change 4) |
| `gradinita` | Grădinița nr. 16, pork | the same product at 5 other institutions; bought 25 more times (change 5) |
| `parc` | TUIASI, park upkeep | works |
| `spital` | Spitalul Sovata, medicines | prices at 5–12 other institutions; a line outside the value |
| `castel` | Grădinița Castel, meat | 11 lines, each bought 11–23 more times: weekly orders |
| `raport` | Apa Brașov, parquet | a quarterly export row; its pair's list order (change 6) |
| `notificare` | Spitalul Brașov, guarding | an award notification (a framework, 3.5 M lei) |

**The fixtures** (`direct-purchase.fixtures.ts`) hold, per record, the raw
record as the dev API served it on 28 September, what it answered for the
detail and the CUI, and the target: the detail joined on
`attrs.direct_acquisition_id = da_details.source_ref` with its lines and the
per-line comparisons, from a read-only prod query the owner approved that
morning. The target is what `procurementDirectAcquisition(id)` must return;
the change specs (`direct-purchase.changes.ts`) mirror §16.2 in English for the
server session.

**Read live on 28 September:** the detail link and the items' `id` open for
all eight catalogue records; the CUI for BNR; the outcome for the refused
purchase; the per-line reads for three records; the list order for both
export and notification pairs. The last was re-measured while building the
check: undated rows no longer open a list by date, but 4 of Apa Brașov's 168
rows from Dedeman (published 3 December 2025, no finalization date) sort
among its 18 undated ones, and 5 of the Brașov hospital's 9 notices from TMG
Guard after its undated one — the date sort must read the finalization date,
else the publication date, the day the page shows.

**Verdicts that are not ✗.** A detail found but failing on its lines (the
page reads it as unavailable for now) counts change 1 as served; change 2
shows „blocked by 1" while the detail is not found, and the Open row counts
the blocked beside the open; a failed read says „read failed", never ✗.

**What turns a mark by the server alone, and what needs the client too.**
The detail link, the items' `id`, the CUI and the list order turn ✓ as soon
as the dev API serves them, and the refusal reason comes with the linked
detail. SEAP's raw state and the per-line reads are new fields: the page's
query and mapper read them once the server names them
(`directAcquisition.stateText` or a code; `items[].peers`, `items[].repeats`
into `DpItem`), so change 5 stays ✗ until that client change lands.

## 17. The contract page (prototyped 28 September 2026)

`/procurement/contracts/$id` — one contract award — is where the profile
pages' contract rows and the front door's largest contracts land. It still
wears the old shared detail layout (title, „Atribuit", a value printed
„6.626.404.001 RON RON", the parties, the numbers, „Semnat", the source
procedure's card, a TED link). Prototype:
`/development/procurement/contract` (`?v=fisa|anunt|cronologie`,
`&c=<record>`), on eleven real contracts read from the dev API (build 12);
the production database was not read.

### 17.1 What a contract's data can say (dev API, 2026-09-28)

- **A row is one firm's line on an award notice, not a contract.** Two
  sources: `seap_contracts` (a row of data.gov.ro's quarterly or yearly
  export, 2007 onward) and `elicitatie_ca_award` (a contract entry on an
  e-licitatie award notice). 1,555,900 canonical rows: 902,309 framework
  agreements (none with an accepted value) and 653,591 awards (355,849
  valued). Every row's status is „awarded": nothing says a contract was
  cancelled, completed or paid.
- **An association is one row per member, each at the whole value.**
  CNIR's Târgu Mureș–Târgu Neamț motorway (CAN1145385, nr. 101/1888): five
  rows, four firms, 6,142,792,901 lei on each. Sibiu's Turnul Sfatului: two
  firms, 7,664,195 lei each. Which member carries the money is not served.
- **One contract number can carry several values** the source does not
  rank. CFR's station works (CAN1080039, nr. 57): two firms × five values,
  309.2 M to 3,253.5 M lei (the last probably a misread decimal). CNI's
  contract nr. 1065: three firms × three values — 8.45 M at signing and two
  values SEAP republished after amendments.
- **A notice holds several contracts.** ANIF's CAN1096494 has three contract
  numbers (one of them an association, one published at two values);
  Spitalul Caracal's medicine framework notice has 110 rows of lots. The
  notice's list is read by `authorityCui` + `q: noticeNo` (60 a page; the
  procedure's own `contracts` stops at 50 with no total).
- **Amendments are filed by notice, so they land on the wrong contract.**
  All four of ANIF's nr. 23.01.001 amendments belong to nr. 22.12.227. Rows
  with only a change carry the whole value as the change. **The reported
  values can disagree with the act's own text**: CNI's amendment nr. 5 says
  „prețul se majorează cu suma de 1.809.030,69 lei (exclusiv TVA)", while
  its reported values go from 8,451,291 to 180,260,321.90 lei (8,451,291 +
  1,809,030.69 = 10,260,321.87: a typed „180" for „10"). SEAP then
  republished the contract at 180.26 M and 181.27 M, so the error is in the
  contract's own rows too. (Amendment nr. 9's +2,302.40 lei is the VAT rate
  going from 19% to 21%: the value without VAT rightly does not change — the
  check leaves VAT-rate and guarantee acts, and texts with two amounts,
  alone.)
- **The procedure is sometimes another institution's.** Legacy rows join a
  procedure by a bare notice number: a 2010 Bucharest hospital contract
  links to Hârșova's 2008 procedure (205 of 225 sampled 2010–March 2018
  rows; none from October 2018). e-licitatie procedures carry no
  publication date; the award notice's estimate repeats the award; the
  number of offers is not served.
- **Money.** A value is checked (`valueAccepted`) only when
  `official_exact` or `official_ron_equivalent` (the source's own RON
  conversion: Regia Stejarul's pick-ups, contracted in EUR). A framework's
  value is a ceiling (`framework_guard`); `ambiguous_grain` also covers
  7,930 ordinary awards awaiting an audit; `conflicting_sources`,
  `invalid_source_value`, `source_missing` and `foreign_currency_only`
  (neither amount served) are the rest. VAT is undocumented for contracts;
  the amendment texts say „exclusiv TVA".
- **Call-offs have no kind of their own** (their title says „contract
  subsecvent"); nothing links one to its framework.
- **The pair is readable by count.** The analysis scope takes both CUIs for
  contracts and frameworks (and direct purchases); money is withheld per
  member for associations and contract money is provisional (§12.1). Counts
  are rows, so a contract published at five values counts five times.
- Duplicates are non-canonical rows; their ids answer null.

### 17.2 What the API should change (for the server session)

1. **Serve the contract, not the row:** for a contract row, its notice's
   contract — the members and the versions under its number — and the
   notice's other contracts, uncapped or with a total.
2. **Amendments by contract number**, not by notice; drop delta-only
   „changes" that are totals; serve the change the act's text states (or
   flag the rows whose values disagree with it).
3. **The procedure join** must match the authority too; otherwise no
   procedure (and no TED, no title fallback through it).
4. **The framework role** (framework / call-off / standalone) and the
   framework a call-off draws on (`framework_role`, §12.1).
5. **Counts by contract** (notice + number) in the pair, buyer and supplier
   reads.
6. The VAT basis for contracts; the foreign amount for
   `foreign_currency_only`; a deterministic TED pick (`limit(1)` with no
   order). Client side: `CONTRACT_CORE_FIELDS` does not request
   `recordKind`.

### 17.3 The variants

All three are the direct-purchase page's record sheet (§16): the head, the
record in one column, the context after it in a tinted band labelled
„Context". Shared:

- **The head** names the record's kind above the title („Contract",
  „Contract, în asociere", „Acord-cadru", „Contract subsecvent") and says
  it in one sentence: „Municipiul Sibiu a încheiat contractul cu Domino
  Construct Expert SRL și încă o firmă, în asociere, pe 10 decembrie 2025,
  pentru 7,7 mil. lei." A framework: „… poate cumpăra de la firmă cel mult
  34.464 lei, prin contracte subsecvente." The notice's number is the
  head's reference.
- **The value beside one grid of facts:** Tipul (and „în asociere, 4
  firme"), Data contractului, Procedura (linked to its page, with its TED
  notice), Categoria, Numărul contractului and, only where it says
  something, the estimate. The value's label says what it is (Valoarea
  contractului, Valoarea maximă, Valoarea în lei); an unchecked value is a
  dash with SEAP's figure said beside it; an association's value is said to
  be the whole contract's.
- **The context band** — „Alte contracte între ele", „Ce a mai atribuit
  {instituția} firmei {firma}, din 2019 încoace." — counts, never money:
  the pair's contracts and frameworks by year (stacked columns, to the year
  in progress), the direct purchases between them in a sentence, the
  institution's year („27 de contracte, niciunul acestei firme; și 421 de
  acorduri-cadru, 41 acestei firme"), the firm's year, the contracts around
  this one (a contract's rows collapsed; an untitled export row named by
  its number) and the two parties.

They differ in how the record's parts are laid out:

- **`fisa` — section by section.** Under the value and facts: the
  association's firms, the published values, the amendments, how it was
  awarded (only what the facts cannot hold: a negotiation without a call
  for competition explained, the procedure's total), the notice's other
  contracts, the source.
- **`anunt` — the notice as a map.** One list of every contract under the
  notice, this one first and marked, each with its firms and every value
  it is published at; then the amendments, the procedure, the source.
- **`cronologie` — the contract's history.** The procedure (when it has
  something to say), the contract, its other published values and the
  amendments on one line, with the value step by step when the reported
  values hold.

The eleven records: Sibiu's Turnul Sfatului (a two-firm association,
simplified procedure), CNAIR's Pașcani–Suceava motorway (open tender, TED,
3.07 bn), Sibiu's street cleaning (46.1 M, negotiation without prior
notice), CNIR's four-firm motorway association (6.14 bn), a lot of Spitalul
Caracal's medicine framework (a 34,464 lei ceiling among 110 rows), the
Transport Ministry's call-off, CNI's contract whose amendments disagree with
their text, CFR's contract at five values, Regia Stejarul's EUR contract, a
2010 hospital contract joined to another institution's procedure, and ANIF's
contract with a disputed value in a three-contract notice.

### 17.4 Decisions in the prototype

- **A contract is read from its notice.** Rows under one contract number are
  its firms and its versions; firms are one whether a row carries the CUI
  or only the name. Several firms at the whole value are an association; a
  framework's lots are not.
- **The page says what the source does not.** An association's value „e a
  întregului contract … nu spune cât revine fiecăreia"; several values „nu
  spune care e în vigoare"; a published value that is an amendment's
  reported value says so, and says when that amendment's values disagree
  with its text.
- **Amendments are checked against themselves.** Only the amendments under
  this contract's number; values only with both ends; the change the act's
  text states is read and compared, and the page leads with a disagreement
  rather than a „from … to" sentence that would repeat a typo as a
  twenty-fold increase.
- **The procedure only when it is the institution's own.** A wrong join is
  silence, not a wrong page.
- **The route is a fact, explained once.** „Negociere fără anunț prealabil"
  is in the facts; its sentence says what it means and when the law allows
  it — never that it is suspect.
- **Counts in the context**, money only for the record itself; VAT is not
  claimed.
- `tidyTitle` (every procurement page) now drops quotes around a whole
  title, raises the first letter past them, and keeps a letter after a
  number („LOT 2 A").

### 17.5 Open for the owner

Which layout; whether the amendments' check belongs on the page before the
server serves it; whether to ask the scrapper for the VAT basis before
saying „fără TVA"; whether the head's money is short („7,7 mil. lei", as
now) or exact.

### 17.6 The owner's pick: `fisa`, polished (28 September 2026)

The owner picked `fisa` and asked for it to be polished; the first thing they
saw was CNAIR's 3,068,398,862.94 lei running over the facts beside it — the
direct-purchase sheet's value column holds a purchase, not a motorway. What
changed:

- **The value has its own row**, sized by its length (a phone takes
  „3.068.398.862,94 lei" a size down), with its notes under it — the
  association's, and, for a contract published at several values, that this
  is one of them („mai jos"). The facts follow in one row of three (four with
  the estimate).
- **No fact is said twice.** The kind („Tipul") is gone from the facts — the
  line above the title says it; the contract's number sits in that line
  („Contract · nr. 31"), the notice's at the top right, copyable; the route
  is said once in the facts, linked to the procedure's page, with its EU
  journal notice under it.
- **„Cum s-a atribuit" is gone.** Its two sentences found their place: a
  negotiation without a call for competition is explained right under the
  facts; the procedure's total closes the lede of the notice's other
  contracts („În total, procedura a atribuit acorduri-cadru de cel mult
  557.085,90 lei").
- **Lists sit on the section's edge**; the published values lead with the
  value and say a date only where it is not the contract's; „pagina aceasta"
  marks this page's firm and value alike; a framework notice's list is titled
  „Celelalte acorduri-cadru din anunț".
- **Names and titles read as written by hand** (every procurement page):
  initials keep their dots and capitals („C.N.I.", not „C.n.i."); a title's
  closing full stop goes; the name after a place word keeps its capital
  („în municipiul Sibiu și stațiunea Păltiniș").

`anunt` and `cronologie` are deleted (owner, 28 September); the history they tried lives in the sheet (§17.7).

### 17.7 The award notice's own data (28 September 2026)

The owner asked for the history section in `fisa` and for anything else
useful the source holds, pointing at a notice's page on e-licitatie. The
page is an Angular view over public `api-pub` calls; read from Zeus with the
scrapper's headers (`accept`, `referer` = the view's URL), all answer:

| Call | Holds | Scraped? In prod? |
|---|---|---|
| `C_PUBLIC_CANotice/get/{caNoticeId}` | the call for competition's number and day, the award notice's day, the procedure type, the contract type, the total estimate **„(fără TVA)"**, the plan entry, the framework's value and its lowest/highest offer, **annex D — why no call for competition was published**, in the institution's words | scraped; prod projects the procedure type, legislation, plan, TED (`procedure_details`) and the offer spread (`procedures.lowest/highest_offer_value_ron`, 68.5% filled); annex D and the call's number and day are not projected |
| `PC_PUBLIC_CANotice/GetCANoticeLots_v2` | every lot: title, estimate, criterion, financing, duration, place, status (Atribuit / Anulat) | the lots and criteria are in prod (`procedure_lots`, `procedure_award_criteria`), financing is not |
| `C_PUBLIC_CANotice/GetCANoticeContracts` | every contract: number, day, **all its winners** (CUI, SME, city), value in its currency and in lei with the rate, how many times it was modified | scraped; the API names one firm per e-licitatie row, so an association's other members are lost (CNAIR's Pașcani–Suceava was won with SA & PE Construct and Spedition UMB) |
| `C_PUBLIC_CANotice/GetContractView/?contractId=` | **the offers received** (and from SMEs, other EU states, outside the EU, electronically), per lot the offers admitted, unacceptable, non-conforming, withdrawn; the contract's own estimate; its start; its value today; framework or purchase contract | **not scraped** |
| `C_PUBLIC_CANotice/GetAllVersions/{id}` | every published version of the award notice — the first made the award public, the others republish it (after modifications) | not scraped |

Measured on the eleven records: CNIR's 6.14 bn lei motorway received **one
offer**; CNAIR's Pașcani–Suceava three, two unacceptable, contracted **29%
under the 4.30 bn estimate**; CNI's pool five, three unacceptable; Sibiu's
street cleaning was negotiated because its open tender CN1089166 was
contested; the Transport Ministry's call-off invokes exclusive rights (art.
104); CNI's contract stands at 181.9 M after **8** modifications, CFR's at
398.1 M after **12** (one of the five values SEAP publishes for it). CNI's
award notice was first published six days after the contract and
republished eight times since — its „date" in the API is the last.

**The sheet now shows** (from these calls, as the adapted API would serve
them — fixtures read 2026-09-28):

- the value „fără TVA" wherever an award notice stands behind it, and the
  source line says so;
- in the facts: **Oferte primite** (with what became of them and who sent
  them), **Criteriul de atribuire**, **Durata**, and the estimate with how
  far the contract came from it („contractul: cu 29% sub estimare");
- for a route without a call for competition, the institution's own
  explanation under the facts („Instituția a explicat așa: …");
- the association's members from the notice, with the firm's SME status;
- **„Istoria contractului"** (in place of the amendments list): the call for
  competition and the offers it drew, the contract, its start, the award
  notice (first published, republished how often, last when), the
  amendments checked against their text, and the value the notice holds
  today after its modifications;
- the notice's lots counted with the cancelled ones in the other-contracts
  lede, and the notice's own page as the source.

**Asks.** Scrapper: `GetContractView` per contract (the offers, the
contract's estimate, its value today) and `GetAllVersions` per notice; keep
all winners from `GetCANoticeContracts`. Server: serve the contract's
winners, its offers, the lot it belongs to (estimate, criterion, duration,
status), annex D's explanation, the call's number and day, the first and
last publication of the award notice, and the modified count and current
value.

### 17.8 Review (Opus 5.5, 28 September 2026)

Three blockers and fourteen should-fix findings, all fixed before the
commit. **Shared, every procurement page:** a title of two quoted parts
(„A” și „B”) lost one quote of each pair — the outer quotes now go only when
they are the title's only ones; a title that opens with a number is not
raised („2 buc imprimante"); a place's name keeps its capital only right
after its place word (not a preposition, not past a comma, cedilla spellings
included); a title's full stop stays after an abbreviation („etc.",
„buc."); a letter after a number is a label only after a labelling word
(„LOT 2 A", but „etapa 2 a proiectului"). **The prototype's rules:** an
association is several firms at one value (or named winners of the
contract), not several firms under one number; a row without a number is
its own contract; a firm is keyed by its CUI, its name only for a row
without one; an amendment's stated change is read only from a text with one
amount in lei, no VAT, no rate, no guarantee, signed by the verb nearest
it — CNI's act nr. 9 (the VAT rate) is no longer flagged; an amendment with
no number stays only when the notice has no other contract; a published
value is credited to the earliest act that changed the value to it; the
list around the contract shows this page's own row; a checked value is
`valueAccepted`, and `not_applicable` says what it is; a framework shared
by several firms says so; the versions' lede names the notice's value today
when it is one of them; „fără TVA" only on a value that is the notice's; no
title taken from another institution's procedure; the context band keeps
its chart and list for pairs with more than one contract and marks the year
in progress.


### 17.9 Promoted (28 September 2026)

`fisa` is the page: `/procurement/contracts/$id` no longer wears the shared
detail layout. The prototype stays (the owner: no prototype is removed unless
they say so) and now renders the page's own components: `fisa` on its eleven
fixtures, the award notice's data included — the target the API has yet to
serve — and a new `azi`, the page on the dev API as it answers today
(`compare: azi, fisa`).

**Where the code went.** `lib/contract-model.ts` (what is read, the page's
shape, and every rule: the value, the kind, the notice's contracts, firms and
versions, the amendments and their stated change, the procedure's check, the
context's gap, the contracts around), `lib/contract-text.ts` (every sentence),
`api/procurement-contract-api.ts` (the reads),
`api/graphql/procurement-contract-queries.ts`, `api/procurement-contract-ssr.ts`
(a bounded server memo, ten minutes), `hooks/use-procurement-contract.ts`,
`lib/contract-keys.ts`, `components/contract/` (head, block, context band,
page). The names read is the direct-purchase page's (`readNames`, its mapping
now `namesOf`, shared with the prototype). The shared record page
(`ProcurementDetailPage`) now serves procedures only; its contract config, its
fetcher (`fetchContractDetailLive`), the modification trail and the source
procedure section are gone.

**The reads.** Two queries, so a failure stays in its part of the page:

1. *The contract* — the record with its amendments (each with the contract
   number it names), its procedure and TED notice; then the notice's rows (the
   institution's contracts whose text holds the notice's number — the list has
   no filter by notice — a page of 100, the ones of this notice kept; a full
   page makes the notice's count a floor); then everyone's names. The notice
   and the names fail soft: the contract stands on its own names and is
   `partial`; an unread notice is said on the page (the association's firms,
   the other values and contracts may be missing) and is never taken for a
   notice holding nothing else — no unnumbered amendment, no notice-wide
   estimate. A missing record is `null`: a 404 on the server, the page's own
   verdict in the browser.
2. *The context* — by count, never money: the pair's contracts, frameworks
   and direct purchases by year from 2019 (the direct purchases' money too —
   it is clean), the pair's, the institution's and the firm's year, and the
   contracts around this one (a contract's rows collapsed, this page's own
   kept — the lists read twelve rows a side, and a full side's farthest
   contract, perhaps cut short, is left out). The year in progress is read by
   month and counted through SEAP's contract cutoff month („2026 (până în
   mai)"), as the direct-purchase page counts it; the chart runs to it when
   SEAP has any of it, dashed. The firm's contracts from this institution in
   the year are the pair's — no breakdown read. „Toate cele N dintre ele"
   opens the explorer from 2019, as N counts. Each part fails soft (null, never a zero) and
   the band says a part is missing; a contract with no CUI for a side, no
   date, or a date before 2019 has none to read, and the band says which.

**What the live page shows, and what waits for the API.** The award notice's
own data (§17.7) is not served: the page reads `source: null`, so the offers,
the criterion, the duration, the notice's estimate, the call for competition,
the award notice's publications, the justification of a route without a call,
the value today and the lots are left out — they appear where the adapted API
serves them, without a UI change (`ContractNoticeSource` is the shape). Without
them the live page still says the value and what it is, the facts, the
association's firms, the published values, the amendments checked against
their text (with „Istoria contractului" when there are any), the notice's
other contracts and the source. „Fără TVA" is said for the award notice's own
entries (`elicitatie_ca_award`), whose form states its values without VAT; an
export row matched to a notice links the notice but claims no VAT basis. The
TED notice is the API's pick (`limit(1)`, no order): a 2022 procedure can link
a 2026 notice (§17.2).

**Measured on the dev API** (28 September, `yarn dev`): the eleven records
render with no console errors; a first render reads in ~3–4 s cold in dev
(three requests one after the other, then the context); the phone width holds
the largest value a size down.

**Review (Opus 5.5, 28 September 2026).** No blocker; seven should-fix and
four nits, all fixed before the commit: an unread notice was taken for one
holding nothing else, and said nothing; the year in progress was counted
whole beside a „(până în mai)" label; the explorer link opened a wider list
than it counted; the notice's row count took other notices' search hits (a
call-off citing its framework's notice); the list around cut a contract's
values at the page's edge (CNI's nr. 132 showed two of its three); a
framework's page could call another record „singurul contract"; the
direct-purchase prototype read a fixed join with the lines still failing as
open. Also: an institution that awarded only frameworks is said so, not „0
contracte"; the export's quarter is said in the reader's language; the EU
journal sentence is one message; a framework's description says so; a title
that is the procedure's is marked; the shared page's contract types and
branches are gone.
