# Feature — Objectives Map + Landing (MVP-1)

> Read with `docs/design/public-investments/design.md` (shared shapes, routes,
> guardrails) and `ux.md`. This file is self-sufficient for implementation; it
> references the shared `ObjectiveSummary`, `EvidenceRef`, `ProgramCoverage`,
> `DomainDataStatus` types from `design.md §6` rather than redefining them.

## Feature owner profile

Map / data-visualization front-end subagent (maplibre-gl `InteractiveMap`,
TanStack Router/Query, shadcn). Comfortable with geocoded point/choropleth
rendering and SSR-friendly landing pages (mirror `src/routes/pnrr.tsx`).

## Summary

The domain front door at `/investitii-publice`. A full-bleed national map of
SIRUTA-geocoded objectives + headline KPIs + program chips + a search entry +
a coverage/freshness ribbon + a "top stalled objectives" teaser. It turns an
inert 17,642-row dataset into something navigable and routes every journey
onward (objective detail, search, locality/county). It is the casual user's
"my locality" launchpad and the analyst's jump-off to `cautare`/`analiza`.

## Facts / Decisions / Assumptions

- **Fact (UX MVP-1):** Required data exists today —
  `project_objectives_current` (program, SIRUTA, county, UAT, title, domain,
  contracted, decontat, stage) + `territory_links` geocoding.
- **Fact (UX §5.1, R7):** 17,642 objectives; coverage is uneven (PNDL 11,636 /
  Anghel 5,772 / PNCCRS 227 / PNMC 7). The map must not imply completeness.
- **Fact (UX R1/PI-1):** Headline money KPIs are exposed to the inflation bug;
  KPI amounts must be guarded and a data-status notice shown.
- **Decision:** Default landing has **no query params** and renders the national
  view. Map camera, selected program, and basemap mode are search params so the
  view is shareable.
- **Decision:** Reuse `InteractiveMap`; render objectives as a **point layer**
  (SIRUTA centroid) clustered at low zoom, colored by `program` (default) or by
  `stage` (toggle), sized by `contracted` amount band. County polygons are a
  faint context layer only on this page.
- **Decision:** This page links *out*; it does not embed full filtering. The
  "filtrează" CTA routes to `/investitii-publice/cautare` carrying current
  program/map context.
- **Assumption:** SIRUTA→centroid geocoding reuses the existing geo pipeline
  used by PNRR/maps (`territory_links` + client geo data). Objectives with null
  SIRUTA/centroid are **excluded from the map** but counted in a "X obiective
  fără localizare pe hartă" note (honesty, not silent drop).

## Route and URL state

- Route: `/investitii-publice` (`src/routes/investitii-publice.tsx` +
  `.lazy.tsx`), `validateSearch` with a zod parser in
  `src/schemas/public-investments.ts` following the `parsePnrrSearch` pattern
  (defaults stripped from the URL via a `clean*` function).

```
view:    'program' | 'stage'        // map coloring; default 'program'
program: ProgramCode | undefined    // optional pre-highlight (chip selected)
mapLat / mapLng / mapZoom: number?  // shareable camera (coerced, all-or-none)
dovada:  string | undefined         // EvidenceRef.sourceRowKey -> opens drawer
```

- **Decision:** All defaults absent from the URL. `dovada` is the shared
  evidence deep-link param (see `evidence-viewer.md`), available on every PI
  route including this one (KPI "Vezi dovada").

## Data contract and mock states

Adapter: `src/features/public-investments/api/landing.live.ts` +
`landing.mock.ts`. Returns:

```ts
type LandingData = {
  readonly status: DomainDataStatus
  readonly coverage: readonly ProgramCoverage[]
  readonly kpis: {
    readonly objectiveCount: number
    readonly mappedObjectiveCount: number      // have centroid
    readonly unmappedObjectiveCount: number
    readonly contractedTotal: MoneyValue       // guarded
    readonly reimbursedTotal: MoneyValue       // guarded
    readonly absorptionPct: number | null      // null if either total suspect
    readonly evidenceRef: EvidenceRef          // aggregate provenance note
  }
  readonly mapPoints: readonly ObjectiveMapPoint[]
  readonly topStalled: readonly ObjectiveSummary[]   // up to 6
}
type ObjectiveMapPoint = Pick<ObjectiveSummary,
  'objectiveId' | 'program' | 'title' | 'county' | 'uat' | 'siruta' |
  'lat' | 'lng' | 'contracted' | 'absorptionPct' | 'stage'>
```

- **Mock states to ship:** (1) full national (all 4 programs); (2) PI-1 active
  (`inflationBugActive: true`, KPI amounts `suspect_x1000`); (3) gate `warning`
  with `moneyPrecisionWarningRows: 13`; (4) sparse program (PNMC=7) selected;
  (5) some points `lat/lng = null` to exercise the unmapped note.
- **Decision:** "Top stalled" = objectives with `stage.bucket` in
  `contractat|in_executie` and lowest `absorptionPct` (non-null), excluding any
  whose `contracted.confidence === 'suspect_x1000'` (guard).

## UI structure (top to bottom)

1. **Domain header band** — breadcrumb `Investiții publice`, H1 "Investiții
   publice", one-line subtitle "Obiective de investiții din bani publici, pe
   hartă — cu dovada din spatele fiecărei cifre.", a ghost "Cum citesc aceste
   date" button (opens `HowToReadData` sheet).
2. **`CoverageRibbon`** — `FreshnessBadge` ("Date până la {snapshotDate}"),
   gate status (`DataStatusBadge`: ok→`live`/`partial`, warning→`unverified`),
   per-program coverage chips, and a `mock` badge while on mock data. If
   `inflationBugActive`, a compact amber `DataStatusBadge` "valori în verificare
   (corecție în curs)" linking to the data-status explainer.
3. **KPI row** (4 compact stat blocks, unframed, `divide-x`): Obiective
   (`17.642`), Contractat (guarded `AmountWithEvidence`), Decontat (guarded),
   Absorbție (`AbsorptionBar` compact or "—" if null). Each amount KPI carries a
   "Vezi dovada".
4. **Map band** (full-bleed) — `InteractiveMap` with the objectives point layer,
   `MapLegend` (program/stage colors + size = contracted band), a top-left
   control cluster: program chips (`ProgramChip`, multi-aware → highlights), a
   `view` toggle (Program ⇄ Stadiu), and a `Caută obiective` search input that
   submits to `/investitii-publice/cautare?q=`. A footnote chip "{unmapped}
   obiective fără localizare pe hartă" when >0.
5. **Map point popover** — `ObjectiveCard`: title, `ProgramChip`, locality,
   `StageBadge`, compact `AbsorptionBar`, "Deschide obiectivul →"
   (`/investitii-publice/obiective/$id`).
6. **Teasers row** (two columns, links-out): "Obiective blocate" (top-stalled
   `ObjectiveListRow` list → each row links to detail; header links to
   `/cautare?stage=contractat,in_executie&sort=absorption.asc`) and "Explorează"
   (cards routing to `/cautare`, `/analiza`, `/firme`).
7. **Footer note** — source attribution ("Surse: MDLPA / CKAN workbooks") + a
   `RequestDatasetAction` ("Lipsește un program? Cere setul de date") for the
   not-yet-captured programs (CNI / MIPE / ANL / PNSS shown as "în curând").

## Component reuse and proposed new components

- Reuse: `InteractiveMap`, `MapLegend`, `Button`, `Badge`, `Tooltip`, `Sheet`,
  `EmptyState`, `Skeleton`, `breadcrumb`, search input pattern from
  `entity-search`.
- Shared trust (build per `design.md §5.2`): `CoverageRibbon`, `FreshnessBadge`,
  `DataStatusBadge`, `EvidenceLink`, `SourceProvenanceDrawer`.
- New PI: `AmountWithEvidence`, `AbsorptionBar`, `StageBadge`, `ProgramChip`,
  `ObjectiveCard`, `ObjectiveListRow`, `HowToReadData`.

## Interactions

- Click program chip → toggles highlight + sets `program` param (does not
  navigate away).
- Toggle `view` Program/Stadiu → recolors points + legend, sets `view` param.
- Pan/zoom map → debounced write of `mapLat/mapLng/mapZoom` (mirror PNRR map
  camera persistence).
- Click point → popover; "Deschide obiectivul" navigates to detail.
- Search submit / "Filtrează" → navigate to `/cautare` preserving program + (if
  set) county-from-camera as `from` context.
- KPI "Vezi dovada" / ribbon evidence → opens `SourceProvenanceDrawer` via
  `dovada` param.

## Loading / empty / error / partial / stale states

- **Loading:** header + ribbon skeleton; map shows a centered dot loader
  (DESIGN_PRINCIPLES loading pattern); KPI blocks are `Skeleton`.
- **Empty:** if zero objectives (only possible in a misconfigured mock/dev),
  `EmptyState` "Nu există obiective de afișat" + `RequestDatasetAction`. Never a
  blank map.
- **Error:** map fails to load → inline error card with retry; the rest of the
  page (KPIs, teasers) still renders from cached/SSR data. Data fetch error →
  page-level error card with retry, URL preserved.
- **Partial:** unmapped objectives note; per-program coverage chips show "date
  parțiale"; programs with no data render as disabled "în curând" chips.
- **Stale:** if `snapshotDate` older than a threshold, `FreshnessBadge` switches
  to a muted "posibil neactualizat" tone (text + icon), never hidden.

## Accessibility and i18n

- Map has an adjacent/below **tabular fallback**: the top-stalled list and a
  "Obiective pe program" count table are real semantic content conveying the
  same key values for non-map users.
- Program chips are toggle buttons with `aria-pressed`; `view` toggle is a
  labelled `toggle-group`. Search input has a visible label/placeholder.
- KPI amounts state value in text; `AbsorptionBar` carries `aria-label`.
- All copy via Lingui macros; Romanian primary. Expand UAT/SIRUTA/PNDL etc. on
  first use (tooltip).

## Privacy / provenance

- No party names appear on this page (KPIs/teasers are amounts + objectives
  only), so no privacy surface here — but if `topStalled` ever carried a
  contractor label, it must pass the `served` gate (it does not by spec).
- Every amount KPI + the aggregate ribbon expose `EvidenceRef` via "Vezi
  dovada". Aggregate KPIs link to a methodology line in `HowToReadData`
  (how the total is summed, which programs included).

## Acceptance checklist

- [ ] `/investitii-publice` renders with no query params (national view).
- [ ] Map shows program-colored points; legend present; stage toggle works.
- [ ] KPI amounts use `AmountWithEvidence`; PI-1 mock hides suspect numbers and
      shows the data-status notice.
- [ ] CoverageRibbon shows per-program coverage + freshness + gate status; mock
      badge present on mock data.
- [ ] Unmapped-objective count shown when >0; no silent drop.
- [ ] Top-stalled teaser links to `/cautare` with correct filters; cards route
      to detail/cautare/analiza/firme.
- [ ] Tabular fallback present for the map; keyboard reachable; `yarn typecheck`
      clean; i18n extracted/compiled.

## Non-goals

- Full filtering (lives in `cautare`).
- Contractor directory, analytics dashboard, payments (separate features).
- Any merged money-flow visualization (guardrail).
- Time-series (no history yet).

## Open questions (blockers only)

- None. PI-1 display behavior is governed by domain `B2` (PO launch gate) and is
  handled here by guarding suspect amounts + showing the data-status notice.
