# Domain: NGOs & Social-Service Providers (ONG-uri)

## Review changelog (2026-06-26)

- **Recommendation:** Added design handoff notes for an identity-confidence-first NGO profile and provider discovery surface.
- **Recommendation:** Aligned route language with the hybrid route standard while keeping the existing `/ong/$cui` assumption open for product decision.
- **Assumption:** Name-only MJ/SGG records should not join global search as organization hits until product approves the unconfirmed-record treatment.

> UX/product research for the **NGOs & Social-Service Providers** domain (slug `ngos`).
> Source of truth for available data: the scraper project at
> `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-scrapper`
> (inventory, `prod-db/NGOS_NOTES.md`, `prod-db/EXTRACTION_HARDENING_APPROVALS.md`,
> the serving migration `src/src/db/prod-migrations/20260617T231000__ngo_domain.ts`,
> and the source contracts in `src/src/sources/ngos/production-model.ts`).
>
> Labeling convention used throughout: **Fact:** (grounded in inventory/notes/code),
> **Assumption:** (reasonable inference, labeled), **Recommendation:** (UX/product
> proposal). No live databases were queried; counts come from the inventory and notes.

---

## 1. Domain Summary

The NGOs domain covers Romanian non-governmental organizations and the social-service
providers they often overlap with. It is intentionally **evidence over identity**, not
a standalone NGO master registry.

**Fact:** The serving schema is `ngo` in `transparenta_prod`, with 11 core tables:
`source_snapshots`, `organization_evidence`, `legal_registry_records`,
`sector_memberships`, `accreditations`, `social_service_providers`,
`social_services`, `public_utility_status`, `financial_indicators`,
`link_review_cases`, and `validation_issues` (from the serving migration).

**Fact:** Identity is not owned by this domain. NGOs resolve through the shared
`core.organizations` / `core.organization_identifiers` hub. Direct-CUI sources link
automatically; name-only sources (MJ, SGG) stay in `link_review_cases` and are never
auto-merged.

**Fact:** Raw custody lives in the `transparenta_eu_ngos` database (35 base tables
across `ngo_control`, `ngo_ingest`, `ngo_raw`, `ngo_source`); official sources are
ANOFM (RUEIS + employment accreditation), MMuncii (social-service providers +
licensed services), ANAF (fiscal + financials), MJ (National NGO Registry), and SGG
(public utility).

**Fact:** The full prod promote + load was executed on 2026-06-20 (run 4931,
rows_loaded=19,929), gate green (15/15 structural checks), convergent on rerun.

**Fact:** Maturity is asymmetric: serving data is populated and validated, but there
is **no dedicated backend module, no client route, and no MCP/search surface**. The
only client path today is global entity search routing NGO hits to `/entities/$cui`.

---

## 2. Public Value

Romania's NGO sector is large, fragmented across registries, and hard for the public
to see as a whole. A citizen who wants to donate to, evaluate, or find help from an
ONG usually has to triangulate across the Justice Ministry registry, labor-market
accreditations, social-service licenses, and public-utility recognition — with no
single view of "is this organization real, accredited, and recognized?"

Transparenta.eu can deliver that single, source-cited view:

- **Trust before donation/partnership:** show whether an ONG is legally registered
  (MJ), accredited for specific services (ANOFM), licensed as a social-service
  provider (MMuncii), and/or recognized as being of public utility (SGG) — each
  claim tied to its source snapshot and date.
- **Find help nearby:** social-service providers/services are geographically keyed
  (county, locality, SIRUTA), enabling "what accredited services exist in my county
  for X need?" — a concrete beneficiary use case.
- **Accountability for public money:** cross-link NGOs (via CUI) to companies, ANAF
  financials, procurement contracts, and PNRR/funding payments, so the public can see
  which ONGs receive public funds and how they perform financially.
- **Watchdog value:** sanctions in the RUEIS sector-membership data
  (`sanction_status`) and link-review cases expose low-confidence/name-only records
  the platform deliberately did **not** force-merge — a transparency feature in
  itself.

**Recommendation:** Frame the domain around three public promises: *know the
organization* (identity + legal status), *know its services* (accreditation +
licensed services), and *know its money* (financials + public-funding cross-links).

---

## 3. Target Users

### Casual public users (donors, beneficiaries, volunteers)
- **Donors** deciding whether to give to a named association/foundation and wanting
  independent confirmation of legal status, public-utility recognition, and
  accreditation.
- **Beneficiaries** (or their advocates: social workers, family members) searching
  for an accredited social service near them (elder care, disability support, child
  protection, shelter).
- **Volunteers** looking for legitimate organizations in a sector/county.

### Journalists, analysts, NGOs, researchers, watchdogs
- **Journalists/investigators** tracing an ONG that receives public funds (PNRR,
  Legea 350 local grants, procurement) and needing its financials + registry
  provenance in one place.
- **NGO sector professionals** benchmarking their organization against peers
  (sector, county, service type, financial scale).
- **Watchdogs/researchers** auditing public-utility recognitions, accreditation
  validity windows, and sanction statuses; analyzing geographic gaps in
  social-service coverage.

### Domain experts (social-work professionals, grant makers, regulators)
- **Social-work professionals** needing the authoritative list of licensed providers
  and services for referral, with validity dates and capacity.
- **Grant makers / public-funding bodies** verifying applicant identity, sector
  membership, and accreditation before awarding funds.
- **Regulators / ministry staff** reviewing accreditation coverage and stale
  snapshots (the social-service source is flagged stale until a newer official file
  appears).

---

## 4. Key User Questions

### Questions the product should answer immediately
1. Does this ONG exist as a legal entity, and what is its registry status?
2. Is it accredited, and for what (employment services, social services)? When does
   the accreditation expire?
3. Is it recognized as being of **public utility** (utilitate publica)? By which
   HG/order?
4. What social services does it provide, where, and with what capacity? (county +
   locality + service type)
5. What is its sector membership (e.g., RUEIS social-economy register) and is it
   under any sanction?
6. What is the source and date of each of these claims?

### Questions requiring deeper analysis
1. How does this ONG's financial scale (income, employees, subsidies) compare to
   peers in the same sector/county? (requires ANAF enrichment, currently 0 rows)
2. Which ONGs receive public money (PNRR C7-I9, Legea 350 grants, procurement), and
   does spending align with their stated mission? (cross-domain, partly backlog)
3. Are there accredited social-service gaps by county/service type? (analytics over
   `social_service_providers` + `social_services`)
4. Is a name-only MJ/SGG record the same organization as a CUI-linked one?
   (identity-review, deliberately not auto-merged)
5. How stale are the social-service snapshots, and does the platform flag that
   clearly? (data-quality/freshness)

---

## 5. Available Data

**Fact:** The following serving tables are populated (counts from the 2026-06-20 prod
load and the 2026-06-25 inventory, exact count confirmed for
`social_service_providers`):

| Serving table | Rows | Identity basis | Source |
| --- | ---:| --- | --- |
| `ngo.organization_evidence` (accepted, direct-CUI) | 19,929 | `direct_cui` | 4 direct-CUI families |
| `ngo.sector_memberships` (RUEIS social-economy) | 9,176 | `direct_cui` | ANOFM RUEIS |
| `ngo.accreditations` (employment-service providers) | 1,313 | `direct_cui` | ANOFM employment accreditation |
| `ngo.social_service_providers` | 4,033 (exact count, 2026-06-25) | `direct_cui` (CUI + SIRUTA) | MMuncii provider snapshot 10.04.2024 |
| `ngo.social_services` (licensed services) | 5,407 | `direct_cui` (CUI + SIRUTA) | MMuncii licenses 11.12.2023 |
| `ngo.financial_indicators` | 0 (ANAF enrichment not seeded yet) | `direct_cui` | ANAF/MF (planned) |
| `core.organizations` (NGO CUIs touched) | 13,793 distinct CUIs | — | 4,103 `kind=ngo`; 9,690 already `kind=company` (hub, not reclassified) |

**Fact:** Key fields available per entity type (from the serving migration):

- **`social_service_providers`:** `cui`, `provider_name`, `provider_type`, `county`,
  `locality`, `siruta_code`, `address`, `license_number`, `status`,
  `source_snapshot_id`, `source_record_key`, `source_row_hash`.
- **`social_services`:** `provider_cui`, `provider_name`, `service_name`,
  `service_type`, `service_code`, `county`, `locality`, `siruta_code`, `address`,
  `license_number`, `valid_from`, `valid_until`, `capacity`, `status`.
- **`sector_memberships`:** `cui`, `organization_name`, `sector`
  (currently `social_economy`), `membership_type` (`rueis`), `certificate_number`,
  `certificate_date`, `valid_until`, `status`, `sanction_status`, `county`,
  `locality`.
- **`accreditations`:** `cui`, `organization_name`, `authority` (`ANOFM`),
  `accreditation_type` (`employment_service_provider`), `registration_code`,
  `accreditation_number`, `valid_from`, `valid_until`, `status`, `county`,
  `locality`.
- **`legal_registry_records` (MJ, name-only):** `entity_kind`, `registry_number`,
  `court_name`, `organization_name`, `legal_form`, `registry_status`, `county`,
  `locality`, `address`, `link_status` (default `review_pending`). 126,011 raw rows
  exist but are **not promoted** to identity.
- **`public_utility_status` (SGG, name-only):** `organization_name`,
  `recognizing_authority`, `hg_number`, `hg_date`, `order_number`,
  `recognition_year`, `status`, `link_status`. 229 raw rows, **not promoted**.
- **`organization_evidence`:** the canonical link surface — `evidence_kind`,
  `identity_basis` (`direct_cui`/`name_review`/`external_projection`/`none`),
  `confidence` (0–1), `review_status` (`accepted`/`review_pending`/`rejected`/
  `unmatched`), `source_id`, `source_record_key`, `source_snapshot_id`,
  `source_url`, `attrs`.
- **`link_review_cases`:** `candidate_org_id`, `candidate_cui`, `evidence_name`,
  `candidate_name`, `method`, `confidence`, `review_status` (`pending`/`accepted`/
  `rejected`/`needs_more_evidence`), `compared_fields`, `decision_notes`.
- **`source_snapshots`:** `source_id`, `source_url`, `content_sha256`,
  `content_length_bytes`, `parser_version`, `schema_fingerprint`,
  `header_fingerprint`, `row_count`, `status`, `is_current`,
  `source_declared_snapshot_date`, `accepted_at`.

**Fact:** Source traceability is strong — evidence rows carry `source_snapshot_id`,
`source_record_key`, `source_row_hash`, and `source_url`; `source_snapshots` carries
content SHA-256, parser version, header/schema fingerprints, and declared snapshot
date.

**Fact:** Cross-domain linking keys are available: `cui` (→ `companies.*`,
`core.public_entities`, ANAF financials), `siruta_code` (→ `core.territories`, maps),
and organization name (→ review-based linking for name-only sources).

---

## 6. Missing or Uncertain Data

**Fact (confirmed missing/zero):**
- `ngo.financial_indicators` has **0 rows** — ANAF fiscal/financial enrichment is
  implemented in the contract but **not seeded** ("ANAF enrichment not seeded"). So
  no NGO financials are available yet.
- `ngo.public_utility_status` and `ngo.legal_registry_records` are **not promoted**
  from raw: the loader's `readCurrentRawSnapshots` only reads the four direct-CUI
  source ids. MJ (126,011 rows) and SGG (229 rows) remain raw name-only evidence and
  are not in the served NGO profile as accepted identity.
- No `ngo_source` rows exist yet for the **backlog/blocked** sources: CONECT
  (blocked, TLS), RUTI (backlog, no CUI), Legea 350 (backlog, name-only grants),
  ANAF RegCult (backlog, no positive fixtures), FPA/ARACIP/CNAS
  (source-learning only, not promoted).
- MIPE/PNRR C7-I9 ONG payments are **funding-owned** (PNRR lane) — the NGO domain
  only *consumes* accepted CUI projections; no NGO-side payment table exists. The
  payment facts themselves live in `pnrr.*` / `flows`.

**Fact (uncertain/stale):**
- The social-service provider snapshot is **10.04.2024** and the licensed-services
  snapshot is **11.12.2023** — both flagged stale in the source contract ("production
  marks staleness until a newer official file is found"). Freshness is a real UX
  caveat.
- `transparenta_eu_ngos` raw `pg_stat` returned zero live-row estimates during the
  inventory check (stale stats); raw row-count evidence should be refreshed, though
  the serving counts above are exact.
- NGO-1 cleanup finding (2026-06-24): `legal_registry_records.document_date` +
  `document_number` are dead columns (parsers never write them); SGG `hg_date`/
  `recognition_year`/`order_number` are 0% populated because the source only
  provides the HG decree identifier. These are not data bugs but affect which fields
  the UI can show for MJ/SGG records.

**Assumption:** Geographic coverage (county/locality/SIRUTA) is solid for the
promoted social-service data (SIRUTA on 4,037/4,037 providers and 5,369/5,407
services per the multi-family proof), but county/locality may be sparse on RUEIS and
accreditation rows — the UI must handle missing location gracefully.

---

## 7. Core Entities and Relationships

**Recommendation:** Model the domain as **one Organization hub** with many
**evidence records** hanging off it, plus name-only reference records kept in a
review queue.

```
core.organizations (CUI hub; kind can be ngo, company, public_entity...)
   │
   ├── ngo.organization_evidence  (the link layer: 1 org → N evidence rows)
   │        evidence_kind ∈ {legal_registry, sector_membership, accreditation,
   │                          social_service_provider, social_service,
   │                          public_utility, fiscal_status, financial_indicator,
   │                          funding_projection, name_only_reference}
   │        identity_basis ∈ {direct_cui, name_review, external_projection, none}
   │        review_status  ∈ {accepted, review_pending, rejected, unmatched}
   │
   ├── ngo.social_service_providers  (1 provider org → N social_services)
   ├── ngo.social_services            (provider_cui → provider org)
   ├── ngo.sector_memberships         (RUEIS; sanctions possible)
   ├── ngo.accreditations             (ANOFM employment-service accreditation)
   ├── ngo.financial_indicators       (cui, fiscal_year, indicator_key) [0 rows now]
   │
   ├── ngo.legal_registry_records     (MJ; name-only; link_status review_pending)
   ├── ngo.public_utility_status      (SGG; name-only; link_status review_pending)
   └── ngo.link_review_cases          (review queue for name-only → CUI matches)

ngo.source_snapshots → referenced by every evidence row (provenance)
ngo.validation_issues → per-snapshot DQ warnings/blockers

Cross-domain:
  core.organizations.cui → companies.registrations / companies.financials (ANAF)
                        → core.public_entities (if also a public entity)
                        → procurement suppliers / PNRR contractors / flows.money_flows
  social_service_providers.siruta_code → core.territories (maps)
```

**Fact:** The relationship from `social_services` to its provider is via
`provider_cui` / `provider_org_id` (one provider → many licensed services). The
relationship from evidence to organization is via `org_id` (nullable until
accepted).

**Recommendation:** In the UI, treat the **organization (CUI)** as the page anchor
and show evidence as source-cited sections, never the other way around. Name-only
MJ/SGG records get their own discovery surface but clearly marked "identity not
confirmed".

---

## 8. Recommended User Journeys

### Journey A — Donor verifying an ONG (overview → detail → insight)
1. **Overview:** Search the ONG by name/CUI from the NGO landing search; see a result
   card with status badges (Registered · Accredited · Public utility).
2. **Detail:** Open the NGO profile; read identity, legal registry status, sector
   memberships, accreditations with validity dates, and social services — each with
   source + snapshot date.
3. **Insight:** If CUI matches a company/ANAF record, see a financial snapshot and
   any public-funding cross-links (procurement, PNRR). If only name-only MJ/SGG
   evidence exists, see an explicit "identity not yet confirmed" panel with the raw
   registry references.

### Journey B — Beneficiary finding a service nearby (overview → detail → insight)
1. **Overview:** Go to Social-Service Provider Discovery; filter by county + service
   type; see a list/map of providers.
2. **Detail:** Open a provider; see licensed services, capacity, validity window,
   address, license number, status.
3. **Insight:** See coverage gaps vs. other counties (analytics) and a link to the
   provider's organization profile for accreditation/financials.

### Journey C — Journalist tracing public money to an ONG (overview → detail → insight)
1. **Overview:** From a procurement contract or PNRR payment, follow the supplier
   CUI to `/entities/$cui` (or a future `/ong/$cui`).
2. **Detail:** Confirm the entity is an ONG (kind), see accreditations and
   public-utility status, and ANAF financials.
3. **Insight:** Compare its financials/subsidies to sector peers; flag mismatches
   between mission and spending.

### Journey D — Watchdog/regulator auditing recognitions (overview → detail → insight)
1. **Overview:** Open the Public Utility lookup / SGG registry view (name-only
   surface); filter by recognizing authority or year.
2. **Detail:** See HG/order, status, and whether a CUI-linked organization has been
   matched (`link_status`).
3. **Insight:** Review pending link-review cases (`needs_more_evidence`), see
   confidence scores, and follow the evidence trail to the source snapshot.

### Journey E — Social-work professional referring services (overview → detail → insight)
1. **Overview:** Filter licensed social services by service type + validity
   (active vs. expired) + county.
2. **Detail:** Confirm a service's license number, `valid_from`/`valid_until`,
   capacity, and provider accreditation.
3. **Insight:** Export/share a filtered shortlist for referral; see freshness of the
   underlying snapshot.

---

## 9. Recommended Information Architecture

**Recommendation:** Five top-level areas, all source-cited:

1. **Landing page** (`/ong-uri` or `/ong`) — what the domain is, source coverage
   matrix (which registries are loaded and how fresh), top-level search, and
   entry points to the two discovery surfaces (providers, public-utility).
2. **Search / listing** — organization-level search across NGO CUIs, with facets
   (sector, accreditation type, service type, county, public-utility status). Name-only
   MJ/SGG records surface in a separate "unmatched registry references" result type.
3. **Entity detail** — the NGO profile (recommended primary route `/ong/$cui`, with
   global entity routing to `/entities/$cui` retained as the cross-domain shell).
   Sections: Identity, Legal registry (MJ), Sector memberships (RUEIS),
   Accreditations (ANOFM), Social services provided (MMuncii), Public utility (SGG),
   Financials (ANAF, when seeded), Evidence trail.
4. **Comparison / analytics dashboards** — provider-coverage maps, accreditation
   validity timelines, sector/county rollups, stale-snapshot indicators.
5. **Cross-domain related links** — companies via CUI, ANAF financials, public
   entities, procurement suppliers, PNRR contractors, money flows, territories
   (SIRUTA maps).

**Recommendation:** Keep the **evidence trail** as a first-class IA element (not a
hidden admin view): every claim on a profile links to its `source_snapshot_id`,
source URL, snapshot date, and content SHA-256.

---

## 10. Recommended Pages

**Recommendation:** Build these pages (primary content per page):

1. **NGO Landing / Overview** (`/ong-uri`)
   - Domain explainer; source coverage + freshness table; quick search; entry cards
     to Provider Discovery and Public Utility lookup; known data-quality caveats
     (stale social-service snapshot, ANAF financials pending).

2. **NGO / Entity Profile** (`/ong/$cui`, aliased from `/entities/$cui` for NGO-kind
   orgs)
   - Header: name, CUI, county/locality, kind badge (ONG), identity-confidence
     indicator.
   - **Identity & Legal Registry:** MJ legal-registry record (if matched) with
     registry number, court, legal form, status; if name-only, show as
     "unconfirmed reference".
   - **Sector Memberships:** RUEIS rows with sector, certificate number/date,
     validity, **sanction_status** highlighted.
   - **Accreditations:** ANOFM employment-service-provider accreditations with
     registration code, accreditation number, validity window, status.
   - **Social Services Provided:** list of licensed services (name, type, code,
     county, capacity, license number, validity) grouped under the provider.
   - **Public Utility:** SGG recognition (HG/order, recognizing authority, status,
     recognition year) with `link_status`.
   - **Financials:** ANAF indicators by year (placeholder section until seeded).
   - **Cross-domain:** companies/ANAF/public-entities/procurement/PNRR links via
     CUI; territory link via SIRUTA.
   - **Evidence Trail:** collapsible list of every `organization_evidence` row with
     source_id, source_url, snapshot date, SHA-256, review_status, confidence.

3. **Social-Service Provider Discovery** (`/ong-uri/servicii-sociale`)
   - Filterable, map-supported listing of `social_service_providers` + their
     `social_services`. Filters: county, locality, service type, provider type,
     status, validity. Map pins via SIRUTA. Stale-snapshot banner.

4. **Public Utility Lookup** (`/ong-uri/utilitate-publica`)
   - Listing of SGG public-utility recognitions (name-only). Filters: recognizing
     authority, status, recognition year. Each row shows match status against CUI
     organizations and links to the review case.

5. **Evidence / Source Trail Page** (`/ong-uri/sursa/$sourceSnapshotId`)
   - Per-snapshot provenance view: source URL, declared date, content SHA-256,
     parser version, header/schema fingerprints, row count, status, accepted_at,
     and the list of evidence rows derived from it. Also surfaces
     `validation_issues` for that snapshot.

6. **Link Review Queue** (`/ong-uri/revizuire`) — *advanced/staff-gated*
   - `link_review_cases` with filters by review_status and confidence; tooling to
     inspect compared_fields and decision_notes.

---

## 11. Recommended Filters and Search

**Searchable (immediate):**
- Organization name (NGO provider/org names) and CUI.
- Social-service provider name; service name; license number.
- MJ registry number; SGG HG/order number.

**Filterable (listing pages):**
- **Provider/Service discovery:** county, locality, SIRUTA, service type, provider
  type, status (active/expired), validity window, capacity > 0.
- **NGO organization listing:** sector membership, accreditation type, public-utility
  status, sanction status, county, identity basis (direct_cui vs name_review).
- **Public utility:** recognizing authority, recognition year, link_status.
- **Evidence/review:** source_id, review_status, confidence threshold,
  snapshot date range.

**Explained in plain language:**
- "Identitate confirmata prin CUI" vs "Referinta din registru — identitate neconfirmata".
- "Acreditat pentru: [servicii de ocupare]" instead of raw `accreditation_type`.
- "Statut: activ / expirat" derived from `valid_until` vs today.
- "Recunoscut de utilitate publica prin HG nr. X" instead of raw `hg_number`.

**Reserved as advanced:**
- Confidence-slider filtering on `link_review_cases`.
- Cross-source identity reconciliation (matching name-only MJ/SGG to CUI orgs).
- Financial peer-benchmarking (pending ANAF enrichment).
- Snapshot-diff / supersede history (advanced provenance).

---

## 12. Recommended Visualizations

**MVP-appropriate (plain language):**
- **Status badges** on profiles: Registered, Accredited, Licensed provider,
  Public utility, Under sanction — each color-coded and clickable to evidence.
- **Validity timeline** for accreditations and social-service licenses
  (`valid_from` → `valid_until` with "active/expiring/expired" states).
- **County map** of social-service providers/services (SIRUTA → map), with counts
  and filter overlays by service type — directly serves the "find help nearby" use
  case.
- **Source/freshness panel**: snapshot date + "data from [date], source flagged
  stale" callout where applicable.

**Advanced (later):**
- **Coverage gap heatmap**: accredited-service availability by county vs.
  population (cross with INS statistics / territories).
- **Financial peer-comparison** charts (once `financial_indicators` is seeded):
  income, subsidies, employees by sector/county.
- **Public-money flow Sankey**: ONG ← PNRR/Legea 350/procurement (cross-domain via
  CUI to `flows.money_flows`).
- **Evidence-provenance graph**: organization → evidence rows → source snapshots
  → source URL/SHA.

---

## 13. MVP Features

For each feature: **user problem · expected value · required data · recommended UX
pattern · priority rationale.**

### MVP-1 — NGO / Entity Profile page (`/ong/$cui`)
- **User problem:** No single place shows whether an ONG is registered, accredited,
  and recognized.
- **Expected value:** One source-cited profile answers the donor/beneficiary's core
  trust questions in one view.
- **Required data:** `core.organizations` (kind=ngo), `organization_evidence`,
  `sector_memberships`, `accreditations`, `social_service_providers`,
  `social_services`, `public_utility_status`, `legal_registry_records` (as
  unconfirmed reference). All available now.
- **Recommended UX pattern:** Tabbed/sectioned profile with status badges at top,
  each section citing its source snapshot; "Evidence Trail" expander at the bottom.
- **Priority rationale:** This is the highest-value, fully-data-backed surface; it
  is the destination for global entity search NGO hits and the anchor for all
  cross-domain links.

### MVP-2 — Social-Service Provider Discovery (list + map)
- **User problem:** Beneficiaries/advocates can't find accredited services nearby.
- **Expected value:** "What help exists in my county, accredited, active?" — a
  concrete beneficiary outcome.
- **Required data:** `social_service_providers` (4,033) + `social_services` (5,407)
  with county/locality/SIRUTA, service type, capacity, validity, status.
- **Recommended UX pattern:** Faceted list + county map (SIRUTA pins), with a
  stale-snapshot freshness banner.
- **Priority rationale:** Uniquely actionable (geographic + service-typed),
  differentiates Transparenta from a raw registry dump, and the data is clean and
  exact-counted.

### MVP-3 — Evidence Trail / Source citations on every claim
- **User problem:** NGO data is inherently multi-source and users need to trust
  provenance.
- **Expected value:** Every claim links to its official source, date, and hash —
  the platform's trust proposition.
- **Required data:** `source_snapshots` (source_url, declared date, content_sha256,
  parser_version), `organization_evidence` (source_id, source_record_key,
  review_status, confidence).
- **Recommended UX pattern:** Inline "Sursa: [authority], [snapshot date],
  [link]" chips; a full evidence-trail section/page per profile.
- **Priority rationale:** Provenance is the core differentiator and the schema
  already stores everything needed; low cost, high trust payoff. Also mitigates the
  identity-confidence risk (§15).

### MVP-4 — Identity-confidence communication (direct-CUI vs name-only)
- **User problem:** Users could mistake a name-only MJ/SGG record for a confirmed
  ONG.
- **Expected value:** Prevents false trust; sets correct expectations.
- **Required data:** `identity_basis`, `review_status`, `link_status`, `confidence`
  on evidence/legal_registry/public_utility rows.
- **Recommended UX pattern:** Distinct visual treatment: "Identitate confirmata
  (CUI)" vs "Referinta din registru — neconfirmata" badges; name-only records shown
  in a separate, clearly-labeled section/queue.
- **Priority rationale:** Directly addresses the domain's #1 UX risk (§15) and
  respects the deliberate no-auto-merge design.

### MVP-5 — NGO Landing page with source-coverage/freshness overview
- **User problem:** Users don't know what the domain contains or how fresh it is.
- **Expected value:** Sets expectations, surfaces the stale-snapshot caveat
  honestly, and routes to discovery.
- **Required data:** Source contracts (`production-model.ts`), `source_snapshots`
  statuses/dates, row counts.
- **Recommended UX pattern:** Coverage matrix (source · authority · last snapshot ·
  status · row count) + search + entry cards.
- **Priority rationale:** Low effort, onboards all user types, and bakes the
  "stale data" caveat into the product honestly.

### High-value next features

- **Next-1 — ANAF financial enrichment + financial section.**
  - **User problem:** No financials exist (`financial_indicators` = 0).
  - **Expected value:** Income/subsidy/employee context for donors and journalists.
  - **Required data:** Seed `ngo_source.anaf_financial_indicators` from the promoted
    CUIs (contract already defines the enrichment worker, 1 req/s).
  - **Recommended UX pattern:** Financial snapshot card + year-over-year mini-chart
    on the profile.
  - **Priority rationale:** Unblocks the "follow the money" journey; biggest single
    data dependency.

- **Next-2 — Public-utility (SGG) + MJ legal-registry discovery surfaces.**
  - **User problem:** 126,011 MJ + 229 SGG name-only records are invisible.
  - **Expected value:** Watchdog/regulator discovery of recognitions and registry
    entries, with explicit "unconfirmed identity" framing.
  - **Required data:** `legal_registry_records`, `public_utility_status` (raw, not
    promoted), `link_review_cases`.
  - **Recommended UX pattern:** Two dedicated listing pages with name-only
    treatment and a "possible match to confirmed ONG" link where review cases
    exist.
  - **Priority rationale:** Surface the raw registries honestly without violating
    the no-merge rule; high watchdog value.

- **Next-3 — Public-funding cross-links (procurement / PNRR / Legea 350).**
  - **User problem:** Can't see which ONGs get public money.
  - **Expected value:** Accountability for public funds to NGOs.
  - **Required data:** Cross-domain CUI joins to `procurement.*`, `pnrr.*`,
    `flows.money_flows` (Legea 350 is backlog).
  - **Recommended UX pattern:** "Fonduri publice" section on the profile with a
    money-flow summary and links to contracts/payments.
  - **Priority rationale:** High journalist value; depends on CUI overlap which
    already exists in the hub.

---

## 14. Advanced Features

### ADV-1 — Link Review Queue UI (staff/expert)
- **User problem:** Name-only → CUI matches need human judgment.
- **Expected value:** Scalable, auditable identity reconciliation.
- **Required data:** `link_review_cases` (method, confidence, compared_fields,
  decision_notes, review_status).
- **Recommended UX pattern:** Queue table with confidence bars, side-by-side
  compared fields, accept/reject/needs-more-evidence actions, decision notes.
- **Priority rationale:** Only after MVP establishes the confirmed/unconfirmed
  distinction; requires a moderation workflow.

### ADV-2 — Coverage-gap analytics (service availability vs. need)
- **User problem:** Where are accredited social services missing relative to
  population?
- **Expected value:** Policy/planning insight for regulators and grant makers.
- **Required data:** `social_service_providers`/`social_services` ×
  `core.territories` × INS demographics (statistics domain).
- **Recommended UX pattern:** County heatmap of services-per-capita by service type.
- **Priority rationale:** Cross-domain (INS) dependency; powerful but second-order.

### ADV-3 — Financial peer benchmarking
- **User problem:** Is this ONG's scale typical for its sector/county?
- **Expected value:** Context for donors and sector professionals.
- **Required data:** Seeded `financial_indicators` + sector/county groupings.
- **Recommended UX pattern:** Peer-comparison chart with sector/county filters.
- **Priority rationale:** Blocked on ANAF enrichment (Next-1).

### ADV-4 — Snapshot supersede / history explorer
- **User problem:** How has an organization's registry status changed across
  snapshots?
- **Expected value:** Historical provenance and auditability.
- **Required data:** Multiple accepted snapshots per `(source_id, snapshot_scope)`
  + the supersede/prune logic (already implemented in the loader).
- **Recommended UX pattern:** Timeline of snapshots with diff highlights.
- **Priority rationale:** Niche but high-trust; requires retaining superseded
  snapshot metadata.

### ADV-5 — Backlog sources (RUTI, Legea 350, RegCult, CONECT, FPA/ARACIP/CNAS)
- **User problem:** Sector transparency for interest declarations (RUTI), local NGO
  grants (Legea 350), cultural status (RegCult), etc.
- **Expected value:** Broader NGO-sector accountability.
- **Required data:** Currently blocked/backlog per source contracts (CONECT TLS,
  RUTI samples, Legea 350 parser, RegCult fixtures, county-file classification).
- **Recommended UX pattern:** Per-source surfaces added as each source clears its
  blocker proofs.
- **Priority rationale:** Gated on scraper-side blockers; not UX-blocked.

---

## 15. UX Risks and Edge Cases

### Identity uncertainty (the central UX risk)
**Fact:** The domain deliberately does **not** force-merge name-only records.
`identity_basis` can be `direct_cui`, `name_review`, `external_projection`, or
`none`; `review_status` can be `review_pending`/`rejected`/`unmatched` as well as
`accepted`. MJ (126,011 rows) and SGG (229 rows) are name-only and **not promoted**.

**Recommendation:** The UI must communicate identity confidence at three levels:
1. **Profile-level badge:** "Identitate confirmata prin CUI" (green) vs
   "Identitate neconfirmata — doar referinta in registru" (amber).
2. **Section-level:** name-only MJ/SGG sections visually separated and labeled
   "Nu a fost asociat unui CUI confirmat".
3. **Row-level:** each evidence row shows `review_status` + `confidence` (where
   < 1) and links to the `link_review_cases` entry.

**Recommendation:** Never present a name-only MJ/SGG record as "the ONG" — always
as "registry reference, possibly this organization". Avoid speculative "this might
be the same as…" unless a review case with confidence exists, and even then label
it as a candidate match.

### Stale data
**Fact:** Social-service snapshots are from 2023–2024 and flagged stale. The UI must
not imply current truth. **Recommendation:** Show snapshot date prominently and a
"date may be outdated; awaiting newer official source" callout on provider/service
pages and the landing coverage table.

### CUI collisions / shared hub
**Fact:** 9,690 of the 13,793 NGO CUIs already exist as `kind=company` in
`core.organizations` and are **not reclassified** (shared hub, codex B2).
**Recommendation:** On an NGO profile, if the same CUI is also a company, show a
clear cross-link ("acest CUI apare si ca firma") rather than hiding one identity.
Avoid implying an ONG is *only* an ONG.

### Invalid/missing CUI rows
**Fact:** Some raw rows have invalid-checksum, missing, or over-long glued CUIs
(kept+flagged in raw, excluded from promotion). **Recommendation:** These never
reach the served profile; no UI action needed, but the evidence-trail/validation
page should surface `validation_issues` (e.g., "412 missing + 64 invalid + 180
over-long employment CUIs correctly excluded") for transparency.

### Empty financials
**Fact:** `financial_indicators` is empty. **Recommendation:** Render the financial
section as "Date financiare in curs de actualizare" rather than omitting it, to
avoid implying the ONG has no finances.

### Sanctioned sector members
**Fact:** `sector_memberships.sanction_status` exists. **Recommendation:** Surface
sanctions prominently (not buried) with the source and date, since this is high-
stakes donor/partner information.

### Name collisions in name-only registries
**Risk:** Two different ONGs with similar names in MJ/SGG. **Recommendation:** The
name-only listing must show disambiguating fields (county, court, registry number,
address) and never collapse by name.

### Privacy
**Risk:** NGO data is mostly public-registry, but RUTI (interest declarations) and
some contact data may be sensitive. **Recommendation:** Gate RUTI/backlog sources
behind policy review before any UI surface; follow the platform's extract-everything
/ gate-at-serving pattern.

---

## 16. Open Questions

1. **Identity confidence UX:** What exact visual language (badge + copy + section
   separation) best conveys "confirmed via CUI" vs "name-only registry reference"
   without scaring users off legitimate data? Needs design validation with donors
   and watchdogs.
2. **ANAF enrichment sequencing:** When will `financial_indicators` be seeded from
   the 4,103+ promoted NGO CUIs, and which indicators matter most for the NGO
   profile (income, subsidies, employees, assets)?
3. **Name-only surfaces:** Should MJ (126,011) and SGG (229) get public-facing
   listing pages now (clearly labeled unconfirmed), or wait until the link-review
   workflow produces accepted matches? Watchdog value vs. user-confusion risk.
4. **Route strategy:** Dedicated `/ong/$cui` route vs. enhancing the existing
   `/entities/$cui` with an NGO-specific section set — which better fits the
   platform's cross-domain entity shell and SEO goals?
5. **Cross-domain funding:** Which public-money sources (PNRR C7-I9, procurement
   suppliers, Legea 350) should be linked first on the NGO profile, given Legea
   350 is scraper-backlog?
6. **Stale-snapshot policy:** How aggressively should the UI flag the 2023–2024
   social-service snapshots, and is there a roadmap to refresh them?
7. **Review queue access:** Is the `link_review_cases` queue an internal/staff tool,
   a public-expert tool, or both? Affects authentication and UX complexity.

---

## 17. Final Recommendation

- **Best starting point:** Build the **NGO / Entity Profile page** (`/ong/$cui`)
  as the anchor, served from the already-loaded, gate-verified `ngo.*` tables, with
  the **Evidence Trail** and **identity-confidence badges** baked in from day one.
  This is the highest-value, fully-data-backed surface and the natural destination
  for global entity search hits.

- **Highest-value user journey:** The **donor verification journey** (search →
  profile with status badges + source citations → cross-domain financials/funding)
  — it serves the largest user segment and exercises the domain's trust
  proposition.

- **Most important MVP feature:** **MVP-1 NGO/Entity Profile** with embedded
  **MVP-3 Evidence Trail** and **MVP-4 identity-confidence communication**. Together
  they turn raw registry evidence into a trustworthy, single-view answer.

- **Biggest UX risk:** **Misrepresenting name-only MJ/SGG records as confirmed
  ONGs.** Mitigate with explicit confirmed-vs-unconfirmed visual language at
  profile, section, and row level, and by keeping name-only records in clearly
  labeled, separate surfaces — honoring the domain's deliberate no-auto-merge
  design.

- **Biggest data dependency:** **ANAF financial enrichment** (`financial_indicators`
  = 0 today). The "follow the money" insight and financial peer benchmarking are
  blocked until the enrichment worker seeds indicators for the ~4,103+ promoted NGO
  CUIs. This is the single highest-value next data step.

- **Top open questions:** (1) the precise UX language for identity confidence; (2)
  ANAF enrichment sequencing/indicator selection; (3) whether to publish name-only
  MJ/SGG surfaces now or after review matches; (4) `/ong/$cui` vs `/entities/$cui`
  route strategy; (5) which public-funding cross-links to ship first.

**Recommendation summary:** Ship MVP-1 + MVP-3 + MVP-4 on the existing verified
data, pair with MVP-2 (provider discovery) for the beneficiary use case, and treat
ANAF financial enrichment as the critical next data milestone that unlocks the
analyst/journalist journeys.

## Design Handoff Notes (added in review)

- **Canonical route assumption:** dedicated NGO detail route remains open between `/ong/$cui` and `/ong-uri/$cui`; either should alias from `/entities/$cui` for NGO-kind organizations.
- **Shared components to reuse/build:** IdentityConfidenceBadge, EvidenceViewer / SourceProvenanceDrawer, FreshnessBadge, PrivacyBoundaryNotice, StatusBadge set for registered/accredited/licensed/public-utility/sanctioned, MapListSync for services.
- **First screen to design:** NGO profile header and evidence sections: status badges, confirmed-vs-unconfirmed identity label, source-cited registry/accreditation/service sections, stale snapshot notice, and evidence trail.
- **Copy guardrail:** use `identitate confirmata prin CUI` for direct-CUI data and `referinta din registru - identitate neconfirmata` for name-only MJ/SGG rows.
- **Product-owner question:** choose `/ong/$cui` vs `/ong-uri/$cui`, and decide whether name-only MJ/SGG listings are public in v1 or staff/watchdog-only until review.
