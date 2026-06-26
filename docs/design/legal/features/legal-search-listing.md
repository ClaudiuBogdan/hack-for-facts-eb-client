# Feature: Legal search & listing with facets

> MVP-2. Reads `docs/design/legal/design.md` (§3 routes, §5 URL state, §6
> components, §7 data model).

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + shadcn/ui + Lingui)
with search-UI experience. Should reuse the existing `entity-search` feature and
`base-filter` system rather than build new search infrastructure.

## Summary

Turns 223k acts into a browsable corpus. A search bar + facet rail returns
result rows with a status badge, type, issuer, year, and a plain-language
summary snippet. The page enforces two domain rules: **canonical-by-default with
a historical-mode toggle**, and a **Portal-acts vs MO-only lane separation**
until MO promotion lands.

## Facts / Decisions / Assumptions

- **Fact:** The global `searchEntities` GraphQL query + `/experimental/search`
  page already support `docTypes` including `legal_act` and `mo_act`, with
  facets, `county`, `year`, and typed hits (`src/schemas/entity-search.ts`).
  This feature reuses that contract and the `entity-search/components/*` pattern
  (input, results, facet chips, skeleton, empty state, load-more).
- **Fact:** Today `legal_act`/`mo_act` hits route to an **external** URL
  (`src/features/entity-search/lib/entity-search-routing.ts` ~lines 15-16);
  `DOC_TYPE_META.legal_act` label = "Legislație", color violet.
- **Decision:** This feature owns the one existing-file change the domain needs:
  update `entityHref`/routing so resolved `legal_act` hits route internally to
  `/legislatie/acte/$id` (fall back to external `url` when no internal `actId`).
  Keep `mo_act` external until the MO issue/act surfaces exist. This change is
  additive and gated by presence of an internal id.
- **Decision:** Two listing lanes via `source` param: `portal` (default) and
  `mo` (MO-only publications). They never mix in one result set. (`design.md`
  P3.) The MO lane is labelled "Publicații Monitorul Oficial (posibil neincluse
  în Portal Legislativ)" and links rows to the MO issue, not an act page, when
  unresolved.
- **Decision:** `historical=false` by default hides `abrogat`/
  `iesit-din-vigoare` acts; the toggle includes them. (`legal.md` §11; P7.)
- **Decision:** Type facet includes an "Altele / netipizat" bucket (≈15% untyped
  + mistypes). Issuer facet de-duplicates on `issuerSlug`, shows normalized
  label, keeps raw as evidence in a tooltip. (`legal.md` §6.)
- **Assumption:** facet field names (type, issuer, status, domain, audience,
  version_kind) map onto the `searchEntities` facets array; the adapter
  reconciles exact field keys.

## Route and URL state

- Route: `/legislatie/cautare`. `validateSearch` Zod schema (graceful defaults):
  `q?`, `type?` (repeatable), `issuer?` (repeatable), `year?` (number),
  `status?` (repeatable 7-value), `domain?` (repeatable), `audience?`
  (repeatable), `versionKind?`, `source?` = `portal` | `mo` (default `portal`),
  `historical?` (boolean, default false), `sort?` = `relevance` | `date` |
  `inforce` | `indegree` | `recent`, `page?`, `pageSize?`.
- Repeatable params follow the `entity-search` pattern (`z.union([array,
  string]).transform(...)`).
- Default view (no params) shows a prompt + popular/recent acts, not an empty
  grid.

## Data contract and mock states

Result row (projection of `LegalAct`, search-shaped):

```ts
type LegalSearchHit = {
  actId: string | null            // null for unresolved MO-only rows
  issueId: string | null          // MO lane: link target when actId is null
  displayCitation: string
  actType: string
  issuerLabel: string; issuerRaw: string | null
  year: number
  status: LegalStatus | null      // null in MO lane until promoted
  modificationCount: number | null
  snippet: string | null          // plain_language_summary / summary excerpt
  lane: 'portal' | 'mo'
  resolution?: 'unique' | 'ambiguous' | 'unmatched'  // MO lane only
}
```

Mock states: results (mixed types), single result, zero results (with active
filters), MO-lane results (some unresolved → labelled "potrivire posibilă"),
loading (skeleton rows), error.

## UI structure

```
Page header: "Caută în legislație" + CoverageRibbon (lane coverage note)
Sticky search bar: [q input] [lane toggle: Portal | Monitorul] [historical switch] [sort Select]
Two columns:
  Facet rail (left, base-filter Accordions): Tip act · Emitent · An · Status ·
    Domeniu · Audiență · Versiune
  Results (right): ActiveFiltersBar (filter-tag chips) → result rows → Pagination/LoadMore
Mobile: facets in a "Filtre" Sheet; results single column.
```

Result row: `displayCitation` (link) · `LegalStatusBadge` · type · issuer · year
· snippet (2 lines) · "modificat de N". MO-lane unresolved rows show
`CitationConfidenceBadge` and link to the MO issue, not an act page.

## Component reuse and proposed new components

- Reuse: `entity-search/components/*` (input, results, facet chips, skeleton,
  empty-state, load-more) and `searchEntities` API; `base-filter/*`
  (`FilterContainer`, `FilterListContainer`, `FilterRangeContainer`,
  `SelectedOptionsDisplay`); `Select`, `Switch`, `toggle-group`, `Pagination`,
  `active-filters-bar`, `filter-tag`, `Sheet`.
- New: a thin `LegalSearchPage` orchestrator + `LegalSearchRow` (wrapping
  `LegalStatusBadge`). `CoverageRibbon` (shared) for the lane note.
- Reuse `ShareFilteredView` (shared) to copy the current filtered URL.

## Interactions

- Typing debounces (reuse entity-search debounce); facet toggles update URL +
  refetch; lane toggle swaps the result lane and the available facets; historical
  switch toggles abrogated inclusion; sort changes ordering; row click → Act page
  (portal) or MO issue (unresolved MO).
- Keyboard: arrow-key navigation through result rows (reuse entity-search
  listbox pattern), Enter opens.

## Loading / empty / error / partial / stale states

- **Loading:** skeleton rows + facet skeletons.
- **Empty (no results):** `empty-state` "Niciun act nu corespunde filtrelor" +
  a "Șterge filtrele" action; if MO lane, add the coverage caveat.
- **Empty (no query, default):** popular/recent acts list + a hint to use the
  citation resolver for a known number.
- **Error:** inline alert + retry; URL intact.
- **Partial:** if MO lane coverage is metadata-only, the `CoverageRibbon` states
  it; unresolved rows are clearly non-links.
- **Stale:** `FreshnessBadge` on the ribbon.

## Accessibility and i18n

- Search input labelled; results are an accessible listbox; facets are labelled
  groups; status via badge text+icon. Lingui macros throughout; locale dates/
  numbers; acronyms expanded in facet labels/tooltips.

## Privacy / provenance / source-citation

- Lane separation (P3) and coverage honesty (P4) are mandatory. Snippets are
  source/AI-derived; the row's link target is the authoritative Act page where
  the `AIProvenanceNotice` lives. Unresolved MO rows show resolution + confidence
  (P2), never as hard act links.

## Acceptance checklist

- [ ] `/legislatie/cautare` lists acts with status badge + snippet from mock;
      facets filter via URL; defaults render with no params.
- [ ] Canonical default; historical toggle includes abrogated acts.
- [ ] Portal and MO lanes never mix; MO lane labelled and unresolved rows are
      non-links with confidence.
- [ ] Type facet has an "Altele / netipizat" bucket; issuer de-duped with raw
      evidence in tooltip.
- [ ] `entityHref` updated so resolved `legal_act` hits route to
      `/legislatie/acte/$id` (external fallback retained).
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Semantic/RAG search (ADV-1); MO section full-text search (ADV-2); saved
  searches/alerts (ADV-6); the analytics dashboard.

## Open questions (blockers only)

None. (MO promotion policy is handled by the lane split; no blocker.)
