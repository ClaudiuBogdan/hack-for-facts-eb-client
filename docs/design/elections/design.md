# Elections (Alegeri) — Domain Design

- **Source UX:** `docs/ux-research/elections.md` · **Foundation:**
  `docs/design/README.md` · **UX handoff:** `./ux.md`
- **Route base:** `/alegeri` · **Feature module:** `src/features/elections/`
- **Schemas:** `src/schemas/elections.ts` · **State:** mock-first, no live API.

> **2026-10-14:** §1–11 are the mock-era design (June–September 2026), kept as
> background. The redesign on the live API starts at
> [§12](#12-redesign-on-the-live-api-2026-10-14): what the API serves, the data
> rules, the server asks and the **Guidelines** every elections page follows.
> Where §12 and §1–11 disagree, §12 wins.

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

---

## 12. Redesign on the live API (2026-10-14)

The elections area is redesigned in the family the newer areas share
(procurement, INS, companies, national budget, justice, public enterprises):
a front door in the hubs' shape, an analysis page in `/procurement/analytics`'s
shape, and record pages in the procurement profiles' shape. This section is
written before any prototype: what the API serves (§12.1–12.2), the data rules
it forces (§12.3), the server asks (§12.4), the **Guidelines** (§12.5) and the
mock-era code audit (§12.6).

**State of the client on 2026-10-14.** `c26dd15d` (13:37, on `origin/dev`)
put a live catalog at `/alegeri` (`src/features/elections/catalog/`,
`src/schemas/elections-catalog.ts`) and turned the `elections` flag **on** in
`src/config/feature-flags.ts`; `042809b9` added its tests. The sidebar and the
landing page link it. It lists editions by key and contests by label, in its
own layout, not the family's. The mock-era pages (landing, hub, results
explorer) are no longer routed. The elections session's brief predates that
commit (it says the flag is off); the flag stays as the owner left it.

### 12.1 What the API serves

Read from the server's `origin/dev` (`src/modules/elections/`, commit
`c8f946ec` „Serve Elections source metadata"; there is no
`docs/server-redesign/` page for it) and probed through the worktree's Vite
proxy on 2026-10-14. Introspection is off; the deployed schema answers exactly
as the source says.

| Root | Returns | Filters (`in` only, ≤100 values) | Paging |
|---|---|---|---|
| `electionCatalog(filter, page, pageSize)` | `ElectionEditionPage` — editions, `total` exact | `reportedYears`, `reportedFamilies`, `eventKeys` | `electionKey` order, pageSize ≤ 100 |
| `electionEdition(electionKey)` | one edition, or null | — | — |
| `electionContests(electionKey, filter, page, pageSize)` | `ElectionContestPage` — contests of one edition, `total` exact; `NOT_FOUND` for an absent edition | `reportedOffices`, `scopeTypes`, `reportedRounds` | `contestKey` order, pageSize ≤ 100 |
| `electionContest(contestKey)` | one contest, or null | — | — |

The same four reads exist as REST (`GET /api/v1/elections/editions`,
`/editions/lookup`, `/contests`, `/contests/lookup`; keys as query
parameters) and MCP (`list_election_editions`, `get_election_edition`,
`list_election_contests`, `get_election_contest`). Reads answer in 50–190 ms;
every reply is `no-store`.

- **Edition:** `electionKey`, `eventKey` (platform grouping, unverified),
  `reportedName`, `reportedYear`, `verifiedYear` (always null),
  `reportedFamily`, `verifiedFamily` (always null), `reportedRound`,
  `reportedDate`, `reportedAuthority`, `readiness`.
- **Contest:** `contestKey`, `electionKey`, `eventKey`, `reportedOffice`,
  `verifiedOffice` (always null), `chamber`, `reportedRound`, `scopeType`
  (`siruta | county | diaspora | national | chamber | source_constituency`),
  `sourceScopeKey`, `scopeLabel`, `constituencyCode`, `constituencyName`,
  `readiness`.
- **Readiness** (`identity`, `sourceSelection`, `sourceOpening`, `results`,
  `mandates` ∈ `VERIFIED | HELD | UNAVAILABLE | UNKNOWN`, plus `issues`) is a
  **constant of this release**: `HELD/HELD/HELD/UNAVAILABLE/UNAVAILABLE` on
  all 50 editions and all 105,340 contests. Every edition carries
  `SOURCE_SELECTION_UNVERIFIED, SOURCE_ARTIFACT_ACCESS_HELD,
  RESULTS_UNAVAILABLE, MANDATES_UNAVAILABLE, EDITION_IDENTITY_UNVERIFIED,
  RESULT_STATUS_UNQUALIFIED, REPORTED_DATE_MISSING, EVENT_LINK_UNVERIFIED`;
  every contest `CONTEST_IDENTITY_UNVERIFIED, CONTEST_SCOPE_UNVERIFIED,
  SOURCE_SELECTION_UNVERIFIED, SOURCE_ARTIFACT_ACCESS_HELD,
  RESULTS_UNAVAILABLE, MANDATES_UNAVAILABLE, EVENT_LINK_UNVERIFIED`. No row
  is told apart by its readiness.
- **Not served at all:** votes, turnout, candidates, candidacies, parties and
  coalitions, list allocations, seats, mandates, officeholders, people,
  source files or links, any date of capture or load, events as a read of
  their own, any aggregate, any search by place or label. Unknown roots
  (`electionEvents`, `electionResults`, `electionCandidates`) and fields
  (`contests`, `source`, `territoryId`) answer „Cannot query field".

### 12.2 What the data holds (measured 2026-10-14)

Every edition and every contest was read (1,060 contest pages).
**50 source editions, 35 platform events, 105,340 contest rows.**

**Events and their editions.** Grouped by `eventKey`; the family in the key
is the event's, the edition's `reportedFamily` can disagree.

| Family (event key) | Years | Editions | Notes |
|---|---|---|---|
| Local (`ro:local:*`) | 1996, 1998 (`:partial`, Bucharest general mayor only), 2000, 2004, 2008, 2012, 2014, 2016, 2020, 2024 | 22 | 2012 in 4 editions, 2014 in 5, 2020 in 3, 2024 in 2 |
| Parliamentary (`ro:parliamentary:*`) | 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024 | 12 | 2012, 2016, 2020 in 2 each; 2024 is 43 county-level Chamber rows from a candidate list (no Senate) |
| Presidential (`ro:presidential:*`) | 1992, 1996, 2000, 2004, 2009, 2014, 2019 | 7 | one national contest each; round label `tur2`, except 2004 (`tur1`) |
| European (`ro:european:*`) | 2007, 2009, 2014, 2019 | 5 | stored with family `parliamentary`; 2019 in 2 editions |
| Referendum (`ro:referendum:*`) | 2003, 2007, 2012, 2018, 2019 | 6 | one national contest each; 2019 in 2 editions |

- **Labels say little.** `reportedName` equals `electionKey` on 50/50
  editions (no human title); `reportedDate` is null on 50/50;
  `reportedAuthority` is the one string `BEC/AEP/ROAEP` on 50/50. The key's
  prefix (`bec-`, `aep-`, `roaep-`, `alegeri-pentru-…` — AEP's CKAN slug —
  `locale-2000`) is the only hint of the publisher, and it is not a field.
  Edition round labels: `tur1`, `tur2`, `tur3`, `final`, `1`, or null.
- **Family labels are wrong in 7 editions**, and the filter matches them as
  stored: the five European editions are `parliamentary`
  (`reportedFamilies: ["european"]` returns 0); `aep-parliamentary-2016` and
  `bec-parliamentary-2012` are `local`, though their contests sit abroad (98
  and 96 diaspora scopes). The `eventKey` carries the right family in all
  seven.
- **The „2014" local editions are 2016 data (E1).** `aep-local-2014`,
  `aep-local-2014-t1`, `aep-local-2014-t2` and AEP's two `…-2014-t1/-t2`
  editions sit under `ro:local:2014`; nothing in the API says the year is
  disputed. Their mayor scopes overlap `bec-local-2016`'s on 3,186 of 3,187
  SIRUTA keys. The three `aep-local-2014*` editions share one contest layout
  (6,414 of 6,415 office × scope × label tuples); whether two of them are
  copies (an E25-like duplicate) cannot be told from metadata.
- **A contest row is not a race.** A row is a reported office label × a
  reported scope. The same race appears under several keys, and roll-ups
  share the race's office label:
  - `bec-local-2024` mayors: 3,186 `mayor:siruta:<SIRUTA>` + 3,186
    `mayor:source_constituency:<county>-<n>` (the same localities, keyed by
    the source's own numbering) + 42 `mayor:county:<n>` + 1
    `mayor:national:ro` = 6,414 rows for about 3,186 races.
  - County presidents are reported per locality: 3,180 SIRUTA rows in
    `bec-local-2020` and 3,180 + 42 county rows in `bec-local-2024` — a
    reporting location, not the county-wide race.
  - Parliament 2016 and 2020 are reported per locality (6,372 and 6,362
    SIRUTA rows), 2008 by single-member college (`scopeLabel` „ALBA colegiul
    1"), 1992–2004 by county.
  - Bucharest: `bucharest_general_council` per sector, a
    `bucharest_general_mayor` and a `consiliu-general` under
    `source_constituency:municipiul-bucuresti` (2024), and the 1998
    general-mayor edition with round `tur3`. E2 (the general mayor filed
    under a sector's mayor contest) is not flagged by the API.
- **Office labels: 27, mixing offices and source tables.**
  - Offices: `mayor` 31,616, `local_council` 28,615, `chamber_deputies`
    10,562, `county_president` 9,624, `senate` 6,946, `county_council`
    3,371, `bucharest_general_council` 19, `president` 7, `referendum` 6,
    `european_parliament` 5, `general_mayor` 1, `bucharest_general_mayor` 1.
  - Spelling variants: `consiliu-judetean` 41, `consiliu-general` 1,
    `county_council_or_cgmb` 83, `county_president_or_primar_general` 83.
  - Source shapes, not offices: `local_election` 3,650,
    `local_result_tippv_1` 3,573, `local_result_tippv_2` 3,570,
    `county_result_tippv_3` 3,263, `county_result_tippv_0` 91,
    `local_1996_tippv_0` 6, `regional_2012_candidate_vote_rows` 115,
    `local_election_administration` 84, `polling_station_results` 3,
    `long_vote_results` 2, `territorial_mandate_allocations` 2.
    `local_election` is also the office label of the two mislabelled
    parliamentary editions.
- **Scopes:** `siruta` 91,598 (3,193 distinct SIRUTA codes),
  `source_constituency` 11,304, `county` 2,003, `diaspora` 400, `national`
  35. `chamber`, `constituencyCode` and `constituencyName` are null on
  105,340/105,340 rows. `scopeLabel` is null on 19,773: the 9,567 SIRUTA
  rows of each 2020 local edition (`aep-local-2020`, `bec-local-2020`), all
  84 of `bec-parliamentary-1996`, 279 of `bec-local-2008`, 230 of
  `bec-local-2004`, 43 of `bec-local-2024` (its `consiliu-judetean` scopes
  are slugs: `source_constituency:alba`). Labels are spelled as each source
  spells them (`BUCUREŞTI SECTORUL 1` with cedillas, `JUDETUL ALBA`, `Alba`).
- **County codes are per edition.** `county:1`…`42` is alphabetical in most
  editions (12 = Călărași, 13 = Cluj, 42 = București), but in
  `bec-parliamentary-1992` 25 = Maramureș, 41 = Mun. București, 42 = Sect.
  Agricol Ilfov; `bec-local-1996` uses 50 for București;
  `bec-parliamentary-1996` has no labels at all; `roaep-…-local-2024` uses
  county abbreviations (`AB`, `AG`…). A county code never joins two editions.
- **Rounds:** `tur2` 33,980, `tur1` 33,855, null 27,990, `final` 8,952, `1`
  554, `tur3` 9. `bec-local-2024` holds 16,061 `tur1` and 3 `tur2` rows (two
  localities and an Alba roll-up): a repeat and a runoff cannot be told
  apart (E23).
- **Missing from the catalog:** the 2024 presidential election (annulled)
  and its 2025 rerun (E5), the 2024 European election, any 2025 election,
  and 2024 parliamentary results (only its candidate-list rows). From the
  electoral calendar, also absent: the 1990 general elections, the 1992 local
  elections, the 1991 and 2009 referendums and one of 2007's two (the catalog
  has one 2007 edition). These calendar gaps are to be confirmed with the
  scrapper before a page states them.
- **Links out:** a SIRUTA `sourceScopeKey` (91,598 rows) is a real locality
  code and can open the locality's INS page, labelled as where the source
  reported. Nothing links to parliament, people or parties; no source file
  can be opened (`sourceOpening: HELD`).
- **Privacy:** nothing personal is served. Candidate names, `attrs`, raw
  payloads and uploader metadata are not in the API.

**What the API now qualifies, and what it still carries.**

| Data-trust point | Served state |
|---|---|
| An edition is not an election | **Qualified** in the schema's descriptions and readiness (`SOURCE_SELECTION_UNVERIFIED`); the client must still never sum editions |
| Labels are reported, not verified | **Qualified**: `reported*` fields, `verified*` null, `*_IDENTITY_UNVERIFIED` |
| Scope is not territory | **Qualified**: `CONTEST_SCOPE_UNVERIFIED`; `sourceScopeKey` is named as the source's |
| Results, turnout, mandates | **Qualified as absent**: `RESULTS_UNAVAILABLE`, `MANDATES_UNAVAILABLE`; nothing served |
| Finality | **Qualified**: `RESULT_STATUS_UNQUALIFIED`; the stored `result_status`/`is_final` are not read |
| Source opening | **Qualified**: `SOURCE_ARTIFACT_ACCESS_HELD`; no link served |
| E1 (2014 = 2016) | **Carried**: no issue on the five editions |
| E2 (general mayor under a sector) | **Carried**: no issue on any contest |
| Family mislabels (7 editions) | **Carried**: the filter matches them as stored |
| Duplicate contest keys for one race | **Carried**: no grain or role field |
| County codes per edition | **Carried** |
| E23 (repeat vs runoff), E25 (identical copies) | **Carried** (E25 matters once candidates are served) |
| E4, E8, E9, E10, E11 (attribution, totals, turnout, seats, mandates) | **Not yet relevant**: nothing served |

### 12.3 Data rules for every elections page

These are product requirements. They come from the scrapper's readiness
analysis (2026-10-02), its issue tracker (E1–E25) and §12.2.

1. **An edition is not an election.** Count editions as editions („ediții de
   date"), never as elections. Never add a figure across editions of one
   event, nor across sources: two editions of one election are not twice the
   votes or twice the contests. When an event has several editions, show
   them side by side.
2. **An event is a platform grouping, unverified.** Group by `eventKey` to
   say „alegerile locale din 2024", and keep the grouping's status behind the
   caveats marker. A missing `eventKey` is „negrupată", never a new election.
3. **A contest row is not a race.** Say „rânduri de scrutin" (rows), never
   „scrutine" or „curse", for a count. Never derive a number of races, of
   localities or of mayors from row counts. Keep scope types apart: a SIRUTA
   row, a source-constituency row, a county roll-up and a national roll-up
   are four rows, maybe one race.
4. **Show what the API states, and say what is unqualified.** Family, year,
   round, office and scope label are reported. Where two API statements
   disagree (an edition's `reportedFamily` against its `eventKey`), group by
   the event and name the source's label in the notes. Where the scrapper
   proved a label wrong and the API is silent (E1: the „2014" local editions
   hold 2016 data; E2: Bucharest's general mayor filed under a sector), keep
   the reported label and add the note. Never show the two as two elections,
   and never compare 2014 with 2016.
5. **A scope is where the source reported, not a territory.** A SIRUTA scope
   links to the locality as „loc de raportare"; a county president or a
   parliamentary seat reported per locality is never that locality's race. A
   county code is the edition's own: never join two editions by it; join on
   SIRUTA, or not at all.
6. **A round label is a label.** `final` is not finality; `tur2` with no
   `tur1` is not a runoff; a null round is „tur neraportat", never „turul 1".
7. **Missing is never zero, and absent is never „no election".** No results →
   „rezultatele nu sunt publicate încă", never 0, never „fără candidați". An
   election not in the catalog is „nu e în date", never „nu au fost alegeri".
   A null date is „dată neraportată". A partial count is a floor („cel
   puțin"), and a bounded list says so.
8. **Each step is a distinct fact.** A candidate appearance, a list
   allocation, an elected mandate and a current officeholder are four facts.
   Nobody is „ales/aleasă" or an officeholder from an appearance or a list
   position. Production has zero named mandates.
9. **Totals and their components are never both summed** (E8): a coalition
   and its members, a PV total and its sub-lines. Wide ballot slots are never
   assigned to a person or party by order or by name (E4). Turnout carries
   its quality status (`dq_suspect`, `unchecked`) with the figure (E9). Seats
   need the right edition and the historical law (E10). These apply the day
   results are served.
10. **Identical copies are not people** (E25): the two local-2024 candidate
    files (207,389 + 207,389 appearances) are one file loaded twice.
11. **Never fabricate a source link.** `sourceOpening` is HELD, so there is no
    „Deschide sursa" button; the source line names the publishers, not a URL
    we invented.
12. **Privacy.** Candidacies are public records, but these are people. Show
    only the fields the API publishes; never `attrs`, raw payloads or uploader
    metadata. Never join a person across sources (or to parliament) on the
    client; a person link appears only when the API serves it with its method
    and review status.
13. **Readiness is said once.** While readiness is constant (§12.1), it sits
    behind the page's caveats marker, never as a badge per row. Per-row marks
    come back when the API tells rows apart.

### 12.4 Server asks (elections)

Numbered for the owner to route to the server session. Evidence from the live
API on 2026-10-14.

1. **Readable edition labels.** `reportedName` = `electionKey` on 50/50,
   `reportedDate` null on 50/50, `reportedAuthority` = `BEC/AEP/ROAEP` on
   50/50. Serve the source's own title (e.g. the CKAN package title), the
   publishing authority per edition (BEC, AEP or ROAEP; today only the key's
   prefix hints at it) and the election date where the source states it.
2. **Events as a read.** The 35 events exist only as a string on each row
   (`ro:local:1998:partial`). Serve `electionEvents` with family, year,
   instance label (partial, annulled, rerun, repeat), date and the editions
   that describe each, so a page never parses a key.
3. **Family mislabels.** The five European editions are `parliamentary`
   (`reportedFamilies: ["european"]` → 0); `aep-parliamentary-2016` and
   `bec-parliamentary-2012` are `local`. Serve the corrected family (or a
   `FAMILY_LABEL_CONFLICT` issue) and let the filter match it.
4. **E1 as an issue.** The five `ro:local:2014` editions carry no sign that
   their year is disputed; their mayor scopes overlap `bec-local-2016`'s on
   3,186 of 3,187 SIRUTA keys. Add a readiness issue (e.g.
   `REPORTED_YEAR_DISPUTED`) until R2 corrects them. Do the same for E2 on the
   affected Bucharest contests once they are measured.
5. **Contest grain.** One race appears under several keys (2024 mayors:
   3,186 `siruta` + 3,186 `source_constituency` + 42 `county` + 1 `national`);
   county presidents and parliament seats are reported per locality. Serve a
   role per contest (race, reporting unit, roll-up) or a canonical race key,
   so a page can count races.
6. **Office vocabulary.** 27 labels mix offices with source tables
   (`local_result_tippv_1/2`, `county_result_tippv_0/3`,
   `local_election_administration`, `regional_2012_candidate_vote_rows`,
   `long_vote_results`, `territorial_mandate_allocations`,
   `polling_station_results`, `local_election`, `local_1996_tippv_0`), and
   spell one office several ways (`consiliu-judetean` / `county_council` /
   `county_council_or_cgmb`). Serve a canonical office, or flag a row that is
   not an office.
7. **Empty fields.** `chamber`, `constituencyCode` and `constituencyName` are
   null on 105,340/105,340 rows; the 2008 parliamentary colleges sit in
   `scopeLabel`. Fill them or drop them.
8. **Scope labels and county keys.** 19,773 labels are null (all SIRUTA rows
   of both 2020 local editions, all of `bec-parliamentary-1996`); the 2024
   county councils are keyed by slug with no label. Serve a label for every
   SIRUTA scope (the INS name), and a stable county key (the SIRUTA county
   code) beside the edition's own numbering, which differs in
   `bec-parliamentary-1992`, `bec-local-1996` and `roaep-…-local-2024`.
9. **Aggregates.** Counting offices × scope types × rounds per edition takes
   one read per filter combination (50+ for the catalog's shape) or a full
   pull of 105,340 rows (1,060 requests). Serve `electionCatalogStats`: per
   edition, rows by office, scope type and round.
10. **Contests by place.** There is no filter on `sourceScopeKey` or on the
    label, so a locality's contests across years need every edition read.
    Serve `sourceScopeKeys` (SIRUTA) and a label search across editions.
11. **Dates of the data.** No edition says when it was captured or loaded
    (the scrapper's last parse finished 2026-06-19). Serve a per-edition
    `capturedAt`/`loadedAt`, so the source line can date the figures without
    inventing a sync date.
12. **Coverage as data.** Serve the expected elections with an explicit
    `UNAVAILABLE` where none is loaded (the 2024 presidential and its 2025
    rerun, the 2024 European, the 2024 parliamentary results, 1990, the 1992
    local, the 1991/2009 referendums…), so a page shows gaps from the API
    instead of from a hand-kept calendar.
13. **Results (R4), candidates (R5) and source opening (E6/E13).** The
    contest page's structure waits for them. The client will keep summary
    figures apart from a paged competitor list (E17.b), carry quality status
    (E17.d), and render nothing it cannot cite.

### 12.5 Guidelines (every elections page and prototype)

Distilled from the family's notes and code: procurement design.md §12 (front
door) and §18 (analysis page), INS (`docs/design/statistics/`), the companies
hub and analysis page (`docs/design/companies/`), the national budget's two
pages (`docs/design/national-budget/` §7–11), justice §13–16, public
enterprises §12, and the owner's recorded preferences. Reuse the components;
do not imitate them.

**G1. Two pages, then record pages.**

- **The front door** (proposed `/elections`) in the hubs' shape.
  - The hero: `TwoLayerLattice`, `CornerTicks` and `CruxMarks`
    (`src/features/landing/components/hero-chrome.tsx`) in a
    `RuledFrame marker="hero"` (`src/components/landing-skin/ruled-frame.tsx`);
    a `MonoLabel` kicker (`src/components/landing-skin/mono-label.tsx`); a
    two-line headline; a computed lede; the area's search; the shortcuts
    („Sau mergi direct la", `HUB_SHORTCUT_LINK_CLASS`); a ranked panel at the
    right (`border bg-card/80 p-5`, an `IndicatorToggle` from
    `src/components/landing-skin/indicator-toggle.tsx`, rows,
    `SHOW_MORE_CLASS`); and the one source line at the hero's foot.
  - Below the hero: `HomeSectionNav` and the numbered `HomeBand`s
    (`src/features/procurement/components/home/home-section-nav.tsx`), then
    `HubFiguresBand` (`src/features/statistics/components/hub/hub-figures.tsx`).
  - Each band has a `HubSectionHead` on the left (`…/hub/hub-chrome.tsx`:
    „01 / Title", the title, a computed lede, an `aside` toggle) and its rows
    on the right, on a 12-column grid. `HUB_BESIDE_TITLE_CLASS` starts the
    rows level with the title.
  - Arrival effects: `RevealStyles` and `useRevealOnView`
    (`src/components/landing-skin/reveal.tsx`); `countUpWithin`,
    `stopCounting` and `SmearFilters`
    (`src/features/landing/components/count-up`).
  - Worked example: `src/features/justice/components/hub/`.
- **The analysis page** (proposed `/elections/analytics`) in
  `/procurement/analytics`'s shape
  (`src/features/procurement/components/analytics/`).
  - The head sits on the profiles' grid: the way back, the kicker, the data's
    date and a period/edition list at the top right.
  - The question is the headline, each filter a phrase in it
    (`src/components/filters/filter-sheet/headline-phrase.tsx`). Beside it:
    „+ Adaugă un filtru", „Filtre", a link icon and the caveats marker.
  - Then the pinned bar of populations, the figures, and the axis tabs over a
    shadcn `Table` (`src/components/ui/table.tsx`: #, name, count, share bar).
  - Then the years band, the source line and the filter sheet.
  - Every control writes the address: a question is a link.
- **Record pages** (an election, a contest or a locality; chosen with the
  owner after the front door) in the procurement profiles' shape.
  - A compact head: back link, kicker, title, one head sentence, and an
    edition/round list at the top right. Then the figures band, the numbered
    bands, full-width tables and one source line.
  - Read on the server through the loader → a server memo under a deadline →
    a seeded query (justice §14, `src/features/justice/components/court/`).
  - 404 for a key that cannot exist or that the API does not have; `no-store`
    on a failed or partial read.
- The landing page and the sidebar link the front door only; sub-pages are
  reached from its shortcuts.

**G2. The head sentence.** One plain Romanian sentence that says what the page
is and reads naturally aloud („Alegerile din România din 1992 până în 2024,
așa cum le-au publicat autoritățile electorale."). It is computed from the
data it describes: never a hardcoded number, no rank sentence, and it returns
nothing rather than contradict the data. On the analysis page the headline is
the question; on a record page the sentence names the record and its editions.

**G3. The figures band.** Three or four figures, each one fact in the unit it
counts („ediții de date", „rânduri de scrutin"; never „alegeri" for editions),
each linking to the band that breaks it down (`HubFact.link`). A missing value
is a dash with its note, never 0; a floor says „cel puțin". The front door and
the record pages keep their figures band.

**G4. One source line per page.** For example „Sursa: BEC, AEP și ROAEP
(etichete din sursă), citite pe 14 octombrie 2026": the read date is real, and
no sync date is invented (ask 11). It is said once, under the hero or at the
foot, never per row or per band. Sentence-length notes use plain
`text-xs text-muted-foreground`; the uppercase mono `MonoLabel` is for short
labels only (kickers, column heads, legends, counters).

**G5. Caveats behind one marker.** The marker sits beside the source line. It
is amber (`text-status-partial-fg`) with the count of notes when something
about the data needs saying (always, today), and an „i" otherwise; the popover
is `CaveatsMarker` in `src/features/justice/components/justice-source-line.tsx`.
- What goes in: edition ≠ election, labels reported and not verified, results
  not published, plus the page's own notes (E1, family mislabels, county
  codes, scope = reporting location).
- A row carries at most a short mark (✱ or a footnote number) that points to
  its note. No prose under figures and no notes repeated per row („let the
  data speak").

**G6. The filter panel.** Quick filters sit in the controls row (family, year,
office); the whole set opens in a sheet, from the right on a desktop and from
the bottom on a phone. It is built from
`src/components/filters/filter-sheet/filter-sheet-parts.tsx` (`Group`, `Row`,
`Options`, `OptionGroup`, `Chip`, `Notice`, `Announce`).
- Lists: ≤4 short values side by side, >4 one column, >8 a search field and a
  scrolled list rendered from the start. Nothing above a list moves on a pick
  (`docs/design/companies/design.md`, „The analysis filters panel's lists").
- Selects inside the sheet use `ChoiceSelect`
  (`src/features/private-companies/components/analytics/analytics-choices.tsx`),
  so a phone gets its native picker; fields are 16px on phones.
- **Only filters the API applies** (`reportedYears`, `reportedFamilies`,
  `eventKeys`; `reportedOffices`, `scopeTypes`, `reportedRounds`), or that the
  page computes over a complete snapshot. A filter that changes nothing is
  never offered (E17.c).

**G7. URL state.** Filters, tabs, the edition and the round live in search
params with Romanian keys; the default view needs none. `validateSearch`
returns every key the address carried (an unreadable one as `undefined`), and
the page resolves each with `?? default`, because the root's search is
passthrough. A choice set back to its default leaves the URL.

**G8. Tables and rows.**
- Full width and compact (`py-1.5`), the whole row a link, tabular figures.
- Codes (SIRUTA, keys) are tabular mono secondary text, never the row's name.
- Actions are 32px icons with a tooltip.
- Ranked rows carry an inline share bar, not a chart.
- A list says how many it shows of how many („primele 25 din 3.186").

**G9. Tokens and spacing.**
- The neutral-navy system (`src/index.css`): one accent, borders not shadows,
  radius ≤ 8px (the hubs' square `rounded-sm`), Inter, `tabular-nums` on
  every number.
- Bands are `py-12 sm:py-16` inside `RuledFrame` (`max-w-6xl px-5 sm:px-8`).
- Mobile first. On a desktop the hero is 7/5 columns, and band heads sit left
  with rows right on 12 columns; elements' starts and rows align across bands.
- Charts are navy first (`--chart-1…5`), a choropleth uses
  `--choropleth-1…5`, and a map always has its ranked list beside it.
- Status colours carry meaning only with text beside them.

**G10. Words.**
- Office and family labels are shown in Romanian through one label table. A
  label the table does not know (a source-table shape such as
  `local_result_tippv_1`) is shown verbatim in mono with „(etichetă din
  sursă)", never guessed.
- Neutral language: „nu e în date", „neverificat", „de verificat".
- Every string goes through Lingui (`t`, `<Trans>`) with a Romanian source,
  and both catalogs are filled; prototypes skip extraction.

**G11. Data.** Prototypes read **real data**: fixtures generated from the live
API by a script (`scripts/generate-elections-*.mjs`), never edited by hand.
The front door reads a generated snapshot (the catalog's counts take 1,060
reads; ask 9), dated in its source line; record pages read live. Every rule of
§12.3 holds on every page.

### 12.6 Mock-era code audit (2026-10-14)

Nothing outside `src/features/elections/` imports the mock-era modules (the
parliament sidebar's `mock-mode` import is parliament's own), and no route
renders them since `c26dd15d`.

**Can go once the new pages are promoted (only the mock era uses them):**

- `components/elections-landing-page.tsx`, `election-hub-page.tsx`,
  `contest-result-explorer-page.tsx`, `election-shared.tsx` and
  `elections-page-layout.tsx`, with their three tests;
- `api/elections-api.ts` (the mock dispatcher that throws without mocks),
  `api/elections-api.mock.ts` and `mocks/fixtures/elections-fixtures.ts`;
- `hooks/use-elections.ts`, `lib/mock-mode.ts` (+ its test), `lib/format.ts`,
  `types.ts` and `src/schemas/elections.ts`;
- the catalog entry's mock-era references in
  `src/lib/scraper-references/catalog.ts` (`clientSchemaPaths:
  src/schemas/elections.ts`, the mock-era feature docs);
- their strings in both catalogs (`yarn i18n:clean`, on a separate pass).

**Shared test helper:** `test/elections-router-mock.tsx` is used by the
mock-era tests **and** by the live catalog's three tests, so it stays as long
as the catalog does.

**The live catalog (`c26dd15d`, `042809b9`) is not mock-era.** It is
`/alegeri`, `/alegeri/$electionKey` and `/alegeri/contest/$contestKey`;
`src/features/elections/{catalog,api/elections-catalog-*,hooks/use-elections-catalog.ts,lib/elections-*}`;
`src/schemas/elections-catalog.ts`; the flag; and the sidebar and landing
links. It is replaced, not deleted, when the redesign is promoted: its URLs
then redirect to the new English paths (as `/achizitii/*` and `/justitie/*`
do), and its live adapter (`elections-catalog-api.ts`, the SSR reader, the Zod
schema) can serve the new pages.

### 12.7 Owner's decisions (2026-10-14)

- **The Guidelines (§12.5) are approved** as the basis of every elections
  prototype.
- **The live `/alegeri` catalog stays on** while the redesign is prototyped;
  the redesign replaces it at promotion.
- **The front door explores four ideas:** a timeline of elections (with a
  hand-kept calendar, labelled as ours, until ask 12), what the data covers,
  „your locality", and a results-shaped page with clearly labelled sample
  bands (the mock-first contract).
- **Phones keep the family's 20px gutter** (`RuledFrame`), not 16px.
- **Every page is prototyped at once, by parallel authors** (Fable, high
  effort, at the owner's request): the front door (`hub`), an election
  (`alegere`), a contest (`scrutin`), a locality (`localitate`) and the
  analysis page (`analize`), each with its variants, under
  `src/development/prototypes/elections/`. They share a read-only layer in
  `shared/` (model, labels, calendar, place index, parts and the fixtures
  `scripts/generate-elections-catalog-fixture.mjs` writes). No commit until
  the owner picks.

### 12.8 The prototypes (2026-10-14)

Sixteen variants on real data, at `/development/elections/<page>?v=<key>`.
Each page's reasoning, data safety and open questions are in its folder's
`RATIONALE.md`.

| Page | Proposed path | Variants | Reads |
|---|---|---|---|
| `hub` — the front door | `/elections` | `cronologie` (types × years with the calendar's gaps), `acoperire` (offices, levels and rounds per edition), `localitate` (a place search leads), `rezultate` (sample-labelled results bands beside the live catalog) | catalog fixture; place index; `hub/places.coverage.json` |
| `alegere` — one election | `/elections/$event` | `surse` (editions side by side), `functii` (offices × levels across editions), `scrutine` (the contest finder leads) | catalog fixture; `alegere/event.fixture.json`; live contest pages |
| `scrutin` — one contest row | `/elections/contests/$contestKey` | `lineage` (the office at the place across editions), `context` (election → edition → place → row), `results` (sample-labelled results bands) | live `electionContest`; place index; head from the key + fixture |
| `localitate` — one place | `/elections/places/$siruta` | `matrice` (offices × elections), `cronologie` (newest first, editions side by side), `comparatie` (every election vs. what is reported here) | place index; `localitate/names.fixture.json` (names for SSR) |
| `analize` — analysis | `/elections/analytics` | `clasament` (procurement's ranked answer), `cub` (election × office/level/round pivot), `randuri` (the live row finder) | catalog fixture; `analize/counties.fixture.json`; live contest pages |

Generators (all read the cached pull with `--cache`, outputs only in their
folder): `generate-elections-catalog-fixture.mjs` (shared),
`-hub-places.mjs`, `-alegere-fixture.mjs`, `-localitate-names.mjs`,
`-analize-counties.mjs`.

**How the analysis page avoids double counting:** rows are counted on one
edition per election (the address's `editie`, else the edition with the most
rows, named in the figures and the notes); editions and elections are counted
as distinct keys; a share and „Restul" appear only where the axis partitions
the measure; counties come only from SIRUTA → INS county, never from a
source's county code.

**Data findings from the prototypes** (add to §12.2):

- Contest keys compose deterministically
  (`contest:<edition>:<office _→->:<scopeType>:<scope key lower-cased, ':'→'-'>`)
  on all 105,340 rows; `(edition, office, round, SIRUTA)` is unique.
- The 2020 parliamentary editions report București as one place under
  `179132` (not in today's INS list); 2016 is reported per sector.
  Corrected in review (2026-10-19):
  - the „BUCUREŞTI SECTORUL 6" label on `179132` comes from those 2020
    parliamentary editions themselves;
  - `bec-local-1996` labels the code „Municipiul BUCURESTI";
  - the catalog generator now skips, for a code missing from the INS list, a
    label that a listed code also carries, so the fixture reads „Municipiul
    BUCURESTI".
- Băneasa (Constanța) is `63171` in the four 2020 editions and `61069` (INS)
  elsewhere; five 1996-only codes are old SIRUTA codes. Not joined: matching
  them would be by name.
- Local 2008 and the 2012 archive report SIRUTA rows only for the six
  sectors; ROAEP's 2024 edition for two communes; 16 of 50 editions reach
  locality level, 7 name all 3,186 of today's UATs.
- `bec-local-2024`'s three `tur2` rows: two `local_election` SIRUTA rows and
  one `mayor` county roll-up — no runoff rows per locality.
- Bucharest sectors' INS kind is „Sectoarele municipiului Bucuresti".

**More server asks:** 14. Filter a null round (`reportedRounds` takes only
strings, so „tur neraportat" cannot be asked for). 15. A place's contest keys
across editions (with ask 10), so pages need not compose keys. 16. An event
key for partial elections that maps to an address (`ro:local:1998:partial`).

**To fold back at promotion:** a `HubFiguresBand` that shows a dash
(copied as `ElectionFigures` and `ContestFigures`), one exported caveats
marker (copied as `NotesMarker`), the sector guards in `scrutin/`; the live
record pages need loaders (the contest page's place name renders only after
hydration today).

### 12.9 Results first: the main page and the component gallery (2026-10-15)

The owner asked for a visual, results-first front door (map at UAT and county
level, parties, turnout) and then for **component variants, not layout
variants**, including the parties' evolution at local and parliamentary
elections. Both read a read-only extract of the production DB's `elections`
schema, since the API serves no results; the query recipe stays outside the repo.
The fixtures hold party keys, counts and SIRUTA / county codes only.

- `principal?v=harta`: the page (map, mandates, Chamber 2020, turnout, what is
  missing). Its fixtures are `principal/results.summary.json` and `results.uat.json`.
- `componente?v=evolutie|mandate|harti|prezenta|intreceri`: five groups, each
  with options A, B, C… to pick from:
  - evolution: lines, 100% columns, party cards, gains and losses, ranks;
  - mandates: waffles, a hemicycle, county tiles;
  - maps: a party's strength, the 2016→2020 swing, mayors kept or changed
    2016→2024 plus a Sankey of the flows, turnout change, race margins;
  - turnout: 1992–2024 by election type, county dumbbells, the UAT distribution,
    the diaspora, turnout by INS place kind;
  - races: the margin histogram, the 15 closest races, candidates per race,
    party share by place kind.

  Fixtures: `principal/results.evolution.json` and `results.evolution-uat.json`.

**What the DB supports for evolution** (measured 2026-10-15):

- **Chamber votes with party links:**
  - 2008: county rows, matching the official shares;
  - 2016: only the linked rows (the other 96% of the `voturi` rows are unlabelled
    columns, so shares are over identified parties and run ~0.5 pp high);
  - 2020: all rows.
  - Not usable:
    - 1992–2000: 36–57% of votes linked;
    - 2004: the alliances are mislinked, so UDMR shows 62%;
    - 2012: no links;
    - 2024: candidate lists only.
- **Mayors per party:**
  - 2016 from `aep-local-2014-t1` (E1) mandate rows per UAT;
  - 2020 from `aep-local-2020` county mandate rows;
  - 2024 from `bec-local-2024`.
  - All exclude București so they compare with 2024.
  - `bec-local-2020` mayor `voturi` are unusable: wide columns appear as
    „independent" competitors and `VVE` (valid votes) appears as a competitor.
- **Councillors:** local and county councillors for 2016 and 2024 only.
- **Turnout series:** from `turnout_derived`, summed over one office's contests.
  - It matches official parliamentary turnout for 1992–2020.
  - Presidential values are the edition's reported round, unverified.
  - European 2014 and the 2019 row there are partial; 2019 comes from the PV
    lines instead.
  - Local 2012 (97.9%) and the 2007 referendum (two summed) are left out.
  - Its `valid` column exceeds `voted` for 2016 and 2020, so it is not used as a
    denominator.
- **Party lines are our grouping**, said beside each chart: PSD with PSD+PC
  2008, USR with USR PLUS 2020, ALDE under two keys.

**Server asks:**

17. A results read per edition shaped like these fixtures: party votes and
    mandates by UAT, county and abroad; PV lines; a quality status per figure.
18. Party short names and party lineage (alliances → members) as data.
19. ALDE's two actor keys and the 2004 alliance links to fix.
20. `turnout_derived.valid` to fix.

### 12.10 The results analytics page (2026-10-19)

The owner liked every gallery option and wants them all on one analytics page.

- **Polish pass:** a Fable agent at high effort reworked a copy of the gallery
  (`componente-fable/`, rationale in its `RATIONALE.md`). The original
  `componente/` is kept for comparison.
  - Caveats moved behind one amber marker per chart, with one tooltip style
    throughout.
  - A positive share never prints as 0 (it shows "<1 %").
  - The swing and margin maps got diverging palettes; the flips map got a
    "changed only" toggle.
  - Every node and segment is labelled.
- **Panels:** each gallery chart is now a `Panel` (`id`, `title`, `question`,
  `foot`, `notes`, `body`) returned by `use…Panels()` hooks. The gallery
  letters them; the analytics page places them. One fix lands in both.
- **Page:** `/development/elections/rezultate`, built in this order:
  - the head with one source line;
  - four figures;
  - a sticky bar with the sections and the party focus;
  - five sections: parties over time, mandates, the map, turnout, mayoral races.
- **URL state:**
  - `partid` (the focus) dims the other parties in the lines, the cards and the
    gain/loss bars, and drives the party maps' choice;
  - `harta` picks the map mode (strength, swing, flips with the flow diagram,
    turnout, margins), so one map takes the place of six.
- **Phone:** a toggle whose labels don't fit becomes a list below `md`
  (`WideToggle`).
- **Wording:** "nu apare separat" replaces "nicio primărie" on the party cards.
  A party missing from the 2024 mandate list may have run inside an alliance,
  so a zero would be false.
- **County filter** (URL `judet`, the 41 counties with 2024 local rows):
  - Each panel declares a `scope`:
    - `county` (the default) redraws from the county's rows;
    - `highlight` keeps every county and marks the chosen one (the county
      tiles, the turnout dumbbell);
    - `national` stays national, with a "național · fără cifre pe județ" mark
      (turnout since 1992, voters abroad).
  - Maps zoom to the county's box at the country's proportions and draw the
    rest of the country as neutral ground; the legend counts the county's UATs.
  - Lines, cards, gains and columns read the county rows. The Chamber's county
    rows keep the county's first seven parties, so a missing party reads
    "în „Alte partide"", never "nu e în date", and gets no gain/loss row.
  - The mandate waffles drop to one square per mayoralty (ten per local
    councillor). The semicircle becomes that county's own council.
  - The closest races are recomputed from the UAT rows: the leader from the race
    row, the runner-up and gap from the evolution rows. This reproduces the
    national top 15 exactly (order: gap, then the larger race); both 2024 ties
    sit in the national list, which names their parties.
  - The figures switch to the county: mayoralties, council seats, local 2024
    and parliamentary 2020 turnout, each against the national value.
  - București is not offered: the 2024 local edition has no rows for it.
- **PSD+PNL 27 vs 24 (corrected in review, 2026-10-19):** the 27 counted
  București's six sector races, which the per-UAT rows report one by one
  although the INS list has the capital as one UAT. Every per-UAT count now
  drops the sectors (`useInScope`). Outside București the histogram's 22
  non-solo races plus 2 single-candidate races match the 24 mandates. The
  earlier explanation (vote rows versus mandate rows) was wrong.
- **Continuity of a mayoralty (review, 2026-10-19):** kept or changed is
  decided on the competitors before any fold (`continuityOf`):
  - the same key or named line is **kept**;
  - a party and an alliance it is part of (PNL → PSD+PNL, PSD+UNPR → PSD,
    members read from the alliance's key) is its own case, never a change;
  - two parties folded into „Alte partide" are kept only under the same key;
  - an independent twice keeps no party.

  The map, the flows and the figures share the rule, and the denominator is
  the comparable pairs only.
- **Turnout scope:**
  - the summary's 2020 `national` turnout includes the voters abroad (32.0 %);
  - a county is compared with the domestic sum of the county rows (31.0 %,
    `DOMESTIC_TURNOUT_2020`);
  - home vs abroad uses the summary's complete 2020 tallies, not the folded
    evolution extract.
- **Not yet:** the party focus on the stacked and place-kind bars.

**API contract:** `docs/design/elections/results-api.md` (2026-10-19) proposes the
reads that replace the four fixtures: tallies per scope, columnar UAT tables,
close races, turnout series, coverage, competitors and party lines. It also
lists the status codes, the panel-to-read map and five open questions for the
server.

**Views (2026-10-19, owner: "too much info … separate them on different tabs or views").**
The default variant `vederi` (`rezultate/views.tsx`) uses the analytics pages' layout:

- **Head:** the view's question as the headline, with the county as a
  removable phrase. Below it one row of controls: a searchable county list,
  the party, ready questions, a copy-link button and the caveats.
- **Sticky bar:** five views (Partide, Mandate, Hartă, Prezență, Curse).
- **Figures:** four per view, county-aware.
- **Answer:** first underline tabs, one chart each; the same day the owner
  asked for each view as one page of sections (below), and the tab layout
  was removed.
- **URL:** `tip`, `dupa` (a section to open at), `judet`, `partid`; the maps
  keep their own choices too (`putere_an`, `schimbare`, `doar`).
- **Earlier version:** the one-page layout stays as variant `pagina`.

- **Partide as one page (2026-10-19, owner):** this view's five charts sit in
  sections down the page, with a row of jump links where the tabs were. The
  other views keep their tabs (`layout: 'sections' | 'tabs'` per view). A ready
  question naming a Partide tab scrolls to its section.

- **All views as one page (2026-10-19, owner: "now do the work for the other tabs").**
  - Mandate, Hartă, Prezență and Curse use sections too, each with a view-level
    question as the headline. A national-only section (turnout since 1992,
    voters abroad) says so when a county is chosen.
  - Captions inside the charts are plain sentence-case text (`FigureCaption`),
    not mono capitals.
  - The council semicircle and the flow diagram got the shared tooltip.
  - Every waffle shows its unit ("■ = 10 primării"), with the big waffles'
    legend in a column beside them.
  - Units in words: "pp" → "puncte", and map legends give the count of
    localities once in the title ("… · localități") with plain numbers.

**Known data caveats, not fixed in code (review, 2026-10-19):**

- **The fixtures disagree slightly on 2020 and 2019 voters:**
  - parliamentary 2020: 6,059,113 in `results.summary.json` against 6,056,065
    in `results.evolution.json`;
  - presidential 2019: 10,031,762 against 10,029,096.

  The two extracts read different tables (PV lines against the derived
  turnout table). A page uses one extract per figure; the results API (asks
  17–20) should serve one value with its basis.
- **The extract recipes stay outside the repo** (owner, 2026-10-15: keep
  "how to get the data" in the session). The fixtures say so in
  `generatedBy`, so they cannot be regenerated from the repo alone. They are
  prototype data, replaced by the API reads in `results-api.md`.
