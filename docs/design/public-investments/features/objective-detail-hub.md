# Feature — Objective Detail Hub (MVP-2)

> Read with `design.md` (shared shapes/routes/guardrails) and `ux.md`. This is
> **the trust artifact** of the domain — the first screen the orchestrator wants
> designed, and the page that makes every other view credible.

## Feature owner profile

Entity-profile front-end subagent (mirror `src/features/entities` /
`src/routes/entities.$cui.tsx` conventions: header + KPI cards + tabbed body),
comfortable with shadcn `Tabs`, evidence drawers, and privacy gating.

## Summary

One page per objective at `/investitii-publice/obiective/$id`: header (title,
program, domain, locality, map pin), KPI cards (Alocat / Contractat / Decontat /
Absorbție), a `StageBadge` + `StageTimeline`, and tabs — **Prezentare · Plăți ·
Contract · Părți · Dovezi** — with a "Vezi dovada" beside every figure and a
"Surse conexe" rail of evidence-led cross-domain links. Without per-figure
evidence the domain is just numbers; this page supplies it.

## Facts / Decisions / Assumptions

- **Fact (UX MVP-2):** objective + payment + contract + stage + party +
  `source_evidence` all serve today; privacy gating available via
  `privacy_class`.
- **Fact (UX §7):** objective is the canonical grain; payments/contracts/stages/
  parties are per-snapshot facts attached to it.
- **Fact (UX R1/R3/R4/R5):** amounts may be PI-1 inflated; stage is not a clean
  enum; identity may be weak; SEAP matches are candidate-only.
- **Decision:** Tabs live in `?tab=`; default `prezentare`. Deep-linkable tabs:
  `prezentare | plati | contract | parti | dovezi`.
- **Decision:** The `Părți` tab and any party reference in `Contract` obey the
  privacy gate — a withheld party renders `PrivacyBoundaryNotice`, never a name.
- **Decision:** Cross-domain links are an evidence-led `RelatedLinksRail`, not a
  money-flow diagram (guardrail).
- **Assumption:** `$id` is the surrogate `objective_id`. A not-found id renders a
  domain 404 (not a blank page) with a search CTA.

## Route and URL state

- Route: `/investitii-publice/obiective/$id`
  (`src/routes/investitii-publice/obiective.$id.tsx` + `.lazy.tsx`).
- Search params (zod-validated, defaults stripped):

```
tab:    'prezentare' | 'plati' | 'contract' | 'parti' | 'dovezi'  // default 'prezentare'
dovada: string | undefined   // EvidenceRef.sourceRowKey -> SourceProvenanceDrawer
stage:  string | undefined   // StageFact.snapshotId to expand in timeline (optional)
```

- `from`, `county`, `siruta` accepted as optional backtrack context (foundation
  cross-domain rule) and used only to render the breadcrumb/return link.

## Data contract and mock states

Adapter: `src/features/public-investments/api/objective.live.ts` +
`objective.mock.ts`. Returns `ObjectiveDetail` (design.md §6) plus the attached
fact lists:

```ts
type ObjectiveDetailBundle = {
  readonly objective: ObjectiveDetail
  readonly payments: readonly PaymentFact[]      // for Plăți tab + cumulative
  readonly contracts: readonly ContractFact[]    // usually 1, may be N snapshots
  readonly stages: readonly StageFact[]          // for StageTimeline (latest-only today)
  readonly parties: readonly Party[]             // contractor/designer/beneficiary
  readonly status: DomainDataStatus
}
```

- **Mock states:** (1) complete objective, all tabs populated, identity `high`;
  (2) PI-1 `suspect_x1000` on contracted+reimbursed (KPI guard + tab guard);
  (3) money-precision row (decontat>contractat) → `precision_warning` + amber +
  "absorbție > 100% — anomalie sursă" note, `absorptionPct` clamped/`null`;
  (4) gated parties (`served:false`, `personal_moderate`) → `PrivacyBoundaryNotice`;
  (5) missing SIRUTA (PNMC) → no map pin, "fără localizare" note;
  (6) identity `low` → `IdentityConfidenceBadge` + expert note;
  (7) ArcGIS `arcgis_api` evidence + a `dead` link to exercise source-kind labels;
  (8) single stage snapshot → timeline shows "istoric indisponibil momentan".

## UI structure

### Header band
- Breadcrumb `Investiții publice › {county} › {uat}` (uses `from`/`county` if
  present, else objective territory).
- H1 = objective title (truncate-safe, full on hover/disclosure).
- Meta row: `ProgramChip`, domain label, locality (link →
  `/investitii-publice/localitati/$siruta`), `IdentityConfidenceBadge` when
  identity ≠ `high`.
- Right: small static map pin (`InteractiveMap` mini or static marker) →
  clicking opens locality page; "fără localizare" placeholder when no SIRUTA.
- `CoverageRibbon` compact (program coverage + `FreshnessBadge` snapshot date +
  gate badge). PI-1 amber notice if active.

### KPI cards (4, unframed `divide-x`, no nested cards)
`Alocat` · `Contractat` · `Decontat` · `Absorbție`. Each money card =
`AmountWithEvidence` (guarded + "Vezi dovada"). `Absorbție` = `AbsorptionBar`
(decontat/contractat %) with "—" + reason when null. A glossary tooltip on each
term (`contractat`, `decontat`, `absorbție`).

### Tabs
- **Prezentare (default):** plain-language summary sentence (program, domain,
  beneficiary, "din {contractat} contractat, {decontat} decontat ({abs}%),
  stadiu {stage}"); `StageBadge` + raw stage disclosure; `StageTimeline`
  (gated); `RelatedLinksRail` "Surse conexe"; physical attributes when present
  (rețele apă/canalizare/drumuri lengths, Nr poduri for Anghel) as a small
  key→value list with evidence.
- **Plăți:** the payments ledger (see `payments-ledger.md`) — table + cumulative
  line; empty state if no payment facts.
- **Contract:** contract number, contract date, `value` (`AmountWithEvidence`),
  and contractor/designer/beneficiary as party rows (privacy-gated). Candidate
  SEAP matches shown here as "posibilă corespondență SEAP, în curs de verificare"
  → `/achizitii` (never as fact). Multiple contract snapshots listed if present.
- **Părți:** contractor / designer / beneficiary cards (privacy-gated). Each
  served party: role, name, CUI (link → `/companies/$cui` or `/entities/$cui`),
  `# obiective` (link → `/investitii-publice/firme?cui=`), evidence. Withheld
  parties → `PrivacyBoundaryNotice` explaining why (sole-trader/PFA or
  unreviewed). Beneficiary UAT → `/entities/$cui` + `/primarie/$cui` +
  `/budget-explorer`.
- **Dovezi:** the evidence index for this objective — a list of every
  `EvidenceRef` (objective, each payment/contract/stage fact) rendered by the
  `SourceProvenanceDrawer` content inline (source URL by kind, snapshot date,
  row key, content hash, raw payload excerpt). This is the full-page sibling of
  the per-figure drawer.

## Component reuse and proposed new components

- Reuse: `Tabs`, `Table`, `Badge`, `Tooltip`, `Sheet`, `Dialog`, `Collapsible`,
  `Skeleton`, `EmptyState`, `breadcrumb`, `copy-button`, `InteractiveMap` (mini),
  entity profile layout patterns.
- Shared trust: `CoverageRibbon`, `FreshnessBadge`, `DataStatusBadge`,
  `EvidenceLink`, `SourceProvenanceDrawer`, `PrivacyBoundaryNotice`,
  `IdentityConfidenceBadge`, `RelatedLinksRail`.
- New PI: `AmountWithEvidence`, `AbsorptionBar`, `StageBadge`, `StageTimeline`,
  `ProgramChip`, `HowToReadData`.

## Interactions

- Tab change → `?tab=`. Browser back restores prior tab.
- "Vezi dovada" anywhere → `SourceProvenanceDrawer` via `?dovada=`.
- Map pin click → locality page. CUI link → company/entity. Authority →
  entity/primărie/budget. SEAP candidate → procurement (labeled).
- Raw stage disclosure → reveals verbatim `Stadiu obiectiv`.
- Copy buttons for objective id, CUI, source URL.

## Loading / empty / error / partial / stale

- **Loading:** header skeleton + KPI skeletons + tab skeleton (reuse
  `EntityFinancialSummarySkeleton`-style). Stable layout, no CLS.
- **Empty (per tab):** no payments → `EmptyState` "Nu există plăți înregistrate";
  no contract → "Fără date de contract"; no parties served → privacy/empty notice.
- **Error:** fetch error → page error card + retry, URL intact. Not-found id →
  domain 404 with "Caută obiective" CTA.
- **Partial:** missing SIRUTA → no pin + note; missing CUI → party shown without
  link + "fără CUI în sursă"; single stage snapshot → timeline gated.
- **Stale:** `FreshnessBadge` muted "posibil neactualizat"; data-status notice if
  PI-1 active.

## Accessibility and i18n

- Tabs are Radix `Tabs` (roving focus, `aria-selected`). KPI amounts stated in
  text; `AbsorptionBar` `aria-label`. `StageBadge` text+icon. Map pin has a
  text alternative ("Vezi pe hartă: {locality}"). Drawer/dialog focus managed.
- All copy via Lingui. Plain-Romanian glossary tooltips for the four key terms.
  Acronyms expanded on first use.

## Privacy / provenance

- **Fail-safe gating:** any party with `served===false` / `personal_moderate` /
  `potential_natural_person` / `unreviewed` is withheld → `PrivacyBoundaryNotice`.
  Gated names never appear in CSV, links, or headings.
- Every figure has an `EvidenceLink`; the `Dovezi` tab is the complete trail.
  Source links labeled by `sourceUrlKind` (workbook / arcgis_api / dead).
- SEAP matches are candidate-only with explicit "în curs de verificare" copy;
  never rendered as a confirmed award.
- `IdentityConfidenceBadge` shown when identity < high; expert note explains the
  `program:siruta:title` heuristic and that no silent cross-source merge is made.

## Acceptance checklist

- [ ] `/investitii-publice/obiective/$id` renders header + 4 KPI cards + 5 tabs.
- [ ] Default `?tab=prezentare`; tabs deep-link and restore on back.
- [ ] Every amount uses `AmountWithEvidence`; PI-1 suspect amounts hidden +
      data-status notice; precision-warning shows the >100% anomaly note.
- [ ] `Părți`/`Contract` never render a gated name; `PrivacyBoundaryNotice`
      shown instead.
- [ ] `Dovezi` tab lists every `EvidenceRef`; per-figure "Vezi dovada" opens the
      drawer; source links labeled by kind.
- [ ] `StageBadge` offers raw stage; `StageTimeline` shows the gated state when
      history unavailable.
- [ ] `RelatedLinksRail` links out with a "why"; no money-flow diagram.
- [ ] Not-found id → domain 404; `yarn typecheck` clean; i18n done.

## Non-goals

- Full payments UX detail (delegated to `payments-ledger.md`, rendered in tab).
- Stage history semantics (delegated to `stage-timeline.md`).
- Aggregations across objectives (analytics dashboard).
- Confirming SEAP/PNRR linkage as fact (candidate-only until policy).

## Open questions (blockers only)

- None for design. Real party-name display depends on domain `B1` (review
  pipeline) and PI-1 display on `B2` (PO gate); both handled here by gating +
  guarding, so the page builds against mocks now.
