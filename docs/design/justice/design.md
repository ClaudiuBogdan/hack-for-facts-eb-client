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
