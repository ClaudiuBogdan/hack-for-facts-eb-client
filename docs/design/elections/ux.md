# Elections (Alegeri) — UX Handoff

- **Source UX document:** `docs/ux-research/elections.md`
- **Shared foundation:** `docs/design/README.md`
- **Domain slug:** `elections` · **Route base:** `/alegeri`

## Product intent

Make Romania's public election results — local, parliamentary, presidential,
European Parliament, and referendum, 1992–2025 — finally explorable in one
trustworthy, provenance-first surface. Turn ~102.4M raw result rows into
plain-language answers ("Cum a votat comuna mea în 2024?") for voters, and
into filterable, exportable, source-cited evidence for journalists, analysts,
and researchers. The product never conflates *votes received in an election*
with *votes cast by MPs in parliament*, and never treats a source-published
candidate name as a resolved person identity.

## User roles and top jobs

- **Casual voter (largest audience).** Job: "How did my area vote in election
  X?" Needs plain-language winner + turnout + a simple ranked chart, drillable
  to their commune, with a "compared to last time" hint.
- **Journalist / analyst / NGO / watchdog.** Job: party trajectory over time,
  local-vs-national swing, diaspora patterns, turnout/invalid analysis, with
  stable URLs, source links, and export.
- **Domain expert (political scientist).** Job: polling-station grain, mandate
  allocation phases, candidate-level runs, ballot positions, source-metric
  mapping, and explicit methodological caveats.

## MVP scope (Wave 1)

Built on the fully-populated, extraction-verified `result_rows` / `contests` /
`reporting_units` / `competitors` data.

1. **Elections landing & browse** (`/alegeri`) — year/family browser, featured
   latest election, geography entry point.
2. **Contest result explorer** (`/alegeri/contest/$contestKey`) — the core MVP:
   ranked competitor results, turnout, national→county→commune→polling-station
   drill-down, provenance per number. *Most important feature.*
3. **Competitor / party profile** (`/alegeri/partid/$competitorKey`) —
   cross-election history grouped by `competitor_key`, source labels verbatim.
4. **Candidate (source-evidence) profile** (`/alegeri/candidat/$candidateKey`) —
   candidacies + appearances, with the "nume din sursă — identitate
   nerezolvată" contract front and center.
5. **Source / provenance drawer** — one click from any number to source
   resource, file, row, hash, and the official resource link.
6. **Referendum results page** (`/alegeri/referendum/$contestKey`) — option
   results (da/nu/nule) by geography, turnout.

Also in MVP because every page depends on it: the **election detail page**
(`/alegeri/$electionKey`) as the hub listing a single election's contests.

## High-value next scope (Wave 2)

- **Named elected-mandate page** (`/alegeri/mandate/$contestKey`) — party/list
  allocations now; named `elected_candidate_mandates` shown as "în curs de
  finalizare" until the gated loader runs.
- **Geography profile** (`/alegeri/loc/$reportingUnitKey`) — all elections held
  at a SIRUTA/county, cross-linked to `/primarie` and budget.
- **Election-vs-election swing comparison** — maps + tables.
- **Global search integration** — route competitor/candidate/election hits into
  `/alegeri` entity pages from the existing entity-search surface.
- **MCP tools** — `resolve_election_filters`, `get_election_results`,
  `get_competitor_history`, `get_contest_mandates`.

Deferred to later waves (out of scope for these docs unless noted): candidate
identity-resolution workspace, parliament cross-domain linkage UI,
polling-station analytics dashboard, mandate-vs-vote-share deviation analysis,
source-metric dictionary explorer, data-quality dashboard.

## Source / data constraints (Fact unless noted)

- **No elections backend, GraphQL slice, REST route, or MCP tool exists today.**
  Every feature is **mock-first**; mocks must be shaped like the
  `transparenta_prod.elections` tables so live integration is an adapter swap.
- **Populated tables:** 44 elections, 92,410 contests, 139,763 reporting units,
  180 metric definitions, 128,025 competitors, 471,770 candidates, 471,770
  candidacies, ~102.4M result rows, 130,238 competitor mandate allocations.
- **Empty / pending tables:** `elected_candidate_mandates` (0 rows, gated),
  `candidate_person_links`, `competitor_party_links`,
  `officeholder_claim_links`, `parliament_mandate_links`.
- **Coverage is broad but not uniform:** 1992–2025; some parser lanes are
  metadata-only; 16 resources `inaccessible_with_evidence`, 4
  `terminal_resource_requires_review`, 14 `loaded_profiled_resource_not_parsed`.
- **Assumption:** v1 may scope the *default* browse/compare experience to the
  cleaner **2008–2025** subset and expose 1992–2007 behind an explicit "include
  arhivă istorică" toggle. (Decided in design.md; flagged to product owner.)
- **Performance:** ~102.4M rows require pre-aggregated read models for
  contest-level headlines; polling-station grain stays paginated/expert-mode.
- **Turnout denominators:** "registered voters" is not confirmed as a
  first-class canonical metric across all years; turnout may be derived with
  caveats (Assumption).

## Privacy / provenance constraints

- **Candidate name = source evidence, not identity (CRITICAL).** Every
  candidate surface shows `Nume din sursă — identitate nerezolvată`. Never
  auto-merge candidates by name string. List-level placeholders without a
  source person name are kept out of "named candidate" views.
- **Election results ≠ parliamentary votes (CRITICAL).** Distinct labels and
  icons: `Rezultate alegeri` vs. `Vot parlamentar`. Cross-link only via
  `parliament_mandate_links` when populated, never by assuming candidate == MP.
- **Named mandates are empty.** Show `mandate pe listă/partid` (allocation
  counts) now; never copy-write them as verified elected persons.
- **Every shown number exposes provenance** (resource, file, row, hash,
  authority, source family) at the point of use, plus coverage/freshness near
  the primary result.
- **Inaccessible sources render as evidenced gaps**, not as zeros.
- **Wikipedia local-politics is QC-only**, never canonical; out of MVP scope.

## Design implications

- Mirror the platform IA pattern (`/parlament`, `/pnrr`): a `/alegeri` hub with
  typed detail routes; reuse SIRUTA/map infra, shared search, and the standard
  TanStack file-route + Zod `validateSearch` + `createPublicPageCacheHeaders`
  convention.
- Lead with plain-language summaries (winner card, turnout line); keep tables,
  source-metric codes, and polling-station grain in progressive-disclosure /
  expert layers.
- A `CoverageRibbon` (authorities, year range, freshness, known gaps,
  `DataStatusBadge=mock`) sits near the primary result on every page during the
  mock phase.
- Provenance is a shared `SourceProvenanceDrawer` opened from any result row,
  chart point, or metric label.
- Identity and finality are communicated by `IdentityConfidenceBadge` and
  explicit "în curs de finalizare" states, never by silent omission.

## Blockers (true blockers only)

None block design or mock-first implementation. The following are **data-work
blockers for specific Wave-2 capabilities only**, already decided around in the
feature docs:

1. Named elected persons require the `elected_candidate_mandates` loader to run
   (named-mandates page ships allocation-only until then).
2. Candidate→person and competitor→party resolution require
   `candidate_person_links` / `competitor_party_links` population (identity
   resolution UI is out of MVP; profiles ship source-label-only).
3. Election→parliament navigation requires `parliament_mandate_links`
   population (cross-domain link rendered as "indisponibil încă").
