# Domain: Justice & Judicial Cases (Justiție)

## Review changelog (2026-06-26)

- **Recommendation:** Added design handoff notes for a privacy-first entity litigation slice, with person-name suppression as the default UI contract.
- **Recommendation:** Standardized justice components with the platform EvidenceViewer, PrivacyBoundaryNotice, CoverageRibbon, and IdentityConfidenceBadge.
- **Recommendation:** Removed a stale generated file-path footer that pointed to a temporary worktree instead of this repository.

> UX/product research for the Transparenta.eu public-data platform.
> Scope: UX, product design, public value, and information architecture only — no
> code or implementation.
>
> Evidence labels used inline: **Fact:** (grounded in the scraper inventory, notes,
> validation/decision-review docs, or source code), **Assumption:** (sensible
> product inference, not yet verified), **Recommendation:** (proposed UX approach).
>
> Primary source of truth: the scraper project `hack-for-facts-eb-scrapper`
> (`prod-db/DATA_INVENTORY.md`, `prod-db/JUDICIAL_CASES_NOTES.md`,
> `prod-db/JUDICIAL_DATA_VALIDATION.md`, `prod-db/JUDICIAL_DECISION_REVIEW.md`,
> `prod-db/WIP_DATA_COMPLETION_STATUS.md`, and
> `src/src/sources/judicial-cases/**`). No live database was accessed; all counts
> are quoted from those documents.

## 1. Domain Summary

**Fact:** Transparenta.eu holds a large, privacy-critical judicial corpus. The
serving schema `justice` in `transparenta_prod` is populated and verified, with
exact live counts on 2026-06-20: `justice.cases` = **6,334,777**,
`justice.case_parties` = **16,758,719**, `justice.party_name_keys` = **745,538**
(WIP_DATA_COMPLETION_STATUS.md "Final cross-source verification"). The inventory
confirms `justice.cases` = 6,334,777 exact on 2026-06-25 (DATA_INVENTORY.md).

**Fact:** The domain covers judicial case metadata and privacy-gated litigation
facts — courts, cases, hearings/events, appeals, parties, party name keys,
company/public-party candidates, legal references, and case-lineage candidates.
Raw sources are ECRIS/Portal Just (portal.just.ro SOAP `CautareDosare2`) plus
ICCJ, CCR, HUDOC, and just.ro artifact lanes (JUDICIAL_CASES_NOTES.md
"Raw-source extraction lanes").

**Fact:** The backend `judicial` module EXISTS and is wired into the redesign app
with GraphQL, MCP, a privacy-safe contributor, and a lazy legal-act loader.
MCP tools exist: `resolve_judicial_filters`, `get_judicial_case`,
`get_court_caseload`, `get_company_litigation`, `get_case_legal_references`,
with "Tool IO explicitly privacy constrained" (DATA_INVENTORY.md, Justice
section).

**Fact:** The client has NO dedicated judicial route. Company/entity profiles
exist and could host a company-litigation slice (DATA_INVENTORY.md; confirmed
by grep of `src/routes` finding no `judicial`/`justice`/`litigation` route
files).

**Fact:** Privacy is a first-class, structural concern. Raw preserves sensitive
party/person data; serving tools omit party/person details by policy. The
prod schema enforces a structural default-deny invariant: party names are
reachable ONLY via `party_name_keys`, which admits ONLY positively-evidenced
company/public parties (classifier rule ∈ PUBLISHABLE_RULES). Persons and
low-confidence-company rows never enter the dictionary (JUDICIAL_CASES_NOTES.md
"JC-B — justice production schema", DECISION C + privacy invariant).

**Recommendation:** Treat this domain as a high-value, high-care domain: rich
public-interest data (millions of cases, court analytics, company litigation)
that must be presented with explicit privacy gating and honest coverage
messaging. The first product surface should be a **company-litigation slice on
company/entity profiles**, not a broad case-search for persons.

## 2. Public Value

- **Accountability of companies and public entities in court:** citizens,
  journalists, and watchdogs can see which companies and public institutions
  are frequent litigants, in which courts, for what kinds of cases, and how
  they relate to public money (procurement, PNRR, budget).
- **Court-system transparency:** court caseload analytics (volume, stage
  distribution, appeal rates, year trends) make the functioning of the
  Romanian judiciary legible at a system level — a current blind spot.
- **Legal-reference discovery:** connecting case `object`/`solution` text to
  the cited laws/acts (already in `legal.acts`) lets users see which
  legislation is actually being applied in courts.
- **Case-lineage understanding:** appeal chains (judecătorie → tribunal →
  curte de apel) help users follow a dossier's journey across court tiers.
- **Cross-domain due diligence:** linking litigation to company profiles,
  procurement suppliers, and public entities gives a fuller integrity picture
  of who handles public money.

**Fact:** The data scale underwrites this value: ~6.33M cases, ~18.62M
hearings, ~2.25M appeals, ~16.76M party mentions, 246 courts mapped
(JUDICIAL_CASES_NOTES.md "JC-B P0a CORPUS machinery"; "Gate 3").

## 3. Target Users

1. **Casual public users** — a citizen who heard a company or public
   institution is "in court" and wants to understand what that means in plain
   language, without legal training and without exposing private individuals.
2. **Journalists, analysts, NGOs, researchers, watchdogs** — the core
   power users: investigating company litigation patterns, court caseloads,
   cross-referencing litigation with procurement/PNRR/budget data, producing
   evidence-backed reporting.
3. **Domain experts (lawyers, court watchers, civic-tech researchers)** —
   users who understand case numbers, court hierarchy, stages, and appeal
   chains, and who need precise filters, lineage, and legal-reference
   exploration.

**Assumption:** The product should be optimized primarily for group 2
(journalists/analysts/NGOs) because they extract the most public value and the
backend MCP/GraphQL tools already speak their query patterns, while remaining
legible to group 1 and precise enough for group 3.

## 4. Key User Questions

### Questions the product should answer immediately

- Is company/institution **X** involved in litigation? In how many cases, in
  which courts, as what kind of party (claimant/defendant/etc.)?
- What does a specific **case** (by case number) look like — court, stage,
  object, latest hearing, appeals — when the parties are companies/public
  entities?
- How busy is **court Y** — how many cases, by year, by category/stage?
- What **laws/acts** are cited in a case's object/solution, and where do those
  acts live in the platform's legal section?
- What is the **coverage** of this data — which years, which court tiers, and
  what is explicitly missing (e.g., ICCJ)?

### Questions requiring deeper analysis

- Which companies/institutions are the **most frequent litigants** in a court,
  county, or case category, and how does that correlate with public
  contracts/PNRR awards?
- What are **appeal-chain patterns** — how often does a dossier travel across
  tiers, and what are outcomes at each stage?
- Are there **outlier courts** with abnormal caseload mix, solution rates, or
  appeal volumes?
- Which **legal acts** are most cited across the case corpus, and is there
  drift over time?
- For a public entity/company profile, how does its **litigation footprint**
  compare to peers?

**Fact:** Some of these ("most frequent litigants", "appeal chains", "legal-act
citation frequency") depend on derive lanes that are DDL-only and gated
(`party_company_candidates`, `case_lineage_candidates`, `case_legal_references`
are empty in v1 until their precision gates pass — JUDICIAL_CASES_NOTES.md
"Load scope split"). The product must communicate which of these are available
now vs. coming.

## 5. Available Data

**Fact:** All counts below are grounded in the scraper notes (live exact
counts, 2026-06-20 / 2026-06-25).

### Serving schema `justice` (populated, verified)

- `justice.courts` — **246 courts** seeded from the court-hierarchy map:
  179 judecătorii, 46 tribunale, 5 tribunale militare, 15 curți de apel, 1
  Curtea Militară de Apel. Columns: `institution_code`, `ordinal`,
  `court_level`, `specialization`, `locality`, `county_code`,
  `parent_institution_code` (self-FK), `mapping_confidence` (245 high / 1
  medium), `evidence` (JUDICIAL_CASES_NOTES.md "Gate 3"; schema columns).
- `justice.cases` — **6,334,777 cases**. Columns: `case_id` (reused from raw,
  guarded), `source_slug` (`portal_just`), `institution_code`, `case_number`,
  `case_number_old`, `department`/`category`/`category_name`/`stage`/
  `stage_name`/`object` (raw passthrough), `source_opened_at`,
  `latest_source_modified_at`, `first_seen_at`, `last_seen_at`,
  `latest_snapshot_id`, `sync_run_id`. Natural key `(source_slug,
  institution_code, case_number)`.
- `justice.case_hearings` — **~18,619,883 hearings**. Per case: `hearing_index`,
  `hearing_at`, `panel`, `solution`, `solution_summary`, `pronouncement_date`,
  `document_number`, `document_date`, `row_hash`, `latest_snapshot_id`.
- `justice.case_appeals` — **~2,248,524 appeals**. Per case: `appeal_index`,
  `appeal_declared_at`, `appeal_type`, `row_hash`, `latest_snapshot_id`.
- `justice.case_parties` — **16,758,719 party rows** (P0b loaded + verified).
  Per case `(case_id, party_index)`: `name_key_id` (the ONLY path to a name,
  NULL for persons/unknown/low-confidence), `role_normalized` (controlled
  vocabulary), `party_kind` (`company`/`public_entity`/`person`/`unknown`),
  `classifier_version`, `classifier_rule`, `row_hash`, `latest_response_id`,
  `parser_version`. **No free-text name column** on this table.
- `justice.party_name_keys` — **745,538 distinct publishable company/public
  name keys** (dictionary). Columns: `name_key`, `display_name`,
  `party_kind` (only `company`/`public_entity`), `legal_form`, `alias_keys`
  (FOSTA/parenthetical former names), `mention_count`, classifier/normalizer
  versions. By construction holds ZERO person/unknown names.

### Serving schema `justice` (DDL only, empty/gated in v1)

- `justice.party_company_candidates` — name-key grain candidates linking
  party name keys to company CUIs (cross-domain candidate, NOT an identity
  claim). `validation_status` restricted to `candidate`/`needs_review`/
  `rejected` in v1 (no auto-accept/publish path).
- `justice.case_legal_references` — extracted law/act citations from
  `object`/`solution`/`solution_summary` text, resolved against
  `legal.act_citation_keys`. `resolution_status` ∈ unique/ambiguous/unresolved.
- `justice.case_lineage_candidates` — inferred appeal/old-number/cross-
  institution lineage edges between cases.

### Raw sources (transparenta_eu_judicial_cases + MinIO artifacts)

**Fact:** Five raw lanes are deployed and live-verified
(JUDICIAL_CASES_NOTES.md "Raw-source extraction lanes"):

- **ECRIS/Portal Just** — the SOAP crawl; `privacy_class =
  procedural_metadata_raw_person_data`. ~996k SOAP responses, full case
  corpus. Pre-2013-05 unreachable via `CautareDosare2` (modification-window
  floor).
- **ICCJ** — `raw_restricted_person_data`; full corpus = 945,628 records /
  100,943 cases / 13,485 appeals (content-addressed; ICCJ↔ECRIS lineage is a
  later candidate resolver).
- **CCR** (Constitutional Court) — `public_fulltext`; PDF+text pairs,
  OCR-heavy.
- **HUDOC** (ECHR) — `public_fulltext`/`raw_public_record`; official EN/FR.
- **just.ro** — `aggregate_only`; statistics pages + linked stat files.

### Cross-domain links available

**Fact:** `justice.courts.county_code` links to `core.territories.county_code`
(no hard FK); `party_company_candidates.candidate_cui` links to
`companies`/`core` (candidate, not identity); `case_legal_references.
target_act_id` links to `legal.acts`; cases tie to companies/entities via
CUI and normalized names (DATA_INVENTORY.md "Cross-Domain Correlation").

## 6. Missing or Uncertain Data

**Fact (coverage gaps that affect UX):**

- **ICCJ is permanently absent from the ECRIS/Portal Just source.** The
  supreme court is not on portalquery.just.ro. ICCJ data exists only as a raw
  scaffold (artifact lane) and is NOT in `justice.cases` (JUDICIAL_DATA_
  VALIDATION.md §2; JUDICIAL_CASES_NOTES.md "Gate 3" notes "ICCJ absent
  (known)"). UX must state this explicitly wherever appeal chains or "highest
  court" are implied.
- **Dense coverage ≈ 2021+.** Year segments: 2024 = 1.44M, 2023 = 1.34M,
  2025 = 1.27M, 2026 = 475k, 2022 = 458k, 2021 = 153k, 2020 = 59k; ~757k
  cases have non-standard number formats (`case_number_old`, `*`-suffix)
  (JUDICIAL_DATA_VALIDATION.md §2). Pre-2021 data thins sharply; pre-2013-05
  is unreachable via the SOAP window.
- **No case documents.** Only metadata + solution/hearing text — no PDFs,
  indictments, or written decisions from Portal Just (JUDICIAL_DATA_
  VALIDATION.md §5 risk #2). CCR/HUDOC/ICCJ have full-text artifacts but those
  are separate, gated lanes.
- **Person party names are structurally unavailable** in serving. ~54–55% of
  party mentions are persons; under the default-deny policy these are
  name-nulled (role + kind + count preserved) (JUDICIAL_CASES_NOTES.md
  "Gates 2/4/5"; DECISION 5).
- **No CUI in the judicial source.** Company linking is name-only →
  candidates-with-confidence, never hard identity (JUDICIAL_DATA_VALIDATION.md
  §3, §5 risk #1). `party_company_candidates` is empty/gated in v1.

**Fact (derive lanes gated, not populated):** Appeal lineage
(`case_lineage_candidates`), legal-citation resolution
(`case_legal_references`), and company-candidate matching
(`party_company_candidates`) are DDL-only in v1; their precision gates (#9
collision+person-FP, #10 lineage precision, #11 citation precision) must pass
before exposure (JUDICIAL_CASES_NOTES.md "Load scope split"; JUDICIAL_DECISION_
REVIEW.md gate items 9–11).

**Assumption:** ICCJ/CCR/HUDOC/just.ro raw artifacts are NOT yet product-
facing; they should stay behind tranche approvals until live writes to serving
are authorized (consistent with the task's "Known gaps" and the notes' "keep
ICCJ and new sources behind tranche approvals").

**Assumption:** Some `object`/`solution`/`solution_summary` text may contain
person names (it mirrors portal.just.ro procedural text). This is a tier-2
warning, recorded as counts, not redacted in metadata (JUDICIAL_CASES_NOTES.md
"Privacy posture (AC-P, metadata-only)"). UX must treat these fields as
potentially containing incidental personal data and avoid surfacing them in
ways that enable person search.

## 7. Core Entities and Relationships

- **Court** (`justice.courts`) — the hub for court-caseload analytics. Has a
  level (judecătorie/tribunal/tribunal_militar/curte_de_apel/curte_militara_
  apel), locality, county, and parent court. **ICCJ is NOT a court row.**
- **Case** (`justice.cases`) — belongs to one court; has a case number
  (`NNNN/CC/YYYY`, middle segment = originating-court code), stage, category,
  department, object text, opened/modified timestamps. Natural key
  `(institution, case_number)`.
- **Hearing** (`justice.case_hearings`) — belongs to a case; hearing date,
  panel, solution text, pronouncement date, document number/date.
- **Appeal** (`justice.case_appeals`) — belongs to a case; appeal declared
  date, appeal type.
- **Party** (`justice.case_parties`) — belongs to a case; has a
  `party_kind`, a controlled `role_normalized`, and optionally a `name_key_id`
  pointing to a publishable company/public name. **Persons have no
  resolvable name in serving.**
- **Party Name Key** (`justice.party_name_keys`) — the dictionary of
  publishable company/public names; the only place a displayable party name
  lives. Has `mention_count` (how many case_parties reference it).
- **Party Company Candidate** (`justice.party_company_candidates`, gated) —
  links a name key to a candidate CUI with method, confidence tier, and
  validation status. NOT an identity claim.
- **Legal Reference** (`justice.case_legal_references`, gated) — a citation
  extracted from case text, resolved (unique/ambiguous/unresolved) to a
  `legal.acts` row.
- **Lineage Candidate** (`justice.case_lineage_candidates`, gated) — an
  inferred edge between two cases (appeal / old_number / same-dossier-cross-
  institution).

**Relationship diagram (serving, simplified):**

```
core.territories (county) ──< justice.courts ──< justice.cases
                                                       │
                          ┌────────────────────────────┼──────────────────────────┐
                          ▼                            ▼                          ▼
                justice.case_hearings        justice.case_appeals      justice.case_parties
                                                                       (party_kind, role)
                                                                               │ name_key_id (nullable)
                                                                               ▼
                                                                  justice.party_name_keys
                                                                  (publishable company/public only)
                                                                               │ candidate (gated)
                                                                               ▼
                                                                  justice.party_company_candidates
                                                                  ──(candidate_cui)──> companies / core

 justice.case_legal_references ──(target_act_id)──> legal.acts
 justice.case_lineage_candidates ──(from/to case_id)──> justice.cases
```

## 8. Recommended User Journeys

Each journey progresses **overview → detail → insight**.

### Journey A — Casual public user (company/institution in court)

1. **Overview:** Lands on a company or public-entity profile (existing
   `/companies/$cui` or `/entities/$cui`) and sees a "Litigii" (Litigation)
   slice with a headline count: "X cauze în instanță" and a privacy note.
2. **Detail:** Opens the litigation slice — a list of cases where the
   entity appears as a party (company/public kind only), with court, case
   number, stage, category, latest hearing date, and role. Clicks a case →
   a case-detail view (public/non-person entities) showing hearings,
   appeals, object/solution text, and cited laws.
3. **Insight:** Sees a small summary — "most frequent courts", "case
   categories", "year trend" — and a link to cross-domain context
   (procurement contracts, budget) for the same entity.

### Journey B — Journalist/analyst/NGO (court & litigant investigation)

1. **Overview:** Lands on the Justice landing page — top-level stats
   (courts, cases, time range), a court selector, and a "company/public
   litigant" search.
2. **Detail:** Opens a **court caseload analytics** page for a chosen court
   — case volume by year/category/stage, appeal rate, top company/public
   litigants (from the publishable dictionary). Drills into a case category
   or a specific frequent litigant.
3. **Insight:** Cross-references a frequent litigant with its procurement
   awards (procurement module) and PNRR/budget facts; exports a filtered
   cohort for further analysis; uses MCP/GraphQL tooling for programmatic
   follow-up.

### Journey C — Domain expert (case & legal-reference exploration)

1. **Overview:** Uses the case-search/listing with precise filters (court,
   case number, stage, category, year, party kind) and a legal-reference
   explorer.
2. **Detail:** Opens a specific case by case number — full hearing timeline,
   appeal list, party roles (companies/public named; persons shown as counts
   by role), and extracted legal citations with resolution status
   (unique/ambiguous/unresolved).
3. **Insight:** Follows an appeal-chain (lineage candidate, when green) to
   see the dossier across court tiers; jumps to the cited `legal.acts` page;
   verifies lineage confidence and citation precision metadata.

## 9. Recommended Information Architecture

- **Landing page** (`/justitie` or `/justice`) — domain overview, scope &
  coverage honesty (years, tiers, ICCJ absence), top courts, entry points to
  search and court analytics.
- **Search/listing** — case search by court, case number, stage, category,
  year, party kind; company/public litigant lookup via the publishable name
  dictionary.
- **Entity detail (litigation slice)** — a "Litigii" tab/section on existing
  company (`/companies/$cui`) and entity (`/entities/$cui`) profiles,
  reusing the established entity-profile pattern (the client already has
  entity views like `ContractsView`, `Commitments`, `EntityFinancialSummary`).
- **Court detail / court caseload analytics** — a court-scoped analytics
  page per `institution_code`.
- **Case detail** — a page for a single case, shown for public/non-person
  entity contexts; persons are never the entry point and never named.
- **Comparison / dashboards** — court-vs-court and litigant cohort
  comparisons; system-level dashboards (caseload over time, appeal rates).
- **Cross-domain related links** — from cases/parties to companies,
  procurement, PNRR, budget, and `legal.acts`; from `legal.acts` back to
  citing cases (when the legal-reference lane is green).

## 10. Recommended Pages

**Recommendation (concrete page list):**

1. **Justice landing page** (`/justitie`)
   - Primary content: total cases/hearings/courts, coverage statement
     (dense 2021+, no ICCJ, no case documents — metadata only), court-tier
     breakdown, top courts by volume, entry search box, and a clearly worded
     privacy/availability notice.
2. **Company-litigation slice** (on `/companies/$cui` and `/entities/$cui`)
   - Primary content: headline case count for the entity as a party; list of
     cases (court, number, stage, category, latest hearing, role); mini
     summary (top courts, categories, year trend); confidence label that this
     is name-matched (candidate) once `party_company_candidates` is live;
     cross-links to procurement/budget for the same CUI.
   - **Recommendation:** This is the highest-value, lowest-risk first surface
     because it rides on existing entity profiles and the privacy model is
     already enforced at the matching surface.
3. **Court caseload analytics page** (`/justitie/instante/$institutionCode`)
   - Primary content: court identity (level, locality, county, parent),
     case volume by year/category/stage, appeal rate, hearing/solution
     distribution, top company/public litigants (publishable dictionary),
     coverage honesty for that court.
4. **Case detail page** (`/justitie/cauze/$caseId`) — public/non-person
   contexts only
   - Primary content: case header (court, number, stage, category, object),
     hearing timeline, appeals, party list (companies/public named with
     roles; persons shown as "N persoane fizice" by role, never named),
     legal references (with resolution status), lineage candidates (when
     green, with confidence), and source/coverage provenance.
5. **Legal-reference exploration page** (on the legal domain, cross-linked)
   - Primary content: for a `legal.acts` row, show citing cases (count +
     sample) once `case_legal_references` is populated; resolution-status
     breakdown.
6. **Court directory / hierarchy page** (`/justitie/instante`)
   - Primary content: the 246 courts grouped by level and county, with
     parent links and case counts; explicit "ICCJ neinclus" notice.

## 11. Recommended Filters and Search

**Searchable (plain language):**

- Company/public-entity litigant by name (via the publishable
  `party_name_keys` dictionary — 745,538 names).
- Case by case number (`NNNN/CC/YYYY`) and `case_number_old`.
- Court by name, locality, county, or level.

**Filterable:**

- Court / court tier (judecătorie, tribunal, curte de apel, militar).
- Case category (11 distinct), stage (17 distinct), department (316
  distinct) — **Fact:** cardinalities from JUDICIAL_DATA_VALIDATION.md §4.
- Year / date range (opened, latest modified); with an explicit coverage
  caveat for pre-2021.
- Party kind (company / public_entity) and party role (`role_normalized`
  controlled vocabulary — Pârât, Reclamant, Intimat, Petent, Inculpat,
  Contestator, Parte civilă, Intervenient, Debitor, Creditor, etc.).
- Appeal presence/type.
- Legal-reference resolution status (unique/ambiguous/unresolved) — when the
  lane is live.

**Reserved as advanced functionality:**

- Full-text search over `object`/`solution`/`solution_summary` — **Fact:**
  these fields can contain incidental person names; full-text indexing of
  them would risk person re-identification via search. Reserve for an
  explicit privacy-reviewed search lane, not v1.
- Person-name search — **not offered**, by policy.
- Cross-court appeal-chain traversal — only when `case_lineage_candidates`
  precision is green.

## 12. Recommended Visualizations

**Plain-language, MVP-appropriate:**

- **Headline counts** with coverage context ("6,3M cauze • date dense din
  2021 • fără ICCJ").
- **Cases-over-time** line/area chart per court and per category (year on
  x-axis; honest thinning before 2021).
- **Court-tier distribution** (judecătorii/tribunale/curți de apel/militare)
  as a simple breakdown.
- **Case category & stage breakdowns** as horizontal bars with counts.
- **Top company/public litigants** (publishable dictionary) as a ranked bar
  list with mention counts and a "name-match candidate" confidence label.
- **Hearing timeline** per case (vertical timeline of hearing dates +
  solution summaries).
- **Appeal-rate** indicator per court/category.

**Advanced (gated/when data ready):**

- **Appeal-chain graph** (case → case across tiers) when lineage candidates
  are green; render with confidence/method metadata.
- **Court heatmap** by county (cases per 1k population, when INS territory
  stats are joined).
- **Legal-act citation network** (acts ↔ cases) when `case_legal_references`
  is populated.
- **Litigation vs. procurement/PNRR** correlation scatter for a company
  cohort (cross-domain).

## 13. MVP Features

> For each: **user problem**, **expected user value**, **required data**,
> **recommended UX pattern**, **priority rationale**.

1. **Company-litigation slice on entity/company profiles**
   - User problem: "Is this company/public entity involved in court cases,
     and how much?"
   - Expected user value: Immediate, contextual due-diligence on a familiar
     profile page; high signal, low privacy risk.
   - Required data: `justice.case_parties` + `justice.party_name_keys`
     (publishable) + `justice.cases` + `party_company_candidates` (when live,
     with confidence) + existing `companies`/`core` identity.
   - Recommended UX pattern: A "Litigii" section/tab on the existing entity
     profile, mirroring the existing `ContractsView` pattern. Headline count
     + paginated case list + mini summary (top courts, categories, year
     trend). Confidence label once candidates are live; until then, show
     cases only for matches resolved via a reviewed/published path.
   - Priority rationale: Highest value-to-risk ratio; reuses existing
     profile infrastructure; privacy enforced structurally at the matching
     surface; aligns with the `get_company_litigation` MCP tool that already
     exists.

2. **Court caseload analytics page**
   - User problem: "How busy is this court, and what kind of cases does it
     handle?"
   - Expected user value: System-level judiciary transparency currently
     unavailable to the public.
   - Required data: `justice.courts` (246) + `justice.cases` aggregates +
     `justice.case_hearings`/`case_appeals` counts.
   - Recommended UX pattern: A per-court page with cases-over-time, category
     & stage breakdowns, appeal rate, and top publishable litigants. Court
     selector + directory.
   - Priority rationale: Uses only already-populated, non-privacy-sensitive
     metadata; high public value; aligns with `get_court_caseload` MCP tool.

3. **Case detail page (public/non-person entities)**
   - User problem: "What is this case about — its hearings, appeals, and
     cited laws?"
   - Expected user value: Lets users follow a specific dossier without
     exposing individuals.
   - Required data: `justice.cases` + `case_hearings` + `case_appeals` +
     `case_parties` (company/public named; persons as counts by role) +
     `case_legal_references` (when live).
   - Recommended UX pattern: Case header + hearing timeline + appeals + party
     list (with explicit "N persoane fizice — nume necomunicate" rows) +
     legal references with resolution status + provenance/coverage footer.
   - Priority rationale: Completes the overview→detail journey; privacy
     model is clear and enforceable; aligns with `get_judicial_case` MCP
     tool.

4. **Justice landing page + coverage/privacy honesty**
   - User problem: "What can I actually see here, and what is missing or
     withheld, and why?"
   - Expected user value: Trust through transparency about coverage and
     privacy policy.
   - Required data: Aggregate counts + coverage facts (years, tiers, ICCJ
     absence, no documents) + privacy policy statement.
   - Recommended UX pattern: Hero stats + coverage callout + privacy notice
     + entry search + court directory link.
   - Priority rationale: Sets honest expectations; reduces misinterpretation
     and privacy complaints; required for any public-facing justice surface.

5. **Case search/listing (metadata filters)**
   - User problem: "Find cases by court, number, stage, category, year,
     party kind/role."
   - Expected user value: Targeted exploration without person search.
   - Required data: `justice.cases` + `justice.courts` + `case_parties`
     (kinds/roles only).
   - Recommended UX pattern: Faceted filter bar (court, tier, category,
     stage, year, party kind, role) + results table + sort; no person-name
     field.
   - Priority rationale: Core navigation for analysts/experts; uses only
     safe fields; aligns with `resolve_judicial_filters` MCP tool.

### High-value next features

6. **Top company/public litigant rankings (court- & county-scoped)**
   - User problem: "Who are the most frequent litigants here?"
   - Expected user value: Investigative leverage for journalists/watchdogs.
   - Required data: `party_name_keys` (publishable, with `mention_count`) +
     `case_parties` + `courts`/territory.
   - Recommended UX pattern: Ranked bar list scoped to a court/county/
     category, with mention counts and a "name-match candidate" label.
   - Priority rationale: High public value once the publishable dictionary
     is understood; still no person exposure.

7. **Legal-reference exploration (case ↔ legal.acts)**
   - User problem: "Which laws are cited in this case / which cases cite this
     law?"
   - Expected user value: Connects jurisprudence to legislation.
   - Required data: `case_legal_references` (gated — needs citation
     precision gate #11 green) + `legal.acts`.
   - Recommended UX pattern: On the case page, a "Acte citate" section with
     resolution status; on the legal-act page, a "Cazuri care citează"
     count + sample.
   - Priority rationale: Gated by data precision; ship once the gate passes;
     aligns with `get_case_legal_references` MCP tool.

## 14. Advanced Features

> Same per-feature fields.

1. **Appeal-chain / case-lineage traversal**
   - User problem: "Follow a dossier across court tiers."
   - Expected user value: Understanding of how a case moves through the
     system; outcome tracking.
   - Required data: `case_lineage_candidates` (gated — needs lineage
     precision gate #10 green, incl. the 757k non-standard-number tail).
   - Recommended UX pattern: A lineage graph/timeline on the case page with
     confidence, method, and validation_status labels; clear "inferat"
     (inferred) labeling, never asserted as fact.
   - Priority rationale: Strong signal (~1M shared dossier numbers) but
     precision-gated; must render nothing until the sample is green
     (JUDICIAL_DECISION_REVIEW.md verdict 7).

2. **Company litigant auto-matching & identity confidence display**
   - User problem: "Are these case-party companies the same as the
     registered companies?"
   - Expected user value: Confident cross-domain due diligence.
   - Required data: `party_company_candidates` (gated — needs collision-rate
     + person-FP audit gate #9 green) + `companies`/`core`.
   - Recommended UX pattern: Confidence tier (A/B/C/D) + method badge on each
     matched litigant; analyst worklist/review surface; no auto-publish in v1
     (only candidate/needs_review/rejected).
   - Priority rationale: The publication fork is a separate, later
     user decision; even 99% precision means 10³–10⁴ wrong cases at scale
     (JUDICIAL_DECISION_REVIEW.md verdict 4). Must not auto-assert identity.

3. **Court-system dashboards (cross-court comparison)**
   - User problem: "Compare courts; find outliers."
   - Expected user value: System-wide judiciary oversight.
   - Required data: `justice.cases`/`case_hearings`/`case_appeals` aggregates
     + `core.territories` + (optionally) INS population for per-capita.
   - Recommended UX pattern: Multi-court comparison table + county heatmap +
     outlier flags.
   - Priority rationale: Power-user analytics; safe metadata only.

4. **Litigation × procurement/PNRR/budget correlation**
   - User problem: "Does litigation correlate with public-money awards for
     this company?"
   - Expected user value: Integrated integrity picture.
   - Required data: `party_company_candidates` (gated) + `procurement` +
     `pnrr` + `budget` + `flows.money_flows`.
   - Recommended UX pattern: On a company profile, a combined "Activitate
     publică" panel linking litigation, contracts, and payments.
   - Priority rationale: High value but depends on the company-candidate
     matching gate.

5. **ICCJ/CCR/HUDOC full-text integration**
   - User problem: "Read supreme-court / constitutional / ECHR decisions
     related to a case or topic."
   - Expected user value: Closes the ICCJ gap; adds authoritative full text.
   - Required data: ICCJ/CCR/HUDOC raw artifacts (content-addressed, already
     captured) promoted to serving behind a tranche approval.
   - Recommended UX pattern: A separate, clearly labeled source section with
     document viewer; never merged into `justice.cases` without an explicit
     lineage resolver.
   - Priority rationale: Explicitly gated until live writes are authorized
     (task "Known gaps"; JUDICIAL_CASES_NOTES.md "Open follow-ups").

6. **Scheduled worker deployment for artifact lanes**
   - User problem: "Keep ICCJ/CCR/HUDOC/just.ro current without manual
     runs."
   - Expected user value: Freshness for advanced sources.
   - Required data: k8s CronJob / compose worker image with the new lanes.
   - Recommended UX pattern: Operational (not user-facing) — surface only as
     a freshness/coverage indicator on the relevant pages.
   - Priority rationale: Operational prerequisite for feature 5; documented
     periodic re-run is the current v1 sync.

## 15. UX Risks and Edge Cases

- **Privacy exposure / re-identification of individuals (BIGGEST RISK).**
  - **Fact:** ~54–55% of party mentions are persons; serving name-nulled them
    by structural default-deny. BUT `object`/`solution`/`solution_summary`
    text can contain incidental person names (it mirrors portal.just.ro).
  - **Recommendation:** Never offer person-name search. Render person parties
    as counts by role ("PÂRÂT: 2 persoane fizice — nume necomunicate").
    Avoid full-text search over case text until a privacy-reviewed lane
    exists. Treat the `party_name_keys` dictionary as the ONLY name surface,
    and gate any UI feature that could join text fields back to persons.
- **False company identity from name-only matching.**
  - **Fact:** No CUI in the judicial source; company links are name-only
    candidates.
  - **Recommendation:** Always label matched litigants as candidates with
    confidence tier/method; never assert "this case belongs to company X"
    as fact until a reviewed/published path exists. Even high-precision
    matches produce 10³–10⁴ wrong cases at scale — communicate this.
- **Coverage misinterpretation.**
  - **Fact:** Dense 2021+; ICCJ absent; no case documents; pre-2013-05
    unreachable.
  - **Recommendation:** Show coverage context on every justice page (year
    range, tier coverage, "fără ICCJ", "doar metadata, fără documente de
    dosar"). Never present an empty result as "no cases exist" — it may mean
    "not covered".
- **Appeal-chain misrouting.**
  - **Fact:** 757k non-standard case numbers; appeal chains are inferred, not
    source-given; court-code semantics unverified for the tail.
  - **Recommendation:** Render lineage as "inferat" with confidence until the
    precision gate is green; never auto-link chains as fact in v1.
- **Stale data / mutation norm.**
  - **Fact:** Cases mutate for years (gain hearings/solutions); snapshots
    exist; sync is watermark-incremental on `latest_source_modified_at` (and
    a separate parties watermark).
  - **Recommendation:** Show "ultima actualizare" timestamps and a
    "date actualizate la" indicator; don't imply real-time.
- **Mismatched court/entity identity across domains.**
  - **Fact:** Cross-domain links use candidate/evidence tables, not hard FKs.
  - **Recommendation:** Use explicit "legătură candidat" labels and
    provenance evidence on cross-links; don't silently merge.
- **Search-index leak of personal data.**
  - **Fact:** A careless search-docs lane could put persons' litigation into
    Meilisearch — the slice's "only unrecoverable reputational mistake"
    (JUDICIAL_DECISION_REVIEW.md top risk #3).
  - **Recommendation:** The serving privacy invariant must be respected by
    any search projection; UX should never bypass the structural gate. If a
    justice search projection is built, it must include ONLY publishable
    company/public name keys and metadata, never person/unknown rows or raw
    text.
- **ICCJ expectation gap.**
  - **Recommendation:** Whenever a user might expect supreme-court coverage
    (appeal chain top, "curtea supremă"), show the "ICCJ neinclus din această
    sursă" notice prominently.

## 16. Open Questions

1. **Publication fork for company litigation:** at which precision threshold
   and confidence tier should a company-litigation slice show cases on a
   public company profile, and who approves publication? (Depends on gate #9
   collision + person-FP audit.)
2. **Person-name display policy:** keep the default name-nulled posture, or
   allow source-parity display (portal.just.ro shows persons) under a
   separate access policy? This is a user/legal decision; the schema is
   invariant to the answer.
3. **Legal-reference exposure:** is the citation precision gate (#11) green
   enough to show case-volume on `legal.acts` pages, and at which resolution
   status (unique only, or also ambiguous with a warning)?
4. **ICCJ/CCR/HUDOC product shape:** should these be a separate "Jurispru-
   dență" product area, or merged into case pages once an ICCJ↔ECRIS lineage
   resolver exists? When are live writes to serving authorized?
5. **Search projection scope:** should `justice` participate in global search
   (`search.documents`) at all in v1, and if so, restricted to which
   publishable fields to guarantee no person leak?
6. **Coverage messaging granularity:** per-court coverage statements vs.
   system-wide — which does the user need to interpret a zero-result?
7. **Cadence/display of mutations:** how should long-running case updates be
   communicated (last-modified stamps, "în curs" indicators) without
   implying real-time?
8. **Cross-domain entity merge UX:** how should the UI present
   candidate-evidence links between a judicial party and a company/entity
   without implying verified identity?

## 17. Final Recommendation

- **Best starting point:** A **company-litigation slice on existing
  company/entity profiles** (`/companies/$cui`, `/entities/$cui`), reusing
  the established entity-profile view pattern. It delivers the highest
  public value at the lowest privacy risk, rides on infrastructure that
  already exists in the client, and aligns with the existing
  `get_company_litigation` MCP tool and the structural privacy invariant.
- **Highest-value user journey:** Journey B (journalist/analyst/NGO) — court
  caseload analytics → frequent publishable litigants → cross-domain
  correlation with procurement/PNRR/budget — because it extracts the most
  accountability value from already-populated, privacy-safe metadata.
- **Most important MVP feature:** The **company-litigation slice** (MVP #1),
  immediately followed by the **court caseload analytics page** (MVP #2) and
  the **case detail page for public/non-person entities** (MVP #3), all
  under a **justice landing page with explicit coverage + privacy honesty**
  (MVP #4).
- **Biggest UX risk:** **Privacy exposure / re-identification of
  individuals** — both via the ~54–55% person party mentions and via
  incidental person names in `object`/`solution`/`solution_summary` text
  and any search projection. Mitigate by: no person search; persons shown
  only as role-counts; the `party_name_keys` dictionary as the sole name
  surface; no full-text search over case text without a privacy-reviewed
  lane; and a search projection that includes only publishable company/
  public keys.
- **Biggest data dependency:** The **gated derive lanes**
  (`party_company_candidates`, `case_legal_references`,
  `case_lineage_candidates`) — their precision gates (#9, #10, #11) must
  pass before company auto-matching, legal-reference exploration, and
  appeal-chain traversal can ship. Until then, the MVP uses only the
  populated, privacy-safe metadata + publishable name dictionary.
- **Top open questions:** (1) the publication fork threshold/tier for
  showing cases on company profiles; (2) the person-name display policy
  (default name-nulled vs. source-parity under a separate policy); and (3)
  whether `justice` participates in global search in v1, and with which
  publishable-only fields to guarantee no person leak.

## Design Handoff Notes (added in review)

- **Canonical route assumption:** company/public-entity litigation appears first on `/companies/$cui` and `/entities/$cui`; `/justitie` hosts court, case, and coverage exploration.
- **Shared components to reuse/build:** PrivacyBoundaryNotice, IdentityConfidenceBadge, CoverageRibbon, FreshnessBadge, EvidenceViewer / SourceProvenanceDrawer, CaseTimeline, EntityRelatedLinks rail.
- **First screen to design:** the `Litigii` entity slice: headline case count, privacy notice, cases list, top courts/categories/year trend, and clear "persons not shown" rows.
- **Copy guardrail:** zero-result states must say "no covered/publishable cases found" rather than "no cases exist" when coverage or privacy gates may explain absence.
- **Product-owner question:** confirm whether justice joins global search in v1, and if so restrict it to courts, case numbers, and publishable company/public name keys only.
