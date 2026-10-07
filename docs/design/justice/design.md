# Justice (Justiție) — Domain Design

Source UX: `docs/ux-research/justice.md` · Foundation: `docs/design/README.md` ·
Companion: `./ux.md`

This document defines domain-level patterns, routes, the shared data contract at
the UI boundary, and the feature map. Feature files in `./features/` are
self-sufficient and reference the contract here.

> **Sections 1–11 are the mock era (2026-06-26):** background, not decisions to
> keep. The pages they describe were removed on 2026-10-07. The redesign on the
> live API starts at [§12](#12-redesign-on-the-live-api-2026-10-07).

---

## 1. Domain purpose and scope

Make Romanian judicial activity legible for accountability while structurally
protecting individuals. Two value lanes:

1. **Entity accountability** — what litigation a company/public institution is
   involved in (slice on existing profiles).
2. **Court-system transparency** — caseloads, categories, stages, appeal rates,
   frequent publishable litigants, single-case detail, and (gated) legal-reference
   and lineage exploration under `/justitie`.

Privacy is structural, not cosmetic: persons are never named or searchable; only
the publishable `party_name_keys` dictionary supplies displayable names; case text
is never indexed.

---

## 2. High-level design patterns

- **Decision — investigative surfaces, not dashboards.** Dense, scannable lists,
  tables, timelines, ranked bars, and a few honest charts. Cards only for repeated
  records and framed tools; no nested cards; border radii ≤ 8px (foundation).
- **Decision — coverage and privacy ride with every result.** A `CoverageRibbon`
  + `DataStatusBadge` + `FreshnessBadge` sit near the primary content on every
  justice surface; a `PrivacyBoundaryNotice` appears wherever persons are
  suppressed or company links are candidate-based.
- **Decision — gate-aware honesty.** Gated lanes (`party_company_candidates`,
  `case_legal_references`, `case_lineage_candidates`) render explicit "în pregătire"
  states driven by a `laneAvailability` flag from the API boundary — never empty
  silence, never fabricated rows.
- **Decision — candidate, not identity.** Any company↔case link shows an
  `IdentityConfidenceBadge` (tier + method) and the word "candidat". Cross-domain
  joins show *why* two records connect (`EvidenceLink`).
- **Decision — persons as counts.** Party lists render person/unknown kinds as
  aggregated role-counts ("Pârât: 2 persoane fizice — nume necomunicate"), never as
  rows that could be expanded to a name.
- **Decision — zero ≠ none.** Empty results use coverage-aware copy ("Nu am găsit
  cauze publicabile pentru această acoperire"), never "nu există cauze".
- **Decision — compact filter bars** sticky on list-heavy pages; charts always
  paired with a tabular/textual fallback (accessibility).

---

## 3. Information architecture and routes

Canonical routes (orchestrator decision; honored exactly):

| Surface | Route | Param meaning | Feature file |
| --- | --- | --- | --- |
| Justice landing | `/justitie` | — | `justice-landing-coverage-privacy.md` |
| Case search/listing | `/justitie/cautare` | — | `case-search-listing.md` |
| Court caseload analytics | `/justitie/instante/$courtId` | `courtId` = `justice.courts.institution_code` | `court-caseload-analytics.md` |
| Case detail (public/non-person) | `/justitie/dosare/$caseId` | `caseId` = opaque `justice.cases.case_id` | `case-detail-public-entities.md` |
| Company litigation slice | `/companies/$cui` → `tab=litigii` | existing route, additive tab | `company-litigation-slice.md` |
| Entity litigation slice | `/entities/$cui` → litigation section | existing route, additive section | `company-litigation-slice.md` |
| Top litigants (scoped) | rendered within court analytics + search; deep-linked via `/justitie/cautare` facets | — | `top-publishable-litigants.md` |
| Legal-reference exploration | `Acte citate` on case detail + `Cazuri care citează` on `/legislatie` act pages | — | `legal-reference-exploration.md` |

- **Fact:** No `justitie`/`justice` route exists today; this is greenfield under
  `src/routes/justitie/`.
- **Decision — route file layout:** use the nested-folder convention (as
  `entities/`, `parlament/`, `primarie/`): `src/routes/justitie/route.tsx`
  (optional shared layout with breadcrumb + nav), `index.tsx`, `cautare.tsx`,
  `instante.$courtId.tsx`, `dosare.$caseId.tsx`. Flat-dotted equivalents are
  acceptable if the implementer prefers; do not change the public URLs.
- **Decision — slices are additive, not new routes.** The company slice adds a
  `litigii` value to the existing private-company tab enum/config
  (`src/schemas/private-company.ts`, `src/features/private-companies/lib/
  tab-config.ts`). The entity slice adds a litigation section following
  `/entities/$cui`'s local section pattern (mirror `ContractsView`).
- **Decision — court directory** (UX-recommended `/justitie/instante` index) is
  **not** a canonical MVP route; court discovery is served by the landing-page
  `CourtPicker` and the search facets. A standalone directory is a post-MVP add and
  must not block.

### Shared URL state (follow foundation names)

- `/justitie/cautare`: `caseNumber` (exact case-number lookup), `partyKey`
  (publishable company/public-entity name key selected by UI), `court`
  (institution_code), `tier`, `category`, `stage`, `year`, `partyKind`, `role`,
  `hasAppeal`, `sort`, `page`, `pageSize`. There is no generic persisted `q`
  param and no person-name param.
- `/justitie/instante/$courtId`: `tab` (`prezentare` | `volum` | `categorii` |
  `litiganti`), `year`, `category`.
- `/justitie/dosare/$caseId`: `tab` optional (`cronologie` | `parti` | `acte`).
- `/companies/$cui`, `/entities/$cui`: `tab=litigii` (+ `litPage` for the slice
  list page to avoid colliding with other section pagination).
- **Decision:** validate all search params with closed Zod parsers in
  `src/schemas/justice.ts` using the established `z…optional().catch(default)`
  idiom (see `parsePrivateCompanySearch`); default views render with no params;
  invalid and unknown params normalize at the route boundary, not effects.

---

## 4. Shared layout and navigation

- **Decision — `/justitie/route.tsx` layout** provides: breadcrumb (`Justiție ›
  …`), a slim domain sub-nav (Prezentare / Caută cauze / Instanțe), and renders a
  page-level `CoverageRibbon` slot. Child routes fill content.
- **Decision — back-context preservation.** Cross-links carry `from`, `county`,
  `year`, `court`, `highlight` query params when they improve backtracking
  (foundation). Case→court, court→search(prefiltered), slice→case all preserve
  origin via `from`.
- **Decision — `RelatedLinksRail`** appears on case detail and the entity slice:
  links to the company/entity profile, procurement, PNRR, budget, and cited
  `legal.acts`, each labeled with relationship confidence where the link is
  candidate-based.

---

## 5. Domain components and reuse plan

### Reuse (exists today)

- `src/components/ui/*`: `Tabs`, `Table`, `Badge`, `Sheet`, `Dialog`, `Tooltip`,
  `Select`, `multi-select`, `empty-state`, `skeleton`, `pagination`, `card`,
  `breadcrumb`, `accordion`, `button`, `popover`.
- Charts: `ChartRenderer` + `TimeSeriesLineChart` / `TimeSeriesAreaChart` /
  `TimeSeriesBarChart` / `AggregatedBarChart` (in
  `src/components/charts/components/chart-renderer/`). Use for cases-over-time and
  category/stage breakdowns; always provide the tabular fallback.
- Filters: `src/components/filters/base-filter/*` (`FilterContainer`,
  `FilterListContainer`, `FilterRadioContainer`, `FilterRangeContainer`,
  `SelectedOptionsDisplay`, `SearchInput`) for the search facet bar; reuse
  `county-filter`, `year-filter` where applicable.
- Profile composition: private-company tab system
  (`features/private-companies/lib/tab-config.ts`,
  `…/components/private-company-page.tsx`, `…/sections/*`,
  `…/private-company-source-footer.tsx`).

### New shared "data-trust" components (none exist yet — Decision: create under `src/components/data-trust/`)

These are foundation-mandated shared primitives. Justice is the first heavy
consumer; if a sibling domain already created them, reuse instead of duplicating.

| Component | Purpose | Key props (mock-boundary) |
| --- | --- | --- |
| `DataStatusBadge` | state pill | `status: 'live'\|'mock'\|'partial'\|'stale'\|'gated'\|'unverified'` |
| `FreshnessBadge` | human freshness | `label: 'actualizat'\|'publicat'\|'date pana la'`, `date: string\|null` |
| `CoverageRibbon` | page-level source/freshness/known-gap summary | `source`, `freshness`, `gaps: string[]`, `status` |
| `PrivacyBoundaryNotice` | explains suppression/aggregation | `variant: 'persons-suppressed'\|'candidate-link'\|'incidental-text'`, `detail` |
| `IdentityConfidenceBadge` | candidate match certainty | `tier: 'A'\|'B'\|'C'\|'D'`, `method: string`, `validationStatus` |
| `EvidenceLink` | inline link to source row/doc/scraper ref | `href`, `kind`, `label` |
| `RelatedLinksRail` | cross-domain links rail | `links: {to, label, confidence?}[]` |
| `SourceProvenanceDrawer` | source URL, retrieval/publication dates, parser notes, caveats | `provenance: JusticeProvenance`, trigger |

All must satisfy the foundation accessibility rules: status never color-only;
tooltips never the sole carrier of critical info; drawers have focus management.

### New justice-specific components (`src/features/justice/components/`)

- `CaseTimeline` — vertical hearing timeline (date, panel, solution summary,
  pronouncement, doc number); tabular fallback.
- `PartyRolesList` — party list grouping publishable named parties (company/public)
  and person/unknown role-counts.
- `CourtCaseloadCharts` — wraps `ChartRenderer` for volume/category/stage/appeal.
- `TopLitigantsList` — ranked bar list of publishable litigants with
  `mention_count` and `IdentityConfidenceBadge`.
- `CaseResultsTable` — sortable, paginated case table for search + slice.
- `CourtPicker` — searchable court combobox (by name/locality/county/tier), built
  on `Popover` + `Command`/`Select`.
- `CourtIdentityHeader` — court level/locality/county/parent header.
- `LitigationSliceSection` — the entity/company slice body (headline + mini summary
  + `CaseResultsTable`).
- `LegalReferenceList` — `Acte citate` list with resolution-status badges (gated).

---

## 6. Data model at the UI boundary (canonical mock contract)

**Decision:** Mock shapes mirror the serving schema so the live adapter is a drop-in.
Defined in `src/schemas/justice.ts` (Zod) and consumed by `src/features/justice/`.
Field nullability mirrors the source. All names are TypeScript-flavored for clarity.

```ts
// Court — justice.courts (246 rows; 245 high / 1 medium mapping confidence)
type JusticeCourt = {
  institutionCode: string                 // = route $courtId
  ordinal: number | null
  courtLevel: 'judecatorie' | 'tribunal' | 'tribunal_militar'
            | 'curte_de_apel' | 'curte_militara_apel'
  specialization: string | null
  locality: string | null
  countyCode: string | null               // -> core.territories.county_code (no hard FK)
  countyName: string | null               // joined for display
  parentInstitutionCode: string | null    // self-FK
  mappingConfidence: 'high' | 'medium'
}

// Case — justice.cases (6,334,777)
type JusticeCase = {
  caseId: string                          // = route $caseId (opaque internal id)
  sourceSlug: 'portal_just'
  institutionCode: string
  caseNumber: string                      // "NNNN/CC/YYYY"
  caseNumberOld: string | null
  department: string | null
  category: string | null
  categoryName: string | null
  stage: string | null
  stageName: string | null
  object: string | null                   // raw passthrough — MAY contain incidental PII
  sourceOpenedAt: string | null
  latestSourceModifiedAt: string | null
  firstSeenAt: string | null
  lastSeenAt: string | null
}

// Hearing — justice.case_hearings (~18.62M)
type JusticeHearing = {
  hearingIndex: number
  hearingAt: string | null
  panel: string | null
  solution: string | null                 // MAY contain incidental PII
  solutionSummary: string | null          // MAY contain incidental PII
  pronouncementDate: string | null
  documentNumber: string | null
  documentDate: string | null
}

// Appeal — justice.case_appeals (~2.25M)
type JusticeAppeal = {
  appealIndex: number
  appealDeclaredAt: string | null
  appealType: string | null
}

// Party — justice.case_parties (16.76M); NO free-text name column
type JusticeParty = {
  partyIndex: number
  partyKind: 'company' | 'public_entity' | 'person' | 'unknown'
  roleNormalized: string                  // controlled vocab (see below)
  nameKeyId: string | null                // null for person/unknown/low-confidence
  // resolved ONLY when nameKeyId present AND publishable:
  displayName: string | null
  legalForm: string | null
}

// Publishable dictionary — justice.party_name_keys (745,538; company/public only)
type JusticePartyNameKey = {
  nameKey: string
  displayName: string
  partyKind: 'company' | 'public_entity'  // never person/unknown by construction
  legalForm: string | null
  aliasKeys: string[]                     // FOSTA / parenthetical former names
  mentionCount: number
}

// GATED v1 — justice.party_company_candidates (DDL-only, empty)
type JusticePartyCompanyCandidate = {
  nameKey: string
  candidateCui: string | null
  method: string
  confidenceTier: 'A' | 'B' | 'C' | 'D'
  validationStatus: 'candidate' | 'needs_review' | 'rejected'  // no auto-publish in v1
}

// GATED v1 — justice.case_legal_references (DDL-only, empty)
type JusticeLegalReference = {
  rawCitation: string
  targetActId: string | null              // -> legal.acts
  resolutionStatus: 'unique' | 'ambiguous' | 'unresolved'
}

// GATED v1 — justice.case_lineage_candidates (DDL-only, empty)
type JusticeLineageCandidate = {
  fromCaseId: string
  toCaseId: string
  edgeType: 'appeal' | 'old_number' | 'cross_institution'
  confidence: number
  method: string
  validationStatus: 'candidate' | 'needs_review' | 'rejected'
}

// Cross-cutting provenance envelope (attach to every justice response)
type JusticeProvenance = {
  status: 'live' | 'mock' | 'partial' | 'stale' | 'gated' | 'unverified'
  source: 'portal_just' | 'iccj' | 'ccr' | 'hudoc' | 'just_ro'
  retrievedAt: string | null
  lastModifiedAt: string | null
  coverageNote: string                    // e.g. "date dense din 2021 • fără ICCJ • doar metadata"
}

// Lane availability — drives gate-aware UI; default v1 = all 'gated'
type JusticeLaneAvailability = {
  companyCandidates: 'gated' | 'live'     // gate #9
  legalReferences: 'gated' | 'live'       // gate #11
  lineage: 'gated' | 'live'               // gate #10
}
```

- **`role_normalized` controlled vocabulary (Fact, UX §11):** Pârât, Reclamant,
  Intimat, Petent, Inculpat, Contestator, Parte civilă, Intervenient, Debitor,
  Creditor, … (treat as open controlled set; display source label, never invent).
- **Filter cardinalities (Fact):** 11 categories, 17 stages, 316 departments.
- **Assumption:** display joins (`countyName` on courts, `displayName` on parties)
  are resolved server-side by the GraphQL/MCP layer; the adapter should not assume a
  client-side join.

---

## 7. Feature implementation map

Ordered MVP-first (matches assigned order). Each links to its self-sufficient file.

1. `features/company-litigation-slice.md` — **MVP.** `Litigii` slice on
   `/companies/$cui` + `/entities/$cui`. Gate-aware (default "linking in review").
2. `features/court-caseload-analytics.md` — **MVP.**
   `/justitie/instante/$courtId`. Populated metadata only.
3. `features/case-detail-public-entities.md` — **MVP.**
   `/justitie/dosare/$caseId`. Persons as counts; case text behind notice.
4. `features/justice-landing-coverage-privacy.md` — **MVP.** `/justitie`.
   Coverage + privacy story, hero counts, entry search, court picker.
5. `features/case-search-listing.md` — **MVP.** `/justitie/cautare`. Faceted
   metadata search; no person field; no full-text over case text.
6. `features/top-publishable-litigants.md` — **Next.** Ranked publishable
   litigants, scoped; embedded in court analytics + search.
7. `features/legal-reference-exploration.md` — **Next, gated.** Case↔`legal.acts`
   citations; renders nothing until gate #11 green.

---

## 8. Responsive behavior

- **Decision — mobile-first.** Landing hero counts stack 1-col; court charts
  collapse to single column with the tabular fallback directly beneath; search
  facets move into a `Sheet` triggered by a "Filtre" button below `md`.
- `CaseResultsTable` becomes a stacked record list below `md` (label:value rows),
  preserving semantic table markup at `md+`.
- `CaseTimeline` is single-column at all breakpoints.
- `RelatedLinksRail` moves from a right rail (≥`lg`) to a bottom section (<`lg`).
- Sticky filter bar only at `md+`; on mobile the applied-filter tags remain visible
  as a horizontally scrollable row.

---

## 9. Accessibility, i18n, privacy, provenance

- **A11y:** all controls keyboard-reachable and labelled; tables keep semantic
  markup and descriptive headers; every chart has an adjacent text summary +
  tabular fallback; badges never the sole state carrier; sheets/dialogs manage
  focus and have headings + close controls; icon-only buttons get `aria-label`;
  decorative icons `aria-hidden`. Visible `focus-visible` rings.
- **i18n:** all user-facing text via Lingui macros (`t` / `<Trans>` /
  `useLingui`); Romanian primary. Locale-aware number/date/percent formatting via
  `Intl` / `i18n.locale`. Expand acronyms in context or tooltip (ECRIS, ICCJ, CCR,
  HUDOC). Run `yarn i18n:extract && yarn i18n:compile` after adding strings.
- **Privacy:** persons never named/searchable; `party_name_keys` is the only name
  surface; case text never indexed; company links always candidate-labeled;
  `PrivacyBoundaryNotice` at every suppression/candidate point.
- **Provenance:** `CoverageRibbon` + `FreshnessBadge` + `DataStatusBadge` near
  primary content on every surface; `SourceProvenanceDrawer` for full detail; ICCJ
  absence stated wherever supreme-court coverage might be assumed; "actualizat la"
  stamps with no real-time implication.

---

## 10. Acceptance criteria (domain-level)

- Every justice surface renders coverage, freshness, and a data-status indicator
  near its primary result.
- No surface offers person-name search or full-text search over case text.
- Person/unknown parties never appear as named or expandable rows — only as
  role-counts.
- All company↔case links carry a confidence/candidate label and never assert
  identity.
- Gated lanes render explicit "în pregătire" states from `laneAvailability`; they
  never show empty silence or fabricated rows.
- Empty results use coverage-aware copy, never "nu există cauze".
- ICCJ absence is visible wherever supreme-court/appeal-top is implied.
- All routes validate search params via `src/schemas/justice.ts`; default views
  render with no params; `yarn typecheck` passes; strings use Lingui.

---

## 11. Open questions (true blockers only)

None block MVP. Gated-lane product decisions (publication fork threshold for gate
#9; citation-status exposure for gate #11; global-search participation) only change
the behavior of already-gated states and are handled by the lane-availability flag;
they do not block building the populated, privacy-safe MVP.

---

## 12. Redesign on the live API (2026-10-07)

The court portal's data now has a live API on Chronos dev (GraphQL roots
`judicialCourts`, `judicialCourt`, `judicialCase`, `judicialCases`,
`judicialCaseload`, `judicialCompanyLitigation(Cases)`, `judicialCasesCitingAct`,
`judicialCaseLegalReferences`, `judicialCaseLineage`, `judicialResolve`, plus the
decisions lane: `judicialIssuingBodies`, `judicialDecision(s)`,
`judicialDecisionBySource`, `judicialDecisionSubjectLinks`,
`judicialDecisionResolve`). Schema: the server's
`src/modules/judicial/shell/graphql/typedefs.ts` and
`docs/server-redesign/08-judicial-cases.md` (read from the server's `dev`; an
older checkout branch lacked ~5,000 lines). Every figure below was read from the
live API through the worktree's Vite proxy on 2026-10-07 unless marked
otherwise.

### 12.1 What went (2026-10-07)

The mock-era client was removed, at the owner's call („everything now"):
`src/features/justice/{api,hooks,components,mocks,lib}`, the five `/justitie`
routes and their tests (the privacy-guardrails test included),
`src/schemas/justice.ts`, the `legal-judicial-cases` catalog entry (the
homepage's dataset count drops by one) and the landing page's ungated
„Justiție" tile. `/justitie*` answers 404 until the new pages ship; the new
pages take English paths and the old URLs redirect to them then.

Kept on purpose: `src/lib/privacy/sensitive-route-sanitizer.ts` and the
Sentry/analytics scrubbing of `/justitie` and of the company page's
`tab=litigii`/`partyKey`/`caseNumber` parameters. **The new pages must extend
it to their own paths** (case numbers and court codes out of telemetry), and
their tests carry the old guardrail's intent: no identifier in a telemetry URL,
no typed free text in the URL.

The company profile's litigation band (companies area) was rewired, at the
owner's call, to `judicialCompanyLitigation` / `judicialCompanyLitigationCases`
(`src/features/justice/{api,hooks,components}/company-litigation*`). The API is
published-only and **no company link is published** (0 of 283,382 candidates,
scrapper J3), so every CUI answers `caseCount 0, coverage 0` with the caveat
„company-litigation links not yet published". The band stands only when
published links count a case, says its count is a floor, and names no party;
until then it is absent — never „no cases".

### 12.2 What the data holds

**Courts — 247.** 179 judecătorii, 46 tribunals (42 general, 3 commercial —
Argeș, Cluj, Mureș — and the Brașov minors-and-family tribunal), 15 courts of
appeal, 5 military tribunals, the Military Court of Appeal and the ÎCCJ
(`inalta_curte`, appended last to the level enum). A court has an institution
code (`JudecatoriaSECTORUL4BUCURESTI`), level, specialisation, locality,
`countyCode` (a county abbreviation, not SIRUTA; `countySirutaCode` is its
deprecated alias), parent court and `children`. The API has **no readable
name**: the client generates one per code
(`scripts/generate-justice-court-names.mjs` → `court-names.generated.ts`, from
the county list and the INS UAT names; three codes spell a town with its old
article). 243 courts have cases; four have none: Tribunalul Militar București
and the suspended judecătorii Bozovici, Murgeni and Șomcuta Mare (Însurăței,
suspended in 2016, has 97).

**Cases — 6,344,711** = 6,334,798 from portal.just.ro (`sourceSlug
portal_just`) + 9,913 from the ÎCCJ's own archive (`iccj`, bulk ZIPs on scj.ro).
A case is the current projection, not its history: court, number (+ old
number), department, matter (`category`), stage, the procedural object
(`object`, free text), a source date (`sourceOpenedAt`, whose meaning depends on
the source: the Portal header's date or the ICCJ archive's case date — neither
is a verified filing date) and the last source modification. Natural key: court
\+ case number (the number alone repeats across courts: an appeal keeps the
first court's number). Use it for durable links: `caseId` can change on a
reload.

| Level | Cases | Leading matters |
|---|---:|---|
| Judecătorie | 4,352,547 | civil 2.16M, penal 998k, professionals 718k, minors & family 372k, administrative 102k |
| Tribunal | 1,491,942 | administrative & tax 321k, penal 284k, civil 232k, professionals 194k, labour 156k, social insurance 155k, insolvency 100k |
| Curte de apel | 486,576 | penal 148k, administrative & tax 126k, social insurance 67k, labour 49k, civil 47k |
| ÎCCJ | 9,913 | administrative & tax 5,658, civil 1,732, penal 1,094 |
| Military | 3,733 | — |

Matters: 12 Portal codes (Civil 2.44M, Penal 1.43M, Litigii cu profesioniștii
937k, Contencios administrativ și fiscal 549k, Minori și familie 419k, Asigurări
sociale 223k, Litigii de muncă 205k, Faliment 123k, Proprietate intelectuală
5k, Insolvența persoanei fizice 706, Drept maritim și fluvial 493, Alte
materii 9); the ÎCCJ's cases carry the same matters as raw labels with cedilla
diacritics, so a `groupBy: category` returns two keys for one matter (ask 2).
Stages (aggregate filtered by `stage`): Fond 5,306,243 (judecătorii 4.34M,
tribunals 893k), Apel 702,502 (tribunals 452k, courts of appeal 250k),
ContestaţieNCPP 154,043, Recurs 128,924 (courts of appeal 105k, ÎCCJ 6.9k),
recurs în interesul legii 239 (ÎCCJ), then revision and annulment variants; 19
values in all.

**Years.** The source date clusters in the capture window: 2023 1.47M, 2024
1.73M, 2025 1.68M, 2026 805k (to June), 2022 335k, 2021 105k, then tens of
thousands a year back to 2013 and a tail to 1956. The crawl reached cases by
**last modification** from about May 2013 (scrapper notes), so older years hold
only cases still active later: **a per-year count before 2023 is a capture
artefact, not the courts' caseload**, and 2026 is a part-year.

**Freshness.** Portal cases were last modified 2026-06-22 15:37 (stored clock,
time zone unknown); ICCJ dates run to 2026-07-24. Recurrent capture is
suspended. Every page must date its data („date până în iunie 2026"), never
imply live data.

**Hearings — 18.6M; appeals — 2.25M** (scrapper counts; the API has no
aggregate for them). In a sample of 660 cases opened in 2024 across 66 courts
(the first ten opened that year at every court of appeal, the ÎCCJ, the
military courts, the 15 largest tribunals and 30 judecătorii spread over the
size ranking — a convenience sample, so its shares are indicative):

- hearings per case p50 2, p90 5, max 32; the ÎCCJ's archive cases have none;
  a hearing has its time, panel (`C9`, `Complet 9 penal`, …), pronouncement
  date, and a decision document number and date — **no outcome**: `solution`
  and `solutionSummary` are withheld (privacy, server §2.1). 558/660 cases have
  at least one decision document;
- 19 hearings are dated after the capture: scheduled, not held;
- opened → last decision document: p25 36 days, p50 98, p75 272, p90 442
  (cases opened early in 2024; open cases excluded, so this is not a duration
  statistic of the courts);
- 235/660 cases list an appeal declaration (Apel 200, Contestație NCPP 59,
  Recurs 52);
- 17 cases list no party.

**Parties.** Only kind, normalised role and, for publishable organisations, a
dictionary key and legal form — **no name for anyone** (the case detail
withholds even company and institution names until a permission layer exists).
Sample: 1,797 parties, person 58%, unknown 12%, public entity 17%, company 12%;
roles intimat, pârât, reclamant, apelant, petent, inculpat, recurent,
contestator, creditor, debitor, intervenient. Every public entity and 188 of 220
companies carry a `nameKeyId`. `personPartyCount` equals the person + unknown
parties.

**Links.**

- *Companies:* published-only, none published (§12.1).
- *Legislation:* `legalReferences` are served (the readiness analysis predates
  this): 218/660 sampled cases cite something, 229 citations, from the object
  (222) or a hearing's solution field (7, the token only). 53 resolve to an act
  in `legal.acts` (`targetActId`; e.g. Legea 302/2004, Legea 254/2013, Legea
  85/2006, OUG 119/2007, OUG 195/2002); 176 are unresolved code aliases
  (`art.X ncpp`, `ncp`, `cpc`). The reverse read works:
  `judicialCasesCitingAct(32557)` pages the cases citing Legea 302/2004.
  Scrapper totals: 3.23M citations over 1.72M cases.
- *Other courts:* `lineage` edges link a case to the same file at another court
  (`same_dossier_cross_institution`, method `shared_base_cross_institution`,
  confidence 0.6 candidate / 0.3 needs_review): 236/660 sampled cases have one.
  They are candidates, never shown as fact; their direction audit is pending.
- *Territory:* a court's county; a case inherits it from its court (never a
  party's residence).

**Decisions lane (included at the owner's call, 2026-10-07).** 66,343 stored
decisions, every row read: CCR 765 (public; no date, year only), ECHR/HUDOC
7,350 (public; 2,835 are not judgments — communications, Article 54
resolutions, information notes, Protocol 16; judgments against Romania
deduplicated by ECLI: 2009 153 … 2025 29), CNSC 1,496 (restricted;
June 2025 – June 2026; 1,496 of 10,119 captured), CNCD 4,189 (restricted;
partial, 2022 missing, `publication_date` is an upload date), ANSPDCP 294
(restricted; sanction counts, amounts misparsed) and ANAF tax appeals 52,249
(restricted; no date, year or number). `outcomeNormalized` is null everywhere.
Only CNSC has subject links: 2,137 candidate CUI links on 1,391 decisions
(contestant → company 1,330, authority → public entity 807), all confidence
0.995, unverified. ancom, anre, cna, consiliul_concurentei and curia have no
rows. The API serves this lane „as stored", the restricted class included,
with its privacy work deferred.

### 12.3 Privacy (hard rules for every justice page)

- Show only what the API publishes; never request `name`, `solution` or
  `solutionSummary`; never use `judicialResolve(companyName)` (which returns
  dictionary names) to name a case's parties: that would rebuild what the case
  detail withholds.
- Parties are counted and described by kind and role („Pârât: 2 persoane
  fizice"), never named.
- `object` is served as safe but has not passed a current privacy audit
  (readiness analysis JC26-PRIV-01). Sample: 650 objects, no person name; four
  title-case fragments, all institutional („Codul Silvic", „Curții
  Constituționale"). Showing it on a case page is the owner's decision (asked
  when the case page is designed); aggregates never need it.
- Case numbers and court codes stay out of telemetry (§12.1).
- Decisions: restricted rows are shown as metadata (body, number, year, kind,
  CUI links as candidates), never as narrative or documents; ANSPDCP source
  references can embed organisation names and are not displayed.

### 12.4 What the data supports

- **Front door (hub):** the caseload by level, matter and year; the courts by
  size; stages; the law and other-court links as entry points; the decisions
  lane's series (ECHR judgments, CCR decisions, CNSC).
- **Court page** (the strongest): caseload by year, matter and stage from the
  aggregate; its place in the hierarchy (parent, children); its county.
- **Case page:** header, hearings timeline (dates, panels, decision numbers —
  no outcomes), appeals, parties by role and kind (no names), cited laws
  (linked to legislation when resolved), the same file at other courts
  (candidates).
- **Analytics page:** `judicialCaseload` is a cube — `groupBy` court, matter,
  year or level, filtered by court(s), level(s), matter(s), stage(s), years,
  modification dates and an object-text search, with `denominator` as the
  total of the filtered set. One read per view; a stage split needs one read
  per stage (ask 3).
- **Law ↔ cases:** the cases citing an act (a band on legislation act pages
  belongs to the legal area).

### 12.5 Server asks (justice)

Numbered for the owner to route to the server session; evidence from the live
API on 2026-10-07.

1. **Court names.** `JudicialCourt` has no readable name; add `name`
   (Romanian, with diacritics, as the court calls itself). The client
   generates names from codes meanwhile (247/247, three historical spellings
   aliased).
2. **One code per matter.** ÎCCJ cases carry raw labels with cedilla
   (`Contencios administrativ şi fiscal` 5,658, `Civil` 1,732 …) beside the
   Portal codes (`Contenciosadministrativsifiscal`), so `groupBy: category` and
   `judicialResolve(category)` list 19 keys for 12 matters. Serve one code per
   matter plus its label.
3. **Stage as an aggregate dimension** (`groupBy: stage`) and a stage
   resolver: today the 19 stage values are found by sampling and counted one
   aggregate read each. `stageName` is null on ÎCCJ cases (10/10 sampled).
4. **Two-dimensional aggregates** (court × year, matter × year, stage ×
   level) so an analysis table is one read, and **opened month** for the
   current year.
5. **Hearing and appeal aggregates** (hearings, decision documents and appeal
   declarations by year, level, court): 18.6M hearings and 2.25M appeals have
   none today.
6. **Citations:** an aggregate of cases per cited act (the most-cited laws),
   and resolution of the code aliases (`ncpp`, `ncp`, `cpc`, `ncpc`; 176 of 229
   sampled citations) to the codes' acts.
7. **Lineage edges with the other end's court and number**, so the same file
   at other courts lists without a read per edge; and the direction audit (#10)
   before anything reads as an appeal path.
8. **Dataset freshness.** `asOf` exists only inside a case detail; add a
   per-source watermark to the courts or aggregate reads so a page can date its
   figures („până la 22 iunie 2026") without reading a case.
9. **Company litigation is empty for every CUI** (no published link); the
   company band stays hidden until links are published (gate #9).
10. **Name policy consistency:** `judicialResolve(companyName)` returns
    dictionary names while the case detail withholds them; the client uses
    neither to name parties until the permission layer exists.
11. **`object` privacy audit** verdict (JC26-PRIV-01), so case pages can say
    what a case is about.
12. **Decisions lane:** (a) an aggregate by source, year, kind and privacy
    class (counting ANAF takes 1,045 pages); (b) CNSC outcome (admis/respins),
    notice, value, CPV and case number — the placeholder attrs are null in
    1,496/1,496; (c) CNSC `decisionNo` is not chronological — confirm its
    meaning; (d) ANAF `attrs.categories` keys are misaligned (`judet` holds
    topics, `materie` counties); (e) ANSPDCP amounts misparsed (e.g. 27202:
    4.98 lei; 26958: 2,000 EUR / 985,100 lei); (f) CCR `decisionDate` null in
    765/765; (g) CNCD: no 2022 rows, 7 rows without year and number; (h) CNSC
    link anomalies: 3–5-digit CUIs (links 1214, 1422, 1573), four CUIs both
    contestant and authority, and the rounding defect's affected links to be
    listed; (i) drop or label the five issuing bodies with no rows; (j)
    decision ↔ case links (no `ecris_case`, `contract` or `notice` link
    exists).
13. **Case lookup by number alone.** A reader knows a case number
    (`1234/3/2024`), rarely the court code; `judicialCase` needs both. Serve
    the courts a number exists at (the number's middle segment is the
    originating court's ECRIS id, which the API does not map to an
    institution code).

## 13. Front door prototypes (2026-10-07)

`/development/justice/hub` (`src/development/prototypes/justice/hub.*`), three
variants in the procurement, INS and companies hubs' language, sharing their
bands: `registru` (the busiest courts of the year beside the headline, the map
first), `drum` (a case's way up the levels with its stage counts beside the
headline) and `materii` (a hundred of the year's cases by matter). Figures come
from the live API through a generated snapshot (first `hub.data.json`, since
§14 `src/features/justice/lib/hub-snapshot.ts`, by
`scripts/generate-justice-hub-snapshot.mjs`; never edited by hand).

Data rules the hub keeps:

- **The reference year is the last whole year of the capture** (2025: the
  Portal's newest modification is 22 June 2026). Its cases are counted by
  their source date („dosare cu data din 2025"), never called new filings.
- **One matter, one row:** the ÎCCJ's raw labels are merged into the Portal's
  codes by name.
- **Stages:** the stage table adds an „Alte etape" column so each level's
  row adds up to its total (13 stage values are counted; ask 3).
- **Years before 2023 are drawn dashed** („preluare parțială") and the last
  year as a part-year; the lede says why.
- **County map:** cases dated 2025 at the county's judecătorii per 1,000
  residents (INS, 1 January 2025), the country on the same basis; computed by
  Transparenta.eu and labelled so; a case is judged where the court is
  competent, not where its parties live.
- **Decisions:** ECHR judgments only, one per ECLI; CCR and CNSC counted as
  „preluate" (captured), never as the bodies' totals.
- One source line with the caveats behind one amber marker (four notes:
  source date, partial capture, frozen capture, privacy).

The prototype is now an adapter over the live components (§14): `registru`
renders the live front door with its choices in local state; `drum` and
`materii` keep their own hero panels on the live model.

## 14. The live pages (2026-10-07)

The owner picked `registru`, English paths and, for this round, the front
door, a court page and a case page; the analysis page comes next with its own
prototype. They allowed the case's object on the case page.

**Routes.**

| Path | What | Data |
|---|---|---|
| `/justice` | the front door (`registru`) | `hub-snapshot.ts`, no read |
| `/justice/courts/$code` (`?an=`) | one court in one year | live, server-read, memo 10 min |
| `/justice/cases/$code/$` | one case, its number the splat with its slashes | live, server-read, memo 10 min |
| `/justitie`, `/justitie/*` | the mock-era pages | 301 to `/justice`, carrying nothing |

Code: `src/features/justice/{api,hooks,lib,components/{hub,court,case}}`,
routes `src/routes/justice/` and `src/routes/justitie/`. The record pages follow
procurement's procedure (loader → server memo under a 6 s deadline → seeded
query; a 404 from the loader for a code or number that cannot exist and for a
record the API does not have; `no-store` on a failed or partial read; the head
through `translatorFor`).

**Decisions.**

- **The front door reads a snapshot.** The portal's capture stopped in June
  2026, and its figures take some forty aggregate reads (the ECHR series pages
  through 7,350 rows), so `scripts/generate-justice-hub-snapshot.mjs` reads
  them once into `hub-snapshot.ts`, dated in the source line. Rerun it when
  the capture resumes. The court and case pages read live.
- **The court page opens on the front door's year** (the capture's last
  whole year, 2025); the year list offers the whole years of the capture and
  its last part-year, never the partial ones before 2023. Its stages are the
  four counted ones plus „Alte etape" as the rest of the year's total, so they
  add up. Its children's counts are a second read; when it fails the children
  show with a dash and a note, never zero, and the page is served once.
- **The court's case list never carries what a case is about**: the owner
  allowed the object on the case page only, so the list's selection leaves it
  out (the server-rendered HTML holds no object either).
- **A case is addressed by its court and number**, never by `caseId` (which a
  reload can change). Its page is `noindex, follow`: it describes one dispute,
  and a search engine is no place to find a person's case.
- **The case lookup accepts only a number's shape** (digits, a slash, the
  rest): a name typed by mistake never reaches an address. Telemetry reports
  a case page as `/justice/cases/<court>/:caseNumber`
  (`sensitive-route-sanitizer.ts`, Sentry replay off on `/justice*`).
- **Parties** are counted by role and kind, a legal form beside its own kind
  („1 firmă (SRL), 1 persoană fizică"); a sole-trader form (PFA, II, IF) is
  never shown, as it points at a person.
- **Hearings** show their time as the portal stores it (no time zone is
  claimed), the panel, the decision document and the pronouncement; one dated
  after the capture is „programată". No outcome: the API withholds it.
- **Laws**: a resolved citation links to `/legislation/acts/$actId`, labelled
  from the citation's own type, number and year as the registry writes them
  („Legea nr. 85/2014"); an unresolved one keeps its token, with the code's
  name for `ncp`, `ncpp`, `ncpc`, `ncc`.
- **The same file at other courts** lists up to ten linked cases, each
  labelled „posibil" (candidate) or „de verificat" (needs review), and counts
  the links it does not list.
- **The landing tile** „Justiție" leads to `/justice` again.

- **The court page's year** is one the capture holds whole (2023 on) or its
  last part-year; any other `?an=` describes the default year — a year the
  picker never offers is no page of its own.
- **Telemetry never carries a case number.** PostHog's SDK adds the current
  and previous URLs, the referrer and the document title after a capture
  call, so a `before_send` hook scrubs the final payload (URLs and paths to
  `/justice/cases/<court>/:caseNumber`, titles' numbers redacted, person
  properties too). Sentry's router tracing puts the route params — a case
  page's splat — on its spans, so a transaction that touches a justice page
  is never sent (`beforeSendTransaction`); replays stay off on `/justice*`.
- **The ÎCCJ's cases are read in the browser**, not on the server (ask 15);
  their pages say what the ÎCCJ archive does not carry as the archive's
  (no hearings, appeals, parties or object), never as the portal's, and
  name the archive (scj.ro) as their source.
- **Same-file links** list only `same_dossier_cross_institution` edges that
  are candidates or awaiting review; a rejected link or another kind is
  never shown.
- **The court route** imports the capture's years from `hub-years.ts`, never
  the snapshot, so the snapshot loads with the front door only.

**Server ask 15.** `judicialCase` takes 6.2–7.0 s for any ÎCCJ case (by
natural key or by `caseId`, even selecting `case { caseId }` alone; e.g.
`InaltaCurtedeCasatiesiJustitie` `656/1/2025`), against ~0.25 s for a Portal
case — past a server render's 6 s deadline. The ÎCCJ lookup path needs an
index.

**Server ask 14.** `targetAct { displayCitation }` inside `judicialCase` fails
with „Internal server error" (case `CurteadeApelCONSTANTA` `5180/118/2021/a3`,
path `judicialCase.legalReferences.0.targetAct.displayCitation`), which fails
the whole case read; `targetAct { actId }` works. The client reads the scalar
`targetActId` meanwhile.

**Tests.** Unit tests on answers recorded from the live API
(`scripts/record-justice-fixtures.ts` → `src/features/justice/fixtures/`):
the models, the adapters (what each read sends; no document asks for a name or
a solution), the pages' server markup, the routes (404s, cache headers, heads,
redirects) and the sanitizer. `tests/integration/justice.spec.ts` asserts what
the server renders on the dev API.

## 15. Analysis page prototypes (2026-10-07)

`/development/justice/analize` (`src/development/prototypes/justice/analize.*`),
on the live API, in `/procurement/analytics`'s language and parts (the
lattice head, the pinned bar, `HubFiguresBand`, the grouping tabs over a
shadcn `Table`, the years band, `filter-sheet-parts`). The proposed live
address is `/justice/analytics`.

**The page.**

- **The question is the headline**, generated, each filter a phrase that opens
  the panel and whose ✕ drops it: „Dosarele de faliment la tribunalele din
  județul Cluj, pe instanțe". The year is the period menu's, at the top right
  with „Date până la 22 iunie 2026"; the menu offers the capture's whole years
  (2023–2025) and its part-year (2026, „până în iunie"), never the partial
  years before.
- **The pinned bar holds the court levels** with their counts for the
  question's other filters (Toate, Judecătorii, Tribunale, Curți de apel,
  Înalta Curte, Instanțe militare): procurement's populations bar.
- **Four figures:** the cases and their change on the year before (only
  between two whole years), the courts with cases, the five busiest courts'
  share, the largest matter's share.
- **The answer** groups by courts, counties, matters, stages or levels. A
  group's row narrows the question to it and groups by what is left open
  (county → its courts, court → its matters, matter/stage/level → courts); a
  court's arrow opens its page in the same year.
- **The years band** draws 2013–2026, the years before 2023 dashed
  („preluare parțială") and 2026 as a part-year; a whole year's bar makes it
  the question's year, a partial one cannot be chosen.
- **„+ Adaugă un filtru"** searches the page's own names (matters, stages,
  levels, counties, courts); „Filtre" opens the sheet (places by search,
  matters with a search past eight values, levels and stages one column); the
  ready questions sit under „Întrebări".
- **One marker** holds the caveats: amber for a part-year or a rate, an „i"
  otherwise (the year is the source date's; years before 2023 are partial; a
  case counts at every court where it is registered; no outcomes, no names).
- **The address is the question** (`an`, `nivel`, `materie`, `etapa`,
  `judet`, `instanta`, `dupa`, `masura`, `coloane`; defaults left out, values
  the page does not know dropped). None carries a person; the sanitizer's
  safe keys take them at promotion.

**Two variants**, differing in the answer's table:

- `clasament` — the year's groups ranked, the year before, the change, the
  share bar, „Restul" and the total; counties also per 1,000 residents
  (2025 only: the residents are counted on 1 January 2025).
- `incrucisat` — the same groups as rows, crossed with the years 2023–2026,
  the stages or the levels as columns; a stage or level cell tinted by its
  share of the row (none under 5%), the year's column bold with the change
  from the year before.

**Data rules.**

- Every figure is a `judicialCaseload` count, a sum of them, or a share. A
  matter filter sends the Portal's code and the ÎCCJ's raw label (19 keys,
  12 matters); a stage filter sends the raw stage values grouped as fond,
  apel, recurs, contestație and the extraordinary remedies (13 values hold all
  but some 1,500 of 6.34 million cases); „Alte etape" is the rest of the
  total, so the stages add up.
- Counties come from the courts (the API has no county filter or grouping): a
  county filter is the list of its courts, a county row the sum of its
  courts. The ÎCCJ has no county: it is drawn after the counties, never
  ranked among them.
- A court picked outside the county picked matches nothing: no read is made
  and the answer is zero.

**Reads per view** (one HTTP request each, deduplicated across the page,
0.1–1.9 s each on the dev API; kept for the page's life, the capture being
frozen): the bar 1, the figures 2–3, the years 1; a grouping 2 (the year and
the year before) — stages 12 (a read per stage per year, ask 3); a cross 4–6
(a read per column, ask 4).

**Open for the owner:** which variant, or both (the cross as a „Coloane"
option of the ranking); the address; whether the page lists the cases
themselves (the cross-court case list exists in the API, bounded by a year).

## 16. The live analysis page (2026-10-07)

The owner picked `clasament`; it is live at `/justice/analytics`. The cross
table (`incrucisat`) stays as a prototype over the live parts; the page
lists no cases.

**Code.** `src/features/justice/lib/analysis-{codes,model,plans,text,notes,questions}.ts`
(pure: the codes each filter sends, the question and its address, the read
plans, the words), `api/judicial-analysis-api.ts` (the one read),
`api/justice-analysis-ssr.ts`, `hooks/use-justice-analysis.ts`,
`components/analysis/*`, routes `src/routes/justice/analytics{,.lazy}.tsx`.
The prototype `analize` is an adapter over them, as the hub's is.

**Decisions.**

- **Read on the server, seeded in the browser.** The loader reads every read
  the question's answer needs (the levels' counts, the figures, the grouping
  and the year before, the years — 6 to 18 reads), each kept ten minutes in
  the server process under its own 4 s deadline and shared by every question
  that makes it; the page's queries start from them under the same keys, so
  hydration reads nothing again. A render with a failed read goes out
  `no-store`; the page reads what is missing in the browser.
- **The address is the question** (`an`, `nivel`, `materie`, `etapa`,
  `judet`, `instanta`, `dupa`, `masura`); a value the page does not know is
  dropped; the loader keys on the normalized question. The share link writes
  the year out, so it does not move when the default year does.
- **Search engines see the bare page only** (canonical at
  `/justice/analytics`); any question is `noindex, follow`, without a
  canonical. The server's title is the page's, in the request's language;
  the browser's tab says the question.
- **The rate per 1,000 residents** is offered for counties in 2025 only (the
  residents' year, INS, 1 January 2025); the ready question that asks for it
  sets that year.
- **The ÎCCJ's archive never compares with itself.** It is a recent, partial
  set (153 cases dated 2023, 523 dated 2024, 3,641 dated 2025, 4,986 to July
  2026), not a year's intake: a question that reads it alone makes no
  year-before read and shows no change; its own rows among others (its court,
  its level, its countyless county row) show their count without a change;
  the caveats say that in mixed totals it inflates the change slightly. Its
  cases run to 24 July 2026: every date of a question says its source's
  cutoff, both of them when it reads both („Date până la 22 iunie 2026
  (Înalta Curte: 24 iulie 2026)").
- **The year before's column adds up to its total**: the groups that had
  cases then and none now are in „Restul".
- **Telemetry** keeps the question's keys (`judet`, `materie`, `etapa`,
  `dupa`, `masura` join `an`, `nivel` in the sanitizer's safe list), each only
  with a value from its closed list (`SAFE_JUSTICE_VALUES`): a key carrying
  anything else is dropped whole. The courts picked (`instanta`) are not
  kept: a court's code has no closed list in the sanitizer, and a crafted
  one could carry a name.
- **The route module loads no snapshot** (it is in the entry every page
  loads): the address's keys live in `analysis-codes.ts`, the titles in
  `justice-page-titles.ts`; `-justice-analytics-entry.test.ts` guards it.
- **The grouping tabs** are Radix tabs activated manually (the arrows move
  the focus, Enter asks), the table their panel; a partial year in the band
  takes the focus and shows its figures but cannot be chosen.
- **Entry points:** the front door's shortcuts („Analize") and each court
  page („Compară cu instanțele de același nivel", the court's level in its
  year). The codes a court page needs for that link live in
  `analysis-codes.ts`, apart from the courts' list, so the court page does
  not load the hub snapshot.
- **The county population** (`lib/county-population.ts`) is the front door's
  and the analysis page's one source.

**Tests.** The model, the plans on recorded answers
(`fixtures/analysis-reads.json`, `scripts/record-justice-fixtures.ts`: the
rows, levels and stages add up to the read's total), the words, the server
read (keys, one read each, a failed read), the page's server markup, the
route (search, deps, loader, headers, head), the sanitizer, and
`tests/integration/justice.spec.ts` (the bare page and a question rendered
on the server).
