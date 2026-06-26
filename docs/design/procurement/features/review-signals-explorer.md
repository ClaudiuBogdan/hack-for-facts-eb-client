# Feature: Review-signals explorer (`/achizitii/semnale`)

> High-value next feature. The signature investigative surface: same-day DA, repeated
> buyer-supplier pairs, modification inflation, young suppliers — every item labeled
> "semnal de verificare, nu o concluzie".

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (TanStack Router +
shadcn tables + Recharts/network). Depends on `coverage-data-as-of-layer.md` and
shared record components. Requires extreme discipline on neutral language.

## Summary

A dedicated page with leaderboards for four deterministic review signals, each with
cluster/pair drill-downs, evidence lists, and export. It makes the patterns the
scraper already computes visible without ever implying illegality.

## Facts / Decisions / Assumptions

- **Fact:** Signals come from deterministic projections:
  `same_day_direct_acquisition_candidates` (same-day DA splitting candidates),
  `org_edge_monthly_rollups` (repeated buyer-supplier pairs),
  `contract_modifications` (value inflation), and supplier first-seen (young
  suppliers) (UX §5.2, §13 "Review-signals explorer", §12.2).
- **Fact:** The scraper explicitly labels same-day candidates "a review signal, not a
  finding of illegality" (UX §2, §15). `same_day_direct_acquisition_signal` is gated
  by coverage (UX §6.4).
- **Fact:** Garbage values + null-RON rows can distort value-based signals (UX §15);
  outliers must be flagged and evidence-linked.
- **Decision:** Four signal tabs/sections: `same_day`, `repeated_pairs`,
  `modification_inflation`, `young_suppliers`. Each is a leaderboard → cluster
  drill-down. Default tab `same_day`.
- **Decision:** Every signal item carries `ReviewSignalBadge` + the neutral caption,
  an evidence list (record refs), and an explainer of *how* the signal is computed
  (transparency = trust). No danger color, no guilt iconography.
- **Decision:** Signals are scoped by optional `authority_cui` / `supplier_cui` /
  `cpv_division` (so the authority/supplier slices can deep-link in).
- **Assumption:** `young_suppliers` requires supplier first-seen + an award join;
  if that join is not served at launch, render the section `unverified` and keep the
  other three live. (PC-9/PC-15 are listed as advanced/later in UX §4.2.)

## Route and URL state

- **Route file:** `src/routes/achizitii.semnale.tsx` (+ `.lazy.tsx`),
  `validateSearch` extending the procurement-search schema subset.
- **Search params:**
  - `signal`: `'same_day' | 'repeated_pairs' | 'modification_inflation' | 'young_suppliers'`
    (default `same_day`).
  - `authority_cui`, `supplier_cui`, `cpv_division`: optional scope.
  - `year`, `period`: time scope.
  - `minCount` / `minDelta` / `minAmount`: signal-specific thresholds (e.g. same-day
    count ≥ N, modification delta ≥ X%).
  - `sort`, `page`, `pageSize`, `cluster` (selected pair/cluster id for drill-down).
- **Decision:** Default renders the top same-day candidates nationally with the
  coverage banner. Invalid params normalized by `validateSearch`.

## Data contract and mock states

Adapter: `src/features/procurement/api/review-signals-api.{ts,mock,live}.ts`.

```ts
type ReviewSignalsPage = {
  readonly signal: ReviewSignalKind
  readonly explainer: string                  // how this signal is computed
  readonly items: ReviewSignalItem[]          // leaderboard rows (per kind)
  readonly cluster: ReviewSignalCluster | null // expanded drill-down
  readonly page: { page: number; pageSize: number; total: number | null }
  readonly gate: CapabilityGate               // incl. same_day_*_signal allowed?
}

// kind-specific item unions
type SameDayItem = SameDayCandidate
type RepeatedPairItem = TopPartyRow & { authority: Party; supplier: Party;
  monthsRecurring: number }
type ModificationInflationItem = { contractId: string; authority: Party;
  supplier: Party; deltaPercent: number; valueBefore: MoneyValue;
  valueAfter: MoneyValue; modificationType: string | null; evidenceRefs: string[] }
type YoungSupplierItem = { supplier: Party; firstSeen: string;
  awardsCount: number; totalAwarded: MoneyValue; authority: Party | null;
  evidenceRefs: string[] }

type ReviewSignalCluster = {
  readonly title: string
  readonly records: ProcurementRecordSummary[]  // the underlying evidence rows
  readonly summary: MoneyValue
}
```

Mock states:

- **Each signal populated** with realistic leaderboards.
- **Same-day signal gated off** (coverage below threshold) → section shows
  `blocked`/`unverified` with reason, others live.
- **Young suppliers unverified** (join not served) → `RequestDatasetAction`.
- **Cluster drill-down** with evidence rows (including a flagged outlier).
- **Scoped to one authority** (deep-linked from the authority slice).
- **No signals** for a scope → `EmptyState`.
- **Outlier present** → flagged "valoare atipică" in the cluster.

## UI structure

1. **Header band:** title "Semnale de verificare", a prominent always-visible
   disclaimer panel: "Acestea sunt semnale de verificare, nu concluzii de
   ilegalitate. Indică tipare care merită o a doua privire." + `CoverageRibbon`.
2. **Signal selector:** `Tabs`/`ToggleGroup` for the four kinds, each with a one-line
   plain-language description.
3. **Scope bar:** optional authority/supplier/CPV/time scope (`active-filters-bar`
   chips when set, e.g. from a slice deep-link).
4. **Signal explainer:** `Collapsible` — exactly how the current signal is computed
   (e.g. "achiziții directe către același furnizor, în aceeași zi, pe aceeași
   categorie CPV, peste pragul X").
5. **Leaderboard:** table (`@tanstack/react-virtual` if large) of `ReviewSignalItem`,
   each row wrapped/marked with `ReviewSignalBadge`, parties linked, value (currency-
   safe, outliers flagged), the signal metric (same-day count / delta % / recurrence
   / first-seen), and "Vezi dovezile" → cluster.
6. **Cluster drill-down:** opens a `Sheet`/section with the underlying evidence
   records (`ProcurementRecordCard`), subtotal, and `ExportButton` (CSV + BOM).
7. **Optional network view** (advanced, later): buyer-supplier edge graph for
   repeated pairs / same-day clusters — review-signal labeled. Not required for v1
   of this feature; leaderboards are the MVP of the explorer.
8. **Related links rail:** to the scoped authority/supplier.

## Component reuse and proposed new components

- Reuse: `Tabs`/`ToggleGroup`, `Table`, `Sheet`, `Collapsible`, `active-filters-bar`,
  `Pagination`, `EmptyState`, `Skeleton`, `@tanstack/react-virtual`, PNRR
  `ExportButton` pattern.
- Shared: `CoverageRibbon`, `DataStatusBadge`, `ReviewSignalBadge` (central here),
  `EvidenceLink`, `SourceProvenanceDrawer`, `RelatedLinksRail`,
  `RequestDatasetAction`, `ShareFilteredView`.
- New: `ReviewSignalLeaderboard`, `ReviewSignalCluster` panel,
  `ProcurementRecordCard` (reused), `ValueWithCurrency` (reused). Network graph
  component deferred.

## Interactions

- Signal tab switch → refetch (query keyed on `[signal, scope, thresholds, page]`).
- Threshold controls (minCount/minDelta) adjust the leaderboard.
- "Vezi dovezile" sets `cluster` → drill-down with evidence + export.
- Scope chips clear via `active-filters-bar`.
- Export downloads the current cluster/leaderboard (CSV + BOM).

## Loading, empty, error, partial, stale states

- **Loading:** skeleton leaderboard rows.
- **Empty:** `EmptyState` "Niciun semnal pentru acest filtru".
- **Error:** inline retry (`handleError(e, 'procurement-signals')`).
- **Partial/blocked:** gated signal renders `blocked`/`unverified` with reason; never
  silently empty.
- **Stale:** coverage banner suspended-sync note.

## Accessibility and i18n

- Disclaimer is text (not just color); leaderboards are semantic tables.
- Tabs/toggles labelled; cluster `Sheet` focus-managed.
- Network graph (if/when added) needs a tabular fallback.
- All strings Lingui-wrapped; RO: "Semnale de verificare", "Achiziții în aceeași zi",
  "Perechi recurente cumpărător-furnizor", "Creșteri de valoare prin modificări",
  "Furnizori noi", "Vezi dovezile", "Cum se calculează". Neutral tone enforced.

## Privacy, provenance, source citation

- **The neutral-language rule is paramount here.** Every item: `ReviewSignalBadge` +
  caption; explainer of computation; evidence refs; no wrongdoing terms.
- Each evidence row cites source + e-licitatie + provenance drawer.
- Outliers flagged so a distorted ranking isn't read as a finding.
- Identity confidence shown on party links.

## Acceptance checklist

- [ ] Four signal kinds render as leaderboards with neutral labeling + computation
      explainer.
- [ ] Cluster drill-down shows evidence records + subtotal + export.
- [ ] Same-day signal respects `same_day_direct_acquisition_signal` gate.
- [ ] Young suppliers degrade to `unverified` if join not served.
- [ ] Outliers flagged; currency-safe values; no mixed-currency sums.
- [ ] Scope deep-links from authority/supplier slices work.
- [ ] Always-visible disclaimer; no danger/guilt iconography anywhere.
- [ ] All mock states render; `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No risk scoring, no "suspicious" labels, no ranking-as-accusation.
- No supplier-region clustering (blocked v1).
- Network graph is deferred (leaderboards are the MVP of this explorer).
- No CNSC appeal cross-link (parked).

## Open questions (blockers only)

None for the three served signals. Young-suppliers depends on the first-seen/award
join being served (UX §4.2 lists it as later); it ships `unverified` until then, so
it does not block the feature.
