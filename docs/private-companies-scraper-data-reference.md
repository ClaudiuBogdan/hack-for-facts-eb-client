# Private Companies — Scraper Data Reference

Last updated: 2026-05-21

Companion docs:

- [`scraper-data-catalog.md`](./scraper-data-catalog.md) — catalog row for `private-companies-onrc` / `private-companies-anaf`
- [`mock-first-ui-development.md`](./mock-first-ui-development.md) — mock API layout and quality gates
- Scrapper: [`experimental/docs/onrc.md`](../../hack-for-facts-eb-scrapper/experimental/docs/onrc.md), [`experimental/docs/anaf.md`](../../hack-for-facts-eb-scrapper/experimental/docs/anaf.md), [`new_latest/docs/PRIVATE_COMPANY_DB_ITERATION.md`](../../hack-for-facts-eb-scrapper/new_latest/docs/PRIVATE_COMPANY_DB_ITERATION.md)

## Naming and scope

This document covers **private legal entities** registered at ONRC (SRL, SA, PFA, etc.) enriched with **ANAF public fiscal** data. It does **not** cover:

- **Public-sector entities** already served at `/entities/$cui` (primării, ministere, buget public).
- **State-owned enterprises (SOE)** — separate AMEPIP/MFin/RegAS lane (`soe-*` datasets).
- **NGOs** — separate registry without reliable ONRC join.

In Romanian open-data wording, ONRC publishes “firme” as **open company registry dumps**; the product surface is a **private company profile**, distinct from the public budget entity page.

## Pipeline status (scrapper)

| Layer | Location | Status |
| --- | --- | --- |
| Discovery & schema | `hack-for-facts-eb-scrapper/experimental/` | Baselines validated 2026-05-16 |
| Loaders & DB | `new_latest/src/sources/private-companies/` | Loading on dedicated Postgres (`transparenta_eu_private_companies`) |
| Client API | This repo | Not wired — mock-first UI target |

Worker registry and VPN ANAF backfill: scrapper `experimental/docs/active-worker-registry.md`.

**Product guardrail (scrapper review checklist):** private-company rows must **not** leak into existing `public.entities` until promotion is explicit.

---

## Source 1 — ONRC open data (identity spine)

### Publisher and discovery

- Organization page: [data.gov.ro — ONRC](https://data.gov.ro/ro/organization/onrc)
- CKAN search (stable): `package_search?fq=organization:onrc&q=firme&sort=metadata_modified desc`
- Monthly package IDs change; workers discover the latest package dynamically.

### File format

| Property | Value |
| --- | --- |
| Format | CSV |
| Delimiter | `^` (caret) |
| Encoding | UTF-8, often BOM on header |
| Volume | Millions of rows — stream only; no full dumps in client git |

Schema fingerprints: `hack-for-facts-eb-scrapper/experimental/config/onrc-schema-baselines.json` (dataset `firme-06-05-2026`).

### Resources and UI relevance

| Resource | CKAN name note | Purpose for UI |
| --- | --- | --- |
| `OD_FIRME` | Master | Header card: name, CUI, legal form, address, registration date |
| `OD_STARE_FIRMA` | Status history / codes | Status badge, dissolution/radiere context |
| `OD_CAEN_AUTORIZAT` | Authorized activities | Activity list (with CAEN labels from nomenclature) |
| `OD_REPREZENTANTI_LEGALI` | Legal reps | Governance section (person names — handle carefully) |
| `OD_SUCURSALE` | File: `OD_SUCURSALE_ALTE_STATE_MEMBRE.CSV` | EU branches only — not domestic branches |

Load order in workers: `OD_FIRME` first, then all others keyed on `COD_INMATRICULARE`.

### Canonical join keys

| Key | Use |
| --- | --- |
| `CUI` | Join to ANAF, SEAP, PNRR beneficiary, RegAS, maps (when validated) |
| `COD_INMATRICULARE` | Join **within** ONRC files only — stable when CUI is missing or `"0"` |

From `join-key-matrix.md`:

- **Safe:** CUI-based joins after normalization (strip `RO`, non-digits).
- **Unsafe:** ONRC address text → SIRUTA without `company_address_matches` metadata.
- **Unsafe:** Name-only joins to MJ NGO or local grants.

### `OD_FIRME` — columns used by loader

Parsed in `new_latest/src/sources/private-companies/onrc-loader.ts`:

| CSV column | Normalized field | UI use |
| --- | --- | --- |
| `DENUMIRE` | `legal_name` | Page title, search |
| `CUI` | `cui` | URL key, cross-dataset links |
| `COD_INMATRICULARE` | `cod_inmatriculare` | Internal id; show as “Nr. înmatriculare” |
| `FORMA_JURIDICA` | `legal_form` | Badge (SRL, SA, …) |
| `DATA_INMATRICULARE` | `registration_date` | Timeline |
| `ADR_JUDET`, `ADR_LOCALITATE`, `ADR_SECTOR`, `ADR_COMPLETARE` | address parts | Display as text; map only if `match_confidence = safe` |
| (status in firme row) | `raw_status` | Fallback until `OD_STARE_FIRMA` joined |

**Edge cases:**

- `CUI="0"` — legacy Bucharest PF/AF; organization id becomes `onrc-cod-inmatriculare:{cod}`. UI must not treat `"0"` as a searchable fiscal id.
- `COD_INMATRICULARE` is indexed but **not globally unique** when legacy rows conflict with later CUI-backed rows — show conflicts only after scrapper review, not in v1 mocks.

### `OD_STARE_FIRMA`

| CSV column | UI use |
| --- | --- |
| `COD_INMATRICULARE` | Link to company |
| `COD` | Status code → label lookup (`source_onrc.status_codes`) |

### `OD_CAEN_AUTORIZAT`

| CSV column | UI use |
| --- | --- |
| `COD_INMATRICULARE` | Link |
| `COD_CAEN_AUTORIZAT` | 4-digit class (normalized) |
| `VER_CAEN_AUTORIZAT` | Revision (`rev2`, etc.) |

Enrich labels from ONRC nomenclature dataset (`experimental/docs/caen.md`, `geo-reference.md`).

ANAF may expose a **fiscal** CAEN on TVA response — treat as separate fact with source badge; prefer ONRC authorized list for “registered activities.”

### `OD_REPREZENTANTI_LEGALI`

| CSV column | UI use |
| --- | --- |
| `PERSOANA_IMPUTERNICITA` | Representative name |
| `CALITATE` | Role (administrator, etc.) |
| `DATA_NASTERE`, `LOCALITATE_NASTERE`, … | Optional detail — **personal data**; default to name + role only |
| `JUDET`, `LOCALITATE`, `TARA` | Rep address — secondary |

### `OD_SUCURSALE` (EU branches)

| CSV column | UI use |
| --- | --- |
| `DENUMIRE_SUCURSALA` | Branch name |
| `TIP_UNITATE` | Branch type |
| `TARA` | Country |
| `EUID`, `COD_FISCAL` | Foreign identifiers |

**Not in dump:** domestic Romanian branches, shareholders, UBO, cap table, articles of incorporation.

### Address → geography (optional map)

Scrapper table `source_onrc.company_address_matches`:

- Methods: `exact_county_locality`, `sector_exact`, or `unmatched`
- Confidence: `safe` or `unmatched` only
- Outputs: `matched_siruta_code`, `matched_uat_siruta_code`, `matched_uat_code`

**UI rule:** show UAT/county map link **only** when `match_confidence = safe`. Otherwise show raw address text with “location not verified” copy.

---

## Source 2 — ANAF public fiscal (enrichment)

Documented in `experimental/docs/anaf.md`. Queued per CUI after ONRC load.

### TVA — `PlatitorTvaRest/v9/tva`

Batch POST (up to 100 CUIs). Fields mapped to `source_anaf_public.fiscal_status_snapshots`:

| Response path | UI badge |
| --- | --- |
| `inregistrare_scop_Tva.scpTVA` | Plătitor TVA |
| `stare_inactiv.statusInactivi` | Inactiv fiscal |
| `notFound[]` | “Nu apare în registrul ANAF” — confirms missing vs empty bilant |

**Trap:** HTTP 200 with empty body does **not** mean “no data” vs “invalid CUI” on bilant — use TVA `notFound` to disambiguate.

### Bilant — `GET .../bilant?an={YEAR}&cui={CUI}`

Indicators stored in `source_anaf_public.bilant_indicators` (long-tail; last 5 fiscal years enqueued by default).

| Code | Meaning | Typical UI |
| --- | --- | --- |
| `I14` | Net turnover | KPI + trend |
| `I19` / `I20` | Net profit / loss | KPI |
| `I21` | Average employees | KPI |
| `I1`, `I2`, `I7` | Assets / liabilities | Balance snippet |
| `I12`, `I13` | State patrimony | Usually irrelevant for private cos — hide unless non-zero |

Two response shapes: with `i[]` indicators vs empty array (no filing for that year). Show “Nu există bilanț depus” per year, not a hard error.

### Entity kinds in same APIs

ANAF samples include public authorities, SOEs, NGOs, schools. Private company UI should **detect kind** (from future API or heuristics) and:

- Redirect or tab to SOE/NGO/public entity experiences when applicable
- Never imply ONRC ownership graph exists for ministries/UATs

---

## Serving model (what the API will likely expose)

Derived from `20260517T200000__private_company_core_schema.ts`:

```text
system_identity.organizations          # neutral spine (kind = legal_company)
source_onrc.legal_companies            # current ONRC identity
source_onrc.company_statuses_current   # status
source_onrc.company_caen_authorizations_current
source_onrc.company_representatives_current
source_onrc.company_branches_current     # (from branch loader)
source_onrc.company_address_matches    # optional geo
source_anaf_public.fiscal_status_snapshots  # latest TVA
source_anaf_public.bilant_indicators        # year × indicator
```

Client view model (mock contract) should flatten to something like:

```typescript
type PrivateCompanyProfile = {
  organizationId: string
  cui: string | null
  codInmatriculare: string | null
  legalName: string
  legalForm: string | null
  registrationDate: string | null
  status: { code: string; label: string } | null
  address: { display: string; county: string | null; locality: string | null }
  geography: {
    uatSirutaCode: string
    uatName: string
    countyName: string
    matchConfidence: 'safe' | 'manual-review' | 'unmatched'
  } | null
  caenActivities: ReadonlyArray<{ code: string; rev: string; label: string | null }>
  representatives: ReadonlyArray<{ name: string; role: string }>
  euBranches: ReadonlyArray<{ name: string; country: string; type: string | null }>
  fiscal: {
    vatPayer: boolean | null
    inactive: boolean | null
    anafFound: boolean
    asOfDate: string
  }
  financials: ReadonlyArray<{
    fiscalYear: number
    turnover: number | null
    netProfit: number | null
    netLoss: number | null
    employees: number | null
    currency: 'RON'
  }>
  sources: ReadonlyArray<{ id: 'onrc' | 'anaf'; snapshotDate: string }>
}
```

---

## Data explicitly unavailable (do not mock as fact)

| Topic | Note |
| --- | --- |
| Shareholders / UBO | Paid ONRC/RBR; not in open dumps |
| Domestic branches | Not in `OD_SUCURSALE` |
| Real-time registry | Monthly CKAN snapshots |
| Verified map pin | Without `safe` SIRUTA match |
| Full bilant line-by-line | Only indicator codes in public API |

---

## Future cross-dataset tabs (same CUI, separate features)

| Dataset | Join | User value |
| --- | --- | --- |
| `public-contracts-seap` | Supplier/buyer CUI | Contract volume, authorities, CPV mix |
| `pnrr-projects` | Beneficiary CUI | PNRR money as contractor (many primării implement via firms) |
| `soe-*` | CUI in AMEPIP | Redirect to SOE profile |
| `ngo-*` | CUI | Redirect to NGO profile |
| `budget-execution` | Rare for pure private cos | Only if also a budget entity |

Phase these as **linked sections** or chips (“Achiziții publice”, “Beneficiar PNRR”) once mocks exist — not part of the minimal frame. Do not expose empty tabs before the joined data exists.

---

## Main user requirements — private entities page (design frame)

Audience aligns with Transparenta: **journalists**, **analysts**, **citizens** investigating who companies are and how they relate to public money (later tabs).

### Problem statement

Users need a **trustworthy company identity page** keyed by **CUI**, separate from public budget entities, with fiscal signals and registry facts sourced from ONRC/ANAF — without implying data we do not have (ownership, guaranteed location, live registry).

### Epics for the main frame (build order)

#### 1. Discovery and routing (frame v1)

| ID | Requirement | Acceptance hint |
| --- | --- | --- |
| R2 | Canonical URL **`/companies/$cui`** | Digits-only CUI (strip `RO`); invalid → not found |
| R4 | Shareable URL with stable header facts | Snapshot/as-of date visible in footer or badge |
| — | **Deferred:** global search (R1, R3) | Typed search API + result kinds in a later refactor |

#### 2. Profile header (identity)

| ID | Requirement | Data source |
| --- | --- | --- |
| H1 | Show **legal name**, **CUI**, **nr. înmatriculare**, **legal form** | ONRC |
| H2 | Show **registration date** and **current status** (active, dissolved, etc.) | ONRC + status codes |
| H3 | Show **registered address** as text | ONRC raw address |
| H4 | **Source badge** “ONRC open data” + dataset month | Snapshot metadata |
| H5 | If ANAF TVA says `notFound`, show warning — do not show empty fiscal KPIs as zero | ANAF |

#### 3. Activity and governance

| ID | Requirement | Data source |
| --- | --- | --- |
| A1 | List **authorized CAEN** activities with human-readable labels | ONRC + nomenclature |
| A2 | If ANAF fiscal CAEN differs, show both with **source attribution** | ANAF TVA vs ONRC |
| A3 | Table of **legal representatives** (name, role only) | ONRC — no birth/address in default view; admin may see more later |
| A4 | **EU branches** section; empty state explains domestic branches not published | ONRC `OD_SUCURSALE` |

#### 4. Fiscal and financials

| ID | Requirement | Data source |
| --- | --- | --- |
| F1 | Badges: **Plătitor TVA**, **Inactiv fiscal** (when known) | ANAF TVA |
| F2 | **Financial summary** for **years returned by API only** (variable columns) | ANAF bilant `I14`, `I19`/`I20`, `I21` |
| F3 | No invented zeros for missing years; section empty state when `financials` is empty | ANAF shape rules |
| F4 | Chart: multi-year turnover / employees (optional in frame v1) | Derived from bilant |
| F5 | Show **as-of date** for fiscal queries | Request date in TVA payload |

#### 5. Localizare (frame v1)

| ID | Requirement | Data source |
| --- | --- | --- |
| G1 | **UAT context** from API (`uatSirutaCode`, labels) + compact map highlight | Pre-resolved geography DTO |
| G2 | Show `matchConfidence` when not `safe`; no client-side fuzzy address matching | API metadata |

#### 6. Trust, errors, and mock mode

| ID | Requirement |
| --- | --- |
| T1 | Global loading skeleton; section-level error boundaries (fiscal can fail independently of ONRC) |
| T2 | **Mock mode banner** when `isMockDataEnabled('private-companies')` |
| T3 | No silent empty states — distinguish **no data**, **not found**, **upstream error** |
| T4 | i18n for all user-facing strings (Lingui) |

#### 7. Non-goals for first frame

- Shareholder graph, beneficial owners, corporate group trees
- Full bilant PDF or account-level statements
- SEAP/PNRR embedded analytics (link placeholders OK)
- Alerts/notifications on company changes
- Comparison tables across companies (belongs in a future “company analytics” surface)

### Suggested page layout (wire-level)

```text
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Căutare › [Company name]                        │
│ H1 + badges: legal form, status, VAT, inactive              │
│ CUI · Nr. înmatriculare · Înregistrată la · Adresă          │
│ Source: ONRC (lună) · ANAF (dată)                           │
├─────────────────────────────────────────────────────────────┤
│ Main summary sections (current frame):                      │
│  1. Latest fiscal snapshot                                  │
│  2. Registry identity and address                           │
│  3. Authorized activities                                   │
│  4. Financial history                                       │
│  5. People, EU branches, and location confidence            │
├─────────────────────────────────────────────────────────────┤
│ Future linked sections: Achiziții publice · PNRR · SOE/NGO  │
└─────────────────────────────────────────────────────────────┘
```

Current client frame should stay on one main summary surface. Promote a section
to a tab only after it has enough joined data to justify navigation; otherwise
the user has to hunt through sparse panels for facts that fit better together.

### Parity with existing public entity page

Reuse patterns from [`entity-details.md`](./user-stories/entity-details.md) where they fit:

- URL-driven state, lazy sections, independent error states
- Clear **not found** page
- Consent-aware analytics

Do **not** reuse `/entities/$cui` route for private companies — different data contract, no budget line items, no main creditor, no INS/per-capita unless linked via geography.

### Mock-first implementation checklist (client)

1. Register datasets in `src/lib/scraper-references/catalog.ts` (`clientFeaturePaths`, `mockDataAvailable: true` when fixtures exist).
2. Add `src/schemas/private-company.ts` + Zod validation.
3. Add `src/features/private-companies/` with `api/`, `mocks/fixtures/`, hooks, components.
4. Add route `src/routes/companies.$cui.tsx` (+ lazy).
6. Copy fixtures from scrapper samples (Dante, ANAF notFound, sparse bilant, UAT geography).
7. User story: [`docs/user-stories/private-company-details.md`](./user-stories/private-company-details.md).

### Locked product decisions (2026-05-21)

| Topic | Decision |
| --- | --- |
| **Route** | `/companies/$cui` — digits-only CUI in URL |
| **Representatives** | Name + role only in default view; richer fields for admin/special roles later |
| **Search** | Out of frame v1; unified typed search in a later refactor |
| **Bilant table** | Variable years — only fiscal years present in API/mock `financials[]` |
| **Geography** | Summary section only; API supplies resolved UAT + `matchConfidence` |
| **Tabs** | Reserved for later, after SEAP/PNRR or richer financial/governance data exists |

---

## Quick reference — scrapper file map

| Topic | Path |
| --- | --- |
| ONRC notes | `experimental/docs/onrc.md` |
| ANAF notes | `experimental/docs/anaf.md` |
| Join rules | `experimental/docs/join-key-matrix.md` |
| CAEN nomenclature | `experimental/docs/caen.md` |
| Loader | `new_latest/src/sources/private-companies/` |
| DB iteration runbook | `new_latest/docs/PRIVATE_COMPANY_DB_ITERATION.md` |
| Schema migration | `new_latest/src/db/migrations/20260517T200000__private_company_core_schema.ts` |
| Client catalog | `src/lib/scraper-references/catalog.ts` (`private-companies-onrc`, `private-companies-anaf`) |
