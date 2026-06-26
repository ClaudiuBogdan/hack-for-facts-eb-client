# Feature: Company / Entity Litigation Slice (`Litigii`)

Domain: Justice · Priority: **MVP #1** (highest value-to-risk) · Status: build-ready
Companion: `../design.md`, `../ux.md` · Source: `docs/ux-research/justice.md` §13.1,
§10.2, §17

## Feature owner profile

Frontend feature implementer (React 19 + TypeScript + TanStack Router + shadcn/ui +
TanStack Query + Lingui). Must be comfortable extending the existing profile
tab/section pattern (`src/features/private-companies/`) and building a new
`src/features/justice/` module with a mock-first API split. No backend work.

## Summary

A `Litigii` (Litigation) tab on `/companies/$cui` and an equivalent litigation
section on `/entities/$cui` showing, for the profiled company/public entity: a
headline case count, a privacy/identity notice, a paginated case list (court, case
number, stage, category, latest hearing, role), and a mini summary (top courts,
top categories, year trend). Because the CUI↔name-key bridge
(`party_company_candidates`) is **gated/empty in v1**, the slice is **gate-aware**:
its default v1 state is an honest "linking in review" state, and it shows cases only
when the API returns reviewed/published matches, always labeled as name-match
candidates with confidence.

## Facts / Decisions / Assumptions

- **Fact:** Aligns with the existing `get_company_litigation` MCP tool ("Tool IO
  explicitly privacy constrained").
- **Fact:** No CUI in the judicial source; company links are name-only candidates.
  `party_company_candidates` is DDL-only/empty in v1 (gate #9). Public entities are
  more reliably matched (party_kind `public_entity` in the publishable dictionary),
  but still name-based.
- **Fact:** Only `party_name_keys` (company/public, 745,538) supplies displayable
  names; persons are never named.
- **Decision — gate-aware default.** When `laneAvailability.companyCandidates ===
  'gated'` (v1 default) the slice renders the "linking in review" state with a clear
  explanation and a link to the court/search surfaces; it does **not** guess matches.
- **Decision — additive, no new route.** Company: add `'litigii'` to the
  private-company tab enum (`src/schemas/private-company.ts`) + tab-config
  (`src/features/private-companies/lib/tab-config.ts`, icon `Scale` or `Gavel` from
  lucide). Entity: add a litigation section to `/entities/$cui` following its local
  section pattern (mirror `ContractsView`).
- **Decision — confidence-first.** Every shown link carries `IdentityConfidenceBadge`
  (tier + method) and a "legătură pe bază de nume — candidat" label.
- **Decision — data lives in a shared justice feature module** so the same fetch
  powers both profile types: `src/features/justice/api/company-litigation-api.ts`
  (+ `.live.ts` / `.mock.ts`).
- **Assumption:** `/entities/$cui` exposes a section-registration mechanism similar
  to private-companies' tab content dispatcher. If it instead uses inline sections,
  add the slice section in the same place `ContractsView` is rendered. (Verify
  locally; do not invent a new tab framework.)
- **Assumption:** The MCP/GraphQL `get_company_litigation` accepts a CUI/organization
  id and returns the matched name keys + their cases with confidence. The mock models
  this; the live adapter maps it 1:1.

## Route and URL state

- **Company:** `/companies/$cui?tab=litigii` (+ `litPage` for slice pagination).
  Extend `privateCompanyViewTabSchema` enum with `'litigii'`; keep
  `.optional().catch('summary')`. Add `litPage: z.coerce.number().int().min(1)
  .optional().catch(1)` to the company search schema.
- **Entity:** `/entities/$cui` — add a litigation section/anchor (`#litigii`); if
  `/entities/$cui` has a `tab`/`section` search param, add `litigii` there following
  the local idiom. Pagination param `litPage`.
- **Decision:** default render (no params) shows the slice's summary state for the
  active tab; navigation updates `search` immutably (spread previous search), per the
  private-company `setTab` pattern.

## Data contract and mock states

Adapter: `fetchCompanyLitigation(input: { cui: string; organizationId?: string;
page?: number; pageSize?: number })`. Returns:

```ts
type CompanyLitigationResult = {
  // identity context
  cui: string
  matchedNameKeys: {                       // publishable keys matched to this entity
    nameKey: string
    displayName: string
    partyKind: 'company' | 'public_entity'
    confidence: { tier: 'A'|'B'|'C'|'D'; method: string;
                  validationStatus: 'candidate'|'needs_review'|'rejected' }
  }[]
  headline: {
    totalCases: number | null              // null when gated/unknown
    asPartyKind: 'company' | 'public_entity'
  }
  cases: {                                  // page of cases (empty when gated)
    caseId: string
    institutionCode: string
    courtName: string | null
    caseNumber: string
    stageName: string | null
    categoryName: string | null
    latestHearingAt: string | null
    role: string                           // role_normalized for this entity
  }[]
  pagination: { page: number; pageSize: number; total: number | null }
  summary: {
    topCourts: { institutionCode: string; courtName: string; count: number }[]
    topCategories: { category: string; categoryName: string; count: number }[]
    yearTrend: { year: number; count: number }[]   // honest thinning pre-2021
  }
  laneAvailability: { companyCandidates: 'gated' | 'live' }
  provenance: JusticeProvenance
}
```

**Mock states to implement** (in `company-litigation-api.mock.ts`):

1. **Gated (v1 default)** — `laneAvailability.companyCandidates: 'gated'`,
   `headline.totalCases: null`, `cases: []`, `matchedNameKeys: []`. UI shows the
   "linking in review" state.
2. **Public entity, matched** — a public institution with `partyKind:
   'public_entity'`, tier `A`/`B`, several cases. Demonstrates the populated slice.
3. **Company, candidate matches (when live)** — tier `B`/`C` matches with the
   candidate notice prominent.
4. **No covered cases** — matched key(s) exist but zero cases in covered range →
   coverage-aware empty copy.
5. **Loading / error** — see states section.

## UI structure

`LitigationSliceSection` (in `src/features/justice/components/`), composed top→down:

1. **Header row:** title `Litigii` + `DataStatusBadge` (`gated`/`live`/`mock`) +
   `FreshnessBadge` ("actualizat la …").
2. **Headline:** "X cauze în instanță" (large number, locale-formatted) or, when
   gated, a neutral headline ("Litigiile sunt în curs de corelare"). Subtext names
   the matched party kind ("ca parte de tip companie/instituție publică").
3. **`PrivacyBoundaryNotice` (variant `candidate-link`):** one line explaining
   name-based matching + that persons are not shown. Always present.
4. **`IdentityConfidenceBadge`(s):** per matched name key when populated.
5. **Mini summary (3 compact blocks, not nested cards):** Top instanțe (mini ranked
   list), Top categorii (mini ranked list), Tendință anuală (`TimeSeriesAreaChart`
   via `ChartRenderer` + tabular fallback). Honest thinning before 2021.
6. **`CaseResultsTable`:** columns — Instanță, Număr dosar, Stadiu, Categorie,
   Ultima ședință, Rol. Row → `/justitie/dosare/$caseId?from=companies:$cui` (or
   `entities:$cui`). `Pagination` below.
7. **`RelatedLinksRail`:** links to procurement/PNRR/budget for the same CUI and to
   `/justitie/cautare?court=…` prefilled by top court. Candidate links labeled.
8. **Footer:** `SourceProvenanceDrawer` trigger ("Sursă și acoperire").

## Component reuse and new components

- Reuse: `Badge`, `Table`, `Pagination`, `Tabs` (host), `Tooltip`, `Skeleton`,
  `EmptyState`, `ChartRenderer`/`TimeSeriesAreaChart`,
  `private-company-source-footer` pattern.
- New shared (data-trust): `DataStatusBadge`, `FreshnessBadge`,
  `PrivacyBoundaryNotice`, `IdentityConfidenceBadge`, `RelatedLinksRail`,
  `SourceProvenanceDrawer` — create under `src/components/data-trust/` if absent
  (see `../design.md` §5).
- New justice: `LitigationSliceSection`, `CaseResultsTable`, `TopLitigantsList`
  (mini variant reused for top courts/categories).

## Interactions

- Tab/section selection updates URL (`tab=litigii`), preserving other search params.
- Pagination updates `litPage` in URL; table re-fetches via query key including page.
- Clicking a case navigates to case detail with `from` context.
- `SourceProvenanceDrawer` opens a `Sheet` with source, retrieval/modified dates,
  parser notes, ICCJ-absence caveat.
- Hover on `IdentityConfidenceBadge` shows method + validation status (tooltip is
  supplementary; the tier text is always visible).

## Loading / empty / error / partial / stale states

- **Loading:** `Skeleton` for headline + 5 table rows + mini-summary blocks. Use the
  centered dot loader only for full-section transitions, per map design principles.
- **Empty (covered, zero cases):** `EmptyState` — title "Nicio cauză publicabilă în
  acoperirea curentă", body referencing coverage (2021+, fără ICCJ, doar
  companii/instituții publice). Never "nu există cauze".
- **Gated (default v1):** dedicated panel — "Corelarea litigiilor cu firmele este în
  pregătire" + short why (name-only matching under review) + CTA to
  `/justitie/cautare` and `/justitie` landing. `DataStatusBadge='gated'`.
- **Error:** inline error block with retry; do not blank the rest of the profile.
  Use `useErrorHandler` from `ErrorContext` with feature tag `justice-litigation`.
- **Partial:** if summary loads but case page fails (or vice versa), render what
  resolved and show a localized partial-failure note; `DataStatusBadge='partial'`.
- **Stale:** if `provenance.lastModifiedAt` older than freshness threshold, show
  `FreshnessBadge` in a muted/"stale" style with "ultima actualizare" date.

## Accessibility and i18n

- Tab is keyboard reachable via the host tab list; section has an `<h2>Litigii</h2>`
  landmark and `aria-labelledby` on the region.
- Table uses semantic `<table>` with `<th scope="col">`; below `md` it becomes a
  stacked label:value list keeping headers as row labels.
- Chart has an adjacent textual summary ("Volum anual: 2024 — N, 2023 — N…") and the
  same data in a small fallback table.
- All strings via Lingui macros; Romanian primary. Numbers/dates via `Intl`/
  `i18n.locale`. Expand ICCJ/ECRIS on first use or in tooltip.

## Privacy, provenance, source citation

- **No person data.** The slice only ever shows the profiled entity as a party and
  publishable counterpart names are out of scope here (counterparties are shown on
  case detail, not in this summary list). Persons never appear.
- **Candidate labeling mandatory.** `PrivacyBoundaryNotice(variant='candidate-link')`
  is always rendered; each match carries `IdentityConfidenceBadge`. Copy must say
  "legătură pe bază de nume (candidat)", never "această firmă are X dosare" as fact.
- **Provenance:** `CoverageRibbon` content is inherited from the page; the slice adds
  its own `FreshnessBadge` + `SourceProvenanceDrawer` (source `portal_just`,
  retrieval/modified dates, "doar metadata", "fără ICCJ").
- **Gate honesty:** gated state explicitly says linking is not yet published; no
  fabricated counts.

## Acceptance checklist

- [ ] `litigii` tab appears on `/companies/$cui`; litigation section appears on
      `/entities/$cui`, both via the existing local pattern (no new route).
- [ ] Default v1 (gated) renders the "linking in review" panel, not an empty list.
- [ ] When populated, headline count, candidate notice, confidence badges, case
      table, and mini summary all render with locale-aware formatting.
- [ ] Every match carries an `IdentityConfidenceBadge`; no identity is asserted as
      fact.
- [ ] No person names anywhere; no person search affordance.
- [ ] Case rows link to `/justitie/dosare/$caseId` with `from` context.
- [ ] Empty/zero uses coverage-aware copy; gated uses gate copy; partial/stale/error
      states implemented.
- [ ] `FreshnessBadge` + `SourceProvenanceDrawer` present; ICCJ-absence caveat shown.
- [ ] Search params validated in schema with `.catch` defaults; `yarn typecheck`
      passes; strings extracted/compiled.

## Non-goals

- No company auto-matching publish decision (gate #9 product fork) — slice consumes
  whatever the API returns.
- No litigation×procurement correlation analytics (advanced feature).
- No counterparty/party detail here (lives on case detail).
- No appeal-chain/lineage rendering.
- No full-text/person search.

## Open questions (true blockers only)

None. The publication-fork threshold (gate #9) is a product decision that only
changes which matches the API returns; the slice already handles gated and populated
states without code changes.
