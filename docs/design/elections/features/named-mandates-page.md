# Feature: Mandate Outcomes Page (allocations now, named persons gated)

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §10.8, §15.3 (CRITICAL), §13 high-value-next.

## Feature owner profile

Frontend feature engineer (React 19, TanStack Router, shadcn/ui, Lingui) with
careful **gated-state / honest-uncertainty** copy discipline. Light data-viz.

## Summary

For a contest, show how mandates were allocated to parties/lists across
allocation phases (`competitor_mandate_allocations`, populated), and present the
named-elected-persons section as **"în curs de finalizare"** because
`elected_candidate_mandates` is empty and gated by a CHECK constraint. The page
must never present allocation counts as verified named winners.

## Facts / Decisions / Assumptions

- **Fact:** `competitor_mandate_allocations` (130,238): per contest + competitor
  mandate counts with `allocation_phase` and `is_final`. These are
  source-published allocation metrics, not named persons.
- **Fact:** `elected_candidate_mandates` = **0 rows**; a final mandate requires
  `source_names_candidate` + `final_allocation_evidence` + non-empty `evidence`
  + full source pointers. Promotion is deliberately gated to a future loader.
- **Decision:** The page ships now with the allocation panel fully functional and
  a clearly-labeled empty "Persoane alese" section: "În curs de finalizare —
  numele persoanelor alese sunt promovate doar cu dovadă completă."
- **Decision:** Provide the gate rationale inline (why named persons are not yet
  shown) via `PrivacyBoundaryNotice`, so absence reads as rigor, not a bug.
- **Decision:** When the loader eventually populates named mandates, the same
  page reveals them with verification badges (`source_names_candidate`,
  `final_allocation_evidence`) and links to candidate profiles — the design
  reserves that layout now.
- **Assumption:** Allocation phases observed are `faza_1`, `faza_2`, `final`;
  unknown phases render with their source string.

## Route and URL state

- Route: `src/routes/alegeri/mandate.$contestKey.tsx`.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `phase` | enum | `final` | `faza_1 \| faza_2 \| final \| toate` |
| `tab` | enum | `alocari` | `alocari \| persoane` |
| `sort` | enum | `mandates_desc` | allocation table sort |

## Data contract and mock states

Consumes via
`fetchContestMandates(contestKey): Promise<{ contest: ContestSummary;
election: ElectionSummary; allocations: MandateAllocation[];
namedMandates: { status: 'pending'; reason: string } | { status: 'ready';
items: NamedMandate[] }; coverage: CoverageMeta }>`.

`MandateAllocation` per domain §6. Reserved `NamedMandate` shape (not populated
in MVP):

```ts
interface NamedMandate {
  readonly mandateKey: string
  readonly sourceNamesCandidate: string   // source-published name
  readonly candidateKey: string | null    // link to candidate profile
  readonly competitorKey: string | null
  readonly competitorLabel: string | null
  readonly listPosition: number | null
  readonly finalAllocationEvidence: string // evidence summary
  readonly parliamentMandateKey: string | null
  readonly provenance: SourcePointer
}
```

Mock fixtures: `mandate-{key}.ts`. Provide: a multi-party allocation across
phases; a contest with only `final` phase; the `namedMandates: pending` state
(default); and one *future* fixture with `status: 'ready'` named mandates behind
a mock flag to validate the reserved layout.

States: allocations by phase; final-only; pending named persons; ready named
persons (mock-only preview).

## UI structure

1. `PageHeader` — H1 = "Mandate — {office}, {scope}"; badges family, finality;
   breadcrumb `Alegeri / {election} / {office} / Mandate`. Boundary chip
   `Rezultate alegeri`.
2. `CoverageRibbon`.
3. `Tabs`: `Alocări` (default) | `Persoane alese`.
4. **Alocări** — `MandateAllocationPanel`: phase `Select` (`faza_1/2/final/toate`);
   table of competitor → mandates by phase with `is_final` chip; a stacked/bar
   chart of mandate distribution; each row provenance chip; copy "Acestea sunt
   alocări pe listă/partid, nu persoane alese."
5. **Persoane alese** —
   - If `pending`: `PrivacyBoundaryNotice` + heading "În curs de finalizare" +
     the gate rationale (`reason`) + the reserved layout described, plus
     "Vezi alocările pe partid" CTA back to the Alocări tab.
   - If `ready` (future): table of named persons with
     `source_names_candidate`, list position, competitor, verification badges,
     `EvidenceLink` (final allocation evidence), candidate-profile link, and a
     separate, labeled `Vot parlamentar` link when `parliamentMandateKey` set.
6. `RelatedLinksRail` — contest explorer, competitor profiles, election hub.

## Component reuse and new components

- Reuse: `Tabs`, `Table`, `Badge`, `Select`, `Tooltip`, `Skeleton`, charts.
- Shared: `CoverageRibbon`, `DataStatusBadge`, `PrivacyBoundaryNotice`,
  `EvidenceLink`, `SourceProvenanceDrawer`, `IdentityConfidenceBadge`,
  `RelatedLinksRail`.
- New (module): `MandateAllocationPanel` (shared with contest explorer compact
  variant), `NamedMandatesSection`, `AllocationPhaseChart`.

## Interactions

- Phase select filters allocation rows/chart.
- Sort allocation table.
- Provenance chips open drawer.
- Tab switch between allocations and persons.
- (Future) named-person rows link to candidate profiles and parliament.

## Loading / empty / error / partial / stale states

- **Loading:** allocation table + chart skeletons.
- **Empty:** contest with no allocations (e.g. single-winner office) →
  `EmptyState` "Acest scrutin nu are alocări de mandate pe listă" + link to the
  contest winner.
- **Error:** retry, URL preserved; invalid key → not-found.
- **Partial:** missing phase data → `—` + tooltip.
- **Pending named persons:** the designed "în curs de finalizare" state (default
  for all contests today) — not an error.
- **Stale:** `FreshnessBadge`.

## Accessibility and i18n

- Chart paired with the allocation table (tabular fallback) and a text summary.
- The gated state is conveyed in text first; badges supplement.
- Lingui copy; `ro-RO` formatting; expand "alocare", "faza 1/2", "mandat".

## Privacy, provenance, source citation

- **CRITICAL:** allocations are never copy-written as named elected persons; the
  named section stays gated until evidence exists.
- Every figure → provenance drawer.
- Future named persons require both evidence fields + full pointers before
  display (mirrors the DB CHECK in the UI gate).
- Parliament links separate and labeled, only via `parliament_mandate_links`.

## Acceptance checklist

- [ ] Allocation panel works across phases with provenance and "alocări pe
      listă/partid" copy.
- [ ] Named-persons tab shows the gated "în curs de finalizare" state with the
      rationale by default.
- [ ] Reserved ready-state layout renders correctly behind the mock flag.
- [ ] No allocation count is presented as a named winner anywhere.
- [ ] Boundary chip present; parliament links separate/labeled.
- [ ] `yarn typecheck` clean; Lingui copy.

## Non-goals

- Running the named-mandate loader (data-pipeline work, other repo).
- Mandate-vs-vote-share deviation analytics (advanced).
- Identity resolution.

## Open questions (blockers only)

None for the page as designed. **Data-work dependency (not a design blocker):**
named persons require the gated `elected_candidate_mandates` loader; the page
ships allocation-only and reveals named persons automatically when the adapter
returns `status: 'ready'`.
