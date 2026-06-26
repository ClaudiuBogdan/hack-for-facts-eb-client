# Justice (Justiție) — Domain Design

Source UX: `docs/ux-research/justice.md` · Foundation: `docs/design/README.md` ·
Companion: `./ux.md`

This document defines domain-level patterns, routes, the shared data contract at
the UI boundary, and the feature map. Feature files in `./features/` are
self-sufficient and reference the contract here.

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

- `/justitie/cautare`: `q` (court/case-number/litigant text — **never** person
  text), `court` (institution_code), `tier`, `category`, `stage`, `year`,
  `partyKind`, `role`, `hasAppeal`, `sort`, `page`, `pageSize`.
- `/justitie/instante/$courtId`: `tab` (`prezentare` | `volum` | `categorii` |
  `litiganti`), `year`, `category`.
- `/justitie/dosare/$caseId`: `tab` optional (`cronologie` | `parti` | `acte`).
- `/companies/$cui`, `/entities/$cui`: `tab=litigii` (+ `litPage` for the slice
  list page to avoid colliding with other section pagination).
- **Decision:** validate all search params with Zod parsers in `src/schemas/
  justice.ts` using the established `z…optional().catch(default)` idiom (see
  `parsePrivateCompanySearch`); default views render with no params; invalid params
  normalize via route validation, not effects.

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
