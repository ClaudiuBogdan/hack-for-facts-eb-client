# Domain: Public Investments (Investiții Publice)

## Review changelog (2026-06-26)

- **Recommendation:** Added design handoff notes that make the Objective Detail + Evidence Viewer the first designer target.
- **Recommendation:** Standardized public-investment trust patterns with the platform EvidenceViewer, DataStatusBadge, CoverageRibbon, and PrivacyBoundaryNotice.
- **Assumption:** Amount-heavy screens must ship with PI-1 guardrails or a visible data-status warning until the reparse/backfill is complete.

> UX/product research documentation for the **Public Investments** domain
> (slug: `public-investments`). This file documents the recommended UX/product
> approach only. It does **not** implement code or modify the application.
>
> **Source of truth for available data:** the scraper project at
> `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-scrapper`,
> specifically `prod-db/DATA_INVENTORY.md` (Public Investments section),
> `prod-db/PUBLIC_INVESTMENTS_NOTES.md`,
> `prod-db/PUBLIC_INVESTMENTS_RAW_DATA.md`,
> `prod-db/PUBLIC_INVESTMENTS_EXTRACTION_IMPROVEMENTS.md`,
> `prod-db/PUBLIC_INVESTMENTS_NEW_DATASETS.md`,
> `prod-db/EXTRACTION_HARDENING_APPROVALS.md`, and the
> `public-investments:*` scripts in `src/package.json` (lines 120–132).
>
> **Labeling convention used throughout:** `Fact:` = grounded in
> inventory/notes/code; `Assumption:` = a sensible, labeled inference;
> `Recommendation:` = a product/UX proposal.

---

## 1. Domain Summary

Public Investments (Investiții Publice) covers **Romanian national investment
programs** — the public-money objectives built under programs such as
**Anghel Saligny (PNIAS)**, **PNDL**, **PNCCRS** (seismic/retrofitting),
**PNMC** (hospital infrastructure), and (in the broader family) PNSS,
Microbuze, ANL housing, PNCIPS, and EU cohesion-funded projects.

- **Fact:** The serving schema `public_investments.*` is populated and
  validation-gate-green. Live exact count on 2026-06-25 shows **17,642
  `public_investments.project_objectives_current`** across 4 promoted programs
  (Anghel Saligny 5,772 / PNDL 11,636 / PNCCRS 227 / PNMC 7).
  (DATA_INVENTORY.md, PUBLIC_INVESTMENTS_NOTES.md "FULL CORPUS LOAD".)
- **Fact:** The serving model is **evidence-forward and fact-first**:
  `project_objectives_current` (canonical, 1-per-identity projection),
  `objective_source_facts`, `payment_source_facts`, `contract_source_facts`,
  `stage_source_facts`, `party_evidence`, `territory_links`,
  `planning_references`, `source_snapshots`, `source_evidence`, and
  `objective_identity_candidates`. (PUBLIC_INVESTMENTS_RAW_DATA.md §4.)
- **Fact:** No downstream product surface exists today — **no dedicated
  backend module, no client route, no MCP tool, no search product surface**
  was verified. (DATA_INVENTORY.md "Surface Availability"; client route list
  has no `/investitii-publice` route.)
- **Fact:** The domain is **identity-conservative**: `objective_id` is a
  surrogate; project identity uses candidate confidence + review state.
  SIRUTA is territory identity only; contractor/beneficiary CUI is promoted
  only when explicitly present in source rows; SEAP matches stay
  candidate-evidence with manual-review flags. (PUBLIC_INVESTMENTS_NOTES.md
  "Schema Decisions".)
- **Assumption:** Because the platform already has a separate `pnrr` slice,
  PNRR-funded investment data (MIPE PNRR dashboard, `proiecte.pnrr.gov.ro`)
  belongs to the PNRR domain and should be **cross-linked, not duplicated**
  into Public Investments.

This is therefore a **"data-ready, product-greenfield"** domain: the hardest
part (raw extraction, validation gate, evidence lineage) is done, and the UX
work is to design the first user-facing experience from scratch.

---

## 2. Public Value

Public investment programs are where billions of lei meet roads, water mains,
schools, hospitals, and seismic retrofits in specific localities. The public
value of a Public Investments surface is to make this legible:

- **Follow the money to the ground.** Turn "PNDL spent X billion" into "here
  is the water main in *your* commune, its contracted vs. reimbursed amount,
  and its implementation stage." (`Fact:` per-objective title, SIRUTA, domain,
  allocation, contracted, decontat, and stage exist in
  `objective_source_facts`/`stage_source_facts`.)
- **See what is stuck, finished, or barely started.** Implementation stage
  (`Stadiu obiectiv`) and reimbursement ratio (`Grad decontare %`) let the
  public spot objectives that are contracted but not progressing.
- **Know who is building it and who benefits.** Designer (`Proiectant`),
  contractor (`Executant`), beneficiary UAT, and (when present) CUIs let
  citizens and journalists trace accountability.
- **Trust through evidence.** Every exposed fact traces to a source URL + a
  content-addressed MinIO source object (`Fact:` `source_evidence` carries
  `source_url`, `source_file_id`, `object_id`, `source_row_key`). Users can
  verify any number against the official workbook.
- **Connect investments to the rest of public spending.** Link an objective
  to procurement (who won the contract), PNRR (is this EU-funded too?),
  budget programs, the benefiting public authority, and the territory.

**Recommendation:** Position the domain's value proposition as
**"Vezi banii publici transformați în obiective pe hartă — și dovezile din
care ieșesc aceste date."** (See public money turned into objectives on a map
— and the evidence behind every figure.)

---

## 3. Target Users

### 3.1 Casual public users (local communities)
Citizens and residents who care about **their locality**: is the school being
retrofitted? is the water network done? how much was reimbursed? They arrive
via a county/UAT name, a map click, or a shared link. They are not data
literate and need plain Romanian, obvious maps, and one-number-at-a-time
clarity.

### 3.2 Journalists, analysts, NGOs, researchers, watchdogs
Power users who want to **investigate and compare**: which counties absorb
funds slowest, which contractors appear across many programs, which
objectives are contracted but never reimbursed, evidence trails for
publishing. They need filters, CSV/download, source links, and cross-domain
links (procurement, companies, PNRR, budget).

### 3.3 Domain experts (public administration, infrastructure, auditors)
Specialists who already know the programs (PNDL, Anghel Saligny, PNCCRS) and
want **program-level detail, stage semantics, and lineage**: per-program
cohorts, contract numbers, designer/contractor CUIs, snapshot provenance,
and reconciliation between the workbook and the published figure. They
tolerate technical labels and value raw-source access.

---

## 4. Key User Questions

### Questions the product should answer immediately
1. What public investment objectives exist in **my county / UAT / locality**?
2. For a given objective: **title, domain (water/roads/schools/…), program,
   beneficiary, contracted amount, reimbursed (decontat) amount, and current
   stage**?
3. **Where is it on the map**, and what is the evidence (source workbook +
   URL) for these figures?
4. **Who is the contractor/designer**, and (when available) what is their CUI
   and link to procurement / company records?
5. How does an objective's **reimbursement progress** (decontat vs.
   contractat) compare to its declared stage?

### Questions requiring deeper analysis
1. Which **counties/UATs** have the worst absorption (contracted ≫
   reimbursed) or the most stalled objectives, by program and domain?
2. Which **contractors/designers** appear most frequently across programs and
   territories, and how much money flows to each?
3. How has an objective's **contracted/decontat/stage changed over time**
   across historical snapshots (a time series — `Fact:` only the latest
   snapshot feeds the projection today; historical backfill is an open
   extraction improvement)?
4. Which objectives are **also PNRR / EU-cohesion funded**, and how do the
   amounts reconcile across sources?
5. Where does a Public Investments objective link to a **SEAP/e-licitatie
   contract** for the same works (the "who won it" question — `Fact:` today
   only candidate-evidence, manual-review flagged)?

---

## 5. Available Data

All items below are **Fact**, grounded in the production schema
(`PUBLIC_INVESTMENTS_RAW_DATA.md` §4) and the per-lane field map (§2), with
loaded counts from `PUBLIC_INVESTMENTS_NOTES.md` "FULL CORPUS LOAD".

### 5.1 Core entities (serving, populated)
- **Project objectives (current projection):** 17,642 canonical rows in
  `project_objectives_current`, surrogate `objective_id`, identity =
  `program:siruta:md5(lower(trim(title)))`. Attributes: program, SIRUTA, UAT,
  county, title, domain, beneficiary, allocation (initial/updated),
  contracted (`Suma contractată`), reimbursed (`Suma decontată`).
- **Objective source facts:** per-snapshot objective facts (backfilled
  `objective_id`).
- **Payment facts:** 17,629 rows — date, amount, requested, decontat,
  cumulative.
- **Contract facts:** 11,874 rows — contract number, contract date,
  contractor (name + CUI when present), designer (name + CUI when present),
  beneficiary.
- **Stage facts:** 12,006 rows — `stage_raw`, `status_raw` per snapshot
  (implementation stage / status snapshots).
- **Party evidence:** contractor/designer/beneficiary parties (name + CUI),
  manual-review flagged; carries `privacy_class` and
  `potential_natural_person` (F2 migration).
- **Territory links:** SIRUTA → territory (territory identity only).
- **Planning references:** planning/GIS reference rows.
- **Source evidence:** 59,155 rows — `source_url`, `source_file_id`,
  `object_id`, `source_row_key`, evidence table/key. Every exposed fact is
  traceable to a fetchable URL + content-addressed MinIO object.
- **Objective identity candidates:** candidate project identity with
  confidence + review state.
- **Programs:** the 8 declared programs (Anghel/PNDL/PNCCRS/PNMC/…).

### 5.2 Programs with data loaded today
- **ANGHEL_SALIGNY** (`anghel_mdlpa_status`): 5,772 current objectives.
  Fields include `ID` (stable per-objective key), Județul, Categorie UAT,
  UAT, SIRUTA, objective title, Domeniu, allocation, Suma contractată, Suma
  decontată, Proiectant, Executant, CUI proiectant/executant, Stadiu
  obiectiv, physical lengths (rețele apă/canalizare/drumuri, Nr poduri).
- **PNDL** (`pndl_mdlpa_status`): 11,636 current. Etapa, Nr contract, Județ,
  UAT Beneficiar, SIRUTA, title, Domeniu, Alocat 2015-2022/2026, Suma
  contractată, Decontat, Stadiu obiectiv.
- **PNCCRS** (`pnccrs_contracts`): 227 current. Nr Contract, Județul,
  Beneficiar, SIRUTA_UAT, title, Subprogram, Suma contractată, Suma
  decontată, Grad decontare (%), Stadiu obiectiv.
- **PNMC** (`pnmc_contracts`): 7 current (SIRUTA-valid). Hospital
  infrastructure.

### 5.3 Evidence & lineage guarantees
- `Fact:` Raw snapshots/files/objects are immutable; `source_row_key`
  identifies a row across parser runs; `row_hash` detects content drift.
- `Fact:` The two-tier validation gate (16+ checks) is green with only a
  `money_precision` warning (13 rows decontat>contracted — real source
  anomaly, triaged not blocked). Projection is rerun-deterministic (0 drift).
- `Fact:` Privacy is enforced at the serving layer: `party_evidence` rows
  flagged `potential_natural_person = true` carry
  `privacy_class = 'personal_moderate'` and must NOT be served to public
  consumers; unreviewed `public_aggregate` party names are default-deny until
  human review (same posture as the judicial-cases slice).

---

## 6. Missing or Uncertain Data

### 6.1 Declared-but-inert sources (the scraper can collect but has NOT yet)
- `Fact:` **4 of 7 acquisition kinds have no fetch branch** —
  `date_locale_html`, `ckan_file`, `browser_probe`, `pdf` fall through the
  discovery `if`-chain, so **8 of 16 manifests are inert**
  (PUBLIC_INVESTMENTS_EXTRACTION_IMPROVEMENTS.md §1). Specifically:
  - **Date Locale** (PUG/PUZ/PUD ~3,271, PMUD 319, PATJ 4, roads ~6,769):
    SIRUTA-keyed planning/road registries — never harvested.
  - **ANL youth-housing** (`ckan_file`): a whole un-captured program.
  - **CNI** (`browser_probe`): now unblockable via anonymous Power BI
    (12,079-row master registry) — not yet wired.
  - **MDLPA PNRR C10 PDF**: never extracted (belongs to PNRR slice anyway).

### 6.2 Fetched-but-not-loaded (collectable, blocked on ops)
- `Fact:` **CKAN lanes (Anghel/PNDL payments + progress)** are declared and
  fetched but **not loaded to prod** — blocked on a production CA bundle
  (`PUBLIC_INVESTMENTS_CA_BUNDLE`) for live MDLPA/CKAN strict-TLS discovery.
  These carry a **rich 20-column "stadiu/progres" schema** (contract no/date,
  total + state-budget values, Stadiu decontare %, Proiectant, Executant)
  that the fuzzy parser only partly types today.
- `Fact:` **ArcGIS reference lane** caps at ~2,000 of ~3,186 features with no
  pagination, and queries the weaker "request" layer instead of the
  **6,952-row `Localizare_ob_investitii` cross-program master** (with
  `Cod_unic`, value, plăți, stadiu).

### 6.3 Net-new sources live-verified but not yet captured
- `Fact:` **MIPE Cohesion map** — 9,323 EU-funds projects, 100% CUI, ~78%
  SIRUTA, one JSON fetch. Genuinely new (not PNRR).
- `Fact:` **CNI Power BI** — 12,079-row master registry + per-status reports
  (execuție/achiziție/finalizate).
- `Fact:` **New MDLPA programs** — PNSS (schools), Microbuze, PNCIPS via the
  existing `mdlpa_attachment` lane.

### 6.4 Data quality issues that affect UX
- `Fact:` **Money inflation bug (PI-1, deferred, human-gated):** ~10,900+
  suspect amounts stored ×1000 (e.g. `Contractat 4728355.133` stored as
  `4728355133`) across arcgis/anghel/mipe manifests; awaiting a reparse
  mechanism (PI-2). **UX impact:** amounts could be wildly wrong until
  backfilled; the UI must guard against impossible values and label
  data-correctness status.
- `Fact:` **Decimal/stage hygiene:** amount columns carry Excel float
  artifacts (`18207.689999999999`) and scientific notation; `Stadiu obiectiv`
  mixes numeric %, sci-notation, and free text. Stage is not a clean enum.
- `Fact:` **Only the latest snapshot is projected** — no time series yet
  (historical backfill is an open improvement). UX cannot show "progress over
  time" until backfill.
- `Fact:` **Identity is conservative and sometimes weak:** program+SIRUTA+
  normalized title is not canonical; some objectives have weak
  current-objective identity candidates; SIRUTA missing on some PNMC source
  lists (structural blocker). Cross-source `Cod_unic` ↔ workbook join is
  **unverified**.
- `Fact:` **Party/PII gating:** contractor/designer names may be
  sole-trader/PFA natural persons; unreviewed party names are default-deny.
  UX must never expose gated party names as canonical.

---

## 7. Core Entities and Relationships

```
Program (programs)
  │  belongs to →
  ▼
Project Objective (project_objectives_current)  ← surrogate objective_id
  │  identity candidates (objective_identity_candidates: confidence + review)
  │  territory link (territory_links: SIRUTA → territory)
  │
  ├── Objective source facts (objective_source_facts) ──┐
  ├── Payment facts (payment_source_facts)              │ per-snapshot
  ├── Contract facts (contract_source_facts)            │ source facts
  ├── Stage facts (stage_source_facts)                  │
  └── Party evidence (party_evidence)                   │
                                                        │
  all *_source_facts ──► source_evidence (source_url, source_file_id,
                                       object_id, source_row_key)
                       └─► source_snapshots (accepted raw snapshot)
                       └─► MinIO object (content_sha256, byte-for-byte workbook)

  Party evidence ──► (candidate-only) SEAP / procurement contracts
                  ──► (when CUI present) companies / public entities
                  ──► (when CUI present) PNRR contractors (cross-domain)

  Planning references ──► territory (SIRUTA)
```

- `Fact:` Grain: objective is the canonical unit; payments/contracts/stages/
  parties are per-snapshot facts attached to it.
- `Fact:` Relationships are **evidence-backed, not merged**: contractor CUI
  links to companies/procurement only when explicitly present; SEAP matches
  stay candidate evidence with manual-review flags.
- `Recommendation:` Model the UX around the **objective as the hub**, with
  payment/contract/stage/party as tabs/sections and source-evidence as the
  trust layer under every figure.

---

## 8. Recommended User Journeys

Each journey progresses **overview → detail → insight**.

### 8.1 Casual public user (local community)
1. **Overview:** Lands on the domain landing page; sees a national map +
   top-level stats ("17,642 obiective, X mld. lei contractat"). Enters their
   county/UAT or clicks the map.
2. **Detail:** Opens a locality page → list of objectives there → opens one
   objective → sees title, domain, program, contracted vs. reimbursed, stage,
   contractor/designer (when not gated), and a "Vezi dovada" (see evidence)
   link to the source workbook.
3. **Insight:** Sees a simple "absorption" bar (decontat vs. contractat) and
   a stage badge ("În execuție" / "Finalizat" / "Contractat, nestartat"),
   understands whether the project in their community is progressing, and can
   share the link.

### 8.2 Journalist / analyst / watchdog
1. **Overview:** Lands on the landing page, jumps to **dashboards/analytics**
   (absorption by county, top contractors, stalled objectives).
2. **Detail:** Filters by program + domain + stage + county; opens a cohort
   of low-absorption objectives; drills into one; follows the contractor CUI
   to the company/procurement pages; opens source evidence for quoting.
3. **Insight:** Exports the filtered cohort (CSV), publishes a story grounded
   in per-fact source URLs, and cross-links to PNRR / budget for the same
   authority.

### 8.3 Domain expert (public administration / infrastructure / auditor)
1. **Overview:** Opens a **program page** (e.g. PNDL) with program-level
   cohort, snapshot provenance, and validation/gate status.
2. **Detail:** Inspects per-objective contract number, contract date,
   designer/contractor CUIs, stage semantics, and the
   `objective_identity_candidates` confidence/review state; compares
   workbook figures vs. the published projection.
3. **Insight:** Uses the evidence viewer + raw payload to reconcile a
   specific figure back to the source row, and flags weak-identity or
   money-precision rows for review.

---

## 9. Recommended Information Architecture

1. **Landing page** (`/investitii-publice`) — national map + headline stats +
   program chips + search + "top stalled / top contractors" teasers.
2. **Search / listing** (`/investitii-publice/obiective`) — filterable table
   of objectives with map + list toggle.
3. **Entity detail** (`/investitii-publice/obiective/$objectiveId`) — the
   objective hub: facts, stage timeline, payments, contract/parties,
   evidence.
4. **Comparison** (`/investitii-publice/compara`) — compare 2–N objectives or
   counties side by side (absorption, stage, contractors).
5. **Dashboards / analytics** (`/investitii-publice/analiza`) — absorption
   by county/UAT, top contractors/designers, stalled cohort, program
   cohorts.
6. **Cross-domain related links** (on every relevant page):
   - **Procurement** — contractor/designer CUI → procurement contracts
     (candidate-only, labeled).
   - **PNRR** — same objective / authority / territory → `/pnrr`.
   - **Budget** — benefiting public authority → `/entities/$cui` and
     `/budget-explorer`.
   - **Territories** — SIRUTA → map / locality context (`/primarie/$cui`
     where the beneficiary is a primărie).
   - **Public authorities** — beneficiary UAT → `/entities/$cui`.
7. **Evidence viewer** (`/investitii-publice/obiective/$objectiveId/dovezi`)
   — source URL, source file, snapshot, row key, content hash.

`Assumption:` Routing follows the client's existing TanStack Router
conventions (kebab-case paths, `$param` segments) consistent with `/pnrr`,
`/primarie/$cui`, `/entities/$cui`.

---

## 10. Recommended Pages

| Page | Primary content |
|---|---|
| **Landing — Investiții Publice** | National map of objectives (SIRUTA-geocoded), headline KPIs (objectives, contracted, reimbursed, absorption %), program chips (Anghel/PNDL/PNCCRS/PNMC), search bar, "top stalled objectives" + "top contractors" teasers, data-freshness + gate-status note. |
| **Objectives search/listing** | Filterable, sortable table + map: program, domain, county, UAT, stage, amount ranges, absorption range. Columns: title, locality, program, contracted, decontat, absorption %, stage. Map ↔ list sync. Export CSV. |
| **Objective detail** | Header (title, program, domain, locality, map pin). KPI cards: Alocat / Contractat / Decontat / Absorbție %. Stage badge + timeline. Tabs: Prezentare (overview), Plăți (payments), Contract (contract + contractor/designer), Părți (parties, privacy-gated), Dovezi (evidence). "Vezi dovada" per figure. |
| **Locations (county/UAT)** | Territory page: objectives in this SIRUTA, totals by program/domain, map, absorption summary, link to `/primarie/$cui` and budget for the authority. |
| **Payments** | Per-objective payment ledger (date, amount, requested, decontat, cumulative) with source-evidence link; program-level payment rollups. |
| **Contractors / designers (directory)** | Aggregated party directory (only non-gated, reviewed parties): name, CUI (when present), # objectives, total contracted, programs, territories. Link to company/procurement. Candidate-only SEAP matches clearly labeled. |
| **Implementation stage timeline** | Per-objective stage history across snapshots (requires historical backfill — `Fact:` not yet available; design for it, label "istoric indisponibil momentan" until backfill). |
| **Evidence viewer** | Source URL, source file (MinIO object), snapshot id/date, `source_row_key`, `row_hash`, content SHA-256, raw payload excerpt. The trust artifact. |
| **Program page** | Per-program cohort (e.g. PNDL): totals, objective count, absorption, snapshot provenance, validation/gate status, link to source manifest. |
| **Analytics dashboard** | Absorption by county/UAT (map + ranking), top contractors/designers, stalled-objective cohort, domain breakdown, program comparison. |

---

## 11. Recommended Filters and Search

**Searchable (plain language):**
- Objective title (free text, Romanian, diacritics-insensitive).
- Locality / UAT / county name.
- Contractor / designer name (non-gated only) and CUI.
- Program name (Anghel Saligny, PNDL, PNCCRS, PNMC, …).

**Filterable:**
- **Program** (multi-select).
- **Domain** (apă/canalizare, drumuri, educație, sănătate, seism, …).
- **County / UAT / SIRUTA** (territory drill-down).
- **Implementation stage** (normalized bucket: Contractat, În execuție,
  Finalizat, Receptionat, plus "necunoscut" for unparseable raw stage —
  `Fact:` stage is not a clean enum).
- **Amount ranges** (contracted, decontat, allocation).
- **Absorption % range** (decontat / contractat).
- **Has contractor CUI / has designer CUI / has SIRUTA** (data-completeness
  filters for analysts).
- **Snapshot/date** (once historical backfill exists).
- **Data-quality flag** (e.g. money-precision warning rows) — `Fact:` 13
  known rows decontat>contracted; expose as a labeled filter/caveat.

**Reserved as advanced:**
- Cross-source join filters (objectives also in PNRR / MIPE Cohesion).
- Candidate-only SEAP contract matches (manual-review flagged, never default).
- Identity-confidence filters (using `objective_identity_candidates`).
- Raw payload / column-level search (expert mode).

`Recommendation:` Default to a **map + list** experience with the most common
filters (program, domain, county, stage) prominent; hide data-completeness
and identity-confidence filters behind an "advanced" panel for experts.

---

## 12. Recommended Visualizations

**Essential / plain-language:**
- **Map of objectives** (the centerpiece): SIRUTA-geocoded points/polygons
  colored by program or stage, sized by contracted amount; click → objective
  detail. (`Fact:` SIRUTA is present on promoted objectives; ArcGIS
  `Localizare_ob_investitii` even has polygons — a future enrichment.)
- **Absorption bar** per objective (decontat vs. contractat) — the single
  most legible "is it progressing?" signal.
- **Stage badge + timeline** — plain Romanian stage labels with a vertical
  timeline of stage snapshots (design for future backfill).
- **Program/domain treemap or donut** — where the money goes.
- **County choropleth of absorption %** — which regions absorb funds best.

**Explained in plain language:**
- A persistent "Cum citesc aceste date" (how to read this data) explainer:
  what "contractat" vs. "decontat" means, what the stage labels mean, and
  that figures come from official MDLPA/CKAN workbooks with a source link.
- Data-freshness + gate-status indicator ("Date actualizate: <snapshot
  date>; stare validare: OK / avertizare").

**Reserved as advanced:**
- Contractor concentration / share-of-wallet network charts.
- Time-series absorption curves (post-backfill).
- Cross-domain money-flow diagrams (procurement ↔ investment ↔ budget).
- Identity-confidence scatter (expert mode).

`Recommendation:` Lead with the map and the absorption bar; treat everything
else as progressive disclosure.

---

## 13. MVP Features

> For each feature: **user problem · expected user value · required data ·
> recommended UX pattern · priority rationale.** Required-data fields marked
> `[available]` exist in the serving schema today; `[pending]` depend on open
> extraction work.

### MVP-1 — National objectives map + landing page
- **User problem:** "What public investments exist, and where?"
- **Expected user value:** Immediate, geographic legibility of 17,642
  objectives; entry point for all journeys.
- **Required data:** `project_objectives_current` (program, SIRUTA, county,
  UAT, title, domain, contracted, decontat, stage) `[available]`;
  territory geocoding via `territory_links` + `core.territories`
  `[available]`.
- **Recommended UX pattern:** Full-bleed interactive map, program chips,
  headline KPIs, search bar, "top stalled" teaser.
- **Priority rationale:** Highest leverage — turns an inert dataset into a
  navigable surface and anchors every other page.

### MVP-2 — Objective detail page (the hub)
- **User problem:** "Tell me everything about this objective, with proof."
- **Expected user value:** One page per objective with all facts, stage,
  payments, contract/parties, and source evidence.
- **Required data:** objective + payment + contract + stage + party +
  source_evidence `[available]`; privacy gating for party names
  `[available via privacy_class]`.
- **Recommended UX pattern:** Header + KPI cards + stage badge/timeline +
  tabs (Prezentare / Plăți / Contract / Părți / Dovezi) + "Vezi dovada"
  per figure.
- **Priority rationale:** This is the trust artifact — without per-figure
  evidence the domain is just numbers.

### MVP-3 — Search & filterable listing (map + list)
- **User problem:** "Show me water objectives in my county that are stalled."
- **Expected user value:** Cohort discovery for all user types.
- **Required data:** `project_objectives_current` + stage + domain +
  territory `[available]`.
- **Recommended UX pattern:** Map ↔ list sync; filters for program, domain,
  county, stage, amount/absorption ranges; CSV export.
- **Priority rationale:** Power users and casual users both need to narrow
  17,642 rows to something meaningful.

### MVP-4 — Evidence viewer ("Vezi dovada")
- **User problem:** "Can I trust this number? Where does it come from?"
- **Expected user value:** Every figure traces to an official source URL +
  content-addressed source file.
- **Required data:** `source_evidence` (source_url, source_file_id,
  object_id, source_row_key) `[available]`; `source_snapshots`
  `[available]`.
- **Recommended UX pattern:** Per-figure disclosure → source URL + snapshot
  date + row key + content hash + raw payload excerpt.
- **Priority rationale:** Evidence-forward is this domain's defining
  strength; surfacing it is the core differentiator vs. any other site.

### MVP-5 — Locality / county page
- **User problem:** "What's being built in my commune, and is it
  progressing?"
- **Expected user value:** A territory-scoped view that links to the local
  authority and budget.
- **Required data:** `territory_links` + objectives `[available]`; link to
  `core.public_entities` / `/primarie/$cui` `[available]`.
- **Recommended UX pattern:** Territory header, objectives list + map,
  absorption summary, cross-links to primărie/budget.
- **Priority rationale:** The casual-user entry point ("my locality") is the
  most common real-world query.

#### High-value next features
- **N1 — Payments ledger per objective** (problem: where did the money go
  over time; value: payment-level accountability; data: `payment_source_facts`
  `[available]`; UX: table + cumulative line; rationale: complements the
  absorption bar with transactional detail).
- **N2 — Contractor/designer directory (privacy-gated)** (problem: who
  builds the most; value: accountability + cross-link to
  companies/procurement; data: `party_evidence` non-gated + CUI
  `[available, partial]`; UX: directory table with CUI link-out; rationale:
  high journalist value, must respect `privacy_class` gating).
- **N3 — Absorption analytics dashboard** (problem: which regions absorb
  worst; value: systemic insight; data: objectives + territory `[available]`;
  UX: county choropleth + ranking + stalled cohort; rationale: the headline
  "deeper analysis" question, low data risk).
- **N4 — Stage timeline (post-backfill)** (problem: how has this project
  progressed; value: time-series trust; data: historical snapshots
  `[pending — open extraction improvement]`; UX: vertical timeline; rationale:
  design now, enable when backfill lands).

---

## 14. Advanced Features

> Same per-feature fields as §13.

### ADV-1 — Cross-domain objective linkage (PNRR / EU Cohesion / Procurement)
- **User problem:** "Is this objective also EU-funded, and who won the
  contract on SEAP?"
- **Expected user value:** One objective reconciled across all funding
  sources and the procurement award.
- **Required data:** MIPE Cohesion map (CUI/SIRUTA) `[pending]`; PNRR slice
  cross-link `[available via pnrr domain]`; SEAP candidate matches
  `[pending — candidate-only, manual-review]`.
- **Recommended UX pattern:** "Surse conexe" panel: PNRR card, Cohesion
  card, Procurement card (candidate-only badge), each link-out.
- **Priority rationale:** Highest analytical value, but depends on
  cross-source join keys (`Cod_unic` ↔ workbook ID — `Fact:` unverified) and
  MIPE capture.

### ADV-2 — Historical time-series & stage evolution
- **User problem:** "How has this project's contracted/decontat/stage
  changed over time?"
- **Expected user value:** Trend and accountability over quarters.
- **Required data:** Backfilled superseded snapshots (Anghel ~12, PNCCRS
  ~64-70, PNMC ~13) `[pending — Tier-1 extraction improvement]`.
- **Recommended UX pattern:** Time-series chart + stage timeline with
  snapshot provenance.
- **Priority rationale:** Strong watchdog feature; fully blocked on
  historical backfill.

### ADV-3 — Program-level audit view
- **User problem:** "Audit a whole program (PNDL) with provenance and gate
  status."
- **Expected user value:** Expert reconciliation of workbook vs. projection.
- **Required data:** `programs` + per-snapshot facts + validation/gate
  status `[available]`; raw payload `[available in raw layer]`.
- **Recommended UX pattern:** Program page with cohort, snapshot table,
  gate/validation status, raw-payload drill-down.
- **Priority rationale:** Niche but high-trust for auditors; cheap because
  the data is already gate-green.

### ADV-4 — Data-quality / correction transparency
- **User problem:** "Are these figures affected by known data issues?"
- **Expected user value:** Honest labeling of the money-inflation bug and
  money-precision warnings.
- **Required data:** `etl.validation_results` + money-precision flags
  `[available]`; PI-1 reparse status `[pending — human-gated]`.
- **Recommended UX pattern:** Per-figure data-quality badges + a domain
  "starea datelor" (data status) page explaining the known correction
  backlog.
- **Priority rationale:** Trust requires honesty about known issues; the
  PI-1 inflation bug makes this non-optional.

### ADV-5 — Planning-reference integration (Date Locale)
- **User problem:** "Is this investment consistent with the local urban
  plan (PUG/PUZ)?"
- **Expected user value:** Connect investment objectives to planning
  documents and road registries.
- **Required data:** Date Locale registries (PUG/PUZ/PUD, PMUD, PATJ, roads)
  `[pending — inert acquisition kind, ~10,300 rows]`.
- **Recommended UX pattern:** Territory page "Planificare" tab linking
  planning references to nearby objectives.
- **Priority rationale:** Genuinely new capability; fully blocked on wiring
  the `date_locale_html` lane.

---

## 15. UX Risks and Edge Cases

- **R1 — Money inflation bug (PI-1).** `Fact:` ~10,900+ amounts may be
  ×1000 until a reparse + backfill (human-gated). **Risk:** users see
  absurd figures and lose trust. **Mitigation:** guard against impossible
  values in the UI, show data-status badges, and a domain-level "starea
  datelor" notice until PI-1 is resolved.
- **R2 — Privacy leakage of party names.** `Fact:` unreviewed
  `public_aggregate` party names are default-deny; `personal_moderate`
  (sole-trader/PFA) must not be served publicly. **Risk:** exposing a
  natural person. **Mitigation:** serve only reviewed, non-gated parties;
  label "în curs de verificare" for the rest; enforce at the API layer,
  not just the client.
- **R3 — Stage is not a clean enum.** `Fact:` `Stadiu obiectiv` mixes %,
  sci-notation, and free text. **Risk:** inconsistent badges. **Mitigation:**
  normalize into a small bucket (Contractat / În execuție / Finalizat /
  Receptionat / Necunoscut) and show the raw stage verbatim in an
  "original" disclosure.
- **R4 — Weak / ambiguous objective identity.** `Fact:` identity is
  conservative; long titles truncate/collide; some PNMC lists lack SIRUTA.
  **Risk:** two real projects merged or one project split. **Mitigation:**
  expose `objective_identity_candidates` confidence/review in expert mode;
  never silently assert a cross-source merge.
- **R5 — Candidate-only SEAP links presented as fact.** `Fact:` SEAP matches
  are candidate evidence with manual-review flags. **Risk:** implying a
  verified contract–objective link. **Mitigation:** clear "posibilă
  corespondență, în curs de verificare" labeling.
- **R6 — No time series yet.** `Fact:` only the latest snapshot projects.
  **Risk:** "progress over time" UX promises data that doesn't exist.
  **Mitigation:** label "istoric indisponibil momentan" and design the
  timeline to activate post-backfill.
- **R7 — Coverage is uneven across programs.** `Fact:` PNDL/Anghel dominate
  (17,408 of 17,642); PNMC has 7; CNI/MIPE/ANL/PNSS not yet captured.
  **Risk:** the map looks complete but isn't. **Mitigation:** a coverage
  indicator per program + "date parțiale" honesty.
- **R8 — Source links are machine URLs for ArcGIS.** `Fact:` ArcGIS
  `document_url` is a machine API endpoint, not a human-browsable page.
  **Risk:** "Vezi dovada" lands on JSON. **Mitigation:** for ArcGIS
  reference rows, label the link as "date cartografice (API)" and prefer the
  workbook source for human-facing evidence.
- **R9 — Stale/dead source links.** `Fact:` some legacy ANL/evacuați links
  point at the dead `mlpda.ro` domain and 404. **Risk:** broken evidence
  links. **Mitigation:** detect + label dead links as source issues, don't
  hide them.
- **R10 — Romanian-language clarity.** Terms like "decontat",
  "contractat", "stadiu obiectiv" need plain-language explanation for
  casual users. **Mitigation:** persistent "Cum citesc aceste date"
  explainer + glossary tooltips.

---

## 16. Open Questions

1. **Cross-source join key.** Does ArcGIS `Cod_unic` / `cod` reliably join
   to the MDLPA-workbook `ID` / `Nr contract`? (`Fact:` unverified.) This
   determines whether cross-domain linkage (ADV-1) is feasible at scale.
2. **Historical snapshot availability.** How many superseded
   Anghel/PNCCRS/PNMC snapshots are still fetchable from the source pages
   vs. only the current set? Determines time-series feasibility (ADV-2).
3. **MIPE Cohesion routing.** Should the 9,323 EU-cohesion projects be a
   Public Investments sub-program or a sibling domain? They are
   `Fact:` genuinely new (not PNRR), but policy alignment is a product
   decision.
4. **Party review pipeline.** What is the workflow/timing for reviewing
   `public_aggregate` party names so they can be served publicly? Blocks
   the contractor directory (N2).
5. **PI-1 reparse timeline.** When will the human-gated reparse + backfill
   (~10,900 inflated amounts) run? Blocks trustworthy amount display.
6. **SEAP candidate exposure policy.** Under what conditions (if any) can
   candidate-only SEAP matches be surfaced to users beyond an expert,
   clearly-labeled view?
7. **CNI / Date Locale capture priority.** Which inert lane (CNI Power BI
   master registry vs. Date Locale planning) should ship first for UX
   value?
8. **Program taxonomy for the UI.** Should the UI expose all 8 declared
   programs (some with no data yet) or only the 4 loaded ones, with a
   "în curând" indicator for the rest?

---

## 17. Final Recommendation

- **Best starting point:** Build the **Public Investments landing page +
  objectives map (MVP-1)** and the **objective detail page with the evidence
  viewer (MVP-2 + MVP-4)** as the first slice. The data is gate-green and
  evidence-forward; the differentiating UX is "objectives on a map, every
  figure backed by a source workbook."
- **Highest-value user journey:** The **casual public user's locality
  journey** — map → my county/UAT → my objective → contracted vs.
  reimbursed + stage + "Vezi dovada." It serves the most users and the
  platform's transparency mission directly.
- **Most important MVP feature:** **MVP-2 (objective detail page with
  evidence viewer)** — it is the trust artifact that makes every other view
  credible; without per-figure evidence the domain is just numbers.
- **Biggest UX risk:** **R1 (money inflation bug, PI-1)** — ~10,900 amounts
  may be ×1000 until a human-gated reparse. The UI must guard against
  impossible values and be transparent about data-status, or trust collapses
  on first use.
- **Biggest data dependency:** **The production CA bundle
  (`PUBLIC_INVESTMENTS_CA_BUNDLE`)** for live MDLPA/CKAN discovery —
  `Fact:` a single ops gate blocking the CKAN payment/progress lanes,
  ArcGIS repointing, and ongoing sync. Without it the dataset is frozen at
  the 2026-06-20 corpus and cannot stay current.
- **Top open questions:** (1) Is `Cod_unic` ↔ workbook ID a reliable
  cross-source join key? (2) When will the PI-1 reparse/backfill run so
  amounts are trustworthy? (3) What is the party-review pipeline for
  unblocking the contractor directory? (4) Should MIPE Cohesion live inside
  this domain or alongside it? (5) How many historical snapshots are still
  fetchable for time-series?

## Design Handoff Notes (added in review)

- **Canonical route assumption:** dedicated `/investitii-publice` area; objective detail is `/investitii-publice/obiective/$objectiveId`, with territory and entity links back to `/primarie/$cui` and `/entities/$cui`.
- **Shared components to reuse/build:** EvidenceViewer / SourceProvenanceDrawer, DataStatusBadge for PI-1 and money-precision warnings, CoverageRibbon by program, PrivacyBoundaryNotice for parties, AbsorptionBar, MapListSync.
- **First screen to design:** Objective detail: header, map pin, contracted/decontat/absorption cards, stage badge, tabs for payments/contract/parties/evidence, and "Vezi dovada" beside every amount.
- **Copy guardrail:** explain `contractat`, `decontat`, `absorbtie`, and `stadiu obiectiv` in plain Romanian; show raw stage text in a disclosure when normalized buckets are uncertain.
- **Product-owner question:** confirm whether amount displays can launch before PI-1 backfill if impossible-value guards and a domain data-status notice are visible.
