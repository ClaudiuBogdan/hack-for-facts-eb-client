# Domain: Public Companies / State-Owned Enterprises (Întreprinderi Publice)

## Review changelog (2026-06-26)

- **Recommendation:** Clarified the hybrid route assumption: `/intreprinderi-publice/$cui` is the domain-first profile, with `/entities/$cui` kept as the shared CUI rail.
- **Recommendation:** Added design handoff notes for the Enterprise Profile as the first screen and for ratio/KPI labeling before chart design.
- **Assumption:** Supplemental lanes can appear as hidden or "coming soon" tabs only when the route has a clear empty-state policy.

> UX/product research documentation for the `public-companies` domain (slug:
> `public-companies`). This document is UX/product guidance only — it does not
> implement code or modify the application. Facts are grounded in the scraper
> project (the main source of truth), its data inventory, domain notes, source
> code, and migrations. Assumptions and recommendations are labelled inline.
>
> Source of truth: `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-scrapper`
> (data inventory, `PUBLIC_COMPANIES_*.md` notes, `src/src/sources/public-companies/*`,
> `src/src/db/prod-migrations/*public_enterprises*`, `src/package.json`).
> Client alignment reference: `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client`
> (read-only — no code changes).

---

## 1. Domain Summary

The Public Companies / State-Owned Enterprises (Întreprinderi Publice) domain
covers Romanian state-owned and public enterprises, centered on **AMEPIP**
(Autoritatea pentru Monitorizarea și Enforcement-ul Patrimoniului Public) under
OUG 109/2011. It is one of the platform's strongest lineage domains: every
serving fact is snapshot-scoped and chains back to a retrievable source workbook,
PDF, or HTML page.

Fact: The scraper-side path for the **AMEPIP core** lane is complete and
validated in production. Raw DB `transparenta_eu_public_companies` → serving
schema `public_enterprises` → current read-model views → search projection
(`search.documents` `doc_type = 'public_enterprise'`) are all live. Verified
counts: `213,680` indicator values, `6,886` enterprise-year rows, `1,342` distinct
CUIs, `43` KPI dictionary entries, `4,044` form groups, `2,494` company links,
weekly hash-poll CronJob active.

Fact: Five supplemental lanes were built "local-green" (code + migrations + tests)
but are **deploy-gated** and not yet promoted to production serving per the
2026-06-25 hardening runbook ("PC-3 deploy blocker on s1001/json_apt/sanctions").
These are: (2) controlling authority (S1001 + `json_apt`), (4) RegAS state aid,
(5) BVB market listings/reports, (6) AMEPIP sanctions/enforcement, and (7) the
governance-document PDF corpus (URL index only — binaries not yet downloaded).

Fact: There is **no dedicated downstream surface** for this domain. No server
module, no GraphQL slice, no MCP tool, no dedicated client route. The only
client-facing behaviour today is that global entity search routes
`public_enterprise` hits to the generic budget-centric `/entities/$cui` page,
labeled "Companie de stat".

Recommendation: Treat this as a **greenfield product opportunity** built on
already-validated data. The data foundation is unusually mature relative to the
(non-existent) product surface — the highest-leverage work is UX/IA design and a
dedicated client route, not more scraping.

---

## 2. Public Value

State-owned enterprises manage large amounts of public money and public
patrimony, yet their financial/governance performance is hard for ordinary
citizens to find and interpret. AMEPIP publishes it, but as a dense multi-sheet
XLSX with 43 KPIs across hundreds of companies — unusable without translation.

The public value of a Transparenta.eu product for this domain is to:

- **Make SOE performance legible**: turn 213,680 raw indicator values into
  plain-language, per-company, per-year explanations ("How profitable was
  Hidroelectrica in 2023? Is this SOE's market share growing or shrinking?").
- **Reveal ownership and accountability**: show *who controls* each enterprise
  (central ministry vs. local council vs. county council), so a citizen can trace
  an SOE back to the public authority answerable for it.
- **Surface enforcement and governance evidence**: show whether AMEPIP has
  sanctioned an enterprise or its tutelary authority, and link to governance
  documents (letters of expectation, selection procedures, final reports).
- **Connect money and markets**: link SOEs to state aid received (RegAS), BVB
  market listings/reports (for the 19 listed SOEs), budget allocations of their
  controlling authorities, and procurement they award or receive.
- **Preserve trust through traceability**: every fact carries source lineage
  (workbook SHA-256, source URL, snapshot id, accepted-at) so users can verify
  any number against the official source.

Fact: AMEPIP data is published under **CC-BY-4.0**, so it can be redistributed
and adapted with attribution — a strong foundation for a public product.

Assumption: A meaningful share of public interest in this domain comes from the
~19 listed SOEs (Hidroelectrica, Romgaz, Nuclearelectrica, Transgaz,
Transelectrica, etc.) and the large central SOEs (CNH, Nuclearelectrica, etc.),
which are politically and economically salient.

---

## 3. Target Users

### Casual public users
Citizens, students, and engaged voters who hear an SOE name in the news and want
to understand what it is, who controls it, and whether it is doing well. They
have no financial training and will not read a 43-KPI spreadsheet. They need
plain language, one-screen summaries, and a clear "who is responsible" answer.

### Journalists, analysts, NGOs, researchers, watchdogs
Investigative journalists, FOIA/advocacy NGOs (e.g. CA 140, Funky Citizens),
academic researchers, and fiscal-watchdog analysts. They want to compare SOEs,
track indicators over time, find outliers, cite exact source evidence, and export
data. They are the highest-value recurring users and the most demanding about
provenance and data quality.

### Domain experts (public administration, finance, BVB watchers)
Public-administration professionals, Ministry of Finance / AMEPIP-adjacent
analysts, energy-sector specialists, and capital-market watchers. They
understand OUG 109/2011, know what ROA/ROE/EBITDA mean, read BVB filings, and
care about state-aid schemes, sanctions under specific OUG articles, and
central-vs-local subordination. They want depth, exact KPI codes, and links to
primary documents.

---

## 4. Key User Questions

### Questions the product should answer immediately

- What is this state-owned enterprise? (name, CUI, CAEN, registration number,
  AMEPIP status, ticker if listed)
- Who controls it? (tutelary public authority, central vs. local, county,
  authority CUI) — Fact: available via S1001/json_apt lane (deploy-gated)
- How has it performed on the key indicators over the last few years? (a small
  set of headline KPIs as a time series)
- Is it listed on BVB? What is its ticker/ISIN and latest market indicators?
  — Fact: available via BVB lane (deploy-gated, 19 tickers)
- Has AMEPIP sanctioned it or its authority? — Fact: available via sanctions lane
  (deploy-gated, 34 ÎP + 6 APT rows)
- Has it received state aid? From whom, how much, under which scheme? — Fact:
  available via RegAS lane (deploy-gated)
- Where does this number come from? (source workbook, snapshot date, official URL)
- How does it compare to peer SOEs? (same CAEN, same authority, same county)

### Questions requiring deeper analysis

- Which SOEs are the best/worst performers on profitability, efficiency, or
  market share across the whole universe?
- Which central authorities oversee the most SOEs and the most public money
  through them?
- Which SOEs have a deteriorating trend (e.g. declining ROA, rising debt ratio)
  over multiple years?
- Are there SOEs that appear in AMEPIP but have no matching record in the
  companies (ONRC/ANAF) registry, or whose AMEPIP status conflicts with ONRC
  lifecycle status? — Fact: `company_links.link_status` captures this
- How much state aid is concentrated in a sector, county, or authority?
- For listed SOEs, do AMEPIP governance KPIs correlate with BVB market
  indicators (P/E, market cap)?
- Which SOEs have open AMEPIP sanctions, and are they recurring?
- What governance documents exist for an SOE, and what do they reveal about
  board selection and letters of expectation? — Fact: only the document URL
  index exists today; PDF text is a future lane

---

## 5. Available Data

All counts below are from the scraper inventory (2026-06-25) and domain notes.
The AMEPIP core lane is live and validated; supplemental lanes are built but
deploy-gated unless noted.

### AMEPIP core (Lane 1) — LIVE, validated in prod
Fact: Source is the AMEPIP CKAN XLSX "Indicatori financiari, nefinanciari si de
guvernanta corporativa - ian 2026", CC-BY-4.0, ~1.5 MB, weekly hash-poll.

Serving tables in `public_enterprises.*` (current accepted snapshot only):
- `enterprise_years` (~6,886 rows): `cui`, `year` (2019–2024 calculated,
  2019–2025 form), `company_id`, `company_name`, `registration_number`,
  `caen_onrc`, `caen_bilant`, `amepip_status`, `ticker_symbol`,
  `indicator_count`. 1,342 distinct CUIs.
- `indicator_dictionary` (43 rows): `indicator_key`, `kpi_code` (nullable),
  `kpi_id`, `indicator_name`, `measure_unit`, `source_sheet`, `source_header`.
- `indicator_values` (213,680 rows): `cui`, `year`, `source_sheet`
  (`calculated` | `form`), `version`, `indicator_key`, `kpi_code`, `raw_value`,
  `numeric_value`, `boolean_value`, `value_kind` (`number` | `boolean` | `text`
  | `empty`), `warnings`.
- `form_groups` (4,044 rows): merged corporate-governance form rows per
  `cui + year + version`, with `transmitted_at`, `merged_payload`, `merge_status`
  (`merged` | `conflict`).
- `company_links` (2,494 rows): `cui`, `registry` (`companies` |
  `public_entities`), `registry_cui`, `link_status` (`matched` | `missing` |
  `ambiguous` | `not_checked`), `evidence`.
- `source_snapshots` / current views: `snapshot_id`, `raw_snapshot_id`,
  `workbook_sha256`, `workbook_bytes`, `source_url`, `ckan_last_modified`,
  `loaded_at`, `accepted_at`. Current snapshot:
  `amepip-core-3a44f2c099fb711c`.
- Search projection: `search.documents` `doc_type = 'public_enterprise'`
  (6,886 docs in Meilisearch + OpenSearch index `unified_public_enterprises`).

Lineage columns: `snapshot_id`, `raw_snapshot_id`, `workbook_sha256`,
`source_url`, `object_id`, `object_key`, `content_sha256`, `source_row_number`,
`source_row_hash`, plus a `public_enterprises.source_traceability` view.

### Controlling authority (Lane 2) — built, deploy-gated
Fact: S1001 "Lista unică a ÎP" (ANAF static PDF, ~1,773 rows: 366 central + 1,407
local) + AMEPIP `json_apt` inline JSON (1,312 records, 524 IP CUIs).

Serving `public_enterprises.controlling_authorities`: `cui`, `apt_cui`,
`apt_name`, `subordination` (`central` | `local`), `apt_type_id` (1=central
ministry, 2=central agency, 3=local council, 4=county council, 5=inter-community
association), `county`, `county_abbr`, `enterprise_name`, `enterprise_status`,
`enterprise_status_descriptive` (Faliment/Lichidare/Reorganizare/Operativa),
`list_class` (A–F flags), `media_doc_count`, `from_s1001`, `from_json_apt`,
`source_url`, `s1001_object_id`. Plus `controlling_authority_links` (APT CUI →
`core.public_entities`). Inventory `pg_stat` shows ~3,060 authority_links.

### BVB market (Lane 5) — built, deploy-gated
Fact: 19 tickered SOEs; ticker→CUI seed already in raw AMEPIP `ticker_symbol`.

Serving `public_enterprises.market_listings`: `cui`, `ticker`, `isin`,
`market_segment`, `instrument_type`, `company_name`, `bvb_status`,
`total_shares`, `indicators` (jsonb: market cap, P/E, P/BV, EPS,
dividend/yield), `detail_source_url` (m.bvb.ro issuer page).
`market_reports`: `cui`, `ticker`, `report_title`, `report_url`, `report_date`,
`file_name`, `object_id`, `content_sha256`, `byte_size`, `download_status`
(`listed` | `downloaded` | `deferred` | `failed` | `too_large`). Latest
annual/financial report set scoped (no full historical backfill in v1).

### State aid (Lane 4, RegAS) — built, deploy-gated
Fact: Bounded per-CUI queries over the ~1,342 AMEPIP CUIs against
`regas.consiliulconcurentei.ro` public API.

Serving `public_enterprises.state_aid_awards`: `cui`, `award_key`,
`beneficiary_name`, `caen`, `granted_at`, `measure_name`, `scheme_ref`,
`enterprise_size`, `objective`, `region`, `funded_activities`,
`amount_category` + `amount_category_value`, `amount_subcategory` +
`amount_subcategory_value`, `instrument`, `intensity`, `financier`, `id_masura`,
`pdf_masura`, `source_url`. Assumption: the exact distinct-CUI hit count is to be
reconciled on first live run (experimental captures showed 132 non-empty per-CUI
caches vs 34 aid hits).

### Sanctions / enforcement (Lane 6) — built, deploy-gated
Fact: Two static AMEPIP HTML tables: ÎP sanctions (34 rows, keyed by enterprise
CUI) and APT sanctions (6 rows, keyed by authority CIF). Inventory `pg_stat`
shows ~40 sanction_events.

Serving `public_enterprises.enforcement_actions`: `side` (`ip` | `apt`), `cui`,
`apt_cui`, `enterprise_name`, `apt_name`, `sanction_date`, `legal_basis` (OUG 109
art.), `sanction`, `source_url`, `source_row_number`. Fact: the `responsible`
person/role field is stored **raw-only** (privacy) — there is no person column
in serving.

### Governance documents (Lane 7) — URL index only; PDFs NOT collected
Fact: The `json_apt` blob embeds a `media_apt[]` index of ~2,459 governance PDF
URLs (letters of expectation, selection announcements, selection-plan
composition, final reports), each path embedding `CUI_APT`/`CUI_IP`. Inventory
`pg_stat` shows ~2,230 `governance_documents` (the URL index / `media_apt`
records). **The PDF binaries themselves are not downloaded** — a future
`amepip_governance` lane will fetch and text-extract them. Each path is
deterministic and CUI-keyed.

### Cross-domain linkability (via CUI)
Fact: AMEPIP CUIs link by normalized CUI (1–13 digits, regex `^[0-9]{1,13}$`) to:
- `companies.*` (ONRC/ANAF private-company facts) — absolute financials,
  registration, representatives
- `core.public_entities` / `core.organizations` (public authorities, via APT CUI)
- `budget.*` (budget execution of controlling authorities)
- `procurement.*` (contracts awarded by or to the SOE)
- `flows.money_flows` (cross-domain money flows)

---

## 6. Missing or Uncertain Data

### Missing (not collected)
- **Ownership percentage / shareholding**: no single national register. Fragmented
  across the AMEPIP Power BI dashboard (brittle DAX backend, deferred),
  Ministry of Energy workbooks (stale ~2021, no CUI, name-match only), and SAPE
  portfolio (partial CUI). Precise free-float/state stake for listed SOEs is best
  read from BVB filings (deferred programmatic; BVB lane stores metadata only).
  Fact: this is the single biggest qualitative gap.
- **Governance PDF text/content**: only the URL index exists. Letters of
  expectation, board selection plans, and final reports are listed but not
  downloaded or parsed.
- **Absolute financial statements (bilanț)**: AMEPIP provides ratios/KPIs, not
  absolute balance-sheet values. Recommendation: link to existing
  `companies.financials` (ANAF) rather than re-ingest. MFin matched 1,105/1,342
  AMEPIP CUIs for 2024 — coverage is good but not complete.
- **Pre-2019 historical series**: MFin "Indicatori întreprinderi publice"
  (2013–Q1 2021) and AMEPIP ≤2023 CSV exist but are regression/history sources
  with weak CUI joins; not appended to the current series.
- **Board / administrator rosters and remuneration**: referenced in the AMEPIP
  Power BI and governance PDFs, but not extracted as structured data (privacy
  requires minimization policy first).
- **Real-time / sub-annual data**: AMEPIP is a yearly workbook with weekly
  hash-poll; there is no row-level change feed.

### Uncertain (deploy-gated or to reconcile)
- The supplemental lanes (authority, BVB, RegAS, sanctions, governance) are
  built and local-green but **not promoted to prod serving**. Inventory `pg_stat`
  counts for `authority_links`, `governance_documents`, `sanction_events` may
  reflect raw/index state, not fully promoted serving rows. Assumption: product
  planning should treat these as "available soon after deploy unblock" and design
  the IA to gracefully degrade when a lane is empty.
- RegAS hit count: experimental captures showed 132 non-empty per-CUI caches vs
  34 aid hits — the real distinct-CUI award count must be confirmed on first live
  run.
- BVB report PDF reachability was confirmed from a RO-egress host (m.bvb.ro
  returns 200/application/pdf), but the per-symbol Current-Reports listing HTML
  shape was not fully verified — the exact report set may be partial initially.

### Data quality issues that affect UX
- **Ratios, not absolutes**: AMEPIP indicators are ratios/KPIs (e.g. "Cota de
  piață" = 0.0425). The UI must never present them as absolute financial values.
  Fact: the production flow plan explicitly warns against this.
- **Mixed value kinds**: `value_kind` can be `number`, `boolean`, `text`, or
  `empty`. The UI must render all four sensibly and not crash on empty/text.
- **Nullable KPI code and ticker**: not every indicator has a `kpi_code`; not
  every enterprise has a `ticker`. Filter/search must handle nulls.
- **Invalid/blank year rows** (95): preserved in raw, excluded from
  `enterprise_years`. Some enterprises may have incomplete year coverage.
- **S1001 is broader than AMEPIP** (~1,773 vs 1,342): it includes
  inactive/insolvent enterprises. Non-matches are data-quality flags, not errors.
  The UI should show AMEPIP enterprises as the primary universe and S1001-only
  enterprises as "in the official list but not in the current AMEPIP workbook".
- **Company-link disagreements**: `company_links.link_status` can be `missing`
  (no ONRC/ANAF row), `ambiguous`, or `not_checked`. The UI must surface these
  honestly rather than silently treating AMEPIP identity as canonical ONRC truth.
- **Snapshot freshness**: data is only as current as the last accepted AMEPIP
  snapshot. The UI must show snapshot date/hash so users know the "as-of" date.
- **Sanctions `responsible` field is privacy-gated**: must never be shown in
  serving UI; only the sanction text, date, and legal basis are public.

---

## 7. Core Entities and Relationships

### Primary entity: Public Enterprise (Întreprindere Publică)
- Identity: `cui` (join key), `company_name`, `registration_number`, `company_id`
- Classification: `caen_onrc`, `caen_bilant`, `amepip_status`, `ticker_symbol`
- Time dimension: `year` (2019–2024/2025)
- Facts: a long-form set of `indicator_values` per `cui + year + source_sheet +
  version + indicator_key` (213,680 rows across 43 dictionary indicators)

### Secondary entities
- **Controlling Authority (APT — Autoritate Publică Tutelară)**: `apt_cui`,
  `apt_name`, `subordination` (central/local), `apt_type_id`, `county`. One
  authority → many enterprises. Links to `core.public_entities` by APT CUI.
- **KPI / Indicator**: `indicator_key`, `kpi_code`, `indicator_name`,
  `measure_unit`, `source_sheet`. The dictionary (43 rows) is the controlled
  vocabulary for the 213,680 values.
- **Market Listing** (BVB): `ticker`, `isin`, `market_segment`, `indicators`.
  One-to-one with a tickered enterprise (19 today).
- **Market Report** (BVB): one-to-many per ticker; PDF pointers to annual/
  financial/current reports.
- **State Aid Award** (RegAS): one-to-many per enterprise; `measure_name`,
  `scheme_ref`, `financier`, amount, `granted_at`.
- **Enforcement Action** (sanctions): one-to-many per enterprise (ÎP side) or
  per authority (APT side); `sanction_date`, `legal_basis`, `sanction`.
- **Governance Document**: URL-indexed PDFs (letters of expectation, selection
  procedures, final reports) keyed by `CUI_APT`/`CUI_IP`. Future: downloaded +
  text-extracted.

### Relationships (link, never merge — per source contract)
- Public Enterprise —[CUI]→ `companies.*` (ONRC/ANAF canonical identity &
  financials; link_status evidence)
- Public Enterprise —[APT CUI]→ `core.public_entities` (the controlling
  authority as a budget entity)
- Public Enterprise —[APT CUI]→ `budget.*` (the authority's budget execution)
- Public Enterprise —[CUI]→ `procurement.*` (contracts awarded by or to the SOE)
- Public Enterprise —[CUI]→ `flows.money_flows`
- Public Enterprise —[ticker]→ BVB market listing → market reports
- Public Enterprise —[CUI]→ RegAS state aid awards
- Public Enterprise —[CUI]→ AMEPIP enforcement actions
- Public Enterprise —[CUI_APT/CUI_IP]→ governance document URLs

Fact: The domain explicitly does **not** FK-merge into `companies`,
`source_mfin.public_entities`, or `core.public_entities`. All cross-registry
relations are CUI-based link evidence. This is a hard product constraint: the UI
must present AMEPIP facts as AMEPIP evidence and ONRC/ANAF facts as companies
evidence, with clear provenance labels, never as one merged "truth".

---

## 8. Recommended User Journeys

Each journey progresses **overview → detail → insight**.

### Journey A: Casual public user
1. **Overview**: Lands on the Întreprinderi Publice landing page. Sees a
   plain-language explainer ("What is a state-owned enterprise? OUG 109/2011 in
   one paragraph"), headline stats (1,342 enterprises, 19 listed on BVB, X
   sanctioned this year), and a searchable list.
2. **Detail**: Searches for or clicks an SOE (e.g. Hidroelectrica). Enterprise
   profile shows: what it is, who controls it (Ministry of Energy, central), CAEN,
   status, ticker. A "Performance at a glance" card shows 3–4 headline indicators
   as a small multi-year trend with plain-language labels.
3. **Insight**: A "Why this matters" callout interprets the trend ("Profitability
   rose in 2023 but market share is flat"). A "Who is responsible" link goes to
   the controlling authority's budget page. A "Verify this" link opens the AMEPIP
   source workbook snapshot.

### Journey B: Journalist / analyst / watchdog
1. **Overview**: Lands on the landing page, goes straight to the listing with
   filters (year, CAEN, subordination, county, listed-only, has-sanctions,
   has-state-aid). Sorts by an indicator.
2. **Detail**: Opens an enterprise profile, switches to the "All indicators" tab,
   selects KPIs by code/name, compares years. Opens the "State aid", "Sanctions",
   and "BVB reports" tabs. Copies the source snapshot id and URL for citation.
3. **Insight**: Uses "Compare enterprises" to bench 5 peer SOEs (same CAEN) on
   ROA, debt ratio, and market share over 5 years. Exports the comparison. Spots
   an outlier, opens its governance documents, and cites the AMEPIP source URL in
   a story.

### Journey C: Domain expert (public admin / finance / BVB watcher)
1. **Overview**: Goes to the analytics dashboard. Selects a cut (central vs.
   local, a county, or a CAEN division). Sees aggregate indicator distributions
   and rankings.
2. **Detail**: Drills into an authority's portfolio (all SOEs under one APT),
   reviews each enterprise's full KPI set with exact `kpi_code` and
   `measure_unit`, opens BVB market indicators and the latest annual report PDF.
3. **Insight**: Cross-references state-aid awards with AMEPIP profitability
   trends, checks whether sanctioned enterprises recur in the sanctions
   register, and reads governance PDFs for board-selection evidence. Uses MCP /
  structured API access for programmatic follow-up.

---

## 9. Recommended Information Architecture

### Landing page (`/intreprinderi-publice`)
Fact: The scrapper search projection already emits the URL path
`/intreprinderi-publice/<cui>`. Recommendation: adopt this as the canonical
client route prefix so search deep-links and the product route agree (today the
client routes `public_enterprise` to `/entities/$cui` — see §16).
- Plain-language domain explainer (OUG 109/2011, AMEPIP, what data exists)
- Headline stats (enterprise count, listed count, sanctioned count, latest
  snapshot date)
- Search box + primary filters (year, subordination, county, listed-only)
- "Featured / largest SOEs" and "Recently sanctioned" entry points

### Search / listing (`/intreprinderi-publice` with query state)
- Faceted list of enterprises: name, CUI, authority, subordination, county,
  CAEN, ticker, indicator-count, latest-year status
- Sort by name, CUI, indicator value (for a selected KPI), county
- Facets: year, subordination (central/local), county, CAEN division,
  listed-on-BVB, has-sanctions, has-state-aid, AMEPIP status
- Pagination / load-more (mirror the existing `entity-search` pattern)

### Entity detail (`/intreprinderi-publice/$cui`)
- Header: name, CUI, AMEPIP status, ticker badge (if listed), CAEN, registration
  number, controlling authority (name + central/local + county + APT CUI link)
- Tabs/sections: Profile · Indicators (time series) · Governance · Enforcement ·
  State aid · BVB market & reports · Related (budget/procurement/companies)
- Source lineage banner on every fact: AMEPIP snapshot id, workbook date, source
  URL, "verify" link

### Comparison (`/intreprinderi-publice/comparare`)
- Select 2–N enterprises (by CUI or name), pick KPIs and years, see a
  side-by-side table + multi-series chart

### Dashboards / analytics (`/intreprinderi-publice/analiza`)
- Aggregate cuts: by subordination, county, CAEN, authority
- Rankings, distributions, top movers (indicator deltas year over year)
- Reserved for advanced users (§14)

### Cross-domain related links
- To **companies** (`/companies/$cui`): ONRC/ANAF canonical identity & absolute
  financials — labelled "Registrul ONRC/ANAF"
- To **authorities** (`/entities/$aptCui`): the controlling authority's budget &
  profile — labelled "Autoritate tutelară"
- To **budget**: the authority's budget execution
- To **procurement**: contracts where the SOE is authority or supplier
- Each link shows `link_status` (matched/missing/ambiguous) honestly

---

## 10. Recommended Pages

1. **Enterprise Profile** (`/intreprinderi-publice/$cui`)
   Primary content: identity (name, CUI, CAEN, registration number, AMEPIP
   status, ticker), controlling authority block, "performance at a glance" card
   (3–4 headline KPIs, multi-year), source lineage banner, tab navigation to the
   pages below. This is the MVP anchor page.

2. **KPI Time Series** (tab on profile, or `/intreprinderi-publice/$cui/indicatori`)
   Primary content: the 43-indicator dictionary as a searchable picker; a
   multi-year chart + table for selected indicators; raw value, numeric/boolean
   value, measure unit, KPI code, `source_sheet` (calculated vs form), warnings;
   plain-language definition per indicator. Handles all `value_kind` variants.

3. **Ownership / Authority Network** (tab or
   `/intreprinderi-publice/$cui/autoritate`)
   Primary content: controlling authority (APT name, APT CUI, subordination,
  `apt_type_id` decoded, county, status, list class A–F), link to the authority's
   entity/budget page, and (future) ownership % when available. A simple
   "enterprise → authority → budget" breadcrumb.

4. **Governance Document Viewer** (tab or
   `/intreprinderi-publice/$cui/guvernanta`)
   Primary content: list of governance documents from the `media_apt` index
   (letter of expectation, selection announcements, selection-plan composition,
   final reports), each with title, type, CUI_APT/CUI_IP, source URL, and (future)
   an inline PDF viewer + extracted text. Fact: today only the URL index exists;
   the viewer degrades to external "open source PDF" links until the governance
   lane ships.

5. **Sanctions / Enforcement** (tab or
   `/intreprinderi-publice/$cui/sanctiuni`)
   Primary content: AMEPIP enforcement actions against the enterprise (and,
   separately, against its authority), with sanction date, legal basis (OUG 109
   article), sanction text, and source URL. Privacy note: no person/responsible
   field is shown.

6. **BVB Market & Reports** (tab or `/intreprinderi-publice/$cui/bursa`)
   Primary content (listed SOEs only): ticker, ISIN, market segment, market
   indicators (market cap, P/E, P/BV, EPS, dividend/yield), and a chronological
   list of report PDFs (annual/half-year/financial statements/current reports)
   with download links and `download_status`. Hidden entirely for non-listed
   enterprises.

7. **State Aid Evidence** (tab or `/intreprinderi-publice/$cui/ajutor-de-stat`)
   Primary content: RegAS awards per enterprise — measure, scheme, financier,
   amount (category + subcategory), intensity, granted date, objective, region,
   and a link to the measure PDF (`pdf_masura`).

8. **Comparison Page** (`/intreprinderi-publice/comparare`)
   Primary content: enterprise multi-select, KPI multi-select, year range,
   side-by-side table + grouped line chart.

9. **Analytics Dashboard** (`/intreprinderi-publice/analiza`)
   Primary content: aggregate rankings, distributions, top movers; filters by
   subordination, county, CAEN, authority. Advanced (§14).

10. **Landing Page** (`/intreprinderi-publice`)
    Primary content: explainer, headline stats, search, featured SOEs, recently
    sanctioned, latest-snapshot freshness.

---

## 11. Recommended Filters and Search

### Searchable (free text)
- Enterprise name (primary), CUI (exact, normalized to digits), ticker symbol,
  ISIN, controlling authority name, CAEN code/description
- Indicator name / KPI code (for the indicator picker on profile & comparison)

### Filterable (facets)
- **Year** (2019–2024/2025; multi-select)
- **Subordination** (central / local) — from S1001 lane
- **`apt_type_id`** (central ministry / central agency / local council / county
  council / inter-community association) — from json_apt
- **County** (from S1001; map to SIRUTA for map views)
- **CAEN division/section** (roll up the `caen_onrc` code)
- **AMEPIP status** (Activ / Inactiv / Faliment / Lichidare / Reorganizare)
- **Listed on BVB** (boolean; ticker present)
- **Has sanctions** (boolean; enforcement action exists)
- **Has state aid** (boolean; RegAS award exists)
- **`company_links.link_status`** (matched / missing / ambiguous) — for
  data-quality exploration
- **Indicator value** (for a selected KPI: numeric range) — advanced

### Plain-language explanations required
- What "subordonare centrală/locală" means
- What each AMEPIP status means (Activ vs. Faliment vs. Lichidare vs.
  Reorganizare vs. Operativa)
- What each indicator means (dictionary `indicator_name` + `measure_unit` + a
  curated plain-language gloss for the headline KPIs)
- What OUG 109/2011 is and why AMEPIP sanctions matter
- What state aid is and what a "scheme" vs. "measure" means

### Reserved as advanced (§14)
- Indicator-value numeric range filtering across the universe
- Snapshot/historical comparison (compare two accepted snapshots)
- Cross-domain joins (SOEs whose controlling authority has budget overruns)
- Saved searches / alerts (when accounts exist)

---

## 12. Recommended Visualizations

### Plain-language, MVP
- **Headline KPI trend cards**: 3–4 small multi-year sparklines/line charts per
  enterprise for the most interpretable indicators (e.g. profitability/ROA,
  market share, debt ratio, efficiency). Each card has a one-sentence plain
  label and the measure unit.
- **Enterprise indicator table**: a year × indicator matrix with conditional
  formatting (heat-shade by value), showing raw + numeric value, unit, and KPI
  code. Handles text/boolean/empty cells with explicit badges ("N/A",
  "Da/Nu", "Text").
- **Subordination + county breakdown bar chart** (listing/analytics): counts of
  enterprises by central vs. local and by county.
- **Sanctions timeline**: a simple chronological list/dot-timeline of
  enforcement actions per enterprise.
- **Source lineage badge**: on every fact — "AMEPIP · snapshot
  amepip-core-… · 2026-01-13 · verify ↗".

### Explained in plain language
- Every chart must have a tooltip with the indicator's plain-language definition
  and measure unit, not just the KPI code.
- Every aggregate must state its denominator ("X of 1,342 enterprises").
- Trend arrows must say "vs. previous year" and handle missing years honestly.

### Reserved as advanced functionality (§14)
- Multi-enterprise comparison grouped line charts with synchronized tooltips
- Bubble matrices (enterprise × indicator × year) for outlier discovery
- Map views (SOEs by county, state-aid heat map by region/county) — reuse the
  existing advanced-map feature
- Ownership network graph (enterprise → authority → budget) once ownership %
  data exists
- BVB market-indicator overlays on AMEPIP KPI charts (for listed SOEs)

---

## 13. MVP Features

The MVP should ship on the **AMEPIP core lane (live today)** plus the
controlling-authority dimension (built, deploy-gated — design to degrade
gracefully). The other lanes (BVB, RegAS, sanctions, governance) become
high-value next features.

### MVP-1: Întreprinderi Publice landing page
- **User problem**: There is no entry point to state-owned enterprises on
  Transparenta.eu; users only find them via global search.
- **Expected user value**: A discoverable home for the domain with a plain
  explainer and headline stats; sets context for every other page.
- **Required data**: `enterprise_years` (counts, distinct CUIs), `ticker_symbol`
  (listed count), current snapshot date, AMEPIP status distribution.
  Assumption: sanctioned-count and state-aid-count headlines degrade to "coming
  soon" until those lanes deploy.
- **Recommended UX pattern**: A hero with a one-paragraph explainer, 4 headline
  stat cards, a primary search input, and a "featured SOEs" / "recently added"
  rail. Mirror the landing pattern of `/companies` and `/parlament`.
- **Priority rationale**: Without a landing page the domain is invisible; this
  unlocks all other journeys.

### MVP-2: Enterprise Profile page (`/intreprinderi-publice/$cui`)
- **User problem**: SOE search hits land on the budget-centric `/entities/$cui`
  page, which shows none of the AMEPIP/SOE-specific context.
- **Expected user value**: A dedicated profile answering "what is this SOE,
  who controls it, how is it performing" in one screen.
- **Required data**: `enterprise_years` (identity, status, ticker),
  `controlling_authorities` (authority, subordination, county — degrade
  gracefully if empty), `company_links` (link to companies profile),
  `source_snapshots` (lineage), and a small curated set of headline
  `indicator_values`.
- **Recommended UX pattern**: A header card (name, CUI, status badge, ticker
  badge, authority block, CAEN) + a "Performance at a glance" card with 3–4
  headline KPI sparklines + a source-lineage banner + tab navigation (tabs beyond
  Profile render as "coming soon" or hide based on data availability). Reuse the
  existing `entities` page-core route-adapter pattern.
- **Priority rationale**: This is the single highest-value page — it turns a raw
  search hit into an understandable SOE story and is the anchor for all
  cross-domain links.

### MVP-3: KPI Time Series tab
- **User problem**: 213,680 indicator values across 43 KPIs are inaccessible in
  aggregate; users cannot see how an SOE performs over time.
- **Expected user value**: Any user can pick indicators and see a multi-year
  trend with plain-language definitions.
- **Required data**: `indicator_values` + `indicator_dictionary` (live today).
- **Recommended UX pattern**: An indicator picker (search by name/KPI code,
  grouped by `source_sheet`), a multi-series line chart, and a year × indicator
  table with conditional formatting. Render all `value_kind` variants. Show
  measure unit and KPI code. Show per-row `warnings` as a small warning icon.
- **Priority rationale**: This is the core analytical content of the domain and
  is fully backed by live data today.

### MVP-4: Searchable / filterable enterprise listing
- **User problem**: Users cannot browse the SOE universe by authority, county,
  CAEN, or status.
- **Expected user value**: Analysts and casual users can find and rank SOEs.
- **Required data**: `enterprise_years` (latest year per CUI),
  `controlling_authorities` (subordination, county — degrade gracefully),
  `ticker_symbol`, `amepip_status`.
- **Recommended UX pattern**: A faceted list with the filters in §11, sortable
  columns, and load-more pagination. Mirror the existing `entity-search`
  components (`entity-result-row`, `entity-facet-chips`, `entity-load-more`).
- **Priority rationale**: Enables the journalist/analyst journey and feeds the
  comparison feature.

### MVP-5: Source lineage / "verify this" on every fact
- **User problem**: Public-data users need to trust and cite the source.
- **Expected user value**: Every number shows its AMEPIP snapshot, workbook
  date, and official source URL; trust and citability.
- **Required data**: `source_snapshots` lineage columns (live today).
- **Recommended UX pattern**: A compact lineage badge/expandable on every fact
  block: "Sursă: AMEPIP · workbook 2026-01-13 · snapshot amepip-core-… ·
  verifică ↗". The verify link opens the official AMEPIP CKAN resource URL.
- **Priority rationale**: This is the strongest lineage domain on the platform;
  exposing it is a core trust differentiator and cheap to implement.

### High-value next features

#### Next-1: Controlling Authority / Ownership tab (when S1001 lane deploys)
- **User problem**: "Who controls this SOE?" is unanswerable today from AMEPIP
  core alone.
- **Expected user value**: A clear authority block + a link to the authority's
  budget page; enables the "who is responsible" insight.
- **Required data**: `controlling_authorities` + `controlling_authority_links`
  (built, deploy-gated).
- **Recommended UX pattern**: An authority card (APT name, CUI, subordination,
  `apt_type_id` decoded, county, list class) + a breadcrumb link to
  `/entities/$aptCui` (the authority's budget profile) + an honest note if the
  APT CUI does not resolve in `core.public_entities`.
- **Priority rationale**: Closes the #1 data gap identified by the scraper
  research; the data is already built.

#### Next-2: BVB Market & Reports tab (when BVB lane deploys)
- **User problem**: For the 19 listed SOEs, market data and primary reports are
  scattered across bvb.ro.
- **Expected user value**: Ticker, ISIN, market indicators, and downloadable
  annual/financial report PDFs in one place.
- **Required data**: `market_listings` + `market_reports` (built, deploy-gated).
- **Recommended UX pattern**: A market card (ticker, ISIN, segment, indicators)
  + a chronological report list with download links and `download_status` badges.
  Hide the tab entirely for non-listed enterprises.
- **Priority rationale**: Highest political/economic salience (Hidroelectrica,
  Romgaz, etc.); data is built.

#### Next-3: State Aid tab (when RegAS lane deploys)
- **User problem**: Citizens cannot easily see how much state aid an SOE
  received and from whom.
- **Expected user value**: A transparent per-enterprise state-aid ledger with
  measure, financier, amount, and a link to the measure PDF.
- **Required data**: `state_aid_awards` (built, deploy-gated; reconcile hit count
  on first live run).
- **Recommended UX pattern**: A sortable award table + a small "total aid"
  summary + per-row link to `pdf_masura`.
- **Priority rationale**: Cleanest net-new exact-CUI money-flow signal; data is
  built.

#### Next-4: Sanctions / Enforcement tab (when sanctions lane deploys)
- **User problem**: AMEPIP enforcement is published as small HTML tables that no
  one reads.
- **Expected user value**: Sanctions surfaced on the enterprise (and authority)
  profile with date, legal basis, and source.
- **Required data**: `enforcement_actions` (built, deploy-gated, 34 ÎP + 6 APT
  rows).
- **Recommended UX pattern**: A chronological sanctions list/timeline with
  legal-basis chips (OUG 109 art.) and source links. Privacy: never show a
  person/responsible field.
- **Priority rationale**: Unique OUG-109 enforcement signal; small but
  high-signal dataset; data is built.

#### Next-5: Governance Document Viewer (when governance PDF lane ships)
- **User problem**: Board selection, letters of expectation, and final reports
  are PDFs on deterministic paths but not collected or viewable.
- **Expected user value**: A document list per enterprise with inline viewing
  and source links.
- **Required data**: `media_apt` URL index (exists today) → future downloaded +
  text-extracted PDFs.
- **Recommended UX pattern**: A document list (type, title, date, source URL)
  that degrades to external "open source PDF" links today and upgrades to an
  inline viewer + extracted text when the lane ships.
- **Priority rationale**: High-value governance evidence; the URL spine already
  exists, so even the degraded version adds value now.

---

## 14. Advanced Features

### Advanced-1: Enterprise Comparison tool
- **User problem**: Analysts cannot bench peer SOEs side by side.
- **Expected user value**: Side-by-side KPI comparison across 2–N enterprises
  and years, with export.
- **Required data**: `indicator_values` + `indicator_dictionary` +
  `controlling_authorities` (for grouping peers by CAEN/authority).
- **Recommended UX pattern**: A multi-select enterprise picker, KPI multi-select,
  year range, a grouped line chart + a comparison table, CSV/JSON export.
- **Priority rationale**: Core analyst workflow; high reuse value.

### Advanced-2: Analytics dashboard (rankings, distributions, top movers)
- **User problem**: The universe-level view (which SOEs are best/worst, which
  authorities oversee the most) is impossible today.
- **Expected user value**: Aggregate cuts by subordination, county, CAEN,
  authority; rankings; year-over-year movers.
- **Required data**: `enterprise_years` + `indicator_values` +
  `controlling_authorities`.
- **Recommended UX pattern**: A dashboard with filter chips, ranking tables,
  distributions, and a "top movers" board. Reuse `entity-analytics` patterns.
- **Priority rationale**: Serves the domain-expert journey and the press.

### Advanced-3: Map views (SOEs & state aid by county)
- **User problem**: Geographic concentration of SOEs and state aid is invisible.
- **Expected user value**: County heat maps of enterprise counts and state-aid
  totals.
- **Required data**: `controlling_authorities.county` + `state_aid_awards.region`
  + `core.territories` (SIRUTA).
- **Recommended UX pattern**: Reuse the existing `advanced-map` / `map` feature
  with a public-enterprises dataset.
- **Priority rationale**: Reuses existing client capability; high public appeal.

### Advanced-4: Snapshot / historical diff view
- **User problem**: Users cannot see what changed between AMEPIP snapshots.
- **Expected user value**: A diff view of added/removed CUIs and changed
  indicator values across accepted snapshots.
- **Required data**: `public_enterprises.snapshot_diffs` + historical snapshots
  (retained; current views filter to current).
- **Recommended UX pattern**: A snapshot selector + a structured diff table.
- **Priority rationale**: Niche but high-trust; leverages the strong lineage.

### Advanced-5: Cross-domain money-flow integration
- **User problem**: SOE state aid, procurement, and the controlling authority's
  budget are not connected in the UI.
- **Expected user value**: A "money flows" view linking SOE → state aid →
  procurement → authority budget.
- **Required data**: `state_aid_awards` + `procurement.*` + `budget.*` +
  `flows.money_flows` (via CUI/APT CUI).
- **Recommended UX pattern**: A Sankey/flow diagram or a structured
  related-money table on the enterprise profile.
- **Priority rationale**: Long-term platform goal; depends on multiple lanes.

### Advanced-6: Ownership % and network graph
- **User problem**: Numeric ownership stakes are missing/fragmented.
- **Expected user value**: An explicit ownership graph with percentages.
- **Required data**: Ownership % (Min Energiei / SAPE / BVB filings) — **not yet
  collected**; this is gated on a future ownership lane.
- **Recommended UX pattern**: A node-link graph (enterprise ↔ authority ↔
  shareholder) with % edge labels.
- **Priority rationale**: Blocked on data; design the IA to accept it later.

### Advanced-7: MCP / structured API access
- **User problem**: Programmatic users (analysts, other agents) cannot query the
  domain.
- **Expected user value**: MCP tools to filter enterprises by year/indicator/
  ticker/status and fetch a snapshot.
- **Required data**: The current-snapshot read model (live today); the scraper
  already defines the `query-current` contract.
- **Recommended UX pattern**: A dedicated MCP tool set
  (`resolve_public_enterprise_filter`, `get_public_enterprise_snapshot`,
  `get_public_enterprise_indicators`, `rank_public_enterprises`), labelled as
  AMEPIP/public-enterprise evidence (not canonical company profile) per the
  downstream handoff contract.
- **Priority rationale**: The scraper-side read model and acceptance criteria are
  already specified in `PUBLIC_COMPANIES_DOWNSTREAM_HANDOFF.md`.

---

## 15. UX Risks and Edge Cases

- **Presenting ratios as absolutes** (highest UX risk): AMEPIP indicators are
  ratios/KPIs, not balance-sheet values. The UI must label every indicator with
  its `measure_unit` and never imply it is an absolute financial figure. Mitigate
  with explicit "indicator type" labels and a plain-language glossary; link to
  `companies.financials` for absolutes.
- **Identity provenance confusion**: AMEPIP identity (name, CAEN, status) is
  evidence, not canonical ONRC/ANAF truth. The UI must label AMEPIP facts as
  AMEPIP and ONRC/ANAF facts (via `company_links`) as companies — never merge
  them into one "official" block. Mitigate with per-source labels and
  `link_status` honesty.
- **Empty/degraded lanes**: Authority, BVB, RegAS, sanctions, and governance
  lanes are deploy-gated. The UI must gracefully hide or label "coming soon" tabs
  based on data availability, not render empty pages or errors.
- **Mixed `value_kind`**: number/boolean/text/empty. Charts and tables must not
  break on non-numeric values. Mitigate with explicit badges and per-cell
  rendering rules.
- **Nullable ticker / KPI code**: filters and badges must handle nulls without
  showing "null" to users.
- **Sanctions privacy**: the `responsible` person/role must never be displayed
  (raw-only, privacy-gated). Mitigate with a hard rule in the serving API and UI.
- **Stale data perception**: AMEPIP is yearly + weekly poll. Users may expect
  real-time. Mitigate with a prominent "as of <snapshot date>" lineage badge.
- **S1001 vs AMEPIP universe mismatch**: S1001 (~1,773) is broader than AMEPIP
  (1,342) and includes inactive/insolvent firms. The UI must distinguish "in the
  official S1001 list" from "in the current AMEPIP workbook" to avoid confusion.
- **Listed-SOE scope confusion**: SNP (OMV Petrom), EL (Electrica), FP (Fondul
  Proprietatea) are liquid BVB symbols but are **not** in AMEPIP (partial/
  indirect state) and are out of public-enterprise scope. The UI/search must not
  imply they are SOEs.
- **BVB reachability**: `bvb.ro` is crawl-blocked; `m.bvb.ro` works. Report PDFs
  may occasionally be unavailable (`download_status` =
  `deferred`/`failed`/`too_large`). The UI must show status honestly.
- **Search URL mismatch** (see §16): the scrapper emits
  `/intreprinderi-publice/<cui>` but the client routes `public_enterprise` to
  `/entities/$cui`. Until a dedicated route exists, search deep-links land on the
  wrong (budget-centric) page.
- **CUI normalization**: CUI is 1–13 digits; the UI must normalize user input
  (strip non-digits) and not merge identity semantics beyond CUI equality.
- **Accessibility**: indicator tables and charts must remain keyboard-navigable
  and screen-reader friendly (per workspace React standards); use semantic HTML
  and ARIA via shadcn/Radix primitives.

---

## 16. Open Questions

1. **Canonical route**: Should the product adopt `/intreprinderi-publice/$cui`
   (matching the scrapper's search URL) or keep `/entities/$cui` with an SOE
   view? Fact: scrapper emits `/intreprinderi-publice/<cui>`; client currently
   routes `public_enterprise` → `/entities/$cui`. This mismatch should be
   resolved in the same slice that ships the route. Recommendation: adopt
   `/intreprinderi-publice/$cui` and update the search routing in
   `entity-search-routing.ts` to match.
2. **Deploy unblock for supplemental lanes**: When will the S1001/json_apt,
   RegAS, BVB, and sanctions lanes be promoted to prod serving? The UX MVP can
   ship on AMEPIP core alone, but the highest-value next features all depend on
   this unblock.
3. **Backend module ownership**: There is no dedicated server module for this
   domain. Will it be a new `public-enterprises` module (mirroring `companies`/
   `pnrr`) or served through the existing `reference`/`companies` modules? The
   client route depends on the API contract.
4. **Headline KPI curation**: Which 3–4 of the 43 KPIs should be the "performance
  at a glance" defaults? Assumption: ROA/ROE (profitability), market share, debt
  ratio, and an efficiency indicator — but this needs domain-expert validation
  against the actual dictionary contents.
5. **Ownership %**: Is collecting ownership % (Min Energiei / SAPE / BVB filings)
   in scope for a near-term lane, or is it deferred indefinitely? The IA is
   designed to accept it later, but product messaging should not promise it.
6. **Governance PDF text extraction**: Is there a person-data minimization policy
   approved for the governance lane (board CVs, remuneration, mandate contracts)?
   This gates the governance-document viewer upgrade.
7. **Absolute financials linkage**: Confirm the UX should link to
   `companies.financials` (ANAF) for absolute balance-sheet values rather than
   re-presenting AMEPIP ratios. Assumption: yes, per the production flow plan.
8. **Comparison export**: Should the comparison tool export CSV/JSON, and is
   there an existing export pattern to reuse?

---

## 17. Final Recommendation

- **Best starting point**: Ship a dedicated `/intreprinderi-publice` product
  surface on the **AMEPIP core lane** (live and validated today), beginning with
  the landing page and the enterprise profile + KPI time-series tab. Design every
  other tab to degrade gracefully until its supplemental lane deploys.

- **Highest-value user journey**: The **casual public user** journey
  (overview → detail → insight) — landing page → enterprise profile with
  "performance at a glance" + "who controls it" → plain-language interpretation
  and a "verify this" source link. This journey is fully backed by live data
  (plus the authority dimension once S1001 deploys) and delivers the core public
  value of the domain.

- **Most important MVP feature**: **MVP-2 — the Enterprise Profile page**
  (`/intreprinderi-publice/$cui`). It converts a raw global-search hit (which
  today lands on the wrong, budget-centric `/entities/$cui` page) into an
  understandable SOE story: identity, controlling authority, headline
  performance, and source lineage. It is the anchor for all cross-domain links
  and for every other feature.

- **Biggest UX risk**: **Presenting AMEPIP ratios as absolute financial values**.
  AMEPIP indicators are KPIs/ratios (e.g. "Cota de piață" = 0.0425), not
  balance-sheet numbers. Mislabeling them would mislead every user type and
  betray the trust the strong lineage is meant to build. Mitigate with
  `measure_unit` labels, a plain-language indicator glossary, explicit
  "ratio/KPI" tagging, and links to `companies.financials` for absolutes.

- **Biggest data dependency**: The **deploy unblock of the supplemental lanes**
  (S1001 controlling authority, BVB market/reports, RegAS state aid, sanctions,
  governance PDFs). The MVP ships without them, but the features that make the
  domain genuinely transformative (who controls it, market data, state aid,
  enforcement, governance) all depend on promoting these built-but-gated lanes to
  prod serving. Coordinate the UX rollout with the hardening runbook's PC-3
  deploy unblock.

- **Top open questions**: (1) canonical route `/intreprinderi-publice/$cui` vs
  `/entities/$cui` (resolve with the route slice); (2) timeline for supplemental
  lane deploy unblock; (3) which 43 KPIs become the "at a glance" defaults;
  (4) backend module ownership for the API/MCP contract; (5) whether ownership %
  is in near-term scope.

## Design Handoff Notes (added in review)

- **Canonical route assumption:** `/intreprinderi-publice/$cui` is the domain-first SEO/detail route; `/entities/$cui` remains the shared CUI profile and related rail until search routing changes.
- **Shared components to reuse/build:** SourceLineageBadge, EvidenceViewer / SourceProvenanceDrawer, DataStatusBadge, IdentityConfidenceBadge, KPIValueKindRenderer, EntityRelatedLinks rail.
- **First screen to design:** Enterprise Profile header: name/CUI/status/ticker, controlling authority slot, 3-4 headline KPI trend cards, source lineage banner, and tabs that degrade when supplemental lanes are empty.
- **Copy guardrail:** label every AMEPIP metric as `indicator/KPI`, show `measure_unit`, and link to `companies.financials` for absolute balance-sheet values.
- **Product-owner question:** confirm whether search should route `public_enterprise` directly to `/intreprinderi-publice/$cui` once the route exists, or keep `/entities/$cui` canonical.
