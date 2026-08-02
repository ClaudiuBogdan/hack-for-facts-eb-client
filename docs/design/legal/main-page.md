# Legislation — module main page (`/legislation`)

> Design decisions for the domain front door: header, tabs, and the Prezentare
> (overview) tab. Decided 2026-08-01. Supersedes the route and landing-page
> sections of `docs/design/legal/design.md` §3–§4 and
> `features/legal-landing-page.md`; everything else in those files still stands.
>
> Structural reference: `/parlament` (`src/features/parliament/`), per DESIGN.md
> §Reference Patterns. Product reference: parliament.uk + legislation.gov.uk.

---

## 1. Route — `/legislation` (decided, overrides the Romanian-slug convention)

The DESIGN.md decision log (2026-06-26) fixed Romanian slugs for new public
domains and named `/legislatie`. **The product owner has chosen `/legislation`**
after that trade-off was put to them. This is a deliberate, recorded exception,
not an oversight.

Sub-routes follow English too, matching the `/procurement/contracts` precedent
rather than mixing languages inside one path:

| Path | Tab | Feature |
| --- | --- | --- |
| `/legislation` | **Prezentare** (index) | this document |
| `/legislation/search` | **Caută** | `legal-search-listing` |
| `/legislation/acts` | **Acte** | `legal-search-listing` (directory mode) |
| `/legislation/acts/$actId` | — | `act-detail-status-summary` (Rezumat, index) |
| `/legislation/acts/$actId/timeline` | — | `act-timeline` |
| `/legislation/acts/$actId/references` | — | `references-citation-graph` |
| `/legislation/acts/$actId/structure` | — | `document-tree-navigation` |
| `/legislation/changes` | **Modificări** | new — **blocked on server, see §6** |
| `/legislation/gazette` | **Monitorul Oficial** | `monitorul-publication-card` |
| `/legislation/gazette/$issueId` | — | `monitorul-publication-card` (issue view) |
| `/legislation/guide` | **Ghid** | new — static/editorial |

**UI labels stay Romanian** (via Lingui) regardless of the path language — the
path is an identifier, the label is content.

### Follow-on edits this decision requires

- `DESIGN.md` §Domain Map: change the Legal row route to `/legislation`; append a
  decision-log entry recording the exception and why.
- `docs/design/legal/design.md` §3 and the 11 files in `features/`: they say
  `/legislatie`. Update paths on next touch; they are otherwise still correct.
- Delete the empty scaffolded folders `src/routes/legislatie/` and
  `src/routes/legislatie/acte/`.
- `src/features/entity-search/lib/entity-search-routing.ts`: `legal_act` hits
  currently open `legislatie.just.ro` externally. Once `/legislation/acts/$actId`
  exists, add it to `DOC_ID_ROUTES` (`docId` is already the act id — the existing
  test uses `'lege-227-2015'`), keeping the external `url` as fallback.
- Sidebar/global nav: add a **Legislație** entry.

---

## 2. Header — "Parliament twin" (Option A)

Structurally identical to `ParliamentShell`
(`src/features/parliament/components/parliament-shell.tsx`), re-skinned. Build it
as `LegislationShell` with the same anatomy so the two modules read as siblings.

```
<header> border-b-2, max-w-7xl px-4 sm:px-6 lg:px-8
  hero (pt-10 pb-8 sm:pt-14 sm:pb-10, relative, xl:min-h-[32rem])
    ├─ decorative illustration, right 74%, xl+ only, aria-hidden
    ├─ Info button (top-right, h-9 w-9, border-2, opens the data sheet)
    ├─ h1 — "Legislația / României", two lines
    │    font-black, leading-[0.85], tracking-tight,
    │    clamp(2.5rem, 7vw, 5.5rem)   ← reuse parliamentHeaderTitleStyle
    ├─ lede — max-w-[40rem], text-[1.125rem] leading-8
    ├─ meta line — text-base text-muted: source · corpus size · freshness
    └─ stat chips — border-2, bg-card, px-3 py-2, tabular-nums
  border-t-2
  <LegislationTabNav />
</header>
<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
```

**Copy:**

- **H1** — `Legislația` / `României`
- **Lede** — "Fiecare lege, ordonanță și hotărâre publicată în România — cu
  statutul ei actual, ce a modificat, ce a modificat-o, și numărul din Monitorul
  Oficial în care a apărut."
- **Meta** — `Portal Legislativ · {n} acte · actualizat {date}`
- **Chips** — 4 max. Only `legalActs(...).totalCount` figures are servable
  (see §5); the gazette total is **not**, so either add the aggregate in §6 or
  drop that chip. Do not hardcode it.

**Theme file:** `src/features/legal/lib/header-theme.ts`, mirroring
`parliament/lib/header-theme.ts`. Components import class strings; they never
inline them (DESIGN.md §Reference Patterns).

**Accent:** violet `#512178`. Not invented — `DOC_TYPE_META.legal_act` in
`src/features/entity-search/lib/doc-type-meta.ts` already colours legal hits
violet, and it is already in the parliament palette as
`PARLIAMENT_RESOURCE_PURPLE`. One accent per page, used only on the active tab
indicator, resource-card icons, and rank fill bars.

**Illustration:** parliament ships a bespoke allegory PNG at 768/1280w. Legislation
needs its own or the hero renders lopsided at `xl`. Until one exists, drop the
image block and let the text column run full width — do **not** substitute stock
art (DESIGN.md §Restraint).

---

## 3. Tabs — mirror Parliament (Option A)

Seven tabs, pathname-based nested routes (not `?tab=`), matching the bill-detail
pattern in `parliament/lib/bill-detail-nav.ts`.

| Label | Path | Servable today? | Built? |
| --- | --- | --- | --- |
| Prezentare | `/legislation` | yes | yes |
| Analiză | `/legislation/analytics` | yes | yes |
| Caută | `/legislation/search` | yes — `legalSearch` | no |
| Acte | `/legislation/acts` | yes — `legalActs` + full facet set | no |
| Modificări | `/legislation/changes` | **no — needs §6.1** | no |
| Monitorul Oficial | `/legislation/gazette` | yes — `moIssues` (year required) | no |
| Ghid | `/legislation/guide` | yes — editorial | no |

**Analiză sits second, not last.** An analytics tab normally goes at the end, but
this one holds the corpus figures that were on the landing page until 2026-08-01
(§4A). Putting it behind four disabled tabs would make them harder to reach than
before they moved, which defeats the point of moving them.

Nav component copies `ParliamentTabNav` exactly: horizontal scroll with
`hide-scrollbar`, `scrollIntoView({inline:'nearest'})` on the active tab at
mount, and the no-JS `h-[3px]` underline toggled by `opacity`.

**If §6.1 does not land before ship, cut the Modificări tab** rather than
shipping it empty. Five tabs is fine; a tab that renders "nimic de afișat" over a
dataset of 84,420 status events is a lie about the data.

---

## 4. Prezentare — the finding aid

Started as "Corpus at a glance" (Option B). **Narrowed 2026-08-01**: every band
that describes the corpus rather than helping you get into it moved to §4A. What
is left answers one question — where is the act I need — by search, by subject,
or by the gazette issue that proves publication.

The header's three stat chips stay on every tab, so the page is not numberless.

Stacked full-width bands, `space-y-10`, no nested cards. Order top to bottom:

### 4.1 Search band — unframed

Full-width input + primary button, example chips beneath. **No section wrapper,
no heading, no description**: the input is the first thing on the page rather
than a card built around one. Decided 2026-08-01 after seeing it framed.

Examples as chips: `Codul Fiscal` · `OUG 57/2019` · `Legea 98/2016` ·
`salariul minim`. Chips fill the input, they don't submit.

Submit behaviour, once the routes exist: run `legalResolve(dim:'act', q)`; a
confident citation hit navigates straight to `/legislation/acts/$actId`, anything
else goes to `/legislation/search?q=`. **Until then it hands off to
`/experimental/search?types=legal_act`** — the global index already carries legal
acts, so the box works from day one instead of being inert.

### 4.1b No coverage ribbon

DESIGN.md's canonical page shell puts a `CoverageRibbon` under the header. This
page deliberately does not have one: above the fold it read as noise, and the
caveats it compressed into "5 goluri cunoscute" are stated in full prose by §4.4,
where they can actually be understood.

What must not be lost with it is the **trust label** — mock data may never render
as served truth. The `DataStatusBadge` therefore moved into the header meta line.
If a future edit removes that badge too, the page violates DESIGN.md
§Mock-First Contract.

### 4.2 Domain grid — 16 cells

Name · count · thin proportion bar. Links to `/legislation/acts?domain=…`.

Counts need 16 `totalCount` queries. **Ship without counts** (chips only, zero
queries) until §6.2 lands, then add them. A chip grid with no numbers is honest;
16 round-trips on a landing page is not acceptable.

Domains are the AI-derived controlled 16-value vocabulary from
`document_summaries.domains` — **not** law. The band carries an
`AIProvenanceNotice`: "Domeniile vin din rezumate generate automat, nu din textul
legii."

### 4.3 Two half-width bands: latest gazette issues · recent changes

- **Ultimele numere de Monitor** — `moIssues(filter:{year: currentYear}, sort:
  ISSUE_DATE_DESC, pageSize: 5)`. Servable. Badge says **"PDF oficial"** or
  **"doar coordonate"**, derived from `pdfUrl`/`hasEmonitorLink`. It may never
  say "text disponibil" — see §6.3.
- **Modificate recent** — blocked on §6.1. If it doesn't land, let the gazette
  band run full width rather than shipping a placeholder.

### 4.4 Honesty band — page footer

The caveats from §7 as a titled band ("Ce nu vă putem spune încă"), in prose, with
the measurement date. The Constitutional Court item leads and carries the warning
icon; it is the only over-claim on the page, so it does not get to be the fifth
bullet in a ribbon tooltip.

---

## 4A. Analiză — `/legislation/analytics`

What the corpus looks like as a whole. Built 2026-08-01 by moving §4A.1 and
§4A.2 off the landing page: they describe the corpus, they do not help you find
an act, and the front door's job is finding.

Shares `useLegislationOverview` with Prezentare — the same query key, so
switching tabs costs no request and the loader on either route warms both.

### 4A.1 KPI strip — 4 tiles

| Tile | Value | Query |
| --- | --- | --- |
| Acte normative | 224.369 | `legalActs(first:1).totalCount` |
| În vigoare | 193.981 (86,5%) | `+ filter:{status:{in:["in-vigoare"]}}` |
| Modificate | 6.542 | `+ filter:{status:{in:["modificat"]}}` |
| Abrogate | 22.125 | `+ filter:{status:{in:["abrogat"]}}` |

Three-tier text only: uppercase muted label → `text-[2.1rem] font-extrabold
tabular-nums` value → muted meta line. Pattern is PNRR `InsightCard`.

### 4A.2 "Actele pe care se sprijină restul legislației"

The single best block in the module, and it is free: `legalActs(sort: IN_DEGREE,
dir: DESC, first: 7)` is the server's **default sort**. It surfaces the Codul
Fiscal / Codul Muncii / Codul Civil tier — exactly where a beginner should start,
and exactly what an analyst wants ranked.

Ranked rows with an inline absolute-positioned fill bar at ~9% alpha
(PNRR `RankedListCard`), no chart library. Row = rank · display citation ·
`LegalStatusBadge` + `actType · issuerSlug · actYear` · `inDegree` right-aligned
in tabular figures, labelled "citări primite".

Caption the metric in one line — "câte alte acte îl citează" — or the number is
meaningless to a first-time reader.

### 4A.3 Honesty band — repeated, deliberately

The same band as §4.4, rendered again here. This is not an oversight: the route
is independently linkable and it carries the strongest numeric claims in the
module, so a reader arriving from a shared link must see the Constitutional Court
caveat without navigating away. Caveats travel with the claim
(DESIGN.md §Data Trust & Provenance).

### 4A.4 Corpus composition — **not built**

Planned for this tab: act-type vocabulary, issuer list, external-act breakdown
(10.933 treaties · 4.370 EU directives · 2.589 EU regulations).

Deferred deliberately. The citation-graph quality figures that were its main
payload (627.759 internal / 75.468 external / 400.368 unresolved) live in the
honesty band, where they belong — they are a caveat, not a curiosity. What
remains is static vocabulary that reads better as facets on `/legislation/acts`
than as a drawer here. Revisit once that directory exists.

---

## 5. What the server can serve today

`src/modules/legal/` is **on the server's `dev` branch** — shell (Portal) + mo
(Monitorul), with GraphQL, MCP and DataLoaders.

**Queries:** `legalAct(actId|citation)` · `legalActs(filter, sort, dir, first,
after)` · `legalSearch(q, filter, channel, includeHistorical, limit)` ·
`legalResolve(dim, q)` · `legalExternalAct` · `moIssue` · `moIssues` (year
required) · `moPublication` · `moPublications` (≥1 bounding predicate) ·
`moEdges` · `moPublicationsByIssuerYear` · `moResolve`.

**`LegalAct` lazy fields:** `canonical` · `summary` · `aliases` · `citationKeys` ·
`versionCount` · `amendedAfterPublication` · `documents` · `links(direction,
relation)` · `timeline` · `tree(documentId, path, depth)` · `gazettePublications`
· `gazetteStatusEvents` · `gazetteInEdges`.

**Act filters:** `actType` · `issuerSlug` · `status` · `year`/`yearFrom`/`yearTo`
· `domain` · `category` · `penaltiesMentioned` · `fiscalImpactNull` · `q`.
**Sorts:** `in_degree` (default) · `act_year` · `entry_into_force` ·
`display_citation`.

**Prod row counts** (measured 2026-06-29, finish closed 2026-07-01 —
`prod-db/LEGAL_CURRENT_STATE.md`, `LEGAL_DATA_BRIEF.md`):

| Table | Rows | Feeds |
| --- | ---: | --- |
| `legal.acts` | 224.369 | KPIs, directory, status |
| `legal.act_documents` | 226.161 | version selector (only 975 acts have >1) |
| `legal.act_status_events` | 84.420 | act timeline (portal 71.694 / MO 12.726) |
| `legal.act_references` | 1.103.595 | citation graph, `in_degree` sort |
| `legal.external_acts` | 20.779 | EU/treaty references |
| `legal.document_nodes` | 1.223.861 | article tree — **absent for ~31% of docs** |
| `legal.document_summaries` | 224.950 | plain-language summary, domains, category |
| `legal.section_embeddings` | 2.938.113 | semantic search (768d, HNSW) |
| `legal.mo_issues` | 42.173 | gazette browse |
| `legal.mo_act_publications` | 212.221 | publication evidence — **46,4% matched** |
| `legal.mo_lifecycle_edges` | 21.086 | promulgation/approval chain |
| `legal.mo_issue_toc_section` | 309.556 | issue table of contents |

Status split: `in-vigoare` 193.981 · `abrogat` 22.125 · `modificat` 6.542 ·
`abrogat-partial` 762 · `iesit-din-vigoare` 124 · `suspendat` 55 · `necunoscut` 22.

Summary coverage: plain-language 100% · fiscal impact 25,5% · penalties 13,4%.

**Raw-only, not in prod** — so nothing can render them: citizen explanations
72.111 (+355.857 claims), Romanian TTS audio 26.290, provision microstructure
~563k, typed obligations ~482k, defined terms ~91k. The
`ExplanationAudioPlayer` in the June spec has nothing to play; drop it from
scope until projected.

---

## 6. Server gaps this design depends on

### 6.1 No global "recently changed" query — blocks the Modificări tab

`LegalAct.timeline` is per-act. `moEdges` sorts by `edge_id`, not date. There is
no way to ask "what changed last week" across 84.420 status events.

**Ask:** `legalStatusEvents(filter: {kind, effectiveDateFrom, effectiveDateTo},
sort: EFFECTIVE_DATE, dir: DESC, first, after)` returning the event plus its act
and the modifying act. The table and its dates already exist; this is a repo +
resolver, not new ETL.

### 6.2 No count aggregate — degrades the domain grid

**Ask:** `legalActCounts(groupBy: STATUS | DOMAIN | ACT_TYPE | YEAR, filter:
LegalActsFilter)` → `{ key, label, count }[]` + denominator. Turns 4+16 queries
into 2, and unblocks the gazette/citation totals the header chips want.

### 6.3 `MoIssue` has no `hasFullText`

The June spec assumed this field to drive "text disponibil" vs "coordonate de
publicare". It does not exist. Only PDF presence is knowable
(`pdfUrl`, `hasEmonitorLink`).

This is a **useful** constraint — it makes the §7 copy guardrail
unbreakable — so the recommendation is to leave it alone and fix the copy, not
the schema. Actual coverage, if it is ever added: Part I 2012–2023 fully
extracted; 2024–2026 partial (3.543 PDFs lost, ~471 recovered); pre-2012 has no
text layer and OCR is undecided; and the **109 Part-I issues from 2026-05-29 to
2026-07-09 have no PDF at all** (download deferred by product decision
2026-07-09). Note the sting: those are the *most recent* issues — precisely what
§4.3 puts on the landing page.

---

## 7. Honesty rules specific to this module

Ranked by how badly each would mislead a reader.

1. **CCR decisions do not change act status.** 23.378 Constitutional Court
   decisions exist as `legal.acts` (`decizie:*:curtea-constitutionala`), but
   `act_status_events(event_source='ccr')` = **0** — projection deferred by
   product decision. **An article struck down as unconstitutional will still
   render "În vigoare."** This must be stated on the surface, not buried in a
   data page. It is the single most dangerous claim this module makes.
2. **Never imply gazette full text.** Use "Publicat în Monitorul Oficial" and
   "coordonate de publicare". "Text disponibil" is forbidden — §6.3 means we
   cannot know it.
3. **Unresolved citations are never hard links.** 400.368 of 1.103.595
   references (36,3%) resolve to nothing. `resolution` of `ambiguous` /
   `unresolved` / `external` renders as "potrivire posibilă" with the raw cited
   text and candidates.
4. **Gazette publications are not act identity.** Only 46,4% of the 212.221
   publications link to a Portal act. MO-only publications are labelled
   "publicație Monitorul Oficial (posibil neinclusă în Portal Legislativ)" and
   kept in a separate lane.
5. **Article structure is missing for ~31% of documents** (69.254 window-only
   docs). Any article-level feature states this where it would otherwise render
   an empty tree.
6. **AI summaries are an explanatory layer.** `AIProvenanceNotice` with model +
   prompt version, "generat de AI, verificat la sursă", "nu constituie
   consultanță juridică". Applies to the plain-language summary, domains, and
   category.

---

## 8. Build order

1. ~~`LegislationShell` + `LegislationTabNav` + header theme — the frame.~~ Done.
2. ~~Prezentare §4.1–4.4 (search, domains, gazette, honesty).~~ Done.
3. ~~Analiză §4A.1–4A.3 (KPIs, most-cited, honesty).~~ Done.
4. ~~`/legislation/acts/$actId` — the product anchor per the June spec.~~ Done,
   and built ahead of the directory: it is what every other surface links *to*,
   so shipping it first turned the most-cited band into working navigation.
   Concept and iteration log in [`act-detail.md`](act-detail.md).
5. `/legislation/acts` directory + facets — absorbs the "lista completă" links
   the act page already points at.
6. `/legislation/gazette` — the full archive behind §4.3's five-issue teaser.
7. `/legislation/search`.
8. §4.2 domain grid with counts, once §6.2 lands.
9. `/legislation/changes`, once §6.1 lands.
10. `/legislation/guide` — editorial, can slot in any time.
11. §4A.4 corpus composition, once `/legislation/acts` exists to absorb the
    vocabulary as facets.

Mock-first per DESIGN.md §Mock-First Contract: the `legal-acts` dataset is
registered in `src/lib/scraper-references/catalog.ts`, Zod schemas live in
`src/schemas/legal.ts`, fixtures under `src/features/legal/mocks/`, dispatch via
`isLegalMockEnabled()`. Field names mirror the GraphQL types in §5 exactly so
going live is an adapter swap.

The two lanes are at different stages and the catalog's `apiReady` reflects the
laggard: `legal-act-api.live.ts` is a **real** adapter against `legalAct`, while
`legal-api.live.ts` is still the stub described in §5. `VITE_LEGAL_USE_LIVE_API=true`
takes both live; until the overview lands, the default stays mock so the module's
front door does not throw while its detail pages work.
