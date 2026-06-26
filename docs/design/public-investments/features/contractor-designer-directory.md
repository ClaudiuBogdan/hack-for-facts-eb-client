# Feature — Contractor / Designer Directory (High-value next: N2)

> Read with `design.md` (shared shapes/routes/guardrails) and `ux.md`. **Highest
> privacy sensitivity in the domain.** The whole feature is gated behind the
> party-review pipeline (domain blocker B1) — it is designed and mock-launchable
> now; real names launch only post-review.

## Feature owner profile

Directory + privacy front-end subagent. Must implement the fail-safe party gate
correctly: the client never renders a name unless `served === true`. Familiar
with aggregated directory tables + CUI link-outs.

## Summary

`/investitii-publice/firme`: an aggregated directory of **reviewed, non-gated**
contractor/designer parties — name, CUI (when present), # objectives, total
contracted, programs, territories — with link-outs to company/procurement
records. The accountability question "who builds the most public infrastructure,
and where?" answered without exposing natural persons.

## Facts / Decisions / Assumptions

- **Fact (UX §5.1, R2, N2):** `party_evidence` carries contractor/designer/
  beneficiary parties (name + CUI), manual-review flagged, with `privacy_class`
  and `potential_natural_person`. `personal_moderate` must **not** be served;
  unreviewed `public_aggregate` names are **default-deny**.
- **Fact:** CUI is promoted only when explicitly present in source rows; many
  parties have no CUI.
- **Fact (UX R5):** SEAP/procurement matches are candidate-only, manual-review
  flagged.
- **Decision (orchestrator privacy boundary):** Only parties with
  `served === true && reviewState === 'reviewed' && privacy_class ===
  'public_aggregate' && potential_natural_person === false` appear as named rows.
  Everyone else is **either** aggregated into an "în curs de verificare" counter
  **or** omitted — never named.
- **Decision:** New route `/investitii-publice/firme` (Romanian "firme") — covers
  contractors + designers via a `rol` filter (executant / proiectant). Additive
  domain route per `design.md §3`.
- **Decision:** Cross-links are evidence-led link-outs (CUI → company/entity;
  candidate → procurement labeled), never a money-flow merge.
- **Assumption (B1):** Until the review pipeline runs, the live adapter returns
  few/zero served parties; the page ships with a prominent "directorul este în
  curs de verificare; afișăm doar firmele validate" banner + mock data for dev.

## Route and URL state

- Route: `/investitii-publice/firme` (`src/routes/investitii-publice/firme.tsx`
  + `.lazy.tsx`).
- Search params (zod, defaults stripped):

```
q:        string?                 // name/CUI search (served parties only)
roles:    ('executant'|'proiectant')[]?   // default both
programs: ProgramCode[]?
counties: string[]?               // territories where the party appears
hasCui:   boolean?                 // completeness filter
sort:     'contracted'|'objectives'|'name'|'programs'   // default 'contracted'
order:    'asc'|'desc'             // default 'desc'
page:     number                   // default 1
pageSize: number                   // default 25
cui:      string?                  // pre-filter to one party (linked from detail "# obiective")
dovada:   string?                  // evidence deep-link
```

## Data contract and mock states

Adapter: `src/features/public-investments/api/directory.live.ts` +
`directory.mock.ts`.

```ts
type DirectoryParty = {
  readonly partyId: string
  readonly displayName: string        // present ONLY for served parties
  readonly cui: string | null
  readonly roles: readonly ('executant'|'proiectant')[]
  readonly objectiveCount: number
  readonly contractedTotal: MoneyValue   // guarded; sums only served-party objectives
  readonly programs: readonly ProgramCode[]
  readonly counties: ReadonlyArray<{ code: string; name: string }>
  readonly candidateSeapCount: number    // labeled, candidate-only
  readonly evidenceRef: EvidenceRef
}
type DirectoryData = {
  readonly parties: readonly DirectoryParty[]   // served only
  readonly total: number                         // served parties total
  readonly withheldCount: number                 // gated/unreviewed parties NOT shown
  readonly status: DomainDataStatus
  readonly reviewPipelineActive: boolean         // B1 state
}
```

- **Mock states:** (1) several reviewed firms ranked by contracted; (2)
  `withheldCount` large → prominent `PrivacyBoundaryNotice` aggregate; (3)
  `reviewPipelineActive: false` (pre-review) → only a banner + minimal/empty list;
  (4) party with no CUI (no company link, "fără CUI în sursă"); (5) party with
  `candidateSeapCount > 0` → candidate-only procurement note; (6) PI-1 suspect
  totals guarded.

## UI structure

1. **Header** — breadcrumb, H1 "Constructori și proiectanți", subtitle "Firmele
   care execută și proiectează obiective de investiții publice". `CoverageRibbon`
   + `FreshnessBadge`.
2. **Privacy banner** (always, prominent) — `PrivacyBoundaryNotice`: "Afișăm doar
   firmele validate. {withheldCount} părți sunt reținute (persoane fizice / PFA
   sau neverificate) și nu sunt afișate." If `reviewPipelineActive === false`,
   escalate to a full-width notice that the directory is pre-validation.
3. **Sticky filter bar** — `q` search, `roles` toggle (Executant/Proiectant),
   Program `MultiSelect`, County `MultiSelect`, `hasCui` toggle,
   `active-filters-bar`.
4. **Directory table** — columns: Firmă (name + role badges), CUI (link →
   `/companies/$cui` or `/entities/$cui`, or "fără CUI"), Nr. obiective (→
   `/investitii-publice/cautare?...&q=` scoped, or a party objectives view),
   Total contractat (`AmountWithEvidence`), Programe (`ProgramChip` set),
   Județe (count + tooltip list), Dovadă (`EvidenceLink`). Sort on
   contracted/objectives/name/programs. `Pagination`.
5. **Candidate SEAP note** — where `candidateSeapCount > 0`, a small "posibile
   corespondențe SEAP ({n}) — în curs de verificare" → `/achizitii` (labeled,
   never as confirmed award).
6. **Footer** — methodology link (`HowToReadData`: how totals are aggregated,
   that only validated firms are shown, that CUI links are evidence-led).

## Component reuse and proposed new components

- Reuse: `Table`, `MultiSelect`, `toggle-group`, `Badge`, `Tooltip`,
  `active-filters-bar`, `filter-tag`, `Pagination`, `Skeleton`, `EmptyState`,
  `copy-button`.
- Shared trust: `PrivacyBoundaryNotice` (central here), `CoverageRibbon`,
  `FreshnessBadge`, `DataStatusBadge`, `EvidenceLink`, `SourceProvenanceDrawer`,
  `RelatedLinksRail`.
- New PI: `AmountWithEvidence`, `ProgramChip`, `HowToReadData`.

## Interactions

- Filters/sort/page → search params. `cui` param pre-filters to one party.
- CUI link → company/entity. "Nr. obiective" → scoped objectives list. Candidate
  SEAP → procurement (labeled). "Vezi dovada" → drawer.
- Search `q` matches served names + CUIs only.

## Loading / empty / error / partial / stale

- **Loading:** filter bar interactive; table skeleton rows.
- **Empty:** no served parties matching filters → `EmptyState` "Nicio firmă
  validată pentru aceste filtre" + (if `reviewPipelineActive===false`) the
  pre-validation explanation. Never imply "no contractors exist" — distinguish
  "no validated/served rows" from "no data".
- **Error:** error card + retry, URL intact.
- **Partial:** `withheldCount` always disclosed; parties without CUI shown
  unlinked with a note; suspect totals guarded.
- **Stale:** `FreshnessBadge` muted; data-status notice when PI-1 active.

## Accessibility and i18n

- Semantic table + `aria-sort`; role badges text+color; CUI links labelled.
  Privacy banner is a real, focusable region announced to screen readers
  (`role="note"`/heading). Lingui throughout; CUI/SEAP/PFA expanded on first use.

## Privacy / provenance (the core of this feature)

- **Fail-safe gate (mandatory):** the client renders a name **only** if
  `served === true`. It must additionally treat
  `potential_natural_person === true` OR `privacy_class === 'personal_moderate'`
  OR `reviewState === 'unreviewed'` as withheld even if `served` is mistakenly
  true — defense in depth against an API leak. Withheld parties never appear in
  rows, search, facets, CSV, or tooltips; they only contribute to
  `withheldCount`.
- **No CSV of names without gate:** if an export is added later, it inherits the
  same gate and excludes any non-served party.
- Every named row carries `EvidenceLink`; SEAP matches are candidate-only and
  explicitly labeled (UX R5).

## Acceptance checklist

- [ ] `/investitii-publice/firme` renders default (no params) directory of
      served parties only, sorted by contracted desc.
- [ ] `PrivacyBoundaryNotice` always shown with `withheldCount`; pre-validation
      banner when `reviewPipelineActive===false`.
- [ ] No gated/unreviewed/person-like party is ever named (rows, search, facets,
      tooltips) — verified against mock state (2)/(3).
- [ ] CUI links out to company/entity; "fără CUI" handled; candidate SEAP labeled
      and never shown as confirmed.
- [ ] Totals guarded (`AmountWithEvidence`); evidence link per row; empty vs.
      no-data distinguished; `yarn typecheck` clean; i18n done.

## Non-goals

- Exposing unreviewed or person-like parties in any form (hard rule).
- Confirming SEAP awards (candidate-only until policy).
- Contractor concentration/network charts (reserved/advanced, UX §12).
- A per-party profile page (MVP links out to existing company/entity profiles;
  a dedicated party page is a later enhancement).

## Open questions (blockers only)

- **B1 (domain):** real-name launch depends on the `public_aggregate` party
  review pipeline (UX Open Q4). Design + mock build proceed now; this only blocks
  switching the live adapter to real names. No design decision is blocked.
