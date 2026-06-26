# Feature — Payments Ledger (High-value next: N1)

> Read with `design.md` (shared shapes/routes/guardrails), `ux.md`, and
> `objective-detail-hub.md` (this renders that page's `Plăți` tab). Complements
> the absorption bar with transactional, per-payment detail.

## Feature owner profile

Table / data-viz front-end subagent. Renders inside the objective detail tab
shell; owns the payments table + cumulative line + per-row evidence.

## Summary

The `Plăți` tab of objective detail: a chronological ledger of payment facts
(date, sumă, solicitat, decontat, cumulativ) each with "Vezi dovada", plus a
cumulative-reimbursement line that visually answers "where did the money go over
time, and does it match the contracted amount?". It is the transactional layer
under the headline `Decontat`/`Absorbție` KPIs.

## Facts / Decisions / Assumptions

- **Fact (UX §5.1, N1):** `payment_source_facts` has 17,629 rows — date, amount,
  requested, decontat, cumulative; each traceable to `source_evidence`.
- **Fact (UX R1):** payment amounts are exposed to PI-1; guard every figure.
- **Fact (UX R6):** only the latest snapshot is projected — payments are the
  events recorded *within* that snapshot, not a cross-snapshot time series. The
  cumulative line is intra-snapshot, labeled as such.
- **Decision:** Renders as the `?tab=plati` content of
  `/investitii-publice/obiective/$id`; no own route.
- **Decision:** The cumulative line is a small inline chart (recharts, already a
  client dep) with a **tabular fallback** (the `Cumulativ` column is the same
  data); never chart-only.
- **Assumption:** Payment rows may have null dates (Excel artifacts); null-date
  rows sort to the end under a "fără dată" group, not dropped.

## Route and URL state

- Host route: `/investitii-publice/obiective/$id?tab=plati`.
- Local (tab-scoped) params — kept minimal to avoid clutter:

```
paySort:  'date'|'amount'|'cumulative'   // default 'date'
payOrder: 'asc'|'desc'                    // default 'asc' (chronological)
dovada:   string?                         // evidence deep-link (shared)
```

- **Decision:** Tab params only apply when `tab=plati`; cleaned otherwise
  (mirror PNRR `cleanPnrrSearch` per-tab logic).

## Data contract and mock states

Consumes `ObjectiveDetailBundle.payments: readonly PaymentFact[]`
(design.md §6). Derived in the adapter:

```ts
type PaymentsLedgerData = {
  readonly payments: readonly PaymentFact[]      // each guarded + evidenceRef
  readonly cumulativeSeries: ReadonlyArray<{      // for the inline line
    readonly date: string | null
    readonly cumulative: number | null            // null if any contributing amount suspect
    readonly confidence: AmountConfidence
  }>
  readonly contractedReference: MoneyValue | null // contracted line on the chart
  readonly totals: {
    readonly reimbursedTotal: MoneyValue
    readonly paymentCount: number
    readonly suspectCount: number                 // payments excluded from totals/series
  }
  readonly snapshotDate: string | null
}
```

- **Mock states:** (1) several dated payments rising to ~contracted;
  (2) PI-1 suspect amounts → those rows show "valoare în verificare", excluded
  from cumulative + totals with a visible count; (3) null-date rows grouped
  "fără dată"; (4) decontat>contractat anomaly (cumulative crosses the contracted
  line) → "depășește valoarea contractată — anomalie sursă" note; (5) zero
  payments → empty state.

## UI structure

1. **Tab intro line** — "Plăți înregistrate în ultimul snapshot
   ({snapshotDate}). Istoricul pe mai multe perioade nu este încă disponibil." +
   glossary tooltips for `solicitat`/`decontat`/`cumulativ`.
2. **Cumulative line** (small, ~160px) — cumulative decontat over time vs. a
   dashed `contractedReference` line; points are payment events. Suspect/missing
   points rendered as gaps with a note, not interpolated. Accessible summary
   sentence above it ("Decontat cumulativ: {x} din {contracted} contractat").
3. **Totals strip** — Decontat total (`AmountWithEvidence`), Nr. plăți,
   "{suspectCount} plăți cu valori în verificare (excluse din total)" when >0.
4. **Ledger table** — columns: Dată, Sumă (`AmountWithEvidence`), Solicitat,
   Decontat, Cumulativ, Dovadă (`EvidenceLink`). Sort on Dată/Sumă/Cumulativ.
   Null-date rows under a "Fără dată" subgroup. Sticky header; rows are compact.
5. **Footer note** — "Fiecare plată se verifică în registrul sursă" + link to
   `HowToReadData`.

## Component reuse and proposed new components

- Reuse: `Table`, recharts inline line (via existing `charts` utilities /
  `safe-responsive-container`), `Tooltip`, `Badge`, `Skeleton`, `EmptyState`,
  `copy-button`.
- Shared trust: `EvidenceLink`, `SourceProvenanceDrawer`, `DataStatusBadge`,
  `FreshnessBadge`.
- New PI: `AmountWithEvidence`, `HowToReadData`. (No new heavy component; the
  ledger is a table + a small chart.)

## Interactions

- Sort header → `paySort`/`payOrder`. Row "Vezi dovada" → drawer.
- Hover chart point → tooltip with the payment date + cumulative (text-backed by
  the table). Copy buttons for amounts/dates.

## Loading / empty / error / partial / stale

- **Loading:** table + chart skeleton inside the tab; rest of detail page already
  loaded.
- **Empty:** no payment facts → `EmptyState` "Nu există plăți înregistrate pentru
  acest obiectiv" + a note that contracted/decontat KPIs come from the objective
  row, not payments.
- **Error:** tab-scoped error + retry; other tabs unaffected.
- **Partial:** suspect rows excluded from totals/series with a visible count;
  null-date rows grouped; missing `cumulative` → "—".
- **Stale:** snapshot date via `FreshnessBadge`; intra-snapshot caveat always
  shown.

## Accessibility and i18n

- Table is semantic with `aria-sort`; the cumulative chart has an adjacent text
  summary and the table **is** its data equivalent (foundation chart rule).
- Amounts stated in text; dates via `Intl.DateTimeFormat`. Lingui throughout;
  `solicitat`/`decontat`/`cumulativ` glossary tooltips.

## Privacy / provenance

- Payments carry no party identity, so no privacy gate applies here. (Any future
  payee field would pass the `served` gate.)
- Every row + the total carry `EvidenceLink`; suspect amounts surfaced honestly,
  not silently summed.

## Acceptance checklist

- [ ] `?tab=plati` renders the ledger table + cumulative line + totals.
- [ ] Every amount guarded; suspect rows excluded from total/series with a count;
      anomaly (>contracted) noted.
- [ ] Cumulative line has a text summary and a tabular equivalent; null-date rows
      grouped, not dropped.
- [ ] Each row + total has "Vezi dovada"; intra-snapshot caveat shown.
- [ ] Empty/error/partial states implemented; table `aria-sort`;
      `yarn typecheck` clean; i18n done.

## Non-goals

- Cross-snapshot payment time series (blocked on backfill — `stage-timeline.md`
  shares the gating posture).
- Reconciling payments to procurement/budget (no money-flow merge; guardrail).
- Standalone payments route (it is a detail tab).

## Open questions (blockers only)

- None. PI-1 handled by exclusion+labeling; intra-snapshot scope labeled.
