# Feature: Contest Result Explorer (core MVP)

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §10.3, §13.2, §17. **This is the most important MVP feature.**

## Feature owner profile

Senior frontend feature engineer (React 19, TypeScript, TanStack Router,
shadcn/ui, Tailwind v4, Lingui) with **data-viz and maps** experience
(Recharts, Leaflet via `src/components/maps`). Handles geography drill-down,
ranked charts, and the provenance interaction.

## Summary

Answer "How did my county/commune vote in election X?" in one screen: a contest
header, plain-language winner card, ranked competitor results, turnout summary,
and a national→county→commune→polling-station geography drill-down — every
number traceable to its source row. Replaces today's "download and parse CSV"
workflow.

## Facts / Decisions / Assumptions

- **Fact:** `result_rows` (~102.4M) are clean: `numeric_value` 100% populated,
  integer vote counts, raw==numeric, plausible magnitudes.
- **Fact:** A contest is `contest × reporting_unit × metric × (competitor?) ×
  (candidate?)`. `reporting_units` go national→county→siruta→polling_station
  (139,763), plus diaspora.
- **Fact:** Mandate *allocation* counts exist; named elected persons do not.
- **Decision:** Default geography = the contest's own scope (national, a county,
  a constituency, or diaspora). Drill-down narrows via the `geo`/`scope` params.
- **Decision:** Polling-station grain is **expert-mode** (`expert=1`),
  paginated, never the default, to protect clarity and perf.
- **Decision:** The explorer shows **competitor-level** results by default. For
  contests where candidates are the unit (e.g. presidential, mayoral), the
  ranked rows are candidates; the data contract's `CompetitorResult` carries the
  candidate label when `competitorType` is independent/candidate-scoped. A
  `Candidaturi` expander lists the full candidacy roster (ballot/list positions).
- **Decision:** Mandate allocation gets a compact panel here with a link to the
  full `/alegeri/mandate/$contestKey` page (see `named-mandates-page.md`).
- **Assumption:** Pre-aggregated read models supply contest-level winner,
  turnout, and per-competitor totals per reporting unit; the mock mimics this
  (no client-side 102M aggregation). Marked assumption pending backend.

## Route and URL state

- Route: `src/routes/alegeri/contest.$contestKey.tsx` (`/alegeri/contest/$contestKey`).
- `validateSearch` (Zod, `src/schemas/elections.ts`) +
  `createPublicPageCacheHeaders`.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `geo` | string | contest scope | active reporting-unit key |
| `scope` | enum | contest scope | `national,county,siruta,diaspora,polling_station` |
| `view` | enum | `lista` | `harta \| lista \| tabel` |
| `metric` | string | `voturi` | active metric for map/table coloring |
| `sort` | enum | `votes_desc` | results table sort |
| `expert` | `0\|1` | `0` | reveal polling-station grain + source-metric codes |
| `compare` | string | none | other election/contest key → swing mode |
| `tab` | enum | `rezultate` | `rezultate \| candidaturi \| mandate \| date` |
| `page`/`pageSize` | int | `1`/`50` | expert table pagination |

`geo`/`scope`/`view` are the shareable drill state; breadcrumb clicks rewrite
them. Defaults render with no params.

## Data contract and mock states

Consumes `ContestResults` (domain §6) via
`fetchContestResults({ contestKey, geo, scope, metric }): Promise<ContestResults>`
and `fetchContestChildren({ contestKey, geo }): Promise<ReportingUnitRef[]>` for
lazy drill-down. Mandate panel uses
`fetchContestMandates(contestKey): Promise<MandateAllocation[]>`.

Mock fixtures: `src/features/elections/mocks/fixtures/contest-{key}.ts`.
Provide: a presidential runoff (candidate-unit, 2 rounds), a local mayoral
contest (independent + parties), a parliamentary list contest (mandates), a
diaspora contest. Include one geography with a `null` turnout metric, one with
`accessStatus='inaccessible_with_evidence'`, and one competitor with
`votePercent=null`.

States to demonstrate: full results; drilled to commune; drilled to polling
station (expert); turnout-missing; inaccessible source; single-competitor
(unopposed); tie at rank 1.

## UI structure

1. `PageHeader` — H1 = office + scope ("Primar — Cluj-Napoca"); badges: family,
   `roundLabel`, finality; breadcrumb `Alegeri / {election} / {office} /
   {geography}` (each crumb a drill link). Distinct **`Rezultate alegeri`** label
   chip to enforce the parliament boundary.
2. `CoverageRibbon` — authority, source family, freshness, gaps, `DataStatusBadge`.
3. **Winner band** — `WinnerCard`: "Câștigător: {label} — {votes} voturi ({pct}%)"
   with checkmark icon, plus plain-language turnout line "Prezență: X% (Y voturi
   valide, Z nule)". `EvidenceLink` on each figure.
4. **Geography drill** — `GeographyDrilldown` (wraps `MapListSync`):
   - `view` toggle `Hartă | Listă | Tabel`.
   - Map (Leaflet, SIRUTA series) colored by `metric` (winner / vote-share /
     turnout) with `MapLegend`; clicking a unit sets `geo`/`scope`.
   - Synced child-unit list: each child = name + leading competitor + turnout +
     `ChevronRight`.
   - Breadcrumb up; "Vezi secțiile de votare" reveals polling stations
     (`expert=1`).
5. **Results** (`tab=rezultate`) — `RankedResultsChart` (horizontal bars,
   competitor/candidate, votes + %) above `RankedResultsTable` (sortable:
   rank, label, votes, %, mandates?, provenance chip). Source-label verbatim;
   `normalizedLabel` as secondary muted text; `alias posibil` hint where set.
6. **Candidaturi** (`tab=candidaturi`) — `CandidacyList`: full roster with
   ballot/list position, alliance member label, `is_final_list`, and the
   identity caveat ("nume din sursă"). Links to `/alegeri/candidat/$candidateKey`.
7. **Mandate** (`tab=mandate`) — compact `MandateAllocationPanel` (allocation by
   phase) + link to full mandate page; named-person row shows "în curs de
   finalizare".
8. **Date / sursă** (`tab=date`) — the full result table at current grain with a
   per-row provenance chip, `metric` selector exposing canonical label +
   `mapping_status` + source-metric code (when `expert=1`), and
   `ShareFilteredView` + export-to-CSV/JSON of the *current view* (gated note:
   bulk/all-rows export is out of scope — see non-goals).
9. `RelatedLinksRail` — same geography `/alegeri/loc/$reportingUnitKey`,
   `/primarie`, budget; same election hub; competitor profiles.

## Component reuse and new components

- Reuse: `Tabs`, `Table`, `Badge`, `Button`, `Select`, `Tooltip`, `Breadcrumb`,
  `Skeleton`, `Sheet` (drawer), maps (`InteractiveMap`, `MapLegend`,
  `MapLabels`), charts (`safe-responsive-container`, Recharts bar).
- Shared: `CoverageRibbon`, `DataStatusBadge`, `MapListSync`, `EvidenceLink`,
  `SourceProvenanceDrawer`, `ShareFilteredView`, `RelatedLinksRail`,
  `IdentityConfidenceBadge` (on candidaturi).
- New (module): `WinnerCard`, `RankedResultsChart`, `RankedResultsTable`,
  `TurnoutSummary`, `GeographyDrilldown`, `CandidacyList`,
  `MandateAllocationPanel`, `MetricSourceChip`.

## Interactions

- Drill: map click or list `ChevronRight` sets `geo`/`scope` → refetch; back via
  breadcrumb. Lazy-load children per level (avoid 102M-scale fetches).
- `view` toggle swaps map/list/table without losing `geo`.
- `metric` select recolors map and reorders nothing (table sort is separate).
- Sort: table header click toggles `sort`.
- Any number/chip click opens `SourceProvenanceDrawer` with that row's pointer.
- Expert toggle reveals polling stations + source-metric codes; paginated.
- `compare` set (from a "Compară cu altă alegere" control) enters swing mode →
  see `election-swing-comparison.md`.

## Loading / empty / error / partial / stale states

- **Loading:** layout skeleton — winner card placeholder, chart skeleton, list
  skeleton rows, map shows the platform map loading state.
- **Empty:** a valid contest with no results at the chosen geography →
  `EmptyState` "Nu există rezultate publicate pentru această zonă la acest scrutin"
  + "Revino la {parent}". Never render zeros for missing data.
- **Error:** fetch failure → `EmptyState` retry, URL preserved; invalid
  `contestKey` → route-level not-found.
- **Partial:** metric-only/metadata-only lanes → row shows `—` + tooltip "metric
  indisponibil pentru această sursă"; ribbon flags partial coverage.
- **Inaccessible:** `accessStatus='inaccessible_with_evidence'` →
  "Sursă inaccesibilă (cu dovadă)" badge + `EvidenceLink`, not zeros.
- **Stale:** `FreshnessBadge` "date pana la …" with text+icon.
- **Tie:** two rank-1 rows → both flagged "la egalitate" in `WinnerCard` (no
  single winner asserted).

## Accessibility and i18n

- Map and chart each have an adjacent text summary; `RankedResultsTable` is the
  accessible tabular fallback for the chart (announce via `aria-describedby`).
- Table uses semantic `<th scope>` and a `<caption>` ("Rezultate {office} —
  {geography}").
- Drill list rows and breadcrumb crumbs are keyboard-reachable links; map units
  reachable via the synced list (map is enhancement, not sole path).
- Color encodes winner/share only alongside text + legend.
- Lingui macros throughout; `ro-RO` number/percent/date formatting,
  `tabular-nums` for figures. Expand SIRUTA, "tur 1/tur 2", metric names.

## Privacy, provenance, source citation

- **Hard boundary:** label band "Rezultate alegeri"; never an MP-vote icon or
  "vot parlamentar" wording. Any elected→MP link is a clearly separate
  `Activitate parlamentară` rail item, "indisponibil încă" until
  `parliament_mandate_links` exists.
- **Identity:** candidacy roster uses source labels with the identity caveat;
  never merges by name.
- **Provenance:** every figure → `SourceProvenanceDrawer` (resource/file/row/
  hash/authority/source family/mapping status). Metric chip shows canonical vs
  source-metric mapping with `mapping_status`.
- **Mandates:** allocation counts only; named persons "în curs de finalizare".

## Acceptance checklist

- [ ] Default `/alegeri/contest/$contestKey` renders winner + turnout + ranked
      results + geography at contest scope, no query params.
- [ ] Drill national→county→commune updates URL (`geo`/`scope`) and data;
      breadcrumb navigates back.
- [ ] Polling-station grain only under `expert=1`, paginated.
- [ ] Map/list/table views stay in sync on the same `geo`.
- [ ] Every number opens the provenance drawer in one click.
- [ ] Missing/ inaccessible metrics render as `—` / evidenced gap, never `0`.
- [ ] Candidate-unit contests rank candidates with source-identity caveat.
- [ ] Mandate panel shows allocations only; no named winner copy.
- [ ] "Rezultate alegeri" boundary chip present; no parliament-vote conflation.
- [ ] `yarn typecheck` clean; Lingui copy; locale-aware formatting.

## Non-goals

- Bulk export of arbitrary all-rows result sets (gated to analytics; only
  current-view export here).
- Cross-election swing math (delegated to `election-swing-comparison.md`).
- Named elected persons (gated data; `named-mandates-page.md`).
- Candidate identity resolution UI (out of MVP).

## Open questions (blockers only)

None for mock-first build. Live integration depends on pre-aggregated contest
read models (assumption above); if the backend serves raw grain only, perf
tuning is an implementation concern, not a design blocker.
