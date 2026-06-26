# Feature: Per-lot e-licitatie winners on procedure pages

> High-value next feature. "Câștigători pe loți" section on procedure detail pages —
> fills the biggest known data gap (supplier-level awards on ~316k CA notices) once
> the loader serves it. Ships gated until then.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (detail-page section +
shadcn table). Embeds in `procurement-record-detail-pages.md` (procedure template).
Depends on `coverage-data-as-of-layer.md`.

## Summary

A section on the procedure detail page listing the per-lot winners (supplier-level
awards) for an e-licitatie CA notice: lot, winning supplier, awarded value, and
evidence — completing the award picture that bare procedures lack today.

## Facts / Decisions / Assumptions

- **Fact:** Per-lot e-licitatie winners (`GetCANoticeContracts` →
  `elicitatie_ca_notice_contracts`) is "the single highest-value addition; fills the
  empty supplier gap on ~316k CA notices". Lane built + e2e-verified 2026-06-24
  (winners 8/8 exact), ~15,228 rows captured so far; **not yet broadly loaded into
  serving** (UX §6.1, §13 "Per-lot e-licitatie winners", Open Q1).
- **Fact:** Procedures otherwise lack supplier-level awards (suppliers live on
  contracts/DAs, not procedures) (UX §5.1, §7).
- **Decision:** Render as a "Câștigători pe loți" section on procedure detail.
  Behind a served flag: until the loader serves it, show an `unverified` state with a
  short explainer + `RequestDatasetAction`, never an empty-looking false negative.
- **Decision:** Distinguish "no winners served yet" (`not_served`) from "procedure
  genuinely has no awarded lots" (`no_awards`, e.g. cancelled) — different copy.
- **Assumption:** Winners join to the procedure via notice number server-side; each
  winner links to the supplier company page by CUI when present.

## Route and URL state

- **Embedded** in `/achizitii/proceduri/$id`. No standalone route, no URL state of
  its own (a `highlight` param on the host can scroll to a specific lot).

## Data contract and mock states

Part of the procedure detail bundle (`design.md` §6 / `related.perLotWinners`):

```ts
type PerLotWinner = {
  readonly lotNo: string | null
  readonly lotTitle: string | null
  readonly supplier: Party
  readonly awardedValue: MoneyValue          // currency-safe
  readonly contractNo: string | null
  readonly awardDate: string | null
  readonly evidenceRefs: string[]
  readonly sourceUrl: string | null          // e-licitatie CA notice contract
}

type PerLotWinnersSection = {
  readonly status: 'served' | 'not_served' | 'no_awards'
  readonly winners: PerLotWinner[]
  readonly totalAwarded: MoneyValue
  readonly lotsCount: number
  readonly gate: CapabilityGate
}
```

Mock states:

- **Served, multiple lots** — table of winners with values + supplier links.
- **Single lot** — one winner row.
- **No awards** (`no_awards`) — "Procedura nu are loturi atribuite" (e.g.
  cancelled).
- **Not served** (`not_served`) — `unverified` panel + `RequestDatasetAction`.
- **Mixed currency** — native-value lots disclosed, not summed into the RON total.
- **Missing supplier CUI** — name-only winner; no broken company link, identity
  confidence low.

## UI structure

1. **Section header:** "Câștigători pe loți" + `DataStatusBadge` + lots count +
   total awarded (currency-safe).
2. **Served state:** table — lot no / title, supplier (→ `/companies/$cui` when CUI
   present, with `IdentityConfidenceBadge`), awarded value (`ValueWithCurrency`),
   award date, `EvidenceLink` to the e-licitatie CA-notice contract.
3. **No-awards state:** quiet explanatory note.
4. **Not-served state:** `unverified` panel + explainer ("Câștigătorii pe loturi
   pentru notificările CA e-licitatie sunt în curs de încărcare") +
   `RequestDatasetAction`.

## Component reuse and proposed new components

- Reuse: `Table`, `Badge`, `Tooltip`, `Separator`, `Skeleton`, `EmptyState`.
- Shared: `DataStatusBadge`, `EvidenceLink`, `IdentityConfidenceBadge`,
  `SourceProvenanceDrawer`, `RequestDatasetAction`.
- New/shared: `ValueWithCurrency` (reused), a small `PerLotWinnersTable`.

## Interactions

- Supplier link → company page with `from=achizitii`.
- Evidence link → e-licitatie CA-notice contract (new tab).
- `highlight` (host param) scrolls to + emphasizes a specific lot.
- `RequestDatasetAction` (not-served) records interest.

## Loading, empty, error, partial, stale states

- **Loading:** part of the procedure bundle skeleton.
- **Empty:** `no_awards` quiet note.
- **Error:** section degrades to "indisponibil" without breaking the page.
- **Partial:** mixed currency disclosed; name-only winners show low confidence.
- **Not-served:** `unverified` panel (default until the loader serves).

## Accessibility and i18n

- Section heading h2; table semantic with headers; status text+icon, not color-only.
- All strings Lingui-wrapped; RO: "Câștigători pe loți", "Lot", "Furnizor câștigător",
  "Valoare atribuită", "Data atribuirii", "Procedura nu are loturi atribuite",
  "în curs de încărcare", "Solicită încărcarea datelor".

## Privacy, provenance, source citation

- No contact PII; winners cited via e-licitatie CA-notice source + provenance.
- Identity confidence shown when supplier CUI is absent/weak.
- Not-served state is honest (`unverified`), never an empty table implying "no
  winners".
- Mixed currency never summed into the RON total.

## Acceptance checklist

- [ ] Section renders served / no-awards / not-served states distinctly.
- [ ] Served table shows lot, supplier link, value, date, evidence.
- [ ] Not-served default until a served flag flips; `RequestDatasetAction` present.
- [ ] Mixed currency disclosed; name-only winners handled.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No client-side notice→winners join (server-resolved).
- No DA winners (DA is a separate list-only grain).
- No bid-history / losing-bidder data (not captured).

## Open questions (blockers only)

1. **Per-lot winners serving readiness** (UX Open Q1) — lane built + verified, raw
   captured (~15k rows), but **not yet broadly loaded into serving**. Blocks live
   data only; the section ships the `not_served`/`unverified` state behind a served
   flag, so it does not block the host procedure detail page.
