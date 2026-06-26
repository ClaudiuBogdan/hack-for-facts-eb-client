# UX Research — Cross-Domain Index

## Review changelog (2026-06-26)

- **Recommendation:** Consolidated the route strategy into a hybrid model: `/entities/$cui` stays the shared CUI spine, while domain routes own domain-first discovery and SEO surfaces.
- **Recommendation:** Promoted evidence, coverage, identity confidence, freshness, and privacy notices into shared platform component standards before Wave 1 design.
- **Recommendation:** Added a product-owner clarification list at the end so design can proceed on explicit assumptions while route/search/privacy choices are confirmed.

Date: 2026-06-26

This folder holds one UX/product research document per high-value public-data
domain for the Transparenta.eu platform. Each document is grounded in the
scraper project (`hack-for-facts-eb-scrapper`) as the source of truth for
available data, cross-checked against the client for UX alignment, and written
in the same 17-section structure. No code is written; facts, assumptions, and
recommendations are labeled inline in each file.

## Documents

| # | Domain | File | Source-of-truth grounding |
|---|--------|------|---------------------------|
| 1 | Public Procurement (Achizații Publice) | `procurement.md` | `procurement.*` (19M direct acquisitions, 621K procedures, 1.9M contracts), `PUBLIC_CONTRACTS_NOTES.md`, procurement migrations + filter-capabilities migrations |
| 2 | Laws, Portal Legislativ & Monitorul Oficial (Legislație) | `legal.md` | `legal.acts` (223K), `legal.mo_issues` (42K), 5 `legal_*` prod migrations, BRIEF schemas |
| 3 | Justice & Judicial Cases (Justiție) | `justice.md` | `justice.cases` (6.33M), 18.6M hearings, 745K publishable name keys, `JUDICIAL_*` notes |
| 4 | Public Companies / State-Owned Enterprises (Întreprinderi Publice) | `public-companies.md` | `public_enterprises.indicator_values` (213K), 6,886 enterprise-years, AMEPIP core lane validated |
| 5 | Elections & Parties (Alegeri) | `elections.md` | `elections.result_rows` (102M), 44 elections, `elections_domain` migration |
| 6 | Public Investments (Investiții Publice) | `public-investments.md` | `public_investments.project_objectives_current` (17.6K), evidence-forward schema |
| 7 | NGOs & Social-Service Providers (ONG-uri) | `ngos.md` | `ngo.social_service_providers` (4K), `NGOS_NOTES.md` |
| 8 | Administrative Units, SIRUTA & INS Statistics (Statistici) | `statistics.md` | `statistics.datasets` (1,898), 23.6M observations, SIRUTA 3,239 territories |

## At-a-glance: MVP feature, biggest risk, biggest data dependency

| Domain | Most important MVP feature | Biggest UX risk | Biggest data dependency |
|--------|----------------------------|-----------------|--------------------------|
| Procurement | Native authority procurement slice on `/entities/$cui` (replaces SICAP.ai iframe) + coverage/"data as of" layer | Over-claiming review signals (same-day/repeated-pair) as verdicts; under-disclosing data quality (mixed currency, null-RON, garbage values) | Serving-side activation of per-lot e-licitatie winners, TED RO, entity profiles, RO CPV labels; suspended sync CronJobs |
| Legal | Act detail page with derived status + plain-language summary | Presenting unresolved/partial data as authoritative (unresolved citations, MO metadata mistaken for full text, non-publishable LLM facets) | Monitorul full-text and act-promotion maturity (Portal is strong; MO is active/partial) |
| Justice | Company-litigation slice on existing company/entity profiles | Privacy exposure / re-identification via person parties and incidental names in case text | Gated derive lanes (`party_company_candidates`, `case_legal_references`, `case_lineage_candidates`) pending precision gates |
| Public Companies | Enterprise Profile page `/intreprinderi-publice/$cui` with shared `/entities/$cui` related rail (identity, controlling authority, headline performance, source lineage) | Presenting AMEPIP ratios as absolute financial values (they are KPIs/ratios, not balance-sheet numbers) | Deploy unblock of supplemental lanes (S1001 authority, BVB, RegAS, sanctions, governance PDFs) |
| Elections | Contest result explorer (geography drill-down + ranked results + turnout + provenance), scoped 2008–2025 first | Treating candidate source labels as resolved identities; conflating election results with parliamentary votes | Populating gated/empty `elected_candidate_mandates`, `candidate_person_links`, `parliament_mandate_links` |
| Public Investments | Objective detail page with per-figure evidence viewer ("Vezi dovada") | Money-inflation bug (PI-1): ~10,900 amounts may be ×1000 until a human-gated reparse | Production CA bundle (`PUBLIC_INVESTMENTS_CA_BUNDLE`) blocking live MDLPA/CKAN discovery and sync |
| NGOs | NGO/Entity Profile `/ong/$cui` or `/ong-uri/$cui` with `/entities/$cui` alias, embedded Evidence Trail + identity-confidence badges | Misrepresenting name-only MJ/SGG records as confirmed ONGs | ANAF financial enrichment (`financial_indicators` = 0 today) |
| Statistics | UAT dashboard for 5 priority datasets + county-level choropleth maps | 27-vs-1,871 coverage gap (only 27 of 1,898 datasets have loaded observations) reads as a broken catalog | Operational commitment to load more datasets via `ins:load-prod`; INS not yet in default redesign module list |

## Cross-domain patterns

These recur across most domains and should become platform-level UX standards.

1. **Trust/provenance is the product.** Five of eight domains (procurement,
   justice, public companies, public investments, NGOs) name their MVP around a
   profile/detail slice whose centerpiece is source evidence and lineage —
   "Vezi dovada", source links, the publishable name-key dictionary, AMEPIP
   lineage. A shared evidence-viewer / source-citation component pays off across
   all of them.

2. **Honest coverage and data-status labeling is non-negotiable.** Procurement
   (coverage/"data as of"), legal (coverage ribbons + resolution/confidence
   badges), statistics (27-vs-1,871 "available vs catalog only"), public
   investments (PI-1 amount guardrails), and NGOs (confirmed-vs-unconfirmed) all
   require a consistent way to say "this is what we have, this is what we don't,
   and why." A shared data-status/coverage badge system is a cross-domain need.

3. **Entity profiles are the shared spine.** Procurement, justice, public
   companies, and NGOs all recommend anchoring on an entity/company profile
   slice (`/entities/$cui`, `/companies/$cui`, `/ong/$cui`,
   `/intreprinderi-publice/$cui`). **Recommendation:** use a hybrid route
   contract: `/entities/$cui` remains the cross-domain CUI spine and related
   rail; domain routes own domain-first SEO/discovery pages where the user's
   mental model is not "budget entity" (public enterprises, NGOs, legal,
   elections, public investments, statistics).

4. **Identity confidence is a first-class concept.** Justice (person vs
   publishable company keys), elections (candidate source labels vs resolved
   persons), NGOs (name-only vs confirmed records), and public companies (CUI
   links vs duplication) all need a shared, explicit "confirmed / unconfirmed /
   unresolved" visual language and a no-auto-merge policy.

5. **Several MVPs are blocked on a single ops/data gate, not design.** Public
   investments (CA bundle), NGOs (ANAF enrichment), elections (mandate links),
   public companies (supplemental-lane deploy), statistics (load more datasets).
   These are the highest-leverage unblocks for product breadth.

6. **Global search should be publishable-field only in v1.** **Recommendation:**
   index public, source-safe objects first: legal acts, election/contest/
   competitor labels, statistics datasets/territories, public enterprises,
   confirmed NGO CUIs/providers, procurement records, and justice courts/case
   numbers/publishable company-public party keys. Do not index person names,
   raw justice text, unreviewed NGO name-only records, or candidate identities as
   resolved persons.

7. **Design must include low-literacy states, not just expert controls.**
   **Recommendation:** every domain first screen should include a short Romanian
   orientation, no-results state, stale/coverage state, shareable filtered URL,
   export path for analysts, and a "report a data issue/request this dataset"
   action where coverage is partial.

## Recommended build sequence

A pragmatic order that ships the highest-value, lowest-risk slices first and
reuses the entity-profile spine.

- **Wave 0 — platform standards before visual design:**
  - Shared EvidenceViewer / SourceProvenanceDrawer.
  - Shared DataStatusBadge / CoverageRibbon / FreshnessBadge.
  - Shared IdentityConfidenceBadge and PrivacyBoundaryNotice.
  - Hybrid route convention and global-search publishable-field policy.

- **Wave 1 — entity-profile slices (reuse existing infrastructure):**
  - Procurement authority slice on `/entities/$cui` (backend ready; highest data
    volume; replaces an iframe).
  - Justice company-litigation slice on `/entities/$cui` / `/companies/$cui`
    (backend ready; privacy-safe by construction).
  - Public Companies enterprise profile `/intreprinderi-publice/$cui`, linked
    from the shared entity spine (AMEPIP core lane live; fixes wrong landing page
    from global search).
  - NGOs entity profile `/ong/$cui` or `/ong-uri/$cui`, aliased from
    `/entities/$cui`, with evidence trail (data gate-green).

- **Wave 2 — dedicated domain areas (new routes, data-ready):**
  - Legal `/legislatie` (Act detail + status + summary; Portal side
    production-strong).
  - Public Investments landing + objectives map + evidence viewer (data
    gate-green; needs PI-1 amount guardrail).
  - Statistics UAT dashboard + choropleth maps (reuses verified server use cases
    + existing map infra).
  - Elections contest result explorer, 2008–2025 first (largest dataset,
    extraction-verified clean).

- **Wave 3 — advanced / cross-domain (depends on Wave 1–2 + data gates):**
  - Cross-domain money-flow and "follow the money" journeys (procurement ↔
    companies ↔ PNRR ↔ budget ↔ justice litigation).
  - Legal semantic search/RAG and Monitorul full-text browsing (gated on MO
    maturity).
  - Elections → parliament mandate lineage (gated on mandate-link population).
  - Statistics dataset explorer beyond the priority 27 (gated on loading more
    datasets).

## Platform-level UX standards to agree first

These decisions unblock multiple domains and should be settled before Wave 1
builds:

- **Route standard:** hybrid by default. `/entities/$cui` is the shared CUI
  profile and related rail; domain routes own domain-first pages and deep links
  when a generic entity page would hide the public value.
- **Evidence standard:** shared EvidenceViewer / SourceProvenanceDrawer with
  source URL, source authority, snapshot/date, row key, hash, and "report a
  problem" action.
- **Status standard:** shared DataStatusBadge, CoverageRibbon, FreshnessBadge,
  and IdentityConfidenceBadge. These should have stable Romanian copy and not
  rely on color alone.
- **Privacy standard:** organizations and official source labels can be shown
  when publishable; person names are name-nulled by default unless a separate
  source-parity policy is explicitly approved; unresolved identities stay
  candidate/unconfirmed.
- **Global-search standard:** v1 search indexes only fields that are safe to
  publish by policy, with domain-specific routing and a visible source/coverage
  badge on every result.
- **Sharing/export standard:** every analyst-oriented list should support a
  shareable filtered URL; CSV/PDF export is allowed only where coverage and
  privacy gates are explicit.

## How these documents were produced

One specialized `generalPurpose` research sub-agent was created per domain,
running in parallel. Each was instructed to: use the scraper project as the
main source of truth (inventory, `prod-db/*_NOTES.md`, source folders,
migrations, `package.json` scripts); cross-check the client only for UX
alignment; write one file with the exact 17-section structure; label facts,
assumptions, and recommendations inline; and write no code or DB access. Two
agents (legal, NGOs) initially exhausted resources mid-research; both were
re-run with economical-reads guidance and completed (NGOs had already written
its file before the error fired).

## Clarifying Questions for Product Owner (added in review)

1. **Canonical CUI route:** confirm the hybrid route model (`/entities/$cui` as
   shared spine plus domain routes for public enterprises/NGOs/etc.) or choose a
   single canonical route for all organization domains.
2. **Global search v1:** which domains should join search on launch, and which
   publishable fields are allowed for justice, elections, and NGOs?
3. **Person data policy:** keep name-nulled default for persons, or allow
   source-parity display under a separate reviewed policy?
4. **Wave order:** approve Wave 0 standards + Wave 1 entity slices, or move a
   dedicated domain area (legal/public investments/statistics/elections) ahead
   of one entity slice?
5. **Language scope:** Romanian-first v1 with English fallback where source
   metadata exists, or fully bilingual launch copy?
6. **Shared component commitment:** should EvidenceViewer, DataStatusBadge,
   CoverageRibbon, IdentityConfidenceBadge, and PrivacyBoundaryNotice be built
   as platform primitives before domain-specific UI polish?
