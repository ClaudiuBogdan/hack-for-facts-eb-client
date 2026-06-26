# Feature: Citation resolver

> MVP-3. Reads `docs/design/legal/design.md` (§3 routes, §6 components, §7 data
> model).

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + shadcn/ui + Lingui)
comfortable with parsing/normalization logic and ambiguous-result UX. The
parsing is light (client-side normalization + a resolve call); the care is in
honestly presenting unique vs ambiguous vs composite matches.

## Summary

A single input that accepts a real-world citation string — "Legea 227/2015",
"HG 1234/2010", "OUG 27/2022", "Ordin MS/CNAS 867/541/2011" — parses it into a
normalized citation key, resolves it via the identity tables, and routes to the
Act page. When the input is composite (joint-ministry orders) or ambiguous, it
shows ranked "did you mean" candidates instead of guessing.

## Facts / Decisions / Assumptions

- **Fact:** Identity tables exist: `legal.act_citation_keys` (type/number/year/
  issuer → act_id; one act can own several keys — joint orders) and
  `legal.act_aliases` (alias → act_id). Normalization helpers
  (`normalizeActNumber`, `issuerSlug`) exist backend-side. (`legal.md` §5, §13
  MVP-3.)
- **Fact:** Resolution ranks by `unique > cluster > alias > ambiguous`;
  composite numbers map one input → N keys. (`legal.md` §13, §15.)
- **Decision:** A `unique` resolve **navigates immediately** to
  `/legislatie/acte/$id`. Anything else stays on the resolver and lists
  candidates with `CitationConfidenceBadge`; the user picks. (`design.md` P2.)
- **Decision:** Composite/joint-order inputs show **all matching keys** and the
  joint-issuer structure ("emis în comun de MS și CNAS"), not a single forced
  match. (`legal.md` §15.)
- **Decision:** The resolver is reused as the landing page's primary search box
  (feature 7) and is embeddable; the route `/legislatie/citatie` is the
  standalone surface.
- **Assumption:** the resolve call is a GraphQL/MCP `resolve_legal_filters` /
  citation-key lookup; the adapter maps it. Client-side parsing only normalizes
  shape (act type token, number(s), year, issuer tokens) to pre-fill the query;
  authoritative resolution is server-side.

## Route and URL state

- Route: `/legislatie/citatie`. `validateSearch`: `q?: string` (raw citation).
- A `q` present on load runs the resolve immediately (deep-linkable, agent-
  friendly). Empty `q` shows the input + examples.
- On `unique` resolve, navigate (replace) to `/legislatie/acte/$id?from=citatie`.

## Data contract and mock states

```ts
type CitationParse = {
  raw: string
  actTypeToken: string | null     // "lege" | "hg" | "oug" | "ordin" | ...
  numbers: string[]               // normalized; >1 for composite/joint orders
  year: number | null
  issuerTokens: string[]          // ["ms","cnas"] for joint orders
}
type CitationCandidate = {
  actId: string
  displayCitation: string
  actType: string
  issuerLabel: string
  year: number
  status: LegalStatus
  resolution: 'unique' | 'cluster' | 'alias' | 'ambiguous'
  confidence: number | null
  matchedKey: string              // the citation key matched
  jointIssuers?: string[]         // composite structure
}
type CitationResolveResult = {
  parse: CitationParse
  candidates: CitationCandidate[]
  bestResolution: CitationCandidate['resolution'] | 'unresolved'
}
```

Mock states: unique (auto-navigates), cluster (2–3 ranked), alias match,
composite/joint (multiple keys, joint-issuer note), ambiguous (several low-
confidence), unresolved (no match → "did you mean" + free-text search fallback),
parse-only (typing, before resolve).

## UI structure

```
Page header: "Găsește un act după citare" + one-line helper
CitationInput (large, single field) + examples row (clickable):
  "Legea 227/2015"  "OUG 27/2022"  "HG 1234/2010"  "Ordin MS/CNAS 867/541/2011"
Below (after resolve):
  - Parsed interpretation chip row (tip · număr · an · emitent) — editable
  - Candidate list: each row = displayCitation · LegalStatusBadge ·
    CitationConfidenceBadge (resolution + confidence) · issuer · year → Act page
  - Composite note when numbers.length > 1
  - Unresolved: "Nu am găsit o potrivire sigură" + a button to search full text
    in /legislatie/cautare?q={raw}
```

## Component reuse and proposed new components

- Reuse: `Input`/`Command`, `Button`, `Badge`, `Tooltip`, `empty-state`,
  `filter-tag` (for parsed-interpretation chips).
- New: `CitationInput` (parser + field), `CitationCandidateRow`. Reuse
  `CitationConfidenceBadge` (built by feature 5; if feature 5 not yet built,
  this feature builds it as the shared component — `design.md` §6).

## Interactions

- Enter or "Caută" triggers resolve; unique → navigate; else render candidates.
- The parsed interpretation chips are editable (correct the year/issuer and
  re-resolve) — handles year-drift (6.5%) and issuer ambiguity gracefully.
- Example chips fill the input and resolve.
- Candidate click → Act page (`?from=citatie`).

## Loading / empty / error / partial / stale states

- **Loading:** inline progress under the input ("Caut…").
- **Empty (no input):** input + examples + a short explainer of accepted formats.
- **Unresolved:** clear "no sure match" message + full-text search fallback +
  the parsed interpretation so the user can correct it.
- **Ambiguous/composite:** candidates listed with confidence; never auto-pick.
- **Error:** inline alert + retry; `q` preserved in URL.
- **Stale:** not applicable (identity lookup); candidate Act pages carry their
  own freshness.

## Accessibility and i18n

- Input has a visible label + format hint; candidate list is an accessible
  listbox with keyboard navigation; resolution conveyed by badge text+icon.
- Lingui macros; locale year formatting; acronyms (HG/OUG/OG/MO/MS/CNAS)
  expanded in the helper text/tooltips.

## Privacy / provenance / source-citation

- Never present an ambiguous/unresolved citation as a confirmed act (P2). Show
  resolution + confidence + the matched key. Composite joint-issuer structure is
  shown explicitly so users understand multi-key matches.

## Acceptance checklist

- [ ] `/legislatie/citatie?q=Legea 227/2015` parses, resolves, and (on unique)
      navigates to `/legislatie/acte/$id`.
- [ ] Ambiguous/composite inputs list ranked candidates with confidence; no
      auto-pick.
- [ ] Joint-ministry orders show all matching keys + joint-issuer note.
- [ ] Unresolved shows a clear message + full-text search fallback + editable
      parsed interpretation.
- [ ] `q` is deep-linkable; defaults render with no params.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Free-text/semantic search (that is `/legislatie/cautare`); the resolver is
  citation-string-only with a handoff to full-text search on miss.

## Open questions (blockers only)

None.
