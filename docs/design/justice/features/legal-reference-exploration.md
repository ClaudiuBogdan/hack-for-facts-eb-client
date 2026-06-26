# Feature: Legal-Reference Exploration (Case ↔ legal.acts)

Domain: Justice · Priority: **High-value next #7 (GATED)** · Status: design-ready,
ship-blocked-on-data · Surfaces: `Acte citate` section on
`/justitie/dosare/$caseId`; `Cazuri care citează` count/sample on `/legislatie` act
pages · Companion: `../design.md`, `../ux.md` · Source:
`docs/ux-research/justice.md` §13.7, §10.5

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
shadcn/ui + Lingui), coordinating with the legal/`legislatie` domain owner for the
reverse direction. No backend. Builds gate-aware UI that renders nothing
substantive until the citation precision gate (#11) is green.

## Summary

Connects jurisprudence to legislation in both directions: on a case page, an "Acte
citate" section lists laws/acts extracted from the case `object`/`solution`/
`solution_summary` text and resolved against `legal.act_citation_keys`, each with a
resolution status (unique / ambiguous / unresolved); on a `legal.acts` page, a
"Cazuri care citează" count plus a small sample of citing cases. The lane
(`case_legal_references`) is **DDL-only/empty in v1** and gated by precision gate
#11; the UI must render an explicit "în pregătire" state until the lane is live.

## Facts / Decisions / Assumptions

- **Fact:** `case_legal_references` is gated/empty in v1; needs citation precision
  gate #11 green before exposure. Aligns with the `get_case_legal_references` MCP
  tool.
- **Fact:** `resolution_status` ∈ `unique` / `ambiguous` / `unresolved`;
  `target_act_id` resolves to `legal.acts`.
- **Fact:** Citations are extracted from case text that **may contain incidental
  person names** — but a citation is an act reference, not person data; only the
  resolved act + the raw citation token are surfaced, never surrounding person text.
- **Decision — gate-aware by default.** Driven by `laneAvailability.legalReferences`.
  Default v1 = `gated` → both surfaces show a compact "în pregătire" note and render
  no rows. No fabricated citations.
- **Decision — resolution status is always visible.** When live, each citation shows
  its status; `ambiguous`/`unresolved` are clearly marked and never link as if
  confirmed. `unique` links directly to the act; `ambiguous` may show candidate acts
  behind a disambiguation affordance; `unresolved` shows the raw citation only.
- **Decision — the reverse "Cazuri care citează" on `/legislatie`** is owned jointly
  with the legal domain; this feature specifies the justice-side contract and the
  case-page section. Cross-link uses `target_act_id` → `/legislatie` act route.
- **Assumption:** the legal domain exposes an act route (e.g.
  `/legislatie/acte/$actId` or similar). This feature links to whatever the legal
  domain's design defines; the exact act-route slug is a legal-domain decision, not a
  blocker here (link via a small adapter `buildLegalActHref(actId)`).

## Route and URL state

No dedicated route. Embedded:

- Case page `acte` tab: `/justitie/dosare/$caseId?tab=acte`.
- Legal-act page: reverse section rendered by the legal domain; this feature provides
  the data contract + a justice-side fetch.

## Data contract and mock states

Case-side adapter `fetchCaseLegalReferences(caseId)`:

```ts
type CaseLegalReferencesResult = {
  caseId: string
  references: {
    rawCitation: string                      // token as found in text
    targetActId: string | null              // -> legal.acts (null when unresolved)
    actLabel: string | null                 // resolved act title
    resolutionStatus: 'unique' | 'ambiguous' | 'unresolved'
    candidateActs?: { actId: string; label: string }[]   // for ambiguous
  }[]
  resolutionSummary: { unique: number; ambiguous: number; unresolved: number }
  laneAvailability: { legalReferences: 'gated' | 'live' }
  provenance: JusticeProvenance
}
```

Legal-act-side adapter `fetchCasesCitingAct(actId, { limit })`:

```ts
type CasesCitingActResult = {
  actId: string
  totalCitingCases: number | null
  byResolution: { unique: number; ambiguous: number; unresolved: number }
  sample: {                                  // small sample of citing cases (publishable contexts)
    caseId: string; caseNumber: string; courtName: string | null;
    resolutionStatus: 'unique' | 'ambiguous' | 'unresolved'
  }[]
  laneAvailability: { legalReferences: 'gated' | 'live' }
  provenance: JusticeProvenance
}
```

**Mock states:** (a) gated (default) → both render "în pregătire"; (b) live, mixed
resolution (unique links, ambiguous with candidates, unresolved raw-only); (c) live,
all-unique; (d) live, zero citations found for the case; (e) reverse: act with N
citing cases + sample; (f) loading/error.

## UI structure

**Case `acte` section (`LegalReferenceList`):**

1. Header "Acte citate" + `DataStatusBadge` + (when live) `resolutionSummary`
   chips (Unic N / Ambiguu N / Nerezolvat N).
2. Rows: raw citation token (monospace), resolved act label, resolution-status
   badge. `unique` → link to legal act (`buildLegalActHref`); `ambiguous` → a small
   "alege actul" disambiguation (`Popover` listing `candidateActs`); `unresolved` →
   raw token only, muted, with tooltip "Citație nerezolvată".
3. Note: "Citațiile sunt extrase automat din textul cauzei" + an `EvidenceLink`
   concept (links to the source case text region, not to person data).

**Legal-act reverse section ("Cazuri care citează"):** count + resolution breakdown
+ sample list (each → case detail) + "Vezi toate" → `/justitie/cautare` (when a
citation facet exists) or a scoped listing.

## Component reuse and new components

- Reuse: `Badge`, `Tooltip`, `Popover`, `Table`, `Skeleton`, `EmptyState`, `button`.
- New shared (data-trust): `DataStatusBadge`, `FreshnessBadge`, `EvidenceLink`,
  `SourceProvenanceDrawer`.
- New justice: `LegalReferenceList` (case-side), `CasesCitingActPanel` (reverse;
  may live in or be consumed by the legal domain).

## Interactions

- `unique` row → navigate to the resolved act page.
- `ambiguous` → open disambiguation `Popover` with candidate acts; selecting one
  navigates (no auto-confirmation of the ambiguous match).
- Reverse sample row → case detail (`from=legislatie`).
- Resolution chips can filter the visible list locally (unique/ambiguous/unresolved).

## Loading / empty / error / partial / stale states

- **Gated (default v1):** "Actele citate sunt în pregătire (precizia citărilor este
  în validare)" — no rows. `DataStatusBadge='gated'`.
- **Loading:** skeleton rows.
- **Empty (live, none found):** "Nu am identificat acte citate în textul acestei
  cauze" — note that extraction is automatic and may miss citations.
- **Partial:** references load but reverse count fails (or vice versa) → render what
  resolved + localized note.
- **Error:** retry block.
- **Stale:** muted `FreshnessBadge`.

## Accessibility and i18n

- Resolution status conveyed in text + badge (not color alone); disambiguation
  `Popover` is keyboard accessible with a labeled list.
- Raw citation tokens in `<code>`; act links have descriptive labels.
- All copy via Lingui; counts via `Intl`/`i18n.locale`; "act normativ", "citație",
  resolution terms localized.

## Privacy, provenance, source citation

- Only the **citation token + resolved act** are surfaced — never the surrounding
  case text or any person data.
- Extraction is labeled **automatic**; `ambiguous`/`unresolved` never present as
  confirmed; no inferred legal conclusions.
- `provenance` + freshness present; gated state is explicit, never silent emptiness.

## Acceptance checklist

- [ ] Both surfaces render a clear gated "în pregătire" state by default
      (`laneAvailability.legalReferences === 'gated'`), with no fabricated rows.
- [ ] When live: case section lists citations with resolution-status badges; `unique`
      links to the act, `ambiguous` offers disambiguation, `unresolved` shows raw
      token only.
- [ ] Reverse "Cazuri care citează" shows count + breakdown + sample linking to case
      detail.
- [ ] No case text or person data surfaced beyond the citation token + resolved act.
- [ ] Empty/partial/stale/error states implemented; act links use
      `buildLegalActHref`.
- [ ] `yarn typecheck` passes; strings extracted/compiled.

## Non-goals

- No legal-act citation network graph (advanced, when lane mature).
- No automatic legal interpretation/conclusions.
- No exposure of case text surrounding citations.
- No shipping before gate #11 is green (render the gated state until then).

## Open questions (true blockers only)

None for the gated/“in pregătire” build. The product decision on which resolution
statuses to expose when the lane goes live (unique only, or also ambiguous with a
warning — UX §16 Q3) is handled by the resolution-status rendering already specified;
it changes copy/links, not architecture, and does not block this build.
