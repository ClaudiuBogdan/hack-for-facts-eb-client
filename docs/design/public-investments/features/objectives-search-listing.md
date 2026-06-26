# Feature — Objectives Search & Listing (MVP-3)

> Read with `design.md` (shared shapes/routes/guardrails) and `ux.md`. This is
> the cohort-discovery surface: narrow 17,642 objectives to something meaningful.

## Feature owner profile

List/table + filters front-end subagent. Strong on synchronized map+list
(`MapListSync`), sticky filter bars, URL-driven filter state (mirror
`src/schemas/pnrr.ts` + `src/features/pnrr` map/list), CSV export.

## Summary

`/investitii-publice/cautare`: a filterable, sortable objectives table
synchronized with a map. Filters for program, domain, county/UAT, stage, amount
and absorption ranges, plus data-completeness toggles behind an "avansat" panel.
Map↔list selection sync, shareable filtered URL, CSV export. Serves casual
("water objectives in my county that are stalled") and power users alike.

## Facts / Decisions / Assumptions

- **Fact (UX MVP-3, §11):** all filter inputs exist on
  `project_objectives_current` + stage + domain + territory.
- **Fact (UX R3):** stage is not a clean enum — filter on the normalized bucket,
  with a `necunoscut` option for unparseable raw stage.
- **Fact (UX R1):** absorption/amount filters interact with PI-1; suspect
  amounts must not silently distort range filters (see Decisions).
- **Decision:** Default view (no params) shows all objectives, map national,
  list sorted by `contracted desc`, `pageSize` 25.
- **Decision:** Filters live entirely in search params (shareable). Multi-value
  filters use arrays (PNRR array-key convention). A `ShareFilteredView` button
  copies the current URL.
- **Decision:** Amount/absorption range filters operate on guarded values;
  objectives with `suspect_x1000` amounts are **excluded from amount/absorption
  range matching** and surfaced via a separate `dataQuality` facet
  ("valori în verificare"), never silently included. The count of excluded rows
  is shown.
- **Assumption:** Server/adapter does filtering+paging; the client sends the
  parsed search state and receives a page + facet counts.

## Route and URL state

- Route: `/investitii-publice/cautare`
  (`src/routes/investitii-publice/cautare.tsx` + `.lazy.tsx`).
- Search params (zod, defaults stripped, arrays JSON-or-repeated per PNRR
  parser):

```
q:          string?                 // free-text title/locality/contractor (non-gated)
programs:   ProgramCode[]?
domains:    string[]?               // domainKey
counties:   string[]?               // countyCode
siruta:     string?                 // UAT drill (single)
stages:     StageBucket[]?          // includes 'necunoscut'
amountField:'contracted'|'reimbursed'|'allocated'  // which amount the range applies to (default 'contracted')
amountMin / amountMax: number?
absMin / absMax: number?            // absorption % 0..100
dataQuality:('precision_warning'|'suspect_x1000')[]?   // advanced facet
hasContractorCui / hasDesignerCui / hasSiruta: boolean?  // advanced completeness
identity:   ('high'|'medium'|'low')[]?   // advanced (expert)
view:       'list' | 'map' | 'split'     // default 'split' (desktop), 'list' (mobile)
sort:       'contracted'|'reimbursed'|'absorption'|'title'|'county'|'stage'  // default 'contracted'
order:      'asc' | 'desc'          // default 'desc'
page:       number                  // default 1
pageSize:   number                  // default 25
selected:   string?                 // objectiveId highlighted in map+list
dovada:     string?                 // evidence deep-link
```

- **Decision:** `selected` drives map↔list highlight (no navigation). Invalid
  params normalized by route validation, not effects (foundation).

## Data contract and mock states

Adapter: `src/features/public-investments/api/search.live.ts` + `search.mock.ts`.

```ts
type ObjectiveSearchResult = {
  readonly rows: readonly ObjectiveSummary[]      // current page
  readonly total: number
  readonly excludedSuspectCount: number           // suspect amounts excluded from ranges
  readonly facets: {
    readonly programs: Record<ProgramCode, number>
    readonly domains: ReadonlyArray<{ key: string; label: string; count: number }>
    readonly counties: ReadonlyArray<{ code: string; name: string; count: number }>
    readonly stages: Record<StageBucket, number>
    readonly dataQuality: { precision_warning: number; suspect_x1000: number }
  }
  readonly mapPoints: readonly ObjectiveMapPoint[]  // matches the *full* filtered set, not just page
  readonly status: DomainDataStatus
}
```

- **Mock states:** (1) broad result (all programs); (2) narrow result (water +
  one county + stalled); (3) zero results (filters too tight); (4) PI-1 heavy →
  `excludedSuspectCount` large, dataQuality facet populated; (5) `necunoscut`
  stage heavy; (6) loading/page-2.

## UI structure

1. **Header** — breadcrumb, H1 "Caută obiective", `CoverageRibbon` compact,
   `ShareFilteredView`, "Cum citesc aceste date".
2. **Sticky filter bar** (compact, `divide`/wrap): free-text `q` input;
   `MultiSelect` Program; `MultiSelect` Domeniu; `county-filter`/`uat-filter`
   reuse; Stadiu `MultiSelect`; `amount-range-picker` (with `amountField`
   selector) reuse; Absorbție range slider; an "Avansat" `Popover`/`Sheet` for
   completeness + identity + dataQuality filters. `active-filters-bar` +
   `filter-tag` show applied filters with clear-all.
3. **View toggle** — List / Hartă / Split (`toggle-group`), result count
   "{total} obiective" + "({excludedSuspect} cu valori în verificare, excluse din
   filtrele pe sumă)" when >0.
4. **Split body** (`MapListSync`):
   - **Map** (left/top): `InteractiveMap` points for the filtered set, colored by
     program/stage, `selected` highlighted; click → set `selected` + scroll list.
   - **List/Table** (right/bottom): columns — Obiectiv (title + locality),
     Program (`ProgramChip`), Contractat (`AmountWithEvidence`), Decontat,
     Absorbție (`AbsorptionBar` mini), Stadiu (`StageBadge`). Row click →
     `selected` highlight; title → objective detail. Sort on Contractat /
     Decontat / Absorbție / Titlu / Județ / Stadiu. Sticky header, `Pagination`.
5. **Export** — "Export CSV" button exporting the **current filtered set**
   (server-driven), columns matching the table + objectiveId + countyCode +
   siruta + evidence source URL. Gated party names **never** included.

## Component reuse and proposed new components

- Reuse: `InteractiveMap`, `MapLegend`, `Table`, `MultiSelect`/
  `styled-multi-select`, `Select`, `Slider`, `amount-range-picker`,
  `county-filter`, `uat-filter`, `active-filters-bar`, `filter-tag`, `Popover`,
  `Sheet`, `Pagination`, `toggle-group`, `Button`, `EmptyState`, `Skeleton`,
  `copy-button`.
- Shared trust: `CoverageRibbon`, `DataStatusBadge`, `EvidenceLink`,
  `SourceProvenanceDrawer`, `MapListSync`, `ShareFilteredView`.
- New PI: `AmountWithEvidence`, `AbsorptionBar`, `StageBadge`, `ProgramChip`,
  `ObjectiveListRow`, `ObjectiveCard`, `HowToReadData`.

## Interactions

- Any filter change → write params, reset `page` to 1, refetch (debounce `q`).
- Sort header click → `sort`/`order`. View toggle → `view`. Pagination → `page`.
- Map point ⇄ list row selection sync via `selected`.
- "Avansat" toggles expose completeness/identity/dataQuality filters.
- Export CSV → download filtered set. Share → copy URL + toast.
- "Vezi dovada" on any amount → drawer.

## Loading / empty / error / partial / stale

- **Loading:** table rows skeleton + map dot loader; filter bar stays
  interactive; keep prior results dimmed during refetch (no layout jump).
- **Empty:** zero results → `EmptyState` "Niciun obiectiv pentru aceste filtre"
  + "Resetează filtrele" + suggestion to broaden (e.g. remove stage). Map shows
  empty national outline, not blank.
- **Error:** fetch error → inline error row + retry; filter bar + URL preserved.
- **Partial:** `excludedSuspectCount` banner; coverage chips show partial
  programs; `necunoscut` stage explained in tooltip.
- **Stale:** `FreshnessBadge` muted state; data-status notice when PI-1 active.

## Accessibility and i18n

- Table is semantic (`<table>`, `<th scope>`); sort buttons are real buttons with
  `aria-sort`. Map has the list as its accessible equivalent (split view already
  pairs them; in `map` view a "Vezi ca listă" link is always present).
- Filter controls labelled; range sliders expose min/max via text inputs too.
- `AbsorptionBar`/`StageBadge` accessible per domain rules. All copy via Lingui.

## Privacy / provenance

- `q` searches non-gated contractor/designer names only; gated names are not
  searchable, not in facets, not in CSV (fail-safe).
- Every amount cell has "Vezi dovada"; CSV includes the source URL column for
  provenance. Source-link kind labeled in the drawer.
- Suspect amounts excluded from range filters with a visible count — no silent
  distortion of cohort math (honesty state).

## Acceptance checklist

- [ ] `/investitii-publice/cautare` renders default (no params) split view, list
      sorted by contracted desc.
- [ ] All filters drive search params; share copies a working URL; back/forward
      restores state; invalid params normalized by route validation.
- [ ] Map↔list selection sync via `selected`.
- [ ] Suspect-amount rows excluded from amount/absorption ranges with a visible
      excluded count + dataQuality facet.
- [ ] CSV exports the filtered set with a source-URL column and **no** gated
      party names.
- [ ] Empty/loading/error states implemented; table semantic + `aria-sort`;
      `yarn typecheck` clean; i18n done.

## Non-goals

- Cross-source join filters (PNRR/MIPE/SEAP) beyond the candidate-labeled note —
  reserved/advanced.
- Aggregated analytics/choropleth (lives in `analiza`).
- Per-objective detail (links out).

## Open questions (blockers only)

- None. PI-1 handled by exclusion+labeling; party gating fail-safe.
