# Feature: Top Publishable Litigant Rankings

Domain: Justice · Priority: **High-value next #6** · Status: build-ready
Surfaces: embedded in `/justitie/instante/$courtId` (`litiganti` tab) and as a
scoped panel on `/justitie/cautare`; deep-linkable via search facets ·
Companion: `../design.md`, `../ux.md` · Source: `docs/ux-research/justice.md`
§13.6, §12

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
shadcn/ui + Lingui). Builds a reusable ranked-list component scoped by court /
county / category. No backend.

## Summary

A ranked list of the most frequent **publishable** company/public litigants for a
chosen scope (court, county, or case category), drawn from `justice.party_name_keys`
(`mention_count`) joined to `case_parties`. Each row shows the publishable display
name, party kind, mention count, and an identity-confidence label. Persons are never
included by construction. This is the investigative leverage surface for journalists/
watchdogs — and the most direct place an identity-misattribution risk could appear,
so candidate labeling is mandatory.

## Facts / Decisions / Assumptions

- **Fact:** `justice.party_name_keys` (745,538) holds **only** publishable
  company/public names, with `mention_count`; it holds **zero** person/unknown names
  by construction.
- **Fact:** Scoping to a court/county/category requires joining `party_name_keys` ↔
  `case_parties` ↔ `cases`/`courts`. The publishable dictionary's global
  `mention_count` is corpus-wide; **scoped** counts must be computed per scope.
- **Decision — `TopLitigantsList` is one reusable component** with a `scope` prop:
  `{ kind: 'court'|'county'|'category', id, label }`. Court analytics passes the
  court; search passes the active facet scope.
- **Decision — candidate-first.** Every row carries `IdentityConfidenceBadge`
  (tier + method) and the list header carries `PrivacyBoundaryNotice(candidate-link)`.
  The list never asserts "company X is the most litigious"; copy uses "cei mai
  frecvenți litiganți publicabili (pe bază de nume)".
- **Decision — ranked horizontal bars** (count-proportional) with the count shown as
  text; not a decorative chart. Cap default to top 20 with "Vezi mai mult".
- **Assumption:** scoped mention counts are returned by the API (`get_court_caseload`
  for court scope; a resolver for county/category). If only global counts are
  available for a scope, the component shows global counts with an explicit "la nivel
  național" label rather than implying scoped counts.

## Route and URL state

No dedicated route. State is owned by the host:

- Court analytics: `tab=litiganti` (+ optional `category` to scope within the court).
- Search: rendered as a side/secondary panel reflecting the current `court`/`tier`/
  `category` facets; no extra params.
- Row "vezi cauzele" → `/justitie/cautare?court=…&q={nameKey}` (or `category=…`),
  preserving scope and `from`.

## Data contract and mock states

Adapter `fetchTopLitigants(scope, { limit })`:

```ts
type TopLitigantsResult = {
  scope: { kind: 'court'|'county'|'category'; id: string; label: string }
  countBasis: 'scoped' | 'national'         // honesty flag if only global is available
  rows: {
    nameKey: string
    displayName: string
    partyKind: 'company' | 'public_entity'
    mentionCount: number                     // within scope when countBasis='scoped'
    confidence: { tier: 'A'|'B'|'C'|'D'; method: string;
                  validationStatus: 'candidate'|'needs_review'|'rejected' }
    candidateCui: string | null              // present only when companyCandidates lane live
  }[]
  laneAvailability: { companyCandidates: 'gated' | 'live' }
  provenance: JusticeProvenance
}
```

**Mock states:** (a) court scope, scoped counts, mixed company/public, confidence
tiers A–C; (b) county scope; (c) category scope; (d) `countBasis: 'national'`
fallback (shows national-level label); (e) gated company candidates (no
`candidateCui`, no profile link — only search link); (f) empty (no publishable
litigants in scope) + loading/error.

## UI structure

1. **Header:** "Cei mai frecvenți litiganți publicabili — {scope label}" +
   `countBasis` note ("la nivelul instanței" vs "la nivel național") +
   `PrivacyBoundaryNotice(candidate-link)`.
2. **Ranked bars:** each row — rank, display name, party-kind badge (Companie /
   Instituție publică), proportional bar, `mentionCount` (locale-formatted),
   `IdentityConfidenceBadge`. Row actions: "Vezi cauzele" (→ prefiltered search) and,
   when the candidates lane is live and a `candidateCui` exists, "Vezi profilul"
   (→ `/companies/$cui` or `/entities/$cui`) labeled as candidate.
3. **Footer:** "Vezi mai mult" (raise limit) + `SourceProvenanceDrawer`.

## Component reuse and new components

- Reuse: `Badge`, `Tooltip`, `Skeleton`, `EmptyState`, `button`, `Progress`/simple
  bar (or a lightweight CSS bar), `Table` (fallback).
- New shared (data-trust): `IdentityConfidenceBadge`, `PrivacyBoundaryNotice`,
  `DataStatusBadge`, `FreshnessBadge`, `SourceProvenanceDrawer`.
- New justice: `TopLitigantsList` (the component itself; also reused in mini form on
  the company slice for top courts/categories layout parity).

## Interactions

- "Vezi cauzele" → prefiltered `/justitie/cautare` (by name key within scope).
- "Vezi profilul" (live + candidate CUI only) → company/entity profile, candidate
  label persisted.
- "Vezi mai mult" raises the limit (local state) and refetches.
- Hover on confidence badge → method + validation status (tier text always visible).

## Loading / empty / error / partial / stale states

- **Loading:** 8 skeleton ranked rows.
- **Empty:** "Niciun litigant publicabil în acest perimetru" + reminder that persons
  are excluded and counts depend on the publishable dictionary.
- **National fallback:** clear "Afișăm frecvențe la nivel național; frecvențele pe
  acest perimetru nu sunt disponibile încă."
- **Gated profile link:** company profile link hidden; only the search link shown,
  with a note that company correlation is in review.
- **Partial/error:** render what resolved + localized note; retry on error.
- **Stale:** muted `FreshnessBadge`.

## Accessibility and i18n

- Ranked list is an ordered list or a semantic table with a tabular fallback of
  name→count; bars are decorative (`aria-hidden`) with the count as the accessible
  value.
- Party-kind and confidence are conveyed in text, not color/badge alone.
- All copy via Lingui; counts via `Intl`/`i18n.locale`.

## Privacy, provenance, source citation

- **Only publishable company/public name keys** — persons structurally excluded.
- **Candidate labeling mandatory** on every row; never assert identity or wrongdoing;
  neutral "frecvent litigant", never "cel mai problematic".
- `countBasis` honesty flag prevents implying scoped frequency when only national is
  available.
- `SourceProvenanceDrawer` + freshness present.

## Acceptance checklist

- [ ] Reusable `TopLitigantsList` with `scope` prop works in court analytics and
      search.
- [ ] Rows show display name, party kind, mention count, and confidence label; no
      persons appear.
- [ ] `countBasis` (`scoped` vs `national`) is surfaced honestly.
- [ ] "Vezi cauzele" deep-links to prefiltered search; profile link only when
      candidates lane is live with a CUI, always candidate-labeled.
- [ ] Empty/national-fallback/gated/partial/stale/error states implemented.
- [ ] Accessible ranked list with tabular fallback; `yarn typecheck` passes; strings
      extracted/compiled.

## Non-goals

- No person ranking of any kind.
- No "most sued / most guilty" framing — frequency only, neutral language.
- No cross-scope comparison dashboards (advanced).
- No company auto-publish decision (gate #9 product fork).

## Open questions (true blockers only)

None. If scoped counts are not yet available from the API, the `countBasis` flag
handles it without blocking.
