# Feature: Case Search / Listing (Metadata Filters)

Domain: Justice · Priority: **MVP #5** · Status: build-ready
Route: `/justitie/cautare` · Companion: `../design.md`, `../ux.md` ·
Source: `docs/ux-research/justice.md` §13.5, §11

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
shadcn/ui + base-filter components + Lingui). Must implement a faceted, URL-driven
search with a strict no-person-field policy. No backend.

## Summary

A faceted search/listing for cases using **safe metadata fields only**: court, court
tier, case category, stage, year/date range, party kind, party role, appeal presence,
plus a text box restricted to court name / case number / publishable
company-public litigant name. Results render in a sortable, paginated table. There is
**no person-name field** and **no full-text search over case object/solution text**.

## Facts / Decisions / Assumptions

- **Fact:** Uses `justice.cases` + `justice.courts` + `case_parties` (kinds/roles
  only). Aligns with the `resolve_judicial_filters` MCP tool.
- **Fact:** Filter cardinalities — 11 categories, 17 stages, 316 departments; party
  roles use the `role_normalized` controlled vocabulary.
- **Fact:** Full-text over `object`/`solution`/`solution_summary` is **reserved**
  (incidental person names → re-identification risk); not offered in v1. Person-name
  search is **not offered** by policy.
- **Decision — `q` is constrained.** The text box matches court names, case numbers
  (`NNNN/CC/YYYY` + `case_number_old`), and publishable litigant name keys only. The
  adapter routes `q` to these indexes, never to case text or persons. Helper text
  states this.
- **Decision — facets use the base-filter pattern** (`FilterContainer` +
  `FilterListContainer`/`FilterRadioContainer`) and sync to URL search params via
  `useNavigate`, exactly like `EntityAnalyticsFilter`.
- **Decision — multi-value facets** (category, stage, role) use comma-separated
  strings parsed by the route schema; single-value facets (tier, partyKind,
  hasAppeal) use plain values.
- **Decision — coverage-aware empties.** Zero results → "Nu am găsit cauze
  publicabile pentru aceste filtre în acoperirea curentă", never "nu există".
- **Assumption:** the API supports server-side pagination + sort; the client passes
  `page`/`pageSize`/`sort` and renders the returned page.

## Route and URL state

`src/routes/justitie/cautare.tsx`:

```ts
export const Route = createFileRoute('/justitie/cautare')({
  validateSearch: parseCaseSearch,          // src/schemas/justice.ts
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => fetchCaseSearch(deps),
  head: () => ({ meta: [{ title: 'Caută cauze — Justiție' }] }),
})
```

```ts
const caseSearchSchema = z.object({
  q: z.string().optional().catch(undefined),                 // court/number/litigant ONLY
  court: z.string().optional().catch(undefined),             // institution_code
  tier: z.enum(['judecatorie','tribunal','tribunal_militar',
                'curte_de_apel','curte_militara_apel']).optional().catch(undefined),
  category: z.string().optional().catch(undefined),          // comma-separated
  stage: z.string().optional().catch(undefined),             // comma-separated
  year: z.coerce.number().int().optional().catch(undefined),
  partyKind: z.enum(['company','public_entity']).optional().catch(undefined),
  role: z.string().optional().catch(undefined),              // comma-separated role_normalized
  hasAppeal: z.enum(['true','false']).optional().catch(undefined),
  sort: z.enum(['recent','oldest','court','category']).optional().catch('recent'),
  page: z.coerce.number().int().min(1).optional().catch(1),
  pageSize: z.coerce.number().int().optional().catch(25),
  from: z.string().optional().catch(undefined),
})
```

- `partyKind` is intentionally limited to `company`/`public_entity` — `person`/
  `unknown` are **not selectable** (they would imply person filtering).

## Data contract and mock states

Adapter `fetchCaseSearch(params)`:

```ts
type CaseSearchResult = {
  rows: {
    caseId: string; institutionCode: string; courtName: string | null;
    caseNumber: string; stageName: string | null; categoryName: string | null;
    sourceOpenedAt: string | null; latestHearingAt: string | null;
    hasAppeal: boolean;
    namedPartiesPreview: { displayName: string; role: string }[];  // publishable only, max ~2
    personPartyCount: number;                                       // aggregate, for context
  }[]
  facets: {                                  // counts for available facet values
    tiers: { value: string; count: number }[]
    categories: { value: string; label: string; count: number }[]
    stages: { value: string; label: string; count: number }[]
    roles: { value: string; count: number }[]
    years: { year: number; count: number }[]
  }
  pagination: { page: number; pageSize: number; total: number }
  provenance: JusticeProvenance
}
```

**Mock states:** (a) broad result set (default sort `recent`), (b) heavily filtered
(few rows), (c) zero results (coverage-aware empty), (d) case-number exact match
(single row), (e) loading/error. `facets` drive counts in the filter UI.

## UI structure

1. **Sticky filter bar (≥`md`):** `CourtPicker` + `SearchInput` (`q`) with helper
   text, then `FilterContainer` accordions: Tier (radio), Categorie (multi), Stadiu
   (multi), An (select/range), Tip parte (radio: companie / instituție publică), Rol
   (multi), Apel (radio: cu apel / fără apel). Below `md`, filters move into a
   `Sheet` opened by a "Filtre (N)" button; applied-filter tags scroll horizontally.
2. **Applied filters row:** `SelectedOptionsDisplay` tags with per-tag clear + "Șterge
   tot".
3. **Results header:** result count (locale-formatted) + `sort` `Select` + `DataStatusBadge`.
4. **`CaseResultsTable`:** columns — Instanță, Număr dosar, Categorie, Stadiu,
   Deschis la, Ultima ședință, Apel (yes/no badge), Părți (publishable preview +
   "+N persoane fizice" muted). Row → `/justitie/dosare/$caseId?from=cautare`.
5. **`Pagination`** + page-size control.
6. **`CoverageRibbon`** (inherited from layout) + `SourceProvenanceDrawer` in footer.

## Component reuse and new components

- Reuse: `FilterContainer`, `FilterListContainer`, `FilterRadioContainer`,
  `SelectedOptionsDisplay`, `SearchInput` (filters base), `Select`, `Sheet`,
  `Table`, `Badge`, `Pagination`, `Tooltip`, `Skeleton`, `EmptyState`.
- New shared (data-trust): `CoverageRibbon`, `DataStatusBadge`, `FreshnessBadge`,
  `PrivacyBoundaryNotice`, `SourceProvenanceDrawer`.
- New justice: `CaseResultsTable` (shared with the slice), `CourtPicker` (shared with
  landing).

## Interactions

- Any facet change updates the URL search params (immutable spread) and refetches;
  `page` resets to 1 on filter change (not on sort).
- `q` submit updates `q`; `CourtPicker` updates `court`.
- Tag clear removes one param; "Șterge tot" resets to default view (no params).
- Row click → case detail with `from=cautare`.
- `ShareFilteredView` (optional, post-MVP): copy current URL.

## Loading / empty / error / partial / stale states

- **Loading:** skeleton filter bar (or keep facets, skeleton rows) + 10 skeleton
  table rows.
- **Empty (zero results):** `EmptyState` — coverage-aware copy + "Încearcă să
  lărgești filtrele sau intervalul de ani"; reminder that pre-2021 is thin and ICCJ
  is absent.
- **Partial:** rows load but facet counts fail → render table + facets without counts;
  `DataStatusBadge='partial'`.
- **Error:** retry block; invalid params normalized by schema `.catch`, not by
  effects.
- **Stale:** muted `FreshnessBadge`.

## Accessibility and i18n

- Filter controls are labeled and keyboard reachable; the mobile `Sheet` manages
  focus and has a heading + close control.
- `CaseResultsTable` keeps semantic markup with `<th scope="col">`; below `md` it
  becomes a stacked label:value list.
- Sort `Select` and pagination are labeled; result count announced via an
  `aria-live="polite"` region on filter change.
- All copy via Lingui; counts/dates via `Intl`/`i18n.locale`; role/category/stage
  labels localized; case-number format hint in a tooltip.

## Privacy, provenance, source citation

- **No person-name field; `partyKind` cannot select `person`/`unknown`.**
- **No full-text search** over case object/solution text; `q` is restricted to
  court/number/publishable-litigant. Helper text states this; a small
  `PrivacyBoundaryNotice` near the search box explains why person/full-text search is
  not offered.
- Person parties appear only as an aggregate "+N persoane fizice" hint per row,
  never named.
- `CoverageRibbon` + `SourceProvenanceDrawer` present; coverage caveats applied to
  empties.

## Acceptance checklist

- [ ] Faceted filters (court, tier, category, stage, year, party kind, role, appeal)
      sync to URL via the base-filter pattern; default view renders with no params.
- [ ] `q` matches only court/number/publishable-litigant; no person field; no
      full-text over case text; helper text + privacy notice present.
- [ ] `partyKind` cannot select person/unknown.
- [ ] Results table sortable + paginated; rows link to case detail with `from`.
- [ ] Person parties shown only as aggregate counts per row.
- [ ] Zero results use coverage-aware copy; partial/stale/error states implemented.
- [ ] Mobile filter `Sheet` works with focus management; `aria-live` count update.
- [ ] Params validated with `.catch` defaults; `yarn typecheck` passes; strings
      extracted/compiled.

## Non-goals

- No full-text / person search (reserved for a privacy-reviewed lane, not v1).
- No saved searches / alerts in MVP.
- No export beyond an optional share-URL affordance.
- No appeal-chain or legal-reference search facets in MVP (gated lanes).

## Open questions (true blockers only)

None. Whether justice joins global cross-domain search is a separate product
decision; this route-scoped search ships regardless and, if a global projection is
later built, it must include only the same publishable fields used here.
