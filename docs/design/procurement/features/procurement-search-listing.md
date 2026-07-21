# Feature: Procurement search & listing (`/achizitii/cautare`)

> **2026-07 update:** List layout lives on the unified hub at
> `/procurement?view=list` (shared URL schema + filter sheet). Legacy
> `/procurement/search` and `/achizitii/cautare` redirect there. See
> [`docs/specs/procurement-shared-hub-scope-requirements.md`](../../../specs/procurement-shared-hub-scope-requirements.md).
>
> MVP-2. The general-purpose entry point that every other procurement surface links
> into. Grain selector + capability-gated filter rail + result cards + coverage
> banner + CSV export.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (TanStack Router search
params + Zod validation + `@tanstack/react-virtual` + shadcn filters). Reuses the
PNRR filter/table/export patterns. Depends on `coverage-data-as-of-layer.md`.

## Summary

A native procurement search over four grains (proceduri, contracte, achiziții
directe, modificări), with free-text search, deterministic capability-allowed
filters, paginated result cards, a coverage banner for the current filter set, and
CSV export. It turns the unsearchable SEAP corpus into a guided, honest listing.

## Facts / Decisions / Assumptions

- **Fact:** Four grains with distinct fields/lifecycles (UX §5.1, §9.2):
  `procedures` (621k), `contracts` (1.9M), `direct_acquisitions` (19M),
  `contract_modifications` (~43k). UI must offer a **grain selector**.
- **Fact:** Allowed filter dimensions per `public_contracts_filter_capabilities_v1`:
  `source_grain`, `authority_cui`, `supplier_cui`, `cpv_code`, `cpv_division_code`,
  `flow_date`, `flow_year`, `authority_county_code`, `authority_region` (UX §11.2).
- **Fact:** Blocked dimensions: `supplier_region_filter`, `llm_generated_filter`
  (UX §11.4). These must not appear as authoritative facets.
- **Fact:** Existing in-repo precedent for filtered listing + CSV export is the PNRR
  feature (`PnrrFilterSheet`, `PnrrProjectTable`, `PnrrExportButton` with UTF-8 BOM).
- **Decision:** Grain selector is a segmented control (`ToggleGroup`) bound to the
  `grain` param. Filter rail shows only the filters valid for the selected grain;
  status vocabulary changes per grain.
- **Decision:** Default landing (no params) shows the **most recent canonical
  records** for the default grain (`direct_acquisitions`? — see Assumption) with the
  coverage banner, not an empty prompt.
- **Decision:** Full-text title search is **discovery only** (not an authoritative
  filter); deterministic filters drive the authoritative result. Free-text and
  deterministic filters combine, but the UI labels free-text as "căutare după text".
- **Assumption:** Default grain is `contracts` (richest party+value+CPV coverage and
  most investigative value). If contracts coverage is weak at launch, default to
  `direct_acquisitions`. Implementer confirms against the gate; either is a defensible
  default and both must render.
- **Assumption:** Page size default 25; server-side pagination (19M rows forbid
  client-side). Cursor or offset per server contract.

## Route and URL state

- **Route file:** `src/routes/achizitii.cautare.tsx` (+ `.lazy.tsx`), `validateSearch`
  with a new `src/schemas/procurement-search.ts` Zod schema.
- **Search params (shared names per README where applicable):**
  - `grain`: `'procedures' | 'contracts' | 'direct_acquisitions' | 'modifications'`.
  - `q`: free-text (title / notice_no / contract_no / unique_code / CPV).
  - `authority_cui`, `supplier_cui`: string.
  - `cpv`: CPV code; `cpv_division`: 2-digit division code.
  - `source`: `'elicitatie' | 'seap'` (later `'ted'`).
  - `status`: per-grain status value(s) (comma-separated, per local parser rule).
  - `county`, `region`: buyer territory (only when `buyer_region_filter` allowed).
  - `year`: number; `dateFrom`, `dateTo`: ISO (applied to the grain-appropriate date).
  - `valueMin`, `valueMax`: RON range (with "monedă nativă afișată când RON lipsește").
  - `signal`: `'same_day' | 'repeated_pair' | 'modification_inflation' | 'young_supplier'`
    — toggleable pre-filtered review-signal views (each a `ReviewSignalBadge` mode).
  - `sort`: `'date_desc' | 'date_asc' | 'value_desc' | 'value_asc'` (value sorts only
    where `spend_ranked_top_n` allowed).
  - `page`, `pageSize`.
- **Decision:** Multi-value filters comma-separated, parsed by the local schema
  (follow entity/company route conventions). Default view renders with no params.
  Invalid params normalized by `validateSearch`.
- **Decision (2026-07):** Search is the **authority×supplier pair drill target**
  for scoped ranking cards: deep links arrive with both CUIs, matching `grain`,
  and `sort=value_desc`. Do not invent a parallel pair-list surface while this
  path works. Spec:
  [`procurement-ranking-cards-requirements.md`](../../../specs/procurement-ranking-cards-requirements.md)
  § Authority × supplier drill-down.

## Data contract and mock states

Adapter: `src/features/procurement/api/procurement-search-api.{ts,mock,live}.ts`.

```ts
type ProcurementSearchRequest = ProcurementSearchParams  // = parsed URL state
type ProcurementSearchResult = {
  readonly grain: ProcurementGrain
  readonly records: ProcurementRecordSummary[]   // grain-typed union, summary fields
  readonly page: { readonly page: number; readonly pageSize: number;
    readonly total: number | null /* null = unknown/too-large; show "1000+" */ }
  readonly gate: CapabilityGate                  // coverage + allowed/blocked for grain
  readonly appliedFilters: AppliedFilter[]       // for active-filters bar + provenance
}
```

Mock states:

- **Results present** (each grain) — exercises per-grain card fields.
- **No results** — `EmptyState` with "Ajustează filtrele" + clear-all.
- **Coverage-gated value sort** — `spend_ranked_top_n` not allowed → value sort
  options disabled with a tooltip reason; results still sortable by date.
- **Blocked region filter** — region/county facet hidden, with an info note routing
  the user to buyer-region only.
- **Mixed currency in list** — rows with null RON show native value+currency badge.
- **Unknown status present** — `unknown` rendered as "Nedeterminat" with tooltip.
- **Missing date (procedures)** — rows with null `publication_date` show "dată
  indisponibilă"; date sort pushes them to a labeled group.
- **Stale/suspended sync** — coverage banner shows "data as of" + suspended cadence.

## UI structure

- **Header band:** page title "Caută în achiziții publice", `GrainSelector`
  (segmented), and a prominent search input (`debounced-status-input` style).
- **Coverage banner:** `CoverageRibbon` for the current grain + filter set (mirrors
  `PnrrDataQualityBanner` collapsible pattern) — counts, coverage rates, "data as
  of", blocked-filter note.
- **Layout:** sticky filter rail left at `lg+` (persistent), `Sheet` drawer below
  `lg` (mirror `PnrrFilterSheet`); results right.
- **Filter rail** (only grain-valid + capability-allowed facets):
  - Authority (CUI/name autocomplete), Supplier (CUI/name autocomplete).
  - CPV division (`MultiSelect`, `CpvLabel`) + CPV code (when allowed).
  - Source system, Status (per-grain vocabulary).
  - Time: year + date range (`amount-range-picker` analog for dates, or date inputs).
  - Buyer county/region (only when allowed; with coverage note).
  - Value range (RON; with native-currency note).
  - Review-signal toggles (`signal`) — `ReviewSignalBadge` styled, neutral.
- **Active filters bar:** `active-filters-bar` + `filter-tag` chips; "Șterge tot".
- **Results toolbar:** result count (or "1000+"), `sort` select (value sorts gated),
  `ShareFilteredView` (copy current view), `ExportButton` (CSV + BOM, current filter
  set; cap + disclosed if export is limited).
- **Results list:** virtualized `ProcurementRecordCard` list (cards on mobile, dense
  rows at `md+`). Each card: authority (→ `/entities/$cui`), supplier (→
  `/companies/$cui`), `ValueWithCurrency`, date, `CpvLabel`, `StatusBadge`,
  source-system `Badge`, `EvidenceLink` to e-licitatie, link to the detail page.
- **Pagination:** `Pagination` component; server-side.

## Component reuse and proposed new components

- Reuse: `ToggleGroup`, `MultiSelect`/`styled-multi-select`, `Select`, `Input`,
  `debounced-status-input`, `amount-range-picker`, `active-filters-bar`,
  `filter-tag`, `Sheet`, `Pagination`, `EmptyState`, `Skeleton`,
  `@tanstack/react-virtual`; PNRR `ExportButton`/`FilterSheet` patterns.
- Shared: `CoverageRibbon`, `DataStatusBadge`, `EvidenceLink`,
  `SourceProvenanceDrawer`, `ReviewSignalBadge`, `ShareFilteredView`,
  `RequestDatasetAction` (for blocked facet notes).
- New: `GrainSelector`, `ProcurementRecordCard`, `ValueWithCurrency`, `CpvLabel`,
  `StatusBadge` (shared with the slice features).

## Interactions

- Grain switch resets grain-invalid filters (keep authority/supplier/CPV/time/value
  which are common; drop grain-specific status), refetches.
- Each filter change updates URL + refetches (TanStack Query keyed on the full param
  set). Debounce free-text (~300ms).
- Disabled value-sort / hidden region facet show a tooltip/inline reason from the
  gate.
- `signal` toggle switches to the pre-filtered review-signal view and surfaces the
  neutral caption.
- Export downloads current filtered set as CSV (UTF-8 + BOM, filename
  `achizitii-<grain>-<dataAsOf>.csv`); if the server caps rows, show the cap.

## Loading, empty, error, partial, stale states

- **Loading:** skeleton rows matching card layout; filter rail visible, controls
  disabled.
- **Empty:** `EmptyState` "Niciun rezultat" + clear-all + suggestion.
- **Error:** inline retry panel (`handleError(e, 'procurement-search')`); keep URL
  intact.
- **Partial:** coverage banner expanded; value sort gated; partial badges on counts.
- **Stale:** banner shows suspended-sync note + "data as of".

## Accessibility and i18n

- Grain selector = labelled radio/segmented group; filter rail controls labelled;
  `Sheet` manages focus.
- Results are a semantic list/table; sortable columns expose sort state to AT.
- Charts not used here; counts are textual.
- All strings Lingui-wrapped; RO labels: "Proceduri", "Contracte", "Achiziții
  directe", "Modificări", "Autoritate", "Furnizor", "Categorie (CPV)", "Sursă",
  "Stadiu", "Valoare", "Semnale de verificare". Acronyms (CPV, SEAP, DA) expanded
  on first use/tooltip. Locale-aware money/date.

## Privacy, provenance, source citation

- No contact PII. Each result links to e-licitatie source + provenance drawer.
- Blocked facets carry an honest reason; `RequestDatasetAction` where applicable.
- Free-text/LLM never presented as an authoritative filter — labeled "căutare după
  text (descoperire)".
- Identity confidence shown on party links when CUI match is partial.

## Acceptance checklist

- [ ] Grain selector switches grain + adapts filters/status/cards.
- [ ] Only capability-allowed filters shown as authoritative; blocked facets hidden
      with reason.
- [ ] Value sort gated by `spend_ranked_top_n`; date sort always available; missing
      dates grouped honestly.
- [ ] Result cards show party links, value+currency, CPV, status (incl. `unknown`),
      source badge, e-licitatie link, detail link.
- [ ] Coverage banner reflects current grain + filter set + "data as of".
- [ ] CSV export (BOM) of current filter set; cap disclosed if any.
- [ ] All mock states render; virtualized list performs with large pages.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No supplier-region/LLM filters (blocked v1).
- No mixed-currency totals in the toolbar.
- No saved searches/alerts (separate feature).
- No client-side full-corpus load (server pagination only).

## Open questions (blockers only)

None. Default grain choice is a documented Assumption to confirm against the live
gate; both candidate defaults must render, so it does not block implementation.
