# Justice (Justiție) — UX Handoff

Source UX document: `docs/ux-research/justice.md`
Shared foundation: `docs/design/README.md`

## Product intent

One paragraph. Transparenta.eu holds a large, privacy-critical judicial corpus
(`justice.cases` = 6,334,777 cases, 16.76M party mentions, 246 mapped courts).
The product turns this into **accountability of companies and public institutions
in court** and **system-level court transparency**, without ever exposing private
individuals. The first and safest surface is a **litigation slice on existing
company/entity profiles**; the broader `/justitie` area hosts court caseload
analytics, case detail, search, and an honest coverage/privacy story. Persons are
structurally never named: only publishable company/public name keys are
displayable, and there is no person-name search and no full-text search over case
text. (Fact: scraper notes, `docs/ux-research/justice.md` §1, §5, §15.)

## User roles and top jobs

- **Casual public user** (Decision: legible-first). Job: "Is company/institution
  X in court? Roughly how much, and what does that mean?" — answered on the
  profile they already landed on.
- **Journalist / analyst / NGO / watchdog** (Decision: primary optimization
  target per UX §3). Jobs: investigate court caseloads, find frequent publishable
  litigants, cross-reference litigation with procurement/PNRR/budget, export
  cohorts.
- **Domain expert (lawyer, court watcher, civic-tech)**. Jobs: precise case search
  (court, number, stage, category, year, party kind/role), case detail with
  hearing timeline and appeals, legal-reference exploration, appeal lineage when
  precision-gated lanes go live.

## MVP scope

In priority order (matches assigned feature order):

1. **Company-litigation slice** on `/companies/$cui` and `/entities/$cui` — a
   `Litigii` tab/section. Highest value-to-risk; rides existing profile infra;
   aligns with the `get_company_litigation` MCP tool.
2. **Court caseload analytics** at `/justitie/instante/$courtId` — volume by
   year/category/stage, appeal rate, top publishable litigants. Uses only
   populated, privacy-safe metadata; aligns with `get_court_caseload`.
3. **Case detail (public/non-person)** at `/justitie/dosare/$caseId` — header,
   hearing timeline, appeals, party roles (companies/public named; persons as
   counts), legal references when live; aligns with `get_judicial_case`.
4. **Justice landing + coverage/privacy honesty** at `/justitie` — hero counts,
   coverage callout (dense 2021+, no ICCJ, metadata-only), privacy notice, entry
   search, court picker.
5. **Case search/listing** at `/justitie/cautare` — faceted metadata filters
   (court, tier, category, stage, year, party kind/role) + results table; no
   person-name field; aligns with `resolve_judicial_filters`.

## High-value next scope

6. **Top publishable litigant rankings** (court-/county-/category-scoped) from the
   `party_name_keys` dictionary with `mention_count`.
7. **Legal-reference exploration** (case ↔ `legal.acts`) — gated until citation
   precision gate #11 is green; ships as a `Acte citate` section on case detail
   and a "Cazuri care citează" count/sample on the legal-act page.

Out of scope here (advanced, separately gated): appeal-chain/lineage traversal
(gate #10), company auto-matching publish fork (gate #9), cross-court dashboards,
ICCJ/CCR/HUDOC full-text, litigation×procurement correlation.

## Source / data constraints (all Fact unless noted)

- **Populated, privacy-safe (usable now):** `justice.courts` (246), `justice.cases`
  (6.33M), `justice.case_hearings` (~18.62M), `justice.case_appeals` (~2.25M),
  `justice.case_parties` (16.76M; kinds/roles/`name_key_id` only), and
  `justice.party_name_keys` (745,538 publishable company/public names).
- **DDL-only / gated / empty in v1:** `party_company_candidates` (gate #9),
  `case_legal_references` (gate #11), `case_lineage_candidates` (gate #10). UI must
  treat these as "coming soon", not "none exist".
- **No CUI in the judicial source.** Company linking is name-only →
  candidates-with-confidence, never hard identity. The CUI↔name-key bridge
  (`party_company_candidates`) is empty in v1, so a profile→cases join is itself a
  gated lane (Decision: the slice's default v1 state is "linking in review").
- **Coverage:** dense ≈ 2021+ (2024=1.44M, 2023=1.34M, 2025=1.27M, 2026=475k,
  2022=458k, 2021=153k, 2020=59k); ~757k non-standard numbers; pre-2013-05
  unreachable via the SOAP window.
- **ICCJ permanently absent** from the ECRIS/Portal Just source and not a
  `justice.courts` row. Must be stated wherever "highest court"/appeal-top is
  implied.
- **Metadata only — no case documents** (no PDFs/indictments/written decisions).
- **Cardinalities for filters:** 11 categories, 17 stages, 316 departments
  (UX §11).
- **Mutation norm:** cases gain hearings/solutions for years; sync is
  watermark-incremental. Show "actualizat la"; never imply real-time.
- **Court param mapping (Decision):** route `$courtId` = `justice.courts.
  institution_code`. `$caseId` = opaque internal `justice.cases.case_id` (not
  `case_number`, which contains slashes). Assumption: `case_id` is URL-safe as an
  opaque identifier; if the API exposes only the natural key, the adapter encodes
  it.
- **Client catalog (Fact):** `src/lib/scraper-references/catalog.ts` has
  `legal-judicial-cases` (lifecycle `loading`, `privacySensitive: true`, empty
  `clientFeaturePaths`). Decision: justice work adds `src/features/justice/` to its
  `clientFeaturePaths` and `src/schemas/justice.ts` to `clientSchemaPaths`.

## Privacy / provenance constraints (structural, non-negotiable)

- **No person-name search, ever.** (Fact/policy, UX §11, §15.)
- **Persons rendered only as role-counts:** e.g. `Pârât: 2 persoane fizice — nume
  necomunicate`. Never named, never linkable.
- **`party_name_keys` is the only name surface.** Only `company`/`public_entity`
  publishable keys are displayable.
- **No full-text search over `object`/`solution`/`solution_summary`** (they can
  contain incidental person names). These fields may be displayed on a case-detail
  page reached by `caseId`, but only behind a `PrivacyBoundaryNotice` and never
  indexed/searchable. (Fact + Decision.)
- **Company links are candidates, not identity.** Always label with confidence
  tier/method via `IdentityConfidenceBadge`; even high-precision matching yields
  10³–10⁴ wrong cases at scale.
- **Every justice surface shows coverage + freshness near the result**
  (`CoverageRibbon` / `FreshnessBadge`), and a `DataStatusBadge` for
  live/mock/partial/stale/gated.
- **Zero-result copy guardrail:** "Nu am găsit cauze publicabile pentru această
  acoperire" — never "nu există cauze".

## Design implications

- Build investigative work surfaces (lists, tables, timelines, ranked bars, court
  analytics), not marketing dashboards. Compact typography; cards reserved for
  repeated records and framed tools; no nested cards; radii ≤ 8px.
- Reuse the existing profile **tab/section** pattern for the slice (mirrors
  `ContractsView`); reuse `ChartRenderer` time-series/bar charts for analytics;
  reuse shadcn `Table`, `Tabs`, `Badge`, `Sheet`, `Pagination`, `EmptyState`,
  `Skeleton`, base-filter components.
- Introduce shared **data-trust** components (none exist yet): `CoverageRibbon`,
  `DataStatusBadge`, `FreshnessBadge`, `PrivacyBoundaryNotice`,
  `IdentityConfidenceBadge`, `EvidenceLink`, `RelatedLinksRail`,
  `SourceProvenanceDrawer`. Plus justice components: `CaseTimeline`,
  `PartyRolesList`, `CourtCaseloadCharts`, `TopLitigantsList`, `CaseResultsTable`,
  `CourtPicker`.
- Mock-first: feature API adapters under `src/features/justice/api/` with
  `.live.ts` / `.mock.ts` split, shapes mirroring the serving schema, plus a
  **lane-availability** object so gate-aware "coming soon" states render honestly.

## Blockers (true blockers only)

None for the MVP set. The MVP design is fully decidable from populated,
privacy-safe data plus gate-aware "coming soon" states. The following are product
decisions that change *behavior of gated lanes only* and do not block MVP build:

- Publication fork threshold/tier for showing company cases on public profiles
  (gate #9) — until decided, the slice ships its gated "linking in review" state.
- Whether justice joins global search in v1, and with which publishable-only
  fields — search-listing ships scoped to its own route regardless.
