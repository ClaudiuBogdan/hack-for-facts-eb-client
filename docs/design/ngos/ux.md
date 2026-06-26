# NGOs & Social-Service Providers — UX Summary

- **Domain slug:** `ngos`
- **Source UX document:** `docs/ux-research/ngos.md`
- **Shared foundation:** `docs/design/README.md`

## Product intent

Give the public a single, source-cited view that answers three questions about a
Romanian NGO (ONG): *is it real and legally recognized?*, *what accredited services
does it provide and where?*, and *what is its money?* The domain is deliberately
**evidence over identity** — it is not a master registry. The organization (CUI) is
the page anchor; every claim hangs off it as a source-cited evidence record, and any
record whose identity is not confirmed via CUI is shown as an unconfirmed reference,
never as "the ONG".

## User roles and top jobs

- **Donor / partner (casual):** verify an ONG before giving — legal status,
  public-utility recognition, accreditation, sanctions. Job: trust before donation.
- **Beneficiary / advocate (casual):** find an accredited social service nearby
  (elder care, disability, child protection, shelter). Job: find help nearby.
- **Volunteer (casual):** find legitimate organizations in a sector/county.
- **Journalist / investigator:** trace an ONG that receives public money (PNRR,
  Legea 350, procurement) and pull its registry provenance + financials in one place.
- **NGO sector professional:** benchmark an organization against sector/county peers.
- **Watchdog / researcher:** audit public-utility recognitions, accreditation
  validity windows, sanctions, and coverage gaps; inspect deliberately-unmatched
  name-only records.
- **Social-work professional:** authoritative list of licensed providers/services
  for referral, with validity dates and capacity.
- **Grant maker / regulator (domain expert):** verify applicant identity, sector
  membership, and accreditation; review stale snapshots.

## MVP scope

1. **NGO / Entity Profile** (`/ong-uri/$cui`) — identity + legal registry + sector
   memberships (RUEIS, sanctions) + accreditations (ANOFM) + social services
   (MMuncii) + public-utility (SGG, name-only) + financials placeholder + evidence
   trail. Anchored on direct-CUI identity. (MVP-1)
2. **Social-Service Provider Discovery** (`/ong-uri/servicii`) — faceted list + county
   map of `social_service_providers` and `social_services`, with a stale-snapshot
   banner. (MVP-2)
3. **Evidence trail / source citations** — inline source chips on every claim plus a
   per-snapshot provenance page (`/ong-uri/sursa/$snapshotId`). (MVP-3)
4. **Identity-confidence communication** — confirmed-via-CUI vs name-only-reference
   visual language at profile, section, and row level. (MVP-4)
5. **NGO Landing** (`/ong-uri`) — domain explainer, source-coverage + freshness
   matrix, search, entry cards. (MVP-5)

## High-value next scope

- **ANAF financial enrichment + financial section** (Next-1) — `financial_indicators`
  is 0 rows today; ship the section now as a "in curs de actualizare" placeholder and
  light it up when seeded.
- **Name-only registry surfaces** (Next-2) — public, clearly-unconfirmed MJ legal
  registry (`/ong-uri/registru`) and SGG public-utility (`/ong-uri/utilitate-publica`)
  listings.
- **Public-funding cross-links** (Next-3) — "Fonduri publice" section on the profile
  linking procurement / PNRR / Legea 350 via CUI.

Advanced / later (out of these feature files): Link Review Queue UI
(`/ong-uri/revizuire`, staff-gated), coverage-gap analytics, financial peer
benchmarking, snapshot supersede/history, backlog sources (RUTI, RegCult, CONECT).

## Source / data constraints

- **Fact:** Serving schema `ngo` in `transparenta_prod`; full prod load executed
  2026-06-20 (run 4931, 19,929 rows), gate green (15/15 structural checks).
- **Fact:** Populated direct-CUI tables (counts from 2026-06-20 load / 2026-06-25
  inventory): `organization_evidence` 19,929; `sector_memberships` 9,176;
  `accreditations` 1,313; `social_service_providers` 4,033; `social_services` 5,407.
- **Fact:** `financial_indicators` = **0 rows** (ANAF enrichment not seeded).
- **Fact:** `legal_registry_records` (MJ, 126,011 raw) and `public_utility_status`
  (SGG, 229 raw) are **name-only and NOT promoted** to confirmed identity.
- **Fact:** Social-service provider snapshot is **10.04.2024**; licensed-services
  snapshot is **11.12.2023** — both flagged stale until a newer official file appears.
- **Fact:** SIRUTA coverage is strong on promoted social data (4,037/4,037 providers,
  5,369/5,407 services); county/locality may be sparse on RUEIS/accreditation rows.
- **Fact:** 9,690 of 13,793 touched NGO CUIs already exist as `kind=company` in the
  shared hub and are not reclassified — the same CUI can be both ONG and firm.
- **Fact:** SGG `hg_date` / `recognition_year` / `order_number` are 0% populated (the
  source only provides the HG decree identifier); MJ `document_date` /
  `document_number` are dead columns. The UI must not promise these fields.
- **Fact:** There is no backend NGO module, no client route, and no MCP/search
  surface today; the only existing path is global entity search routing NGO hits to
  `/entities/$cui`.
- **Decision:** Client is mock-first. Mock shapes mirror the `ngo.*` serving tables so
  later API integration happens in feature API adapters, not by rebuilding UI.

## Privacy / provenance constraints

- **Decision:** Every claim cites its `source_snapshot_id` (authority + snapshot date +
  source URL + content SHA-256 + parser version) at the point of use.
- **Decision:** Name-only MJ/SGG records are visibly unconfirmed and physically
  separated from confirmed evidence; never presented as "the ONG".
- **Decision:** No speculative "this is probably the same org" language. A candidate
  match is shown only when a `link_review_case` with a confidence score exists, and
  even then is labeled a candidate.
- **Decision:** Sanctions (`sector_memberships.sanction_status`) surface prominently
  with source + date — high-stakes donor/partner information.
- **Decision:** Use neutral language (`semnal`, `necesita verificare`, `neconfirmat`,
  `referinta din registru`) — never wrongdoing labels.
- **Decision:** RUTI / interest-declaration and other privacy-sensitive backlog
  sources are gated behind policy review and are out of scope for these features.

## Design implications

- The profile is a sectioned (not tabbed-only) investigative surface: status badge
  strip at top, then source-cited sections, then a collapsible evidence trail.
- Two distinct identity tiers drive layout: confirmed (CUI) content first; name-only
  references in their own clearly-labeled zone.
- Discovery is geography-first (county + service type) with synchronized list+map.
- Freshness and coverage are first-class page furniture (CoverageRibbon, stale-snapshot
  notice), not footnotes.
- Empty financials render as an honest "in curs de actualizare" state, never omitted.

## Blockers

None block design or mock-first implementation. Product-owner decisions that affect
later breadth — but not MVP delivery — are captured per feature as non-blocking
"Open questions": (a) whether name-only MJ/SGG listings go public in v1 or stay
watchdog-only until review matches exist, and (b) ANAF enrichment sequencing and which
indicators to show first.
