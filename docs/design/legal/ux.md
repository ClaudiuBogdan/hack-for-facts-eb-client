# Legal Domain — UX Handoff (`/legislatie`)

- Source UX document: `docs/ux-research/legal.md`
- Shared foundation: `docs/design/README.md`
- Domain: Romanian legal acts (Portal Legislativ) + the Official Gazette
  (Monitorul Oficial) as the publication-evidence layer.

## Product intent

Turn a large, strongly-loaded legal backend into a **linked, understandable,
verifiable** legal experience. The job is not "search for a law" — it is to let
anyone navigate the status, plain-language meaning, amendments, citations, and
official publication of any Romanian legal act, with the source evidence always
one click away. The Act detail page is the product anchor; everything else feeds
it or branches from it.

## User roles and top jobs

- **Casual public user** (low legal literacy). Top jobs: "What is Legea
  227/2015?", "Is it still in force?", "What does it mean for me?" Needs the
  plain-language summary, a clear status badge, key dates, and optional audio.
- **Journalist / analyst / NGO / watchdog** (power users of lineage). Top jobs:
  trace what an act modifies and what modifies it, who promulgated/approved it,
  where it was published, and which parliamentary bill it came from. Needs
  citations, resolution/confidence honesty, timeline, references, MO long tail,
  and cross-domain links.
- **Domain expert** (lawyer / parliamentary watcher / public-admin). Top jobs:
  the exact article/alineat, canonical vs consolidated version, reference
  resolution confidence, republication/rectification chain, MO PDF at the cited
  page span. Tolerates density; cares about version correctness and provenance.
- **AI agents** (secondary, stated product axis). The client renders the same
  canonical, citable views that MCP tools (`get_legal_act`,
  `get_legal_act_timeline`, `get_legal_act_links`, `get_legal_node`,
  `search_legal_acts`, `resolve_legal_filters`) answer, so human- and
  agent-facing answers stay consistent. (Fact, `legal.md` §3, §8.)

## MVP scope (this domain, in build order)

1. **Act detail — status + plain-language summary** (`act-detail-status-summary`).
   The anchor. Header (display citation, status badge, "modificat de N"),
   plain-language summary, key dates, issuer, MO publication card, version
   selector, provenance footer.
2. **Legal search & listing with facets** (`legal-search-listing`). Faceted act
   search with status badges and summary snippets; Portal-acts vs MO-only
   separation; canonical-default with a historical-mode toggle.
3. **Citation resolver** (`citation-resolver`). Parses "Legea 227/2015",
   "HG 1234/2010", "Ordin MS/CNAS 867/541/2011" into normalized keys and routes
   to the act; "did you mean" for ambiguous/composite numbers.
4. **Act timeline** (`act-timeline`). Chronological status + reference + MO
   lifecycle events with source chips (portal vs monitorul-oficial).
5. **References / citation graph** (`references-citation-graph`). Outgoing vs
   incoming edges with relation, resolution, confidence; unresolved shown as
   "possible match", never a hard link; expandable mini-map.
6. **Monitorul publication card** (`monitorul-publication-card`). "Publicat în
   Monitorul Oficial" card on the Act page with part/issue/date/page span, PDF +
   SHA-256, and an explicit "publication coordinates only" note where full text
   is absent.
7. **Legal landing page** (`legal-landing-page`). Domain front door: citation
   search, "recently modified acts", "today in Monitorul", coverage note.

## High-value next scope

8. **Document tree navigation** (`document-tree-navigation`). `document_nodes`
   as a collapsible outline synced to text; deep-linkable articles/alineate.
9. **Version cluster / consolidation** (`version-cluster-consolidation`). Switch
   among original / republicare / corp / consolidare with a canonical marker and
   a consolidation warning; optional version compare.
10. **Explanation audio player** (`explanation-audio-player`). Surface existing
    TTS explanation audio on the Act page; show only when an artifact exists.
11. **Parliament bill cross-link** (`parliament-bill-cross-link`). Link act ↔
    originating bill and show the promulgation-decree chain.

## Source / data constraints (Facts from `legal.md`)

- **No legal route exists in the client today**; the domain is net-new and must
  align with existing conventions (`parlament/`, `entities/`). (§1, §6.)
- **Portal Legislativ is strongly loaded** into serving: 223,611 `legal.acts`,
  ~225k AI summaries, ~225k whole-doc embeddings, ~1.1M-edge citation graph. The
  Act page, search, citation resolver, timeline, references, and document tree
  are all data-backed today. (§1, §5.)
- **Monitorul metadata backbone is strong; full text is partial and gated.**
  42,173 `mo_issues`. Index presence is NOT full-text availability; full text
  exists for the 2012–2026 text-layer era, pre-2012 needs OCR, 1990–2010 and
  2021–2026 are archive-metadata-only until backfill. Every MO view must state
  per-year/per-part what actually exists. (§5, §6, §15.)
- **MO long tail (~84k ministerial orders / agency decisions / BNR circulars)
  is not promoted into `legal.acts`** until an issuer-slug overlap gate is
  measured. Search must keep "Portal acts" and "MO-only publications" separate
  until promotion lands. (§6, §13, §14.)
- **Resolution confidence varies.** `act_references.resolution` may be
  `ambiguous` / `unresolved` / `external`; `mo_act_publications.resolution` may
  be `unmatched` / `ambiguous`. Never render an unresolved citation as a hard
  link. (§6, §15.)
- **Per-section MO LLM facets are non-publishable by construction**
  (`summary_publishable=false`). Show the deterministic TOC outline only in v1.
  (§6, §12, §15.)
- **Issuer normalization is imperfect** (mojibake, multi-issuer ordin keys,
  ~15% untyped, regex-order mistypes). Show normalized issuer, keep raw as
  evidence, include an "untyped/other" type bucket, tolerate duplicates. (§6.)
- **Consolidated versions are an open fork.** Default to the canonical
  expression; mark consolidations explicitly with a "verify on portal" link.
  (§6, §16.)

## Privacy / provenance constraints

- Every page that shows source-derived data must expose **source, retrieval/
  publication date, and confidence/coverage caveats** near the primary result.
- **AI / plain-language summaries are an explanatory layer, not legal advice.**
  They carry an `AIProvenanceNotice` (model + prompt version, "generat de AI,
  verificat la sursă", "nu constituie consultanță juridică"). Portal
  `document_summaries` facets are publishable with that disclaimer; MO section
  LLM facets are not surfaced in v1. (Review changelog; §16 Q7.)
- **Copy guardrail (hard):** never imply MO full text exists unless the
  issue/part/year actually has text coverage. Use **"Publicat în Monitorul
  Oficial"** / "coordonate de publicare" for metadata-only; use **"text
  disponibil"** only where text truly exists. (§ Design Handoff Notes.)
- **Act identity vs publication coordinates must never be conflated.** "The act"
  (citation keys) and "its publication events" (MO coordinates) are separate UI
  regions; MO-only publications are labelled as such. (§15.)

## Design implications

- One consistent **status vocabulary** (7 values) rendered as text + icon +
  color everywhere an act appears (cards, headers, search rows, timeline).
- A small set of **trust components** reused across every feature: status badge,
  citation-confidence badge, coverage ribbon, provenance drawer, AI-provenance
  notice, evidence link, version selector. Defined once in `design.md`.
- **Tabs on the Act page are nested sub-routes**, mirroring the parliament bill
  detail pattern (route shell + `<Outlet />` + active-tab resolved from
  pathname), so deep links and back/forward work. (Fact: client convention.)
- **Mock-first.** Every feature defines its UI-boundary data shape after the
  serving/MCP contract so later API wiring happens in feature adapters, not by
  rebuilding UI.
- Mobile-first, **summary-first**: dense legal text, trees, and graphs collapse
  on small screens; PDF deep links open the external viewer.

## Blockers

None that prevent MVP build. The four product-policy questions from `legal.md`
§16 (MO promotion → unified vs separate search, consolidation serving, MO
full-text/OCR coverage scope, AI-facet publication policy) are resolved for v1
by defensive defaults recorded in `design.md` and each feature file:
- MO long tail lives in a **separate, clearly-labelled** lane until promotion.
- Default to **canonical**; consolidations are explicit and warned.
- MO full text is **coverage-gated** with a per-year/per-part ribbon; never
  implied.
- Portal AI facets are **publishable with an `AIProvenanceNotice`**; MO section
  LLM facets are **not** surfaced in v1.
If product later overrides any of these, update `design.md` and the affected
feature file before changing behavior.
