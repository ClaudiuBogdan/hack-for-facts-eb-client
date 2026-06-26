# Legal Domain — Design (`/legislatie`)

- Source UX: `docs/ux-research/legal.md`. Shared foundation: `docs/design/README.md`.
- This file: domain patterns first, then implementation decisions, IA/routes,
  components, data model, the feature map, responsive/a11y/i18n/provenance, and
  acceptance. Feature files under `features/` are self-sufficient; this file is
  the shared spine they all reference.

---

## 1. Domain purpose and scope

`/legislatie` is the client's legal task surface: act discovery (search +
citation resolver), the **Act detail page** (status, plain-language meaning,
timeline, references, document tree, MO publication, bill link), and the
**Monitorul issue** publication-evidence surface. MVP leans on the
production-strong Portal Legislativ serving tables and the MO metadata backbone;
MO full text and the MO long tail are coverage-gated and clearly separated.

---

## 2. High-level design patterns

These patterns are domain-wide. Feature files cite them by name instead of
re-specifying.

- **P1 — Evidence-bound claims.** Every status, amendment, citation, or
  publication statement is paired with a way to reach its source (PDF + SHA-256,
  source issue, source spans, resolver version). No claim is terminal; an
  `EvidenceLink` or `SourceProvenanceDrawer` is always reachable.
- **P2 — Resolution honesty.** Anything resolved by the backend (citations, MO
  publication matches) carries its resolution + confidence. `unique`/`cluster`
  render as links; `ambiguous`/`unresolved`/`unmatched`/`external` render as
  **"potrivire posibilă"** with raw text + candidates, never as a hard link.
- **P3 — Identity vs publication separation.** "The act" (citation identity) and
  "its publication events" (MO coordinates) live in distinct UI regions. MO-only
  publications are always labelled "publicație Monitorul Oficial (posibil
  neinclusă în Portal Legislativ)".
- **P4 — Coverage before content.** Any MO surface states per-year/per-part what
  exists (full text vs metadata only) **above** the content, via a
  `CoverageRibbon`. Copy guardrail: "Publicat în Monitorul Oficial" / "coordonate
  de publicare" for metadata-only; "text disponibil" only where true.
- **P5 — AI is an explanatory layer.** Plain-language summaries and Portal
  facets are publishable but always carry an `AIProvenanceNotice` (model +
  prompt version, "generat de AI, verificat la sursă", "nu constituie
  consultanță juridică"). MO section LLM facets (`summary_publishable=false`) are
  not surfaced in v1.
- **P6 — One status vocabulary.** A single 7-value `LegalStatusBadge` (text +
  icon + color) is the only way an act's status is shown anywhere.
- **P7 — Canonical by default, history on demand.** Search and the Act page
  default to the canonical expression; abrogated/historical acts and non-
  canonical versions are opt-in (historical-mode toggle, version selector).
- **P8 — Summary-first density.** Dense detail (document tree, citation graph,
  MO TOC) is progressive: the plain-language summary and status are immediate;
  expert detail is one collapse/tab away. Mobile collapses trees and graphs.
- **P9 — Investigative surfaces, not marketing.** Dense, scannable lists/tables/
  timelines; full-width bands and unframed constrained layouts; cards only for
  repeated records, modals, and framed tools; no nested cards; radii ≤ 8px.
  (Shared foundation.)

---

## 3. Information architecture and routes

**Canonical routes (orchestrator-fixed):**

| Path | Purpose | Feature |
| --- | --- | --- |
| `/legislatie` | Landing / front door | `legal-landing-page` |
| `/legislatie/cautare` | Faceted search & listing | `legal-search-listing` |
| `/legislatie/acte/$id` | Act detail (anchor) — **Rezumat** tab (index) | `act-detail-status-summary` |
| `/legislatie/acte/$id/cronologie` | Act detail — **Cronologie** tab | `act-timeline` |
| `/legislatie/acte/$id/referinte` | Act detail — **Referințe** tab | `references-citation-graph` |
| `/legislatie/acte/$id/structura` | Act detail — **Structură** (document tree) tab | `document-tree-navigation` |
| `/legislatie/citatie` | Citation resolver | `citation-resolver` |
| `/legislatie/monitorul/$id` | Monitorul issue page | `monitorul-publication-card` (issue view) |

- **Fact:** `$id` for an act is `legal.acts.act_id` (string), the same `actId`
  the parliament `actLinks.legalAct.actId` and entity-search `legal_act` hits
  carry. The citation resolver maps a citation string → `actId` →
  `/legislatie/acte/$id`. This resolves the UX doc's open "actId vs citation-key
  route" question: **actId is the canonical URL identity; citation strings are an
  input that resolves to it.**
- **Decision:** Act detail tabs are **nested sub-routes**, mirroring
  `/parlament/proiecte/$billId/{etape,documente,voturi}`. Each tab is a
  `route.tsx` (cache headers) + `route.lazy.tsx` (component) pair under
  `/legislatie/acte/$id/`, with a shared `ActRouteLayout` shell that renders the
  act header + tab nav + `<Outlet />`, and a `resolveActDetailActiveTab(pathname,
  id)` helper. (Fact: this is the client's established detail-page pattern —
  `src/features/parliament/components/bill-route-layout.tsx`,
  `src/features/parliament/lib/bill-detail-nav.ts`.)
- **Decision:** The version selector (original/republicare/consolidare) is a
  **header control on every Act tab**, not a route. It sets a `?versiune=`
  search param (see §5). Version *compare* is a modal/sheet, not a route. The
  `version-cluster-consolidation` feature owns this control.
- **Decision:** The Monitorul issue page (`/legislatie/monitorul/$id`,
  `$id` = `mo_issues` id) is its own surface. The compact MO **card** on the Act
  page links to it. The `monitorul-publication-card` feature owns both the card
  and the issue page.
- **Decision (deferred routes, named for forward-compat, not built in this
  batch):** `/legislatie/monitorul/cautare` (MO long-tail search, ADV-3),
  `/legislatie/statistici` (analytics, §10.10). Feature files may link to them as
  "în curând" but must not depend on them.
- **Decision:** Cross-domain links preserve context with query params
  (`from`, `highlight`) per the shared foundation. Parliament → act uses the
  existing `actLinks.legalAct.actId`; act → bill is added by
  `parliament-bill-cross-link`.

---

## 4. Shared layout and navigation decisions

- **Decision:** Constrained content width `max-w-5xl mx-auto px-6` for reading
  surfaces (Act detail, landing, citation resolver); search/listing uses a wider
  two-column shell (facet rail + results) consistent with existing list pages.
- **Decision:** Page header pattern: `Breadcrumb` (Legislație → … ) + first-level
  page title (`text-xl`–`text-2xl font-semibold tracking-tight`) + a
  `CoverageRibbon`/`FreshnessBadge` line. Reserve large type for the page title
  only; everything else is compact (`text-sm`/`text-xs`).
- **Decision:** The Act page header (display citation + status + "modificat de
  N" + version selector + key actions) is **sticky** on scroll so status and
  identity stay visible while reading tabs.
- **Decision:** A `RelatedLinksRail` (narrow, right column on desktop; collapsed
  section on mobile) carries cross-links: originating bill, MO issue, issuer,
  external EU acts, "acte care îl modifică".
- **Decision:** Sidebar/global nav: add a "Legislație" entry pointing to
  `/legislatie`. Global search `legal_act` hits should route **internally** to
  `/legislatie/acte/$id` (see §6 migration note) instead of the external URL.

---

## 5. URL / search-param state (domain-wide)

Use Zod `validateSearch` with `.optional().catch(undefined)` graceful defaults,
matching `src/schemas/entity-search.ts` and the parliament search schema.
Predictable names from the shared foundation:

- **Search/listing (`/legislatie/cautare`):**
  `q` (string), `type` (repeatable act_type), `issuer` (repeatable issuer_slug),
  `year` (number, entry-into-force or act year), `status` (repeatable 7-value),
  `domain` (repeatable), `audience` (repeatable), `versionKind`,
  `source` = `portal` | `mo` (Portal vs MO-only lane, default `portal`),
  `historical` (boolean, default false → abrogated hidden), `sort` =
  `relevance` | `date` | `inforce` | `indegree` | `recent`, `page`, `pageSize`.
- **Act detail (all tabs):** `versiune` (document expression id, default =
  canonical), `highlight` (node path or reference id to scroll/flash),
  `from` (back-context, e.g. `parlament`).
- **Document tree tab:** `nod` (node `path`, deep-link to an article/alineat).
- **References tab:** `dir` = `out` | `in` | `all` (default `all`),
  `rel` (repeatable relation filter), `res` (repeatable resolution filter).
- **Citation resolver (`/legislatie/citatie`):** `q` (raw citation string).
- **Monitorul issue (`/legislatie/monitorul/$id`):** `sectiune` (TOC section
  anchor), `pagina` (page hint).
- **Decision:** Tabs themselves are pathname-based (nested routes), NOT a `?tab=`
  param — consistent with the bill detail pattern. Ephemeral UI (open popover,
  hovered node) stays local component state.
- **Decision:** Default views render with no params. Invalid params are
  normalized by route Zod validation, never by component effects.

---

## 6. Domain components and reuse plan

### Reuse (existing client primitives — `src/components/ui/`)

`Badge`, `Tabs`, `Table` (+ `@tanstack/react-table`), `Sheet`, `Dialog`,
`Tooltip`, `Select`, `multi-select`, `Skeleton`, `Accordion`, `Collapsible`,
`Breadcrumb`, `Card`, `Separator`, `ScrollArea`, `Command` (cmdk),
`Popover`/`ResponsivePopover`, `Pagination`, `empty-state`, `alert`,
`copy-button`, `filter-tag`, `active-filters-bar`, `LoadingSpinner`. Filter
sidebar reuses `src/components/filters/base-filter/*` (`FilterContainer`,
`FilterListContainer`, `FilterRadioContainer`, `FilterRangeContainer`,
`SelectedOptionsDisplay`). Search input/results/facets/skeleton reuse the
`src/features/entity-search/components/*` pattern. Detail tab shell reuses the
parliament `bill-route-layout` + `bill-detail-nav` pattern.

- **Fact:** the global `searchEntities` GraphQL query + `/experimental/search`
  page already support `docTypes` including `legal_act` and `mo_act`, with
  facets, `county`, `year`, and typed hits (`src/schemas/entity-search.ts`).
  Legal search reuses this contract.
- **Fact:** today `legal_act`/`mo_act` hits route to an **external** URL
  (`src/features/entity-search/lib/entity-search-routing.ts` lines ~15-16);
  `DOC_TYPE_META.legal_act` label = "Legislație", color violet. **Decision:**
  once `/legislatie/acte/$id` ships, update `entityHref` so `legal_act` hits
  route internally to `/legislatie/acte/$id` (keep external fallback when no
  internal id). This is the only existing-file change the domain requires and is
  scoped to the `legal-search-listing` feature's handoff note.

### Reuse (shared foundation components — build once if absent)

`CoverageRibbon`, `DataStatusBadge`, `SourceProvenanceDrawer`, `EvidenceLink`,
`FreshnessBadge`, `IdentityConfidenceBadge`, `RelatedLinksRail`,
`ShareFilteredView`. These are named in `docs/design/README.md` as
cross-domain. Legal is a primary consumer; if another domain has already built
one, reuse it, else build it under a shared location and the legal feature
documents the contract.

### New domain components (legal-specific, under `src/features/legal/components/`)

| Component | Purpose | Built by feature |
| --- | --- | --- |
| `LegalStatusBadge` | The 7-value status vocabulary (text+icon+color). | `act-detail-status-summary` |
| `CitationConfidenceBadge` | Resolution + confidence for a citation/reference (`unique`/`cluster`/`alias`/`ambiguous`/`unresolved`/`external` + score). | `references-citation-graph` |
| `AIProvenanceNotice` | "Generat de AI, verificat la sursă — nu constituie consultanță juridică" + model/prompt version. | `act-detail-status-summary` |
| `ActSummaryHeader` | Sticky header: display citation, type, status, "modificat de N", version selector slot, actions. | `act-detail-status-summary` |
| `WhatThisMeansPanel` | Plain-language summary + affected audiences + fiscal impact + penalties + key dates. | `act-detail-status-summary` |
| `KeyDatesRow` | Entry-into-force / publication / repeal dates, locale-formatted. | `act-detail-status-summary` |
| `VersionSelector` | Switch among document expressions; canonical marker + consolidation warning. | `version-cluster-consolidation` |
| `MonitorulPublicationCard` | "Publicat în Monitorul Oficial" card (part/issue/date/page span, PDF + SHA-256). | `monitorul-publication-card` |
| `MonitorulIssueView` | Issue page: header + deterministic TOC + coverage ribbon. | `monitorul-publication-card` |
| `ActTimeline` | Chronological status + reference + MO lifecycle events; source chips. | `act-timeline` |
| `ReferencesPanel` | Outgoing/incoming reference columns with relation/resolution/confidence. | `references-citation-graph` |
| `CitationGraphMiniMap` | Small directed neighbor graph; expandable. | `references-citation-graph` |
| `DocumentTree` | Collapsible `document_nodes` outline synced to text; deep-linkable. | `document-tree-navigation` |
| `CitationInput` | Single input that parses a citation string and shows candidates. | `citation-resolver` |
| `ExplanationAudioPlayer` | HTML5 audio for TTS explanations; shown only when an artifact exists. | `explanation-audio-player` |
| `ActBillCrossLink` | Act ↔ originating bill + promulgation-decree chain. | `parliament-bill-cross-link` |
| `RelationChip` | Relation label (`modifică`/`abrogă`/`completează`/`suspendă`/`aprobă`/`rectifică`/`face referire`/`respinge`) + direction. | `references-citation-graph` |

- **Decision:** No tree, graph, or audio primitive exists in the shared library
  today (verified). `DocumentTree` builds on `Collapsible`/`ScrollArea`;
  `CitationGraphMiniMap` starts as an SVG/`visx`-light directed mini-graph with a
  tabular fallback; `ExplanationAudioPlayer` is a thin wrapper over the native
  `<audio>` element. None require a new heavy dependency for MVP.

### Status vocabulary (single source of truth — `LegalStatusBadge`)

| `status` value | Romanian label | Color intent | lucide icon |
| --- | --- | --- | --- |
| `in-vigoare` | În vigoare | emerald | `CheckCircle2` |
| `modificat` | Modificat | blue | `PencilLine` |
| `abrogat` | Abrogat | red | `Ban` |
| `abrogat-partial` | Abrogat parțial | orange | `CircleSlash` |
| `suspendat` | Suspendat | amber | `PauseCircle` |
| `iesit-din-vigoare` | Ieșit din vigoare | slate | `Archive` |
| `necunoscut` | Necunoscut | slate | `HelpCircle` |

- **Decision:** Because the existing `Badge` `success` variant is muted and
  `warning` is amber-only, `LegalStatusBadge` is a dedicated component with
  explicit Tailwind classes per status and an icon + text label (never
  color-only). Border radii ≤ 8px. It also renders a "modificat de N acte"
  suffix when `in_degree`/modification count > 0.

---

## 7. Data model at the UI boundary (mock-first)

Mock shapes are shaped after the serving schema so API wiring later happens in
`src/features/legal/api/`. Field names mirror the migration columns from
`legal.md` §5. Each feature file restates the subset it needs; this is the
canonical superset.

```ts
// One act (legal.acts + canonical document_summaries projection)
type LegalAct = {
  actId: string                 // legal.acts.act_id
  displayCitation: string       // "Legea nr. 227/2015"
  actType: string               // lege | oug | og | hg | ordin | decizie | ... | other
  actNumber: string
  actYear: number
  issuerSlug: string            // normalized; raw kept as evidence
  issuerRaw: string | null
  status: LegalStatus           // 7-value vocabulary
  modificationCount: number     // in_degree / "modificat de N"
  entryIntoForce: string | null // ISO date
  canonicalDocumentId: string
  summary: {                    // legal.document_summaries (AI; needs AIProvenanceNotice)
    plainLanguageSummary: string | null
    summary: string | null
    description: string | null
    domains: string[]
    affectedAudiences: string[]
    keywords: string[]
    keyDates: { label: string; date: string }[]
    fiscalImpact: string | null
    penaltiesMentioned: string[]
    confidence: number | null
    model: string | null        // provenance
    promptVersion: string | null
  } | null
  versions: ActDocumentVersion[]  // version cluster
  mo: MonitorulPublication | null // publication coordinates
  billLink: ActBillLink | null    // cross-domain
  source: SourceProvenance
}

type LegalStatus =
  | 'in-vigoare' | 'modificat' | 'abrogat' | 'abrogat-partial'
  | 'suspendat' | 'iesit-din-vigoare' | 'necunoscut'

type ActDocumentVersion = {        // legal.act_documents
  documentId: string
  versionKind: 'original' | 'republicare' | 'corp' | 'stub-header' | 'consolidare'
  versionDate: string | null
  isCanonical: boolean
  extractionStatus: string | null
  moPart: string | null; moNumber: string | null; moDate: string | null
}

type StatusOrReferenceEvent = {    // act_status_events ∪ act_references (timeline)
  id: string
  kind: string                     // modificare | abrogare-totala | abrogare-partiala | suspendare |
                                   // incetare-suspendare | republicare | rectificare | iesire-din-vigoare |
                                   // promulgare | aprobare-oug | aprobare-og | completare
  effectiveDate: string | null
  eventSource: 'portal' | 'monitorul-oficial'
  sourceActId: string | null       // the modifying act (click-through)
  sourceActCitation: string | null
  targetFragment: string | null    // affected article/alineat
  evidence: SourceProvenance | null
  futureDated: boolean             // effectiveDate in the future → flag
}

type ReferenceEdge = {             // act_references
  id: string
  direction: 'out' | 'in'
  relation: 'modifica' | 'abroga' | 'completeaza' | 'suspenda'
          | 'aproba' | 'rectifica' | 'face-referire' | 'respinge'
  targetClass: 'act' | 'external'
  targetActId: string | null
  targetExternalActId: string | null
  targetLabel: string              // display_citation or external label
  targetFragment: string | null
  targetRaw: string                // raw cited text (for unresolved)
  resolution: 'unique' | 'cluster' | 'alias' | 'ambiguous' | 'unresolved' | 'external'
  confidence: number | null
  candidates: { actId: string; label: string; score: number }[]
  resolverVersion: string | null
}

type DocumentNode = {              // document_nodes (tree)
  path: string                     // deep-link identity
  nodeType: 'preambul' | 'carte' | 'titlu' | 'parte' | 'capitol' | 'sectiune'
          | 'articol' | 'alineat' | 'litera' | 'punct' | 'anexa' | 'nota'
  label: string                    // "Articolul 29^1"
  orderIndex: number
  charStart: number | null; charEnd: number | null
  text: string | null
  children: DocumentNode[]
}

type MonitorulPublication = {      // act_documents.mo_* joined to mo_issues
  issueId: string | null           // → /legislatie/monitorul/$id
  partCode: string                 // PI..PVII
  issueNumber: string
  issueYear: number
  issueDate: string                // ISO
  pageStart: number | null; pageEnd: number | null
  pdfUrl: string | null
  pdfSha256: string | null
  hasFullText: boolean             // P4: drives "text disponibil" vs "coordonate de publicare"
  resolution: 'unique' | 'ambiguous' | 'unmatched'
}

type MonitorulIssue = {            // mo_issues + mo_issue_toc
  issueId: string
  partCode: string; issueLabel: string; issueNumber: string; issueYear: number
  issueDate: string
  pdfUrl: string | null; pdfSha256: string | null; pdfBytes: number | null
  hasFullText: boolean
  toc: {                           // mo_issue_toc_section (deterministic only)
    sectionId: string
    title: string
    sectionType: string | null
    actNumber: string | null
    issuer: string | null
    pageStart: number | null; pageEnd: number | null
    actPublicationId: string | null  // → resolved act, when resolution is unique
    resolution: 'unique' | 'ambiguous' | 'unmatched'
    // NOTE: LLM facets (summary/domains/institution_names) are summary_publishable=false → NOT mapped
  }[]
  coverage: CoverageInfo
}

type ActBillLink = {               // parliament actLinks (reverse) + mo promulgare
  billKey: string
  billTitle: string
  relationshipKind: string         // becomes_law | ...
  resolutionStatus: string         // linked | ...
  confidenceLabel: string          // high | medium | low
  promulgationDecree: { actId: string | null; label: string; moIssueId: string | null } | null
}

type SourceProvenance = {
  sourceName: 'portal-legislativ' | 'monitorul-oficial'
  sourceUrl: string | null
  retrievedAt: string | null
  publishedAt: string | null
  parserNotes: string | null
  sha256: string | null
}

type CoverageInfo = {
  hasFullText: boolean
  note: string                     // human-readable per-year/per-part statement
  lane: 'portal' | 'mo'
  freshness: string | null         // "actualizat la …"
}
```

- **Decision:** `LegalDataStatus` (`live` | `mock` | `partial` | `stale` |
  `blocked` | `unverified`) drives `DataStatusBadge`. MVP renders `mock`; the
  adapter swaps to `live`/`partial` without UI changes.
- **Assumption:** exact GraphQL field names for the legal queries are not in the
  UX doc; mock shapes follow the migration column names from `legal.md` §5. The
  implementing agent must map them in the feature adapter and reconcile against
  the real `legal` GraphQL schema; treat any field whose existence a UI decision
  hinges on as an **Assumption** until verified.

---

## 8. Feature implementation map

MVP first, then high-value next (build order = file order):

1. `act-detail-status-summary` — the anchor. Ships `ActRouteLayout`,
   `ActSummaryHeader`, `LegalStatusBadge`, `WhatThisMeansPanel`, `KeyDatesRow`,
   `AIProvenanceNotice`, provenance footer. Leaves tab slots for 4/5/8.
2. `legal-search-listing` — faceted search/listing; reuses entity-search +
   base-filter; feeds the Act page; updates `entityHref` for internal routing.
3. `citation-resolver` — `CitationInput` parser → actId → Act page; "did you
   mean" candidates.
4. `act-timeline` — `ActTimeline` on the `cronologie` tab.
5. `references-citation-graph` — `ReferencesPanel` + `CitationGraphMiniMap` +
   `CitationConfidenceBadge` + `RelationChip` on `referinte` tab.
6. `monitorul-publication-card` — `MonitorulPublicationCard` (Act page) +
   `MonitorulIssueView` (`/legislatie/monitorul/$id`) + `CoverageRibbon`.
7. `legal-landing-page` — front door; reuses search box, recent-changes list,
   "today in Monitorul" strip, coverage note.
8. `document-tree-navigation` — `DocumentTree` on `structura` tab.
9. `version-cluster-consolidation` — `VersionSelector` header control + compare.
10. `explanation-audio-player` — `ExplanationAudioPlayer` on the Act page.
11. `parliament-bill-cross-link` — `ActBillCrossLink` in the related rail.

---

## 9. Responsive behavior

- **Decision:** Mobile-first, summary-first. Act page: header collapses to
  citation + status + "modificat de N"; tabs become a horizontally scrollable
  tab bar (or a `Select` on very narrow screens); `RelatedLinksRail` moves below
  content as a collapsed section; `DocumentTree` and `CitationGraphMiniMap`
  collapse to a node list / tabular fallback.
- **Decision:** Search/listing collapses the facet rail into a `Sheet`
  triggered by a "Filtre" button on mobile; results remain a single column.
- **Decision:** MO PDF links open the external viewer in a new tab on all
  breakpoints (no embedded PDF in MVP).

---

## 10. Accessibility, i18n, privacy, provenance (domain-wide)

- **Accessibility:** all controls keyboard reachable and labelled; status badges
  pair color with text + icon (never color-only); tables keep semantic markup +
  column headers; the document tree is a keyboard-navigable `tree`/`treeitem`
  ARIA structure; the citation graph has an adjacent tabular fallback; sheets/
  dialogs manage focus and have clear headings + close controls; icon-only
  buttons have `aria-label`; decorative icons `aria-hidden`.
- **i18n:** all user-facing text uses Lingui macros; Romanian primary. Dates,
  numbers, page spans, vote/edge counts use locale-aware formatting. Legal
  acronyms (OUG, OG, HG, MO, BNR, CNAS) are expanded in visible context or a
  tooltip on first use per surface — never bare on their own.
- **Privacy:** legal acts are public institutional records; the sensitive
  surface here is **not** personal data but **trust** — unverified citations,
  metadata mistaken for full text, AI facets mistaken for fact. The mitigations
  are P1–P5. No `PrivacyBoundaryNotice` is required for acts themselves.
- **Provenance:** every Act page and MO surface exposes source, retrieval/
  publication date, and confidence/coverage near the primary result via
  `CoverageRibbon` + `SourceProvenanceDrawer` + `AIProvenanceNotice`. Copy
  guardrail P4 is mandatory.

---

## 11. Acceptance criteria (domain)

- Every act-bearing surface shows the act's status via `LegalStatusBadge` (text
  + icon + color) and never communicates status by color alone.
- The Act page renders header + plain-language summary + key dates + MO card +
  provenance footer from mock data with no API, and exposes Cronologie,
  Referințe, and Structură as deep-linkable nested routes.
- No `ambiguous`/`unresolved`/`unmatched`/`external` citation is ever rendered as
  a hard link; each shows raw text + candidates + confidence.
- No MO surface states "text disponibil" unless `hasFullText` is true; a
  `CoverageRibbon` precedes MO content.
- AI/plain-language summaries always render with an `AIProvenanceNotice`; MO
  section LLM facets are not shown.
- Portal acts and MO-only publications are visually and routinely separated.
- All routes validate search params via Zod and render defaults with no params.
- `yarn typecheck` passes; user-facing strings use Lingui macros.

---

## 12. Open questions (blockers only)

None block MVP. The four product-policy questions from `legal.md` §16 are
resolved for v1 by the defensive defaults in §2/§3 and recorded per feature. A
non-blocking handoff item: when `/legislatie/acte/$id` ships, update
`src/features/entity-search/lib/entity-search-routing.ts` so `legal_act` hits
route internally — owned by `legal-search-listing` (it does not block any other
feature).
