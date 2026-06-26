# Elections (Alegeri) — Domain Design

- **Source UX:** `docs/ux-research/elections.md` · **Foundation:**
  `docs/design/README.md` · **UX handoff:** `./ux.md`
- **Route base:** `/alegeri` · **Feature module:** `src/features/elections/`
- **Schemas:** `src/schemas/elections.ts` · **State:** mock-first, no live API.

This document defines the domain-level patterns, routes, components, and the
**UI-boundary data contract** shared across all elections feature files. Feature
files restate the slice they need so they stay self-sufficient; this is the
single source of truth when two feature files disagree.

---

## 1. Domain purpose and scope

Provide an entity-centric, provenance-first exploration of Romanian election
results across five families and 1992–2025. Scope of these docs: the
MVP/Wave-1 + high-value Wave-2 surfaces listed in `ux.md`. Out of scope:
identity-resolution workspace, parliament cross-domain UI, polling-station
analytics dashboard, source-metric dictionary explorer, data-quality dashboard
(named in UX as advanced; not designed here).

Two non-negotiable boundaries shape every decision:

- **Decision:** Election results (`elections.result_rows`) are *never* presented
  as, mixed with, or iconographically blurred into parliamentary roll-call votes
  (`parliament.votes`). Labels: `Rezultate alegeri` vs `Vot parlamentar`.
- **Decision:** Candidate names are *source evidence*, not resolved identities,
  until `candidate_person_links` is populated. The string is never a join key
  for "same person".

---

## 2. High-level design patterns

- **Decision — Plain-language first, grain on demand.** Every results surface
  opens with a winner card + turnout line + ranked bar, then progressively
  discloses the full table, then expert grain (polling stations, source-metric
  codes) behind tabs/expanders. Casual users never hit a raw table first.
- **Decision — Entity profile spine.** Election, contest, competitor, candidate,
  reporting unit, referendum, and mandate are all entity pages with a shared
  scaffold: `PageHeader` (title + identity/finality badges) → `CoverageRibbon` →
  primary result band → tabbed/sectioned detail → `RelatedLinksRail`.
- **Decision — Provenance is one interaction away, everywhere.** Any number,
  chart point, or metric label has an `EvidenceLink` / chip that opens the
  shared `SourceProvenanceDrawer`. No number is shown without a path to its
  source row.
- **Decision — Coverage and freshness live next to the data.** A
  `CoverageRibbon` with `DataStatusBadge` (`mock` during this phase) sits below
  the page header on every domain page; known gaps and inaccessible-source
  counts are shown, not hidden.
- **Decision — Honest uncertainty as a first-class state.** "identitate
  nerezolvată", "mandate pe listă (nu persoane)", "în curs de finalizare",
  "sursă inaccesibilă (cu dovadă)", and "alias posibil" are designed states with
  copy and styling, not footnotes.
- **Decision — Investigative density, not dashboards.** Full-width bands and
  constrained unframed sections; cards only for repeated records (contest rows,
  competitor rows, option cards) and the provenance drawer. No nested cards, no
  decorative backgrounds, radii ≤ 8px (per foundation).
- **Decision — Geography is a synchronized map+list (`MapListSync`)**, reusing
  the platform SIRUTA/Leaflet infrastructure (`src/components/maps`), never a
  bespoke map stack.

---

## 3. Information architecture and routes

All routes are TanStack file routes under `src/routes/alegeri/`, each using
`validateSearch` with a Zod schema from `src/schemas/elections.ts` and
`createPublicPageCacheHeaders` (mirror `src/routes/parlament/`).

| Route | Purpose | Feature file |
| --- | --- | --- |
| `/alegeri` | Landing: year/family browser, featured election, geography entry | `elections-landing-browse.md` |
| `/alegeri/$electionKey` | Election hub: contests grouped by office/scope, headline summary | covered in `elections-landing-browse.md` §Election hub |
| `/alegeri/contest/$contestKey` | **Core** result explorer with geography drill-down | `contest-result-explorer.md` |
| `/alegeri/partid/$competitorKey` | Competitor/party cross-election profile | `competitor-party-profile.md` |
| `/alegeri/candidat/$candidateKey` | Candidate source-evidence profile | `candidate-source-profile.md` |
| `/alegeri/loc/$reportingUnitKey` | Geography profile across elections | `geography-profile.md` |
| `/alegeri/referendum/$contestKey` | Referendum option results | `referendum-results-page.md` |
| `/alegeri/mandate/$contestKey` | Mandate allocations + (pending) named mandates | `named-mandates-page.md` |

Cross-cutting (no own route): `source-provenance-drawer.md` (shared drawer),
`election-swing-comparison.md` (a `compare` mode on contest/geography pages +
optional `/alegeri/comparatie` surface), `global-search-integration.md` (edits
the existing entity-search routing), `mcp-tools-design.md` (server-side tool
contracts, no client route).

**Decision — Slug conventions.** Romanian public path (`/alegeri`, `partid`,
`candidat`, `loc`, `referendum`, `mandate`); route params are opaque keys
(`electionKey`, `contestKey`, `competitorKey`, `candidateKey`,
`reportingUnitKey`) matching scraper key columns, never names.

**Decision — `$electionKey` lives in MVP** even though it is not in the assigned
feature-file list: it is the hub that landing and every contest breadcrumb link
to. Its detailed spec is folded into `elections-landing-browse.md` (§Election
hub) so one owner builds the browse→election→contest path coherently.

### Shared URL state (search params)

Use the foundation's predictable names plus domain additions. All multi-value
params are comma-separated strings parsed by the route schema.

| Param | Used on | Meaning |
| --- | --- | --- |
| `q` | landing, search | free-text query |
| `family` | landing | `local,parlamentare,prezidentiale,europarlamentare,referendum` |
| `year` / `yearFrom` / `yearTo` | landing, profiles, compare | year or range |
| `round` | landing, contest | `1`, `2` |
| `authority` | landing | `AEP,BEC,ROAEP` |
| `office` | landing, profiles | `primar,consiliu_local,consiliu_judetean,presedinte,deputat,senator,europarlamentar` |
| `county` | contest, geography, profiles | county code |
| `locality` | contest, geography | SIRUTA code |
| `geo` | contest | active reporting-unit key for drill-down |
| `scope` | contest, profiles | `national,county,siruta,diaspora,polling_station` |
| `metric` | contest expert | active metric key |
| `competitor` | profile/compare select | competitor key(s) |
| `candidate` | compare | candidate key |
| `view` | contest, geography | `harta` \| `lista` \| `tabel` |
| `tab` | election, profiles, mandate | active section |
| `sort` | tables | sort column/direction |
| `page` / `pageSize` | expert tables | pagination |
| `compare` | contest, geography | other election/contest key for swing |
| `arhiva` | landing, profiles | `1` to include 1992–2007 historical corpus |
| `expert` | contest | `1` to reveal source-metric codes & polling grain |

**Decision — Defaults render with no params.** Landing defaults to "featured
latest + most recent year". Contest defaults to `view=lista`, `scope` =
contest's own scope, `arhiva=0`, `expert=0`. Invalid params are normalized by
route validation, never by component effects.

---

## 4. Shared layout and navigation

- **Decision — App entry.** Add `/alegeri` to the existing app sidebar
  navigation (`src/components/sidebar`) under the public-data domains group,
  with a ballot/vote icon (lucide `Vote`). Romanian label `Alegeri`.
- **Decision — Page scaffold** (`ElectionsPageLayout`, new, in feature module):
  1. `PageHeader` — H1 title, family/round/finality badges, breadcrumb.
  2. `CoverageRibbon` — authorities · years · freshness · gaps ·
     `DataStatusBadge`.
  3. Primary band — winner/summary or list/map.
  4. Detail — `Tabs` (Radix/shadcn) or stacked sections.
  5. `RelatedLinksRail` — narrow cross-entity links.
- **Decision — Breadcrumbs encode the drill path** and are shareable via URL:
  `Alegeri / Locale 2024 / Primar — Cluj-Napoca / Secția 12`. Each crumb is a
  link that updates `geo`/`scope`.
- **Decision — Result-vs-parliament separation in chrome.** Anywhere an election
  surface references parliament (e.g. a future MP link), it is in a clearly
  labeled `Activitate parlamentară (legătură)` block with the `Vot parlamentar`
  icon, never inline with `Rezultate alegeri`.

---

## 5. Domain components and reuse plan

### 5.1 Reuse existing (no new build)

- **shadcn/Radix primitives** (`src/components/ui`): `Button`, `Badge`, `Tabs`,
  `Table`, `Sheet` (provenance drawer base), `Dialog`, `Tooltip`, `Select`,
  `Popover`, `Skeleton`, `Breadcrumb`, `Card` (records only), `Command` (search).
- **Maps** (`src/components/maps`): `InteractiveMap`, `MapLegend`, `MapLabels`,
  SIRUTA series infra — for choropleth/winner maps and geography pins.
- **Charts** (`src/components/charts`): existing Recharts/Visx wrappers and
  `safe-responsive-container` for ranked bars, trend lines, turnout.
- **Entity-search** (`src/features/entity-search`): routing + doc-type-meta for
  global search integration.
- **Filter components** (`src/components/filters`): county/period/entity filter
  primitives for the landing facets and contest geography filters.

### 5.2 Cross-domain shared components (foundation-owned, this domain consumes)

These are standardized in `docs/design/README.md` and used by multiple domains.
Elections **consumes** them; if not yet built, the first consuming domain
builds them under `src/components/` (not inside `src/features/elections`). This
domain's owner coordinates rather than forking:

- `CoverageRibbon`, `DataStatusBadge`, `FreshnessBadge`, `EvidenceLink`,
  `IdentityConfidenceBadge`, `RelatedLinksRail`, `MapListSync`,
  `ShareFilteredView`, `RequestDatasetAction`, `PrivacyBoundaryNotice`,
  `SourceProvenanceDrawer`.

**Decision — `SourceProvenanceDrawer` is specified in detail by this domain**
(`source-provenance-drawer.md`) because elections has the richest source-pointer
shape (resource/file/row/hash + mapping status + access status). It is built as
a shared component with an elections adapter; other domains pass their own
provenance shape.

### 5.3 New elections-specific components (`src/features/elections/components`)

- `ElectionsPageLayout` — the scaffold in §4.
- `ElectionBrowser` — year×family grid/list with facet chips.
- `WinnerCard` — plain-language headline ("Câștigător: … — X voturi (Y%)").
- `RankedResultsChart` — horizontal ranked competitor/candidate bars (Recharts).
- `RankedResultsTable` — accessible tabular fallback + sort + provenance chip.
- `TurnoutSummary` — valid/invalid/total split with a small gauge + text.
- `GeographyDrilldown` — breadcrumb + child-unit list/map (wraps `MapListSync`).
- `CompetitorTimeline` — vote-share / mandate trend across elections.
- `CandidacyList` — candidacies with ballot/list position + identity caveat.
- `MandateAllocationPanel` — allocations by phase + named-mandate pending state.
- `ReferendumOptionResults` — option cards + per-geo table.
- `IdentityCaveatBanner` — the "nume din sursă" contract banner (wraps
  `IdentityConfidenceBadge` + `PrivacyBoundaryNotice`).
- `MetricSourceChip` — canonical metric label + source-family + `mapping_status`
  badge, opens provenance drawer.
- `SwingTable` / `SwingMap` — election-vs-election comparison.

**Decision — Promote to shared only on a second consumer.** Anything above that
a second domain needs (e.g. `RankedResultsChart`) is proposed for
`src/components/charts` at that point, not pre-emptively.

---

## 6. Data model at the UI boundary

**Decision — These are the canonical mock/view-model types.** Define in
`src/schemas/elections.ts` (Zod) and a `src/features/elections/types.ts`
re-export. Field names mirror `transparenta_prod.elections.*` so the live
adapter is a rename-free mapping. Mock fixtures live in
`src/features/elections/mocks/fixtures/`. The API boundary lives in
`src/features/elections/api/elections-api.ts` dispatching `.mock` / `.live` via
`isMockDataEnabled('elections')` (register dataset id `elections` in
`src/lib/scraper-references/catalog.ts`).

```ts
type ElectionFamily =
  | 'local' | 'parlamentare' | 'prezidentiale'
  | 'europarlamentare' | 'referendum'

type DataStatus =
  | 'live' | 'mock' | 'partial' | 'stale' | 'blocked' | 'unverified'

type AccessStatus =
  | 'ok' | 'inaccessible_with_evidence' | 'terminal_resource_requires_review'

// One source pointer — present on every result/candidacy/allocation row.
interface SourcePointer {
  readonly sourceResourceId: string
  readonly sourceFileId: string | null
  readonly sourceRowNumber: number | null
  readonly sourceRowHash: string | null
  readonly sourceUpdatedAt: string | null   // ISO
  readonly authority: 'AEP' | 'BEC' | 'ROAEP' | string
  readonly sourceFamily: string             // e.g. 'aep_ckan_csv_2024_local'
  readonly resourceUrl: string | null       // official resource, may be null
  readonly accessStatus: AccessStatus
}

// Coverage summary for CoverageRibbon (one per page).
interface CoverageMeta {
  readonly authorities: readonly string[]
  readonly yearsRange: readonly [number, number] | null
  readonly retrievedAt: string | null       // ISO -> "actualizat la"
  readonly publishedAt: string | null       // ISO -> "publicat la"
  readonly knownGaps: readonly string[]      // human strings
  readonly inaccessibleCount: number         // evidenced gaps
  readonly dataStatus: DataStatus
}

interface ElectionSummary {
  readonly electionKey: string
  readonly family: ElectionFamily
  readonly name: string                      // "Alegeri locale 2024"
  readonly date: string                      // ISO
  readonly year: number
  readonly round: number | null
  readonly roundLabel: string | null         // "Turul 2"
  readonly authority: string
  readonly publicationStatus: string         // source-published status string
  readonly isFinal: boolean
  readonly contestCount: number
  readonly coverage: CoverageMeta
}

interface ReportingUnitRef {
  readonly reportingUnitKey: string
  readonly scopeType: 'national' | 'county' | 'siruta' | 'polling_station' | 'diaspora'
  readonly scopeKey: string
  readonly name: string
  readonly sirutaCode: string | null
  readonly countyCode: string | null
  readonly countyName: string | null
  readonly pollingStationNumber: number | null
}

interface ContestSummary {
  readonly contestKey: string
  readonly electionKey: string
  readonly office: string                    // 'primar' | 'presedinte' | ...
  readonly officeLabel: string               // Romanian display
  readonly chamber: string | null
  readonly roundLabel: string | null
  readonly scopeType: 'siruta' | 'county' | 'diaspora' | 'national' | 'chamber' | 'source_constituency'
  readonly scopeKey: string
  readonly scopeLabel: string                // "Cluj-Napoca", "Diaspora"
  readonly constituencyCode: string | null
  readonly constituencyName: string | null
  readonly isReferendum: boolean
}

interface CompetitorResult {
  readonly competitorKey: string
  readonly sourceLabel: string               // verbatim, e.g. "P.S.D."
  readonly normalizedLabel: string | null
  readonly competitorType: 'party' | 'alliance' | 'independent' | 'unknown'
  readonly ballotPosition: number | null
  readonly votes: number | null              // null = metric absent here
  readonly votePercent: number | null
  readonly mandates: number | null           // allocation count, if any
  readonly rank: number | null
  readonly provenance: SourcePointer
}

interface TurnoutMetrics {
  readonly validVotes: number | null
  readonly invalidVotes: number | null       // "voturi nule"
  readonly totalVotes: number | null
  readonly registeredVoters: number | null   // often null -> caveat
  readonly turnoutPercent: number | null
  readonly derived: boolean                   // true if not source-published
  readonly provenance: SourcePointer | null
}

interface ContestResults {
  readonly contest: ContestSummary
  readonly election: ElectionSummary
  readonly unit: ReportingUnitRef            // currently viewed geography
  readonly children: readonly ReportingUnitRef[] // drill-down targets
  readonly competitors: readonly CompetitorResult[]
  readonly turnout: TurnoutMetrics
  readonly coverage: CoverageMeta
}

interface MandateAllocation {
  readonly competitorKey: string
  readonly sourceLabel: string
  readonly allocationPhase: string           // 'faza_1' | 'faza_2' | 'final' | source
  readonly mandates: number
  readonly isFinal: boolean
  readonly provenance: SourcePointer
}

interface CompetitorProfile {
  readonly competitorKey: string
  readonly sourceLabel: string
  readonly normalizedLabel: string | null
  readonly competitorType: CompetitorResult['competitorType']
  readonly aliasHint: readonly string[]      // possible aliases, never auto-merged
  readonly canonicalPartyKey: string | null  // null until competitor_party_links
  readonly appearances: readonly {
    readonly contestKey: string
    readonly electionKey: string
    readonly family: ElectionFamily
    readonly year: number
    readonly scopeLabel: string
    readonly officeLabel: string
    readonly votes: number | null
    readonly votePercent: number | null
    readonly mandates: number | null
    readonly rank: number | null
    readonly provenance: SourcePointer
  }[]
  readonly coverage: CoverageMeta
}

interface Candidacy {
  readonly contestKey: string
  readonly electionKey: string
  readonly year: number
  readonly officeLabel: string
  readonly scopeLabel: string
  readonly competitorKey: string | null
  readonly competitorLabel: string | null
  readonly ballotPosition: number | null
  readonly listPosition: number | null
  readonly isFinalList: boolean
  readonly allianceMemberLabel: string | null
  readonly votes: number | null              // present only when candidate-scoped
  readonly provenance: SourcePointer
}

interface CandidateProfile {
  readonly candidateKey: string
  readonly sourceFamily: string
  readonly sourceCandidateLabel: string      // verbatim ballot label
  readonly sourcePersonName: string | null   // source-published person name, if any
  readonly identityStatus: 'unresolved' | 'resolved'
  readonly identityConfidence: number | null // 0..1, null until resolved
  readonly identityMethod: string | null
  readonly parliamentMandateKey: string | null // null until parliament_mandate_links
  readonly candidacies: readonly Candidacy[]
  readonly coverage: CoverageMeta
}

interface ReferendumOptionResult {
  readonly optionKey: string
  readonly sourceLabel: string               // "DA" / "NU" / source verbatim
  readonly normalizedLabel: string | null
  readonly votes: number | null
  readonly votePercent: number | null
  readonly provenance: SourcePointer
}
```

**Decision — Null/unknown handling.** A `null` numeric means "metric not present
for this row/geography", rendered as `—` with a tooltip, never as `0`. A
`null` `resourceUrl` with `accessStatus !== 'ok'` renders the evidenced-gap
state. `registeredVoters: null` + `derived: true` triggers the turnout caveat.

**Decision — Named mandates.** `elected_candidate_mandates` is empty; there is
no `NamedMandate` view model populated in MVP. The mandate page models it as
`{ status: 'pending', reason: string }` and shows allocations only.

---

## 7. Feature implementation map

Ordered MVP-first (matches the assigned order):

1. `elections-landing-browse.md` — `/alegeri` + `/alegeri/$electionKey`.
2. `contest-result-explorer.md` — `/alegeri/contest/$contestKey` (core).
3. `competitor-party-profile.md` — `/alegeri/partid/$competitorKey`.
4. `candidate-source-profile.md` — `/alegeri/candidat/$candidateKey`.
5. `source-provenance-drawer.md` — shared drawer (consumed by 2,3,4,6,7,8).
6. `referendum-results-page.md` — `/alegeri/referendum/$contestKey`.
7. `named-mandates-page.md` — `/alegeri/mandate/$contestKey` (allocation-only).
8. `geography-profile.md` — `/alegeri/loc/$reportingUnitKey`.
9. `election-swing-comparison.md` — `compare` mode + `/alegeri/comparatie`.
10. `global-search-integration.md` — entity-search routing additions.
11. `mcp-tools-design.md` — MCP tool contracts.

Build order dependency: provenance drawer (5) is shared infra — build its
component contract alongside feature 2. Features 9–11 depend on 2–8 existing.

---

## 8. Responsive behavior

- **Decision — Mobile-first** (foundation). On <`md`: single column; map and
  list stack with a `view` toggle (`harta`/`lista`) instead of side-by-side;
  ranked chart collapses to top-N with "vezi toate"; tables become horizontally
  scrollable with a sticky first column (competitor/option name).
- **Decision — `md`+:** two-pane geography (map left, list right) via
  `MapListSync`; tabs horizontal; ribbon inline.
- **Decision — Provenance drawer** is a bottom `Sheet` on mobile, right `Sheet`
  on desktop (Radix `Sheet` side prop).
- **Decision — Sticky compact filter bar** on landing and contest when filtering
  is the main action.

---

## 9. Accessibility, i18n, privacy, provenance

- **Accessibility.** All controls keyboard-reachable and labelled; tables keep
  semantic markup with `<caption>`/`scope` headers; every chart has an adjacent
  text summary and the `RankedResultsTable` tabular fallback; badges are never
  the only state signal (text + icon + position accompany color); `Sheet`/
  `Dialog` manage focus and have headings + close controls; icon-only buttons
  carry `aria-label`; decorative icons `aria-hidden`.
- **i18n.** All copy via Lingui macros (`t`/`<Trans>`); Romanian primary,
  English via existing catalogs. Dates/numbers/percent/vote counts use
  `Intl`/locale-aware formatting (`ro-RO` default, `tabular-nums` for figures).
  Expand acronyms (AEP, BEC, ROAEP, SIRUTA) on first visible use or in tooltip.
- **Privacy.** No personal data is inferred. Candidate surfaces show source-only
  identity with the caveat banner; list placeholders without a source person
  name are excluded from named views; `PrivacyBoundaryNotice` explains any
  aggregation/redaction.
- **Provenance.** `CoverageRibbon` near every primary result; every number opens
  `SourceProvenanceDrawer`; evidenced gaps render as "sursă inaccesibilă (cu
  dovadă)"; cross-domain links state why two records connect and degrade to
  "indisponibil încă" when the link table is unpopulated.

---

## 10. Acceptance criteria (domain-level)

- `/alegeri` and all eight typed routes resolve, validate search params via Zod,
  and render mock data with `DataStatusBadge=mock`.
- No surface ever labels election results as parliamentary votes or vice versa.
- No candidate surface omits "Nume din sursă — identitate nerezolvată".
- No "winner as named elected person" copy appears anywhere mandates are
  allocation-only.
- Every displayed number reaches its source pointer in ≤1 interaction.
- Coverage, freshness, and known gaps are visible without opening docs.
- Default views render with zero query params; invalid params normalize via
  route validation.
- `yarn typecheck` clean; all copy in Lingui macros; locale-aware formatting.

---

## 11. Open questions (blockers only)

None block mock-first build. Data-work blockers gating specific Wave-2
capabilities (named persons, identity/party resolution, parliament linkage) are
already designed around per feature; they are tracked as product-owner items in
`ux.md` §Blockers, not as design blockers.
