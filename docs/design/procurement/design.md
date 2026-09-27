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
