# Feature: Supplier concentration analysis (top-N share, HHI)

> High-value next feature. Answers "is this authority's spend captured by one
> supplier?" (and the mirror for a supplier's revenue) with a single honest metric.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (Recharts/gauge +
shadcn). Renders as a section embedded in the authority slice, the supplier slice,
and a scoped view on `/achizitii/semnale`. Depends on `coverage-data-as-of-layer.md`.

## Summary

A concentration module computing top-1 share, top-5 share, and HHI for an
authority's spend (by supplier) or a supplier's revenue (by buyer), with a gauge,
a top-N table with cumulative share, and a plain-language interpretation — always
coverage-gated and never framed as an accusation.

## Facts / Decisions / Assumptions

- **Fact:** Concentration is computed from `org_edge_monthly_rollups`
  (authority×supplier flow_count + amount) (UX §13 "Supplier concentration",
  §12.2). Answers PC-5 / PC-14.
- **Fact:** Spend-based concentration requires `spend_ranked_top_n` allowed (amount
  coverage ≥0.95); otherwise only count-based concentration is honest (UX §6.4).
- **Fact:** Mixed currency / garbage rows distort shares (UX §15); must be excluded
  or flagged from the denominator and disclosed.
- **Decision:** Two scopes via one component: `authority` (suppliers as the
  distribution) and `supplier` (buyers as the distribution). HHI computed on the
  amount distribution when allowed, else on the count distribution (labeled which).
- **Decision:** Present HHI with a plain-language band (e.g. "concentrare redusă /
  moderată / ridicată") and the underlying numbers; never a verdict. Use neutral
  "concentrare" language.
- **Assumption:** HHI is computed client-side from the top-N + a "rest" bucket when
  the server returns the full distribution or a sufficient top-N + tail total;
  if only a truncated top-N is available, show top-1/top-5 share and label HHI as
  "estimată (coadă agregată)" or omit it. Implementer confirms the served shape.

## Route and URL state

- **Embedded** in `/entities/$cui?view=achizitii` and `/companies/$cui?tab=achizitii`
  as a "Concentrare" section; also available scoped on `/achizitii/semnale` (not a
  standalone route).
- **Params (reuse host params):** `year`/`acqYear`, `acqCategory` (optional category
  scope), plus a local `concMetric`: `'amount' | 'count'` (default chooses `amount`
  when allowed, else `count`).

## Data contract and mock states

Adapter: `src/features/procurement/api/concentration-api.{ts,mock,live}.ts`.

```ts
type ConcentrationAnalysis = {
  readonly scope: 'authority' | 'supplier'
  readonly metric: 'amount' | 'count'
  readonly top1Share: number | null          // 0..1; null when not computable
  readonly top5Share: number | null
  readonly hhi: number | null                 // 0..10000 (or 0..1); null if not computable
  readonly hhiEstimated: boolean              // true when tail aggregated
  readonly band: 'low' | 'moderate' | 'high' | null
  readonly distribution: Array<{
    readonly party: Party
    readonly value: MoneyValue
    readonly count: number
    readonly share: number                    // of the (currency-safe) total
    readonly cumulativeShare: number
    readonly evidenceRefs: string[]
  }>
  readonly restBucket: { share: number; partiesCount: number } | null
  readonly excludedFromDenominator: {
    readonly nativeCurrencyCount: number      // not summed
    readonly outlierCount: number
    readonly missingAmountCount: number
  }
  readonly gate: CapabilityGate
}
```

Mock states:

- **High concentration** (top-1 ≈ 80%) — gauge in the high band + neutral note.
- **Low concentration** (many suppliers) — flat distribution.
- **Spend gated → count-based** — metric `count`, label "după număr de
  contracte" (amount coverage too low).
- **HHI estimated** — `hhiEstimated: true`, "estimată" tag.
- **Excluded rows present** — disclosure line "N înregistrări excluse din numitor
  (monedă nativă / atipice / fără sumă)".
- **Insufficient data** — `EmptyState` ("Date insuficiente pentru concentrare").

## UI structure

1. **Section header:** "Concentrare furnizori" (authority) / "Concentrare
   cumpărători" (supplier) + `DataStatusBadge` + a `Tooltip` defining HHI.
2. **Gauge + headline:** `ConcentrationGauge` (top-1 / top-5 / HHI) with the band
   label and a plain-language sentence ("Primul furnizor concentrează X% din
   cheltuielile acoperite").
3. **Metric toggle:** amount / count (`concMetric`); amount disabled+reason when
   gated.
4. **Distribution table:** top-N parties with value, share, cumulative share,
   evidence; a "rest" row for the aggregated tail.
5. **Exclusions disclosure:** small note listing rows excluded from the denominator
   (native currency / outliers / missing amount).
6. **Neutral framing note:** "Concentrarea ridicată nu înseamnă neregulă; este un
   semnal de verificare." (`ReviewSignalBadge`-adjacent tone.)

## Component reuse and proposed new components

- Reuse: Recharts (radial/gauge or a custom bar-based gauge), `Table`, `Tooltip`,
  `ToggleGroup`, `EmptyState`, `Skeleton`.
- Shared: `DataStatusBadge`, `CoverageRibbon` (host-level), `EvidenceLink`,
  `ReviewSignalBadge`, `IdentityConfidenceBadge`.
- New: `ConcentrationGauge`, `ConcentrationTable` (or reuse the slice top-N table
  with a cumulative-share column).

## Interactions

- Metric toggle recomputes/refetches (query keyed on `[scope, id, year, category,
  metric]`).
- Category scope (`acqCategory`) narrows the distribution.
- Distribution row → party page + filtered search (evidence).

## Loading, empty, error, partial, stale states

- **Loading:** skeleton gauge + table rows.
- **Empty:** insufficient data `EmptyState`.
- **Error:** inline retry (`handleError(e, 'procurement-concentration')`).
- **Partial:** amount→count downgrade with label; HHI estimated tag; exclusions
  disclosed.
- **Stale:** host coverage banner note.

## Accessibility and i18n

- Gauge has an adjacent textual summary + the table as fallback (charts a11y rule).
- HHI/term acronym expanded in tooltip + visible context ("indicele
  Herfindahl-Hirschman").
- Band conveyed by text + position, not color alone.
- All strings Lingui-wrapped; RO: "Concentrare furnizori/cumpărători", "Cota
  primului", "Cota primilor 5", "indice de concentrare (HHI)", "după valoare/număr",
  "rest", "excluse din numitor".

## Privacy, provenance, source citation

- Aggregate-only; no PII. Evidence refs on each distribution row.
- Denominator exclusions disclosed (no silent currency mixing / outlier inclusion).
- Neutral "concentrare / semnal de verificare" language; never "monopol abuziv" etc.

## Acceptance checklist

- [ ] top-1 / top-5 share + HHI computed and rendered with a plain-language band.
- [ ] Spend metric gated; count fallback labeled honestly.
- [ ] HHI estimation flagged when tail is aggregated.
- [ ] Excluded rows (currency/outlier/missing) disclosed.
- [ ] Works in both authority and supplier scope; category scoping works.
- [ ] Gauge has text + table fallback; neutral framing present.
- [ ] All mock states render; `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No cross-authority benchmarking (that is the comparison tool, advanced).
- No supplier-region concentration (blocked v1).
- No risk score; HHI is descriptive, not a verdict.
- No EUR-normalized concentration (no FX).

## Open questions (blockers only)

None. Whether the server returns a full distribution vs truncated top-N is a
documented Assumption with a defined fallback (estimate/omit HHI), so it does not
block.
