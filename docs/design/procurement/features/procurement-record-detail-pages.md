# Feature: Procurement record detail pages (procedure / contract / direct acquisition)

> MVP-3. Three detail templates sharing one "procurement record" layout. Closes the
> evidence trail — every aggregate links to a verifiable record here.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (TanStack Router dynamic
routes + shadcn detail layouts + timeline). Depends on `coverage-data-as-of-layer.md`
and the shared record components from `authority-procurement-slice.md`.

## Summary

Three routes (`/achizitii/proceduri/$id`, `/achizitii/contracte/$id`,
`/achizitii/achizitii-directe/$id`) render one record each with full detail: IDs,
parties (linked), classification (CPV), value (RON + native currency), status
lifecycle, dates, related records (procedure↔contracts↔modifications), the
modification trail, a money-flow link, and a deep link to the e-licitatie source.
Plus a "Câștigători pe loți" slot (procedure) and a "Vezi și pe TED" slot
(procedure/contract), both gated and documented in their own feature files.

## Facts / Decisions / Assumptions

- **Fact:** Record fields per grain (UX §5.1, §10.3–§10.5). Contracts link to a
  parent procedure via `procedure_id` (93.4% linked) and to modifications via
  `contract_id` (~79–88% linked). Modifications can be unlinked (UX §6.3).
- **Fact:** Non-RON values have null `value_ron`; native value+currency in `attrs`
  (UX §6.3). Status can be `unknown`. Dates can be missing (procedures).
- **Fact:** Dedup is a reversible link layer (`dup_group_id` + `is_canonical`);
  flows/search read canonical rows (UX §7). The same acquisition may appear in SEAP
  + e-licitatie ("surse" badge + "de ce apare de două ori" explainer, UX §15).
- **Decision:** One shared `ProcurementRecordDetail` layout with grain-specific
  slot content; three thin route files map `$id` → adapter → layout. Param `$id` is
  the server key (`contract_key`, `da_key`, procedure id), validated as a non-empty
  string.
- **Decision:** "Report a data issue" affordance (`RequestDatasetAction` variant) on
  every detail page (UX §13 MVP-3) — feeds the data-quality loop.
- **Assumption:** `$id` is opaque; the route does not parse it into business meaning.
  notFound() when the adapter returns null.

## Route and URL state

- **Route files:**
  - `src/routes/achizitii.proceduri.$id.tsx` (+ `.lazy.tsx`)
  - `src/routes/achizitii.contracte.$id.tsx` (+ `.lazy.tsx`)
  - `src/routes/achizitii.achizitii-directe.$id.tsx` (+ `.lazy.tsx`)
- **Loader:** fetch record by `$id`; `throw notFound()` if absent (mirror
  `companies.$cui.tsx`).
- **Search params:** `from` (back-context: `entities`/`companies`/`cautare`/`cpv`/
  `semnale`), `highlight` (e.g. a supplier CUI or a modification id to scroll-to),
  `tab` (optional within-detail section anchor). Minimal — detail pages are mostly
  static.

## Data contract and mock states

Adapter: `src/features/procurement/api/procurement-record-api.{ts,mock,live}.ts`
(one function per grain or a discriminated fetch). Returns the full record types
from `design.md` §6.1 (`ProcedureRecord`, `ContractRecord`,
`DirectAcquisitionRecord`) plus:

```ts
type ProcurementRecordDetail<T> = {
  readonly record: T
  readonly related: {
    readonly procedure: ProcedureRecordSummary | null     // for contracts
    readonly contracts: ContractRecordSummary[]           // for procedures
    readonly modifications: ContractModification[]         // for contracts
    readonly moneyFlowId: string | null                    // → money-flow fact
    readonly duplicates: { sourceSystem: string; id: string }[]  // dup_group siblings
    readonly perLotWinners: PerLotWinner[] | null          // procedures; null=not served
    readonly ted: TedReference | null                      // procedures/contracts; null=not served
  }
  readonly gate: CapabilityGate
}
```

Mock states:

- **Full contract** with parent procedure + 2 modifications (value inflation).
- **Contract with unlinked modifications** → "Modificări neasociate" section.
- **Contract with no parent procedure** (6.6% case) → "Procedură necunoscută" note.
- **Procedure with linked contracts** + per-lot winners null (not served) → gated slot.
- **Direct acquisition** (list-only) → no line items; "detalii indisponibile" note.
- **Non-RON value** → native value+currency, RON shown as "indisponibil".
- **Unknown status** → "Nedeterminat" + tooltip.
- **Missing date** → "dată indisponibilă".
- **Duplicate across sources** → "surse" badge + explainer.
- **Outlier value** → flagged with "valoare atipică — verifică sursa".

## UI structure (shared `ProcurementRecordDetail`)

Single column on mobile; header + (body / related rail) two-column at `lg+`.

1. **Breadcrumb** — Achiziții publice → [grain] → record id; `from`-aware back link.
2. **`ProcurementRecordHeader`** — record type label + IDs (notice_no / contract_no
   / unique_code), `StatusBadge` (incl. `unknown`), `ValueWithCurrency` (RON +
   native), `FreshnessBadge`, source-system `Badge`, primary `EvidenceLink`
   "Deschide pe e-licitatie.ro".
3. **Parties** — Authority (→ `/entities/$cui`) + Supplier (→ `/companies/$cui`,
   contracts/DAs only), each with `IdentityConfidenceBadge` when match is partial,
   cleaned name + CUI.
4. **Classification** — `CpvLabel` (code + RO/EN + division) + contract_kind
   (works/services/supplies) with plain-language tooltip.
5. **Lifecycle / dates** — publication/state/contract/finalization dates as
   available; missing dates labeled, not blank.
6. **Values** — estimated vs awarded/value; for contracts, estimated vs contracted
   delta. Mixed/native currency rule applied.
7. **Modification trail** (contracts) — `ModificationTrail` timeline: before → after
   → delta, type, date; a separate "Modificări neasociate" block for unlinked ones.
8. **Related records** — procedure↔contracts list; money-flow fact link; duplicate
   siblings ("surse").
9. **Per-lot winners slot** (procedures) — `per-lot-winners.md` (gated; renders
   `blocked`/`unverified` until served).
10. **TED slot** (procedures/contracts) — `ted-cross-reference.md` (gated).
11. **Related links rail** (`RelatedLinksRail`) — authority budget, supplier
    cross-domain, (later) CNSC.
12. **Footer:** `SourceProvenanceDrawer` trigger + "Raportează o problemă de date"
    (`RequestDatasetAction`).

## Component reuse and proposed new components

- Reuse: `Badge`, `Tooltip`, `Separator`, `Breadcrumb`, `Collapsible`, `Card`
  (related-record rows), `Skeleton`, `Table` (modifications fallback).
- Shared: `FreshnessBadge`, `EvidenceLink`, `SourceProvenanceDrawer`,
  `IdentityConfidenceBadge`, `DataStatusBadge`, `RelatedLinksRail`,
  `RequestDatasetAction`, `PrivacyBoundaryNotice` (if any field redacted).
- New: `ProcurementRecordHeader`, `ProcurementRecordDetail` (layout), `CpvLabel`,
  `ValueWithCurrency`, `StatusBadge`, `ModificationTrail`.

## Interactions

- Party clicks → entity/company pages with `from=achizitii`.
- Parent-procedure / related-contract clicks → sibling detail pages.
- Money-flow link → the money-flow fact view.
- `highlight` param scrolls to + briefly emphasizes the target (modification row or
  supplier).
- Provenance drawer opens from header/footer; report-issue opens a small dialog.
- e-licitatie deep link opens in a new tab (`rel="noopener noreferrer"`).

## Loading, empty, error, partial, stale states

- **Loading:** skeleton header + body blocks.
- **Not found:** route `notFound()` → standard not-found page with link to search.
- **Error:** inline retry (`handleError(e, 'procurement-record-detail')`).
- **Partial:** missing dates/values/status labeled honestly; null parent/modifications
  shown as explicit "necunoscut/neasociat" sections.
- **Stale:** `FreshnessBadge` stale + suspended-sync note.
- **Gated slots:** per-lot/TED render their own `blocked`/`unverified` states.

## Accessibility and i18n

- Heading hierarchy: page h1 = record label; sections h2.
- Modification trail is a semantic ordered list/timeline with a `<table>` fallback.
- Status text+icon+color; tooltips never the only critical info.
- All strings Lingui-wrapped; RO: "Procedură", "Contract", "Achiziție directă",
  "Autoritate contractantă", "Furnizor", "Valoare estimată", "Valoare atribuită",
  "Stadiu", "Modificări", "Modificări neasociate", "Surse". Acronyms expanded.

## Privacy, provenance, source citation

- No contact PII; document/file links gated by `privacy_class` (DA docs not served
  yet → none shown).
- Every record cites source (system + notice/contract no + retrieval date) and links
  to e-licitatie.ro; provenance drawer holds parser caveats.
- Duplicate-across-sources explained, not hidden.
- Identity confidence shown on party links.

## Acceptance checklist

- [ ] Three routes render via one shared layout with grain-specific slots.
- [ ] Header shows IDs, status (incl. `unknown`), value (RON + native), source link.
- [ ] Parties link to entity/company with identity confidence where partial.
- [ ] Contract pages show modification trail + unlinked modifications separately.
- [ ] Procedure pages list linked contracts + render gated per-lot/TED slots.
- [ ] DA pages render list-only with "detalii indisponibile" note.
- [ ] notFound() handled; all mock states render.
- [ ] Report-issue + provenance drawer present.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No DA line items/documents (lane not served).
- No status-history timeline (deferred; current-state only).
- No CNSC appeal section (parked).
- Per-lot winners + TED are documented + slotted but implemented in their own files.

## Open questions (blockers only)

None for the core three templates. Per-lot/TED slots depend on serving readiness
(UX Open Q1) but ship gated states, so they do not block these pages.
