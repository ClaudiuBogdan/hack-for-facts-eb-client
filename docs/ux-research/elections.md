# Domain: Elections & Parties (Alegeri)

## Review changelog (2026-06-26)

- **Recommendation:** Added a design handoff centered on the Contest Result Explorer as the first design screen.
- **Recommendation:** Standardized election identity and mandate copy with the platform identity-confidence and provenance patterns.
- **Assumption:** Candidate labels can appear in search and profiles only as source evidence, not as resolved person identities.

> UX / product research for the **Elections & Parties** domain (slug: `elections`).
> This document is product/UX guidance only. It does not implement code.
>
> Evidence legend used inline:
> - **Fact:** grounded in the scraper inventory, `ELECTIONS_NOTES.md`, the prod
>   schema migration, or source code (no live DB was accessed).
> - **Assumption:** a sensible product assumption made where data is plausible
>   but not confirmed; labeled so it can be challenged.
> - **Recommendation:** a UX/product proposal.

---

## 1. Domain Summary

Transparenta.eu's Elections & Parties domain covers Romanian **public election
results** across all available periods and contest types, plus the parties,
competitors, candidates, candidacies, mandate allocations, referendum options,
and officeholder/parliament-mandate links that surround those results.

**Fact:** The serving schema is `transparenta_prod.elections`, populated from
the raw database `transparenta_eu_elections`. The live exact count of
`elections.result_rows` is **102,449,919 rows** (inventory, 2026-06-25), making
this one of the largest fact tables on the platform.

**Fact:** The full serving model loaded on 2026-06-19 contains **44 elections,
92,410 contests, 139,763 reporting units, 180 metric definitions, 3,274
source-metric-map rows, 128,025 electoral competitors, 471,770 candidates,
471,770 candidacies, ~70M logical result rows, 130,238 competitor mandate
allocation rows, and 0 elected candidate mandates** (per `ELECTIONS_NOTES.md`).
After the AEP CKAN CSV reload, the stored `result_rows` count rose to ~102.4M.

**Fact:** Source coverage spans **local, parliamentary, presidential, European
Parliament, and referendum** election families, with historical parsers for
archives from **1992 through 2025** (DBF, XLS/XLSX, CSV, UTF-16 CSV, text,
7z/ZIP). Primary authorities are **AEP (CKAN / data.gov.ro)**, **BEC**, and
**ROAEP**.

**Fact:** There is **no dedicated elections backend module, GraphQL slice, REST
route, MCP tool, or client route** verified today. Parliament member pages have
election-related tabs, but that is not a full elections product surface.

**Fact:** A hard boundary is enforced in code and schema: **election results
are kept separate from parliamentary roll-call votes** (`parliament.votes` /
`parliament.vote_records`). Candidate names are treated as **source evidence
only**, not resolved person identity.

**Assumption:** Because no downstream API/client exists yet, this document
defines the *target* product experience the platform should build, grounded in
what the scraper can already serve.

---

## 2. Public Value

Romanian election results are officially published but hard to use: they are
scattered across BEC/ROAEP/AEP portals, archived in heterogeneous legacy
formats (DBF, XLS, UTF-16 CSV), published per-polling-station rather than
summarized, and lack a stable cross-election, cross-year, cross-geography
exploration layer.

Transparenta.eu's value proposition for this domain:

- **One trustworthy corpus**: 1992–2025 results normalized into a single
  model across all five election families, with source lineage preserved on
  every row.
- **Understandable by default**: turn ~102M raw result rows into plain-language
  questions ("Who won the 2024 local election in my commune?", "How did my
  county vote in the 2025 presidential runoff?") instead of CSV archaeology.
- **Comparable across time and geography**: party/candidate performance over
  decades, across counties, communes, and diaspora, on one screen.
- **Linked to power, not just votes**: connect election winners to the
  parliament mandates, roll-call behavior, and public spending that follow —
  without conflating "votes received" with "votes cast in parliament."
- **Provenance-first trust**: every number links back to its source file,
  resource, row, and hash, so users can verify claims against the official
  record.

**Recommendation:** Position the elections product as *"Romania's election
results, finally explorable"* — emphasizing completeness, plain-language
answers, and verifiable provenance over flashy dashboards.

---

## 3. Target Users

### 3.1 Casual public users (voters)
Citizens who want to understand a specific election, their locality's results,
or a candidate/party they care about. They are not data-literate; they need
plain-language answers and visual summaries, not raw tables.

### 3.2 Journalists, analysts, NGOs, researchers, watchdogs
Power users who need filterable, exportable, cross-referenced data: party
trajectories over time, local-vs-national swings, diaspora patterns,
turnout/invalid-vote analysis, and evidence trails they can cite. They value
export (CSV/JSON), stable URLs, and source links.

### 3.3 Domain experts (political scientists, party analysts)
Researchers who need the full grain (polling-station-level results, mandate
allocation phases, candidate-level runs, ballot positions, alliance member
labels) and care deeply about methodological caveats: which metrics are
source-coded, which candidate labels are unresolved, which mandates are
final vs. provisional.

---

## 4. Key User Questions

### 4.1 Questions the product should answer immediately
- What elections happened in a given year / type / round?
- Who won a specific contest (e.g. my commune's mayor in 2024, my county's
  council, a parliamentary constituency)?
- What were the results by party/competitor for a chosen contest and
  geography?
- What was the turnout and the number of valid/invalid votes?
- How did my county / commune / diaspora vote in the latest presidential
  election, round by round?
- Who were the candidates on a given ballot (names as published)?
- What is the source of this number (file, resource, row, hash)?

### 4.2 Questions requiring deeper analysis
- How has a party's support evolved across elections and geographies over
  decades?
- How do diaspora results compare to national results across elections?
- Which polling stations / constituencies swung the most between two
  elections?
- How do mandate allocations (party/list) compare to raw vote shares?
- Which elected candidates later became parliament members, and how did they
  vote in roll-calls? (cross-domain)
- Where do source candidate labels remain unresolved, and how confident is a
  person-identity match?
- Where are the historical corpus gaps or parser metadata-only rows that
  affect comparability?

---

## 5. Available Data

All items below are **Fact**, grounded in the prod schema migration
(`20260617T200000__elections_domain.ts`) and `ELECTIONS_NOTES.md`.

### 5.1 Elections and contests
- `elections.elections`: `election_key`, `election_family`, `election_name`,
  `election_date`, `election_year`, `election_round`, `authority`,
  `publication_status`, `is_final`. **44 elections** loaded.
- `elections.contests`: linked to an election, with `office`, `chamber`,
  `round_label`, `scope_type` (`siruta`, `county`, `diaspora`, `national`,
  `chamber`, `source_constituency`), `scope_key`, `scope_label`,
  `constituency_code`, `constituency_name`. **92,410 contests** loaded.

### 5.2 Reporting units (geography)
- `elections.reporting_units`: `scope_type` (adds `polling_station`),
  `scope_key`, `name`, `siruta_code`, `county_code`, `county_name`,
  `polling_station_number`. **139,763 reporting units** loaded — from national
  down to individual polling stations.

### 5.3 Metrics and source metric dictionaries
- `elections.metric_definitions`: **180 canonical metrics** with
  `metric_label`, `metric_kind`, `unit`, `description`. Known labels include
  `voturi` (Votes), `voturi_candidat` (Candidate votes),
  `voturi_total_competitori` (Total competitor votes), `mandate` /
  `mandate_faza_1` / `mandate_faza_2`, `aggregate_mandates`,
  `elected_mayor_claim`, `final_allocated_positions`,
  `final_elected_mayor_flag`, `null_votes_by_ballot_position`,
  `source_count_constituencies`, `source_count_polling_stations`.
- `elections.source_metric_map`: **3,274 rows** mapping source-family-specific
  metric codes (e.g. legacy `MAN_*`, `P1..Pn`, legend codes) to canonical
  metrics, with `mapping_status` and `resolver_version`.

### 5.4 Competitors, candidates, candidacies
- `elections.electoral_competitors`: `competitor_key`, `source_family`,
  `source_label`, `normalized_label`, `competitor_type`. **128,025
  competitors** (parties, alliances, independents).
- `elections.contest_competitors`: links a contest to a competitor with
  `ballot_position` and `source_label`.
- `elections.candidates`: `candidate_key`, `source_family`,
  `source_candidate_label`, `source_person_name`. **471,770 candidates** —
  names are **source-published labels only**, not resolved identities.
- `elections.candidacies`: links a candidate to a contest (and optionally a
  competitor), with `ballot_position`, `list_position`, `is_final_list`,
  `alliance_member_label`. **471,770 candidacies**.

### 5.5 Result rows (the core fact table)
- `elections.result_rows`: **~102.4M rows** (102,449,919 stored). Each row is
  a `contest × reporting_unit × metric × (optional competitor) × (optional
  candidate)` fact with `raw_value`, `numeric_value`, and full source
  pointers (`source_resource_id`, `source_file_id`, `source_row_number`,
  `source_row_hash`, `source_updated_at`).
- **Fact (extraction-hardening pass, 2026-06-25):** result numeric values are
  verified clean — `numeric_value` is 100% populated, integer vote counts,
  raw == numeric, plausible magnitudes, and the money/vote normalizer is
  inflation-immune (test-locked).

### 5.6 Mandates and allocations
- `elections.competitor_mandate_allocations`: party/list mandate **counts**
  per contest and competitor, with `allocation_phase` and `is_final`.
  **130,238 rows**. These are *source-published allocation metrics*, not named
  elected persons.
- `elections.elected_candidate_mandates`: schema exists with a hard CHECK
  constraint — a final candidate mandate **requires** both
  `source_names_candidate` and `final_allocation_evidence` plus non-empty
  `evidence` and full source pointers. **0 rows currently loaded.** Promotion
  is deliberately gated to a future named-mandate loader.

### 5.7 Referendum
- `elections.referendum_options`: `option_key`, `source_label`,
  `normalized_label` per contest. Parsed from referendum archives (2003, 2007
  May/Nov, 2012 June, 2018, 2019).

### 5.8 Identity and cross-domain link tables (schema present, population pending)
- `elections.candidate_person_links`: candidate → resolved person (status,
  method, confidence, resolver_version, evidence).
- `elections.competitor_party_links`: competitor → normalized party.
- `elections.officeholder_claim_links`: contest → external officeholder claim
  (e.g. Wikipedia local-politics, kept QC-only).
- `elections.parliament_mandate_links`: elected mandate → parliament mandate
  key (the bridge to `parliament.*`).

### 5.9 Validation and provenance
- `elections.validation_issues`: per-run validation findings
  (`info`/`warning`/`error`) with `issue_code`, linked to elections/contests/
  result rows/source files. Latest gate is **warnings-only (19 rows)**:
  `terminal_resource_requires_review=4`,
  `loaded_profiled_resource_not_parsed=14`,
  `raw_archive_rows_without_archive_entry_id=1`.
- Every serving row carries source lineage (`source_resource_id`,
  `source_file_id`, `source_row_number`, `source_row_hash`); raw payloads
  remain in the raw DB.

---

## 6. Missing or Uncertain Data

- **Elected candidate mandates (named winners):** **Fact:** 0 rows. The schema
  and a CHECK constraint exist, but the named-mandate promotion loader has not
  run. Users cannot yet see "X was elected" as a verified person-level fact —
  only party/list allocation counts and source-published "elected mayor claim"
  metrics. This is the **single biggest product gap**.
- **Candidate identity resolution:** **Fact:** candidate names are source
  labels only; `candidate_person_links` is not populated. No gender, age,
  profession, declarations, or ANI links are inferred. Users will see the same
  person under different source spellings until resolution is built.
- **Party normalization:** `competitor_party_links` is not populated.
  Competitors carry source labels (e.g. "PSD", "P.S.D.", "ALIANȚA PSD–PNL")
  but not a canonical party key, so cross-election party timelines are
  approximate until linked.
- **Historical corpus completeness:** **Fact:** the broader historical
  full-corpus load is "partial" per the inventory. Several parser lanes are
  intentionally metadata-only (candidate-detail files, mandate workbooks,
  legend-coded columns without a semantic map). Some AEP CKAN non-CSV
  workbooks/legends and local package resources are `loaded_profiled_resource_not_parsed`
  (14 warnings). Coverage is broad (1992–2025) but not uniformly complete.
- **Inaccessible sources:** **Fact:** 16 resources are
  `inaccessible_with_evidence` (mostly BEC live result pages that intermittently
  reset scrapers); 4 are `terminal_resource_requires_review`. These are
  explicit, evidenced gaps, not silent omissions.
- **Parliament mandate linkage:** `parliament_mandate_links` schema exists but
  is not populated, so election→parliament cross-domain navigation is a future
  feature.
- **Turnout / eligible-voter denominators:** Assumption: turnout can be
  derived from result metrics (valid + invalid + abstentions) where source
  published them, but a clean "registered voters" denominator per reporting
  unit is not confirmed as a first-class canonical metric across all years.
- **Geographic boundary changes over time:** Assumption: SIRUTA codes shift
  across decades; cross-year commune comparisons may need boundary-change
  caveats not yet modeled.

---

## 7. Core Entities and Relationships

```
elections.elections (44)
  └─ elections.contests (92,410)            [scope_type: siruta/county/diaspora/national/chamber/source_constituency]
       ├─ elections.contest_competitors    [ballot_position] → electoral_competitors (128,025)
       ├─ elections.candidacies (471,770)  [is_final_list, list_position] → candidates (471,770) → contest_competitors?
       ├─ elections.result_rows (~102.4M)  [metric × reporting_unit × competitor? × candidate?] → reporting_units (139,763)
       │                                      → metric_definitions (180) ← source_metric_map (3,274)
       ├─ elections.competitor_mandate_allocations (130,238)  [party/list mandate counts, allocation_phase]
       ├─ elections.elected_candidate_mandates (0)            [GATED: final requires named + allocation evidence]
       └─ elections.referendum_options                       [for referendum contests]

Link / bridge tables (schema present, population pending):
  candidate_person_links      candidates → resolved person
  competitor_party_links      competitors → canonical party
  officeholder_claim_links    contests → external officeholder claims (Wikipedia QC-only)
  parliament_mandate_links    elected_candidate_mandates → parliament mandates (cross-domain)

elections.validation_issues   per-run audit (info/warning/error)
```

**Key relationships for UX:**
- **Election → Contests → Results**: the primary drill-down path
  (year/type → contest → results by geography).
- **Competitor ↔ Contest ↔ Candidate ↔ Candidacy**: candidates run on
  competitor lists within contests; candidacies tie a named (source-label)
  candidate to a ballot/list position.
- **Result row ↔ Reporting unit ↔ Metric**: every number has a place and a
  meaning; competitor/candidate FKs are optional because some metrics are
  aggregate (turnout, null votes, constituency counts).
- **Mandates are split**: party/list *counts* (populated) vs. named elected
  *persons* (gated/empty) — UX must not blur this line.
- **Cross-domain**: the intended bridge to `parliament.*` (mandates, members,
  roll-call votes) lives in `parliament_mandate_links`, to be built.

---

## 8. Recommended User Journeys

### 8.1 Casual voter journey: "How did my area vote?"
1. **Overview:** Lands on `/alegeri` — picks an election (e.g. "Alegeri
   locale 2024") from a time/type browser.
2. **Detail:** Selects their county → commune; sees a plain-language result
   card ("Câștigător: [name/party] — X% din voturi") plus a simple bar chart
   of competitor results and turnout.
3. **Insight:** Sees a "compared to 2020" mini-panel and a link to the
   elected officeholder / parliament member if linked. Source link confirms
   provenance.

### 8.2 Journalist/analyst journey: "Party trajectory over time"
1. **Overview:** Searches a party/competitor name; lands on a competitor
   profile aggregating all its contests across years.
2. **Detail:** Filters to a family (e.g. parliamentary) and a geography set
   (counties); sees vote-share trend lines and mandate-count history with
   allocation phases.
3. **Insight:** Exports the filtered result set (CSV/JSON), cites the source
   file/row evidence, and follows cross-links to parliament mandates /
   roll-call cohesion for elected members.

### 8.3 Domain-expert journey: "Polling-station-level analysis"
1. **Overview:** Opens a specific contest (e.g. a 2025 presidential runoff
   constituency).
2. **Detail:** Drills to polling-station reporting units; views candidate
   votes, null votes by ballot position, and source metric codes alongside
   canonical labels.
3. **Insight:** Inspects the `source_metric_map` and validation issues to
   understand exactly which legacy columns map to which canonical metric, and
   flags unresolved candidate labels for the identity-resolution queue.

---

## 9. Recommended Information Architecture

1. **Landing page** (`/alegeri`): election browser by year and family, a
   featured "latest election" summary, and plain-language entry points
   ("Cum s-a votat în județul tău").
2. **Search / listing**: filterable election & contest index; global search
   routes party/competitor/candidate (source-label) hits into the elections
   domain.
3. **Entity detail pages**:
   - Election detail (all contests, rounds, summary)
   - Contest detail (results by reporting unit, competitors, candidates)
   - Competitor/party profile (cross-election history)
   - Candidate profile (source appearances + candidacies; identity caveat)
   - Reporting unit / geography profile (results across elections held there)
   - Referendum detail (options + results)
4. **Comparison views**: party/candidate across elections; geography across
   elections; election-vs-election swings.
5. **Dashboards / analytics**: turnout, invalid votes, diaspora patterns,
   mandate allocation vs. vote share.
6. **Cross-domain related links**:
   - Elected candidate → `parliament` member profile + mandate + roll-call
     votes (via `parliament_mandate_links`, when populated).
   - Competitor/party → parliament group membership history.
   - Local winners → `primarii_transparency` / budget pages for the same
     SIRUTA/CUI.
   - Candidates/parties → `companies` / procurement where a CUI link exists
     (future).

**Recommendation:** Mirror the existing platform IA pattern
(e.g. `/parlament`, `/pnrr`): a top-level `/alegeri` hub with typed sub-routes,
reusing the shared entity-search and geography (SIRUTA) infrastructure.

---

## 10. Recommended Pages

### 10.1 Elections landing page (`/alegeri`)
- **Primary content:** year/family election browser, latest-election highlight
  card, "explore by geography" entry, plain-language FAQs.

### 10.2 Election detail page (`/alegeri/$electionKey`)
- **Primary content:** election name, date, round, authority,
  `publication_status`/`is_final` badges, list of contests grouped by office
  and scope, summary turnout, and a results-at-a-glance panel for headline
  contests.

### 10.3 Contest detail page (`/alegeri/contest/$contestKey`)
- **Primary content:** office, chamber, round, scope (county/constituency/
  national/diaspora), competitor results ranked by votes, candidate list with
  ballot/list positions, turnout & invalid-vote metrics, a reporting-unit
  drill-down (county → commune → polling station), and a "mandate allocation"
  panel showing `competitor_mandate_allocations` by phase.

### 10.4 Competitor / party profile page (`/alegeri/partid/$competitorKey`)
- **Primary content:** source label + normalized label, all contests
  contested, vote-share and mandate-count timeline, geographies of strength,
  alliance member labels, and a (future) canonical-party link.

### 10.5 Candidate profile page (`/alegeri/candidat/$candidateKey`)
- **Primary content:** source candidate label and source person name (clearly
  marked as **source evidence, not verified identity**), all candidacies with
  contest/competitor/ballot position, results where the candidate is named,
  and a prominent identity-resolution status badge ("nerezolvat" / "rezolvat
  cu încredere X%"). Cross-link to parliament member page when
  `candidate_person_links` resolves.

### 10.6 Reporting unit / geography page (`/alegeri/loc/$reportingUnitKey`)
- **Primary content:** all election results held at that reporting unit
  (county/commune/polling station) across years, with a map pin and SIRUTA/
  county context, plus cross-links to `primarie`/budget pages for the same
  geography.

### 10.7 Referendum detail page (`/alegeri/referendum/$contestKey`)
- **Primary content:** referendum question/options from
  `referendum_options`, yes/no/invalid results by reporting unit, turnout.

### 10.8 Mandate outcomes page (`/alegeri/mandate/$contestKey`)
- **Primary content:** `competitor_mandate_allocations` by phase and
  competitor; once populated, named `elected_candidate_mandates` with
  verification badges (`source_names_candidate`, `final_allocation_evidence`).
  **Fact:** named mandates are currently empty; show party/list allocations
  now and label the named-person section as "în curs de finalizare".

### 10.9 Analytics dashboard (`/alegeri/analiza`)
- **Primary content:** turnout trends, invalid-vote shares, diaspora vs.
  national comparisons, party-trajectory charts, swing maps. Reserved for
  advanced use; export-oriented.

---

## 11. Recommended Filters and Search

### 11.1 Searchable
- Election name, year, family, round.
- Contest office, chamber, scope (county/constituency/diaspora/national).
- Competitor source label / normalized label (party/alliance/independent).
- Candidate source label / source person name (with explicit "source
  evidence" caveat in results).
- Reporting unit name, SIRUTA code, county.
- Referendum option labels.

### 11.2 Filterable (facets)
- **Election family:** local, parliamentary, presidential, European
  Parliament, referendum.
- **Year / year range** (1992–2025).
- **Round** (e.g. tur 1 / tur 2).
- **Geography:** county, commune (SIRUTA), diaspora, national.
- **Office / chamber** (president, deputy, senator, mayor, county council,
  local council, European MP).
- **Competitor type** (party / alliance / independent).
- **Authority** (AEP / BEC / ROAEP).
- **Publication status / finality** (`is_final`, `publication_status`).
- **Data-quality facet (advanced):** only rows with source-file pointers,
  exclude metadata-only, show validation-issue contests.

### 11.3 Reserved for advanced functionality
- Polling-station-number filtering (huge cardinality; expert mode).
- Raw source-metric-code filtering (domain-expert mode via
  `source_metric_map`).
- Cross-election swing thresholds and custom geography sets.
- Export of arbitrary filtered result-row sets (CSV/JSON) — high value but
  heavy; gate behind the analytics/dashboard page.

---

## 12. Recommended Visualizations

### 12.1 Plain-language (default)
- **Winner card:** "Câștigător: [label] — X voturi (Y%)" with a checkmark and
  a plain-language turnout line.
- **Ranked bar chart:** competitor/candidate vote counts and shares for a
  selected contest and geography.
- **Turnout gauge:** valid / invalid / abstained split.
- **Round comparison:** tur 1 vs tur 2 side-by-side for presidential/local
  runoffs.

### 12.2 Geographic
- **Choropleth maps:** county/commune-level vote share, turnout, winner-takes
  map, and swing-between-elections maps. Reuse the platform's existing
  SIRUTA/map infrastructure (`/primarie/harta`, advanced-map features).
- **Diaspora map:** results by diaspora reporting unit.

### 12.3 Temporal
- **Party trajectory line charts:** vote share / mandate count across
  elections.
- **Turnout trend** per geography over time.

### 12.4 Explained in plain language
- Every chart carries a one-line "ce înseamnă asta" explainer and a
  provenance chip linking to the source file/row.
- Mandate allocation phases explained ("faza 1 / faza 2 / final") in
  tooltips.

### 12.5 Reserved as advanced
- Polling-station scatter plots and anomaly detection.
- Mandate-allocation-vs-vote-share deviation analysis.
- Identity-resolution confidence visualizations (once
  `candidate_person_links` is populated).

---

## 13. MVP Features

### 13.1 Elections landing & browse
- **User problem:** Users cannot find which elections exist or pick one to
  explore.
- **Expected user value:** A clear entry point to all 44 elections across
  families/years.
- **Required data:** `elections.elections` (family, name, year, round, date,
  authority, is_final).
- **Recommended UX pattern:** Year/family grid browser with a
  "latest/featured" card and a geography search box.
- **Priority rationale:** Cheapest to build; immediate orientation; unlocks
  everything else.

### 13.2 Contest result explorer (the core MVP)
- **User problem:** "How did my county/commune vote in election X?" requires
  downloading and parsing CSVs today.
- **Expected user value:** One-click ranked results + turnout for any
  contest, drillable from national → county → commune → polling station.
- **Required data:** `contests`, `result_rows`, `reporting_units`,
  `metric_definitions`, `electoral_competitors`, `contest_competitors` (all
  populated).
- **Recommended UX pattern:** Contest page with ranked competitor bar chart,
  turnout gauge, geography drill-down breadcrumbs, and a results table with
  provenance chips.
- **Priority rationale:** Directly answers the #1 casual-user question using
  the largest, cleanest, fully-populated dataset. **This is the most
  important MVP feature.**

### 13.3 Competitor / party profile (cross-election)
- **User problem:** "How has party X done over time?" is unanswerable today.
- **Expected user value:** A single page aggregating a competitor's contests,
  vote shares, and mandate counts across years.
- **Required data:** `electoral_competitors`, `contest_competitors`,
  `result_rows`, `competitor_mandate_allocations`.
- **Recommended UX pattern:** Profile header (source vs normalized label) +
  timeline chart + filterable contest list.
- **Priority rationale:** High journalist/analyst value; reuses populated
  data; introduces the (future) party-normalization need gently.

### 13.4 Candidate profile (source-evidence-first)
- **User problem:** Candidate names exist but are scattered and unverified.
- **Expected user value:** See all of a candidate's source appearances and
  candidacies with clear identity-caveat labeling.
- **Required data:** `candidates`, `candidacies`, `contest_competitors`,
  `result_rows` (candidate-scoped).
- **Recommended UX pattern:** Profile with a prominent "nume din sursă,
  identitate nerezolvată" badge, candidacy timeline, and a future
  identity-resolution status block.
- **Priority rationale:** Establishes the provenance-first trust contract
  early and sets up the identity-resolution roadmap honestly.

### 13.5 Source / provenance drawer
- **User problem:** Users cannot verify where a number came from.
- **Expected user value:** One click reveals source resource, file, row
  number, and hash for any result row.
- **Required data:** `source_resource_id`, `source_file_id`,
  `source_row_number`, `source_row_hash` (present on all result/candidacy
  rows).
- **Recommended UX pattern:** Slide-over drawer from any result row /
  chart point showing source lineage and a link to the official resource.
- **Priority rationale:** Core to Transparenta.eu's trust proposition;
  differentiates from BEC/ROAEP portals; cheap given the data is already
  there.

### 13.6 Referendum results page
- **User problem:** Referendum results are hard to find and compare.
- **Expected user value:** Option-level results (yes/no/invalid) by
  geography for each referendum.
- **Required data:** `referendum_options`, `result_rows`, `reporting_units`.
- **Recommended UX pattern:** Option cards + turnout + choropleth by
  county/diaspora.
- **Priority rationale:** Self-contained, populated, and distinct enough to
  warrant its own clear page; lower effort than named mandates.

### High-value next features
- **Named elected-mandate promotion + page:** once the gated
  `elected_candidate_mandates` loader runs, surface verified elected persons
  with evidence badges. (Highest unlock value; blocked on data work.)
- **Geography profile page:** all elections held at a SIRUTA/county in one
  place, cross-linked to `primarie`/budget.
- **Election-vs-election swing comparison** (maps + tables).
- **Global search integration:** route party/competitor/candidate hits into
  `/alegeri` entity pages.
- **MCP tools:** `resolve_election_filters`, `get_election_results`,
  `get_competitor_history`, `get_contest_mandates` — for agent/analyst
  access, matching the pattern of other domains.

---

## 14. Advanced Features

### 14.1 Candidate identity resolution UI
- **User problem:** The same person appears under multiple source spellings;
  analysts cannot trust person-level cross-election timelines.
- **Expected user value:** Resolved person profiles with confidence, method,
  and evidence, plus a review queue.
- **Required data:** `candidate_person_links` (schema present, population
  pending) + a resolver pipeline.
- **Recommended UX pattern:** "Persoane rezolvate" workspace with
  confidence badges, merge/split review actions, and evidence trails.
- **Priority rationale:** High expert value; explicitly de-risked by the
  schema's link table design; must stay QC-gated (Wikipedia never becomes
  canonical identity).

### 14.2 Cross-domain election → parliament linkage
- **User problem:** Voters cannot connect "who was elected" to "how they
  voted in parliament".
- **Expected user value:** From an elected candidate, navigate to their
  parliament member profile, mandate, and roll-call cohesion.
- **Required data:** `parliament_mandate_links` + `elected_candidate_mandates`
  (both pending) + `parliament.*` (available).
- **Recommended UX pattern:** "Activitate parlamentară" section on the
  candidate/elected-mandate page, linking to existing `/parlament/membri`
  routes.
- **Priority rationale:** Delivers the domain's biggest differentiated
  insight; depends on two pending data links.

### 14.3 Polling-station-level analytics
- **User problem:** Experts need station-level granularity for swing/anomaly
  analysis.
- **Expected user value:** Filter, map, and export per-polling-station
  results across elections.
- **Required data:** `result_rows` at `polling_station` reporting units
  (populated), `reporting_units.polling_station_number`.
- **Recommended UX pattern:** Expert-mode table + map with station filters
  and CSV/JSON export.
- **Priority rationale:** Very high cardinality; reserve for expert mode to
  protect casual-user clarity.

### 14.4 Mandate allocation vs. vote-share analysis
- **User problem:** "Did seat allocation match vote share?" is non-trivial.
- **Expected user value:** Deviation charts between
  `competitor_mandate_allocations` and raw vote shares, by allocation phase.
- **Required data:** `competitor_mandate_allocations` (populated) +
  `result_rows` aggregates.
- **Recommended UX pattern:** Dual-axis chart + deviation table on the
  contest/mandate page.
- **Priority rationale:** Strong expert/NGO value; uses already-populated
  allocation data.

### 14.5 Source-metric dictionary explorer
- **User problem:** Legacy source metric codes (`MAN_*`, `P1..Pn`) are opaque.
- **Expected user value:** Browse the `source_metric_map` to see how each
  source code maps to a canonical metric, with resolver version and status.
- **Required data:** `source_metric_map`, `metric_definitions`.
- **Recommended UX pattern:** Reference page with family/code filters and
  mapping status badges.
- **Priority rationale:** Niche but essential for trust/methodology
  transparency; low effort.

### 14.6 Data-quality / coverage dashboard
- **User problem:** Users need to know which elections/geographies are
  complete vs. partial.
- **Expected user value:** A transparency page showing validation issues,
  inaccessible resources, and metadata-only parser lanes.
- **Required data:** `validation_issues`, discovery manifest statuses.
- **Recommended UX pattern:** Status board grouped by `issue_code` and
  source family.
- **Priority rationale:** Reinforces the "honest about gaps" brand;
  operational and trust value.

---

## 15. UX Risks and Edge Cases

### 15.1 Candidate name = source evidence, not identity (CRITICAL)
**Fact:** Candidate names are source-published labels only; no person
identity is inferred; `candidate_person_links` is empty. The same human can
appear as "ION POPESCU", "Popescu Ion", or under a party-list position
without `NUMEC`.

**Risk:** Users (and the UI) conflate source labels with real people,
producing false "same person" timelines or wrongful associations.

**Recommendation:**
- Label every candidate page with "Nume din sursă — identitate nerezolvată".
- Never auto-merge candidates by name string.
- When identity resolution ships, show confidence + method + evidence and
  allow user-visible "nu este aceeași persoană" flags.
- Keep `xcandid` list-level placeholders (no `NUMEC`) out of "named
  candidate" views.

### 15.2 Conflating election results with parliamentary votes (CRITICAL)
**Fact:** The codebase enforces a hard boundary — election results live in
`elections.result_rows`; parliamentary roll-call votes live in
`parliament.votes`/`parliament.vote_records`. These are different concepts
("votes received from citizens" vs. "votes cast by MPs").

**Risk:** UX language, icons, or page structure blur "voturi la alegeri" and
"voturi în parlament", misleading users about what a number means.

**Recommendation:**
- Use distinct labels/icons: "Rezultate alegeri" vs. "Vot parlamentar".
- On any page that shows both, add an explicit explainer.
- Cross-link only via `parliament_mandate_links` (elected → MP), never by
  assuming candidate == MP.

### 15.3 Named mandates are empty
**Fact:** `elected_candidate_mandates` has 0 rows; only party/list allocation
*counts* exist. Showing a "winner" as a named elected person is not yet
data-supported except via source "elected mayor claim" metrics.

**Risk:** The UI implies verified named winners that the data does not back.

**Recommendation:** Surface party/list mandate allocations now; show named
elected-person sections as "în curs de finalizare" with the gate rationale,
until the named-mandate loader runs.

### 15.4 Historical format heterogeneity
**Fact:** Sources range from 1992 DBF to 2025 AEP CKAN CSV; some parser lanes
are metadata-only; legend-coded columns map via `source_metric_map` with
`mapping_status`.

**Risk:** Cross-year comparisons look consistent but rest on differently
sourced/normalized metrics.

**Recommendation:** Show source family + authority + mapping status on
historical results; add caveats when comparing across very different source
formats; expose the source-metric explorer (14.5).

### 15.5 Inaccessible / terminal-review sources
**Fact:** 16 `inaccessible_with_evidence` + 4 `terminal_resource_requires_review`
resources exist (mostly BEC live pages).

**Risk:** Silent gaps look like "no data" rather than "couldn't reach source".

**Recommendation:** Render these as explicit "sursă inaccesibilă (cu
dovadă)" badges with the evidence link, never as empty zeros.

### 15.6 Wikipedia local-politics is QC-only
**Fact:** Wikipedia local-politics rows are discovered as `comparison_qc_only`
and validation structurally fails if any Wikipedia row is promoted to results,
candidates, or elected mandates.

**Risk:** Treating Wikipedia as canonical officeholder truth.

**Recommendation:** If shown at all, render Wikipedia claims only as
"comparație/QC" with a clear non-canonical label and link to the official
source.

### 15.7 High-cardinality performance
**Fact:** ~102.4M result rows. Naive aggregation/filtering will be slow.

**Recommendation:** Pre-aggregate headline metrics (contest-level winner,
turnout, per-competitor totals) into materialized/read-model tables; keep
polling-station grain behind expert-mode paginated queries; lean on the
platform's existing search/cache projection pattern.

### 15.8 Party/alliance label drift
**Fact:** Competitor source labels vary ("PSD", "P.S.D.", alliance labels);
`competitor_party_links` is empty.

**Risk:** Party timelines fragment across aliases.

**Recommendation:** Until party normalization ships, group by
`competitor_key` and show source labels verbatim with a "alias posibil"
hint; never silently merge.

---

## 16. Open Questions

1. **Named mandates:** When will the gated `elected_candidate_mandates`
   loader run, and what is the source for `source_names_candidate` +
   `final_allocation_evidence` — BEC final allocation files, ROAEP, or a
   manual review path?
2. **Identity resolution roadmap:** Is there a planned resolver for
   `candidate_person_links` (and `competitor_party_links`), and what
   confidence/method policy will govern public display?
3. **Parliament linkage:** What is the timeline and method for populating
   `parliament_mandate_links` to enable election→parliament navigation?
4. **Turnout denominators:** Is "registered voters / inscriti" available as a
   canonical metric across all years, or must turnout be derived per source
   family with caveats?
5. **Historical completeness:** Which specific election/year/contest
   combinations are metadata-only or unparsed, and should the MVP restrict to
   a "core verified" subset (e.g. 2008–2025) before exposing 1992–2008?
6. **Backend ownership:** Will elections get a dedicated server module
   (GraphQL + MCP) following the parliament/budget pattern, or be served via
   a generic contributor? This determines IA feasibility.
7. **Candidacy vs. result grain:** For list-based contests, how should the UI
   present `candidacies` (ballot/list positions) alongside `result_rows` that
   are often competitor-level rather than candidate-level?
8. **Export policy:** Should bulk result-row export be open (journalist
   value) or rate-limited/curated given the 102M-row scale?

---

## 17. Final Recommendation

- **Best starting point:** Build the **contest result explorer** (MVP 13.2)
  on top of the fully-populated, extraction-verified `result_rows` /
  `contests` / `reporting_units` / `competitors` data, scoped initially to
  the **2008–2025** elections where source formats are most consistent, then
  extend to the 1992–2008 historical corpus.
- **Highest-value user journey:** The **casual voter journey** ("How did my
  area vote?") — it serves the largest audience, answers the most common
  question, and showcases the domain's trust/provenance advantage over BEC/
  ROAEP portals.
- **Most important MVP feature:** The **contest result explorer** with
  geography drill-down + ranked results + turnout + provenance drawer. It
  reuses the cleanest, largest dataset and unlocks every other journey.
- **Biggest UX risk:** **Treating candidate source labels as resolved person
  identities**, and **conflating election results with parliamentary
  roll-call votes.** Both must be guarded with explicit labels, distinct
  icons, and honest "nerezolvat / în curs de finalizare" states.
- **Biggest data dependency:** **Named elected-candidate mandates
  (`elected_candidate_mandates`)** are gated and empty; the verified
  "who was elected" layer — and the election→parliament cross-domain story —
  depends on populating `elected_candidate_mandates`, `candidate_person_links`,
  and `parliament_mandate_links`.
- **Top open questions:** (1) named-mandate promotion timeline and evidence
  source; (2) candidate/party identity-resolution roadmap and confidence
  policy; (3) parliament-mandate-link population plan; (4) whether to scope
  the MVP to a verified 2008–2025 subset before exposing the partial
  1992–2008 historical corpus.

**Recommendation:** Ship the elections product in two waves. **Wave 1 (MVP):**
landing + contest result explorer + competitor profile + candidate
(source-evidence) profile + referendum page + provenance drawer, on the
populated results data. **Wave 2:** named mandates, identity resolution,
parliament cross-domain linkage, polling-station analytics, and MCP/search
integration — each unlocked by its pending data dependency, and shipped with
honest coverage/quality dashboards.

## Design Handoff Notes (added in review)

- **Canonical route assumption:** dedicated `/alegeri` domain area with typed detail routes for elections, contests, competitors/parties, candidates, reporting units, referendums, and mandates.
- **Shared components to reuse/build:** SourceProvenanceDrawer, CoverageRibbon, IdentityConfidenceBadge, DataStatusBadge, GeographyDrilldown, ShareFilteredView, ExportAction.
- **First screen to design:** Contest detail/result explorer: contest header, geography breadcrumb, ranked results, turnout/invalid vote summary, map/list drill-down, and source drawer per number.
- **Copy guardrail:** `nume din sursa` and `identitate nerezolvata` must appear on candidate surfaces; `mandate pe lista/partid` must not be copy-written as verified elected persons.
- **Product-owner question:** decide whether v1 exposes all 1992-2025 historical coverage or a cleaner 2008-2025 subset first.
