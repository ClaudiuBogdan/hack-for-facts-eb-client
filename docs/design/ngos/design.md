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
| `/ong-uri` | Landing: registry search, figures, counties, years (superseded by §12) | `ngo-landing-source-coverage.md` |
| `/ong-uri/$cui` | NGO entity profile (organization-anchored) | `ngo-entity-profile.md` |
| `/ong-uri/servicii` | Social-service provider/service discovery (list + map) | `social-service-provider-discovery.md` |
| `/ong-uri/sursa/$snapshotId` | Per-snapshot source/provenance trail page | `evidence-trail-source-citations.md` |
| `/ong-uri/registru` | MJ legal-registry name-only listing (Next-2) | `name-only-registry-surfaces.md` |
| `/ong-uri/utilitate-publica` | SGG public-utility name-only listing (Next-2) | `name-only-registry-surfaces.md` |
| `/ong-uri/revizuire` | Link-review queue (advanced, staff-gated) | out of scope (named only) |

**Decision — `/entities/$cui` integration.** Keep `/entities/$cui` as the shared
cross-domain CUI shell. For `kind=ngo` organizations, the entities shell shows an NGO
context band and a prominent "Vezi profilul ONG" link to `/ong-uri/$cui`. Update the
global entity-search routing so NGO hits deep-link to `/ong-uri/$cui` instead of
`/entities/$cui` (current behavior in
`src/features/entity-search/lib/entity-search-routing.ts:47`). This is the one allowed
routing change; implement it in the search-routing adapter, not by rebuilding search.

**Decision — Route language.** Romanian public slugs (`/ong-uri`, `/servicii`,
`/registru`, `/utilitate-publica`, `/sursa`, `/revizuire`), consistent with the
foundation's Romanian-slug decision.

**Decision — Evidence-trail addressing.** The evidence trail is both an in-profile
section and a dedicated per-snapshot page at `/ong-uri/sursa/$snapshotId`. Inline
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
  (`src/components/sidebar`) pointing to `/ong-uri`. (Implementation note for the
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
  `/ong-uri/sursa/$snapshotId`. Owned by `evidence-trail-source-citations.md`.
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

1. **MVP-1** `ngo-entity-profile.md` — `/ong-uri/$cui`. Anchor surface; consumes all
   confirmed evidence + the references zone + financial placeholder + evidence trail.
2. **MVP-2** `social-service-provider-discovery.md` — `/ong-uri/servicii`. List+map.
3. **MVP-3** `evidence-trail-source-citations.md` — citation chips + provenance drawer
   + `/ong-uri/sursa/$snapshotId`.
4. **MVP-4** `identity-confidence-communication.md` — `IdentityConfidenceBadge` +
   confirmed/name-only section separation rules (cross-cutting).
5. **MVP-5** `ngo-landing-source-coverage.md` — `/ong-uri` landing + `CoverageRibbon`.
6. **Next-1** `anaf-financial-enrichment-section.md` — profile financial section
   (placeholder → live).
7. **Next-2** `name-only-registry-surfaces.md` — `/ong-uri/registru` +
   `/ong-uri/utilitate-publica`.
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

- **Routes** `/ong-uri`, `/ong-uri/$cui`, `/ong-uri/servicii`, and
  `/ong-uri/sursa/$snapshotId` exist with Zod `validateSearch` and render default
  views without query params. Next-2 adds `/ong-uri/registru` and
  `/ong-uri/utilitate-publica`.
- **`/entities/$cui`** shows an NGO context band + link to `/ong-uri/$cui` for
  `kind=ngo`; global entity-search NGO hits deep-link to `/ong-uri/$cui`.
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
