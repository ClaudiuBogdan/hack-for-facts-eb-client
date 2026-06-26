# Domain: Laws, Portal Legislativ & Monitorul Oficial (Legislație)

## Review changelog (2026-06-26)

- **Recommendation:** Added a design handoff that makes `/legislatie` and the Act detail page the first design target while keeping Monitorul full-text as coverage-gated.
- **Recommendation:** Standardized required trust components: status badge, citation confidence, coverage ribbon, provenance drawer, and AI-generated summary disclaimer.
- **Assumption:** Portal `document_summaries` can be displayed with an AI provenance line; Monitorul section LLM facets remain hidden unless a publishability policy changes.

> UX / product research note for the `legal` domain (Romanian legal acts and the
> Official Gazette). Scope: product design, public value, and information
> architecture only. No implementation. Labels: **Fact** (grounded in the
> scraper inventory, source notes/schemas, or prod migrations), **Assumption**
> (reasonable inference, labeled), **Recommendation** (proposed UX decision).

---

## 1. Domain Summary

Transparenta.eu's `legal` domain covers Romanian legal acts and the legal
publications that prove them. It is built from two scraper sources that feed a
single production serving schema (`legal.*`):

- **Portal Legislativ** (`transparenta_eu_portal_legislativ`): the linked,
  queryable legal corpus — acts, document expressions, references, status
  events, AI summaries, embeddings, and a resolved citation graph.
- **Monitorul Oficial** (`transparenta_eu_monitorul_oficial`): the Official
  Gazette as the **publication-evidence layer** — issues, act publication
  events, issue tables of contents, lifecycle edges (promulgation, aprobare,
  rectificare, republicare), and PDF custody.

**Fact:** The backend `legal` module already exists with GraphQL + MCP +
Meili/OpenSearch + embeddings + summaries + explanation audio + a Monitorul
contributor (DATA_INVENTORY §"Laws, Portal Legislativ, and Monitorul Oficial",
line ~727-729).

**Fact:** There is **no dedicated legal route in the client** today. The client
route inventory (`src/routes/`) contains `parlament/`, `primarie/`, `maps/`,
`entities/`, `pnrr`, `charts`, etc. but no `legislatie/` or `legal/` route, and
a `legal` grep over `src/routes/` returns no matches. Legal data is reachable
only indirectly via global search and parliament law lineage (DATA_INVENTORY
line ~730-732).

**Fact:** Live serving counts are **223,611 `legal.acts`** and **42,173
`legal.mo_issues`** (DATA_INVENTORY line ~717-718). The raw estate is large:
~225k acts extracted, ~225k AI summaries, ~225k whole-document embeddings, a
**~1.1M-edge citation graph**, and ~318,978 extracted MO sections / ~197,459
index acts in the raw Monitorul DB (BRIEF_PORTAL_LEGISLATIV_SCHEMA.md line ~20;
DATA_INVENTORY line ~713-716).

The product opportunity is to turn this rich backend into a **linked,
understandable legal experience**: not "search for a law," but navigate the
status, amendments, citations, and official publication of any Romanian legal
act, in plain language, with verifiable sources.

---

## 2. Public Value

- **Trust through traceability.** Every claim about an act (status, amendment,
  publication) is backed by source evidence (PDF URL + SHA-256, source issue,
  source spans). Fact: serving tables carry document IDs, source document IDs,
  node paths, source spans, status evidence, PDF URLs, PDF SHA-256, source
  issue IDs, and source MO act keys (DATA_INVENTORY line ~741-744).
- **Understandability.** AI summaries (`document_summaries` with
  `plain_language_summary`, `description`, `summary`, `domains`,
  `affected_audiences`, `keywords`, `fiscal_impact`, `key_dates`) turn dense
  legal text into citizen-readable explanations. Fact: these fields exist in
  the serving schema (`legal.document_summaries`, migration
  `20260612T150000__legal_domain.ts` line ~247-265).
- **"Is this law still in force?"** — the single highest-value public question,
  answered through a derived status (`in-vigoare`, `modificat`, `abrogat`,
  `abrogat-partial`, `suspendat`, `iesit-din-vigoare`, `necunoscut`) folded from
  a status-event substrate, plus "modificat de N acte după publicare." Fact:
  status vocabulary and the event substrate are defined in the `legal.acts` /
  `legal.act_status_events` schema (migration line ~82-85, ~160-172).
- **Citation-graph navigation.** A ~1.1M-edge resolved citation graph lets users
  see what an act modifies/abrogates and what modifies it — the legal lineage
  that no single government portal surfaces well.
- **Publication proof.** The Monitorul layer gives every act its authoritative
  gazette coordinates (issue, part, date, page span, PDF hash) and the
  lifecycle edges only MO can ground (decret→lege promulgation, lege→OUG/OG
  approval). Fact: BRIEF_MONITORUL_SCHEMA.md line ~14-18.
- **The MO-only long tail.** ~84k ministerial orders, agency decisions, and BNR
  circulars that Portal Legislativ does **not** carry — uniquely valuable for
  watchdogs and specialists. Fact: BRIEF_MONITORUL_SCHEMA.md line ~17-18.

---

## 3. Target Users

### Casual public users
Citizens who hear a law referenced in the news ("Legea 227/2015", "OUG 27/2022")
and want to know what it is, whether it still applies, and what it means for
them in plain language. Low legal literacy; need summaries, status badges, and
no jargon.

### Journalists, analysts, NGOs, researchers, watchdogs
Need to trace impact and accountability: who a law affects, what it modifies,
who promulgated/approved it, when it was published, and what downstream acts
depend on it. They need citations, exportable lineage, and links to parliament
bills and institutions. They are the power users of the citation graph and the
MO long tail.

### Domain experts (lawyers, parliamentary watchers, public-admin staff)
Need precision: the exact article/alineat, the canonical vs. consolidated
version, the reference resolution confidence, the republication/rectification
chain, and deep links into MO PDFs. They tolerate dense detail and care about
version correctness and source provenance.

### AI agents (secondary, but a stated product axis)
Fact: the brief explicitly names "AI agents who need correct, cited, current
answers" as consumers (BRIEF_PORTAL_LEGISLATIV_SCHEMA.md line ~17-18), and legal
MCP tools exist (`resolve_legal_filters`, `get_legal_act`, `search_legal_acts`,
`get_legal_act_links`, `get_legal_act_timeline`, `get_legal_node`) (DATA_INVENTORY
line ~733-735). The client UX should assume agentic traffic may surface legal
answers elsewhere and should itself render the canonical, citable views.

---

## 4. Key User Questions

### Questions the product should answer immediately
1. "What is act X?" (title, type, number, year, issuer, plain-language summary).
2. "Is it still in force?" (current status badge + "modificat de N acte").
3. "When and where was it published?" (Monitorul issue, part, date, page span,
   PDF link + hash).
4. "What does it modify / what modifies it?" (top citation neighbors, direction
   of each edge).
5. "When did it enter into force / expire?" (key dates from summaries +
   status events).
6. "Who issued / promulgated / approved it?" (issuer, MO lifecycle edges).

### Questions requiring deeper analysis
1. "Give me the full amendment lineage of this act as a timeline." (status +
   reference events over time; requires `get_legal_act_timeline`).
2. "Which articles were affected by each modifying act?" (target_fragment +
   document_nodes; resolution confidence matters).
3. "Show me everything published in Monitorul issue N of date D." (issue TOC;
   depends on MO extraction maturity).
4. "Which MO-only acts (long tail) mention topic/institution X?" (semantic /
   faceted search over MO sections — advanced, see §14).
5. "Is this the canonical/consolidated version, and what changed between
   versions?" (version cluster: original / republicare / corp / consolidare).
6. "What acts reference this external EU directive / pre-1989 act?" (graph
   closure via `legal.external_acts`).
7. "Trace this law back to its originating parliamentary bill." (cross-domain
   link to parliament `bill_act_links`).

---

## 5. Available Data

### Portal Legislativ (strongly loaded into serving)
Fact: "Portal Legislativ is strongly loaded into legal serving tables"
(DATA_INVENTORY line ~719-720).

- **`legal.acts` (223,611)** — logical act: `act_type`, `act_number`,
  `act_year`, `issuer_slug`, `canonical_document_id`, `display_citation`,
  `status` (7-value vocabulary), `status_evidence` (jsonb), `entry_into_force`,
  `in_degree`. Fact: migration `20260612T150000__legal_domain.ts` line ~73-89.
- **`legal.act_citation_keys`** — identity lookup (type/number/year/issuer →
  act_id); one act can own several citation keys (joint-ministry orders).
  Fact: line ~95-102.
- **`legal.act_aliases`** — alias → act_id (title/colloquial resolution).
  Fact: line ~104-108.
- **`legal.act_documents`** — document expressions: `version_kind` (original,
  republicare, corp, stub-header, consolidare), `version_date`, `is_canonical`,
  typed metadata (`den`, `title`, `issuer_raw`, `publication_raw`,
  `entry_into_force`, `first_publication_date`, `status_markers`,
  `extraction_status`, `compatibility_tier`), and the **MO typed link**
  (`mo_part`, `mo_number`, `mo_date`). Fact: line ~112-134.
- **`legal.act_status_events`** — event substrate (9+3 kinds: abrogare-totala,
  abrogare-partiala, modificare, completare, suspendare, incetare-suspendare,
  republicare, rectificare, iesire-din-vigoare, promulgare, aprobare-oug,
  aprobare-og), with `effective_date`, `source_act_id`, `evidence`, and
  `event_source` (portal | monitorul-oficial). Fact: line ~160-172.
- **`legal.external_acts`** — EU directives/regulations, treaties, pre-1989,
  other. Fact: line ~182-189.
- **`legal.act_references`** — the ~1.1M-edge resolved citation graph:
  relation (modifica, abroga, completeaza, suspenda, aproba, rectifica,
  face-referire, respinge), `target_class`, `target_act_id` /
  `target_external_act_id`, `target_fragment`, `resolution` (unique, cluster,
  alias, ambiguous, unresolved, external), `confidence`, `candidates`,
  `resolver_version`. Fact: line ~197-216.
- **`legal.document_nodes`** — intra-act structure (preambul, carte, titlu,
  parte, capitol, sectiune, articol, alineat, litera, punct, anexa, nota) with
  `path`, `order_index`, `char_start/end`, `splitter_version`. Fact: line
  ~225-241.
- **`legal.document_summaries`** — AI enrichment: `description`, `summary`,
  `plain_language_summary`, `semantic_text`, `document_category`, `domains`,
  `affected_audiences`, `keywords`, `key_dates`, `penalties_mentioned`,
  `fiscal_impact`, `confidence`, model/prompt provenance. Fact: line ~247-265.
- **`legal.document_embeddings`** / **`legal.section_embeddings`** —
  vector(768) embeddings for whole-doc and section-level semantic retrieval
  (config_key, model, dimensions, node_path, article_number,
  source_text_sha256). Fact: line ~269-296.
- **`legal.external_citation_edges`** — candidate citation lane from other
  LLM waves (court decisions, obligation prose, MO sections), kept separate
  from canonical `act_references` until promoted. Fact: migration
  `20260620T120000__legal_external_citation_edges.ts` line ~14-23.
- **Explanation + audio** — Portal has explanation documents/queues and
  explanation-audio (TTS) artifacts. Fact: source folders
  `portal-legislativ/explanation/` and `portal-legislativ/explanation-audio/`;
  scripts `portal-legislativ:explanation-*` (package.json line ~206-209).

### Monitorul Oficial (metadata backbone strong; full-text partial)
Fact: "Monitorul has production serving tables and active extraction workers,
but … remains an active/partial lane" (DATA_INVENTORY line ~719-721).

- **`legal.mo_issues` (42,173)** — gazette issue: `part_code` (PI…PVII),
  `issue_label`, `issue_number`, `issue_suffix`, `issue_year`, `issue_date`,
  `mo_part` (portal bridge), `pdf_url`, `s3_bucket`/`s3_key`, `pdf_sha256`,
  `pdf_bytes`, `has_archive_index`, `has_emonitor_link`, first/last_seen.
  Fact: migration `20260612T230000__legal_mo_backbone.ts` line ~69-97.
- **`legal.mo_act_publications`** — one row per archive-index act = a
  publication event: raw + loader-derived (`act_type`, `act_number_norm`,
  `act_year`, `issue_year`, `issuer_slug`), `act_id` (nullable resolution),
  `resolution` (unique, ambiguous, unmatched), `matched_via` (act-year /
  issue-year). Fact: line ~112-136.
- **`legal.mo_lifecycle_edges`** — MO-only lifecycle: promulga, aproba,
  respinge, rectifica, republica, with target resolution into both identity and
  MO-local planes. Fact: line ~152-178.
- **`legal.mo_issue_toc`** + **`legal.mo_issue_toc_section`** — deterministic
  issue table-of-contents (section counts, page range, trust/provenance) and
  per-section entries (title, section_type, act_number, issuer, page range,
  classification, plus **non-publishable** LLM fields summary/domains/
  institution_names/has_financial_impact flagged `summary_publishable=false`).
  Fact: migration `20260621T120000__legal_mo_issue_toc.ts` line ~41-114.

### Raw Monitorul scale (for coverage expectations)
Fact: raw DB shows 318,978 extracted sections, 197,459 index acts, 59,046
source fetch failures, 44,931 PDF download events, 28,147 index issues, 27,947
PDF queue rows, 27,162 issue extractions (DATA_INVENTORY line ~713-716). The
archive index carries **148,856 acts with issue coordinates and 7,260
promulgation decrees**; **91.6% lege overlap** with Portal (BRIEF_MONITORUL
line ~28-29, ~57).

---

## 6. Missing or Uncertain Data

- **Monitorul full-text is partial and gated.** Fact: "do not treat index
  presence as full text availability" (task brief; DATA_INVENTORY line ~750-751).
  Full text exists for the 2012–2026 text-layer era; pre-2012 needs OCR (a
  documented fork, BRIEF_MONITORUL fork 1, line ~267-268). Coverage before 1990
  is nothing; 1990–2010 + 2021–2026 is archive metadata only until backfill
  (BRIEF_MONITORUL line ~197-199). **UX implication:** every MO view must state
  per-year/per-part what actually exists.
- **MO act promotion into `legal.acts` is gated.** Fact: "No MO-only act enters
  `legal.acts` until gate item 1 is measured" (issuer-slug overlap)
  (BRIEF_MONITORUL line ~194-196). **Assumption:** the MO long tail (~84k
  ministerial orders etc.) is currently queryable on MO-local identity, not
  promoted into the unified act list. **UX implication:** search must clearly
  separate "Portal acts" from "MO-only publications" until promotion lands.
- **Issuer normalization is imperfect.** Fact: ~40% raw issuer-overlap proxy
  with mojibake; 5,067 multi-issuer ordin keys; issuer is part of the join key
  for ordin/decizie/hotarare (BRIEF_MONITORUL line ~56-58). **UX implication:**
  issuer-based filtering may show duplicates/variants; show normalized issuer
  but keep raw as evidence.
- **act_type re-derivation had a regex-order bug (629 mistypes) and ~15%
  untyped** (BRIEF_MONITORUL line ~60, gate item 2). **UX implication:** type
  filters should be tolerant and show an "untyped/other" bucket.
- **Composite numbers** (one row → N citation keys) and **6.5% year drift**
  (act-year vs issue-year) (BRIEF_MONITORUL line ~61, ~141-149). **UX
  implication:** citation search must match on normalized number + accept year
  ambiguity; show "matched via" where relevant.
- **Resolution confidence varies.** `act_references.resolution` can be
  ambiguous/unresolved/external; `mo_act_publications.resolution` can be
  unmatched/ambiguous. **UX implication:** never present an unresolved citation
  as a hard link; show it as "possible match" with the raw text and confidence.
- **Per-section LLM facets are non-publishable by construction.** Fact:
  `summary_publishable=false` for MO TOC sections (migration
  `20260621T120000__legal_mo_issue_toc.ts` line ~97-101). **UX implication:** do
  not surface MO section summaries/domains/institution_names as trusted facts in
  v1; show deterministic outline only.
- **No dedicated client route, no design system precedent** for legal in this
  client. **Assumption:** the legal UI must be designed net-new, aligning with
  existing client patterns (`parlament/`, `entities/`) where possible.
- **Consolidated versions** are a documented fork (original-text-with-warning
  vs crawling portal consolidations) and may not be served by default
  (BRIEF_PORTAL fork 4, line ~181-183). **UX implication:** default to canonical
  expression; mark consolidations explicitly.
- **Parliament bill↔act linkage** exists cross-domain (bill↔act already 93.7%
  without MO; 7,260 promulgation decrees vs 7,922 indexed lege)
  (BRIEF_MONITORUL line ~218-221). **Assumption:** a bill→act link is available
  for cross-domain navigation but not all acts have a bill.

---

## 7. Core Entities and Relationships

**Logical Act** (`legal.acts`) — the abstract work ("Legea 227/2015").
- 1→N **Citation Keys** (`act_citation_keys`) and 1→N **Aliases**
  (`act_aliases`) for identity.
- 1→N **Document Expressions** (`act_documents`): original, republicare, corp,
  stub-header, consolidare; exactly one `is_canonical` per act.
- 1→N **Status Events** (`act_status_events`) folded into the scalar `status`.
- 1→N **Document Nodes** (`document_nodes`) per document — the tree (titlu →
  capitol → sectiune → articol → alineat …).
- 1→N **Summaries** (`document_summaries`) per document — AI enrichment.
- 1→N **Embeddings** (`document_embeddings`, `section_embeddings`) per document.

**Reference Edge** (`legal.act_references`) — directed: a source document's
reference relates (modifica/abroga/…) to a target act (or external act), with
resolution + confidence. The graph is document-scoped and per-document
replaced on re-enrichment. Fact: line ~191-216.

**External Act** (`legal.external_acts`) — EU directives/regulations, treaties,
pre-1989, other; targets of references that fall outside the domestic corpus.

**Monitorul Issue** (`legal.mo_issues`) — a gazette issue (part, label, number,
year, date, PDF custody).
- 1→N **MO Act Publications** (`mo_act_publications`) — publication events,
  each optionally resolved to a `legal.acts` row (nullable `act_id`).
- 1→1 **Issue TOC** (`mo_issue_toc`) → 1→N **TOC Sections**
  (`mo_issue_toc_section`).
- **MO Lifecycle Edges** (`mo_lifecycle_edges`) — promulga/aproba/respinge/
  rectifica/republica between MO act publications; projects `promulgare`/
  `aprobare-oug`/`aprobare-og`/`rectificare`/`republicare` events into
  `act_status_events` with `event_source='monitorul-oficial'`. Fact:
  `20260612T230000` line ~50-53.

**Cross-domain links (designed, not all populated):**
- Act ↔ originating **parliament bill** (`bill_act_links`; ~93.7% without MO).
- Act ↔ **MO publication coordinates** (`act_documents.mo_part/mo_number/
  mo_date` ↔ `mo_issues`).
- Issuer (`issuer_slug`) → future **public-entities/institutions** identity
  (deferred). Fact: BRIEF_PORTAL line ~136-138.

---

## 8. Recommended User Journeys

Each journey progresses **overview → detail → insight**.

### Casual public user
1. **Overview:** Lands on the legal home page; sees "What changed this week in
   law" + a prominent search box accepting a citation ("Legea 227/2015") or a
   topic ("pensii", "salariu minim").
2. **Detail:** Opens the **Act page**: plain-language summary, big status badge
   ("În vigoare · modificat de 12 acte"), key dates, issuer, and the Monitorul
   publication card (issue, date, PDF). Reads or plays the **explanation
   audio** if available.
3. **Insight:** Scrolls to "What this means for you" (from
   `affected_audiences` / `fiscal_impact`) and follows one "modificat de" link
   to see the most recent amendment at a glance.

### Journalist / analyst / watchdog
1. **Overview:** Uses **citation search** to find an act by number/year, or
   faceted search (type, issuer, year, status, domain).
2. **Detail:** Opens the Act page's **Timeline** tab (status + reference events
   over time) and **References** tab (what it modifies / what modifies it,
   with resolution + confidence). Cross-links to the originating **parliament
   bill** and to the **Monitorul issue**.
3. **Insight:** Exports the amendment lineage; jumps to the **MO-only long-tail
   search** to find ministerial orders by the same issuer/institution; pins
   results to compare.

### Domain expert (lawyer / parliamentary watcher)
1. **Overview:** Searches by normalized citation key; uses advanced filters
   (version_kind, resolution, matched_via).
2. **Detail:** Opens the **document tree** (`document_nodes`) for the canonical
   document; navigates to a specific article/alineat; switches to the
   **republication/consolidation** version with a warning badge; opens the MO
   PDF at the cited page span.
3. **Insight:** Inspects an `ambiguous`/`unresolved` reference's `candidates`
   and raw target text; verifies provenance (resolver_version, source spans,
   PDF SHA-256) before relying on it.

### AI agent (rendered via the same canonical views)
1. **Overview:** MCP `search_legal_acts` / `resolve_legal_filters`.
2. **Detail:** `get_legal_act`, `get_legal_act_timeline`, `get_legal_act_links`,
   `get_legal_node`.
3. **Insight:** The client renders the same citable views an agent would cite,
   so human- and agent-facing answers stay consistent. Fact: these MCP tools
   exist (DATA_INVENTORY line ~733-735).

---

## 9. Recommended Information Architecture

1. **Landing page** (`/legislatie`) — domain intro, "what changed this week,"
   prominent citation/topic search, top act types, MO "today in the Gazette."
2. **Search / listing** (`/legislatie/cauta`) — faceted act search (type,
   issuer, year, status, domain, audience) + a toggle between **Portal acts**
   and **MO-only publications** (until promotion lands).
3. **Entity detail — Act** (`/legislatie/$actId` or citation-key route) —
   summary, status, timeline, references, document tree, MO publication, MP
   bill link.
4. **Comparison / lineage** — act-vs-act amendment view; version cluster
   comparison (original vs republicare vs consolidare).
5. **Dashboards / analytics** (`/legislatie/statistici`) — counts by type/year/
   issuer/status; amendment-graph highlights; MO publication volume over time
   (with per-year coverage honesty).
6. **Cross-domain related links** — parliament law lineage (bill → act →
   promulgation decree → MO publication), issuer → institutions (future),
   external EU acts.

**Recommendation:** Mirror the client's existing route conventions
(`parlament/...`, `entities.$cui`) — kebab-case directories, `$param` detail
routes — so `legislatie/` feels native.

---

## 10. Recommended Pages

1. **Legal landing page** (`/legislatie`)
   - Primary content: domain explainer, citation search box, "recently
     modified acts," "today in Monitorul," top domains/audiences, a coverage
     note (what years/parts of MO have full text).
2. **Act search / listing** (`/legislatie/cauta`)
   - Primary content: result list with status badge, type, issuer, year,
     plain-language summary snippet; facets (type, issuer, year, status,
     domain, audience, version_kind); sort by relevance/date/in-degree.
3. **Act detail page** (`/legislatie/$actId`)
   - Primary content: header (display_citation, type, status badge,
     "modificat de N"), plain-language summary + audio, key dates, issuer,
     canonical document selector (version cluster), MO publication card, MP
     bill link, tabs: **Timeline | References | Document tree | MO
     publication | Related**.
4. **Act timeline** (tab or `/legislatie/$actId/timeline`)
   - Primary content: chronological status + reference + MO lifecycle events
     (modificare, abrogare, promulgare, aprobare-oug, rectificare,
     republicare) with source evidence + dates.
5. **References / citation graph** (tab or `/legislatie/$actId/referinte`)
   - Primary content: outgoing edges (what it modifies/abrogates/completes)
     and incoming edges (what modifies it), each with relation, resolution,
     confidence, target fragment, link to target act/external act.
6. **Document tree / node view** (tab or `/legislatie/$actId/$nodePath`)
   - Primary content: tree navigation (titlu/capitol/sectiune/articol/
     alineat), node text, char spans, deep-linkable article identity; source
     span evidence.
7. **Citation search** (`/legislatie/citatie`)
   - Primary content: a single input that parses "Legea 227/2015",
     "HG 1234/2010", "Ordin MS/CNAS 867/541/2011" into normalized keys and
     resolves via `act_citation_keys`/`act_aliases`; shows match confidence
     and "did you mean" candidates for ambiguous/composite numbers.
8. **Monitorul issue page** (`/legislatie/monitorul/$issueId`)
   - Primary content: issue header (part, number, year, date, PDF link +
     hash), deterministic TOC (sections with title/type/issuer/page range),
     per-section links to act publications; coverage/trust badge stating
     whether full text exists for this issue.
9. **MO publication / long-tail search** (`/legislatie/monitorul/cauta`)
   - Primary content: search over MO act publications (type, issuer, year,
     part, date range), clearly labeled as "Monitorul Oficial publications
     (some not in Portal Legislativ)."
10. **Legal analytics dashboard** (`/legislatie/statistici`)
    - Primary content: acts by type/year/issuer/status; amendment graph
       density; MO publication volume; reference resolution health
       (unique/ambiguous/unresolved share).

---

## 11. Recommended Filters and Search

**Searchable (immediately):**
- Free text over `display_citation`, `title`, `den`, `summary`,
  `plain_language_summary`, `keywords` (Meili/OpenSearch projection).
- Citation key parse (type + number + year + issuer) → `act_citation_keys`.
- Alias → `act_aliases`.

**Filterable (facets):**
- `act_type`, `act_year`, `issuer_slug` (normalized, with raw evidence),
  `status` (7-value), `version_kind`, `document_category`, `domains`,
  `affected_audiences`, `entry_into_force` year/date range, MO `part_code`,
  MO `issue_year`/`issue_date` range.

**Sortable:** relevance, publication date, entry-into-force date,
modification count (`in_degree`), recent status change.

**Default serving policy (Recommendation, grounded in the brief):**
- Canonical expressions only; abrogated acts excluded unless the user opts
  into historical mode; every answer carries a status badge + "modificat de N
  acte după publicare." Fact: this is the brief's default serving policy
  (BRIEF_PORTAL line ~124-126).
- Show a "historical mode" toggle for researchers that includes abrogated /
  iesit-din-vigoare acts.

**Reserved as advanced (see §14):** semantic search / RAG over
`document_embeddings` and `section_embeddings`; MO section-level semantic
search (gated on extraction maturity + the publishable flag).

---

## 12. Recommended Visualizations

- **Status badge system** — a consistent 7-status visual vocabulary (in-vigoare
  green, modificat blue, abrogat/abrogat-partial/iesit-din-vigoare red/grey,
  suspendat amber, necunoscut grey) used on every card and detail header.
- **Amendment timeline** — a horizontal timeline of status + reference + MO
  lifecycle events with provenance chips (portal vs monitorul-oficial).
- **Citation graph mini-map** — a small directed graph (incoming vs outgoing
  edges, relation-colored) on the Act page; expandable to a full graph view.
- **Document tree** — a collapsible outline (titlu → capitol → sectiune →
  articol) synced with the document text (char spans).
- **Monitorul issue TOC** — a structured list with page-range bars and
  section-type icons; a coverage ribbon showing which years/parts have full
  text.
- **Version cluster selector** — a compact switcher (original / republicare /
  corp / consolidare) with a "canonical" marker and a consolidation warning.
- **Analytics charts** — acts by type/year/issuer/status (bar/heatmap), MO
  publication volume over time, reference resolution health donut.
- **Plain-language "what this means" panel** — rendered from
  `affected_audiences`, `fiscal_impact`, `penalties_mentioned`, `key_dates`,
  with an explicit "AI-generated, source-verified" provenance line.

**Recommendation:** Prefer deterministic, source-backed visuals; mark any
LLM-derived facet (e.g., MO section summary) as non-publishable / hidden in v1
per the trust model. Fact: MO TOC `summary_publishable=false` by construction
(migration `20260621T120000` line ~97-101).

---

## 13. MVP Features

> MVP targets the strongly-loaded Portal Legislativ serving tables and the MO
> metadata backbone, plus the existing MCP tools. Each feature lists: user
> problem; expected user value; required data; recommended UX pattern; priority
> rationale.

### MVP-1: Act detail page with status + plain-language summary
- **User problem:** "What is this law and is it still in force?"
- **Expected value:** The single most-asked legal question, answered
  immediately and trustworthily.
- **Required data:** `legal.acts` (status, display_citation, type, year,
  issuer, entry_into_force), `legal.document_summaries`
  (plain_language_summary, summary, key_dates, affected_audiences,
  fiscal_impact), `legal.act_documents` (canonical selector). Fact: all
  present in serving.
- **Recommended UX pattern:** Header with display citation + status badge +
  "modificat de N"; a "What this means" panel; key-dates row; canonical
  version selector; provenance footer (source + AI model/prompt version).
- **Priority rationale:** Highest public value, fully data-backed, reuses
  existing summaries/embeddings; the natural landing target for search and for
  cross-domain links from parliament.

### MVP-2: Legal search & listing with facets
- **User problem:** "Find acts about X / by issuer Y / from year Z."
- **Expected value:** Core discoverability; turns 223k acts into a browsable
  corpus.
- **Required data:** Meili/OpenSearch projection over `acts` +
  `document_summaries` (title, summary, type, issuer_slug, year, status,
  domains, audiences); `act_citation_keys`/`act_aliases` for citation matches.
- **Recommended UX pattern:** Search bar + facet sidebar (type, issuer, year,
  status, domain, audience) + result cards with status badges and summary
  snippets; default serving policy (canonical, abrogated hidden) with a
  historical-mode toggle.
- **Priority rationale:** Without listing, the act page is an island; facets
  are cheap over existing projections and match the client's existing listing
  patterns.

### MVP-3: Citation search / resolver
- **User problem:** "I have 'Legea 227/2015' / a joint-ministry order — find
  it."
- **Expected value:** Direct entry for the most common real-world input (a
  citation string); handles composite numbers and aliases.
- **Required data:** `act_citation_keys`, `act_aliases`, `display_citation`;
  normalization (normalizeActNumber / issuerSlug).
- **Recommended UX pattern:** Single input with a parser; results ranked by
  resolution (unique > cluster > alias > ambiguous); "did you mean"
  candidates; clear labeling of composite/joint orders.
- **Priority rationale:** Low effort over existing identity tables;
  disproportionately high usability for all user types; aligns with the
  brief's "correct, cited, current" goal.

### MVP-4: Act timeline (status + amendments)
- **User problem:** "How did this law change over time?"
- **Expected value:** Surfaces the event substrate the backend already
  derives; the differentiator vs. the official portal.
- **Required data:** `act_status_events` (all kinds incl. MO-sourced
  promulgare/aprobare), `act_references` (modificare/abrogare/etc. with
  dates), `key_dates`.
- **Recommended UX pattern:** Horizontal timeline; events colored by kind and
  sourced (portal vs monitorul-oficial chip); click-through to the modifying
  act and to the MO publication.
- **Priority rationale:** Data is already resolved; high journalist/expert
  value; feeds the citation graph tab.

### MVP-5: References / citation graph tab
- **User problem:** "What does this act modify, and what modifies it?"
- **Expected value:** The ~1.1M-edge graph made navigable; core to lineage.
- **Required data:** `act_references` (relation, target_act_id,
  target_external_act_id, target_fragment, resolution, confidence),
  `external_acts`.
- **Recommended UX pattern:** Two columns (outgoing / incoming); relation
  chips; resolution/confidence badges; unresolved/ambiguous shown as
  "possible match" with raw `target_raw` and candidates, never as hard links.
- **Priority rationale:** The graph is the unique asset; resolution honesty
  is a trust requirement.

### MVP-6: Monitorul publication card on the Act page
- **User problem:** "Where was this officially published? Show me the proof."
- **Expected value:** Publication evidence + PDF link for every act that has
  MO coordinates.
- **Required data:** `act_documents.mo_part/mo_number/mo_date` joined to
  `mo_issues` (pdf_url, s3, pdf_sha256, issue_date), `mo_act_publications`.
- **Recommended UX pattern:** A compact "Publicat în Monitorul Oficial" card
  (part, issue, date, page span where available) with a PDF link + hash and a
  link to the full issue page; explicit "publication coordinates only" note
  where full text is unavailable.
- **Priority rationale:** Bridges the two sources on the highest-traffic page;
  establishes the publication-evidence layer without needing full MO
  extraction maturity.

### MVP-7: Legal landing page
- **User problem:** "What is this section and what's new?"
- **Expected value:** Entry point and orientation; surfaces recent changes and
  today's gazette.
- **Required data:** Recent status events (modificare/abrogare), recent MO
  issues (`mo_issues` by issue_date), top domains/audiences.
- **Recommended UX pattern:** Domain explainer, citation search box, "recently
  modified" list, "today in Monitorul" strip, coverage note.
- **Priority rationale:** Cheap to assemble from existing data; gives the
  domain a front door and a place to state coverage honestly.

### High-value next features
- **Document tree navigation** — render `document_nodes` as a collapsible
  outline synced with text; deep-linkable articles. (Required data:
  `document_nodes`; user problem: "show me article 29^1"; high expert value;
  moderate effort.)
- **Version cluster / consolidation view** — switch among original/republicare
  /corp/consolidare with warnings. (Required data: `act_documents`
  version_kind; user problem: "is this the current consolidated text?";
  depends on the consolidation fork decision.)
- **Explanation audio player** — surface existing TTS explanation audio on the
  Act page. (Required data: explanation-audio artifacts; user problem:
  accessibility / listen-on-the-go; low effort, high inclusivity.)
- **Parliament bill cross-link** — link act ↔ originating bill and show
  promulgation decree chain. (Required data: `bill_act_links`, MO lifecycle
  promulga edges; high accountability value; depends on parliament domain
  surface existing.)

---

## 14. Advanced Features

### ADV-1: Semantic search / RAG over document nodes
- **User problem:** "Find the article that says X about Y, in plain meaning."
- **Expected value:** Provision-level retrieval instead of document-level;
  the brief's stated "provision-level RAG."
- **Required data:** `document_embeddings` + `section_embeddings` (vector(768),
  node_path, article_number), `document_nodes`, `document_summaries`.
- **Recommended UX pattern:** A "semantic search" mode returning cited
  article snippets with deep links into the document tree and source-span
  evidence; answers carry a status badge + "modificat de N." Fact: embeddings
  exist; the brief conditions this on "source-text lineage and
  privacy/licensing gates" (DATA_INVENTORY line ~752-753).
- **Priority rationale:** Powerful but depends on lineage/gating clarity and
  embedding-store decisions; reserved until MVP trust is established.

### ADV-2: MO issue full-text browsing & section search
- **User problem:** "Show me everything in this gazette issue, searchable."
- **Expected value:** Unlocks the MO long tail and issue-level exploration.
- **Required data:** `mo_issue_toc` + `mo_issue_toc_section` (deterministic
  outline publishable; LLM facets non-publishable), extracted section text
  (gated on MO-B maturity).
- **Recommended UX pattern:** Issue page with deterministic TOC, page-range
  navigation, PDF deep-link; per-year/part coverage ribbon; section search
  hidden or labeled "experimental" until extraction hardens.
- **Priority rationale:** Fact: MO extraction is active/partial and per-section
  LLM facets are `summary_publishable=false` (migration line ~97-101); must
  not ship as trusted in v1.

### ADV-3: MO long-tail registry & search
- **User problem:** "Find ministerial orders / BNR circulars by issuer/topic."
- **Expected value:** The ~84k MO-only acts Portal doesn't carry — unique
  watchdog value.
- **Required data:** `mo_act_publications` (MO-local identity), issuer
  normalization, eventual promotion into `legal.acts` (gated on issuer-slug
  overlap measurement).
- **Recommended UX pattern:** Dedicated "Monitorul publications" search,
  clearly separated from Portal acts; issuer/institution facets; per-act link
  to the issue and PDF.
- **Priority rationale:** Depends on gate item 1 (issuer-slug overlap) and
  promotion policy; high value but gated.

### ADV-4: Amendment lineage graph explorer
- **User problem:** "Map the full dependency graph of this act and its
  descendants."
- **Expected value:** Expert analysis of cascading amendments; exportable.
- **Required data:** `act_references` (full graph), `in_degree`,
  `external_citation_edges` (candidate lane, promoted high-confidence only).
- **Recommended UX pattern:** Interactive directed graph with relation colors,
  filtering by relation/resolution/date; export (JSON/GraphML/PDF).
- **Priority rationale:** Power-user delighter; candidate-edge promotion must
  be conservative (Fact: `external_citation_edges` are candidates, never
  silently authoritative — migration `20260620T120000` line ~14-23).

### ADV-5: Cross-domain accountability view (act ↔ bill ↔ institution)
- **User problem:** "Who proposed, passed, promulgated, and published this
  law, and which institution issued it?"
- **Expected value:** End-to-end accountability across parliament, legal, and
  (future) institutions.
- **Required data:** `bill_act_links`, MO `mo_lifecycle_edges` (promulga),
  `issuer_slug` → institutions (future).
- **Recommended UX pattern:** A unified "lifecycle" view stitching bill →
  votes → act → promulgation decree → MO publication → amendments.
- **Priority rationale:** High public value but cross-domain; depends on
  parliament + institutions surfaces.

### ADV-6: Personalized / topic alerts
- **User problem:** "Notify me when a law about topic X / by issuer Y
  changes."
- **Expected value:** Watchdog/journalist retention and reuse.
- **Required data:** Status events + summaries (domains/audiences/keywords) +
  the client's existing alerts/campaigns infrastructure.
- **Recommended UX pattern:** Saved searches / topic subscriptions with email
  digests; reuse existing alerts patterns in the client.
- **Priority rationale:** Builds on existing client features; moderate effort.

---

## 15. UX Risks and Edge Cases

- **Presenting unresolved citations as fact.** Risk: an `ambiguous`/
  `unresolved`/`unmatched` reference shown as a hard link destroys trust.
  Mitigation: always show resolution + confidence; render unresolved as
  "possible match" with raw text and candidates. Fact: resolution vocab is
  explicit (migration line ~209-211, ~127-129).
- **Status drift / future-dated abrogations.** Risk: a single scalar status
  can't capture simultaneous modify + partial-abrogate + suspend, or
  future-dated abrogation. Mitigation: badge shows the folded status but the
  timeline shows the full event substrate; future-dated events flagged.
  Fact: the schema comment explicitly calls this out (migration line ~151-154).
- **MO full-text emptiness.** Risk: user expects an issue's full text but only
  metadata exists. Mitigation: per-year/per-part coverage ribbon; "metadata
  only" badge; never imply text where absent. Fact: coverage honesty is a hard
  constraint (BRIEF_MONITORUL line ~197-199).
- **MO/Portal identity confusion.** Risk: conflating act identity (citation
  keys) with publication coordinates. Mitigation: clear UI separation between
  "the act" and "its publication events"; MO-only acts labeled as such.
  Fact: two join planes must never be conflated (BRIEF_MONITORUL line ~61-62,
  ~191-196).
- **LLM-facet leakage.** Risk: showing non-publishable MO section
  summaries/domains as trusted. Mitigation: gate on `summary_publishable`;
  show deterministic outline only in v1. Fact: trust model is per-column
  (migration `20260621T120000` line ~19-24, ~97-101).
- **Composite/joint-order citations.** Risk: "Ordin MS/CNAS 867/541/2011"
  matches multiple keys; user confusion. Mitigation: citation search shows all
  matching keys and the joint-issuer structure.
- **Issuer mojibake / duplicates.** Risk: ugly or duplicate issuer facets.
  Mitigation: display normalized issuer; keep raw as evidence; de-duplicate
  on `issuer_slug`.
- **Consolidation correctness.** Risk: serving a consolidated text that is
  stale vs. the portal's. Mitigation: default to canonical; mark
  consolidations with a warning and a "verify on portal" link. Fact:
  consolidation is an open fork (BRIEF_PORTAL fork 4).
- **Audio/explanation availability gaps.** Risk: a user expects audio that
  doesn't exist for a given act. Mitigation: only show the player when an
  artifact exists; don't promise coverage.
- **Mobile density.** Risk: dense legal text and graphs are hard on mobile.
  Mitigation: mobile-first summary-first layout; collapse tree/graph; PDF deep
  links open external viewer.
- **Accessibility.** Risk: status conveyed only by color. Mitigation: always
  pair color with text label + icon; semantic headings; keyboard-navigable
  tree and graph.

---

## 16. Open Questions

1. **MO promotion policy:** Will MO-only acts be promoted into `legal.acts`
   (gated on issuer-slug overlap, gate item 1)? This decides whether the long
   tail lives in a separate search or a unified one. (Fact: gated,
   BRIEF_MONITORUL line ~194-196.)
2. **Consolidation serving:** Original-text-with-warning vs. crawling portal
   consolidated versions — which do we ship? (Fact: open fork, BRIEF_PORTAL
   fork 4, line ~181-183.)
3. **MO full-text / OCR scope:** Do we run a pre-2012 OCR lane, and what
   per-year coverage can we claim to users? (Fact: open fork, BRIEF_MONITORUL
   fork 1, line ~267-268.)
4. **Embedding-store placement:** pgvector as system of record vs. OpenSearch
   vectors — affects how ADV-1 semantic search is built and scaled. (Fact:
   open platform decision, BRIEF_PORTAL fork 5, line ~183-184.)
5. **Historical mode default:** Should abrogated acts be excluded by default
   across the whole product, or per-page? (Recommendation: global default with
   a toggle; aligns with the brief's default serving policy.)
6. **Cross-domain parity:** Which parliament/institutions surfaces will exist
   to wire bill↔act↔issuer links, and when? (Assumption: parliament surface
   exists; institutions is future.)
7. **AI-facet publication policy for Portal summaries:** Are
   `document_summaries` facets (domains, fiscal_impact, audiences) considered
   publishable to casual users, or do they need an "AI-generated" disclaimer
   pattern? (Assumption: publishable with a provenance line, unlike MO section
   facets which are non-publishable.)
8. **Agentic rendering contract:** Should the client canonical views be the
   single source AI agents cite, to keep human/agent answers consistent? How
   do we version them?

---

## 17. Final Recommendation

- **Best starting point:** A dedicated `/legislatie` area in the client, built
  on the already-strong Portal Legislativ serving tables + MO metadata
  backbone, reusing the existing MCP tools. There is no legal route today, so
  even a thin MVP is a large marginal gain.
- **Highest-value user journey:** Journalist/analyst — citation search → Act
  page (status + plain-language summary) → Timeline → References → MO
  publication + parliament bill link. It exercises the unique assets (status
  substrate, ~1.1M-edge graph, publication evidence, cross-domain lineage) and
  serves all three user types at decreasing density.
- **Most important MVP feature:** **MVP-1, the Act detail page with status +
  plain-language summary.** It answers the most-asked public question, is fully
  data-backed (`acts` + `document_summaries`), and is the natural target for
  search, citation resolver, and cross-domain links.
- **Biggest UX risk:** **Presenting unresolved/partial data as authoritative**
  — unresolved citations, MO metadata mistaken for full text, or non-
  publishable LLM facets shown as fact. Mitigation is consistent: render
  resolution/confidence badges, coverage ribbons, and trust flags everywhere.
- **Biggest data dependency:** **Monitorul full-text and promotion maturity.**
  The Portal side is production-strong; the MO side is active/partial and
  gates ADV-2/ADV-3. The MVP must therefore lean on Portal + MO metadata and
  treat MO full-text features as explicitly labeled, coverage-honest, and
  advanced.
- **Top open questions:** (1) MO promotion policy (separate vs. unified
  search); (2) consolidation serving decision; (3) MO OCR/full-text coverage
  scope; (4) AI-facet publication policy and disclaimer pattern for Portal
  summaries vs. non-publishable MO facets.

## Design Handoff Notes (added in review)

- **Canonical route assumption:** dedicated legal area under `/legislatie`; Act detail is `/legislatie/$actId` or a citation-key variant once URL policy is chosen.
- **Shared components to reuse/build:** LegalStatusBadge, CitationConfidenceBadge, CoverageRibbon, EvidenceViewer / SourceProvenanceDrawer, VersionSelector, AIProvenanceNotice, RelatedLinks rail to parliament and Monitorul.
- **First screen to design:** Act detail header and summary: display citation, status, `modificat de N`, plain-language summary, key dates, MO publication card, and provenance line.
- **Copy guardrail:** never say Monitorul full text is available unless the issue/part/year has text coverage; use `publicatie in Monitorul` for metadata-only and `text disponibil` only where true.
- **Product-owner question:** decide whether Portal AI facets are public-facing with a disclaimer, and whether abrogated acts are hidden globally by default or per page.
