# Feature: Identity-Confidence Communication

> MVP-4 — addresses the domain's #1 UX risk: mistaking a name-only registry record for
> a confirmed ONG. Source UX: `docs/ux-research/ngos.md` §13 MVP-4, §15 (central UX
> risk). Domain design: `docs/design/ngos/design.md`. Foundation:
> `IdentityConfidenceBadge`, `PrivacyBoundaryNotice`.

## Feature owner profile

Frontend implementation subagent specializing in **shared UI primitives + content
design** (React 19 + TypeScript, shadcn `Badge`/`Tooltip`, Lingui, class-variance
authority). Owns a small, well-tested cross-cutting component set and the exact
Romanian copy for identity confidence. This is a dependency of MVP-1, Next-2, and
MVP-3; build it first.

## Summary

A consistent, three-level visual language that tells users whether an organization's
data is **confirmed via CUI**, a **name-only registry reference (unconfirmed)**, or a
**candidate match** (a review case with a confidence score). It standardizes one badge
component, the rules for separating confirmed vs name-only content, and the row-level
display of `review_status`/`confidence`, so no surface invents trust the data doesn't
support.

## Facts / Decisions / Assumptions

- **Fact:** The domain deliberately does NOT force-merge name-only records.
  `identity_basis ∈ {direct_cui, name_review, external_projection, none}`;
  `review_status ∈ {accepted, review_pending, rejected, unmatched}`;
  `confidence ∈ [0,1]`. MJ (126,011) and SGG (229) are name-only and not promoted.
- **Fact:** `link_review_cases` hold candidate name-only→CUI matches with
  `method`, `confidence`, `compared_fields`, `decision_notes`, and `review_status ∈
  {pending, accepted, rejected, needs_more_evidence}`.
- **Decision — three levels (UX §15):**
  1. **Profile-level badge** — `Identitate confirmată prin CUI` (confirmed) vs
     `Identitate neconfirmată — doar referință în registru` (name-only).
  2. **Section-level separation** — name-only MJ/SGG content lives in a visually
     distinct, labeled zone "Referințe neconfirmate" / "Nu a fost asociat unui CUI
     confirmat".
  3. **Row-level** — each evidence/reference row shows `review_status` and `confidence`
     (when < 1) and links to its `link_review_cases` entry when one exists.
- **Decision — copy guardrails (UX/foundation):** `identitate confirmată prin CUI` for
  direct-CUI; `referință din registru — identitate neconfirmată` for name-only.
- **Decision — candidate matches only with evidence:** Never say "this might be the
  same as…"; show "Posibilă potrivire" only when a `link_review_case` with a confidence
  exists, labeled a candidate, with the confidence shown.
- **Decision — color is never the only signal:** confirmed = neutral/positive
  treatment; name-only = amber; each always paired with text + icon.
- **Assumption:** `external_projection` (e.g. funding projection) is treated as
  "confirmat (proiecție externă)" — confirmed CUI basis but from another domain's
  projection; labeled distinctly but in the confirmed family. Marked assumption.

## Route and URL state

- **No own route.** This feature is a component + content library consumed by other
  surfaces. No URL state of its own.
- It influences, but does not own, the profile `?evidence=` param and the name-only
  surfaces' filters (`identity` facet).

## Data contract and mock states

```ts
type IdentityBasis = 'direct_cui' | 'name_review' | 'external_projection' | 'none'
type ReviewStatus = 'accepted' | 'review_pending' | 'rejected' | 'unmatched'

type IdentityConfidence = {
  basis: IdentityBasis
  reviewStatus?: ReviewStatus
  confidence?: number | null            // 0–1
  linkReviewCaseId?: string | null      // present when a candidate match exists
}

// Resolved presentation tier (computed in the component, not by callers):
type ConfidenceTier = 'confirmed' | 'candidate' | 'unconfirmed' | 'rejected'
```

**Tier resolution (pure function, unit-tested):**
- `direct_cui` + `accepted` → `confirmed`.
- `external_projection` + `accepted` → `confirmed` (variant "proiecție externă").
- `name_review`/`none` with a `linkReviewCaseId` and `confidence != null` →
  `candidate`.
- `name_review`/`none` without a usable case, or `review_pending`/`unmatched` →
  `unconfirmed`.
- `rejected` → `rejected` (shown only in staff/trail contexts, muted).

**Mock states:** one `IdentityConfidence` example per tier (confirmed, confirmed-
projection, candidate@0.62, unconfirmed, rejected) for component stories/tests.

## UI structure

### `IdentityConfidenceBadge`
- **Confirmed:** check icon + "Identitate confirmată prin CUI" (neutral/`success`
  variant). Tooltip: "Datele sunt asociate unui CUI confirmat în registrul central."
- **Confirmed (proiecție externă):** "Confirmat (proiecție externă)" — same family,
  distinct label.
- **Candidate:** dotted/half icon + "Posibilă potrivire" + confidence % (amber).
  Tooltip explains it's an unverified candidate from a review case.
- **Unconfirmed:** warning icon + "Identitate neconfirmată — referință din registru"
  (amber `warning` variant). Tooltip: "Înregistrare din registru public, neasociată
  unui CUI confirmat."
- **Rejected:** muted "Potrivire respinsă" (used only in trail/staff).
- Props: `IdentityConfidence`; optional `size`, `showConfidence`. Always text + icon;
  `aria-label` mirrors the visible label + confidence.

### Section-separation pattern (`UnconfirmedReferencesZone`)
A labeled container (amber left border, not a nested card) that wraps name-only MJ/SGG
content with a heading "Referințe neconfirmate" and a `PrivacyBoundaryNotice`:
"Aceste înregistrări provin din registre publice (MJ, SGG) și nu au fost asociate unui
CUI confirmat. Sunt afișate ca referințe, nu ca identitatea confirmată a organizației."
Consumed by the profile and name-only surfaces.

### Row-level treatment
A helper that, given an `EvidenceRecord`/reference row, renders `review_status`
(plain language) + `confidence` (when < 1) + an `IdentityConfidenceBadge`, and a
"Vezi cazul de revizuire" link when `linkReviewCaseId` is set.

## Component reuse and proposed new components

- **Reuse:** `Badge` (variant base), `Tooltip`, lucide icons (`BadgeCheck`,
  `CircleHelp`, `TriangleAlert`).
- **Consume:** `PrivacyBoundaryNotice` (foundation).
- **New (owned here, promote to `src/components/identity/`):**
  - `IdentityConfidenceBadge` — the canonical badge with tier resolution.
  - `resolveConfidenceTier(input): ConfidenceTier` — pure, unit-tested.
  - `UnconfirmedReferencesZone` — the section-separation wrapper.
  - `IdentityRowMeta` — row-level review_status/confidence/link helper.

## Interactions

- Badge hover/focus → tooltip with the plain-language explanation (never the only
  carrier of critical info — the label already states the tier).
- "Vezi cazul de revizuire" → opens the review-case detail (drawer) with
  `compared_fields` + `confidence`; does not navigate as if confirmed.
- No actions that merge/confirm identity from public surfaces (that's the staff queue).

## Loading, empty, error, partial, stale states

- **Loading:** badge renders a neutral skeleton pill.
- **Empty/unknown basis:** if `basis` is missing, default to `unconfirmed` (fail safe —
  never imply confirmation we don't have) and log a dev warning.
- **Partial:** `confidence` null → show tier without a percentage.
- **Error/stale:** N/A (pure presentation of provided data).

## Accessibility and i18n

- Every badge has visible text + icon + `aria-label`; color is supplementary.
- Tooltips are supplementary, keyboard-focusable, never the sole source of meaning.
- All copy via Lingui; exact guardrail strings: `Identitate confirmată prin CUI` /
  `Referință din registru — identitate neconfirmată` / `Posibilă potrivire`.
- Confidence formatted as a locale percentage.

## Privacy, provenance, and source-citation behavior

- This feature encodes the no-auto-merge policy in the UI: fail-safe to unconfirmed,
  candidates only with a review case, no speculative identity language.
- Pairs with `evidence-trail-source-citations.md`: identity tier sits next to the
  source citation so users see both *who says it* and *how sure we are it's this org*.

## Acceptance checklist

- [ ] `IdentityConfidenceBadge` renders all five tiers with text + icon + `aria-label`.
- [ ] `resolveConfidenceTier` is pure and unit-tested across all input combinations,
      including fail-safe defaults for missing/odd inputs.
- [ ] `UnconfirmedReferencesZone` wraps name-only content with the standard notice and
      copy guardrail strings.
- [ ] Row-level helper shows `review_status` + `confidence` and links to review cases
      when present.
- [ ] No surface presents a name-only record as confirmed identity (verified by
      consuming features' tests).
- [ ] `yarn typecheck` clean; Lingui extracted/compiled.

## Non-goals

- No staff accept/reject/needs-more-evidence actions (advanced link-review queue).
- No automated matching or merging logic in the client.
- No per-domain bespoke confidence styles — this is the single source of truth.

## Open questions (blockers only)

None. (Non-blocking: treatment label for `external_projection` is decided here as a
confirmed-family variant and can be revisited if product prefers a separate tier.)
