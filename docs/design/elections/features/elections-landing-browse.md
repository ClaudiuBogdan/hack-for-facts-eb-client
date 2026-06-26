# Feature: Elections Landing & Browse (+ Election Hub)

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (canonical data contract in §6). UX: `docs/ux-research/elections.md` §10.1–10.2, §13.1.

## Feature owner profile

Frontend feature engineer (React 19, TypeScript, TanStack Router file routes,
shadcn/ui, Tailwind v4, Lingui). Comfortable with list/grid IA, facet filters,
and mock-first API adapters. No data-viz depth required.

## Summary

Two surfaces built by one owner because they form the browse→election→contest
entry path:

- **Landing `/alegeri`** — orient any user to the 44 elections by year × family,
  feature the latest election, and provide a geography entry ("Cum s-a votat în
  zona ta?").
- **Election hub `/alegeri/$electionKey`** — list one election's contests
  grouped by office and scope, with a headline summary, and link into the
  contest result explorer.

## Facts / Decisions / Assumptions

- **Fact:** 44 elections, 92,410 contests exist; `elections.elections` carries
  `election_key, election_family, election_name, election_date, election_year,
  election_round, authority, publication_status, is_final`.
- **Fact:** No live API; mock-first. Dataset id `elections`.
- **Fact:** Families: local, parliamentary, presidential, European, referendum.
- **Decision:** Landing default view shows the most recent election as a
  featured `WinnerCard`-style summary card plus a year-descending grouped list;
  no query params required.
- **Decision:** Default browse hides the 1992–2007 historical corpus behind an
  "Include arhivă (1992–2007)" toggle (`arhiva=1`) to protect comparability and
  perf; 2008–2025 shown by default. Surfaced to product owner in `ux.md`.
- **Decision:** Referendums appear in the family filter and route to
  `/alegeri/referendum/$contestKey`, not the standard contest explorer.
- **Assumption:** A small `featured`/`latest` flag is derivable from max
  `election_date`; if the adapter lacks it, mock picks the latest date.

## Route and URL state

- Routes: `src/routes/alegeri/index.tsx` (`/alegeri`),
  `src/routes/alegeri/$electionKey.tsx` (`/alegeri/$electionKey`).
- Both use `validateSearch` with Zod schemas from `src/schemas/elections.ts`
  and `createPublicPageCacheHeaders({ sharedMaxAgeSeconds: 600,
  staleWhileRevalidateSeconds: 3600 })` (mirror `src/routes/parlament/index.tsx`).

Landing search params (all optional, default-render with none):

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | `''` | matches election name |
| `family` | csv enum | all | `local,parlamentare,prezidentiale,europarlamentare,referendum` |
| `year` / `yearFrom` / `yearTo` | int | none | single or range |
| `round` | `1\|2` | none | |
| `authority` | csv enum | all | `AEP,BEC,ROAEP` |
| `arhiva` | `0\|1` | `0` | include 1992–2007 |
| `sort` | enum | `date_desc` | `date_desc,date_asc,name_asc` |

Election hub search params:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `tab` | enum | `contests` | `contests \| sumar` |
| `office` | csv enum | all | filter contests by office |
| `scope` | csv enum | all | `national,county,siruta,diaspora,source_constituency` |
| `q` | string | `''` | matches contest scope label / constituency |

## Data contract and mock states

Landing consumes `ElectionSummary[]` (domain §6) via
`fetchElectionsIndex(params): Promise<{ items: ElectionSummary[]; featured: ElectionSummary | null; coverage: CoverageMeta }>`.

Election hub consumes
`fetchElection(electionKey): Promise<{ election: ElectionSummary; contests: ContestSummary[]; headline: HeadlineContest[] }>`
where `HeadlineContest = { contest: ContestSummary; topCompetitor: CompetitorResult | null; turnout: TurnoutMetrics }`.

Mock fixtures: `src/features/elections/mocks/fixtures/elections-index.ts`,
`election-{key}.ts`. Provide ≥3 families, ≥2 years, one referendum, one
`is_final=false` election, and one with `coverage.inaccessibleCount > 0`.

Mock states to demonstrate: full list; empty (`q` no match); single-family;
historical-included; an election with `publicationStatus` provisional.

## UI structure

**Landing `/alegeri`:**

1. `PageHeader` — H1 `Alegeri` (`text-2xl font-semibold tracking-tight`), one
   muted intro line "Rezultatele alegerilor din România, 1992–2025, verificabile
   la sursă."
2. `CoverageRibbon` — authorities (AEP·BEC·ROAEP), year range, freshness,
   known-gap count, `DataStatusBadge=mock`.
3. Featured band — latest election card: name, date, family badge, finality
   badge, a one-line "X contests · Y judete" and a primary `Button` "Explorează"
   → `/alegeri/$electionKey`.
4. Sticky compact filter bar — family chips (multi), year range `Select`,
   authority `Select`, search `Input`, "Include arhivă (1992–2007)" `Switch`,
   `ShareFilteredView` button.
5. Election list — grouped by year (descending), each row = `ElectionBrowser`
   item: family icon + name + date + finality/`publicationStatus` badge +
   contest count + `ChevronRight`. Whole row links to the hub.
6. Geography entry — a `GeographyEntry` block: county `Select` (+ optional
   locality) → on submit routes to the latest local/relevant contest for that
   geography, or to `/alegeri/loc/$reportingUnitKey` when only geography chosen.
   Copy: "Cum s-a votat în zona ta?".
7. `RelatedLinksRail` — links to `/parlament`, `/primarie`, `/statistici`.

**Election hub `/alegeri/$electionKey`:**

1. `PageHeader` — election name H1; badges: family, `roundLabel`, `is_final`
   (`Final` / `Provizoriu`), `publicationStatus`; breadcrumb `Alegeri / {name}`.
2. `CoverageRibbon`.
3. Headline summary band (`tab=sumar` content, also a compact strip on
   `contests`) — for the 1–3 headline contests (e.g. presidential national,
   or "most-viewed"), a `WinnerCard` per headline with turnout line.
4. `Tabs`: `Contests` (default) | `Sumar`.
5. Contests tab — filter bar (office chips, scope `Select`, search) + grouped
   list: sections by office (`Primar`, `Consiliu local`, `Președinte`, …), each
   row = contest scope label + constituency + a mini result hint (top competitor
   label if available) + `ChevronRight` → `/alegeri/contest/$contestKey`
   (referendum contests → `/alegeri/referendum/$contestKey`).
6. `RelatedLinksRail`.

## Component reuse and new components

- Reuse: `Button`, `Badge`, `Input`, `Select`, `Switch`, `Tabs`, `Breadcrumb`,
  `Skeleton`, `Card` (record rows), `Command`/filter chips from
  `src/components/filters`, lucide icons (`Vote`, `MapPin`, `ChevronRight`).
- Shared: `CoverageRibbon`, `DataStatusBadge`, `FreshnessBadge`,
  `ShareFilteredView`, `RelatedLinksRail`.
- New (feature module): `ElectionBrowser`, `ElectionListRow`, `GeographyEntry`,
  `WinnerCard` (shared with contest explorer — build here, export from module),
  `ElectionsPageLayout`.

## Interactions

- Filter changes update search params (replace history) and refetch via
  TanStack Query keyed on params.
- Family chips toggle membership in the csv `family` param.
- "Include arhivă" toggles `arhiva`; when off, list shows a muted footer "N
  alegeri istorice (1992–2007) ascunse — activează arhiva".
- Geography entry: county select populates locality select; submit routes.
- Hub office/scope filters update params; section collapse is local state.

## Loading / empty / error / partial / stale states

- **Loading:** `Skeleton` rows for list; ribbon shows skeleton chips. Use the
  shared dot loader only for full-page initial load.
- **Empty (filtered):** `EmptyState` — "Nicio alegere nu corespunde filtrelor"
  + "Resetează filtrele" button. Default (unfiltered) is never empty.
- **Error:** inline `EmptyState` variant with retry; URL preserved.
- **Partial:** elections with `coverage.knownGaps` show a small "acoperire
  parțială" badge on the row and in the ribbon.
- **Stale:** if `coverage.dataStatus='stale'`, ribbon shows `FreshnessBadge`
  with "date pana la …" and an amber dot (color + text).
- **Provisional:** `is_final=false` → `Provizoriu` badge (text + icon, not color
  only).

## Accessibility and i18n

- List rows are single focusable links with descriptive `aria-label`
  ("Alegeri locale 2024 — 12.500 de contests"); chevrons `aria-hidden`.
- Filter controls labelled; `Switch` has visible label.
- All copy in Lingui macros; Romanian primary. Expand AEP/BEC/ROAEP/SIRUTA on
  first use or tooltip. Dates via `Intl.DateTimeFormat('ro-RO')`, counts via
  `toLocaleString('ro-RO')`.

## Privacy, provenance, source citation

- No personal data. Each election row carries authority + `publicationStatus`;
  the ribbon exposes coverage and inaccessible-source count.
- Featured/headline numbers (turnout, top competitor) each carry an
  `EvidenceLink` opening `SourceProvenanceDrawer` (see `source-provenance-drawer.md`).
- Referendum and non-final elections labelled honestly.

## Acceptance checklist

- [ ] `/alegeri` renders featured + grouped list with no query params.
- [ ] Family/year/authority/arhiva filters update URL and results; defaults
      hide 1992–2007.
- [ ] Geography entry routes to a relevant contest or geography profile.
- [ ] `/alegeri/$electionKey` lists contests grouped by office, links to the
      correct detail route (referendum vs contest).
- [ ] Coverage ribbon + freshness + `DataStatusBadge=mock` present on both.
- [ ] Provisional / partial / inaccessible states render with text+icon, not
      color alone.
- [ ] `yarn typecheck` clean; all copy via Lingui.

## Non-goals

- Result drill-down and maps (belongs to `contest-result-explorer.md`).
- Cross-election comparison (belongs to `election-swing-comparison.md`).
- Competitor/candidate aggregation (their own profiles).

## Open questions (blockers only)

None. The 2008–2025 default vs full-history exposure is a decided default with a
product-owner confirmation item already logged in `ux.md`.
