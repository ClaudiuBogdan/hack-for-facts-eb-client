# Feature: Searchable / filterable enterprise listing

> MVP-4. Route `/intreprinderi-publice` with query state (shares the path with the
> landing page). Ships on the live AMEPIP core lane; authority/sanctions/state-aid
> facets degrade gracefully. Read with `public-enterprises-landing.md`,
> `enterprise-profile.md`, and `../design.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + TanStack Router
search-param filters + shadcn/ui + Tailwind v4 + Lingui). Should reuse the
`entity-search` components (`entity-result-row`, `entity-facet-chips`,
`entity-load-more`, `entity-empty-state`, `entity-search-skeleton`).

## Summary

A faceted, sortable, paginated list of the SOE universe so analysts and curious
users can browse and rank by authority, county, CAEN, status, listed-on-BVB, and
data-quality flags. Lands on the same route as the landing page; presence of any
filter/`q`/`sort`/`page` param switches the route into listing mode.

## Facts, decisions, assumptions

- Fact (UX §13 MVP-4, §11): Data — `enterprise_years` (latest year per CUI),
  `controlling_authorities` (subordination, county — degrade if gated),
  `ticker_symbol`, `amepip_status`. Filters per UX §11.
- Fact (UX §6/§15): CUI must be normalized (strip non-digits). S1001 universe
  (~1,773) is broader than AMEPIP (1,342) and includes inactive/insolvent firms;
  the listing's primary universe is the current AMEPIP workbook.
- Fact (UX §15): SNP/EL/FP are NOT SOEs — they must not appear in this list even
  if a ticker filter is applied.
- Decision: Primary universe = current AMEPIP workbook (`inAmepipWorkbook=true`).
  An optional facet "Include și lista S1001 (firme inactive/insolvente)" expands to
  S1001-only entries, each badged "doar S1001", only when the authority lane is
  live (S1001 data source). Until then this facet is hidden/gated.
- Decision: Facets that depend on gated lanes (`subordination`, `apt_type_id`,
  `has-sanctions`, `has-state-aid`, county-from-S1001) render with a `gated`
  `DataStatusBadge` and are disabled until their lane is live — visible so users
  know the capability is coming, not silently absent (Pattern E).
- Decision: Sort by an indicator value (UX §11 advanced) is deferred to the
  comparison/analytics surfaces; the MVP listing sorts by name, CUI, county
  (when live), and indicator-count. (Keeps the listing on live data only.)

## Route and URL state

- Fact: Same `createFileRoute('/intreprinderi-publice/')` as the landing; one
  `validateSearch` parser drives both modes.
- Decision: `parsePublicEnterpriseSearch` (Zod) params (README shared names):
  - `q`: free text (name / CUI / ticker / authority / CAEN).
  - `county`: string (or comma list).
  - `status`: AMEPIP status (multi).
  - `caen`: CAEN division/section code (multi).
  - `subordination`: `central | local` (gated).
  - `aptType`: `1..5` (gated).
  - `listed`: boolean (ticker present).
  - `hasSanctions`, `hasStateAid`: boolean (gated).
  - `linkStatus`: `matched | missing | ambiguous` (data-quality facet).
  - `includeS1001`: boolean (gated; default false).
  - `sort`: `name | cui | county | indicators` + direction (e.g. `name:asc`).
  - `page` / `pageSize` (or cursor for load-more).
- Decision: Multi-value facets follow the local route validation pattern (repeated
  or comma-separated, consistent per parser) — match how `private-company-search`
  / entity-search parse arrays. Default view (no params) = landing mode.
- Decision: Invalid params are normalized by the Zod parser (`.catch`), never by a
  component effect (README).

## Data contract and mock states

`fetchPublicEnterpriseSearch(query)` → page (mock↔live by `soe-amepip`).

```ts
type PublicEnterpriseSearchQuery = /* the parsed search params above */ object

type PublicEnterpriseSearchResultPage = {
  hits: readonly PublicEnterpriseHit[]
  total: number
  page: number
  pageSize: number
  facets: PublicEnterpriseFacets        // counts per facet value, with denominator
  appliedUniverse: 'amepip' | 'amepip+s1001'
  lineage: SourceLineage
}

type PublicEnterpriseHit = {
  cui: string
  companyName: string
  amepipStatus: string | null
  tickerSymbol: string | null
  caenOnrc: string | null
  county: string | null                 // null until authority lane live
  subordination: 'central' | 'local' | null
  authorityName: string | null
  latestYear: number | null
  indicatorCount: number
  inAmepipWorkbook: boolean
  linkStatus: 'matched' | 'missing' | 'ambiguous' | 'not_checked' | null
}

type PublicEnterpriseFacets = {
  status: ReadonlyArray<{ value: string; count: number }>
  county: ReadonlyArray<{ value: string; count: number }>      // gated
  caen: ReadonlyArray<{ value: string; label: string; count: number }>
  subordination: ReadonlyArray<{ value: 'central' | 'local'; count: number }> // gated
  // booleans expose their true-count
  listedCount: number
  sanctionsCount: number | null         // gated
  stateAidCount: number | null          // gated
}
```

### States

- **Loading**: `entity-search-skeleton` analog (facet rail + ~8 row skeletons).
- **Empty results**: `entity-empty-state` analog — "Nicio întreprindere nu se
  potrivește filtrelor." + a "Resetează filtrele" action.
- **Empty coverage** (no data loaded): `EmptyState` + lineage note.
- **Error**: inline `Alert` + retry; the facet rail (last known) stays visible.
- **Partial**: gated facets disabled with a `gated` badge + tooltip; results from
  live facets still work.
- **Stale**: snapshot note in the results header ("ca la {workbookDate}").

## UI structure

Container may widen to `max-w-6xl`. Layout:

1. **Results header**: result count + denominator ("X din 1.342 întreprinderi"),
   active-filters bar (`active-filters-bar` + `filter-tag` chips, each removable),
   sort `Select`, and a `ShareFilteredView` "Copiază vizualizarea".
2. **Facet rail** (left ≥`lg`; `Sheet` "Filtre" `< lg`): grouped facets —
   Status · CAEN · Listate la BVB · Calitatea legăturii (linkStatus) · [gated:
   Subordonare · Tip autoritate · Județ · Are sancțiuni · Are ajutor de stat ·
   Include S1001]. Each facet shows counts; gated facets are disabled + badged.
3. **Search input**: "Caută după nume, CUI, ticker, autoritate sau CAEN" (sticky
   top of results on mobile).
4. **Results list**: `EnterpriseResultRow`s (adapt `entity-result-row`) —
   `divide-y` rows, each: name (bold) + `AmepipStatusBadge` + `TickerBadge` (if
   listed) + meta line (`CUI …` · county-or-authority · `CAEN …` ·
   `{indicatorCount} indicatori` · `ca la {latestYear}`). `doar S1001` badge for
   S1001-only entries. Whole row links to `/intreprinderi-publice/$cui`.
5. **Pagination**: load-more (`entity-load-more` analog) or `pagination` component,
   consistent with the existing search pattern.
6. **Source footer**: AMEPIP snapshot + verify link.

## Component reuse and proposed new components

- Reuse: `entity-search` components (`entity-result-row`→`EnterpriseResultRow`,
  `entity-facet-chips`, `entity-load-more`, `entity-empty-state`,
  `entity-search-skeleton`, `entity-search-input`); `active-filters-bar`,
  `filter-tag`, `Select`, `Sheet`, `Badge`, `pagination`, `skeleton`.
- New: `PublicEnterpriseFacetRail`, `EnterpriseResultRow` (adapted),
  `AmepipStatusBadge`/`TickerBadge` (shared with profile), `DataStatusBadge`
  (shared), `ShareFilteredView` (shared candidate).

## Interactions

- Typing in search (debounced) → `q` param + refetch; Enter on an exact CUI may
  route straight to the profile.
- Toggling a facet → updates its param + refetch + updates facet counts.
- Removing a chip in the active-filters bar → clears that param.
- Changing sort → `sort` param + refetch.
- Clicking a row → `/intreprinderi-publice/$cui` (preload on intent).
- "Copiază vizualizarea" → copies the full filtered URL.

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: gated facets never silently disappear; they
are visibly disabled with an explanation, so the filter set communicates the
roadmap honestly.

## Accessibility and i18n

- Results list is a semantic list; each row is a single accessible link with a
  descriptive accessible name (name + CUI + status).
- Facet groups are labelled fieldsets; disabled gated facets use `aria-disabled` +
  a tooltip (tooltip is not the only signal — the `gated` badge text says so).
- Sort `Select` and search input are labelled; keyboard navigation across rows
  follows the `entity-search` roving pattern.
- All copy Lingui; counts via `Intl.NumberFormat('ro-RO')`.

## Privacy, provenance, and source-citation behavior

- Lineage in the results header + footer (Pattern B). No person-level data.
- `linkStatus` shown per row where relevant (Pattern C); `doar S1001` entries
  clearly distinguished from current-workbook SOEs.

## Acceptance checklist

- [ ] `/intreprinderi-publice` with any filter/`q`/`sort`/`page` renders listing
      mode; with none renders landing mode.
- [ ] Live facets (status, CAEN, listed, linkStatus) filter results and update
      counts; gated facets are visibly disabled + badged.
- [ ] Result count shows the denominator ("X din 1.342").
- [ ] CUI input is normalized; SNP/EL/FP do not appear as SOEs.
- [ ] Rows link to `/intreprinderi-publice/$cui`; S1001-only entries are badged.
- [ ] Filters are URL-addressable, shareable, and restored on reload/back; invalid
      params are normalized by the parser.
- [ ] Empty/error/partial states render per spec; the facet rail never disappears
      on error.
- [ ] Lingui-wrapped; `yarn typecheck` clean.

## Non-goals

- No indicator-value range filtering or KPI sort (advanced — UX §11/§14).
- No map view (advanced — reuse `advanced-map` later, UX §14).
- No analytics/rankings (reserved `/intreprinderi-publice/analiza`).

## Open questions (blockers only)

- None for MVP on live facets. Gated facets activate with their lane's deploy
  unblock; that is the lane-level blocker tracked in each gated feature file.
