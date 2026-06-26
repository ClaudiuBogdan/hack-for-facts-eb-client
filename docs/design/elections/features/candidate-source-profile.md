# Feature: Candidate Profile (source-evidence-first)

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §10.5, §13.4, §15.1 (CRITICAL risk). **The identity-caveat contract is the
> point of this page.**

## Feature owner profile

Frontend feature engineer (React 19, TanStack Router, shadcn/ui, Lingui) with
strong attention to **provenance/identity copy and privacy boundaries**. No
heavy data-viz needed.

## Summary

Show everything the corpus knows about a candidate **as published by sources** —
the source candidate label, optional source person name, and every candidacy
(contest, competitor, ballot/list position) — wrapped in an unmistakable
"Nume din sursă — identitate nerezolvată" contract. Never asserts a real-person
identity or merges look-alike names. Sets up the future identity-resolution and
parliament-link story honestly.

## Facts / Decisions / Assumptions

- **Fact:** `candidates` (471,770): `candidate_key, source_family,
  source_candidate_label, source_person_name`. Names are source labels only.
- **Fact:** `candidacies` (471,770): link candidate→contest (+optional
  competitor) with `ballot_position, list_position, is_final_list,
  alliance_member_label`.
- **Fact:** `candidate_person_links` is empty → no resolved identity, no
  confidence; `parliament_mandate_links` empty → no MP link yet.
- **Decision:** Page header carries a permanent `IdentityCaveatBanner`:
  `Nume din sursă — identitate nerezolvată`, with an `IdentityConfidenceBadge`
  set to `nerezolvat`.
- **Decision:** This profile is scoped to a single `candidate_key` (one source
  appearance cluster), **not** a merged person. Other candidate keys with the
  same label string are shown only as a "posibile potriviri (neconfirmate)"
  list, never merged.
- **Decision:** List-level placeholders without a `source_person_name` are
  excluded from this named-candidate view (per UX §15.1); if the route resolves
  to such a placeholder, render the "fără nume publicat" empty/redirect state.
- **Decision:** Parliament activity block is present but rendered "indisponibil
  încă" until `parliament_mandate_links` populates; clearly labeled
  `Vot parlamentar` separate from `Rezultate alegeri`.
- **Assumption:** Candidate-scoped vote figures appear only where the source
  published candidate-level results; otherwise only candidacy metadata shows.

## Route and URL state

- Route: `src/routes/alegeri/candidat.$candidateKey.tsx`
  (`/alegeri/candidat/$candidateKey`).

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `tab` | enum | `candidaturi` | `candidaturi \| identitate` |
| `family` | csv enum | all | filter candidacies by family |
| `yearFrom`/`yearTo` | int | none | |
| `sort` | enum | `year_desc` | candidacy sort |

## Data contract and mock states

Consumes `CandidateProfile` (domain §6) via
`fetchCandidateProfile(candidateKey, params): Promise<CandidateProfile>` and
`fetchCandidateLookalikes(candidateKey): Promise<{ candidateKey: string;
sourceCandidateLabel: string; sourceFamily: string }[]>` (string-similar, not
resolved).

Mock fixtures: `candidate-{key}.ts`. Provide: a candidate with multiple
candidacies under one competitor; a candidate with candidacies under different
competitors across years; an independent with candidate-level votes; a candidate
with `source_person_name=null` (placeholder → excluded state); a candidate with
≥2 look-alike keys.

States: rich candidacy history; single candidacy; placeholder/no-name; look-alike
collisions; candidate-level votes present vs absent.

## UI structure

1. `PageHeader` — H1 = `source_candidate_label` (verbatim); subtitle =
   `source_person_name` if present, muted, with a `(nume din sursă)` suffix.
   Breadcrumb `Alegeri / Candidați / {label}`.
2. **`IdentityCaveatBanner`** (always, directly under header) —
   `IdentityConfidenceBadge` = "Identitate nerezolvată" + one line: "Acesta este
   un nume preluat din sursa oficială. Nu este o identitate de persoană
   verificată. Persoanele cu nume identic pot fi diferite."
3. `CoverageRibbon`.
4. `Tabs`: `Candidaturi` (default) | `Identitate`.
5. **Candidaturi** — filter bar (family, year) + `CandidacyList`: each row =
   election + year + office + scope + competitor label (link to
   `/alegeri/partid/$competitorKey`) + ballot/list position + `is_final_list`
   chip + alliance member label + candidate votes (if any) + provenance chip +
   link to `/alegeri/contest/$contestKey`.
6. **Identitate** — explains the source-evidence model: source family, why no
   person identity is asserted, the future resolution roadmap (method +
   confidence when shipped), and the "posibile potriviri (neconfirmate)"
   look-alike list (each links to its own candidate profile, labeled "posibil
   aceeași persoană — neconfirmat"). Includes `PrivacyBoundaryNotice`.
7. **Activitate parlamentară** (rail/section) — labeled `Vot parlamentar`,
   currently "indisponibil încă (legătura alegeri→parlament în lucru)"; never
   implies candidate == MP.
8. `RelatedLinksRail` — competitor profile(s), election hub(s), the contests.

## Component reuse and new components

- Reuse: `Tabs`, `Table`, `Badge`, `Tooltip`, `Skeleton`, `Card` (rows).
- Shared: `CoverageRibbon`, `DataStatusBadge`, `IdentityConfidenceBadge`,
  `PrivacyBoundaryNotice`, `EvidenceLink`, `SourceProvenanceDrawer`,
  `RelatedLinksRail`.
- New (module): `IdentityCaveatBanner`, `CandidacyList` (shared with contest
  explorer — build once), `LookalikeList`.

## Interactions

- Tab/filter changes update URL + refetch.
- Candidacy row links to contest; competitor chip to competitor profile.
- Provenance chip opens drawer.
- Look-alike row navigates to that candidate key (never merges state).

## Loading / empty / error / partial / stale states

- **Loading:** header + banner skeleton, candidacy list skeleton.
- **Empty:** valid key with no candidacies after filters → `EmptyState`; key
  that is a no-name placeholder → "Acest rând este o poziție de listă fără nume
  publicat" + link back to the contest's candidacy roster.
- **Error:** retry, URL preserved; invalid key → not-found.
- **Partial:** missing candidate-level votes → `—` + tooltip "rezultat pe
  candidat nepublicat de sursă".
- **Stale:** `FreshnessBadge`.

## Accessibility and i18n

- The identity caveat is conveyed by text (not color/badge alone) and is the
  first content after the title, in document order, for screen readers.
- Tables semantic; links labelled.
- Lingui macros; `ro-RO` formatting; expand `is_final_list`, ballot/list
  position terms in tooltips.

## Privacy, provenance, source citation

- **CRITICAL:** "Nume din sursă — identitate nerezolvată" present and prominent;
  never auto-merge by name; look-alikes explicitly "neconfirmat".
- **Boundary:** parliament block separate and labeled `Vot parlamentar`,
  "indisponibil încă".
- Every figure → provenance drawer; source family shown.

## Acceptance checklist

- [ ] Identity caveat banner is always present and first after the title.
- [ ] Profile scoped to one `candidate_key`; no name-string merging.
- [ ] Look-alikes shown only as unconfirmed possible matches, separately linked.
- [ ] No-name placeholder route renders the excluded state, not a fake profile.
- [ ] Candidacies link to contests + competitors; provenance per row.
- [ ] Parliament block separate, labeled, "indisponibil încă".
- [ ] `yarn typecheck` clean; Lingui copy.

## Non-goals

- Identity resolution / merge UI (advanced, pending data).
- Election→parliament navigation (pending `parliament_mandate_links`).
- Person-level cross-election timeline (would require resolved identity).

## Open questions (blockers only)

None for mock-first. Identity resolution and parliament linkage are data
dependencies designed around (caveat + "indisponibil încă"), not blockers.
