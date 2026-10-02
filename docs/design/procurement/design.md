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
| `/achizitii/cpv/$code` | CPV category page — since 1 October 2026 a redirect to `/procurement/analytics?cpv=$code` (§19) | `routes/achizitii.cpv.$code.tsx` |
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
| 4 | cpv-category-page — folded into the analytics page (§19) | `/achizitii/cpv/$code` | `cpv_codes/divisions` + category rollups + gate | `CpvLabel`, `SpendOverTime`, top-N |
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

### 12.5 The hero, and the page before its reads (30 September 2026)

The owner's polish of the front door, after the analytics page was promoted.

- **Five buyers, then ten.** The hero names the five largest buyers.
  „Arată mai multe" („Show more") opens the next five, and „Arată mai puține" closes
  them (the categories band's control). Before this, the hero showed ten on
  a wide screen and five on a phone. The hero is now 667 px tall at
  1440×900 (906 before), so the pinned bar sits above the fold.
- **The source closes the hero.** On a wide screen the source line sits at
  the hero's foot, 24 px above its bottom rule, in the hero's bottom
  padding. It stays there however tall the buyers panel is, open or
  closed. (A first version set it level with the panel's foot, which left
  80 px of hero under it.) On a phone it comes after the panel. Until the
  read says which month the records are complete to, the month's place is
  held.
- **The cross over the pinned bar.** The blue cross sits on the hero's
  bottom rule, where the pinned bar begins, and is drawn above the bar. It
  used to sit at the bar's foot, in the figures band, and the bar covered
  its top half. This is the pattern the buyer head and the analytics head
  already follow.
- **The map first.** The bands now run: 01 Pe județe, 02 Ce se cumpără,
  03 Cine vinde, 04 În timp, 05 Cum se cumpără, 06 Cele mai noi. The
  figures band stays between the pinned bar and the map.
- **The page before its reads.** A client-side navigation mounts before the
  reads. Every band now renders what it knows without them: its number,
  title and toggle, its captions, the figures' terms, and the map's caveat.
  The rest holds its place in the shape of what replaces it:
  - rows with the real rows' lines, at their sizes, with a ranking's places
    shown;
  - ledes with the lines they take;
  - the map's frame, the legend's height, and the county ranking's two ends;
  - the year columns' frame.

  The old skeletons (grey bars, titles missing) grew the page by 2,700 px
  when the data landed. Measured with the API held back (Playwright, dev
  server):

  | band | 1440 px: pending → loaded | 390 px: pending → loaded |
  |---|---|---|
  | hero | 667 → 667 | 1084 → 1084 |
  | figures | same height | 16 px short |
  | map | 942 → 943 | 1369 → 1377 |
  | categories | 847 → 847 | 1063 → 1082 |
  | sellers | 990 → 990 | 1444 → 1444 |
  | years | 483 → 483 | 701 → 701 |
  | procedures | 640 → 640 | 951 → 951 |
  | newest | 1013 → 993 | 1152 → 1152 |

  What remains depends on the data: how many titles or notes take two lines.
- **Reviewed** by Codex `gpt-6.1-sol` (xhigh; no defects) and Opus 5.5
  (xhigh). Opus found no serious defects; its findings are fixed:
  - Opening the list from the keyboard now moves focus to the sixth buyer,
    as the county ranking's control does. Before, the next Tab skipped the
    five new rows.
  - A pending paragraph now shortens only its own last line, at each width.
  - The contract ranking's caption („După numărul de contracte
    atribuite.") shows before the read, because it doesn't depend on it.
  - One ruled-note class, one show-more class and its placeholder, and
    the national read's state type are now shared from `home-chrome.tsx`.

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

## 18. The analytics page (prototyped 29 September 2026)

`/procurement/search` becomes „Analize" at `/procurement/analytics`. The
explorer it replaces has three tabs (overview, list, rankings), a filter
sheet whose filters apply differently per tab („doar în listă", „nu în
clasamente"), a grain toggle and a value-basis radio: powerful, but the
reader must know the model first. The new page answers a question: one query
in the URL, one answer, every part of the answer a way to the next question.
Prototype: `/development/procurement/analytics` (`?v=raspuns|traseu|panou`),
live on the dev API (build 12); the production database was not read. The
brief was critiqued by Codex `gpt-6-astra` (xhigh) before the build.

### 18.1 What the analysis API can answer (dev API, 2026-09-29)

- **Six reads, 120–460 ms each, on ClickHouse:** `procurementStats`,
  `procurementSeries` (month / quarter / year; sparse — a month with nothing
  is missing, not zero), `procurementBreakdown` (17 dimensions, top ≤ 100 —
  SIRUTA ≤ 3,300 — plus `other` and `unknown` buckets that add up to the
  stats), `procurementFacets` (1–3 dimensions, explicit grain),
  `procurementConcentration` (firms, top-1 and top-5 share, HHI) and
  `procurementShare`. Names are separate: `organizationLabels` (≤ 250 CUIs),
  `procurementCpvCodes` (≤ 200), `procurementCpvDivisions`; localities have
  none (the page reads them from the map's UAT file, a county's own SIRUTA
  from the County file).
- **A scope is single values, ANDed:** grain, record kind, buyer, firm, one
  CPV level (a division is 2 digits; a group, class, category or code is the
  8-digit code), buyer and firm region / county / locality, procedure type
  (contracts), `from`/`to` months or a `year`, a title substring (3–100
  characters, diacritics not folded) and a value range (which keeps only the
  valued rows). No multi-select, no exclusion, no offset past the top 100,
  no two-dimensional breakdown, no median.
- **Failure is all-or-nothing per request:** a breakdown on a dimension the
  scope fixes errors, one invalid root nulls the whole response, and an
  unused declared variable is a 400. The page sends each read as its own
  request, so one failure leaves the rest of the answer.
- **Populations.** Direct purchases: clean money without VAT, comparable
  from 2019. Contracts: award rows and framework rows together; money
  provisional (framework ceilings and call-offs; ~25.7% of rows valued);
  counts are rows (an association member or a lot is a row); a firm's money
  withholds association money (`valueWithheldAssociationSum`). Frameworks:
  ceilings, not spend. Both populations are complete through May 2026
  (`readCutoffOutcome`).
- **The record kind splits only SEAP's export.** e-licitatie's award
  notices carry no kind, so their frameworks and call-offs are awards
  (scrapper `PROCUREMENT_SERVING_REVIEW_2026-08-05.md`), and from January
  2026 the rows come mostly from e-licitatie: framework rows fall from
  7–12k a month to 187 (January), 957, 1,987, 4,054, 2,085 (May), while award
  rows rise to 6,875 (March) and 7,357 (April). The last 12 months showed
  frameworks −46% and awards +15% against the 12 before — the sources
  moving, not the buying. Contract coverage moves by year anyway (SEAP's
  2019 bulk year missed; awards at 1.5–1.8k in January–February and
  July–August 2025 against ~4.5k; `PUBLIC_CONTRACTS_TIME_COVERAGE_AUDIT.md`).
- **Lists stay slow** (Postgres on dev, 0.1–15 s; no search engine):
  `eq` filters, a direct-purchase list needs a party or a window of at most
  366 days, firm-geography list filters fail (BAD_GATEWAY), `total` is null
  past 10,000.

### 18.2 The page

**The query** (`analytics.model.ts`) is the page's whole state, in readable
URL keys:

| Part | URL | Values |
|---|---|---|
| Population | `tip` | `directe` (default) · `contracte` · `acorduri` |
| Period | `perioada` | the last 12 months to the cutoff (default) · `2025` · `2024-01..2025-06` |
| Who buys | `cumparator` · `regiune` · `judet` · `localitate` | a CUI · a region · a county code · a SIRUTA |
| Who sells | `firma` · `regiune_firma` · `judet_firma` · `localitate_firma` | the same, for the firm's seat |
| What | `cpv` | a digit prefix: 2 = division … 8 = code |
| How | `procedura` | a SEAP procedure label (contracts, frameworks) |
| Narrowers | `titlu` · `valoare` | a title substring · `min..max` lei |
| Divided by | `dupa` | `institutie` `firma` `categorie` `grup` `clasa` `categorie5` `cod` `regiune` `judet` `localitate` `*_firma` `procedura` `an` `trimestru` `luna` |
| Measure | `masura` | `numar` · `lei` · `locuitor` |

A URL that asks for something the population cannot give is repaired, not
refused: `dupa` on an axis the filters fix becomes the filters' natural
next question (a county's institutions, an institution's firms, a
category's next level); a procedure on direct purchases is dropped; lei on
frameworks become a count; per resident outside buyer counties becomes lei.

**The answer, in reading order:**

1. **The controls:** population, period, the filters as removable chips,
   „+ Filtru" (one omnibox: institutions and firms from the site search,
   CPV by name or code, counties for either side, procedures, „titlul
   conține", value from/to), „Întrebări", „Legătură" (the link with the
   months frozen, so a shared answer does not move).
2. **The readout:** the query as a Romanian sentence — „Achizițiile
   directe ale instituțiilor din județul Cluj, pentru lucrări de
   construcții, pe firme" — the months, and one gloss of the population
   („Cumpărături din catalogul SEAP, fără licitație. Bani verificați, fără
   TVA."). A gallery question's trap follows it.
3. **Four figures:** records, lei (direct purchases; contracts only as a
   marked provisional figure), firms, the top five firms' share of the
   money. Direct purchases add the change against the same months a whole
   number of years before (January–May 2026 against January–May 2025; the
   last 12 months against the 12 before; none when that window reaches
   before 2019), the months said („față de ianuarie 2025 – mai 2025");
   contracts and frameworks show none (§18.1).
4. **The answer:** tabs for the axis (Instituție · Firmă · Categorie · Unde
   cumpără · De unde vând · În timp), the level (diviziuni → coduri;
   regiuni → localități; ani → luni) and the measure. A ranked list with
   fill bars, share, value and count, then „Restul" and the unknown, so it
   adds up. A row click narrows to that row and opens the next level (a
   firm → its categories, a year → its months); the arrow opens the
   profile. By time: bars, the year or quarter still filling dashed and
   said so („2026 (până în mai)").
5. **Context:** „În această selecție" (the top of the other axes, each a
   chip that narrows), the years since 2019, the records, the method.
6. **Records on request** („Vezi înregistrările"): 25, the largest
   first or the newest, in their own request with a 9-second deadline;
   loaded at once when an institution or a firm is picked. A wide
   direct-purchase selection says why it cannot list („lista cere o
   instituție, o firmă sau cel mult 12 luni") instead of narrowing
   silently; a firm-county selection says the list cannot filter by it.
7. **The gallery:** 25 questions in six groups (Cine cumpără · Cine vinde ·
   Ce se cumpără · Unde · Când · Cum), six of them under the default answer,
   each a URL and each with the trap its data sets where there is one („Un
   acord-cadru fixează un plafon, nu o cheltuială"; „Sediul firmei nu e
   locul lucrării"; „Caută «laptop» în titlu: un coș numit altfel nu
   apare").

Measured (last 12 months, June 2025 – May 2026, buyers in Cluj): 95,800
direct purchases, 666.0 M lei, 7,775 firms, the top five firms 3% of the
money; Cluj firms take 59% of it; Cluj-Napoca's institutions 49%, the county
council 8.2%. Per resident, București's institutions buy 1,203 lei (they
hold the central state). Every analysis read answers in under half a
second; a page reaches network idle in 3.5–5 s in `yarn dev` (the names and
the map files after the figures).

### 18.3 The variants

- **`raspuns` — the answer is the page.** The controls stick above (from
  `sm`; on a phone they scroll away), the readout, the figures, one answer,
  the context below. Closest to Astra's `intrebare`: conventional controls
  under the sentence, not a sentence to edit word by word (Romanian
  agreement would decide the interaction).
- **`traseu` — who buys, what, from whom** (removed 29 September, §18.9).
  No group-by: three linked columns, each ranked under every pick but its
  own; a pick in one narrows the other two.
- **`panou` — the workbench** (removed 29 September, §18.9). A rail with the
  top six of every axis, the answer beside it.

### 18.4 Decisions in the prototype

- **Default: direct purchases, the last 12 months, categories by lei** —
  what the state buys, the front door's first question. The money there is
  clean; the profile pages open on the same window (§15).
- **Contracts are counted.** Lei are offered, marked provisional, never
  beside a count; a firm's lei end with „În asociere — neîmpărțit pe firme"
  (the withheld association money), never spread over the members.
- **Per resident only for the buyer's county,** over INS POP105A (1
  January 2025), said under the ranking; counted at the institutions'
  seat, not where the money is spent.
- **The cutoff is national**, from the population's monthly counts; never
  from a narrow selection.
- **Contracts and frameworks past 2025 are said to be mixed:** a note under
  the headline when the period reaches 2026, the 2026 bars dashed („fără
  deosebirea acordurilor-cadru"), and no change figure for either
  population in any window (`kindSplitUntil`, `changes: false` in the
  registry). Framework records open newest first — there is no value to
  rank them by.
- **Facets are one band below the answer**, not a permanent side panel
  (Astra: three facet dimensions cannot feed four panels, and they compete
  with the answer). `panou` keeps the rail as the control.
- **No map yet.** Geography ranks first; a map is a second view of the same
  ranking, later.
- **Cut from the population picker:** procedures (all-time only),
  modifications (counts only, half undated), call-offs (2016–2018). Their
  old links need a compatibility state when the route is promoted.

### 18.5 Extending it

The registry in `analytics.model.ts` holds what the page knows:
`POPULATIONS` (grain, record kind, money policy, comparable-from, cutoff,
default measure) and `AXES` (per axis: its levels, each with the API
dimension, the scope key, the URL param and its validation; the names
source; `maxValues`; the populations it works for). The query compiles to a
scope (`scopeOf`), and each read (`analytics.data.ts`) is its own request.

- **A new dimension or filter the API serves** (buyer type, framework role)
  is an entry in `AXES` plus its name source.
- **Multi-select** is `maxValues > 1`: the filter's `values` is already an
  array, the chips already list them; the scope then needs an `in` field.
  Summing single-value queries is wrong (distinct counts overlap).
- **A two-dimensional answer** (institution × category) is a new `dupa`
  shape and an answer component; it needs a server breakdown with marginal
  totals.
- **Comparing two selections** is a second `Query` and a second `useAnswer`;
  the figures band already takes a before.
- **What would resist** (the review counted it): a new dimension is about a
  dozen hand edits, not an entry — `defaultGroupOf`, `nextGroupAfter`,
  `facetAxesOf`, the group-by tabs and URL keys, the headline's phrases,
  `groupTab` / `unknownLabel` / `keyLabel`, `profileLink`, `useNamer`; a
  new population means the `tip` branches in the text, the figure labels and
  the records; multi-select touches every `values[0]`; and what the list
  endpoints can filter by has no place in the registry (the contracts list
  has no procedure filter). Promotion should move these into the registry
  (per level: its phrase, its unknown label, its link, its list filter key)
  and version the URL (`v=1`), migrating the old explorer's params before
  parsing.
- **The headline is built from fragments** (subject, buyer, seller,
  category…), each translated on its own: a translator cannot reorder them.
  Promotion needs whole-sentence messages per population with the slots as
  variables.

### 18.6 What the API should add (for the server session)

1. **`in` filters** (several buyers, counties, CPV prefixes, procedures) and
   **exclusion** (all but București). They are what would make the front
   door's reader categories („Medicamente", „Drumuri, poduri și
   autostrăzi", „IT și telecomunicații") questions of the analytics page:
   each is a set of CPV prefixes, some minus a longer one (`33` without
   `336`). Only 5 of the 21 are one prefix with nothing carved out (§19),
   so they stay unlinked until the API takes a set.
2. **A two-dimensional breakdown** with marginal totals.
3. **An offset** past the top 100 (rankings to page through).
4. **Distinct firms and institutions in `procurementStats`** for the whole
   period (the series' monthly distincts do not add).
5. **Value bands** (a histogram) and the **median**.
6. **The buyer's type** (ministry, county council, hospital, school…): the
   question readers ask most after „who".
7. **`framework_role`** (framework / call-off / standalone) on every
   channel, e-licitatie included, so contract lei stop being provisional and
   2026's awards and frameworks separate (§17.2, §18.1).
8. **A diacritic-folded title search** („deszăpezire" = „deszapezire").
9. **The data's as-of date served** (the cutoff per population), instead of
   deriving it from counts.
10. **Locality names** in the API (the page reads them from a map file).
11. **A procedure filter on the contracts list** (`ProcurementContractsFilter`
    has none: a procedure-scoped answer cannot show its records).
12. **The firm's place on the lists without the search engine.** The
    contracts' and direct purchases' `supplierRegion`, `supplierCounty` and
    `supplierSiruta` fail with BAD_GATEWAY on the dev API, which runs no
    search engine, while the buyer's place answers. Served from the
    analysis rows (as the amendments' buyer place already is), a
    firm-place question would list its records and they would match its
    count; until then the page lists only a firm picked (§18.14). On 1
    October 2026 the production API (`api.transparenta.eu/graphql`) had
    no procurement reads at all (`procurementContracts` unknown), so
    nothing there can be checked yet.

### 18.7 Review (Opus 5.5, 29 September 2026)

Two blockers, ten major, ten minor; all fixed, and the query's contract with
its address is now under unit test (`analytics.model.test.ts`: every
question and drill round-trips; the adversarial addresses; the periods).

- **Blockers.** `?dupa=constructor` crashed the page and `?tip=constructor`
  hung it (the lookups reached `Object.prototype`); an address the page
  could not read (`cumparator=RO4305857`, `cpv=45000000-7`, `judet=cj`,
  `titlu=ab`, a procedure on direct purchases) was dropped silently and the
  answer turned national — under the default question's trap. Now the
  common forms are read (the „RO", the check digit, the case), and what is
  still unread is said above the figures („Din adresă n-am putut folosi:
  …"), with no trap.
- **Money said for what it is.** The association money now has its row on
  every axis that ranks by firm or by the firm's place (on „De unde vând"
  the rows added up to about 69% and 28.7 bn lei were invisible); a firm's
  contracts say they leave out the ones won in an association; contract lei
  are marked provisional in the time answer, the top-five figure and the
  years strip.
- **Time.** The series is filled (an institution's 12 months drew as 9
  bars); a bucket the window cuts is dashed and said at either end („2025
  (din iunie)"); the change compares the same months (January–May 2026 had
  been set against August–December 2025, December included); direct
  purchases before 2019 carry their note; a period after the data or out of
  range answers the last 12 months and says so; a failed cutoff read is said
  instead of claiming „date complete".
- **The API's own verdict** is shown: every contract answer is `degraded`
  („Răspuns parțial: 33.836 de rânduri fără dată (94,1 mld. lei) nu intră
  în nicio perioadă"); an `abstained` one says the figures are missing, not
  zero. The API's English caveats stay in „Cum am calculat", labelled.
- **Two traps were false** and are rewritten from the data: the county
  council is filed under the county's own SIRUTA („Județul Cluj", 8.2%),
  not in Cluj-Napoca; the top direct-purchase sellers are telecoms,
  wholesale and DIY stores and pharmacies (Vodafone, Selgros, Dedeman,
  Sensiblu, Poșta, Metro), none above 0.44% — fuel is tenth.
- **Records.** A procedure filter now says the list cannot filter by it (the
  contracts list has no such field — it answered 400), and a failed list
  with a party fixed no longer tells the reader to pick a party.
- Also: Romanian plurals („1.709.191 de locuitori"); empty „Restul" rows
  gone; per-resident unknown rows no longer print lei among rates; facet
  localities named; the link copies this page's address and freezes a year
  in progress; the list deadline uses `withDeadline` (Safari < 17.4 has no
  `AbortSignal.any`); questions, traps, tabs and the population note are
  translatable (`msg`); the period menu opens on the period's months; „Arată
  primele 100" belongs to its question (Back opens at 25); `traseu` no
  longer reads a ranking it does not show; the rail and the columns say
  what the rest holds.
- Found while fixing: direct purchases spiked in April–June 2025 (≈255k,
  254k, 222k a month against ≈135k in 2026), so January–May 2026 reads −29%
  against January–May 2025; the arithmetic is right, the cause is not
  known.

### 18.8 Open for the owner

- ~~The layout~~ — `curat` (§18.10).
- Whether contract lei are offered at all before `framework_role` lands.
- The route: `/procurement/analytics` with `/procurement/search` redirecting
  (the old params mapped), and the explorer's list view kept as the
  records layer or dropped.

### 18.9 The owner's pick and the clean versions (29 September 2026)

The owner kept `raspuns` only and asked for a much cleaner interface — „no
need for extra text, let the data speak" — and for every filter in a side
panel (a responsive sheet on a phone) beside the quick filters, for the
power user. `traseu` and `panou` are removed at the owner's word; `raspuns`
stays as it was; three versions of it are added:

- **`curat` — the words cut.** The question as the headline; under it the
  months and one marker (an „i", or amber with a count when something is
  off) whose popover holds everything that was prose — what the address held
  that the page could not use, the window before 2019, the record-kind
  split, the API's partial verdict, the question's trap, the population's
  rules. Four bare figures (the change's months in its title); the ranked
  answer on one line per row (rank, name, bar, value, share; the bar under
  the name on a phone; the count in the row's title; the profile arrow on
  hover); the chart with its buckets labelled; the years as a small strip;
  one source line at the foot („Sursa: SEAP, complet până în mai 2026 · Cum
  am calculat", the method in a popover). No facets and no gallery on the
  page: the questions stay in „Întrebări".
- **`lateral` — filters beside the answer.** `curat`'s answer, the panel
  open at the left from `lg` (sticky, its own scroll); each field shows its
  axis's top five in the selection with their shares, and „restul". A pick
  shows its own next level (a county → its localities, a category → its
  groups). The quick row gives the panel what it holds (population, period).
- **`tabel` — every number at once.** The figures in one line; the answer a
  table — records, lei, the average, the share with a bar — whose headers
  rank by their column (the server ranks: the top 25 by lei is not the top
  25 by count); in time, a row per period. On a phone the table keeps the
  name and the column it ranks by.

**The filter panel** (`analytics.filters.tsx`) holds the whole query:
population; period (the last 12 months, a year, two months applied when the
focus leaves the pair); institution and firm (the site's search, or a CUI
typed as it is — „RO" read); the buyer's and the firm's place (region and
county selects, then the county's localities from the map's file); the
category (search by name or code, the pick shown as its path — division ›
group › class — each step a click back up); the procedure (contracts and
frameworks); the title's words; the value range. A change applies at once:
the address is the state. In `curat` and `tabel` it opens as a sheet — from
the right, from the bottom on a phone — with „Șterge tot" and „Arată 95.800"
to close on; in `lateral` it is the rail (and the same sheet, values
included, on a phone).

**Checked on the dev API:** every panel field drives the address (an
institution, a county and its top locality, a category and a step back up
its path, the title, the value, the months, a year, contracts, a procedure,
clearing all; a firm from the sheet), with no console errors; the three
versions answer the review's hard cases (contracts by year, per resident,
frameworks, one firm's contracts, months, an unread address) without
errors; no horizontal scroll at 390 px; `raspuns` renders as before.

### 18.10 `curat` with the table (29 September 2026)

The owner liked `curat`'s figures and `tabel`'s table, and asked to remove
`lateral` and move the table into `curat`. `curat` now answers a ranking
with the table (records, lei, the average, the share; a header ranks by its
column) under its four large figures; a breakdown in time stays a chart.
`lateral` is removed with what only it used — the panel's top values and
the rail — and so are `curat`'s one-line bar rows. The filter panel is the
sheet.

Then the owner kept `curat` alone: `tabel` is removed, with its one-line
figures and the table's rows in time. The prototype holds `raspuns` (as it
was) and `curat`, the page to promote.

### 18.11 Two heads for `curat` (29 September 2026)

The owner asked for two redesigns of `curat`'s head: the control bar, the
headline, the months, the figures. Both keep the rest of `curat` (the
group-by, the table or the chart, the records, the source line, the filter
sheet) and read the same query; `curat` stays as it was.

- **`propozitie` — the headline is the control.** No toolbar. The
  headline's phrases are the query's parts (`headlineParts` in
  `analytics.text.ts`; `headline` joins them, so the other versions read the
  same sentence): „Achizițiile directe ▾" opens the population's switch; a
  filter's phrase („ale instituțiilor din județul Cluj") opens the filter
  sheet, its ✕ (on hover from `sm`, always on a phone) drops it; the
  group-by's phrase is text (the tabs above the table choose it). A filter
  the sentence folds into another (a county under a chosen institution)
  shows as a chip under it. The months under the headline are the period's
  picker, beside the caveats' marker; „Adaugă", „Filtre", „Întrebări" and
  the link sit quietly at that line's end. The figures in one ruled row:
  the value first, what it counts and its change under it.
- **`bara` — one bar, figures with their years.** The populations as
  tabs (three equal on a phone) and the period on the first line; on the
  second, one search field that holds the filters as chips and opens the
  search over institutions, firms, categories and counties — replacing
  „+ Filtru", too close to „Filtre" — then „Filtre", „Întrebări", the link.
  The headline with the marker on its last line; each figure with its
  years since 2019 as small bars (the window's darker, 2026 dashed, a click
  takes the year), so the years strip below goes. Firms and the top five
  have no yearly read yet (the series' distinct firms per year would serve
  the first).

Checked on the dev API: the population switch, dropping a phrase, the
period, adding a filter (the sentence); a search from the bar, dropping a
chip, the tabs, a year from a trend (the bar) — all drive the address, no
console errors; the review's hard cases load in both; no horizontal scroll
at 390 px.

### 18.12 `propozitie` on the profiles' grid (29 September 2026)

The owner kept `propozitie`'s head and asked for it polished onto the new
design grid, with the title no longer a dropdown and the options laid out as
on the procurement profile pages. It now stands on the buyer page's
geometry, part for part:

- **The head band** (`GridHead`): the lattice, the corner ticks, the ruled
  frame; the top row with the way back („Achiziții publice / Analize") and,
  at the right end, how recent the data is („Date actualizate până la 31 mai
  2026") beside the „Perioada" control; the question as an extrabold
  headline sized by its length, the population and the group-by as words,
  each filter's phrase opening the panel with its ✕ to drop it; under it
  „Adaugă un filtru", „Filtre", „Întrebări", the link and the caveats'
  marker, as the profile's ways out; the crux where the head's bottom rule
  meets the frame.
- **The pinned bar** (`PopulationNav`, in `HomeSectionNav`'s shape): the
  question on the left from `md`, and the three populations at the right —
  „Achiziții directe · Contracte atribuite · Acorduri-cadru" — the one read
  underlined; nothing scrolls (the owner: „there is a scroll" — the
  underline reached a pixel past the bar, and the bar scrolled): on a phone
  the three share the width, their names wrapping. Not
  numbered (the owner: „the numbers don't make sense here"): the profiles
  number a sequence of bands, these are three choices — each carries an
  icon instead (the owner's suggestion): a cart for direct purchases, and
  the contract page's own marks, `FileSignature` for contracts and `Layers`
  for frameworks; the active one's in the navy accent.
- **The figures band** (`HubFiguresBand`, as the profiles use it): the value
  large with its unit apart („15,3 mld. lei"), the mono term under it, the
  change as the cell's note.
- The answer, then the years and the records, each in a band of the same
  frame; the source line at the foot.

The group-by stays above the table. A variant for later: the group-by's
axes as the pinned bar's numbered items („01 Ce · 02 Cine cumpără · 03 De
la cine · …"), the profiles' own bands, with the populations as a toggle.

### 18.13 The page (29 September 2026)

The owner made `propozitie` the analytics page and removed the other
versions; `/development/procurement/analytics` opens it. Removed with them,
the code only they used: `raspuns`'s readout, figures, ranked list, time
answer, facets band (and the facets read), years strip and gallery;
`curat`'s control row, head and figures; `bara`'s command bar and trends.
Kept, and used by the page: the query and its address
(`analytics.model.ts`, with its tests), the reads (`analytics.data.ts`), the
words (`analytics.text.ts`), the ready questions (in „Întrebări"), the
filter panel (`analytics.filters.tsx`), the answer's table, chart, years
and source line (`analytics.clean.tsx`), the head, the bar and the figures
band (`analytics.heads.tsx`). §18.2–18.10 record the versions tried and why
each went; §18.11–18.12 the page's head.

### 18.14 The records as the answer's first tab (29 September 2026)

The owner: simplify the band under the answer, and add „a first tab with
the items based on the active tab … if I search for laptop, I want to see
that entry in the table". The records block („Înregistrările", with its
„Vezi cele mai mari 25 din 22" button — wrong when fewer than 25) is gone;
the records are the group-by's first option (`dupa=inregistrari`), named
for what they are — „Achiziții", „Contracte", „Acorduri-cadru":

- **The table** (`RecordsTable`): the title (opening the record's page) with
  who bought from whom under it, the date, the value (bold when checked); 25
  at a time with the list's own count („26–50 din 351"); „Dată" and
  „Valoare" order it (frameworks by date only); an association's rows as
  one. On a phone, the title and the value (the date under the title). No
  measure toggle and no levels for it. The three cases the dev API cannot
  list (a firm's place, a procedure, a wide direct-purchase window) say so
  in its place.
- **A title's words open on their records**: `defaultGroupOf` answers a
  query with `titlu` with the records, and setting or clearing a title
  (`withTitle`) moves a group-by the reader did not choose with it — a
  chosen one stays. „laptop" opens on the laptops, largest first (the
  Autoritatea Rutieră Română's 245,000 lei on 7 September 2025).
- The band under the answer is the years strip alone, in the answer's band.

Checked on the dev API: „laptop" and one institution's records (351, two
pages), the national list (it answers within the 9-second deadline), the
order by date (27 May 2026 first), a tab away and back; the table fits a
390 px phone; unit tests cover the records' round trip and the title rule.

**A firm's place (1 October 2026).** The owner saw the count (384 contracts
of Sibiu's firms) over an empty list. The list's firm-place filters
(`supplierRegion`, `supplierCounty`, `supplierSiruta`) are served by the
search engine, which the dev API does not run: each fails with
BAD_GATEWAY, while the buyer's place answers. The analysis reads its own
fact rows, so the count stands.
- A firm has one place, its registered office: for 36 firms (Sibiu's and
  Cluj's top contractors, Sibiu's top direct suppliers) the count is the
  same with and without it. So a firm picked lists its records by the firm
  alone (11, 22 and 9 records, as their counts say). Until then the list's
  own advice, „Alege o firmă", led to the same refusal.
- A firm outside the place picked has a count of 0 and no records. The
  list waits for the count, known and not 0, before it asks or shows rows
  (the server's or the cache's included); a count that failed or
  abstained shows no list, so a firm's records elsewhere never pass for
  the place's (`firmPlaceGate`; Codex's review).
- The place alone is still refused, now with „Vezi firmele", the firms of
  that place, each a way to its records.
- The rest is the server's: the list's firm-place filters served without
  the search engine (from the analysis rows, as the amendments' buyer place
  already is), or the engine run; then the refusal goes and the list is
  the count's.

### 18.15 The years in a band of their own (29 September 2026)

The owner, on the years strip under the answer: polish it, „maybe add it in
its own section, add tooltip". The strip (`CleanYears`, 56 px of unlabelled
bars) is replaced by `YearsBand` (`analytics.years.tsx`), a band after the
answer's, before the source line:

- **Its head** on the grid: the span („2019–2026") as the kicker, „Pe ani",
  and the page's measure toggle (Număr / Lei; none for frameworks), which
  sets `masura` for the whole page.
- **A bar a year with its figure on it**, in one unit said once above
  („MLD. LEI, FĂRĂ TVA", „MII DE CONTRACTE ATRIBUITE"), so the bars read
  without pointing. The years the page's window covers are solid, the rest
  light. A year the data does not finish is dashed and says „până în mai"
  under its label. So is a year whose sources mix, e.g. contracts from 2026.
- **The tooltip**, on pointing or focus, gives the year's count, its lei
  („fără TVA" or „provizoriu"), the change on the year before (only for
  whole years of a population that compares), the kind-split note for mixed
  years, and what a click does („Clic: doar 2024", or „Anul ales"). It sits
  beside the column, at the top of the plot, and never covers its bar.
- **A click takes the year** as the page's period. On a touch screen the
  first tap shows the tooltip and the second takes the year.
- Not shown when the answer is itself by year.

The prototype's wrapper now clips its horizontal overflow (`overflow-x-clip`),
as the profile pages' wrappers do. The crux marks overhang the frame by
6 px, which scrolled a phone sideways.

Then (the owner): „When I click Număr / Lei it jumps to the top of the page."
The router resets the scroll on every navigation, and every change of
question is one. `useAnalyticsQuery`'s move now keeps the scroll
(`resetScroll: false`): the measure, a year, a tab, a filter or a drill all
change the answer in place.

### 18.16 Promoted to `/procurement/analytics` (29 September 2026)

The owner: „We have a good prototype … go ahead with the implementation."
The `propozitie` page is the real page at `/procurement/analytics`. The
prototype stays at `/development/procurement/analytics` as the record of the
design.

- **Where the code lives.** It follows the profile pages' split:
  - `lib/analytics-model.ts` (the query, its address), `analytics-text.ts`,
    `analytics-questions.ts`, `analytics-keys.ts` (query keys) and
    `analytics-legacy.ts` (the explorer's addresses);
  - `api/procurement-analytics-api.ts` (the reads, and the plan that names
    them) and `api/procurement-analytics-ssr.ts` (the server's reads);
  - `hooks/use-procurement-analytics.ts`;
  - `components/analytics/`: the page, head, answer, years, filters and
    controls, with the pure helpers in `analytics-view.ts`.
- **Read on the server.** The route's loader reads the cutoff, then the
  question's reads side by side: the figures, the concentration, the
  ranking, the series or the records' first page, the years, and the names.
  Each read has a 3-second deadline and is kept ten minutes per question.
  The reads seed the page's queries under the keys the browser plans
  (`planAnswer`), so the document carries the answer and the browser reads
  nothing more on load. A read past its deadline is left to the browser,
  and that render goes out `no-store`. A slow list is better read under the
  painted page than held against the whole document.
- **A clean address.** The router quotes a string that parses as JSON
  (`perioada=%222024%22`), so a digits-only value travels as a number:
  `perioada=2024`, `cumparator=4305857`. A CPV code with a leading zero stays
  a string, which is not JSON and so stays bare.
- **The site's own keys stay.** A change of question rewrites only the
  page's keys; `lang`, the currency and any other key ride along
  (`siteSearchOf`). Until 1 October 2026 it replaced the whole address: a
  reader on `?lang=en` without a saved language was switched to Romanian
  by the first filter (found by the ONG registry's review). The explorer's
  keys are dropped as well: a stray `page=2` kept beside the page's
  defaults would read as an explorer link and redirect (Codex's review).
- **The explorer's addresses** (`/procurement/search`, the old
  `/procurement/analytics`, `/procurement?view=…`, `/achizitii/cautare`)
  redirect with the same question in this page's words:
  - the grain and the record kind give the population (the explorer's
    default was the contracts);
  - the list gives the records, a ranking its axis;
  - it keeps the parties, the category at its level, the places, the
    period (a year, or two days' months), the title's words and the value
    range.
  - What the page has no filter for stays behind: the status, the value's
    quality, the source, the value basis, the map, the order and the page.
  - The redirect is permanent and carries the site's own keys (the
    language, the currency).
- **The links into it.** The profile pages, the front door (the shortcuts,
  the county map, the three ways in), the contract and direct-purchase pages'
  pair links, the category page, the procedure breadcrumb, the methodology
  page, the entity page and the authority slice now write this page's
  address. A profile's county row opens by firm, the institution's own
  default, not by records: a list cannot filter on the firm's place.
- **In both languages.** The page's 256 strings have English in `en` and
  their own words in `ro` (an empty `ro` renders the English).

The old explorer's components (the overview with the buyer map, the list,
the rankings) are unreachable now and still in the tree. Deleting them, and
the map with them, is the owner's call.

**Review** (Opus 5.5, xhigh), with its fixes:

- **The pair links.** The contract and direct-purchase pages said „Toate
  cele N dintre ele", but N counts every record kind and status, with no
  upper month. The list the link opens is one population, three statuses,
  and stops at the cutoff. The links now open the sheet's own population
  (awards, or frameworks) and say „Toate contractele / acordurile-cadru /
  achizițiile dintre ele", with no count.
- **A value the page cannot read is kept.** A link or a redirect used to
  drop such a value (a foreign fiscal code for a firm, a month before 2007),
  so the page answered wider in silence. `linkSearchOf` keeps it as it came,
  and the page's ⚠ says it could not use it.
- **Explorer detection.** One stray explorer key (`page=2`) on the page's
  own address rebuilt the question from the explorer's keys, with a 301. An
  address with any of the page's own keys is now answered as it is.
- **The legacy mapping.** `period=all` is every year. The legacy
  `county`/`region`, which the explorer read and ignored, stay behind.
  `vbasis=ceiling` is the framework agreements.
- **The server read.** It has one 3.5-second budget for all its reads,
  where it had a deadline per read, sequential stages that could reach about
  11 s, and a counties read with no deadline at all. The records' first page
  no longer decides whether a render may be kept: a wide list is often
  slower than the budget.
- **The year of the keys.** The server's year goes to the browser, so its
  keys hold around a new year.
- **Smaller fixes:**
  - the category page's „all records" link runs every year;
  - the procedure breadcrumb no longer links to a list that is gone;
  - the multi-year ready questions run to the current year's end;
  - the records' „Data" header uses the `day` context;
  - the share link no longer carries the prototype's parameters.
- **Left as is.** A seeded query counts as fresh when it mounts, even when
  Back returns to a server-rendered question later. The data changes daily
  at most, and the front door makes the same choice.
- **Not this change's.** Server rendering with the shared Lingui instance
  can mix languages under concurrent requests. `head` is protected; the
  body is not, on every page with a blocking loader.

**Second review** (Codex `gpt-6.1-sol`, xhigh, 30 September 2026). It found
no mismatch between the server's and the browser's keys across 178
questions, no redirect loop, and the cache headers right. It found eight
defects, fixed in a follow-up commit:

- **The CPV names.** The client's short list named division 80 security
  and 85 education; CPV has 80 education and 85 health and social work.
  The list is corrected; it serves the nine divisions it names, the API's
  names serve the rest, and every name is in the page's language (the
  divisions' read keeps both).
- **The explorer's defaults.** A link that named no period meant the
  previous calendar year (`resolveProcurementOverviewPeriod`), with
  `period=all` read first. A ranking without `rankBy` was by value, so it
  stays by value where the population has one.
- **A withheld count.** A count the API withholds (`recordCount: null`,
  abstained) is unknown, not zero: its figure is left out and the ⚠ marker
  says why.
- **The value field.** It shows a value the way it reads one, with a comma
  for decimals, so leaving it unchanged changes nothing.
- **A half-read range.** A range with one end the page cannot read
  (`1000..oops`) is reported, and the end it can read is kept.
- **The average.** The average is over the records that have a value.

### 18.17 The explorer deleted (30 September 2026)

The owner, asked whether to delete the old explorer now that nothing reached
it: „yes, delete".

- **What went.** The overview with the buyer map, the record list and the
  rankings, and their filter sheets, shell, tab bar, search dock, pagination,
  value-basis notices and territory drawer (41 modules, with their tests).
  So did what only they used:
  - the analysis and leaderboard reads;
  - the landing read and its mappers;
  - the explorer's hooks in `use-procurement-data.ts`;
  - its skeletons, labels and theme classes;
  - the URL cleaner, the value-basis plans and the territory scopes in
    `schemas/procurement-hub.ts`.

  The explorer's own tests went with its code. Where a removed test also
  covered live code, its cases moved to a live reader:
  - `mapLanding`'s cases (the awarded-value sum, null when either block
    abstains; names in ranking rows; the served ranking basis) now go
    through `mapAuthoritySlice`;
  - the batched party names through `fetchCpvCategoryPageLive`;
  - the money-order request through the institution slice;
  - the explorer parser's defaults, which the redirects read, have their
    own test.
- **What stays.**
  - The explorer's URL parser (`parseProcurementHubSearch`), which the
    redirects read old links with.
  - The shared pieces the category page, the entity page's authority slice,
    the detail pages and the company profile still use.
  - The record search (`useProcurementSearch`), the ranking cards and the
    monthly chart.
- **Found no longer anywhere.** The buyer map (the region, county and
  locality choropleth, with its territory drawer), the full-text search over
  every record field, and the status, value-quality, source and review-signal
  filters. The front door's county map (`HomeCountiesBand`) is a different
  map and stays.
- **Unlinked.** The value-model methodology page (`/achizitii/metodologie`)
  is still served, but no page links to it any more: its links were in the
  explorer's filter sheet, info sheet and value-basis notice. Its text
  describes the maps, the panel under them and the five value logics the
  explorer offered. Whether to link it from the analytics page's caveats,
  rewrite it, or retire it is open.
- **Reviewed** by Opus 5.5 (xhigh) and Codex `gpt-6.1-sol` (xhigh). Nothing
  live depended on what went. Their findings are fixed:
  - lost test coverage, moved to live readers as above;
  - the scope scrubber's type, which leaned on a removed builder and now
    has its own;
  - helpers kept alive only by their own tests: the explorer's
    state-to-query builders, the capability registry, the list-capability
    drops;
  - comments describing the removed views.
- **The catalogs.** The explorer's 296 strings are marked obsolete by
  `lingui extract`, as the project keeps obsolete entries. A
  `yarn i18n:clean` would drop them, along with the 762 already obsolete.

### 18.18 The filters sheet, regrouped (30 September 2026)

The owner asked for a Fable design session on the „Filtre" sheet: an
improvement, not a rewrite. It should be better grouped, simpler, and handle
region, county and UAT in one easy picker. Fable prototyped it at
`/development/procurement/analytics-filters-fable` (`actual` beside
`grupat`) over four rounds of the owner's feedback. Claude then took over,
fitted it to a phone and promoted it. Rationale, rejected options and every
decision: `src/development/prototypes/procurement/analytics-filters-fable/RATIONALE.md`.

- **Five groups instead of ten sections:** Înregistrări, Perioada, Cine
  cumpără (institution, its place), Cine vinde (firm, its place), Ce cumpără
  (category, procedure, title, value). Each row has a label and one control.
  A value that is set is a chip with its own ✕; the per-section „Șterge"
  links are gone, and the sheet's header counts the filters.
- **One place picker per party**
  (`components/analytics/analytics-place-field.tsx`, index in
  `lib/analytics-places.ts`).
  - One field searches the regions, the counties (by name or code) and the
    3,186 UATs. It matches with or without diacritics, and cedilla or comma
    forms alike.
  - Before a word is typed it browses: region → the region's counties → the
    county's ten largest localities.
  - The pick is its path, each name with its kind: „Reg. Centru › Jud. Sibiu
    › Municipiul Sibiu". A locality carries its official kind (Municipiul,
    Orașul, Comuna, Sectorul). București at the county level is „Municipiul
    București".
  - Lists under a level's head drop the prefix, because the head names the
    level.
  - A county's own code (the county council) is offered in no list; a link
    that carries it still reads as a chip.
- **Years and months.** The four recent years are shown, the rest behind
  „Arată mai multe"; a picked older year keeps them open. Months are picked
  from a Romanian month grid („iun. 2025") instead of the browser's own
  month input, which read in English. The grid opens on the picked month's
  year.
- **No small controls.** Everything is 44 px on a phone and 40 px from
  `sm`, including the sheet's close (a new `closeClassName` on
  `SheetContent`, its ring for the keyboard only).
- **The keyboard.** Every search is a combobox (`use-active-option.ts`):
  - the arrows walk the rows, the region and county grids included;
  - Enter picks the active row, or the first when none is active;
  - Space, Home and End stay the text's. The site's
    `useListKeyboardNavigation` takes Space as a pick, which would break
    „sector 3".
- **Loading, failed, empty in words.** Each list that waits on a read says
  so („Se caută…", „Se încarcă localitățile…"). A failure says so with
  „Încearcă din nou", and a search that finds nothing says „Nimic pentru …".
  A failed map file leaves the regions and counties working.
- **On a phone** a focused search moves to the top of the sheet, with room
  below it so its list sits above the keyboard. Measured before the fix: the
  firm's field could scroll only 207 px of the 535 it needed.
- **Reads.**
  - `useCpvSearch` now waits for the typing to pause (250 ms, as the site's
    search does), keeps its last answer while the next is read, and says
    when its answer is settled.
  - `useSearchResults` exposes `retry`.
  - `useLocalities` builds its map once per read of the files. It used to
    build it on every render, which gave the page's namer a new identity
    each time.
- **Unchanged:** the URL model and grouping after a pick (the owner kept
  the current behaviour). The map's 3 MB UAT file is still what names
  localities; a `referenceLocalities` read from the API would replace it
  (§18.6).
- **Reviewed** by Codex `gpt-6.1-sol` (xhigh; three defects) and Opus 5.5
  (xhigh; ten defects, no blockers). All are fixed:
  - **Categories.** The last term's categories could be picked for the
    new one: in the quick filter by cmdk's highlight, in the sheet by Enter.
    They now show only when settled; the sheet shows them dimmed and
    disabled while it reads.
  - **Institution and firm.** Each field asks for its own families (a
    buyer is an institution or a state company, a seller a firm). Stale
    results no longer read as „Nimic pentru …", and Enter never picks the
    last term's first hit.
  - **Focus.** A pick or a ✕ that removes the focused control no longer
    drops the focus to the top of the sheet: `Row` takes it to the row's
    chip or field. The phone lift and the place list's open state go with
    the field they belonged to.
  - **Enter on an empty place field** picked the first region; with
    nothing typed it now picks nothing.
  - **County codes.** A county's code typed whole („IS", „NT") answers
    first; matching inside a name needs three letters.
  - **Tab** no longer walks the options: the field is the way in.
  - **Escape** in an open search closes its list, not the sheet with what
    was typed.
  - **A picked older year** shows beside the recent ones, and the toggle
    works.
  - **Months.** They go back to SEAP's first, `2007-01`, the model's own
    bound.
  - **Without the API.** If its regions and counties fail, a search still
    finds localities and says the failure beside them.
  - **Screen readers.** Loading and „nothing found" are announced through
    an always-present live region, a failure as an alert. Options sit in
    named groups, and each month button names its month and year.
- **Verified** by both reviewers after the fixes; the loose ends they found
  are fixed too:
  - Escape in a place field closes its list and keeps the focus; the field
    reads as expanded whenever anything shows under it.
  - The highlight belongs to an option, not a position, so a late read
    shifting the list keeps it on the same place.
  - An institution or firm row from the previous term is dimmed and cannot
    be picked.
  - A search waits for the regions and counties before it says „Nimic
    pentru …".
  - The value pair's hidden submit is out of the Tab order.
- **Shared with the NGO registry** (1 October 2026). The parts that are
  not procurement's are in `src/components/filters/filter-sheet/`, so the
  NGO registry's panel imports them instead of keeping a copy:
  `filter-sheet-parts.tsx` (Group, Row, Chip, Options, OptionGroup,
  Notice, Announce, the control classes, the close's `SHEET_CLOSE`),
  `use-active-option.ts` and `filter-sheet-focus.ts` (`afterFocusMoves`,
  `keepEscapeForOpenList`). The place index stays procurement's.
- **Found later by the ONG registry's review** (1 October 2026), on the
  same parts:
  - A blur that removed nodes lost the focus. The place's list closing,
    and a title or value becoming its chip, happened before the focus
    landed. Radix's focus scope then took the focus to the sheet, which
    cancelled a Tab or a tap on the next field. What the screen swaps now
    waits until the focus has landed (`afterFocusMoves`); the change to
    the question does not. Codex's review of the fix: a title or value
    applied later overwrote a tap made in between (on a phone the tap's
    click comes before the timer), restoring cleared filters. It is
    applied at once, and only its chip waits.
  - A list long enough to scroll was its own Tab stop in Chrome, unnamed,
    and Escape there closed the sheet. Its box is now out of the Tab
    order.
- **Fields named by their row** (the owner, 1 October 2026). A field's
  name starts with the label beside it, as voice control reads it:
  „Instituția", „Firma", „Locul instituției", „Locul firmei",
  „Categoria", „Valoarea de la, lei" (in English „Institution",
  „Location of the firm", „Value from, lei"…). They were „Caută o
  instituție" and the like, which a reader saying the label could not
  reach.
- **Reviewed again** (1 October 2026) by Opus 5.5 and Codex
  `gpt-6.1-sol` (xhigh), over the focus, `?lang=`, firm-place, shared
  parts and names commits. Besides the three Codex fixes recorded above
  (§18.14, §18.16 and the focus bullet):
  - On a phone, a tap from an open place list to the next search left
    that search off the top of the sheet by the list's height: the lift
    scrolled before the list closed. The list now closes at once once the
    focus has landed, and the lift scrolls after it (0 px, measured).
  - „Vezi firmele" removed itself with the focus on it; the focus goes to
    the „Firmă" tab.
  - The server no longer reads a firm-in-place list it would not show.
  - Integration tests: a title typed, then a click elsewhere (neither
    undoes the other); a phone tap from an open place list.
  - Left: `Row`'s label is a plain span, so each field repeats it in its
    own name; a label id from `Row` would make that hold by construction.

## 19. The category page folded into the analytics page (1 October 2026)

The owner asked whether the old CPV category page
(`/procurement/categories/$code`) should become part of the analytics page.
It did: the page and its route are gone, its addresses redirect.

**What the old page had** (last reworked in August): the category's name
(an 8-digit code showed its division's), four all-time tiles (direct
purchases, contracts, procedures, and one lei total that added contract
money to direct-purchase money), a toggle between the two, a monthly chart,
the top 10 institutions and firms by count, „related categories" (the
divisions sharing the first digit: 45 listed 41–44 and 48, not related),
and a link to the analytics page for the records. Divisions and 8-digit
codes only.

**What a category is worth to a reader, and where the analytics page
answers it:**

| The question | The analytics page with `?cpv=…` |
|---|---|
| How much, and is it growing? | The figures against the period before; the years band |
| Who sells it — is the market held by a few? | „Firmă", and the top-5 share among the figures |
| Who buys it, and where? | „Instituție", „Unde cumpără" (per resident by county) |
| How is it bought? | „Procedură" (contracts); the population tabs |
| What is inside it? | „Categorie", one level down, at every CPV level |
| The largest records | The records tab, each opening its page |

Only the procedures' count is not carried over (procedures are their own
page, still to migrate).

**Decided with the owner:**

- **Folded in.** `/procurement/categories/$code` and `/achizitii/cpv/$code`
  redirect (301) to `/procurement/analytics?cpv=$code`, the site's keys
  (`lang`) kept and the explorer's dropped (`categoryRedirectSearch`); a
  code that is no CPV code is a 404. The entity page's category bars
  (`procurement-authority-slice`) open the analytics page for that
  institution and division, in the slice's population and months.
- **A category opens on what is inside it**, as before: a division or a
  group on the next level, a code on its firms. Picking a category, a step
  of its path, or its ✕ takes a grouping the reader did not choose with
  it (`withCategory`, as a title's does); one the reader chose stays.
- **Search engines.** A category alone (any population, every other key
  the page's default) is a landing: its own title („Produse farmaceutice
  (CPV 336): achiziții directe — Transparenta.eu"), description and
  canonical address (`?cpv=336`, `?tip=contracte&cpv=336`), named by the
  division's short name or the API's (`analytics-head.ts`). The bare page
  stays as it was. Any other question is a reader's own: `noindex,
  follow`, and no canonical link — with noindex, a canonical pointing
  elsewhere would contradict it. In the browser the tab says the question
  (its headline).
- **The populations' counts** on their tabs: each the figures read its
  tab opens on, for the question's filters (`usePopulationCounts`; the
  server reads them too), so a click on a tab is answered at once. This
  is what the old tiles gave, without adding two kinds of money.
- **The category's path** over the headline: „CPV 33 › 336 › 33600000",
  each parent a step back up, its name for a screen reader and on hover;
  codes, not names, so it fits a phone (each step 44 px tall there).
- **Reader categories** wait for the API's set filters (§18.6, item 1).

**Measured on the dev server:** the redirects answer 301 (`abc` 404); a
landing's head has its title, description and canonical, a combination
`noindex`; the tabs read 13.446 · 1.889 · 6.145 for `33600000`; a step up
from `33600000` to `33` opens on its groups. On a phone the tab bar grows
to 70 px: the names already take two lines, the count a third.

**Reviewed** by Opus 5.5 and Codex `gpt-6.1-sol` (xhigh); no blockers.
Fixed:

- **A landing's name, whatever address came first.** The server keeps one
  read per question, and a landing's address shares it with addresses that
  are not landings (`?cpv=X&dupa=<its default>`); read first, they left the
  landing unnamed for ten minutes. The name now comes from the category
  filter itself.
- **No soft 404s.** A well-formed code that names no category (`99`,
  `39210000`) is no landing: `noindex`, no canonical. `/achizitii/cpv/$code`
  checks the code as `/procurement/categories/$code` does; both accept an
  8-digit code's check digit (`45000000-7`) and drop it (`cpvCodeParam`).
- **A page key the router parsed as something else** (`cpv=true`, a
  repeated `cpv`) stays as text, for the page to say it could not read it,
  instead of vanishing into a bare page or a landing the index would take.
- **The browser tab's title** is the page's own on the bare page, and is
  put back after a client navigation that set the head's title again with
  the same text (`useClientDocumentTitle` checks after every render).
- **The counts keep the page's trust rules.** A population that would drop
  one of the question's filters (a procedure on direct purchases) shows no
  count: it would answer a wider question under this one's headline. Where
  a population's months run past the record kinds' split, its count is
  marked „*" with its own page's warning (for a screen reader too), and
  every count names its months on hover — each population counts its own.
  What was read stands though a later read failed. The slot keeps one
  height, so the bar does not move. Below 768 px the count sits under the
  name: beside it, three counts overflowed a 640 px screen.
- **The server's reads.** The names start once the answer is in, the other
  populations' counts going on beside them (a slow count must not spend
  the names' budget); a failed count makes the render partial, not kept.
- **The path** is named by the page's own read (`nameKeys` takes the
  category's steps, so the server reads them too); its steps are 24 px from
  a small screen up, and the current step's name is said to a screen
  reader.
- `og:url` is left out where the page is not indexed; the supplier slice's
  buyer names are tested again through the identity spine.

Left as they are: an 8-digit generic code and its group share the API's
name („Produse farmaceutice" for `336` and `33600000`); some divisions'
short labels, now in titles, are narrower than the division (90,
„Servicii de curățenie"); with an institution picked a category stays on
firms while a click on a category row goes one level down.


## 20. The parties beside the facts (1 October 2026)

The owner asked for the buyer and the supplier as one more column to the
right of the record's facts, on the direct-purchase and contract pages
(framework agreements use the contract page). `RecordParties`
(`components/direct-purchase/record-parties.tsx`) shows „Cumpărătorul" and
„Furnizorul", each a link to its procurement page (in the record's year,
as the head's sentence links them) with its CUI under its name, or „fără
CUI în SEAP"; a contract's firm says when it shares the record („în
asociere cu încă 2 firme", „în acordul-cadru cu încă …") and when it is an
IMM.

- The value-and-facts box now spans the frame, as the context band below
  it does; the reading under it (the lines, the steps, the history, the
  source) keeps its 4xl width.
- From `lg`: the direct purchase reads value · facts · parties; the
  contract keeps its value over its facts on the left, the parties in a
  column on the right, each behind a rule. Below `lg` the parties sit
  under the facts, side by side from `sm`, one under the other on a
  phone.
- The procedure page still has the old shared layout (to migrate).
- 2 October: on the contract page (and the procedure prototype) the
  parties sit on the facts' rows from `lg`, at the owner's ask: the buyer
  level with the first row of facts and as tall as it, the firm from the
  second row on. The facts and the parties are subgrids of one grid with a
  row per row of facts (two at least); the parties keep the facts' rule
  and space above them with the rule unseen, so the two first rows start
  level. The direct purchase, whose value and facts share one row, keeps
  its centred column.

## 21. The answer bar's controls (1 October 2026)

The owner found the level buttons under the analytics page's tabs („pe
județe · localități · regiuni", „pe diviziuni · grupe · …") too small, as
the filters' had been. They are now the bar's own segmented control, the
one the measure uses (`IndicatorToggle`: a radio group, one tab stop, the
arrows move it), both 44 px on a phone and 40 px from `sm`
(`CONTROL_HEIGHT`).

- The levels run coarse to fine, places as categories do: regiuni, județe,
  localități; the place tabs still open on județe (`opens`).
- Only the levels the question can be grouped by are offered (a county
  picked has no counties to rank), and the row goes when one is left.
- On a phone five CPV levels sit three to a row, the last taking the
  second row's rest.
- The control has no visible „pe" before it, so it starts where the tabs
  do and where the measure does when it wraps under them (the owner's ask);
  its name, „Nivelul", is for a screen reader. The measure stays right of
  the tabs while they fit on one line.

## 22. The procedure page (prototyped 2 October 2026)

`/procurement/procedures/$id` is the last record page on the old shared
layout (`ProcurementDetailRoutePage`). Prototype:
`/development/procurement/procedure` (`?v=fisa|concurenta|azi`,
`&c=<record>`), on ten real notices read from the dev API and from
e-licitatie's public api on 2 October 2026; the production database was not
read.

### 22.1 What a procedure's data can say

- **A row is one notice, not a procedure.** `procurement.procedures` holds
  e-licitatie award notices (CAN…, SCNA…: `source_system = elicitatie`) and
  rows of SEAP's notice exports on data.gov.ro (calls for competition CN…,
  SCN…, and the legacy numeric notices). A tender's call and its award are
  two unlinked rows: ANIF's call CN1044934 (412114) and its award CAN1096494
  (355515). The award notice names its call
  (`publicationDetailsModel.noticeNo`), so the link exists at the source.
- **The award notice's own estimate repeats the award** (CNIR: 6.14 bn on
  both). The institution's estimate is the call's (7.58 bn), the lots', or
  each contract's (`GetContractView.estimatedContractValue`). Compared only
  over the lots awarded.
- **Served today:** the notice's row and at most 50 contract rows, no total,
  one firm per row; a TED number. e-licitatie rows carry no publication or
  state date. That is the `azi` variant.
- **Stored but not served:** the lots, the criteria and the offer spread
  (`procedure_lots`, `procedure_award_criteria`, `lowest/highest_offer`).
  **Not scraped:** the offers each lot received (admitted, unacceptable,
  non-compliant, withdrawn; from SMEs, from abroad), every winner of a
  contract, every published version of the notice. The `fisa` and
  `concurenta` variants read them from the notice (`procedure.fixtures.ts`).
- **An award notice can report frameworks and call-offs together.**
  Spitalul Caracal's CAN1150526: 44 lots (7 cancelled), 37 frameworks with
  three firms each, and „contracte subsecvente" that span several lots.
  Added to the frameworks they inflate a lot (lot 5: 2,486 lei → 103,851).
  The frameworks make the value; the call-offs are listed apart, as what was
  bought under them.
- **Legacy rows join another institution's contracts.** Nuclearelectrica's
  2009 call no. 92137 carries Municipiul București's 37.8 M lei building job
  and a Ploiești school's purchase: SEAP matched them by the bare notice
  number. Never the procedure's: set apart, said, counted nowhere.
- **A negotiation without a call says why** (annex D). Sibiu's street
  cleaning (CAN1165498, 46.1 M lei, one offer) cites its contested open
  tender CN1089166 (92.4 M, suspended); the two are tied only by that text.
- **Late or republished award notices are visible.** ANIF's: the contracts
  in December 2022 and January 2023, the notice on 22 January 2023, then
  republished five times through March 2026.

### 22.2 What the API should change (for the server session)

1. **One procedure:** the call and its award tied by the award notice's
   call number (and the same institution); either row answers the whole.
2. **Lots** with their estimate, status, criteria and weights, duration;
   **offers per lot** (received, admitted, unacceptable, non-compliant,
   withdrawn, SMEs, other EU, non-EU) from `GetContractView`.
3. **Contracts from the notice:** all winners, the framework / call-off
   kind, uncapped with a total; never a row of another institution (§17.2
   item 3).
4. **Dates:** the call's publication, the award notice's first and last
   publication (`GetAllVersions`).
5. **Annex D** for negotiations without a call; the VAT basis.
6. **A framework notice's value is its call-offs'.** The award notice's
   `awardedValueRon` (e-licitatie's II.1.7 „valoarea totală") is the
   call-offs awarded under the frameworks so far — Caracal's 557,085.90 lei
   against frameworks of at most 4,680,134.40; five more notices alike
   (CAN1167301, CAN1163132, CAN1163668, CAN1167549, CAN1155234). The
   ceiling is `frameworkContractValue`, not projected. Every reading of the
   procedure grain's money (the analysis's sums included) takes the
   call-offs for the award; serve both, named apart.
7. **E-licitatie award notices whose state reads „in evaluation"**
   (1,378 on the dev API): the state is an award notice's, so the
   procedure is awarded; the mapping of e-licitatie's state 2 („Publicat")
   wants checking. And many recent award notices carry no linked contract
   yet, and 0.00 where they have no value.
8. **Day and month swapped on contract rows.** Spitalul Caracal's rows
   (`seap_contracts`) date frameworks 364.9 and 364.37 on 2025-01-07, the
   notice on 2025-07-01; call-offs 386 and 604 on 2025-10-07 and 2025-12-11,
   the notice on 2025-07-10 and 2025-11-12. The same rows file the two
   call-offs as `framework_agreement`. How far it reaches is not measured.

### 22.3 The variants

- **`fisa` — the record sheet** (§17's): head; the value against the
  estimate with the facts and the buyer and winners beside them; the lots;
  how the offers were scored (when price is not all); the calendar from the
  call to the award notice; the contracts; the call-offs; the rows linked by
  mistake; the source.
- **`concurenta` — the competition first:** four figures (offers, lots
  awarded, lots with one offer, gap to the estimate), then each lot with a
  mark per offer (filled admitted, faded rejected, hollow withdrawn) and its
  value against its estimate on one bar; the sheet after.
- **`azi`:** the sheet on what the API answers now — no lots, offers,
  criteria, call or dates; a row per firm gathered by contract number.

**The owner's pick (2 October): `fisa`.** `concurenta` and `azi` are
deleted; the model keeps its `today` read (tested), which the promoted page
needs until the API serves the notice. In the calendar a step's value sits
under its title, not across the page at the right where the eye loses it,
and the last contract's says it is the procedure's total („63.233.506,18
lei pe 3 contracte"; a framework's „cel mult …, pe 37 de acorduri-cadru").

The records: ANIF's three lots (and the same procedure opened on its call),
Sibiu's negotiation and its suspended call, CNIR's 6.1 bn association with
one offer, CNAIR's Pașcani–Suceava (three offers, two unacceptable, −29%),
Spitalul Caracal's 44-lot framework, Sibiu's Turnul Sfatului, Universitatea
de Vest's cancelled call, Nuclearelectrica's 2009 call.

Open for the owner: whether a call's row should redirect to its award's
page once the two are tied.

### 22.4 Promoted (2 October 2026)

The page is live at `/procurement/procedures/$id` on the record sheet
(`components/procedure/`, `lib/procedure-model.ts`); the old shared detail
layout and its read are deleted (`ProcurementDetailRoutePage`,
`ProcurementDetailPage` and its sections, `detail-config`, the record-detail
fetchers, loader, schema and query). The prototype renders the page's own
components on its fixtures, with the notice's data the API does not serve
yet.

On today's API (§22.1) the page reads the notice's row, its contract rows
and TED notice, and the names; the parts the notice alone has (lots,
offers, criteria, the call, the versions) appear when the API serves them
(§22.2). What it says there:

- An award notice: the institution, the firms (an association's rows are
  one contract; several firms at one value are said to be in association),
  the day or span, the notice's value. An award notice with no contract
  linked says so; a cancelled or suspended one says that, its zeros no
  value.
- A framework notice: the frameworks and firms, and the call-offs the
  notice reports, as such — never as the frameworks' ceiling (§22.2 item 6).
  Recognised by its rows or, with none, by its title („Acord-cadru …", not
  a call-off naming its framework).
- A full page of rows (50, no total): „cel puțin" for the contracts and the
  firms, and no span — the days are a part's.
- A call: its day, its estimate, its state; contracts of other institutions
  joined by its number are set apart and counted nowhere.
- An award notice is a row of an award kind or an award number (CAN…,
  SCNA…); any other — a call, a dynamic purchasing system's invitation
  (`sad`), a legacy notice — tells what was asked.
- A row is another institution's only when the two certainly differ: both
  CUIs known and different, or, a CUI missing, both names known and
  different (3,534 e-licitatie and 9,963 export notices have no CUI).
- The notice's value goes with its contracts („pentru X", „X pe 3
  contracte") only when their values add up to it, within a percent;
  otherwise the head says it apart („Anunțul de atribuire raportează o
  valoare de …") and the box says the contracts do not add up to it. A
  cancelled or suspended notice's figure is „Valoarea din anunț", and the
  head says its state.
- An untitled notice is named by its number („Anunțul 92137"), never by
  the page's id; an id that is not a number is a 404.
- A row that names no institution at all is the notice's under an
  e-licitatie award number (unique), and set apart, unverified, under any
  other: the box then reads „Contracte legate de acest anunț doar după
  număr", the row „instituție nepublicată în SEAP".
- „Adds up" allows the rows' rounding to whole lei (a leu a contract), no
  more; an accepted row's value is the value engine's resolved amount when
  it has one. Several firms on one contract are said to be in association
  only when every row of it shows one value, and never on a framework. A
  firm met with and without its CUI is one firm. No signing span when a
  contract has no day.
- Known limit: call-offs the API files as frameworks (§22.2 item 8) are
  listed with the frameworks — nothing on the rows tells them apart today.

The server read is kept ten minutes (a thousand notices at most) under a
6-second deadline; a read with failed names is served `no-store`. The head
names the page by its title and institution (an untitled notice by its
number) and describes a call and an award apart.

