# Feature: Authority procurement slice (`/entities/$cui?view=achizitii`)

> MVP-1. Replaces the SICAP.ai iframe (`ContractsView`) with a native, coverage-aware
> procurement slice on the public-entity page. Highest-leverage feature.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (React 19 + TanStack
Router + shadcn + Recharts + Lingui). Familiar with `src/components/entities`
view system and `entitySearchSchema`. Depends on `coverage-data-as-of-layer.md`
shipping its shared components first.

## Summary

A "Achiziții publice" view on the authority's entity page answering the single most
common question — *"Ce cumpără instituția X și de la cine?"* — with headline spend,
top suppliers, a CPV category breakdown, recent records, a coverage/freshness strip,
and a neutral review-signal teaser. Reads pre-gated monthly rollups keyed on the
authority CUI from the route.

## Facts / Decisions / Assumptions

- **Fact:** Today `/entities/$cui` `view=contracts` renders `ContractsView`, an
  external SICAP.ai iframe (`src/components/entities/views/ContractsView.tsx`). This
  feature replaces it.
- **Fact:** Entity views are URL-driven by `entitySearchSchema.view`
  (`src/components/entities/validation.ts`), values today: `main-info`, `contracts`,
  `commitments`, `ins`, `profile`; legacy values normalize to `main-info`.
- **Fact:** Data comes from `org_edge_monthly_rollups` (authority×supplier),
  `authority_cpv_division_monthly_rollups` (authority×CPV-division),
  `procurement_flow_facts_v1` (records), `same_day_direct_acquisition_candidates`
  (signal), gated by `aggregate_quality_by_grain` /
  `public_contracts_filter_capabilities_v1` (UX §5, §13 MVP-1).
- **Decision:** Add `achizitii` to `entitySearchSchema.view`; keep `contracts` as a
  legacy alias normalized to `achizitii` (so old links + SICAP-era bookmarks keep
  working). Tab label: "Achiziții publice".
- **Decision:** The slice shows aggregates from rollups only; it never live-scans
  the 19M DA fact table. Record-level drill-through links to `/achizitii/cautare`
  pre-filtered by `authority_cui`.
- **Decision (2026-07):** Top-supplier ranking rows on this slice open
  `/procurement/search` with **both** `authority_cui` and `supplier_cui`, the
  current analysis grain, and `sort=value_desc` — so users can inspect the pair’s
  records by value (not only the supplier profile). See
  [`procurement-ranking-cards-requirements.md`](../../../specs/procurement-ranking-cards-requirements.md)
  § Authority × supplier drill-down.
- **Decision:** Authority is the buyer; this slice is the buyer view. Supplier view
  is the mirror on `/companies/$cui` (`supplier-procurement-slice.md`).
- **Assumption:** The authority CUI is already available on the entity page context
  (`EntityDetailsData.cui`); the slice reuses it, no extra identity lookup.
- **Assumption:** A "spend last 12 months" window is the default KPI horizon; the
  user can switch to a year via the `year` param (already in `entitySearchSchema`).

## Route and URL state

- **Route:** existing `/entities/$cui` (no new route file).
- **Activation:** `?view=achizitii`. Legacy `?view=contracts` → normalized to
  `achizitii` in `validation.ts` (extend the existing normalization note).
- **Reused params:** `year` (KPI/chart horizon), `period` (YEAR default),
  `currency` (display only; RON canonical — see currency rule), `lang`.
- **New slice-local params (add to `entitySearchSchema`, all optional):**
  - `acqGrain`: `'contracts' | 'direct_acquisitions' | 'all'` — which grain the
    KPIs/recent list emphasize (default `all`).
  - `acqCategory`: CPV division code — drills the supplier/recent panels into one
    category (optional).
- **Decision:** Default render must work with no slice params (shared README).
  Invalid values normalized by `validateSearch`, never by component effects.

## Data contract and mock states

Adapter: `src/features/procurement/api/authority-slice-api.{ts,mock,live}.ts`.
Returns one bundle so the view renders in a single pass:

```ts
type AuthorityProcurementSlice = {
  readonly authorityCui: string
  readonly summary: {
    readonly window: { readonly from: string; readonly to: string }
    readonly totalSpend: MoneyValue          // RON; mixed-currency handled
    readonly contractsCount: number
    readonly directAcquisitionsCount: number
    readonly suppliersCount: number
    readonly topCategory: CategoryRow | null
  }
  readonly topSuppliers: TopPartyRow[]        // ranked; share where allowed
  readonly categoryBreakdown: CategoryRow[]   // CPV division
  readonly spendOverTime: MonthlyPoint[]
  readonly recentRecords: ProcurementRecordSummary[]  // most recent contracts/DAs
  readonly signalsTeaser: {
    readonly topRepeatedPair: TopPartyRow | null
    readonly sameDayCandidate: SameDayCandidate | null
  }
  readonly gate: CapabilityGate               // coverage + allowed/blocked
}
```

(`MoneyValue`, `TopPartyRow`, `CategoryRow`, `MonthlyPoint`, `SameDayCandidate`,
`CapabilityGate` defined in `design.md` §6.)

Mock states the implementer must ship (under the feature `mocks/`):

- **Healthy:** all coverage ≥ thresholds; full KPIs, ranked top suppliers with
  share, signal teaser present.
- **Partial coverage:** amount coverage < 0.95 → spend KPIs shown with a
  `partial` badge and "valoare parțială"; share column suppressed (null) → show
  count ranking only.
- **No procurement data:** authority has no canonical rows → `EmptyState`.
- **Mixed currency:** some suppliers' amounts are native EUR → RON subtotal + "N
  înregistrări în altă monedă (neînsumate)" note; supplier rows show native value.
- **Stale:** `gate.dataAsOf` older than cadence → `stale` badge on `FreshnessBadge`.
- **Blocked-region:** `buyer_region_filter` not allowed for this grain → region
  sub-panel hidden with blocker note (no region chart).

## UI structure

Full-width band layout inside the entity view content area (no nested cards;
records use cards). Top → bottom:

1. **Coverage/freshness strip** — `CoverageRibbon` + `FreshnessBadge` ("Date până
   la …, cadență …") + `DataStatusBadge`. Compact, directly under the view title.
2. **KPI row** — `grid-cols-2 md:grid-cols-4`: Total cheltuieli (last 12 luni or
   selected year), # contracte, # achiziții directe, # furnizori. Each KPI shows a
   per-metric `DataStatusBadge` when its coverage is partial. `ValueWithCurrency`
   for money.
3. **Top suppliers** — `TopSuppliersChart` (horizontal bar, count + value) + a
   compact table fallback. Each row: supplier display name (link to
   `/companies/$cui`), count, value, share (only when `spend_ranked_top_n`
   allowed), `EvidenceLink`. Header action: "Vezi toți furnizorii" →
   `/achizitii/cautare?authority_cui=…&grain=contracts&sort=value`.
4. **Category breakdown** — `CategoryBreakdown` donut by CPV division
   (`CpvLabel` RO/EN), clicking a slice sets `acqCategory` and filters panels 3 & 5.
5. **Spend over time** — `SpendOverTime` monthly bar/line; amount-present vs
   amount-missing rendered distinctly + a note.
6. **Recent records** — list of `ProcurementRecordCard` (most recent
   contracts/DAs), each linking to its detail page + e-licitatie source.
7. **Review-signal teaser** — one `ReviewSignalBadge`-wrapped panel: top repeated
   pair and/or top same-day candidate, caption "semnal de verificare, nu o
   concluzie", CTA "Vezi semnalele de verificare" → `/achizitii/semnale?authority_cui=…`.
8. **Related links rail** (`RelatedLinksRail`) — budget execution / commitments
   (same entity), parliament controls, legal acts; cross-domain via `from=entities`.
9. **"Despre aceste date" explainer** (`Collapsible`) — plain-language: achiziție
   directă vs procedură vs contract, CPV, valoare nativă, semnal de verificare.

## Component reuse and proposed new components

- Reuse: `Card` (records only), `Badge`, `Tabs`/`ToggleGroup` (grain emphasis),
  `Tooltip`, `Collapsible`, `EmptyState`, `Skeleton`, Recharts, the existing
  `MoneyFlowDiagram`/`d3-sankey` (optional authority→category→supplier in a later
  iteration), entity view tab system.
- Shared (from coverage layer): `CoverageRibbon`, `DataStatusBadge`,
  `FreshnessBadge`, `SourceProvenanceDrawer`, `EvidenceLink`,
  `IdentityConfidenceBadge`, `ReviewSignalBadge`, `RelatedLinksRail`.
- New (this feature, reused elsewhere): `TopSuppliersChart`, `CategoryBreakdown`,
  `SpendOverTime`, `ValueWithCurrency`, `CpvLabel`, `ProcurementRecordCard`,
  `StatusBadge`.

## Interactions

- Switching `view=achizitii` loads the slice; switching `year`/`acqGrain` refetches
  the bundle (TanStack Query keyed on `[authorityCui, year, acqGrain, acqCategory]`).
- Donut slice click → set `acqCategory` (URL) → panels 3, 5, 6 filter; "x" chip in
  an `active-filters-bar` clears it.
- Supplier row click → `/companies/$cui` (supplier). "Vezi toți" → search,
  pre-filtered, carrying `from=entities&highlight=<cui>`.
- Signal teaser CTA → `/achizitii/semnale` filtered to this authority.
- Hover/focus on a KPI coverage badge → tooltip with the exact coverage rate +
  threshold; "detalii" opens `SourceProvenanceDrawer`.

## Loading, empty, error, partial, stale states

- **Loading:** skeleton mirroring KPI grid + chart blocks (reuse the
  `EntityFinancialSummarySkeleton` style). No spinner-only.
- **Empty:** `EmptyState` — "Nicio achiziție publică găsită pentru această
  instituție" + a line on why (coverage/no canonical rows) + link to search.
- **Error:** inline error panel with retry (use `useErrorHandler` /
  `handleError(e, 'procurement-authority-slice')`); never blank the whole entity
  page — the slice fails in isolation.
- **Partial:** per-metric `partial` badges; share column suppressed when amount
  coverage < threshold; "valoare parțială" caption on totals.
- **Stale:** `FreshnessBadge` shows `stale` + "Sincronizare suspendată — ultima
  actualizare …" (sync CronJobs suspended, UX §6.3).

## Accessibility and i18n

- Tab is keyboard-reachable and labelled; view content has a heading ("Achiziții
  publice").
- Charts: each has an adjacent textual summary + a `<table>` fallback of the same
  values.
- Status via text + icon + color, never color alone.
- All strings Lingui-wrapped; money/number/percent/date via `Intl`/`formatNumber`.
  RO primary: "Cheltuieli totale", "Furnizori principali", "Pe categorii (CPV)",
  "Achiziții recente", "Semnal de verificare".

## Privacy, provenance, source citation

- No contact PII rendered (supplier/authority contacts are excluded at serving).
- Each KPI/row exposes coverage; each record links to e-licitatie.ro
  (`EvidenceLink`) and `SourceProvenanceDrawer`.
- Supplier links show `IdentityConfidenceBadge` when CUI↔company match is partial.
- Dirty names: render `displayName`/cleaned; never show raw `|...|` as primary
  label; CUI is the secondary identifier shown.

## Acceptance checklist

- [ ] `view=achizitii` renders the native slice; `view=contracts` redirects/normalizes
      to it; SICAP iframe no longer the default procurement surface.
- [ ] KPIs, top suppliers, category breakdown, spend-over-time, recent records,
      signal teaser all render from one bundle.
- [ ] Coverage/freshness strip present; per-metric partial badges work.
- [ ] Share column hidden when `spend_ranked_top_n` not allowed; region panel hidden
      when `buyer_region_filter` blocked.
- [ ] Mixed currency never summed; native value shown; outliers flagged.
- [ ] Signal teaser carries neutral caption + evidence/CTA.
- [ ] All five mock states render correctly.
- [ ] Charts have text + table fallbacks; keyboard + screen-reader pass.
- [ ] `yarn typecheck` passes; strings extracted/compiled.

## Non-goals

- No supplier-region breakdown (blocked v1).
- No EUR-total switch (no FX).
- No HHI/concentration gauge here (lives in `supplier-concentration-analysis.md`;
  this slice only teases the top repeated pair).
- No DA line items/documents (DA is list-only).
- No status-history timeline (deferred).

## Open questions (blockers only)

None. The feature ships fully against current served rollups + mocks; partial
coverage and suspended sync are designed-for states, not blockers.
