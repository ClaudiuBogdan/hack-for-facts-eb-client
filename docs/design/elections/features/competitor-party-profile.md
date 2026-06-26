# Feature: Competitor / Party Profile (cross-election)

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §10.4, §13.3, §15.8.

## Feature owner profile

Frontend feature engineer (React 19, TanStack Router, shadcn/ui, Lingui) with
**temporal data-viz** comfort (trend lines via Recharts). Understands the
party-label-drift caveat.

## Summary

A single page aggregating one electoral competitor's history across all
contests and years: source label (verbatim) + normalized label, a vote-share /
mandate-count timeline, geographies of strength, and a filterable contest list.
Answers "How has party X done over time?" while honestly signalling that
cross-election grouping is by `competitor_key`, not a canonical party, until
`competitor_party_links` is populated.

## Facts / Decisions / Assumptions

- **Fact:** `electoral_competitors` (128,025): `competitor_key, source_family,
  source_label, normalized_label, competitor_type`. `contest_competitors` links
  to contests with `ballot_position`. `competitor_mandate_allocations` (130,238)
  gives party/list mandate counts.
- **Fact:** `competitor_party_links` is empty → no canonical party key;
  cross-election timelines are approximate.
- **Decision:** Group strictly by `competitor_key`. Show source labels verbatim.
  Display an `alias posibil` hint listing other competitor keys with similar
  normalized labels, **never auto-merged** — each is a separate, linkable entity.
- **Decision:** The timeline plots vote-share and mandate-count per election the
  competitor contested; gaps (elections not contested) are visible gaps, not
  zero-interpolated.
- **Decision:** Mandate counts shown as "mandate pe listă/partid (alocări)",
  never "X persoane alese".
- **Assumption:** Aggregates (per-election vote totals/shares) come from
  pre-aggregated read models; mock mimics this.

## Route and URL state

- Route: `src/routes/alegeri/partid.$competitorKey.tsx`
  (`/alegeri/partid/$competitorKey`).

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `tab` | enum | `istoric` | `istoric \| contests \| geografie` |
| `family` | csv enum | all | filter appearances by election family |
| `office` | csv enum | all | filter by office |
| `yearFrom`/`yearTo` | int | none | |
| `metricKind` | enum | `vote_share` | timeline metric: `vote_share \| mandates \| votes` |
| `sort` | enum | `year_desc` | contest list sort |
| `arhiva` | `0\|1` | `0` | include 1992–2007 |

## Data contract and mock states

Consumes `CompetitorProfile` (domain §6) via
`fetchCompetitorProfile(competitorKey, params): Promise<CompetitorProfile>` and
`fetchCompetitorAliases(competitorKey): Promise<{ competitorKey: string;
sourceLabel: string; reason: string }[]>`.

Mock fixtures: `competitor-{key}.ts`. Provide: a major party across ≥4
elections, an alliance, an independent (single appearance), one with an
`aliasHint`, one with elections not contested (timeline gap), and one
appearance with `mandates=null`.

States: multi-decade history; single appearance; alias-rich; mandate-bearing
parliamentary; local-only competitor.

## UI structure

1. `PageHeader` — H1 = `sourceLabel`; secondary muted `normalizedLabel`;
   `competitor_type` badge (Partid / Alianță / Independent); breadcrumb `Alegeri
   / Partide / {label}`. If `aliasHint` non-empty, an inline "alias posibil"
   chip → `Popover` listing related competitor keys as links (with "nu sunt
   îmbinate automat" note).
2. `CoverageRibbon`.
3. `PrivacyBoundaryNotice` (compact) — "Gruparea este pe etichetă de sursă
   (`competitor_key`), nu pe partid canonic. Legătura la partid normalizat va fi
   disponibilă ulterior."
4. `Tabs`: `Istoric` (timeline) | `Contests` | `Geografie`.
5. **Istoric** — `CompetitorTimeline`: line/area chart over elections with a
   `metricKind` toggle (vote-share / mandates / votes); contested elections are
   points, gaps shown; tooltip per point with `EvidenceLink`. Adjacent text
   summary + a tabular fallback (year, election, votes, %, mandates, rank).
6. **Contests** — filter bar (family, office, year range, arhiva) + appearances
   table: election, year, office, scope, votes, %, mandates, rank, provenance
   chip; each row links to `/alegeri/contest/$contestKey`.
7. **Geografie** — `MapListSync` choropleth of the competitor's vote-share by
   county for a selected election (election `Select`), reusing SIRUTA series;
   list of strongest geographies.
8. `RelatedLinksRail` — candidates who ran under this competitor (source-label
   links), the election hubs, `/parlament/grupuri` (clearly labeled as a
   separate parliamentary group concept, not vote conflation).

## Component reuse and new components

- Reuse: `Tabs`, `Table`, `Badge`, `Select`, `Popover`, `Tooltip`, `Skeleton`,
  charts, maps.
- Shared: `CoverageRibbon`, `DataStatusBadge`, `EvidenceLink`,
  `SourceProvenanceDrawer`, `PrivacyBoundaryNotice`, `RelatedLinksRail`,
  `MapListSync`, `ShareFilteredView`.
- New (module): `CompetitorTimeline`, `CompetitorAppearancesTable`,
  `AliasHintPopover`.

## Interactions

- Tab/filter/metric changes update URL + refetch.
- Timeline point click opens the contest (`/alegeri/contest/$contestKey`).
- Alias chip opens popover; alias links navigate to that competitor's profile.
- Geography election select recolors the map.
- Provenance chips open the drawer.

## Loading / empty / error / partial / stale states

- **Loading:** header skeleton + chart/table skeletons.
- **Empty:** valid competitor with no appearances after filters → `EmptyState`
  "Nicio candidatură pentru filtrele alese" + reset; competitor with zero total
  appearances is treated as not-found.
- **Error:** retry, URL preserved; invalid key → not-found.
- **Partial:** appearances missing mandate/vote metrics → `—` + tooltip; ribbon
  flags partial.
- **Stale:** `FreshnessBadge`.

## Accessibility and i18n

- Timeline chart has text summary + tabular fallback; keyboard-navigable points
  or table-first interaction.
- Tables semantic; badges paired with text.
- Lingui macros; `ro-RO` formatting; expand `competitor_type` values, "alocări
  de mandate".

## Privacy, provenance, source citation

- Source labels verbatim; no silent merge; alias only as a hint.
- Mandate counts = allocations, never named persons.
- Every figure → provenance drawer.
- Canonical party absence stated explicitly.

## Acceptance checklist

- [ ] Profile groups strictly by `competitor_key`; source label verbatim.
- [ ] Timeline shows contested elections with real gaps, metric toggle works.
- [ ] Alias hints visible, linkable, explicitly not auto-merged.
- [ ] Appearances table links to contests; provenance per row.
- [ ] Geography map by selected election.
- [ ] Mandate copy is "alocări pe listă/partid", never named persons.
- [ ] Canonical-party absence disclosed via `PrivacyBoundaryNotice`.
- [ ] `yarn typecheck` clean; Lingui copy.

## Non-goals

- Canonical party normalization / merging (pending `competitor_party_links`).
- Candidate person resolution.
- Mandate-vs-vote-share deviation analytics (advanced).

## Open questions (blockers only)

None for mock-first. Canonical party linkage is a data dependency, designed
around (source-label grouping + alias hint), not a blocker.
