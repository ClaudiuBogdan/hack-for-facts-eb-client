# NGOs & Social-Service Providers — Domain Design

- **Source UX:** `docs/ux-research/ngos.md`
- **Foundation:** `docs/design/README.md` (obey all shared decisions)
- **Domain slug / output:** `ngos` → `docs/design/ngos/`

This file establishes the domain's design language and shared decisions. Feature
files under `features/` are the build-ready specs; they reference the components and
data shapes defined here.

---

## 1. Domain purpose and scope

**Decision:** Build one **organization-anchored, evidence-cited** surface set. The CUI
organization is always the anchor; each registry/accreditation/service/financial fact
is an evidence record cited to a source snapshot. Identity confidence is a first-class,
always-visible property — never inferred away.

**Fact:** Data is asymmetric: direct-CUI evidence is loaded and gate-verified;
financials are empty; MJ/SGG name-only records are raw and unpromoted. The design must
make these three states (confirmed / pending-data / unconfirmed) legible everywhere.

In scope: landing, profile, service discovery, evidence trail, identity-confidence
language, financial section (placeholder→live), name-only registry surfaces,
public-funding cross-links. Out of scope here: staff link-review queue, peer
benchmarking analytics, coverage-gap heatmaps, snapshot history explorer, backlog
sources — these are advanced features named for later.

---

## 2. High-level design patterns

- **Decision — Organization-anchored profile, not a tab dump.** The profile is a
  single scrollable investigative document with a sticky in-page section nav (anchor
  links), not a set of route tabs. Sections render in a fixed trust order: Identity →
  Legal registry → Sector memberships → Accreditations → Social services → Public
  utility → Financials → Public funding → Evidence trail.
- **Decision — Two identity tiers, visually separated.** Confirmed (direct-CUI)
  content occupies the main column. Name-only references (MJ/SGG matched to this name
  but not to this CUI) live in a clearly-bordered "Referinte neconfirmate" zone with
  amber treatment and explanatory copy. The two never visually blend.
- **Decision — Cite at the point of use.** Every section header carries a source
  citation chip (authority + snapshot date) that opens the `SourceProvenanceDrawer`.
  No claim is shown without an adjacent path to its provenance.
- **Decision — Status as a scannable strip.** A horizontal badge strip under the
  profile header summarizes derived statuses (Înregistrat, Acreditat, Furnizor
  licențiat, Utilitate publică, Sub sancțiune). Each badge is also explained in text
  in its section — color is never the only signal.
- **Decision — Freshness and coverage are furniture.** A `CoverageRibbon` sits near
  the primary result on landing and discovery; stale snapshots get an inline
  `StaleSnapshotNotice` (Alert) on the data they describe.
- **Decision — Geography-first discovery.** Service discovery uses the `MapListSync`
  pattern (synchronized faceted list + county map keyed by SIRUTA).
- **Decision — Honest emptiness.** Sections with zero rows render an explicit state
  ("Date financiare în curs de actualizare"), never a blank or omitted section, so
  absence of data is not read as absence of the thing.
- **Decision — Neutral, non-accusatory language.** Sanctions, mismatches, and
  unconfirmed identity use `semnal` / `necesită verificare` / `neconfirmat`, never
  wrongdoing labels.

---

## 3. Information architecture and routes

**Decision (canonical, per orchestrator):**

| Route | Purpose | Feature file |
| --- | --- | --- |
| `/ngos` | Landing: registry search, figures, counties, years (superseded by §12) | `ngo-landing-source-coverage.md` |
| `/ngos/$cui` | NGO entity profile (organization-anchored) | `ngo-entity-profile.md` |
| `/ngos/services` | Social-service provider/service discovery (list + map) | `social-service-provider-discovery.md` |
| `/ngos/sources/$snapshotId` | Per-snapshot source/provenance trail page | `evidence-trail-source-citations.md` |
| `/ngos/registry` | The national registry asked as the analytics page asks its records (superseded by §15) | `name-only-registry-surfaces.md` |
| `/ngos/public-utility` | SGG public-utility name-only listing (Next-2) | `name-only-registry-surfaces.md` |
| `/ngos/review` | Link-review queue (advanced, staff-gated) | out of scope (named only) |

**Decision — `/entities/$cui` integration.** Keep `/entities/$cui` as the shared
cross-domain CUI shell. For `kind=ngo` organizations, the entities shell shows an NGO
context band and a prominent "Vezi profilul ONG" link to `/ngos/$cui`. Update the
global entity-search routing so NGO hits deep-link to `/ngos/$cui` instead of
`/entities/$cui` (current behavior in
`src/features/entity-search/lib/entity-search-routing.ts:47`). This is the one allowed
routing change; implement it in the search-routing adapter, not by rebuilding search.

**Decision — Route language (2026-09-30, replacing the Romanian slugs of
2026-06-26).** English paths, Romanian UI copy, as `/achizitii` became
`/procurement`: `/ngos`, `/ngos/$cui`, `/ngos/registry`, `/ngos/services`,
`/ngos/sources/$snapshotId`, and later `/ngos/public-utility` and
`/ngos/review`. The first release's `/ong-uri/*` paths answer with one 301
each to their new page, parameters and search carried over (the registry's
and the services page's search already in the target's own shape, so no
second hop).

**Decision — Evidence-trail addressing.** The evidence trail is both an in-profile
section and a dedicated per-snapshot page at `/ngos/sources/$snapshotId`. Inline
citation chips link to that page (or open the drawer for the quick view).

**Decision — Shared URL state** (foundation parameter names): `q`, `county`,
`locality`, `siruta`, `service_type`, `provider_type`, `status`, `valid`, `sector`,
`accreditation`, `public_utility`, `sanction`, `identity`, `source`, `year`, `sort`,
`view`, `tab`, `page`, `pageSize`, `selected`, `from`. Multi-value filters use
comma-separated strings parsed by the route's Zod `validateSearch`, matching the
existing entity/company route validation idiom. Default views render with no params.

---

## 4. Shared layout and navigation decisions

- **Decision — Page frame.** Constrained content column `max-w-5xl mx-auto px-6` for
  profile/landing; discovery uses a wider two-pane layout (list + map) up to
  `max-w-7xl`. 8pt spacing grid throughout (per
  `src/features/advanced-map-analytics/DESIGN_PRINCIPLES.md`).
- **Decision — Header hierarchy.** Page title `text-2xl font-semibold tracking-tight`;
  section headers `text-lg font-semibold`; metadata `text-xs text-muted-foreground`.
  Reserve large type for the first-level title only (foundation).
- **Decision — In-page section nav.** Sticky left/top anchor nav on the profile
  (county-aware), each item reflecting whether its section has data, is empty, or is
  name-only/unconfirmed.
- **Decision — Sidebar nav entry.** Add "ONG-uri" to the app sidebar
  (`src/components/sidebar`) pointing to `/ngos`. (Implementation note for the
  landing feature owner; no design block.)
- **Decision — Breadcrumbs.** Use existing `breadcrumb` UI:
  `ONG-uri / <Organization name>` on profile; `ONG-uri / Servicii sociale` on
  discovery; `ONG-uri / Sursă / <authority> <snapshot date>` on the trail page.
- **Decision — No nested cards.** Sections are full-width unframed bands separated by
  `divide-y` / `border-t`. Cards are reserved for repeated records (service rows,
  evidence rows, result cards) and the provenance drawer.

---

## 5. Domain components and reuse plan

### Reuse existing shadcn / client components (foundation §"Shared Components")

- `Badge`, `Button`, `Tabs`, `Table`, `Sheet`, `Dialog`, `Tooltip`, `Select`,
  `MultiSelect` / `styled-multi-select`, `Accordion`, `Collapsible`, `Breadcrumb`,
  `Skeleton`, `EmptyState`, `Alert`, `CopyButton`, `Pagination`, `ScrollArea`,
  `filter-tag` (`FilterTag` / `FilterTagsContainer`), `active-filters-bar`.
- `EntitySearch` / `FloatingEntitySearch` (`src/components/entities/EntitySearch`) for
  the landing/profile search box.
- `InteractiveMap` (`src/components/maps/InteractiveMap.tsx`, MapLibre) + `MapLegend`
  for service discovery; reuse SIRUTA/County feature styling and `getTooltipContent`.
- `county-filter` (`src/components/filters/county-filter`) for county selection.
- lucide icons for status/icon labels.

### Domain / foundation components to standardize (build under the feature module)

These are named in the foundation as cross-domain primitives; implement them so other
domains can reuse. Place shared ones in `src/components/provenance/` and
`src/components/identity/` (proposed) or, if a single domain needs them first, under
the owning feature module and promote later.

- **`IdentityConfidenceBadge`** — high/medium/low identity certainty. NGO usage:
  `confirmat` (direct-CUI), `neconfirmat` (name-only), `candidat` (review case with
  confidence). Props: `basis: 'direct_cui' | 'name_review' | 'external_projection' | 'none'`,
  `confidence?: number`, `reviewStatus?`. Owned by `identity-confidence-communication.md`.
- **`NgoStatusBadge` (set)** — built on `Badge`. Statuses: `registered`,
  `accredited`, `licensed_provider`, `public_utility`, `under_sanction`, plus a
  derived `active | expiring | expired` validity state. Color + icon + text; clickable
  to the relevant section. Owned by `ngo-entity-profile.md`, consumed widely.
- **`SourceCitationChip` / `EvidenceLink`** — inline `Sursă: <authority>,
  <snapshot date>` chip that opens `SourceProvenanceDrawer` or links to
  `/ngos/sources/$snapshotId`. Owned by `evidence-trail-source-citations.md`.
- **`SourceProvenanceDrawer`** — `Sheet` showing source URL, snapshot date, content
  SHA-256, parser version, header/schema fingerprints, row count, status, accepted_at,
  review_status, confidence, and per-snapshot `validation_issues`. Owned by
  `evidence-trail-source-citations.md`.
- **`FreshnessBadge`** — `actualizat la` / `publicat la` / `date până la <date>`.
  Foundation component; consumed by landing, discovery, profile sections.
- **`StaleSnapshotNotice`** — `Alert` (warning) with snapshot date + "Datele pot fi
  depășite; așteptăm o sursă oficială mai nouă." Domain wrapper over `Alert`. Owned by
  `social-service-provider-discovery.md`, consumed by profile service section + landing.
- **`CoverageRibbon`** — compact source/freshness/known-gap summary near the primary
  result. Owned by `ngo-landing-source-coverage.md`.
- **`DataStatusBadge`** — `live | mock | partial | stale | blocked | unverified`.
  Foundation component; used to mark mock-vs-live during mock-first dev and to flag the
  empty financials section.
- **`PrivacyBoundaryNotice`** — explains aggregation/redaction/non-display. Used on
  name-only surfaces and any future sensitive source.
- **`ValidityTimeline`** — domain visual: `valid_from → valid_until` bar with
  active/expiring/expired states; tabular fallback required. Owned by
  `ngo-entity-profile.md` (accreditations + services), reused in discovery.
- **`UnconfirmedRecordCard`** — name-only MJ/SGG record card with disambiguating
  fields (county, court, registry number, address) and an explicit "identitate
  neconfirmată" header. Owned by `name-only-registry-surfaces.md`, reused in the
  profile's references zone.
- **`RelatedLinksRail`** — narrow cross-domain links (company via CUI, ANAF, public
  entity, procurement, PNRR, territory/SIRUTA map). Owned by
  `public-funding-cross-links.md`, consumed by the profile.
- **`MapListSync`** — synchronized map+list pattern. Owned by
  `social-service-provider-discovery.md`.

**Decision — No card-in-card.** Drawers and result/record cards are leaf containers.

---

## 6. Data model expectations at the UI boundary

**Decision — Mock-first.** Each feature defines a TS type that mirrors the `ngo.*`
serving columns named in `docs/ux-research/ngos.md` §5. API adapters live under the
feature module's `api/` with mocks alongside; the UI consumes the typed boundary, so
swapping mock→live is an adapter change. Mark mock-rendered surfaces with
`DataStatusBadge variant="mock"` during development.

Shared boundary shapes (authoritative field lists; null where the source omits a field):

```ts
// One row per organization-evidence link (the citation spine).
type EvidenceRecord = {
  evidenceKind:
    | 'legal_registry' | 'sector_membership' | 'accreditation'
    | 'social_service_provider' | 'social_service' | 'public_utility'
    | 'fiscal_status' | 'financial_indicator' | 'funding_projection'
    | 'name_only_reference'
  identityBasis: 'direct_cui' | 'name_review' | 'external_projection' | 'none'
  reviewStatus: 'accepted' | 'review_pending' | 'rejected' | 'unmatched'
  confidence: number | null            // 0–1; null shown as "n/a"
  sourceId: string
  sourceRecordKey: string
  sourceSnapshotId: string
  sourceUrl: string | null
  attrs: Record<string, unknown> | null
}

type SourceSnapshot = {
  sourceSnapshotId: string
  sourceId: string                     // ANOFM | MMuncii | ANAF | MJ | SGG
  sourceUrl: string | null
  contentSha256: string | null
  contentLengthBytes: number | null
  parserVersion: string | null
  schemaFingerprint: string | null
  headerFingerprint: string | null
  rowCount: number | null
  status: string
  isCurrent: boolean
  sourceDeclaredSnapshotDate: string | null  // ISO; the "snapshot date" shown to users
  acceptedAt: string | null
}

type OrganizationHeader = {
  cui: string
  name: string
  kind: 'ngo' | 'company' | 'public_entity' | string
  alsoKinds: string[]                  // e.g. ['company'] when CUI collides (9,690 cases)
  county: string | null
  locality: string | null
  identityBasis: EvidenceRecord['identityBasis']
}

type SectorMembership = {
  cui: string; organizationName: string
  sector: 'social_economy' | string
  membershipType: 'rueis' | string
  certificateNumber: string | null; certificateDate: string | null
  validUntil: string | null
  status: string
  sanctionStatus: string | null       // surface prominently when present
  county: string | null; locality: string | null
  sourceSnapshotId: string
}

type Accreditation = {
  cui: string; organizationName: string
  authority: 'ANOFM' | string
  accreditationType: 'employment_service_provider' | string
  registrationCode: string | null; accreditationNumber: string | null
  validFrom: string | null; validUntil: string | null
  status: string
  county: string | null; locality: string | null
  sourceSnapshotId: string
}

type SocialServiceProvider = {
  cui: string; providerName: string; providerType: string | null
  county: string | null; locality: string | null
  sirutaCode: string | null; address: string | null
  licenseNumber: string | null; status: string
  sourceSnapshotId: string; sourceRecordKey: string; sourceRowHash: string
}

type SocialService = {
  providerCui: string; providerName: string
  serviceName: string; serviceType: string | null; serviceCode: string | null
  county: string | null; locality: string | null
  sirutaCode: string | null; address: string | null
  licenseNumber: string | null
  validFrom: string | null; validUntil: string | null
  capacity: number | null; status: string
  sourceSnapshotId: string
}

// Name-only — identity NOT confirmed. Never rendered as "the ONG".
type LegalRegistryRecord = {            // MJ; document_date/document_number are DEAD — do not render
  entityKind: string; registryNumber: string | null; courtName: string | null
  organizationName: string; legalForm: string | null; registryStatus: string | null
  county: string | null; locality: string | null; address: string | null
  linkStatus: 'review_pending' | 'accepted' | 'rejected' | string
  sourceSnapshotId: string
}

type PublicUtilityStatus = {            // SGG; hg_date/recognition_year/order_number are ~0% populated
  organizationName: string; recognizingAuthority: string | null
  hgNumber: string | null               // usually the only populated decree identifier
  hgDate: string | null; orderNumber: string | null; recognitionYear: number | null
  status: string | null
  linkStatus: 'review_pending' | 'accepted' | 'rejected' | string
  sourceSnapshotId: string
}

type FinancialIndicator = {             // 0 rows today — section renders placeholder
  cui: string; fiscalYear: number; indicatorKey: string
  value: number | null; unit: string | null
  sourceSnapshotId: string
}

type LinkReviewCase = {
  candidateOrgId: string | null; candidateCui: string | null
  evidenceName: string; candidateName: string | null
  method: string; confidence: number | null
  reviewStatus: 'pending' | 'accepted' | 'rejected' | 'needs_more_evidence'
  comparedFields: Record<string, unknown> | null; decisionNotes: string | null
}

type ValidationIssue = {
  sourceSnapshotId: string
  severity: 'warning' | 'blocker' | string
  code: string; message: string; count: number | null
}
```

**Decision — Derived fields computed in the UI adapter, not invented data:**
- `status: active | expiring | expired` from `validUntil` vs today (expiring = within
  configurable window, default 60 days). Always show the raw `validUntil` date too.
- `NgoStatusBadge` set derived from presence of accepted evidence per kind +
  `sanctionStatus` truthiness.
- `OrganizationHeader.alsoKinds` from hub kinds; drives the "acest CUI apare și ca
  firmă" cross-link.

---

## 7. Feature implementation map (MVP first, then high-value next)

1. **MVP-1** `ngo-entity-profile.md` — `/ngos/$cui`. Anchor surface; consumes all
   confirmed evidence + the references zone + financial placeholder + evidence trail.
2. **MVP-2** `social-service-provider-discovery.md` — `/ngos/services`. List+map.
3. **MVP-3** `evidence-trail-source-citations.md` — citation chips + provenance drawer
   + `/ngos/sources/$snapshotId`.
4. **MVP-4** `identity-confidence-communication.md` — `IdentityConfidenceBadge` +
   confirmed/name-only section separation rules (cross-cutting).
5. **MVP-5** `ngo-landing-source-coverage.md` — `/ngos` landing + `CoverageRibbon`.
6. **Next-1** `anaf-financial-enrichment-section.md` — profile financial section
   (placeholder → live).
7. **Next-2** `name-only-registry-surfaces.md` — `/ngos/registry` +
   `/ngos/public-utility`.
8. **Next-3** `public-funding-cross-links.md` — profile "Fonduri publice" section +
   `RelatedLinksRail`.

**Decision — Build order dependency:** MVP-4 components (`IdentityConfidenceBadge`)
and MVP-3 components (`SourceCitationChip`, `SourceProvenanceDrawer`) are dependencies
of MVP-1; build them first or in parallel as shared primitives. MVP-1 and MVP-2 can
proceed independently once shared components exist.

---

## 8. Responsive behavior

- **Decision — Profile.** Single column on mobile; section anchor nav collapses into a
  top `Select`/segmented jump menu. Status badge strip wraps. Evidence trail and tables
  become horizontally scrollable within `ScrollArea` while preserving table semantics.
- **Decision — Discovery.** Desktop: list + map side by side (`MapListSync`). Mobile:
  segmented toggle between `Listă` and `Hartă` (single pane), filters in a `Sheet`.
- **Decision — Landing.** Coverage matrix is a real `Table` on desktop; on mobile it
  becomes stacked rows (one block per source) — never a horizontally-clipped table
  without scroll affordance.
- **Decision — Tables.** All comparison tables keep semantic markup and wrap in
  `ScrollArea` with sticky header row on small screens.

---

## 9. Accessibility, i18n, privacy, and provenance

**Accessibility (foundation + DESIGN_PRINCIPLES):**
- All controls keyboard reachable with visible `focus-visible` rings; icon-only
  buttons have `aria-label`; decorative icons `aria-hidden`.
- Status/identity badges are never the only signal — each has adjacent text and lives
  in a labeled section. Tooltips clarify but never hold the only critical info.
- Tables keep semantic markup + descriptive `<th>`. Map and timeline have adjacent
  textual summaries and tabular fallbacks for key values.
- `Sheet`/`Dialog` (provenance drawer, filters) manage focus, have headings + close
  controls.

**i18n (Lingui):**
- All user-facing text uses Lingui macros (`t\`\`` / `<Trans>`). Primary labels
  Romanian; English via existing catalogs.
- Dates, numbers, money, capacity, percentages, confidence use locale-aware formatting
  (`Intl.*`).
- Expand acronyms on first use or via tooltip: ONG, CUI, RUEIS, ANOFM, MMuncii, MJ,
  SGG, HG, SIRUTA. Copy guardrails (foundation/UX): `identitate confirmată prin CUI`
  for direct-CUI; `referință din registru — identitate neconfirmată` for name-only.

**Privacy / provenance:**
- Every section header carries a source citation; the provenance drawer is one click
  away from any claim.
- Name-only records are separated, amber, and labeled; no speculative identity claims;
  candidate matches require a `link_review_case` with confidence and are labeled
  candidates.
- Sanctions surface prominently with source+date. Empty financials render an explicit
  in-progress state. Stale snapshots carry a `StaleSnapshotNotice` on the data itself.

---

## 10. Acceptance criteria (domain-level)

- **Routes** `/ngos`, `/ngos/$cui`, `/ngos/services`, and
  `/ngos/sources/$snapshotId` exist with Zod `validateSearch` and render default
  views without query params. Next-2 adds `/ngos/registry` and
  `/ngos/public-utility`.
- **`/entities/$cui`** shows an NGO context band + link to `/ngos/$cui` for
  `kind=ngo`; global entity-search NGO hits deep-link to `/ngos/$cui`.
- **Every claim** on the profile and discovery surfaces exposes its source snapshot
  (authority + snapshot date + URL + SHA-256) via chip→drawer or the trail page.
- **Identity confidence** is visible at profile (badge), section (separation), and row
  (review_status/confidence) levels; name-only MJ/SGG never appear in the confirmed
  column.
- **Freshness** appears near the primary result on landing/discovery; stale
  social-service snapshots (10.04.2024 / 11.12.2023) are flagged on the data.
- **Empty/partial states** are explicit: empty financials → "în curs de actualizare";
  missing county/locality handled gracefully; CUI collision shows the company cross-link.
- **Mock-first**: each surface renders from typed mocks shaped like `ngo.*`; mock
  surfaces are marked with `DataStatusBadge`.
- `yarn typecheck` clean; i18n extracted/compiled; key views have at least smoke-level
  tests where the surrounding code has them.

## 11. Open questions (blockers only)

None block design or mock-first implementation. Non-blocking product decisions are
recorded in the relevant feature files (name-only public visibility timing; ANAF
indicator selection/sequencing; whether the link-review queue is public-expert or
staff-only).

## 12. The landing says what the registry holds, not how it was loaded (2026-09-23)

The landing spent its first screen on the pipeline — the production run ID,
rows loaded, a matrix of source snapshots, QA sample profiles, "next surfaces"
— and searched by CUI only. None of it answers what a reader brings to NGOs:
how many there are, where, what kind, whether a given one still exists. It
now takes the INS hub's composition and visual language
(`docs/design/statistics/design.md` §6, §6n, §6p, §6q), one band per idea:

- **Hero** — „ONG-urile din România", one sentence naming the Ministry of
  Justice's registry, and the **registry search**: by name (the registry's
  own `contains` filter, diacritic-insensitive) or by registry number
  (`3446/A/2026`, exact). Six rows, each opening the registry entry, with the
  legal form, the place and any status other than „Înregistrat" said on the
  row; Enter opens the registry list for the query. The site's universal index
  is not used: its NGO documents come from other sources, and most have no
  registry entry to open (Salvați Copiii and Crucea Roșie branches returned
  no profile on 2026-09-23). Beside it, the **legal forms** with count, share
  and an inline fill, each a filtered registry link.
- **Figures band** — registered NGOs (status „Înregistrat"), those new in
  2025 (against 2024), NGOs per 10,000 residents, and those the registry
  marks as of public utility. Each opens the registry filtered, or its band on
  this page; without a registry, public utility is not a link.
- **01 / Pe județe** — the INS hub's county map and ranking (readout, equal-
  count ramp on the `choropleth` tokens, codes at each county's pole of
  inaccessibility, first tap shows / second opens, legend with bounds and the
  national tick), over three layers in `?indicator=`: per 10,000 residents
  (default: Bucharest 128.7, Cluj 114.0, Harghita 113.8 against Olt 25.2),
  registered, new in 2025. A county opens its registered NGOs in the
  registry; without a registry a county is still focusable and read by the
  readout. Each layer names its entries with no county (3,795 registered,
  30 of 2025's new ones) and says they count only in the national figure —
  the density's 68.4 includes them, a placed-only one would be 66.4.
- **02 / An de an** — new entries per year, 2001–2025, as columns with the
  hub's reading (pointer, finger, arrow keys; a slider to a screen reader),
  the lede computed from the data („În 2025 au intrat în registru 4.331 de
  organizații noi, câte 11,9 pe zi."), and every entry by status in the order
  the law runs them: dissolved, in liquidation, struck off.
- **A year is the one in the registry number** (`3446/A/2026`), not the
  registration date. The first build counted dates and called them
  foundings; the review found 952 of the 5,040 entries dated 2025 carry
  numbers from 1994–2024. The date moves when an entry changes (6,530 dated
  2018 against 3,332 numbers of 2018), the number is kept: 4,088 of the 4,331
  numbers of 2025 are dated 2025, and the 1990s organisations taken into the
  registry in 2000 (12,067 entries on 16 August 2000 alone) kept their 1990s
  numbers. The chart starts in 2001 and its caption says both things. No
  claim of founding is made; „noi în registru" is what the number proves.
  A year's numbers keep arriving for a few weeks after it ends (243 of
  2025's are dated January–February 2026), so the latest year is read once
  the export reaches past it and settles to within about 1%. All counts here
  are after the 104 repeated rows are dropped.
- **Search** — Enter opens a highlighted row only while the list answers the
  field; otherwise it opens the registry list for what is typed. A failed
  read stops the spinner and offers the retry.
- **Sources** — one line: the registry and its export date, INS for the
  population.

**Data kept in the client.** The API serves the registry 100 records a page
with no counts, so the figures are computed once from a full read
(`scripts/capture-ngo-registry.mjs`, 1,414 pages, ~8 minutes) and INS POP105A
at 1 January 2025 (`scripts/summarize-ngo-registry.mjs`), and kept in
`src/features/ngos/hub/registry-summary.ts`. The route's loader imports it, so
it travels with this page and not in the entry bundle (4.3 KB, 1.5 KB
gzipped, measured there before the move). The page makes no API request of
its own: on a production build it answered in ~22 ms, LCP 392 ms (the h1),
CLS 0; it caches publicly for an hour. Counts
are of registry entries: rows repeated field for field (104 of 141,330) are
dropped, and nothing further is claimed about distinct organisations or
national completeness. A unit test holds every refresh to the summary's
arithmetic.

**Registry flag.** `VITE_NGO_REGISTRY_ENABLED` still means "this deployment's
API serves the registry": without it the page keeps its figures, map and
chart, and drops the search and every registry link.

**Removed**: the source-coverage matrix and its schema, fetchers, hook and
mock; the pipeline tiles; the CUI-only search; the sample profiles and the
"next surfaces" card. The mock services page is no longer linked from the
landing.

**Follow-ups, not in scope.** The county map and ranking duplicate the INS
hub's interaction code over a different data shape; they should become one
shared component once the INS comparisons work (`HubCountyMap` selection mode)
lands. The INS hub's two-line headings lose their space in the heading's text
(„Cifrele oficialeale României"); this page adds it.

## 13. The landing in the hubs' language, with the non-profit sector's money (2026-09-29)

Promoted from the `/development` prototype `ngos/hub`, variant **lideri** (the
year's largest NGOs beside the search, as `/companies` and `/procurement`
open). The rejected variant, **domenii**, put what NGOs do beside the search
(the `/ins` hero) and gave the largest a band of their own; it read well but
broke with the two newest hubs, and the domains need their toggle.

The registry says how many NGOs there are and where; it says nothing of
money. The page now also reads the **Ministry of Finance's non-profit
financial statements** — the files the NGO profile API serves
(`ngoOrganizationProfile.financials`), one per year on data.gov.ro
(`web_ong_an<YEAR>.txt`, 46 indicators by CUI) — summarised in the client by
`scripts/summarize-ngo-finances.mjs` into `finance-summary.ts`. Those
statements cover **every non-profit that files**: associations and
foundations, and also unions, religious bodies, parties and mutual-aid funds,
which are not in the NGO registry. The page calls that money the non-profit
sector's, never the registry's.

- **Hero** — the registry search, and **the registry's ten largest NGOs of
  2025 by revenue** (five shown, „Arată mai multe" for the rest — 2026-09-30),
  each with its domain, county and
  change vs 2024 (named for a screen reader too); a closed entry says so. The
  ranking is of the organisations the NGO profile resolves (a
  registry-declared CUI, or an exact ANAF name-and-county match) — ten among
  the 49 largest filers. A row opens `/ngos/$cui` only where the legacy
  overview resolves the CUI (`linked`; nine of ten): the inferred matches have
  no page until the client moves to `ngoOrganizationProfile`.
- **Sources in the head**, in one line, as `/procurement` says its own: the
  two sources as links and one date, the registry's last update (the owner's
  call, 2026-09-30); the statements' years, the publishers and the population
  year are in the full line closing the page. The line is set at the head's
  foot, just above its bottom rule, apart from what the head says (under the
  leaders on a phone) — `/procurement`'s layout since d55199ba.
- **Pinned bar** of the four numbered bands, as on `/procurement`. The crux
  marks sit on the head's bottom rule, where the bar begins, drawn above the
  bar (`z-30`), which covered them when they were drawn in the figures band —
  as `/procurement` draws its own.
- **Figures** — registered NGOs (status „Înregistrat"; the 2,355 in
  liquidation are in the registry too, so not „în registru"), non-profit
  revenue in 2025 (33.5 bn lei), statements filed for 2025 (61,367; 47,160
  with revenue), new registry entries in 2025.
- **01 / Pe județe** — first since 2026-09-30, the owner's call: where a
  reader starts. The INS and procurement hubs' county band itself
  (`HubCountyBand`), over the registry per 10,000 residents (a count at the
  capture, so „în 2026"), **how many are registered** (`?indicator=total`,
  back on 2026-09-30: a count, so no national figure to stand a county
  against and the ranking's bars run from zero; the caveat gives the
  country's total and the entries with no county), or the year's new entries
  per 100,000 (`?indicator=noi`). Drawn in the **choropleth ramp's five
  blues by quintile** (`ramp: 'steps'`), as the first NGO map was, not
  against the national figure in orange and blue: a density reads as more or
  fewer; the national figure is a mark on the legend, without the „sub/peste
  medie" sides. County codes are the background's colour on the two darkest
  blues and the full foreground on the rest (the softened label fell below
  4.5:1 on the middle blue). A count's unit agrees with its figure („1 ONG",
  „12 ONG-uri", „2.653 de ONG-uri"). The band gained `countyLink={null}` for
  deployments without the registry: counties are named, focusable shapes and
  plain rows; a tap holds the tooltip. Other hubs are unchanged: every one
  of these is opt-in.
- **02 / Ce fac organizațiile non-profit** — twelve reader domains from the non-profit activity
  (CAENO) each statement declares, by organisations or by revenue
  (`?domenii=venituri`): sport has the most (9,155), education the most money
  (5.1 bn lei). The catch-all code 9499 (46% of filers) is shown last and
  unranked as „Fără domeniu precis". Division 64 is „Creditare și ajutor
  reciproc", not mutual-aid funds alone: 6492 and 6499 are broader.
- **03 / Banii** — revenue classes (the 8.1% above 1 mil. lei hold 83% of the
  money; 14,184 had none, 23 reported negative revenue and hold no share),
  revenue by source (non-profit 82%, economic 17%, special-purpose 1.5%) and
  revenue per year 2016–2025 on the registrations chart's columns, in each
  year's lei.
- **04 / În registru** — registrations per year, status and legal forms.
- **Start cards** into the registry (public utility, in liquidation, all),
  each count the query it opens; only where the registry is on.

**Vintages.** MFP publishes a year about six months after it ends, then
republishes it about a year later with the late filers (2023's revision added
7% of statements and 4% of revenue), often inside a later year's package: the
2021 package holds the revised 2016–2020 files. The generator takes each
year's newest file from any package, by the year in the file's name, and
records its date and whether it is still a **first release** (2021, 2022 and
2025 are; the rest are revised). The chart draws first releases dashed and
names them; the headline figure gives no change against 2024, because 2025 is
a first release and 2024 a revision — it says „Prima publicare" and the date
instead („Revizuită" when the latest year is a revision with no year of its
own vintage before it). A change is printed only between two years of the
same vintage. The leaders are ranked on the first release too: a late filer
could be missing from them. The
leaders' own changes stand: a filer's statement does not move when others
file late.

**What the finance data cannot say, and the page therefore does not.** Staff
counts are not shown: filers type activity codes into them (9,499 or 9,329
„employees"). One 2019 statement reports 6.2 bn lei of revenue with no
expenses, repeating its fixed assets: statements above 1 bn lei are left out
of every sum, and of the leaders' bases, and named under the chart. The
indicators read (I14, I22, I30, I38) keep their meaning in every dictionary
from 2016; 2018's file carries unquoted activity names after I44, which the
generator refuses to read past, and a row shorter than the header is dropped,
never read as zeros. A CUI filed twice must be the same statement twice. The
cache is keyed by resource and modification, so a republished year is read
again. Money is never adjusted for inflation.

**Loading.** The page's chunk (the charts, the map, both summaries) loads
on a client navigation; until it does, the route's `pendingComponent`
(`ngo-hub-pending.tsx`) draws the page's own head from the same data-free
components (`ngo-hub-hero.tsx`: title, lede, a search-box shell, shortcuts,
the short sources line, the leaders' card), the pinned bar and the first
band's title, with a pulse the size of each figure. Measured against the page
at 390, 768, 1024, 1280 and 1440 px: nothing moves when the page lands. The
leaders' names keep two lines on a phone, long or short, so the placeholder
rows can be their height. The lede's width is in rem, not `ch`: `ch` is the
font's own, and the fallback font's narrower box broke the lede a line longer
until Inter arrived (a 33 px shift on desktop). `HomeSectionNav` and
`HomeBand` moved to `home-section-nav.tsx` so the eager route file does not
pull the site search in.

**Head.** Built in the request's language with `translatorFor`; each language
has its canonical (`?lang=en`) and names the other; the `Dataset` names the
registry, the statements and INS. The loader hands the head nine figures and
the page chunk imports both summaries (1.4 and 1.9 KB gzipped), so neither
travels in the hydration payload. On a production build: TTFB 27–70 ms warm,
LCP 320 ms desktop and 300 ms on a phone, CLS 0, no API request. Cached
publicly for an hour, `Vary: Cookie`.

**Reviews.** Codex (gpt-6-astra, xhigh) and an Opus 5.5 xhigh agent reviewed
the promotion, then verified the fixes in a second round; the vintage
handling, the sector wording, the registered-NGO label, the negative-revenue
class, the density's year, keyboard access in the no-link band, the domain
label for division 64 and the generator's parsing, cache and malformed-row
threshold all come from their findings.
The 2026-09-30 polish was reviewed by Codex (gpt-6.1-sol, xhigh) and an
Opus 5.5 xhigh agent: the head sources in one message (they were missing
from both catalogs), the placeholder's line counts per width, the count's
unit left out of the legend's title and agreed with its figure, the label
contrast on the middle blue, and the placeholder parts kept out of the
leaders' module (the eager route would have pulled in its formatters).

**Follow-ups.** Move `/ngos/$cui` to `ngoOrganizationProfile` (every leader
then links); move the pinned bar and band (`HomeSectionNav`, `HomeBand`, now
in `home-section-nav.tsx`) out of the procurement feature into shared landing
chrome.

## 14. The profile on `ngoOrganizationProfile` (2026-09-30)

Promoted from the `/development` prototype `ngos/profile`, variant **benzi**
(the companies profile's language: head, pinned bar, four figures, one band
per question). The owner chose it over **fisa** and **ani**, which were then
removed from the prototype at their request; the prototype stays, on its seven
real fixtures, as the design reference.

`/ngos/$cui` now reads `ngoOrganizationProfile(cui)` — the organisation the
registry and ANAF admit for a CUI — instead of the legacy
`ngoProfileOverview`, whose module is gone. Every hub leader opens its
profile (the `linked` flag that kept the inferred ones unlinked is dropped
from the finance summary).

- **Three requests, failing apart.** The loader reads, at once, the profile
  (identity, registry, ANAF, the statements' years; `null` → not found, a
  failure → the error page), every statement (a failure keeps the page, which
  says „nu s-au încărcat" — never „none" — and reads again on request) and
  the purpose's text (asked alone: until the server serves `purpose.text`,
  that request fails and the head simply has no purpose).
- **Head.** The name (a withheld one said as withheld), one sentence (form,
  place, ANAF registration date), **the registry's purpose** („Scop") as
  published — line breaks kept, the registry's own `<PERSON>` masking left as
  it is, four lines then „Arată mai multe" — the chips (registry status, VAT,
  fiscal inactivity explained as not dissolution, how the CUI was admitted,
  amber where only inferred; no universal „verified"), CUI and registry
  number; the last six years' revenue and expenses beside them.
- **Bands.** 01 Banii (the latest year by activity, revenue and expenses per
  year), 02 the statement row by row (every row under its own year's label,
  exact values from the filed strings — a blank cell „—", a reported zero 0 —
  the file and its dictionary linked), 03 year by year (the key rows as a
  matrix, newest first, a missing year an empty column; its header opens that
  year above), 04 ANAF and the registry, each read dated. A band's number is
  its place in the bar, which drops 03 when there is nothing to tabulate.
- **The year in the address** (`?an=2019`), as the app keeps its choices:
  a shared link opens the same statement.
- **Head (SEO).** Built in the request's language; the description is the
  purpose where it is published, or what the organisation is, where, and its
  latest revenue; canonical per language.
- **What the page does not say.** A figure the latest form does not give (a
  blank cell, or no such row that year) is left out of the four figures,
  never drawn as 0; a result is zero only where both the surplus and the
  deficit rows report zero. In the matrix „—" is only a blank cell in the
  source; a row that year's form lacks stays empty, said to a screen reader.
  A year without a statement is „fără situație pe platformă", not „absent
  from the files": the API cannot say that. With no statement at all, the
  statement's and the years' bands are not drawn, and the reason (not
  loaded, not published, none, or a failed read) is said once. ANAF's two
  reads — registration and fiscal status — are shown and dated apart. A name
  the registry's observations disagree on is flagged, not presented as
  agreed; the conflicts are named in words. Staff counts are in people, not
  lei; on a phone a filed plan is read under the actual figure.
- **Retries** read again through the router (`router.invalidate`), on the
  error page too (a boundary's reset alone rendered the same failure), busy
  while they run.
- **The purpose's request** is expected to fail until the server serves
  `purpose.text`; it passes `expectFailure` to the GraphQL client, which then
  logs a breadcrumb instead of a Sentry error per profile.
- **Reviews.** Codex (gpt-6.1-sol, xhigh) and an Opus 5.5 xhigh agent; every
  point above that says what the page does not say came from them.
- **Not yet.** The server's new sections — accredited social services,
  social-economy and employment-service certificates — are not deployed; the
  head will carry them as factual badges once they are. The statements'
  hydrated payload grows with the years (about 80 KB raw, 10 KB gzipped for
  17): the loader could send indicators as tuples if it grows.

## 15. The registry asked as the analytics page asks its records (2026-10-01)

Promoted from the `/development` prototype `ngos/registry`, variant
**intrebare** (designed by Fable on the owner's request, finished here; the
plain list `lista` stays in the prototype as the record). The rationale, the
API probes and the reader's questions are in
`src/development/prototypes/ngos/registry.RATIONALE.md`.

- **Shape.** The way back and the export's date; the selection as the
  headline („Fundațiile radiate din județul Cluj cu „kirali” în nume"), each
  filter a phrase that opens the sheet, its ✕ dropping it; „+ Adaugă un
  filtru" (one box over counties, forms, statuses, public utility, a name, a
  registry number), „Filtre (n)", ten ready questions, the link, one caveats
  marker (amber with a count when something is off). The statuses in the
  pinned bar (Toate · Înregistrate · Dizolvate · În lichidare · Radiate; the
  default is the registry, so a name finds a struck-off NGO). Four figures
  true of the selection. The answer: „Înregistrări" (25 a page, the export's
  order) or „Pe județe / localități / forme / stări / ani" — the axes the
  filters leave open; a row the address can say narrows to it. One source
  line, „Cum am numărat" behind it.
- **The address** keeps the route's keys (`q`, `county`, `category`,
  `status`, `registryNumber`, `publicUtility`), only those set; every hub
  link opens unchanged, and `/ong-uri/registru` answers with one 301 to it.
  A county the registry does not spell is reported as unread and filters
  nothing.
- **Counting what the API cannot.** `ngoRegistryRecords` has six filters,
  no count, no sort, no group-by. `scripts/count-ngo-registry.mjs` counts a
  full capture by county × locality × form × status × public utility ×
  registry-number year × declared CUI (`data/registry-counts.json`, 37,703
  cells, ~134 KB gzipped, refreshed with each export as the hub's summary).
  The page uses it only while the API serves the export it counted, for
  every selection without a name or a number; tests hold it to the hub's
  summary (every status, form, county, year). A name or a number is read
  whole up to 2,000 rows and counted from its own rows; past that, „N+" and
  the axes off, said under the tabs. Repeats are dropped by the same fields
  in the script and the page. A registry-number year before 1990 or after
  the export is a slip, counted as no year.
- **Server render.** The loader reads, on the server only, the first page
  (under a 4 s deadline) and the selection's tally from the counts, which
  stay in the server bundle; only the tally travels (without the country's
  ~3,000 localities, which no tab of it shows). A complete render is cached
  ten minutes; one without its first page is not. A client-side navigation
  reads nothing in the loader; the counts load as their own chunk.
- **The filters sheet** follows the procurement panel (procurement
  design.md §18.18), its parts copied into `components/filter-parts.tsx` and
  `use-active-option.ts` until the two branches meet on `dev` and the pieces
  move to one shared module: groups Registrul · Ce organizații · Unde ·
  Care; chips with ✕; the county one search, listed one a row with its code
  (the owner's choice over procurement's grid). County only: the registry
  filters no region and no locality. A list closed or a field turned into
  its chip on blur waits until the focus has landed (otherwise the sheet
  takes it), a fix procurement took too (7c2e15a2).
- **What the page does not say.** „Înregistrat" is not „active"; the
  export's completeness is unverified; the registry date moves when an entry
  changes; the export's own year is drawn paler and said „până la …". „Noi
  în 2025" counts the selection's own (4,306 among „Înregistrate", 4,331 in
  the whole registry).
- **API asks** (for the server): a total count and a breakdown endpoint
  (they would retire both generated files and give a name search of any size
  its axes), filters for the registry-number year, a date range, locality,
  court and a declared CUI, `in` filters, sort, and county matching that
  ignores diacritics.
- **Reviews.** Opus 5.5 xhigh and Codex gpt-6.1-sol xhigh on the prototype
  (two rounds each) and on the promotion.
