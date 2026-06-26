# Feature: Geography Profile (reporting unit across elections)

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §10.6, §13 high-value-next, §15.7.

## Feature owner profile

Frontend feature engineer (React 19, TanStack Router, shadcn/ui, Lingui) with
maps comfort. Handles cross-domain links (`/primarie`, budget) and SIRUTA join
correctness.

## Summary

A place-centric page: pick a reporting unit (county / commune-SIRUTA / polling
station / diaspora) and see **every election held there across years** — winners,
turnout, and how the place voted over time — with a map pin/context and
cross-links to the locality's budget/primărie pages on the same SIRUTA/CUI.

## Facts / Decisions / Assumptions

- **Fact:** `reporting_units` (139,763): `scope_type` (national/county/siruta/
  polling_station/diaspora), `scope_key, name, siruta_code, county_code,
  county_name, polling_station_number`.
- **Fact:** Results for a unit come from `result_rows` filtered by
  `reporting_unit`; the same SIRUTA joins to `/primarie` and budget pages.
- **Decision:** Join cross-domain links on `siruta_code` (numeric), never on
  locality name (per mock-first display rules). If a SIRUTA→CUI link is
  `manual-review`/uncertain, show confidence or hide the link by default.
- **Decision:** Cross-decade comparisons carry a boundary-change caveat:
  "Codurile SIRUTA și limitele administrative se pot schimba în timp" when the
  unit's history spans boundary changes (Assumption: not modeled precisely, so
  the caveat is shown whenever the year span is wide).
- **Decision:** Polling-station-level units are reachable but flagged as a
  high-cardinality, single-station view (expert entry from a commune).
- **Assumption:** A per-unit cross-election index is pre-aggregated; mock mimics.

## Route and URL state

- Route: `src/routes/alegeri/loc.$reportingUnitKey.tsx`.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `family` | csv enum | all | filter elections by family |
| `office` | csv enum | all | filter by office relevant to the unit |
| `yearFrom`/`yearTo` | int | none | |
| `view` | enum | `lista` | `lista \| harta` |
| `tab` | enum | `istoric` | `istoric \| compara` |
| `arhiva` | `0\|1` | `0` | include 1992–2007 |

## Data contract and mock states

Consumes via
`fetchGeographyProfile(reportingUnitKey, params): Promise<{ unit: ReportingUnitRef;
elections: GeoElectionRow[]; crossLinks: GeoCrossLink[]; coverage: CoverageMeta }>`.

```ts
interface GeoElectionRow {
  readonly electionKey: string
  readonly contestKey: string            // the contest covering this unit
  readonly family: ElectionFamily
  readonly year: number
  readonly officeLabel: string
  readonly winnerLabel: string | null    // competitor/candidate source label
  readonly winnerVotePercent: number | null
  readonly turnoutPercent: number | null
  readonly isFinal: boolean
  readonly provenance: SourcePointer
}

interface GeoCrossLink {
  readonly kind: 'primarie' | 'budget' | 'entity'
  readonly label: string
  readonly href: string                  // built on siruta_code/CUI
  readonly confidence: 'high' | 'manual_review' | null
}
```

Mock fixtures: `geo-{key}.ts`. Provide: a commune with local+parliamentary+
presidential history; a county; a diaspora unit; a polling station; a unit with a
`manual_review` cross-link; a wide year span (caveat) and a missing-turnout row.

States: full history; filtered; diaspora; polling-station; uncertain cross-link;
boundary-change caveat.

## UI structure

1. `PageHeader` — H1 = unit name + scope-type badge (Județ / Comună / Secție /
   Diaspora); county context; SIRUTA code chip (expanded on first use);
   breadcrumb `Alegeri / Locuri / {name}`.
2. `CoverageRibbon`.
3. **Context** band — small map pin (SIRUTA polygon/marker via
   `src/components/maps`) + county/SIRUTA metadata; cross-links rail
   (`/primarie/...`, budget, `/entities/$cui`) with confidence badges; uncertain
   links hidden-by-default behind "arată legături neconfirmate".
4. **Istoric** (`tab=istoric`) — filter bar (family, office, year, arhiva) +
   `GeoElectionsTable`/timeline: one row per election held here — year, family,
   office, winner (source label), winner %, turnout %, finality, provenance chip;
   row links to `/alegeri/contest/$contestKey?geo=<unit>` (deep-links straight to
   this unit's results). Wide-span caveat banner when applicable.
5. **Compară** (`tab=compara`) — entry to `election-swing-comparison.md` scoped
   to this unit (pick two elections of the same family/office to see the swing).
6. `RelatedLinksRail` — same as context cross-links + nearby units (optional).

## Component reuse and new components

- Reuse: `Tabs`, `Table`, `Badge`, `Select`, `Tooltip`, `Skeleton`, maps.
- Shared: `CoverageRibbon`, `DataStatusBadge`, `EvidenceLink`,
  `SourceProvenanceDrawer`, `RelatedLinksRail`, `IdentityConfidenceBadge`
  (for cross-link confidence), `ShareFilteredView`.
- New (module): `GeoElectionsTable`, `GeoContextMap`, `GeoCrossLinksRail`.

## Interactions

- Filters update URL + refetch.
- History row → contest explorer pre-drilled to this unit (`geo` param).
- Cross-links open `/primarie`/budget/entity (internal nav) carrying `from`
  context param; uncertain links gated behind a toggle.
- Provenance chips open drawer.
- Compare tab launches swing mode for this unit.

## Loading / empty / error / partial / stale states

- **Loading:** context skeleton + history table skeleton + map loading state.
- **Empty:** unit with no election coverage → `EmptyState` "Nu există rezultate
  publicate pentru acest loc" + suggestion to pick a parent unit.
- **Error:** retry, URL preserved; invalid key → not-found.
- **Partial:** missing winner/turnout → `—` + tooltip; partial coverage flagged
  in ribbon.
- **Boundary caveat:** shown when year span is wide.
- **Uncertain cross-link:** hidden by default, revealable with confidence label.
- **Stale:** `FreshnessBadge`.

## Accessibility and i18n

- Map is an enhancement; the history table is the primary, accessible path.
- Tables semantic; cross-link confidence conveyed by text + badge.
- Lingui copy; `ro-RO` formatting; expand SIRUTA, scope-type terms.

## Privacy, provenance, source citation

- Cross-domain joins are evidence-led on `siruta_code`/CUI; uncertain links show
  confidence or stay hidden.
- Every figure → provenance drawer.
- Winner labels are source labels (no person-identity assertion); diaspora and
  polling-station grain labeled honestly.

## Acceptance checklist

- [ ] Page lists every election held at the unit across years, filterable.
- [ ] History rows deep-link to the contest explorer pre-drilled to this unit.
- [ ] Cross-links built on SIRUTA/CUI, uncertain ones gated by confidence.
- [ ] Boundary-change caveat shown for wide spans.
- [ ] Provenance per figure; partial/missing render as `—`, not `0`.
- [ ] `yarn typecheck` clean; Lingui copy.

## Non-goals

- Full swing math (delegated to `election-swing-comparison.md`).
- Editing geography boundaries / SIRUTA reconciliation.
- Aggregating across multiple units (this is a single-unit profile).

## Open questions (blockers only)

None for mock-first. Precise SIRUTA boundary-change modeling and SIRUTA→CUI
certainty are data dependencies, designed around (caveat + confidence-gated
links), not blockers.
