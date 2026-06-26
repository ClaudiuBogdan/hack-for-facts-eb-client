# Feature — Absorption Analytics Dashboard (High-value next: N3)

> Read with `design.md` (shared shapes/routes/guardrails) and `ux.md`. The
> headline "deeper analysis" surface — low data risk, high journalist value.

## Feature owner profile

Analytics / choropleth front-end subagent. Strong on county choropleth
(`InteractiveMap` heatmap mode), ranking tables, and aggregate guards. Mirror
PNRR aggregate patterns (`PnrrAggregates`, county stats).

## Summary

`/investitii-publice/analiza`: a systemic view — which counties/UATs absorb funds
worst, who the top contractors/designers are, the stalled-objective cohort, and
program/domain breakdowns. A choropleth of absorption % + ranked tables, all
guarded against PI-1 and all drilling into `cautare`/`firme`/territory pages.

## Facts / Decisions / Assumptions

- **Fact (UX N3, §13):** objectives + territory data support absorption-by-county,
  top contractors/designers, stalled cohort, domain breakdown, program comparison
  — all from the serving schema today.
- **Fact (UX R1):** aggregates are exposed to PI-1; suspect amounts must be
  excluded from absorption math, not silently summed.
- **Fact (UX R7):** coverage is uneven; the choropleth must show "fără date" for
  uncovered territories distinctly from "0% absorbție".
- **Decision:** New route `/investitii-publice/analiza` (additive domain route,
  `design.md §3`).
- **Decision:** Top-contractor ranking obeys the **party privacy gate** — only
  served parties are named; withheld parties contribute to an aggregate
  "în curs de verificare" counter, never named. (Reuses
  `contractor-designer-directory` data rules.)
- **Decision:** No money-flow diagram. Cross-domain is drill-through links only.
- **Assumption:** County choropleth reuses the existing heatmap/choropleth
  capability of `InteractiveMap` (`HeatmapCountyDataPoint`), with absorption % as
  the value.

## Route and URL state

- Route: `/investitii-publice/analiza` (`src/routes/investitii-publice/analiza.tsx`
  + `.lazy.tsx`).
- Search params (zod, defaults stripped):

```
metric:   'absorption'|'stalled'|'contracted'   // choropleth + ranking metric; default 'absorption'
programs: ProgramCode[]?
domains:  string[]?
level:    'county'|'uat'        // choropleth granularity; default 'county'
panel:    'counties'|'contractors'|'stalled'|'domains'  // active ranking panel; default 'counties'
selected: string?               // selected countyCode/siruta for the side detail
sort:     'value'|'absorption'|'count'   // ranking sort; default by metric
order:    'asc'|'desc'           // default 'asc' for absorption (worst first), 'desc' otherwise
dovada:   string?                // evidence deep-link
```

## Data contract and mock states

Adapter: `src/features/public-investments/api/analytics.live.ts` +
`analytics.mock.ts`.

```ts
type CountyAbsorption = {
  readonly countyCode: string
  readonly countyName: string
  readonly objectiveCount: number
  readonly contracted: MoneyValue
  readonly reimbursed: MoneyValue
  readonly absorptionPct: number | null    // null if not computable / excluded
  readonly hasData: boolean                 // false => "fără date" on choropleth
  readonly stalledCount: number
}
type AnalyticsData = {
  readonly counties: readonly CountyAbsorption[]
  readonly topContractors: readonly DirectoryParty[]   // served-only (gate)
  readonly stalledCohort: readonly ObjectiveSummary[]  // worst absorption, capped
  readonly byDomain: ReadonlyArray<{ key: string; label: string; count: number; contracted: MoneyValue; absorptionPct: number | null }>
  readonly byProgram: ReadonlyArray<{ program: ProgramCode; count: number; contracted: MoneyValue; absorptionPct: number | null }>
  readonly excludedSuspectCount: number      // objectives excluded from absorption math
  readonly withheldContractorCount: number   // gated parties not named
  readonly status: DomainDataStatus
}
```

- **Mock states:** (1) full national analytics; (2) PI-1 heavy →
  `excludedSuspectCount` large, several `absorptionPct: null`; (3) counties with
  `hasData:false` (uncovered) distinct from 0%; (4) program filter = PNMC (sparse)
  → mostly empty; (5) gated contractors → `withheldContractorCount` aggregate;
  (6) loading.

## UI structure

1. **Header** — breadcrumb, H1 "Analiză absorbție", subtitle, `CoverageRibbon` +
   `FreshnessBadge`. A prominent methodology note: "Absorbție = decontat /
   contractat. Valorile în verificare (PI-1) sunt excluse din calcul
   ({excludedSuspectCount})."
2. **Metric + filter bar** (sticky) — `metric` toggle (Absorbție / Blocate /
   Contractat), `level` toggle (Județ / UAT), Program + Domeniu `MultiSelect`.
3. **Split body** — left: choropleth (`InteractiveMap` heatmap colored by the
   chosen metric; `hasData:false` rendered in a neutral "fără date" pattern,
   legend distinguishes it from 0%). Right: a **panel switcher**
   (`toggle-group`: Județe / Constructori / Blocate / Domenii):
   - **Județe:** ranked table (worst absorption first) — Județ, Obiective,
     Contractat, Decontat, Absorbție (`AbsorptionBar`), Blocate. Row → county
     page; selected county highlighted on the map.
   - **Constructori:** top served contractors (name, CUI link, # obiective,
     total contractat) + `withheldContractorCount` notice. Links to `/firme`.
   - **Blocate:** stalled-objective cohort (`ObjectiveListRow`) → objective
     detail; header → `cautare` pre-filtered.
   - **Domenii / Programe:** breakdown bars (count + contracted + absorption),
     each drilling into `cautare`.
4. **Selected-territory side detail** — when `selected`, a compact summary of
   that county/UAT (reuses territory summary shape) + "Deschide pagina →".
5. **Footer** — `HowToReadData` methodology + source attribution.

## Component reuse and proposed new components

- Reuse: `InteractiveMap` (heatmap/choropleth mode + `HeatmapDataTable` as the
  tabular fallback), `MapLegend`, `Table`, `MultiSelect`, `toggle-group`,
  `Badge`, `Tooltip`, `Skeleton`, `EmptyState`, `Pagination`.
- Shared trust: `CoverageRibbon`, `FreshnessBadge`, `DataStatusBadge`,
  `EvidenceLink`, `SourceProvenanceDrawer`, `PrivacyBoundaryNotice`, `MapListSync`.
- New PI: `AmountWithEvidence`, `AbsorptionBar`, `ProgramChip`, `ObjectiveListRow`,
  `HowToReadData`.

## Interactions

- Metric/level/filter/panel/sort → search params. Map county click → `selected`
  + side detail. Ranking row → territory/objective/firme drill-through.
- "Vezi dovada" on aggregate figures → drawer (aggregate provenance/methodology).

## Loading / empty / error / partial / stale

- **Loading:** choropleth dot loader + ranking skeleton; filter bar interactive.
- **Empty:** filters yield no data → `EmptyState` "Nu există date pentru aceste
  filtre"; map shows neutral national outline.
- **Error:** error card + retry, URL intact.
- **Partial:** `excludedSuspectCount` + `withheldContractorCount` disclosed;
  uncovered counties shown as "fără date" (legend-distinguished); `null`
  absorption rows sorted/labeled, not treated as 0.
- **Stale:** `FreshnessBadge` muted; data-status notice when PI-1 active.

## Accessibility and i18n

- Choropleth paired with `HeatmapDataTable` (the ranking table is the accessible
  equivalent of the map). Legend distinguishes "fără date" via pattern+text, not
  color alone. `aria-sort` on ranking tables; `AbsorptionBar` `aria-label`.
- Lingui throughout; "absorbție", "blocate", program/domain labels localized.

## Privacy / provenance

- Top-contractor ranking is **gated** — only served parties named;
  `withheldContractorCount` shown as an aggregate, never as names.
- Aggregate figures carry methodology + `EvidenceLink` (how the aggregate was
  computed and that suspect rows are excluded). Uncovered vs. zero-absorption
  distinguished honestly (UX R7).

## Acceptance checklist

- [ ] `/investitii-publice/analiza` renders default (no params): absorption
      choropleth + county ranking (worst first).
- [ ] Suspect amounts excluded from absorption math with a visible count; `null`
      absorption never shown as 0; uncovered counties = "fără date".
- [ ] Panel switcher (Județe / Constructori / Blocate / Domenii) works and drills
      through to territory/firme/cautare/objective.
- [ ] Top contractors gated; `withheldContractorCount` disclosed; no gated name.
- [ ] Choropleth has a tabular equivalent; aggregates carry methodology +
      evidence; `yarn typecheck` clean; i18n done.

## Non-goals

- Time-series absorption curves (blocked on backfill — ADV-2).
- Contractor concentration/network charts (reserved/advanced).
- Cross-source money-flow diagrams (guardrail).
- Identity-confidence scatter (expert mode, out of N3).

## Open questions (blockers only)

- None. PI-1 handled by exclusion+labeling; contractor naming gated; coverage
  honesty built in.
