# Feature: Court Caseload Analytics

Domain: Justice · Priority: **MVP #2** · Status: build-ready
Route: `/justitie/instante/$courtId` · Companion: `../design.md`, `../ux.md` ·
Source: `docs/ux-research/justice.md` §13.2, §10.3, §12

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
shadcn/ui + Recharts via `ChartRenderer` + Lingui). Comfortable with file-based
nested routes, search-param-driven tabs, and chart+table dual rendering. No backend.

## Summary

A per-court analytics page keyed by `institution_code`. Shows court identity (level,
locality, county, parent court), and aggregate analytics built from already-populated,
privacy-safe metadata: case volume by year, category and stage breakdowns, appeal
rate, and a ranked list of top publishable company/public litigants for that court.
Includes explicit per-court coverage honesty (year range, ICCJ absence, metadata
only). This page contains **no person data** and **no case text**.

## Facts / Decisions / Assumptions

- **Fact:** `justice.courts` = 246 (179 judecătorii, 46 tribunale, 5 tribunale
  militare, 15 curți de apel, 1 Curtea Militară de Apel); columns include
  `institution_code`, `court_level`, `specialization`, `locality`, `county_code`,
  `parent_institution_code`, `mapping_confidence` (245 high / 1 medium).
- **Fact:** Aggregates come from `justice.cases` + `case_hearings` + `case_appeals`
  (all populated). Aligns with the `get_court_caseload` MCP tool.
- **Fact:** ICCJ is **not** a court row; it is permanently absent from this source.
- **Fact:** Top publishable litigants use `party_name_keys` (`mention_count`) +
  `case_parties`; persons excluded by construction.
- **Decision — `courtId` = `institution_code`.** Route param maps directly.
- **Decision — tabbed analytics** via search param `tab`: `prezentare` (default,
  identity + headline + volume), `volum` (cases-over-time detail), `categorii`
  (category + stage breakdowns + appeal rate), `litiganti` (top publishable
  litigants — see `top-publishable-litigants.md`).
- **Decision — charts always paired with a fallback table** (accessibility +
  foundation).
- **Assumption:** aggregates are pre-computed server-side (counts by year/category/
  stage, appeal rate). The mock returns them already aggregated; the client does not
  aggregate 6M rows.
- **Assumption:** `parentInstitutionCode` resolves to a parent court name server-side
  for the breadcrumb/"face parte din" link.

## Route and URL state

`src/routes/justitie/instante.$courtId.tsx`:

```ts
export const Route = createFileRoute('/justitie/instante/$courtId')({
  validateSearch: parseCourtAnalyticsSearch,   // src/schemas/justice.ts
  loader: async ({ params }) => { /* fetch court + analytics; notFound() if missing */ },
  head: ({ loaderData }) => { /* SEO: court name */ },
})
```

Search schema (`src/schemas/justice.ts`):

```ts
const courtAnalyticsSearchSchema = z.object({
  tab: z.enum(['prezentare','volum','categorii','litiganti']).optional().catch('prezentare'),
  year: z.coerce.number().int().optional().catch(undefined),       // focus year for breakdowns
  category: z.string().optional().catch(undefined),                // drill into one category
})
```

- Cross-links: a category bar → `/justitie/cautare?court=$courtId&category=…`; a
  litigant → `/justitie/cautare?court=$courtId&q=…` (litigant name key, never a
  person). Preserve `from=instante:$courtId`.

## Data contract and mock states

Adapter `fetchCourtCaseload(courtId, { tab, year, category })`:

```ts
type CourtCaseloadResult = {
  court: JusticeCourt & { parentCourtName: string | null }
  headline: {
    totalCases: number
    totalHearings: number
    totalAppeals: number
    appealRatePct: number | null            // appeals / cases, null if not computed
    yearRange: { min: number; max: number }
  }
  volumeByYear: { year: number; count: number }[]      // honest thinning pre-2021
  byCategory: { category: string; categoryName: string; count: number }[]   // ≤11
  byStage: { stage: string; stageName: string; count: number }[]            // ≤17
  topLitigants: {                            // publishable only; see top-publishable-litigants.md
    nameKey: string; displayName: string;
    partyKind: 'company' | 'public_entity'; mentionCount: number;
    confidence: { tier: 'A'|'B'|'C'|'D'; method: string }
  }[]
  laneAvailability: JusticeLaneAvailability
  provenance: JusticeProvenance              // coverageNote per-court
}
```

**Mock states:** (a) high-volume tribunal (rich charts), (b) small judecătorie
(sparse pre-2021, demonstrates thinning), (c) military court (specialization label),
(d) the single `mapping_confidence: 'medium'` court (shows an identity-uncertainty
note), (e) zero-coverage edge (court mapped but no cases in range → coverage-aware
empty). `topLitigants` empty when the publishable join is unavailable for that court.

## UI structure

`CourtIdentityHeader` (level badge, locality, county, "face parte din {parent}" link,
`mapping_confidence` note when medium) → page-level `CoverageRibbon` (year range,
"fără ICCJ", "doar metadata") → tab nav (`Tabs`) → tab panels:

- **prezentare:** headline stats row (Cauze, Ședințe, Apeluri, Rată apel) +
  `volumeByYear` `TimeSeriesAreaChart` + compact top-3 categories + link to full tabs.
- **volum:** larger cases-over-time chart with year focus; fallback table of
  year→count; note on pre-2021 thinning.
- **categorii:** `byCategory` + `byStage` as `AggregatedBarChart` horizontal bars
  with counts; appeal-rate indicator; each bar links to prefiltered search.
- **litiganti:** `TopLitigantsList` (see dedicated feature file) with confidence
  labels + `PrivacyBoundaryNotice(variant='candidate-link')`.

`SourceProvenanceDrawer` trigger in footer.

## Component reuse and new components

- Reuse: `Tabs`, `Badge`, `Table`, `Tooltip`, `Skeleton`, `EmptyState`,
  `ChartRenderer` (`TimeSeriesAreaChart`, `AggregatedBarChart`), `breadcrumb`.
- New shared (data-trust): `CoverageRibbon`, `DataStatusBadge`, `FreshnessBadge`,
  `SourceProvenanceDrawer`, `PrivacyBoundaryNotice`, `IdentityConfidenceBadge`.
- New justice: `CourtIdentityHeader`, `CourtCaseloadCharts`, `TopLitigantsList`.

## Interactions

- Tab change updates `tab` param; year focus updates `year`; category drill updates
  `category` and may switch to `categorii` tab.
- Category/stage bar click → prefiltered `/justitie/cautare`.
- Litigant click → prefiltered search (by name key) — never a person.
- Parent-court link → that court's analytics page.
- `CoverageRibbon` "detalii" → `SourceProvenanceDrawer`.

## Loading / empty / error / partial / stale states

- **Loading:** skeleton header + skeleton chart blocks + 5 skeleton bars.
- **Empty (covered court, no cases in range):** `EmptyState` "Nu am găsit cauze în
  intervalul acoperit pentru această instanță" + coverage note. Never "nu există".
- **Partial:** if litigants fail but volume loads, render volume + a localized note;
  `DataStatusBadge='partial'`.
- **Error:** full-page error boundary with retry; invalid `courtId` → `notFound()`.
- **Stale:** `FreshnessBadge` muted with last-modified date.
- **Medium mapping confidence:** identity note ("maparea acestei instanțe are
  încredere medie") via `PrivacyBoundaryNotice`/inline notice.

## Accessibility and i18n

- Each chart has an adjacent text summary and a fallback table with the same values.
- Tab list keyboard-navigable; panels `role="tabpanel"` with `aria-labelledby`.
- Court level/specialization labels localized; acronyms expanded (e.g. "Curte de
  apel", "Tribunal militar").
- Numbers/percent/dates via `Intl`/`i18n.locale`. All copy via Lingui.

## Privacy, provenance, source citation

- **No persons, no case text** on this page by construction.
- Top litigants are publishable name keys only; each carries an
  `IdentityConfidenceBadge` and a `candidate-link` notice.
- `CoverageRibbon` + `FreshnessBadge` + `SourceProvenanceDrawer` always present;
  ICCJ-absence and metadata-only stated per court.
- Empty results framed as coverage, not nonexistence.

## Acceptance checklist

- [ ] Route resolves `$courtId` → court identity header with level/locality/county/
      parent; invalid id → `notFound()`.
- [ ] Four tabs render via `tab` search param with `prezentare` default.
- [ ] Volume, category, stage, appeal-rate render as charts **and** fallback tables.
- [ ] Pre-2021 thinning is visible/annotated; coverage ribbon shows year range +
      "fără ICCJ" + metadata-only.
- [ ] Top litigants are publishable-only with confidence labels; no persons.
- [ ] Category/litigant click deep-links to prefiltered search with `from` context.
- [ ] Loading/empty/partial/stale/error states implemented; medium-confidence note
      shown for the one medium-mapped court.
- [ ] Search params validated with `.catch` defaults; `yarn typecheck` passes;
      strings extracted/compiled.

## Non-goals

- No cross-court comparison/dashboards (advanced).
- No county heatmap / per-capita (needs INS join — advanced).
- No case text, no person data, no appeal-chain graph.
- No CSV/export in MVP (can follow as a `ShareFilteredView` add).

## Open questions (true blockers only)

None.
